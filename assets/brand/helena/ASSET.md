---
id: brand-helena
name: Helena brand kit
description: Helena's design tokens — true-white ground, white cards lifted by a soft shadow, near-black ink, one red (#D0111B), Michroma + Inter type — as `hl-helena`; slow-flat motion tokens, the 1080×1920 layout/caption tokens and OFL fonts. The losing type families and the five archived directions stay in the file for reference. Load it in every composition.
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

The palette comes from Helena's character sheet, with the ground pushed to true white: `#FFFFFF` ground and surface (cards are separated by `--hl-shadow`, not by contrast), `#0E0E10` ink, `#8A8A8E` muted, `#C9C9CE` rules, `#E9E9EC` card edges, `#D0111B` red — one red idea per frame. Type: Michroma (`--display`, `--label`) + Inter (`--body`, `--caption`). Motion tokens are deliberately slow and flat (`--hl-dur-draw: 1.2s`, no overshoot easings). Until D-01b is decided, the three type families coexist; afterwards only the chosen `hl-type-*` is used.

## Use

```html
<link rel="stylesheet" href="../../assets/brand/helena/tokens.css">
<body class="hl-helena">
<style>.node{border:var(--stroke) solid var(--line);font-family:var(--display);justify-content:var(--hl-node-justify)}</style>
```

## Notes

- `--accent2` is ink in Helena's direction: there is no second accent.
- The archived directions (`hl-blueprint`, `hl-instrument`, `hl-midnight`, `hl-clinical`, `hl-signal`) still work for one-off experiments; don't use them for published videos.
- Wordmark: not designed (D-08); the 3×3 dot mark (see `voice-visualizer`) is the working logo.
