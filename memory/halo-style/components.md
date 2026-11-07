---
name: halo-style-components
description: Halo component recipes in plain CSS - chunky 3D buttons, cards, inputs, nav items, dialogs, animations
type: reference
---

# Halo component recipes

*(as of 2026-11-07)* Translated from haloLesson `app.css` `@layer components`. Fuller research: [[duolingo-components]].

The signature move: **solid ledge, no blur**. A `box-shadow: 0 Npx 0 <darker shade>` under the element;
on `:active` it does `translateY(Npx)` and the shadow goes away, so it physically presses.

- `.button`: inline-flex, min-height 44px, radius 12px, padding 10px 20px, 14px font, weight 900,
  UPPERCASE, letter-spacing .025em, transition 100ms on color/bg/transform/shadow; disabled opacity .5.
- `.button-primary`: bg accent, white text, `0 4px 0 var(--accent-deep)`; hover bg accent-light; active translateY(4px) + no shadow.
- `.button-secondary`: 2px border swan, bg surface, text wolf, `0 2px 0 var(--swan)`; hover bg eel + text ink; active translateY(2px).
- `.button-danger`: bg cardinal, white, `0 4px 0 #d33131`; hover `#ff6363`.
- `.button-ghost`: text wolf; hover bg eel + text ink.
- "pressed while working": translateY(4px), no shadow, `press-pop` .35s (scale 1 → .96 → 1).
- Card: radius 16px, 2px border swan, bg surface, padding 20-24px. Clickable card/row adds `0 2px 0 var(--swan)`,
  hover bg eel, active translateY(2px).
- Input: radius 12px, 2px border swan, padding 12px 16px, 16px / 600; placeholder hare / 500;
  focus border secondary + `0 0 0 3px` secondary at 20%.
- Label: column, gap 6px, 14px / 800, wolf.
- Nav/tab item: radius 12px, padding 12px 16px, 14px / 900 UPPERCASE, wolf, hover bg eel;
  active = 2px border secondary, bg secondary-pale, text secondary.
- Dialog: radius 24px, bg surface, no border, big soft shadow, backdrop black/50 + blur.
- Error notice: radius 12px, 2px border red-100, bg red-50, 14px / 700, cardinal text.
- Animations: `reveal-up` (.3s, from opacity 0 + 10px down), `pop-in` (.3s, from scale 0 rotate -30deg).

Related: [[halo-style-tokens]] [[halo-style-typography]]
