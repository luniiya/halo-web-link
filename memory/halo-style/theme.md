---
name: halo-style-theme
description: How halo dark mode works - .dark class on html, Auto/Light/Dark, inline no-flash script
type: reference
---

# Halo theme mechanism

*(as of 2026-11-07)* From haloLesson (`web/src/lib/theme.ts`, `web/index.html`).

- `.dark` class on `<html>`; dark only redefines the neutral tokens ([[halo-style-tokens]]).
- Choice is Auto / Light / Dark, **default Auto** (follows `prefers-color-scheme`), saved per device in localStorage.
- An inline `<script>` in `<head>` applies `.dark` before first paint so dark mode never flashes white,
  and sets `<meta name="theme-color">` to `#131f24` in dark (`#ffffff` light).
- Auto also listens to `matchMedia("(prefers-color-scheme: dark)")` changes.

Related: [[halo-style-components]]
