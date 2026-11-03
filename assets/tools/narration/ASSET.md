---
id: narration-sync
name: Narration timing (narration.json + GML.narration + stub generator)
description: Narration tooling — GML.narration (at("word"), end(), beat("id"), after()) so every reveal and caption follows Helena's voice; TTS runners (elevenlabs.mjs, kokoro.py, chatterbox.py + align.py) that write narration.wav + narration.json; levels.py that turns the wav into loudness bands for the visualizer; stub-narration.py for storyboards. Use in every video.
type: tool
kind: plumbing
entry: narration.js (runtime), elevenlabs.mjs / kokoro.py / chatterbox.py + align.py (voice → narration.wav + narration.json), levels.py (wav → levels.json), stub-narration.py (storyboard stub), VOICE.md (Helena's frozen voice, once decided)
api: GML.narration.create(window.NARRATION) → { at, end, beat, after, find, wordsBetween, index, words, duration }
requires: [render-pipeline]
formats: [9:16, 16:9, 1:1]
source: original (2026-11-01)
license: internal — Kyle Shervington
origin: explainer-demo 2026-11-01
used_in: []
added: 2026-11-01
preview: none
---

# Narration timing

The contract that makes visuals follow the voice. The TTS step writes `narration.json` (`{ duration, words: [{ w, s, e }], beats: [{ id, s }] }`) and a `.js` twin (`window.NARRATION = …`) because `file://` pages can't `fetch()`. Compositions derive **every** reveal time from it (`N.at("tiles")`), never from hand-typed seconds, so re-recording the voice re-times the video for free.

## Use

```html
<script src="../../assets/tools/narration/narration.js"></script>
<script src="narration.json.js"></script>
<script>
  const N = GML.narration.create(window.NARRATION);
  window.DURATION = Math.ceil(N.duration + 0.5);
  const tReveal = N.at("tiles");            // first "tiles"
  const tSecond = N.at("tiles", 2);         // second occurrence
  const tPhrase = N.at("puzzle pieces");    // phrase
  const tBeat   = N.beat("mechanism");      // from the script's "# mechanism" markers
</script>
```

```bash
python3 stub-narration.py script.txt narration.json      # estimated timings for storyboarding (marks the file stub: true)
```

## Notes

- Lookups throw with a clear message when a word isn't found — fix the script/lookup rather than guessing a time.
- Matching is case/punctuation/apostrophe-insensitive ("It's" matches "its").
- Replace stub timings with real ones before QA; `stub: true` in the file is a QA fail.
