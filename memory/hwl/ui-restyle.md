---
name: hwl-ui-restyle
description: Dashboard restyle to the halo style - change the UI (look), keep the UX (layout, flows) mostly as is
type: decision
---

# Dashboard restyle

*(as of 2026-11-07)*
- User: "not change the UX too much but mostly change the UI". Keep layout, flows, features; change the look
  to the halo style ([[halo-style-tokens]], [[halo-style-components]], [[halo-style-typography]], [[halo-style-theme]]).
- Stays **plain CSS** (`src/web-ui/styles.css`, served as-is by the Bun server); no Tailwind/Vite build added.
- Accent: user said "choose" → **violet `#7c5cff` accent + pink `#ec4f9a` secondary**, same as haloLesson
  (pink keeps a nod to Bloom's old pink `#f0559e`). Fixed, no color picker.
- Old look for reference: dark-first, Inter, pink `#f0559e`, radial pink glow, `data-theme` attribute.

Related: [[hwl-rebrand]] [[halo-style-branding]]

*(2026-11-07, revised)* User: "what is the color of internet?" → accent is **link blue `#1cb0f6`**
(Duolingo "macaw", the classic web/hyperlink blue), secondary stays **pink `#ec4f9a`** (Bloom heritage).
User: "the accent color should be user configurable anyways" → **accent and secondary are user-configurable**
in the dashboard (presets + custom picker, like haloLesson's Appearance card). No accounts in hwl, so saved
per browser in localStorage (`hwl-accent`, `hwl-secondary`), applied by the no-flash inline script too.

## Default secondary is purple *(2026-11-07)*
User asked: default secondary is now violet `#7c5cff` (theme.ts DEFAULT_SECONDARY + styles.css `--secondary`), replacing pink `#ec4f9a`. Pink stays a preset.
