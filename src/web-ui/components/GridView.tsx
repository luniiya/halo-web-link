import { useState, type FormEvent, type ReactNode } from "react";
import { toUrl } from "../address.ts";
import { closureLabel } from "../lifetime.ts";
import { openTab } from "../route.ts";
import type { ClosedEntry, Profile, State, TabRef } from "../types.ts";
import { BanIcon, GlobeIcon, PlusIcon, SettingsIcon, TrashIcon } from "./icons.tsx";
import { TabCard } from "./TabCard.tsx";

type Props = {
  hidden: boolean;
  state: State | null;
  open: TabRef[];
  closed: ClosedEntry[];
  /** Profile the page is narrowed to; null shows every tab. */
  filter?: string | null;
  /** Shown at the right of the page head (the Connect your agent control). */
  actions?: ReactNode;
  onConfigureProfile?: (profile: Profile) => void;
  /** Moves the profile to the trash. */
  onDeleteProfile?: (name: string) => void;
  /** Opens a tab in a profile; resolves false when the core refused. */
  onOpenTab?: (profile: string, url: string) => Promise<boolean>;
};

const OS_NAMES = { windows: "Windows", macos: "macOS", linux: "Linux" } as const;
const CLOSED_SHOWN = 8;

// Start page: open a tab, see what is open, and what closed recently;
// narrowed to one profile when one is picked in the sidebar.
export function GridView({ hidden, state, open, closed, filter = null, actions, onConfigureProfile, onDeleteProfile, onOpenTab }: Props) {
  const profiles = state?.profiles ?? [];
  const profile = filter ? profiles.find((p) => p.name === filter) ?? null : null;
  const shownOpen = filter ? open.filter(({ session }) => session.profile === filter) : open;
  const shownClosed = filter ? closed.filter(({ session }) => session.profile === filter) : closed;

  return (
    <section id="grid-view" hidden={hidden}>
      <div className="page-head">
        <div className="page-title">
          <p className="eyebrow">{profile ? (profile.kind === "burner" ? "Burner profile" : "Browser profile") : "Live browser"}</p>
          <h2>{filter ?? "All tabs"}</h2>
        </div>
        {actions}
      </div>

      {profile && <ProfileDetails profile={profile} onConfigure={onConfigureProfile} onDelete={onDeleteProfile} />}

      {onOpenTab && <NewTabBar key={filter ?? ""} profiles={profiles} preferred={filter} onOpen={onOpenTab} />}

      <section className="tab-section">
        <h3 className="section-heading">Open <span className="section-count">{shownOpen.length}</span></h3>
        <p id="empty-open" className="empty-inline" hidden={!state || shownOpen.length > 0}>
          {filter ? <>No open tabs in {filter}. Open one above.</> : <>No open tabs. Connect an MCP client to <code>/mcp</code>, new agent tabs will appear here automatically.</>}
        </p>
        <section id="grid-open" className="grid" aria-label="Open browser tabs">
          {shownOpen.map(({ session, tab }) => <TabCard key={`${session.userId}:${tab.tabId}`} session={session} tab={tab} closed={false} />)}
        </section>
      </section>

      <ClosedList closed={shownClosed} loaded={!!state} />
    </section>
  );
}

