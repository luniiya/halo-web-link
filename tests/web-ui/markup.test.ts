import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentPrompt } from "../../src/web-ui/components/AgentPrompt.tsx";
import { GridView, timeAgo } from "../../src/web-ui/components/GridView.tsx";
import { browserStatus, Sidebar } from "../../src/web-ui/components/Sidebar.tsx";
import { DetailView } from "../../src/web-ui/components/DetailView.tsx";
import { ProfileDialog } from "../../src/web-ui/components/ProfileDialog.tsx";
import { TrashDialog } from "../../src/web-ui/components/TrashDialog.tsx";
import type { ActivityEntry } from "../../src/web-ui/activity.ts";
import type { ClosedEntry, State } from "../../src/web-ui/types.ts";

const read = (name: string) => readFileSync(new URL(`../../src/web-ui/${name}`, import.meta.url), "utf8");
const page = read("index.html");

const session = { userId: "user-abcdefghijkl", lastAccess: "2026-01-01T00:00:00Z", tabs: [
  { tabId: "t1", sessionKey: "chat", url: "https://example.test/", title: "Example", navigationError: "boom\nstack",
    lifetime: { keepOpen: false, protected: false, expiresAt: null, idleTimeoutMs: 0 } },
] };
const state: State = { running: true, generatedAt: "2026-01-01T00:00:00Z", sessions: [session] };
const last: ClosedEntry = { session: { ...session, tabs: [] }, tab: { tabId: "t2", sessionKey: "chat", url: "https://example.test/old", title: "Old" }, closedAt: 1, reason: "idle_timeout" };
const activity: ActivityEntry[] = [{ seq: 1, ts: "2026-01-01T00:00:00Z", action: "click", detail: "button", status: 500, ms: 12, source: "dashboard" }];
const noop = () => {};
const detailProps = { state, activity, onStatus: noop, refresh: async () => {} };

const sidebarProps = { profiles: [], openCount: 1, filter: null, onFilter: noop, state, theme: "auto" as const, onThemeChange: noop,
  authHidden: false, onAuth: noop, collapsed: false, onToggleCollapsed: noop };
const sidebar = renderToStaticMarkup(h(Sidebar, sidebarProps));
const connect = h(AgentPrompt, { mcpUrl: "http://localhost:9377/mcp", authRequired: false, profiles: ["main", "work"] });
const grid = renderToStaticMarkup(h(GridView, { hidden: false, state, open: [{ session, tab: session.tabs[0]! }], closed: [last], actions: connect }));
const openDetail = renderToStaticMarkup(h(DetailView, { ...detailProps, userId: session.userId, tabId: "t1" }));
const closedDetail = renderToStaticMarkup(h(DetailView, { ...detailProps, userId: session.userId, tabId: "t2", last }));
const html = [sidebar, grid, openDetail, closedDetail].join("\n");

describe("index.html", () => {
  test("is a shell that loads the React client", () => {
    expect(page).toContain('<div id="root"></div>');
    expect(page).toContain('<script type="module" src="/client.js"></script>');
    expect(read("client.tsx")).toContain('getElementById("root")');
  });
});

