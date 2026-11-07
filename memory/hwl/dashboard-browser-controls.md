---
name: hwl-dashboard-browser-controls
description: Dashboard can open/close/navigate/scroll tabs itself via /api/tabs/new, /api/tabs/close, /api/navigate, /api/scroll
type: decision
---

*(as of 2026-11-07)* For user freedom, the dashboard (src/web-ui) drives tabs directly:
- Grid: new-tab bar (address via `address.ts` `toUrl`, profile select incl. "New burner") -> `POST /api/tabs/new`
  -> core `POST /tabs` with sessionKey "dashboard". Core returns no userId, so App finds it in the next /api/state.
- Detail: browser bar (back/forward/reload/address/close) -> `/api/navigate`, `/api/tabs/close`;
  mouse wheel over the live view is summed and flushed every 120ms -> `/api/scroll`.
- Firefox pref `dom.disable_open_during_load: false` is set at launch: the popup blocker dropped
  script-clicked target=_blank links, and popups become managed tabs anyway.

Related: [[hwl-user-freedom]] [[hwl-ui-restyle]]
