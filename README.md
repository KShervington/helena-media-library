# helena_loves_you media library

Reusable, hand-picked building blocks for helena_loves_you explainer videos: Helena's brand kit, diagram primitives, the voice visualizer and other motion pieces, the caption renderer, music beds, and the render pipeline. Same rules as the Gaijin Motorsports library: **only assets Kyle has chosen go in**, and every asset carries an `ASSET.md` that `INDEX.md` is generated from.

## How it's organised

```
INDEX.md                    one line per asset (generated) — read this first
assets/<type>/<name>/       one folder per asset: ASSET.md + files + a small preview
  brand/      tokens, fonts, wordmark, the chosen design direction(s)
  diagrams/   primitives: pipeline, before/after, zoom-in, stack, tree, timeline, comparison grid, counter
  motion/     the voice visualizer (Helena's carrier), title cards, reveals, request cards
  captions/   the narration-synced caption renderer (word highlight, safe-area placement)
  audio/      sparse tonal music beds; the SFX kit
  tools/      render pipeline (runtime, capture, audio, encode), narration tooling (TTS runners, alignment, levels.py, stub)
examples/explainer-demo/    a working 9:16 composition built only from library assets (starter template)
templates/ASSET.md          the entry template
scripts/build-index.mjs     rebuilds and validates INDEX.md
```

## Using it for a new video (what `/helena-produce` does)

1. Read `INDEX.md` only. Pick what fits; note in the project's `Docs/plan.md` what's reused and what's new.
2. Open the chosen assets' `ASSET.md` for the API and caveats.
3. **Plumbing** (brand, diagrams, captions, tools, transitions) — reuse freely. **Creative** (title-card treatments, outros, music) — check `used_in`; don't repeat one in back-to-back videos.
4. Compositions load assets in place via relative paths (see `examples/explainer-demo/demo.html`); copy what a project used into its own `Assets/` so the project folder stays self-contained.

## Composition contract (extends the Gaijin render pipeline)

A composition is one HTML page that:

- sets `window.GML = { root }`, loads `assets/tools/render-pipeline/core.js` and the component scripts;
- defines `window.SIZE = {1080, 1920}`, `window.DURATION`, `window.ready` (Promise), and `window.render(t)` — **a pure function of t**;
- **loads `narration.json`** (word-level timestamps from the TTS/alignment step) and derives every reveal time from it via `GML.narration.at("word or phrase", occurrence)` — so visuals follow the voice, not a hand-typed timer;
- **loads `levels.json`** (loudness bands from `levels.py`) and renders `GML.visualizer` every frame — Helena's only on-screen presence;
- sets `<body class="hl-helena hl-type-<family>">` and uses only brand tokens for colour and type;
- reads `?textless=1` to hide the caption layer, and implements `window.isolate(selector)` for transparent exports.

## Adding assets (curation)

After each video, `/helena-produce` lists numbered candidates in the project's `Docs/library-candidates.md`. Only the numbers Kyle picks are added, generalised (parameters instead of baked-in copy), on a branch `add/<project-folder-name>` with a PR. Merging is the approval. Then `node scripts/build-index.mjs` (`--check` in CI).

## Rules

- No rendered video or frame sequences here — those live in the dated project folders.
- Keep binaries lean: compressed audio, previews ≤ 1200 px wide.
- Record the licence per asset. Fonts here are OFL (Inter, Inter Tight, Space Grotesk, JetBrains Mono, IBM Plex Mono) or Vercel's OFL Geist.
- `assets/tools/render-pipeline` and `assets/tools/sfx-kit` were copied from `Gaijin-Motorsports-LLC/media-library @ a751fe6`; keep them in sync deliberately (diff before pulling changes either way).
