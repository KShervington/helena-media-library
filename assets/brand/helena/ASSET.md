---
id: brand-helena
name: Helena brand kit
description: Helena's design tokens — off-white ground, white surfaces, near-black ink, one red (#D0111B) — as `hl-helena`, with the three candidate type families as `hl-type-*`, slow-flat motion tokens, the 1080×1920 layout/caption tokens and OFL fonts; the five archived directions (hl-blueprint …) are kept for reference. Load it in every composition.
type: brand
kind: plumbing
entry: tokens.css
api: <link rel="stylesheet" href="…/tokens.css"> then <body class="ts-<direction>">; read var(--accent) etc.
requires: []
formats: [9:16]
source: original (2026-11-01) — tokens from the aesthetic exploration in helena-loves-you/docs/aesthetics
license: tokens internal (Kyle Shervington); fonts OFL 1.1 (Inter, Inter Tight, Jost, Michroma, Space Grotesk, JetBrains Mono, IBM Plex Mono, Geist)
origin: aesthetic exploration 2026-11-01
used_in: []
added: 2026-11-01
preview: preview.jpg
---

# Helena brand kit

![preview](preview.jpg)

The palette comes from Helena's character sheet: `#F0F0F2` ground, `#FFFFFF` surface, `#0E0E10` ink, `#8A8A8E` muted, `#C9C9CE` line, `#D0111B` red — one red idea per frame. Motion tokens are deliberately slow and flat (`--hl-dur-draw: 1.2s`, no overshoot easings). Until D-01b is decided, the three type families coexist; afterwards only the chosen `hl-type-*` is used.

## Use

```html
<link rel="stylesheet" href="../../assets/brand/helena/tokens.css">
<body class="hl-helena hl-type-grotesk">
<style>.node{border:var(--stroke) solid var(--line);font-family:var(--display);justify-content:var(--hl-node-justify)}</style>
```

## Notes

- `--accent2` is ink in Helena's direction: there is no second accent.
- The archived directions (`hl-blueprint`, `hl-instrument`, `hl-midnight`, `hl-clinical`, `hl-signal`) still work for one-off experiments; don't use them for published videos.
- Wordmark: not designed (D-08); the 3×3 dot mark (see `voice-visualizer`) is the working logo.
