#!/usr/bin/env python3
"""Key-tunable UI / foley SFX kit for promo videos — every effect is synthesized, so it can sit in the song's key.

    python3 sfx.py <outDir> [--root F]      → <outDir>/*.wav (48 kHz stereo)

    whoosh   screen slides / pushes            tap      on-screen press (soft click + body on the root)
    key      keyboard tick (fifth)             chime    two-step blip, root → fifth
    ratchet  short metallic click (detents)    swish    page sheet up / down
    slam     heavy door / panel slam, clank on the root
    stamp    sticker / stencil text landing    climb-1..6  rising minor-pentatonic blips (one per step of a climb)

--root is the song's tonal centre (C, C#, D … B; default F). Mix them under the music with
render-pipeline/audio.sh (`--sfx file@videoSec@gain`, typical gains 0.2–0.6); cues.mjs builds that argument list.
"""
import sys, os, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(7)

def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)

def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)

def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)

def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    e = np.exp(-t / max(d, 1e-4))
    na = int(a * SR)
    if na > 0:
        e[:na] *= np.linspace(0, 1, na)
    return e

def place(buf, x, t, gain=1.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    j0 = max(0, -i)
    x = x[j0:]
    i = max(0, i)
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += gain * x[:n]

def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d in ((-detune, 0, detune) if detune else (0,)):
        ph = (f * (1 + d) * t) % 1.0
        out += 2 * ph - 1
    return out / (3 if detune else 1)

def clank(m=76, n=0.6, g=1.0):
    """Metallic hit built from inharmonic partials over a tuned fundamental (E5 by default)."""
    k = int(n * SR); t = np.arange(k) / SR
    f0 = midi(m)
    x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * dcy)
            for r, a, dcy in ((1, 0.5, 7), (2.76, 0.35, 11), (5.40, 0.22, 16), (8.93, 0.12, 24)))
    return x * np.minimum(1, t / 0.001) * 0.4 * g

def sfx(R):
    out = {}
    k = int(0.5 * SR); t = np.arange(k) / SR
    nz = rng.standard_normal(k)
    # whoosh: band sweeping up then out (screen slides)
    sw = np.zeros(k)
    for i in range(0, k, 480):
        f = 300 + 3500 * (i / k) ** 1.2
        seg_ = nz[i:i + 480]
        sw[i:i + 480] = bp(seg_, f * 0.7, min(f * 1.4, 20000))[:len(seg_)]
    out["whoosh"] = lp(sw, 6000) * np.sin(np.pi * np.clip(t / 0.42, 0, 1)) ** 1.5 * 0.5
    # tap: the render-pipeline sfx-tap recipe (soft click + a body on the root)
    k = int(0.09 * SR); t = np.arange(k) / SR
    body = np.sin(2 * np.pi * midi(R) * t) * np.exp(-t * 60) * 0.6 + np.sin(2 * np.pi * midi(R + 12) * t) * np.exp(-t * 90) * 0.25
    click = np.convolve(rng.standard_normal(k) * np.exp(-t * 900), np.ones(6) / 6, "same") * 0.5
    x = click + body; out["tap"] = x / np.abs(x).max() * 0.35
    # key: tiny keyboard tick tuned to the fifth
    k = int(0.05 * SR); t = np.arange(k) / SR
    out["key"] = (hp(rng.standard_normal(k), 3000) * np.exp(-t * 500) * 0.25 + np.sin(2 * np.pi * midi(R + 31) * t) * np.exp(-t * 120) * 0.12)
    # chime: two-step blip, root → fifth
    k = int(0.4 * SR); t = np.arange(k) / SR
    c = np.sin(2 * np.pi * midi(R + 36) * t) * np.exp(-t * 18) * (t < 0.07)
    c2 = np.zeros(k); i = int(0.07 * SR); t2 = t[: k - i]
    c2[i:] = np.sin(2 * np.pi * midi(R + 43) * t2) * np.exp(-t2 * 9)
    out["chime"] = (c + c2) * 0.3
    # ratchet: short metallic click (every 0.5° on the ruler)
    k = int(0.06 * SR); t = np.arange(k) / SR
    out["ratchet"] = (bp(rng.standard_normal(k), 2500, 7000) * np.exp(-t * 260) * 0.5 + clank(R + 31, 0.06, 0.6)[:k])
    # swish: page sheet up/down
    k = int(0.4 * SR); t = np.arange(k) / SR
    out["swish"] = lp(hp(rng.standard_normal(k), 500), 4000) * np.sin(np.pi * t / 0.4) ** 2 * 0.22
    # slam: roll-up door hits the floor — low thump, steel rattle, clank tuned to the root
    k = int(1.2 * SR); t = np.arange(k) / SR
    thump = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 6) + 38) / SR) * np.exp(-t * 7)
    rattle = bp(rng.standard_normal(k), 900, 5000) * np.exp(-t * 9) * (1 + 0.6 * np.sin(2 * np.pi * 31 * t))
    x = np.tanh(thump * 1.5) * 0.8 + rattle * 0.35 + clank(R, 1.2, 1.2)[:k] * 0.9 + clank(R + 12, 1.2, 0.6)[:k] * 0.5
    out["slam"] = x / np.abs(x).max() * 0.8
    # stamp: stencil text lands
    k = int(0.25 * SR); t = np.arange(k) / SR
    x = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 30) + 60) / SR) * np.exp(-t * 18) + bp(rng.standard_normal(k), 600, 3000) * np.exp(-t * 60) * 0.4
    out["stamp"] = x / np.abs(x).max() * 0.6
    # climb-1..6: one blip per step of a climb (e.g. a PWR class-up), rising through the root's minor pentatonic
    for i, m in enumerate(tuple(R + i for i in (24, 27, 29, 31, 34, 36)), 1):
        k = int(0.22 * SR); t = np.arange(k) / SR
        x = (np.sin(2 * np.pi * midi(m) * t) + 0.35 * np.sin(2 * np.pi * midi(m + 12) * t)) * np.exp(-t * (16 if i < 6 else 7))
        out[f"climb-{i}"] = x / np.abs(x).max() * 0.32
    return out

def write(path, x):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())

NOTES = {"C": 48, "C#": 49, "DB": 49, "D": 50, "D#": 51, "EB": 51, "E": 52, "F": 53, "F#": 54, "GB": 54, "G": 55, "G#": 56, "AB": 56, "A": 57, "A#": 58, "BB": 58, "B": 59}

if __name__ == "__main__":
    out = sys.argv[1]
    root = sys.argv[sys.argv.index("--root") + 1].upper() if "--root" in sys.argv else "F"
    os.makedirs(out, exist_ok=True)
    for name, x in sfx(NOTES[root]).items():
        write(os.path.join(out, f"{name}.wav"), x)
    print("wrote", out, "root", root)
