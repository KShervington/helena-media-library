---
id: render-pipeline
name: Render pipeline (runtime + capture + audio + encode + beat map)
description: Everything to turn an HTML composition into a beat-synced MP4 — core.js runtime (beat grid, easing, keyframes, phone-screen + status-bar helpers), parallel headless frame capture, stills, transparent element export, song trimming/mixing at −14 LUFS, poster-as-frame-0 encoding, and drift-aware beat mapping.
type: tool
kind: plumbing
entry: core.js (runtime), capture.mjs, audio.sh, encode.sh, beat-map.py, sfx-tap.py
api: GML.core.{grid, seg, lerp, ease, kf, screen, statusBar, icon, injectCSS, ready, brandURL}
requires: []
source: copied from Gaijin-Motorsports-LLC/media-library @ a751fe6 (2026-11-01)
license: internal — Kyle Shervington (shared with the Gaijin Motorsports library)
origin: Gaijin media library
used_in: []
added: 2026-11-01
preview: none
---

# Render pipeline

Needs Node 18+, Playwright (`npm i playwright && npx playwright install chromium`, or `CHROME=/path/to/chrome`), ffmpeg, and Python 3 with `librosa` + `matplotlib` for beat maps.

## Composition contract

A composition is one HTML page:

- links `assets/brand/…/tokens.css`, sets `window.GML = { root: "<path to library root>" }`, then loads `core.js` and the component scripts (classic `<script>` tags — they work from `file://`);
- defines `window.SIZE = { width, height }`, `window.DURATION` (s), `window.ready` (a Promise: create components, `await GML.core.ready([...image URLs])`, measure layout), and `window.render(t)` — **a pure function of t**;
- optionally reads `?textless=1` to hide its caption layer (for the no-caption master) and defines `window.isolate(selector)` for transparent element exports.

`examples/library-demo/demo.html` is a working template.

## Steps

```bash
P=assets/tools/render-pipeline
python3 $P/beat-map.py song.mp3 --anchor <drop s> --out beat-map.json --chart beat-map.png --js <name>   # once per song
python3 $P/sfx-tap.py tap.wav                                                                             # optional
bash $P/audio.sh song.mp3 <start> <duration> mix.wav --sfx tap.wav@<video s>@0.55                         # trim, fade, mix, −14 LUFS
node $P/capture.mjs comp.html stills /tmp/stills 0.5 4.2 9.3                                             # check scenes + mid-transitions
node $P/capture.mjs comp.html frames /tmp/frames --workers 4                                             # all frames
node $P/capture.mjs comp.html frames /tmp/frames-textless --query textless=1                             # no-caption master
node $P/capture.mjs comp.html element sticker.png --t 5.9 --selector '#noAccount'                        # transparent PNG
bash $P/encode.sh /tmp/frames mix.wav out.mp4 --poster 180                                               # poster baked into frame 0 + out_poster.jpg
```

## Lessons baked in

- Wait for fonts and every image before the first capture (`GML.core.ready`), or early frames render with fallback fonts.
- Generated songs can drift in tempo: build grids from `beat-map.py`'s `beats[]`, not one BPM. `grid().at(k)` takes fractional beats (8.5 = the and-of) since 2026-10-20.
- The tracker's beats can sit a few tens of ms ahead of the audible attacks, and a drop after a silent gap lands later still: check the hero hits on the waveform (a 30–160 Hz / full-band envelope around the beat) and pin them to the measured time — the music assets record these as `impacts`.
- Replace frame 0 with the poster instead of adding a frame, so duration and audio sync don't move.
- Check transparent exports on a checkerboard — elements a composition shows with explicit `visibility: visible` leak through hidden parents.
