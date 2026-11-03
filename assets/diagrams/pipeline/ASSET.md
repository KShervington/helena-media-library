---
id: diagram-pipeline
name: Pipeline primitive (vertical)
description: The vertical stage-by-stage pipeline (input → … → output) — white stages arrive at narration times, hairline edges grow, one stage takes the red (others can dim), and a packet can travel the whole chain. Use for any "data flows through steps" mechanism.
type: diagram
kind: plumbing
entry: pipeline.js
api: GML.pipeline.create(parent, { steps: [{ label, index? }], x, y, width, gap, height }) → { el, nodes, edges, render(t, { reveal[], highlight, highlightAt, packet, dimOthers }) }
requires: [render-pipeline, brand-helena]
formats: [9:16]
source: original (2026-11-01)
license: internal — Kyle Shervington
origin: explainer-demo 2026-11-01
used_in: []
added: 2026-11-01
preview: preview.jpg
---

# Pipeline primitive

![preview](preview.jpg)

Five 104-px stages fit between y 470 and 1250 with a 48-px gap; for more stages, zoom (see the storytelling doc) rather than shrinking. Reads only brand tokens, so it renders correctly in every direction.

## Use

```js
const P = GML.pipeline.create(fig, { steps: [{ label: "Image" }, { label: "256 tiles" }, { label: "Vision encoder" }, { label: "Tokens" }, { label: "Language model" }] });
// render(t):
P.render(t, { reveal: [N.at("picture"), N.at("chops"), N.at("puzzle"), N.at("number"), N.at("language")],
              highlight: 1, highlightAt: N.at("tiles"), packet: pk /* 0..1 or null */, dimOthers: true });
```

## Notes

- Children appended to a node (e.g. a tiles grid) ride along with it; set their own opacity from `render`.
- Not built yet: horizontal variant, branching (use `diagram-graph` when it exists), per-stage sub-labels.
