import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from "react";
import type { ActivityEntry } from "../activity.ts";
import { toUrl } from "../address.ts";
import { authHeaders } from "../api.ts";
import { handleScreenClick, handleScreenKeyDown, handleScreenPaste } from "../input.ts";
import { closureLabel, lifetimeLabel } from "../lifetime.ts";
import { openTab, showGrid } from "../route.ts";
import { shortId, type ClosedEntry, type State } from "../types.ts";
import { ActivityPanel } from "./ActivityPanel.tsx";
import { queueScreenshot } from "../screenshots.ts";
import { BackIcon, CloseIcon, ForwardIcon, FullscreenIcon, GlobeIcon, ReloadIcon } from "./icons.tsx";
import { LOADING_TEXT, useShot } from "./useShot.ts";

type Props = {
  userId: string;
  tabId: string;
  state: State;
  /** Last known data for this tab if it is no longer open. */
  last?: ClosedEntry;
  activity: ActivityEntry[];
  activityListRef?: RefObject<HTMLOListElement | null>;
  onStatus: (message: string) => void;
  refresh: () => Promise<void>;
};

// Wheel deltas are summed and sent at most this often, so a fling is a few scrolls, not hundreds.
const WHEEL_FLUSH_MS = 120;

// Detail: the single interactive view. Click-to-control only lives here.
export function DetailView({ userId, tabId, state, last, activity, activityListRef, onStatus, refresh }: Props) {
  const tabDetail = useRef<HTMLElement>(null);
  const detailScreen = useRef<HTMLButtonElement>(null);
  const detailImg = useRef<HTMLImageElement>(null);
  const shot = useShot(tabId);
  const [screenRatio, setScreenRatio] = useState<string>();
  const [fullscreen, setFullscreen] = useState(false);
  const [reopening, setReopening] = useState(false);
  // An error from reopen/save replaces the closure reason until the next poll.
  const [closureNote, setClosureNote] = useState<{ state: State; text: string } | null>(null);
  // What the user is typing in the address bar; null shows the tab's own URL.
  const [address, setAddress] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(!!tabDetail.current && document.fullscreenElement === tabDetail.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Scroll the page with the mouse wheel over the live view (needs a non-passive listener).
  useEffect(() => {
    const screen = detailScreen.current;
    if (!screen) return;
    let dx = 0, dy = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      const [direction, amount] = Math.abs(dy) >= Math.abs(dx) ? [dy > 0 ? "down" : "up", Math.abs(dy)] : [dx > 0 ? "right" : "left", Math.abs(dx)];
      dx = dy = 0;
      if (amount < 1) return;
      void fetch("/api/scroll", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ userId, tabId, direction, amount }) })
        .then(() => queueScreenshot(userId, tabId, true)).catch(() => {});
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 800 : 1; // lines, pages
      dx += event.deltaX * scale; dy += event.deltaY * scale;
      timer ??= setTimeout(flush, WHEEL_FLUSH_MS);
    };
    screen.addEventListener("wheel", onWheel, { passive: false });
    return () => { screen.removeEventListener("wheel", onWheel); clearTimeout(timer); };
  }, [userId, tabId]);

  useEffect(() => setAddress(null), [userId, tabId]);

  const session = state.sessions.find((s) => s.userId === userId);
  const tab = session?.tabs.find((t) => t.tabId === tabId);
  const isOpen = !!session && !!tab;

  const note = (text: string) => setClosureNote({ state, text });

  async function toggleKeepOpen() {
    try {
      const response = await fetch("/api/lifetime", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ userId, tabId, keepOpen: !tab?.lifetime?.keepOpen }) });
      if (!response.ok) throw new Error("Could not change tab protection");
      await refresh();
    } catch (error) { onStatus(String(error)); }
  }

  async function toggleFullscreen() {
    const element = tabDetail.current;
    if (!element) return;
    try {
      if (document.fullscreenElement === element) await document.exitFullscreen();
      else await element.requestFullscreen();
      detailScreen.current?.focus();
    } catch {
      onStatus("Fullscreen is unavailable in this browser.");
    }
  }

  async function navigate(action: "back" | "forward" | "reload" | "go", url?: string) {
    setNavigating(true);
    try {
      const response = await fetch("/api/navigate", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ userId, tabId, action, url }), signal: AbortSignal.timeout(45000) });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Navigation failed");
      setAddress(null);
    } catch (error) { onStatus(error instanceof Error ? error.message : String(error)); }
    finally {
      setNavigating(false);
      queueScreenshot(userId, tabId, true);
      void refresh();
    }
  }

  function go(event: FormEvent) {
    event.preventDefault();
    const url = toUrl(address ?? "");
    if (url) void navigate("go", url);
  }

  async function closeTab() {
    try {
      const response = await fetch("/api/tabs/close", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ userId, tabId }) });
      if (!response.ok) throw new Error("Could not close the tab");
      showGrid();
      await refresh();
    } catch (error) { onStatus(String(error)); }
  }

  async function reopen() {
    if (!last) return;
    setReopening(true);
    try {
      const response = await fetch("/api/reopen", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ userId, sessionKey: last.tab.sessionKey, url: last.tab.url }), signal: AbortSignal.timeout(45000) });
      const result = await response.json() as { tabId?: string; error?: string };
      if (!response.ok || !result.tabId) throw new Error(result.error || "Could not reopen tab");
      await refresh(); openTab(userId, result.tabId);
    } catch (error) { note(String(error)); }
    finally { setReopening(false); }
  }

  async function saveTranscript() {
    try {
      const response = await fetch(`/api/history?${new URLSearchParams({ userId, tabId })}`, { headers: authHeaders() });
      if (!response.ok) throw new Error("No saved text is available for this tab");
      const saved = await response.json() as { url: string; text: string };
      const url = URL.createObjectURL(new Blob([saved.url + "\n\n" + saved.text], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `hwl-${tabId}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { note(String(error)); }
  }

  const shown = isOpen ? tab : last?.tab;
  const title = isOpen ? tab.title || "Untitled tab" : last ? last.tab.title || "Untitled tab" : "";
  const keepOpen = !!tab?.lifetime?.keepOpen;
  const canReopen = !!last?.tab.url && /^https?:\/\//i.test(last.tab.url);
  const screenStyle = screenRatio ? ({ "--screen-ratio": screenRatio } as CSSProperties) : undefined;

  return (
    <>
      <button id="back-button" type="button" className="back-button" onClick={showGrid}><BackIcon />All tabs</button>
      <div className="detail-layout">
        <div className="detail-main">
          <article id="tab-detail" className="tab-detail" ref={tabDetail}>
            {isOpen && (
              <div className="browser-bar">
                <button id="nav-back" type="button" className="icon-button" title="Back" aria-label="Back" disabled={navigating} onClick={() => void navigate("back")}><BackIcon /></button>
                <button id="nav-forward" type="button" className="icon-button" title="Forward" aria-label="Forward" disabled={navigating} onClick={() => void navigate("forward")}><ForwardIcon /></button>
                <button id="nav-reload" type="button" className={navigating ? "icon-button spinning" : "icon-button"} title="Reload" aria-label="Reload" disabled={navigating} onClick={() => void navigate("reload")}><ReloadIcon /></button>
                <form className="address-form" onSubmit={go}>
                  <input id="address-bar" className="address-input" type="text" inputMode="url" autoComplete="off" spellCheck={false} aria-label="Address" placeholder="Search or enter an address"
                    value={address ?? tab.url} onChange={(event) => setAddress(event.target.value)} onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => { if (event.key === "Escape") { setAddress(null); event.currentTarget.blur(); } }} />
                </form>
                <button id="close-tab-button" type="button" className="icon-button icon-button-danger" title="Close tab" aria-label="Close tab" onClick={() => void closeTab()}><CloseIcon /></button>
              </div>
            )}
            <div className="tab-meta">
              <div className="favicon"><GlobeIcon /></div>
              <div className="titles"><h2 id="detail-title">{title}</h2><p className="url" id="detail-url">{shown?.url ?? ""}</p></div>
              <span className="session-pill" id="detail-session">{shown?.sessionKey ?? ""}</span>
              <button id="keep-open-button" type="button" className="button button-secondary button-small" aria-pressed={keepOpen} hidden={!isOpen} onClick={toggleKeepOpen}>{keepOpen ? "Allow idle cleanup" : "Keep open"}</button>
              <button id="fullscreen-button" type="button" className="button button-secondary button-small" aria-pressed={fullscreen} onClick={toggleFullscreen}><FullscreenIcon />{fullscreen ? "Exit fullscreen" : "Fullscreen"}</button>
            </div>
            <p id="lifetime-status" role="status">{isOpen ? lifetimeLabel(tab.lifetime) : ""}</p>
            <p id="navigation-error" role="alert" hidden={!isOpen || !tab.navigationError}>
              {isOpen && tab.navigationError ? "Page navigation failed. The tab is still open. " + tab.navigationError.split("\n")[0] : ""}
            </p>
            <button
              id="detail-screen"
              ref={detailScreen}
              className={shot.url ? "screen ready" : "screen"}
              type="button"
              title="Click to interact; keystrokes go to the page while focused"
              hidden={!isOpen}
              style={screenStyle}
              onClick={(event) => { if (detailImg.current && detailScreen.current) void handleScreenClick(event.nativeEvent, detailImg.current, detailScreen.current); }}
              onKeyDown={(event) => handleScreenKeyDown(event.nativeEvent, onStatus)}
              // Space/Enter would otherwise "click" the focused <button> on keyup.
              onKeyUp={(event) => event.preventDefault()}
              onPaste={(event) => handleScreenPaste(event.nativeEvent)}
            >
              <img
                id="detail-img"
                ref={detailImg}
                alt="Live browser tab screenshot"
                src={shot.url}
                // Size the live view to the browser viewport's real aspect ratio (no letterboxing).
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalWidth && image.naturalHeight) setScreenRatio(`${image.naturalWidth} / ${image.naturalHeight}`);
                }}
              />
              <span className="loading">{shot.error ?? LOADING_TEXT}</span>
            </button>
            <div className="tab-footer"><span className="user" id="detail-user">{shortId(userId)}</span><span className="hint" id="detail-hint">click the page to interact, type, or scroll with the wheel</span></div>
          </article>
          <div id="detail-missing" className="empty" hidden={isOpen}>
            <h2>Tab closed</h2>
            <p id="closure-reason">{closureNote?.state === state ? closureNote.text : closureLabel(last?.reason)}</p>
            <p>Reopening may restore a conversation if the website still keeps it active.</p>
            <button id="reopen-button" type="button" className="button" disabled={reopening || !canReopen} onClick={reopen}>Reopen saved URL</button>
            <button id="save-transcript-button" type="button" className="button button-secondary" disabled={!last} onClick={saveTranscript}>Save last read text</button>
          </div>
        </div>
        <ActivityPanel entries={activity} listRef={activityListRef} />
      </div>
    </>
  );
}
