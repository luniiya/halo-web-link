---
name: layout-rework
description: Dashboard layout rework chosen by the user: haloLesson-style collapsible left sidebar + start page; full plan and progress
type: decision
---

# Layout rework: sidebar + start page *(as of 2026-11-07)*

The user said the old layout (sticky header + one long page: summary strip, new-tab bar,
Open grid, Profiles list, Closed grid) was "pretty poorly made". They picked **"Sidebar + start
page"** and asked to copy haloLesson's sidebar (`/home/ayaya/dev/haloLesson/web/src/components/AppLayout.tsx`
and `web/src/app.css`, read-only, don't edit haloLesson), including its new **compact (collapsible) sidebar**.

## haloLesson sidebar pattern to copy
- Fixed left `aside.sidebar`, 2px right border (swan), width `var(--sidebar)`: 15rem, 5rem collapsed.
  `transition: width 200ms ease, padding 200ms ease`, overflow hidden, nowrap, padding 20px (10px collapsed).
- Logo on top (logo only when collapsed). Nav: column, gap 8px, `.nav-item`: radius 12px, padding 12px 16px,
  14px / 900 / uppercase, color wolf, hover bg eel; active: 2px border secondary, bg secondary-pale, text secondary.
- Collapsed: item justify-center, px 0, labels sr-only, `title` = tooltip.
- Bottom (`margin-top:auto`, border-top 2px, pt 16px): collapse toggle (aria-expanded, Collapse/Expand icon) + avatar.
- Main gets `margin-left: var(--sidebar)`. Mobile: top bar instead.

## Plan for hwl
- **Sidebar.tsx (new, not written yet)**: brand (HaloLogo + "Halo Web Link"); nav "All tabs" (TabsIcon + open count,
  active when no filter); "Profiles" heading; one nav-item per profile (letter avatar, green dot when running, tab
  count, hover gear opens configure; click = filter grid, and from detail view go back to grid via showGrid());
  "+ New profile"; Trash. Footer: `#browser-status` (dot + Idle/Running, `browserStatus()` currently exported from
  GridView.tsx, move it), icon buttons `#theme-button` (keep title "Theme: Auto (click for Light)" format),
  ColorPicker (popover must be `position: fixed` next to the sidebar since the aside clips), `#auth-button`
  (KeyIcon, hidden when auth off), collapse toggle.
- **Connect agent stays as it was**: see [[connect-agent-keep]]. Put the original pill control somewhere visible
  (top of start page / page head), don't turn it into a nav item.
- **App.tsx**: holds `filter` (profile name or null; reset if that profile disappears or is deleted), profile dialog
  mode, trashOpen; renders ProfileDialog + TrashDialog once (move them out of ProfileList.tsx). Layout
  `<Sidebar/> <main>`; main `margin-left: var(--sidebar)`. Header.tsx gets removed.
- **GridView = start page**: page head (eyebrow + h2 "All tabs" or the profile name; profile details when filtered:
  kind, UA, screen, meta, configure + trash buttons reusing `.profile-*` classes); NewTabBar as the hero
  (`key={filter}`, default profile = filter); "Open" grid filtered by `session.profile`; Closed as a compact list
  (title, url, time ago, `closureLabel(reason)` from lifetime.ts, last ~8 + "Show all (N)"), replacing the closed
  thumbnail cards that sat on "Loading view…" forever. Drop the summary strip. ProfileList.tsx gets replaced.
- **CSS**: add sidebar / nav-item / start page / closed list rules to styles.css; `.activity` sticky top was 100px
  for the header, now ~28px. Mobile (<750px): sidebar becomes a horizontal top bar, labels sr-only.

## Done so far (2026-11-07)
- icons.tsx: added TabsIcon, SparkIcon, KeyIcon, SidebarCollapseIcon, SidebarExpandIcon.
- theme.ts: `savedSidebarCollapsed()` / `applySidebarCollapsed(bool)` (class `sidebar-collapsed` on `<html>`,
  key `hwl-sidebar-collapsed`); index.html inline script adds the class before first paint.
  So the CSS should define `--sidebar` on `:root` and `:root.sidebar-collapsed`.
- AgentPrompt.tsx: was turned into a nav item + dialog, then **reverted** to the original on user request.
- Nothing else of the rework is written yet. App/GridView/Header/ProfileList are unchanged.

## After
Update tests/web-ui/markup.test.ts for the new structure (keep rules: >5 styled ids that all exist in rendered
markup, `[hidden]{display:none!important}`, `.tab-detail:fullscreen .screen`, no arrow glyphs). Run
`bun test tests/web-ui` and `bun run typecheck:container`. See [[handoff-2026-11-07]].

