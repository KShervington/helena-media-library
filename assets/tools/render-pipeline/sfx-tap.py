#!/usr/bin/env python3
# Soft UI tap for on-screen presses: a short filtered click over a low 220/440 Hz body.
# python3 sfx-tap.py out.wav   (48 kHz stereo, peak about -9 dBFS; mix it ~5 dB under the music)
import numpy as np, wave, sys
sr = 48000
n = int(0.09 * sr); t = np.arange(n) / sr
rng = np.random.default_rng(3)
click = rng.standard_normal(n) * np.exp(-t * 900)
# gentle low-passed body tuned near the track's tonal centre
body = np.sin(2 * np.pi * 220 * t) * np.exp(-t * 60) * 0.6 + np.sin(2 * np.pi * 440 * t) * np.exp(-t * 90) * 0.25
k = np.ones(6) / 6
x = np.convolve(click, k, mode="same") * 0.5 + body
x = x / np.abs(x).max() * 0.35
st = np.stack([x, x], 1)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
