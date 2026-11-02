---
id: brand-techsplained
name: tech_splained brand kit
description: Design tokens for the five candidate directions (blueprint, instrument, midnight, clinical, signal) as body classes, the shared 1080×1920 layout/caption/motion tokens, and the OFL font files. Load it in every composition; set one direction class on <body>.
type: brand
kind: plumbing
entry: tokens.css
api: <link rel="stylesheet" href="…/tokens.css"> then <body class="ts-<direction>">; read var(--accent) etc.
requires: []
formats: [9:16]
source: original (2026-11-01) — tokens from the aesthetic exploration in tech-splained/docs/aesthetics
license: tokens internal (Kyle Shervington); fonts OFL 1.1 (Inter, Inter Tight, Space Grotesk, JetBrains Mono, IBM Plex Mono, Geist)
origin: aesthetic exploration 2026-11-01
used_in: []
added: 2026-11-01
preview: preview.jpg
---

# tech_splained brand kit

![preview](preview.jpg)

Five token sets, one per candidate direction, plus the layout tokens every composition shares (safe area, caption size/position, type scale, easing/durations). Until the decision log marks a direction as chosen, compositions may use any of them for A/B tests; afterwards, only the chosen one (the others stay for reference).

## Use

```html
<link rel="stylesheet" href="../../assets/brand/techsplained/tokens.css">
<body class="ts-instrument">
<style>.node{border:var(--stroke) solid var(--line);border-radius:var(--radius);font-family:var(--display)}</style>
```

## Notes

- One accent per video: `--accent` only. `--accent2` is reserved for a second semantic meaning (a warning, a "before" state) and most videos never need it.
- Contrast: every `--text`/`--bg` pair is ≥ 16:1; `--accent` on `--bg` is ≥ 4.5:1 in every direction except clinical's blue on white, which is borderline — in clinical, highlighted caption words use the accent but body caption text stays `--text`.
- Wordmark/logo: not designed yet (see decision log).
