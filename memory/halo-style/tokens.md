---
name: halo-style-tokens
description: The halo design tokens (colors, surfaces, text) as plain CSS vars, ported from haloLesson's app.css
type: reference
---

# Halo style tokens

*(as of 2026-11-07)* Source: `../haloLesson/web/src/app.css` (Tailwind 4 `@theme`). The hwl dashboard
is plain CSS, so the tokens are plain custom properties on `:root`. Duolingo names kept on purpose.

Brand colors (every shade is a `color-mix` of one var, so changing one value re-themes everything):
- `--accent: #7c5cff` (violet) — primary buttons, brand
  - `--accent-deep: color-mix(in oklab, var(--accent) 80%, black)` — the 3D ledge under primary buttons
  - `--accent-light: color-mix(in oklab, var(--accent) 75%, white)` — hover
  - `--accent-pale: color-mix(in oklab, var(--accent) 22%, white)` — selection, soft fills
- `--secondary: #ec4f9a` (pink) — selected/active states, focus outline, input focus
  - `--secondary-deep` (80% + black), `--secondary-pale` (14% + white)
- Fixed: `--cardinal #ff4b4b` (danger, ledge `#d33131`), `--bee #ffc800` (halo yellow), `--streak #ff9600`, `--gem #ce82ff`

Neutrals, light:
- `--surface #ffffff` (page + cards), `--eel #f7f7f7` (hover / soft fill), `--swan #e5e5e5` (borders + ledges),
  `--ink #3c3c3c` (text), `--wolf #777777` (muted text), `--hare #afafaf` (placeholder / faint)

Neutrals, dark (Duolingo dark mode; only the neutrals flip, so components need no dark overrides):
- `--surface #131f24`, `--eel #202f36`, `--swan #37464f`, `--ink #f1f7fb`, `--wolf #b4c4cc`, `--hare #52656d`
- `--secondary-pale: color-mix(in oklab, var(--secondary) 24%, #131f24)`, `--accent-pale: … 30%, #131f24`
- accent-deep as *text* on dark vanishes; use accent-light for text there.

Base: `* { box-sizing: border-box }`, `:focus-visible { outline: 3px solid var(--secondary); outline-offset: 3px }`,
`::selection { background: var(--accent-pale) }`, `cursor: pointer` on enabled buttons.

Related: [[halo-style-components]] [[halo-style-theme]] [[duolingo-color-palette]]
