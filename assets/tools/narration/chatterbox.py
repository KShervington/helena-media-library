#!/usr/bin/env python3
"""Chatterbox Turbo (MIT) → narration.wav (no native timestamps: run align.py afterwards).
  python3 chatterbox.py script.txt outDir [--ref reference.wav] [--exaggeration 0.35] [--cfg 0.5]
Delivery (Helena = flat): there are no tags; flatness is `exaggeration` (0.3–0.4 flat, 0.5 neutral, 0.7+ expressive) and `cfg` (0.5 default;
lower = slower, more drawn-out). Try 0.3 / 0.5 and 0.4 / 0.5. A 10–15 s reference recorded flat helps more than any knob.
pip install chatterbox-tts   (Mac: prefer the MLX port, see the research doc). Untested in the cloud container."""
import sys, os, re, json, datetime
import torch, torchaudio
from chatterbox.tts import ChatterboxTTS

src, out = sys.argv[1], sys.argv[2]
opt = lambda n, d: sys.argv[sys.argv.index("--" + n) + 1] if "--" + n in sys.argv else d
ref, exag, cfg = opt("ref", None), float(opt("exaggeration", "0.35")), float(opt("cfg", "0.5"))
os.makedirs(out, exist_ok=True)
device = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
model = ChatterboxTTS.from_pretrained(device=device)
SR, PAUSE = model.sr, 0.35
chunks, beats, t0 = [], [], 0.0
for block in re.split(r"\n\s*\n", open(src).read().strip()):
    lines = [l for l in block.splitlines() if l.strip()]
    bid = lines.pop(0).lstrip("#").strip() if lines and lines[0].startswith("#") else None
    if bid: beats.append({"id": bid, "s": round(t0, 3)})
    for sentence in re.split(r"(?<=[.!?])\s+", " ".join(lines)):   # one sentence per call keeps it stable
        wav = model.generate(sentence, audio_prompt_path=ref, exaggeration=exag, cfg_weight=cfg)
        chunks.append(wav); t0 += wav.shape[-1] / SR
    chunks.append(torch.zeros(1, int(PAUSE * SR))); t0 += PAUSE
torchaudio.save(os.path.join(out, "narration.wav"), torch.cat(chunks, dim=-1), SR)
json.dump({"duration": round(t0, 3), "beats": beats, "provider": "chatterbox", "model": "turbo", "voice": ref or "default",
           "delivery": {"exaggeration": exag, "cfg": cfg, "ref": ref}, "rendered_at": datetime.datetime.now().isoformat(), "words": None, "note": "run align.py"}, open(os.path.join(out, "narration.meta.json"), "w"), indent=1)
print(f"{t0:.1f}s -> {out} (now: python3 align.py {out}/narration.wav {src} {out}/narration.json)")
