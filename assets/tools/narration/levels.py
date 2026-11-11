#!/usr/bin/env python3
"""Audio → per-frame loudness bands for the voice visualizer (pure function of t at render time).

  python3 levels.py narration.wav levels.json [--rate 50] [--bands 3]

Writes { rate, bands, data: [[b0, b1, b2], …] } (each 0..1, normalised to the loudest 1 % of frames) and a .js twin (window.LEVELS = …).
Needs ffmpeg (decodes anything to mono 16 kHz float) and numpy."""
import sys, json, subprocess, numpy as np

src, out = sys.argv[1], sys.argv[2]
opt = lambda n, d: sys.argv[sys.argv.index("--" + n) + 1] if "--" + n in sys.argv else d
rate, nb, SR = int(opt("rate", 50)), int(opt("bands", 3)), 16000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
hop, win = SR // rate, 1024
edges = np.geomspace(80, 6000, nb + 1)
freqs = np.fft.rfftfreq(win, 1 / SR)
data = []
for i in range(0, len(x), hop):
    seg = x[i:i + win]
    if len(seg) < win: seg = np.pad(seg, (0, win - len(seg)))
    mag = np.abs(np.fft.rfft(seg * np.hanning(win)))
    data.append([float(np.sqrt(np.mean(mag[(freqs >= edges[b]) & (freqs < edges[b + 1])] ** 2))) for b in range(nb)])
d = np.array(data)
top = np.percentile(d, 99, axis=0) + 1e-9
d = np.clip(d / top, 0, 1) ** 0.7                      # gentle compression so quiet speech still moves
# light smoothing (one-pole) so the picture doesn't flicker
for i in range(1, len(d)): d[i] = np.maximum(d[i], d[i - 1] * 0.82)
j = {"rate": rate, "bands": nb, "duration": round(len(x) / SR, 3), "data": [[round(float(v), 3) for v in row] for row in d]}
json.dump(j, open(out, "w")); open(out + ".js", "w").write("window.LEVELS = " + json.dumps(j) + ";\n")
print(f"{len(d)} frames @ {rate} Hz, {nb} bands -> {out}")
