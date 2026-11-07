---
name: 3d-mascot-request
description: Queued task from the haloLesson session: build a three.js 3D mascot for hwl like haloLesson's spinning book
type: project
---

*(as of 2026-11-07)* Queued AFTER the layout rework. Spec from the peer (haloLesson) session:
- Read haloLesson `web/src/**/book3d.ts` and `BookArtwork.tsx` first and mirror them.
- Solid meshes: ExtrudeGeometry, MeshLambertMaterial, ambient + one directional light. No CSS 3D.
- Canvas textures ~64px per world unit, SRGB color space, anisotropy 8, mipmaps on.
- three via dynamic import, pinned `three@0.170.0` + `@types/three`.
- Render at devicePixelRatio × visualViewport.scale, capped 2560. Re-render on ResizeObserver, on matchMedia
  resolution change (re-armed after each change) and visualViewport resize.
- Colors from CSS vars (resolve color-mix through a 1px canvas); live recolor via MutationObserver on `<html>`.
- Pause with IntersectionObserver and when the tab is hidden; static pose for prefers-reduced-motion.
- On unmount dispose everything, then `forceContextLoss`.
- Flat 2D parts stay CSS/SVG.
Mascot idea: the hwl logo (globe with a yellow halo, see `HaloLogo` in icons.tsx and [[branding]]).