## Built (2026-11-07, second session)
- `components/Sidebar.tsx`: brand, All tabs (#all-tabs-button, open count), Profiles heading, `#profile-nav` (letter
  avatar, pink for burners, green dot when running, tab count, hover gear = configure), `#new-profile-button`,
  `#show-trash-button` (.nav-trash). Foot: `#browser-status` (dot + Idle/Running), `#theme-button`, ColorPicker,
  `#auth-button` (KeyIcon icon button), `#collapse-button` (aria-expanded). `browserStatus()` now lives here.
  `filter` undefined = tab detail view, nothing highlighted.
- `App.tsx` holds filter, collapsed, profile dialog mode, trashOpen; renders ProfileDialog + TrashDialog once.
  Picking a profile = setFilter + showGrid(). Filter resets when the profile disappears or gets trashed.
- `GridView.tsx` = start page: page head (eyebrow + h2 "All tabs"/profile name) with the **original Connect agent
  pill on the right** (passed as `actions`; only on the start page, not the tab detail view); `#profile-details`
  (.profile-row) when filtered; NewTabBar (key=filter, defaults to the filter, lists a picked burner too);
  Open grid filtered by session.profile; "Recently closed" as `#closed-list` rows (8 shown + `#closed-toggle`
  Show all), `timeAgo()` exported. Summary strip is gone.
- Deleted Header.tsx and ProfileList.tsx (the deletion got staged in git by accident with `git rm --cached`).
- CSS: `--sidebar` 15rem / 5rem on `:root.sidebar-collapsed`; color popover is `position: fixed` beside the
  sidebar; `.activity` sticky top 28px; <750px the sidebar is a sticky horizontal icon bar (`--sidebar: 0px`).
- markup.test.ts rewritten for this; web-ui 83/83, typecheck clean.
- **User approved it on 2026-11-07** after seeing it live ("YOU COOKED SO HARD"). Treat this layout as the baseline.

## Tab detail view (2026-11-07, user request)
- Live view on top at full width (`.detail-layout` max 1280px), then `.detail-below`: left = other open tabs of the
  SAME profile as TabCards (`siblingTabs()` in DetailView.tsx; same session when no profile; App queues their
  thumbnails), right = Activity. Both use `.detail-panel`. Stacks under 1100px.
- Activity log no longer records the dashboard's viewing-lease heartbeat (`server.js` recordTabActivity); Keep open
  toggles show as "keep open" / "allow idle close" (`summarizeCall`).
- "Protected while viewing or waiting for a reply" removed (`lifetimeLabel` returns "" when protected); the
  "Closes in Ns" warning stays.

## One browser bar + 3 view sizes (2026-11-07, user request)
- Open tab: a single bar: back, forward, reload, address (tooltip = page title), `#keep-open-button` (pin icon,
  aria-pressed, rotates when on), `#view-mode` (segmented radiogroup), `#close-tab-button`. The title/URL row
  (`.tab-meta`) only shows for closed tabs now.
- View mode `ViewMode = "window" | "page" | "screen"`: windowed; "Fill the page" = `.tab-detail.fill-page`
  (position fixed, inset 0, Esc exits); true browser fullscreen via requestFullscreen (leaving it drops back to window).
- Close hover is deliberately destructive-looking: red fill, X spins, shake + pulsing red ring.
- The hover popup on the live view was the `title` on `#detail-screen`, not the alt; now aria-label only, imgs `alt=""`.
- Content is centered: `main > section { max-width: 1280px; margin-inline: auto }` (start page and tab detail), not anchored left.
- Profile dialog is wide (max 1040px): Identity column | Machine details column, switches in a grid underneath; stacks under 860px. No more collapsible <details>.
- Sidebar foot tools use `justify-content: space-between` (equal gaps), no margin-left:auto on collapse.
- Tried putting other tabs + activity beside the live view on wide screens; user rejected it ("it should always be below"). Instead the detail section is min-height 100vh minus main padding and the two panels below flex to fill what the live view leaves (min 220px), same height, scrolling inside, so the page does not scroll.
- Exception (user asked): when the streamed page is phone-shaped (ratio w<h) and the window is >=1100px, `.detail-layout.portrait` puts the panels beside the live view, stacked, as tall as it.
- Removed the "All tabs" back button above the tab view (sidebar covers it).
- Other-tabs panel cards: screenshot is the card background with a surface-colored veil (78%, 62% on hover), title on top, no footer. Light = white wash, dark = dim (surface token does both).
