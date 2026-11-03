---
id: voice-visualizer
name: Voice visualizer (Helena's carrier)
description: The mark that moves while Helena speaks — grid (the 3×3 dot mark from her uniform, centre dot red), trace (one red line) or disc (red disc in hairline rings) — driven per frame by levels.json from levels.py, with a stub mode for storyboards. Use in every video; it's the only "presence" she has on screen.
type: motion
kind: plumbing
entry: visualizer.js (+ ../../tools/narration/levels.py produces levels.json from narration.wav)
api: GML.visualizer.create(parent, { style, levels: window.LEVELS, narration, x, y, scale }) → { el, render(t), bands(t) }
requires: [render-pipeline, narration-sync, brand-helena]
formats: [9:16, 16:9, 1:1]
source: original (2026-11-03)
license: internal — Kyle Shervington
origin: Helena type test 2026-11-03
used_in: []
added: 2026-11-03
preview: preview.jpg
---

# Voice visualizer

![preview](preview.jpg)

Helena never appears in a video; this is how the viewer knows she's there. The style is a D-01c decision (grid / trace / disc); until decided, compositions pass it explicitly.

## Use

```bash
python3 assets/tools/narration/levels.py Project_Files/narration.wav Project_Files/levels.json   # 50 Hz, 3 bands, normalised
```
```html
<script src="levels.json.js"></script>
<script>
  const V = GML.visualizer.create(stage, { style: "grid", levels: window.LEVELS, narration: N, x: 540, y: 300 });
  // render(t): V.render(t);
</script>
```

## Notes

- With stub narration (no audio) it animates while a word is "being spoken" so storyboards still show it moving.
- Keep it at the top centre (y ≈ 270–300) under the meta line; it must stay inside the safe area and never overlap captions.
- Motion is driven by audio only — never by the music's beat grid.
