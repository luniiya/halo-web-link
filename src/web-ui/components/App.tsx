import { useCallback, useEffect, useRef, useState } from "react";
import { authHeaders, getAccessKey, setAccessKey } from "../api.ts";
import { ClosureTracker } from "../closures.ts";
import { openTab, parseRoute, showGrid, type Route } from "../route.ts";
import { dropShot, queueScreenshot } from "../screenshots.ts";
import { applySidebarCollapsed, applyTheme, savedSidebarCollapsed, savedTheme, type Theme } from "../theme.ts";
import type { ClosedEntry, Profile, State, TabRef } from "../types.ts";
import { DetailView } from "./DetailView.tsx";
import { GridView } from "./GridView.tsx";
import { AgentPrompt, type ConnectInfo } from "./AgentPrompt.tsx";
import { ProfileDialog, type ProfileDialogMode, type ProfileInput } from "./ProfileDialog.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { TrashDialog } from "./TrashDialog.tsx";
import { useActivity } from "./useActivity.ts";

/** One successful poll of the core, with open/closed tabs already worked out. */
type View = { state: State; open: TabRef[]; closed: ClosedEntry[] };

const POLL_MS = 3_000;

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [view, setView] = useState<View | null>(null);
  // Connection problem, shown in the summary strip; null once the core answers.
  const [connError, setConnError] = useState<string | null>("Connecting…");
  // One-off messages (profile created, fullscreen unavailable, ...), shown as a toast.
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const showNotice = useCallback((text: string) => setNotice({ id: Date.now(), text }), []);
  const [theme, setTheme] = useState<Theme>(() => savedTheme());
  const [authHidden, setAuthHidden] = useState(false);
  const [connect, setConnect] = useState<ConnectInfo | null>(null);
  const [collapsed, setCollapsed] = useState(() => savedSidebarCollapsed());
  // Profile the start page is narrowed to; null shows every tab.
  const [filter, setFilter] = useState<string | null>(null);
  const [profileDialog, setProfileDialog] = useState<ProfileDialogMode>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const tracker = useRef<ClosureTracker>(null);
  tracker.current ??= new ClosureTracker(dropShot);
  const refreshing = useRef(false);
  const activity = useActivity();

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const current = parseRoute();
      if (current.kind === "detail" && document.visibilityState !== "hidden") {
        // Viewing lease: keeps the tab from idle cleanup while someone watches it.
        await fetch("/api/lifetime", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ userId: current.userId, tabId: current.tabId, viewing: true }), signal: AbortSignal.timeout(5000) }).catch(() => {});
      }
      const response = await fetch("/api/state", { headers: authHeaders(), signal: AbortSignal.timeout(10000) });
      if (response.status === 401) throw new Error("Access key required");
      if (!response.ok) throw new Error(`Dashboard unavailable (${response.status})`);
      const state = await response.json() as State;
      const open = tracker.current!.track(state);
      setView({ state, open: [...open.values()], closed: tracker.current!.sorted() });
      setConnError(null);
    } catch (error) {
      setConnError(error instanceof Error ? error.message : "Disconnected");
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/config");
        const config = await response.json() as { authRequired?: boolean; mcpUrl?: string };
        setAuthHidden(!config.authRequired);
        setConnect({ authRequired: !!config.authRequired, mcpUrl: config.mcpUrl || `http://${location.hostname}:9377/mcp` });
      } catch {
        setAuthHidden(true);
      }
      await refresh();
      if (!cancelled) timer = setInterval(refresh, POLL_MS);
    })();
    return () => { cancelled = true; clearInterval(timer); };
  }, [refresh]);

  // Until the first state arrives the grid shows, whatever the hash says.
  const shown: Route = view ? route : { kind: "grid" };
  const detailKey = shown.kind === "detail" ? `${shown.userId}:${shown.tabId}` : "";

  // Grid: refresh (throttled) thumbnails of open tabs on every poll.
  useEffect(() => {
    if (!view || shown.kind !== "grid") return;
    for (const { session, tab } of view.open) queueScreenshot(session.userId, tab.tabId);
  }, [view, shown.kind]);

  // Detail: activity log plus the live feed, on every poll and on navigation.
  useEffect(() => {
    if (!view || shown.kind !== "detail") return;
    void activity.refresh(shown.tabId);
    const tab = view.state.sessions.find((s) => s.userId === shown.userId)?.tabs.find((t) => t.tabId === shown.tabId);
    if (tab) queueScreenshot(shown.userId, shown.tabId, true);
  }, [view, detailKey]);

  // A profile that is gone (deleted, burner wiped) can't stay picked.
  const profiles = view?.state.profiles ?? [];
  useEffect(() => {
    if (view && filter && !profiles.some((p) => p.name === filter)) setFilter(null);
  }, [view, filter]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function pickProfile(name: string | null) {
    setFilter(name);
    showGrid();
  }

  function toggleCollapsed() {
    applySidebarCollapsed(!collapsed);
    setCollapsed(!collapsed);
  }

  function changeTheme(next: Theme) {
    applyTheme(next);
    setTheme(next);
  }

  async function deleteProfile(name: string) {
    if (!confirm(`Move profile "${name}" to the trash? Its tabs close. You can restore it for 30 days.`)) return;
    const response = await fetch("/api/profiles/delete", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ profile: name }) }).catch(() => null);
    showNotice(response?.ok ? `Moved ${name} to the trash` : `Could not delete profile ${name}`);
    if (response?.ok && filter === name) setFilter(null);
    void refresh();
  }

  async function createProfile(input: ProfileInput): Promise<boolean> {
    const response = await fetch("/api/profiles/create", { method: "POST", headers: authHeaders(true), body: JSON.stringify(input) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { name?: string; error?: string } | null;
    const name = body?.name ?? input.name ?? "burner";
    showNotice(response?.ok ? `Created profile ${name}` : `Could not create profile${input.name ? ` ${input.name}` : ""}${body?.error ? `: ${body.error}` : ""}`);
    void refresh();
    return !!response?.ok;
  }

  async function regenerateProfile(name: string, { screen, os, locale, timezone }: ProfileInput): Promise<boolean> {
    const response = await fetch("/api/profiles/fingerprint", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ profile: name, screen, os, locale, timezone }) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string } | null;
    showNotice(response?.ok ? `New fingerprint for ${name}` : `Could not change ${name}'s fingerprint${body?.error ? `: ${body.error}` : ""}`);
    void refresh();
    return !!response?.ok;
  }

  async function configureProfile(name: string, { screen, os, locale, timezone, settings }: ProfileInput): Promise<boolean> {
    const response = await fetch("/api/profiles/update", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ profile: name, screen, os, locale, timezone, settings }) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string } | null;
    showNotice(response?.ok ? `Saved ${name}` : `Could not save ${name}${body?.error ? `: ${body.error}` : ""}`);
    void refresh();
    return !!response?.ok;
  }

  async function loadTrash(): Promise<Profile[] | null> {
    const response = await fetch("/api/profiles/trash", { headers: authHeaders() }).catch(() => null);
    const body = await response?.json().catch(() => null) as { profiles?: Profile[] } | null;
    return response?.ok ? body?.profiles ?? [] : [];
  }

  async function restoreProfile(name: string): Promise<boolean> {
    const response = await fetch("/api/profiles/restore", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ profile: name }) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string } | null;
    showNotice(response?.ok ? `Restored ${name}` : `Could not restore ${name}${body?.error ? `: ${body.error}` : ""}`);
    void refresh();
    return !!response?.ok;
  }

  async function openNewTab(profile: string, url: string): Promise<boolean> {
    const response = await fetch("/api/tabs/new", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ profile, url }), signal: AbortSignal.timeout(90000) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { tabId?: string; error?: string } | null;
    if (!response?.ok || !body?.tabId) {
      showNotice(`Could not open the tab${body?.error ? `: ${body.error}` : ""}`);
      return false;
    }
    // The core answers with the tab only; its session (userId) comes from the next state.
    const state = await fetch("/api/state", { headers: authHeaders() }).then((r) => r.json() as Promise<State>).catch(() => null);
    const session = state?.sessions.find((s) => s.tabs.some((t) => t.tabId === body.tabId));
    void refresh();
    if (session) openTab(session.userId, body.tabId);
    return true;
  }

  function askForKey() {
    const next = prompt("Halo Web Link access key (leave blank when authentication is disabled)", getAccessKey());
    if (next === null) return;
    setAccessKey(next);
    void refresh();
  }

  return (
    <>
      <Sidebar profiles={profiles} openCount={view?.open.length ?? 0} filter={shown.kind === "grid" ? filter : undefined} onFilter={pickProfile}
        connError={connError} state={view?.state ?? null} theme={theme} onThemeChange={changeTheme} authHidden={authHidden} onAuth={askForKey}
        collapsed={collapsed} onToggleCollapsed={toggleCollapsed}
        onNewProfile={() => setProfileDialog({ kind: "create" })} onConfigureProfile={(profile) => setProfileDialog({ kind: "configure", profile })} onShowTrash={() => setTrashOpen(true)} />
      <main>
        <GridView hidden={shown.kind !== "grid"} state={view?.state ?? null} open={view?.open ?? []} closed={view?.closed ?? []} filter={filter}
          actions={connect && <AgentPrompt profiles={profiles.map((p) => p.name)} mcpUrl={connect.mcpUrl} authRequired={connect.authRequired} />}
          onConfigureProfile={(profile) => setProfileDialog({ kind: "configure", profile })} onDeleteProfile={(name) => void deleteProfile(name)} onOpenTab={openNewTab} />
        <section id="detail-view" hidden={shown.kind !== "detail"}>
          {view && shown.kind === "detail" && (
            <DetailView
              userId={shown.userId}
              tabId={shown.tabId}
              state={view.state}
              last={tracker.current.closed.get(detailKey)}
              activity={activity.entries}
              activityListRef={activity.listRef}
              onStatus={showNotice}
              refresh={refresh}
            />
          )}
        </section>
      </main>
      <ProfileDialog mode={profileDialog} onClose={() => setProfileDialog(null)}
        onSubmit={(input) => profileDialog?.kind === "configure" ? configureProfile(profileDialog.profile.name, input) : createProfile(input)}
        onNewFingerprint={profileDialog?.kind === "configure" ? (input) => regenerateProfile(profileDialog.profile.name, input) : undefined} />
      <TrashDialog open={trashOpen} onClose={() => setTrashOpen(false)} load={loadTrash} onRestore={restoreProfile} />
      {notice && <div key={notice.id} className="toast" role="status">{notice.text}</div>}
    </>
  );
}
