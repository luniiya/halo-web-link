import type { Theme } from "../theme.ts";
import type { Profile, State } from "../types.ts";
import { ColorPicker } from "./ColorPicker.tsx";
import { HaloLogo, KeyIcon, MonitorIcon, MoonIcon, PlusIcon, SettingsIcon, SidebarCollapseIcon, SidebarExpandIcon, SunIcon, TabsIcon, TrashIcon } from "./icons.tsx";

type Props = {
  profiles: Profile[];
  openCount: number;
  /** Profile the start page is narrowed to; null shows every tab, undefined (tab detail) marks nothing active. */
  filter?: string | null;
  onFilter: (profile: string | null) => void;
  /** Why the core can't be reached; null when it answers. */
  connError?: string | null;
  state: State | null;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  authHidden: boolean;
  onAuth: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNewProfile?: () => void;
  onConfigureProfile?: (profile: Profile) => void;
  onShowTrash?: () => void;
};

const THEMES = {
  auto: { next: "light", label: "Auto", Icon: MonitorIcon },
  light: { next: "dark", label: "Light", Icon: SunIcon },
  dark: { next: "auto", label: "Dark", Icon: MoonIcon },
} as const;

// haloLesson-style left sidebar: views on top, settings at the bottom.
// Collapsed it is a rail of icons; labels stay for screen readers and tooltips.
export function Sidebar({ profiles, openCount, filter, onFilter, connError = null, state, theme, onThemeChange, authHidden, onAuth, collapsed, onToggleCollapsed, onNewProfile, onConfigureProfile, onShowTrash }: Props) {
  const { next, label, Icon } = THEMES[theme];
  return (
    <aside className="sidebar" aria-label="Halo Web Link">
      <a className="brand" href="#" title="Halo Web Link" onClick={() => onFilter(null)}>
        <HaloLogo />
        <span className="brand-name">Halo Web Link</span>
      </a>

      <nav className="sidebar-nav" aria-label="Views">
        <button id="all-tabs-button" type="button" className={filter === null ? "nav-item active" : "nav-item"} aria-current={filter === null ? "page" : undefined} title="All tabs" onClick={() => onFilter(null)}>
          <TabsIcon />
          <span className="nav-label">All tabs</span>
          <span className="nav-count">{openCount}</span>
        </button>

        {(profiles.length > 0 || onNewProfile) && <p className="nav-heading">Profiles</p>}
        <ul id="profile-nav" className="profile-nav" aria-label="Browser profiles">
          {profiles.map((profile) => (
            <li key={profile.id} className="nav-row">
              <button type="button" className={filter === profile.name ? "nav-item active" : "nav-item"} aria-current={filter === profile.name ? "page" : undefined}
                title={`${profile.name}${profile.browserRunning ? ", running" : ""}`} onClick={() => onFilter(profile.name)}>
                <span className={profile.kind === "burner" ? "nav-avatar burner" : "nav-avatar"} aria-hidden="true">
                  {profile.name.charAt(0).toUpperCase()}
                  {profile.browserRunning && <span className="nav-running"></span>}
                </span>
                <span className="nav-label">{profile.name}</span>
                {profile.tabs > 0 && <span className="nav-count">{profile.tabs}</span>}
              </button>
              {onConfigureProfile && <button type="button" className="nav-gear" aria-label={`Configure ${profile.name}`} title="Configure" onClick={() => onConfigureProfile(profile)}><SettingsIcon /></button>}
            </li>
          ))}
        </ul>
        {onNewProfile && (
          <button id="new-profile-button" type="button" className="nav-item nav-new" title="New profile" onClick={onNewProfile}>
            <PlusIcon />
            <span className="nav-label">New profile</span>
          </button>
        )}
        {onShowTrash && (
          <button id="show-trash-button" type="button" className="nav-item nav-trash" title="Trash" onClick={onShowTrash}>
            <TrashIcon />
            <span className="nav-label">Trash</span>
          </button>
        )}
      </nav>

      <div className="sidebar-foot">
        <BrowserStatus connError={connError} state={state} />
        <div className="sidebar-tools">
          <button id="theme-button" type="button" className="icon-button" title={`Theme: ${label} (click for ${THEMES[next].label})`}
            aria-label={`Theme: ${label}. Switch to ${THEMES[next].label}`} onClick={() => onThemeChange(next)}>
            {/* Keyed so the icon replays its entrance animation on every switch. */}
            <span key={theme} className="theme-icon"><Icon /></span>
          </button>
          <ColorPicker />
          <button id="auth-button" type="button" className="icon-button" title="Access key" aria-label="Access key" hidden={authHidden} onClick={onAuth}><KeyIcon /></button>
          <button id="collapse-button" type="button" className="icon-button" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed} onClick={onToggleCollapsed}>
            {collapsed ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
          </button>
        </div>
      </div>
    </aside>
  );
}

// Browsers start lazily: each profile launches its own when an agent opens a
// tab in it and stops after idling, so "idle" is the normal resting state.
export function browserStatus(connError: string | null, state: State | null): { kind: string; value: string; label: string; title: string } {
  if (connError) return { kind: "offline", value: "Offline", label: connError, title: connError };
  if (!state) return { kind: "offline", value: "-", label: "browser", title: "" };
  const crashed = (state.profiles ?? []).filter((p) => p.browserError);
  if (crashed.length || state.browserError) {
    const what = crashed.map((p) => `${p.name}: ${p.browserError!.reason}`).concat(state.browserError ? [`shared browser: ${state.browserError}`] : []);
    return { kind: "crashed", value: "Crashed", label: crashed.length === 1 ? crashed[0]!.name : "browser", title: `Browser stopped unexpectedly. ${what.join("; ")}. It relaunches on the next tab.` };
  }
  const running = state.running || (state.profiles ?? []).some((p) => p.browserRunning);
  return running
    ? { kind: "running", value: "Running", label: "browser", title: "A browser is running" }
    : { kind: "idle", value: "Idle", label: "browser", title: "No browser running. One starts when an agent opens a tab." };
}

function BrowserStatus({ connError, state }: { connError: string | null; state: State | null }) {
  const { kind, value, label, title } = browserStatus(connError, state);
  return (
    <div id="browser-status" className={`browser-status ${kind}`} title={title || value} aria-live="polite">
      <span className="status-dot" aria-hidden="true"></span>
      <span className="nav-label"><strong>{value}</strong> <span>{label}</span></span>
    </div>
  );
}
