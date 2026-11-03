# explainer-demo

A working 9:16 Helena composition built only from library assets: the voice visualizer moves whenever she speaks, hook words arrive as they are spoken, the pipeline primitive reveals stage by stage on narration words, the red lands on "tiles", a packet travels on "sentence", captions follow the voice, and the request closes it. Slow, flat, centred. Timings come from `narration.json` — here a **stub** from `stub-narration.py` (no audio); swap in a real `narration.json` from one of the TTS runners and the video re-times itself.

![preview](preview.jpg)

```bash
P=assets/tools/render-pipeline
python3 assets/tools/narration/stub-narration.py examples/explainer-demo/script.txt examples/explainer-demo/narration.json
node $P/capture.mjs examples/explainer-demo/demo.html stills /tmp/demo-stills 1 2.6 8.5 13.5 17 21 28 --query "type=grotesk&viz=grid"
node $P/capture.mjs examples/explainer-demo/demo.html frames /tmp/demo-frames --query "type=geometric&viz=trace"   # any family × any visualizer style
```
