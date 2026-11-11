#!/usr/bin/env python3
"""Forced alignment of a known script to a narration wav → narration.json (word timestamps).
  python3 align.py narration.wav script.txt narration.json
pip install ctc-forced-aligner   (CTC alignment against the known text beats ASR — see research doc §4). Untested in the cloud container."""
import sys, re, json, os
from ctc_forced_aligner import load_audio, load_alignment_model, generate_emissions, preprocess_text, get_alignments, get_spans, postprocess_results
import torch

wav, src, out = sys.argv[1:4]
text = open(src).read()
blocks = re.split(r"\n\s*\n", text.strip()); beat_ids = []; spoken = []
for b in blocks:
    lines = [l for l in b.splitlines() if l.strip()]
    beat_ids.append(lines.pop(0).lstrip("#").strip() if lines and lines[0].startswith("#") else None); spoken.append(" ".join(lines))
full = " ".join(spoken)
device = "cuda" if torch.cuda.is_available() else "cpu"
model, tokenizer = load_alignment_model(device, dtype=torch.float32)
audio = load_audio(wav, model.dtype, model.device)
emissions, stride = generate_emissions(model, audio, batch_size=8)
tokens_starred, text_starred = preprocess_text(full, romanize=True, language="eng")
segments, scores, blank = get_alignments(emissions, tokens_starred, tokenizer)
spans = get_spans(tokens_starred, segments, blank)
res = postprocess_results(text_starred, spans, stride, scores)
words = [{"w": r["text"], "s": round(r["start"], 3), "e": round(r["end"], 3)} for r in res]
# beats: first word of each block
beats, i = [], 0
for bid, s in zip(beat_ids, spoken):
    n = len(s.split())
    if bid and i < len(words): beats.append({"id": bid, "s": words[i]["s"]})
    i += n
meta = json.load(open(os.path.join(os.path.dirname(out) or ".", "narration.meta.json"))) if os.path.exists(os.path.join(os.path.dirname(out) or ".", "narration.meta.json")) else {}
j = {**meta, "duration": words[-1]["e"] if words else 0, "words": words, "beats": beats, "aligner": "ctc-forced-aligner"}
json.dump(j, open(out, "w"), indent=1); open(out + ".js", "w").write("window.NARRATION = " + json.dumps(j) + ";\n")
print(f"{len(words)} words aligned -> {out}")