function ProfileDetails({ profile, onConfigure, onDelete }: { profile: Profile; onConfigure?: (profile: Profile) => void; onDelete?: (name: string) => void }) {
  return (
    <div id="profile-details" className="profile-row">
      <span className={profile.kind === "burner" ? "profile-kind burner" : "profile-kind"}>{profile.kind}</span>
      <span className="profile-ua" title={profile.userAgent ?? ""}>{profile.userAgent ?? "-"}</span>
      {profile.screen && <span className="profile-screen" title="Spoofed screen and OS">{profile.screen.width}×{profile.screen.height}{profile.os ? ` · ${OS_NAMES[profile.os]}` : ""}</span>}
      <span className="profile-meta">{profile.browserRunning ? `${profile.tabs} tab${profile.tabs === 1 ? "" : "s"} · running` : `idle · used ${new Date(profile.lastUsedAt).toLocaleDateString()}`}</span>
      {onConfigure && <button type="button" className="profile-action profile-configure" aria-label={`Configure ${profile.name}`} title="Configure" onClick={() => onConfigure(profile)}><SettingsIcon /></button>}
      {onDelete && (profile.default
        ? <button type="button" className="profile-trash" disabled aria-label={`${profile.name} can't be deleted`} title="The default profile can't be deleted"><span className="trash-rest"><TrashIcon /></span><span className="trash-deny"><BanIcon /></span></button>
        : <button type="button" className="profile-trash" aria-label={`Move ${profile.name} to the trash`} title="Move to trash" onClick={() => onDelete(profile.name)}><TrashIcon /></button>)}
    </div>
  );
}

// Closed tabs have no live screenshot left, so a compact list instead of cards.
function ClosedList({ closed, loaded }: { closed: ClosedEntry[]; loaded: boolean }) {
  const [all, setAll] = useState(false);
  const shown = all ? closed : closed.slice(0, CLOSED_SHOWN);
  return (
    <section className="tab-section">
      <h3 className="section-heading">Recently closed <span className="section-count">{closed.length}</span></h3>
      <p id="empty-closed" className="empty-inline" hidden={!loaded || closed.length > 0}>No closed tabs yet.</p>
      <ul id="closed-list" className="closed-list" aria-label="Recently closed tabs">
        {shown.map(({ session, tab, closedAt, reason }) => (
          <li key={`${session.userId}:${tab.tabId}`}>
            <button type="button" className="closed-row" title={closureLabel(reason)} onClick={() => openTab(session.userId, tab.tabId)}>
              <span className="favicon"><GlobeIcon /></span>
              <span className="closed-title">{tab.title || "Untitled tab"}</span>
              <span className="closed-url">{tab.url}</span>
              {session.profile && <span className="profile-pill">{session.profile}</span>}
              <span className="closed-time">{timeAgo(closedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
      {closed.length > CLOSED_SHOWN && (
        <button id="closed-toggle" type="button" className="button button-ghost button-small" onClick={() => setAll(!all)}>{all ? "Show less" : `Show all (${closed.length})`}</button>
      )}
    </section>
  );
}

export function timeAgo(at: number, now = Date.now()): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleDateString();
}

// Address bar for a new tab: a URL, a host, or words to search for, in the chosen profile.
function NewTabBar({ profiles, preferred, onOpen }: { profiles: Profile[]; preferred: string | null; onOpen: (profile: string, url: string) => Promise<boolean> }) {
  const [address, setAddress] = useState("");
  const [chosen, setChosen] = useState<string | null>(preferred);
  const [busy, setBusy] = useState(false);
  // Named profiles, plus the picked one when it is a burner.
  const choices = profiles.filter((p) => p.kind === "named" || p.name === preferred);
  const fallback = profiles.find((p) => p.default)?.name ?? choices[0]?.name ?? "";
  const profile = chosen ?? fallback;
  const url = toUrl(address);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!url || busy) return;
    setBusy(true);
    try {
      if (await onOpen(profile, url)) setAddress("");
    } finally { setBusy(false); }
  }

  return (
    <form id="new-tab" className="new-tab-bar" onSubmit={submit}>
      <input id="new-tab-address" className="new-tab-input" type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="Search or enter an address" aria-label="Address for a new tab"
        value={address} onChange={(event) => setAddress(event.target.value)} />
      <select id="new-tab-profile" className="new-tab-select" aria-label="Browser profile" value={profile} onChange={(event) => setChosen(event.target.value)}>
        {choices.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        <option value="burner">New burner</option>
      </select>
      <button id="new-tab-button" type="submit" className="button" disabled={!url || busy}><PlusIcon />{busy ? "Opening…" : "Open tab"}</button>
    </form>
  );
}