describe("rendered markup", () => {
  test("no <p> contains block-level children (the browser would split it)", () => {
    // Regression: <p hidden><h2>Tab closed</h2></p> left "Tab closed" visible on open tabs.
    for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
      expect(match[1]).not.toMatch(/<(h[1-6]|p|div|section|article|ul|ol)\b/);
    }
  });

  test("the closed-tab notice is one hidden element holding its heading", () => {
    expect(openDetail).toMatch(/<div id="detail-missing"[^>]*\bhidden\b[^>]*>\s*<h2>Tab closed<\/h2>/);
    expect(closedDetail).toMatch(/<div id="detail-missing" class="empty">\s*<h2>Tab closed<\/h2>/);
    expect(closedDetail).toContain("Closed by the idle timer");
    expect(closedDetail).toMatch(/<button id="detail-screen"[^>]*\bhidden\b/);
    // A closed tab has no browser bar (no keep open, no view size), just its title.
    expect(closedDetail).not.toContain('id="keep-open-button"');
    expect(closedDetail).not.toContain('id="view-mode"');
    expect(closedDetail).toContain('<h2 id="detail-title">Old</h2>');
  });

  test("open tab shows its controls and navigation error", () => {
    expect(openDetail).toMatch(/<button id="keep-open-button" type="button" class="icon-button keep-open" aria-pressed="false"[^>]*aria-label="Keep open"/);
    expect(openDetail).toContain("Page navigation failed. The tab is still open. boom<");
    expect(openDetail).toContain("Automatic idle cleanup disabled");
  });

  test("one browser bar: address, keep open, view size, close", () => {
    expect(openDetail).toMatch(/id="address-bar"[\s\S]*id="keep-open-button"[\s\S]*id="view-mode"[\s\S]*id="close-tab-button"/);
    // The title only lives in the address bar tooltip now, not in a second row.
    expect(openDetail).not.toContain('id="detail-title"');
    expect(openDetail).toMatch(/id="address-bar"[^>]*title="Example"/);
  });

  test("the view size has three states, windowed by default, inside the fullscreen element", () => {
    expect(openDetail).toMatch(/<article id="tab-detail"[\s\S]*id="view-mode"[\s\S]*<\/article>/);
    expect(openDetail.match(/role="radio"/g)).toHaveLength(3);
    expect(openDetail).toContain('role="radio" aria-checked="true" title="Windowed"');
    expect(openDetail).toContain('title="Fill the page"');
    expect(openDetail).toContain('title="Fullscreen"');
    expect(read("styles.css")).toContain(".tab-detail.fill-page");
    expect(read("styles.css")).toContain(".tab-detail:fullscreen .screen");
  });

  test("hidden views stay hidden despite author display rules", () => {
    expect(read("styles.css")).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  });

  test("under the live view: the profile's other tabs, then activity", () => {
    const a = { userId: "profile:a", lastAccess: "", profile: "work", tabs: [{ tabId: "a1", sessionKey: "x", url: "https://a.test/", title: "A1" }, { tabId: "a2", sessionKey: "y", url: "https://a.test/2", title: "A2" }] };
    const b = { userId: "profile:b", lastAccess: "", profile: "home", tabs: [{ tabId: "b1", sessionKey: "x", url: "https://b.test/", title: "B1" }] };
    const html = renderToStaticMarkup(h(DetailView, { ...detailProps, state: { ...state, sessions: [a, b] }, userId: "profile:a", tabId: "a1" }));
    expect(html).toMatch(/<div class="detail-below"><section class="detail-panel sibling-tabs"[\s\S]*<aside class="detail-panel activity"/);
    expect(html).toContain('<span class="profile-pill">work</span>');
    expect(html).toContain("<h2>A2</h2>");
    expect(html).not.toContain("<h2>A1</h2>");
    expect(html).not.toContain("<h2>B1</h2>");
    expect(openDetail).toContain("No other tabs open.");
  });

  test("the live view has no hover tooltip or alt text", () => {
    expect(openDetail).toMatch(/<button id="detail-screen"(?![^>]*title=)[^>]*>/);
    expect(openDetail).toContain('<img id="detail-img" alt=""');
    expect(grid).toContain('<img alt=""');
  });

  test("has the activity log panel", () => {
    expect(openDetail).toContain('id="activity-list"');
    expect(openDetail).toContain('id="activity-empty"');
    expect(openDetail).toMatch(/<li class="failed from-dashboard">/);
  });

  test("open tabs are cards, closed tabs a compact list", () => {
    expect(grid).toMatch(/<section id="grid-open"[^>]*><button class="tab-card"/);
    expect(grid).toContain('<span class="user">user-abcde…</span>');
    expect(grid).toMatch(/<ul id="closed-list"[^>]*><li><button type="button" class="closed-row" title="Closed by the idle timer">/);
    expect(grid).toContain('<span class="closed-title">Old</span>');
    expect(grid).not.toContain("tab-card closed");
    expect(grid).not.toContain('id="closed-toggle"');
  });

  test("long closed lists collapse behind Show all", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...last, tab: { ...last.tab, tabId: `c${i}` } }));
    const html = renderToStaticMarkup(h(GridView, { hidden: false, state, open: [], closed: many }));
    expect(html.match(/class="closed-row"/g)).toHaveLength(8);
    expect(html).toContain(">Show all (12)</button>");
  });

  test("closed times read as time ago", () => {
    expect(timeAgo(0, 30_000)).toBe("just now");
    expect(timeAgo(0, 5 * 60_000)).toBe("5 min ago");
    expect(timeAgo(0, 3 * 3_600_000)).toBe("3 h ago");
  });

  test("uses SVG icons, not text glyphs, for arrows and markers", () => {
    const sources = ["index.html", "styles.css", "input.ts", ...readdirSync(new URL("../../src/web-ui/components/", import.meta.url)).map((f) => `components/${f}`)];
    for (const file of sources) {
      expect(read(file)).not.toMatch(/[←→↑↓◢◣◤◥●▶◀]|&larr;|&rarr;/);
    }
    expect(openDetail).toMatch(/<button id="nav-back"[^>]*><svg class="icon"/);
    // The sidebar is the way back to the tab list, so no separate back button.
    expect(openDetail).not.toContain('id="back-button"');
  });

  test("every id styled in styles.css exists in the rendered page", () => {
    const ids = [...new Set([...read("styles.css").matchAll(/#([a-z][\w-]*)/gi)].map((m) => m[1]!))]
      .filter((id) => !/^[0-9a-f]{3,8}$/i.test(id)); // skip hex colors
    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids) expect(html).toContain(`id="${id}"`);
  });
});

describe("profiles", () => {
  const profileSession = { userId: "profile:p1", lastAccess: "2026-01-01T00:00:00Z", profile: "shopping", tabs: [
    { tabId: "t9", sessionKey: "default", url: "https://shop.test/", title: "Shop" },
  ] };
  const profiles = [
    { id: "p0", name: "main", kind: "named" as const, createdAt: 1, lastUsedAt: 1, userAgent: null, browserRunning: false, tabs: 0, default: true },
    { id: "p1", name: "shopping", kind: "named" as const, createdAt: 1, lastUsedAt: 1, userAgent: "Mozilla/5.0 Firefox/150.0", browserRunning: true, tabs: 1 },
    { id: "p2", name: "burner-abc123", kind: "burner" as const, createdAt: 1, lastUsedAt: 1, userAgent: null, browserRunning: false, tabs: 0 },
  ];
  const fullState = { ...state, sessions: [session, profileSession], profiles };
  const shopping = renderToStaticMarkup(h(GridView, {
    hidden: false, state: fullState, filter: "shopping",
    open: [{ session, tab: session.tabs[0]! }, { session: profileSession, tab: profileSession.tabs[0]! }],
    closed: [], onDeleteProfile: noop, onConfigureProfile: noop, onOpenTab: async () => true,
  }));
  const nav = renderToStaticMarkup(h(Sidebar, { ...sidebarProps, profiles, filter: "shopping", onNewProfile: noop, onConfigureProfile: noop, onShowTrash: noop }));

  test("profile tabs show their profile instead of the session id", () => {
    expect(shopping).toContain('<span class="profile-pill" title="Browser profile">shopping</span>');
  });

  test("the sidebar lists every profile, marks the picked one, and offers configure", () => {
    expect(nav).toContain('id="profile-nav"');
    expect(nav.match(/class="nav-row"/g)).toHaveLength(profiles.length);
    expect(nav).toMatch(/class="nav-item active" aria-current="page" title="shopping, running"/);
    expect(nav).toContain('<span class="nav-avatar burner" aria-hidden="true">B</span>');
    expect(nav).toContain('class="nav-running"');
    expect(nav).toContain('aria-label="Configure shopping"');
    expect(nav).toContain('id="new-profile-button"');
    expect(nav).toContain('id="show-trash-button"');
    // All tabs is not active while a profile is picked.
    expect(nav).toMatch(/<button id="all-tabs-button" type="button" class="nav-item" title="All tabs">/);
  });

  test("nothing is active in the tab detail view", () => {
    const detailNav = renderToStaticMarkup(h(Sidebar, { ...sidebarProps, profiles, filter: undefined }));
    expect(detailNav).not.toContain("nav-item active");
  });

  test("a picked profile narrows the start page and shows its details", () => {
    expect(shopping).toContain(">shopping</h2>");
    expect(shopping).toContain('id="profile-details"');
    expect(shopping).toContain("Mozilla/5.0 Firefox/150.0");
    expect(shopping).toContain("1 tab · running");
    expect(shopping).toContain('aria-label="Move shopping to the trash"');
    expect(shopping).toContain('aria-label="Configure shopping"');
    // Only shopping's tab, and the new tab bar defaults to it.
    expect(shopping.match(/class="tab-card"/g)).toHaveLength(1);
    expect(shopping).toContain('<option value="shopping" selected="">shopping</option>');
  });

  test("the default profile can't be trashed", () => {
    const main = renderToStaticMarkup(h(GridView, { hidden: false, state: fullState, filter: "main", open: [], closed: [], onDeleteProfile: noop }));
    expect(main).toContain('class="profile-trash" disabled="" aria-label="main can&#x27;t be deleted"');
    expect(main).toContain('class="trash-deny"');
    expect(main).toContain("No open tabs in main.");
  });

  test("a picked burner can be chosen in the new tab bar", () => {
    const burner = renderToStaticMarkup(h(GridView, { hidden: false, state: fullState, filter: "burner-abc123", open: [], closed: [], onOpenTab: async () => true }));
    expect(burner).toContain('<option value="burner-abc123" selected="">burner-abc123</option>');
    expect(burner).toContain(">Burner profile</p>");
  });

  test("the profile and trash dialogs render", () => {
    const dialog = renderToStaticMarkup(h(ProfileDialog, { mode: { kind: "create" }, onClose: noop, onSubmit: async () => true }));
    expect(dialog).toContain('<dialog id="profile-dialog"');
    expect(dialog).toContain('<option value="1920x1080" selected="">1920 × 1080 (default)</option>');
    expect(dialog).toContain("Machine details");
    expect(dialog).toContain('id="profile-gpu"');
    expect(dialog).not.toContain(">New fingerprint<");
    const trash = renderToStaticMarkup(h(TrashDialog, { open: false, onClose: noop, load: async () => [], onRestore: async () => true }));
    expect(trash).toContain('<dialog id="trash-dialog"');
    expect(trash).toContain("then they are erased for good");
    expect(trash).not.toMatch(/delete (forever|permanently)/i);
  });

  test("no profile details on All tabs", () => {
    expect(grid).not.toContain('id="profile-details"');
  });
});

describe("connect your agent", () => {
  test("sits in the start page head with a profile picker, copy button and preview popup", () => {
    expect(grid).toMatch(/<div class="page-head">[\s\S]*class="connect-agent"/);
    expect(grid).toContain('<option value="work">work</option>');
    expect(grid).toContain(">Click to copy prompt</span>");
    expect(grid).toContain(">Connect your agent</span>");
    expect(grid).toContain('<dialog id="agent-prompt-dialog"');
    expect(grid).toContain("Your dedicated browser profile is `main`");
    expect(grid).toContain("http://localhost:9377/mcp");
  });
});

describe("theme button", () => {
  test("shows the current theme as a single icon button", () => {
    expect(sidebar).toContain('id="theme-button"');
    expect(sidebar).toContain('title="Theme: Auto (click for Light)"');
    expect(sidebar).not.toContain("<select id=\"theme-select\"");
  });
});

describe("sidebar", () => {
  test("has the collapse toggle and the access key button", () => {
    expect(sidebar).toMatch(/id="collapse-button"[^>]*aria-expanded="true"/);
    expect(sidebar).toContain('aria-label="Collapse sidebar"');
    expect(renderToStaticMarkup(h(Sidebar, { ...sidebarProps, collapsed: true }))).toContain('aria-label="Expand sidebar"');
    expect(sidebar).toMatch(/<button id="auth-button"[^>]*><svg class="icon"/);
    expect(renderToStaticMarkup(h(Sidebar, { ...sidebarProps, authHidden: true }))).toMatch(/id="auth-button"[^>]*hidden=""/);
  });
});

describe("browser status", () => {
  const profile = { id: "p", name: "work", kind: "named" as const, createdAt: 1, lastUsedAt: 1, userAgent: null, browserRunning: false, tabs: 0 };

  test("sits in the sidebar foot", () => {
    expect(sidebar).toMatch(/<div class="sidebar-foot"><div id="browser-status" class="browser-status running"/);
  });

  test("idle when the core answers but no browser runs (no more endless warming up)", () => {
    expect(browserStatus(null, { ...state, running: false, profiles: [profile] })).toMatchObject({ kind: "idle", value: "Idle" });
  });

  test("running when any profile browser is up", () => {
    expect(browserStatus(null, { ...state, running: false, profiles: [{ ...profile, browserRunning: true }] })).toMatchObject({ kind: "running" });
  });

  test("crashed names the profile and reason", () => {
    const crashed = browserStatus(null, { ...state, running: false, profiles: [{ ...profile, browserError: { at: 1, reason: "browser_disconnected" } }] });
    expect(crashed).toMatchObject({ kind: "crashed", value: "Crashed", label: "work" });
    expect(crashed.title).toContain("work: browser_disconnected");
    expect(browserStatus(null, { ...state, running: false, browserError: "browser_died" }).title).toContain("shared browser: browser_died");
  });

  test("offline when the core can't be reached", () => {
    expect(browserStatus("Access key required", state)).toMatchObject({ kind: "offline", label: "Access key required" });
  });
});
