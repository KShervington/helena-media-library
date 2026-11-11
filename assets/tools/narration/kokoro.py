#!/usr/bin/env python3
"""Kokoro-82M (Apache-2.0) → narration.wav + narration.json with native word timestamps.
  python3 kokoro.py script.txt outDir [--voice af_heart] [--speed 0.95] [--lexicon lexicon.json]
Delivery (Helena = flat): Kokoro has no tags or expressiveness knob — flatness comes from the voice (af_heart / af_bella / bf_emma read calmest) and speed ≤ 1.0.
pip install kokoro soundfile   (first run downloads hexgrad/Kokoro-82M; Mac/CPU is fine). Untested in the cloud container (no HF access)."""
import sys, os, re, json, datetime
import numpy as np, soundfile as sf
from kokoro import KPipeline

src, out = sys.argv[1], sys.argv[2]
opt = lambda n, d: sys.argv[sys.argv.index("--" + n) + 1] if "--" + n in sys.argv else d
voice, speed = opt("voice", "af_heart"), float(opt("speed", "0.95"))
lex = json.load(open(opt("lexicon", ""))) if "--lexicon" in sys.argv else {}
os.makedirs(out, exist_ok=True)
pipe = KPipeline(lang_code="a")  # American English
SR, PAUSE = 24000, 0.35
audio, words, beats, t0 = [], [], [], 0.0
for block in re.split(r"\n\s*\n", open(src).read().strip()):
    lines = [l for l in block.splitlines() if l.strip()]
    bid = lines.pop(0).lstrip("#").strip() if lines and lines[0].startswith("#") else None
    spoken = " ".join(lines)
    for k, v in lex.items(): spoken = spoken.replace(k, v)
    if bid: beats.append({"id": bid, "s": round(t0, 3)})
    for result in pipe(spoken, voice=voice, speed=speed):
        seg = np.asarray(result.audio); audio.append(seg)
        for tok in (result.tokens or []):      # tokens carry start_ts / end_ts for English
            if tok.text.strip() and tok.start_ts is not None:
                words.append({"w": tok.text, "s": round(t0 + tok.start_ts, 3), "e": round(t0 + tok.end_ts, 3)})
        t0 += len(seg) / SR
    audio.append(np.zeros(int(PAUSE * SR), dtype=np.float32)); t0 += PAUSE
sf.write(os.path.join(out, "narration.wav"), np.concatenate(audio), SR)
j = {"duration": round(t0, 3), "words": words, "beats": beats, "provider": "kokoro", "model": "Kokoro-82M", "voice": voice, "delivery": {"speed": speed}, "rendered_at": datetime.datetime.now().isoformat()}
json.dump(j, open(os.path.join(out, "narration.json"), "w"), indent=1)
open(os.path.join(out, "narration.json.js"), "w").write("window.NARRATION = " + json.dumps(j) + ";\n")
print(f"{len(words)} words, {t0:.1f}s -> {out}")
