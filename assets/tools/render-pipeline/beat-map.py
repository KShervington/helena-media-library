#!/usr/bin/env python3
"""Map a song for beat-synced editing: tempo, beat grid, per-bar energy, sections and promo windows.

    python3 beat-map.py song.mp3 [--anchor 33.52] [--out beat-map.json] [--chart beat-map.png] [--js name]

--anchor  a known downbeat in song seconds (e.g. a drop). Without it, the strongest bass entrance is used.
Output JSON (song seconds throughout):
    tempo_map[], tempo_bpm_range              local tempo (generated tracks often drift several BPM)
    beats[], downbeats[], anchor_index        every beat in song seconds, following the drift; beats[anchor_index] = anchor
    bars[]      {start, end, bass, rms, type}  downbeat→downbeat; type: breakdown (no bass) | mid | full
    sections[]  {start, end, type, bars}       consecutive bars of one type
    drops[]     downbeats where the bass comes back in after a breakdown
    windows[]   {start, end, shape}            15–25 s candidates: breakdown → drop → … (hook → reveal → body)
Needs: pip install librosa matplotlib
"""
import argparse, json
import numpy as np
import librosa

ap = argparse.ArgumentParser()
ap.add_argument("song")
ap.add_argument("--anchor", type=float, default=None)
ap.add_argument("--out", default="beat-map.json")
ap.add_argument("--chart", default=None)
ap.add_argument("--js", default=None, help="also write <out>.js registering GML.beatMaps[<name>] (loadable from file:// with a <script> tag)")
a = ap.parse_args()

y, sr = librosa.load(a.song, sr=22050, mono=True)
hop = 128
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
f = librosa.fft_frequencies(sr=sr, n_fft=2048)
t = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)
dur = float(t[-1])

def flux(band):
    e = np.log1p(S[band].sum(0))
    return np.maximum(0, np.diff(e, prepend=e[0]))

kick, snare = flux(f < 150), flux((f > 150) & (f < 4000))
env = kick + 0.6 * snare
bass = S[f < 120].sum(0); bass = bass / np.percentile(bass, 95)
rms = librosa.feature.rms(y=y, hop_length=hop)[0]; rms = rms / np.percentile(rms, 95)

# 1) local tempo map. Generated tracks (e.g. Suno) can drift several BPM across a song, so one global grid
#    is wrong: fit the beat period in overlapping 12 s windows on kick+snare onsets.
from scipy.ndimage import maximum_filter1d, uniform_filter1d
onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
onset = onset / np.percentile(onset, 95)
envmax = maximum_filter1d(kick + 0.5 * snare, 7)
tempo0 = float(np.atleast_1d(librosa.beat.beat_track(y=y, sr=sr)[0])[0])
p0 = 60.0 / tempo0

def wscore(lo, hi, p, ph):
    idx = np.searchsorted(t, np.arange(lo + ph, hi, p)).clip(0, len(t) - 1)
    return envmax[idx].mean()

centers, periods, conf = [], [], []
for c in np.arange(6.0, dur - 6.0, 2.0):
    lo, hi = c - 6, c + 6
    best = (-1, p0, 0)
    for p in np.arange(p0 * 0.94, p0 * 1.06, 0.001):
        for ph in np.arange(0, p, 0.008):
            sc = wscore(lo, hi, p, ph)
            if sc > best[0]: best = (sc, p, ph)
    _, pb, phb = best
    for p in np.arange(pb - 0.0015, pb + 0.0015, 0.0001):
        for ph in np.arange(max(0, phb - 0.012), phb + 0.012, 0.002):
            sc = wscore(lo, hi, p, ph)
            if sc > best[0]: best = (sc, p, ph)
    centers.append(c); periods.append(best[1]); conf.append(best[0])
centers, periods, conf = map(np.array, (centers, periods, conf))
good = conf > np.percentile(conf, 35)                     # drop weak windows (intro, sparse breakdowns)
pc = np.interp(centers, centers[good], periods[good])
pc = np.array([np.median(pc[max(0, i - 2):i + 3]) for i in range(len(pc))])  # smooth
period_at = lambda x: float(np.interp(x, centers, pc))

# 2) walk beats from a confirmed downbeat, nudging each toward a nearby onset peak
if a.anchor is not None:
    anchor = a.anchor
else:  # biggest bass entrance
    jump = np.diff(uniform_filter1d(bass, 40))
    anchor = float(t[1:][np.argmax(jump)])

nn = min(len(t), len(onset))
def snap(x):
    lo, hi = np.searchsorted(t[:nn], [x - 0.035, x + 0.035])
    if hi <= lo: return x
    i = lo + int(np.argmax(onset[lo:hi]))
    return x + 0.6 * (t[i] - x) if onset[i] > 0.35 else x

fwd = [anchor]
while fwd[-1] + period_at(fwd[-1]) < dur:
    fwd.append(snap(fwd[-1] + period_at(fwd[-1])))
bwd = [anchor]
while bwd[-1] - period_at(bwd[-1]) > 0:
    bwd.append(snap(bwd[-1] - period_at(bwd[-1])))
beats = sorted(set(bwd[1:] + fwd))
ai = beats.index(anchor)
beat = float(np.median(np.diff(beats)))
bar = 4 * beat
downbeats = beats[ai % 4::4]

# 3) per-bar energy + type (bars are real downbeat→downbeat spans)
bars = []
edges = ([0.0] if downbeats[0] > 0.05 else []) + list(downbeats) + [dur]
for s0, s1 in zip(edges[:-1], edges[1:]):
    m = (t >= s0) & (t < s1)
    if m.sum():
        b, r = float(bass[m].mean()), float(rms[m].mean())
        typ = "breakdown" if b < 0.12 else ("full" if b > 0.5 else "mid")
        bars.append({"start": round(s0, 3), "end": round(s1, 3), "bass": round(b, 2), "rms": round(r, 2), "type": typ})

sections = []
for b in bars:
    if sections and sections[-1]["type"] == b["type"]:
        sections[-1]["end"] = b["end"]; sections[-1]["bars"] += 1
    else:
        sections.append({"start": b["start"], "end": b["end"], "type": b["type"], "bars": 1})

drops = [sections[i + 1]["start"] for i in range(len(sections) - 1)
         if sections[i]["type"] == "breakdown" and sections[i + 1]["type"] in ("full", "mid")]

# 4) promo windows: start on a 1–3-bar breakdown that ends in a drop; end on the next breakdown/drop near 20 s
windows = []
for i, s in enumerate(sections[:-1]):
    if s["type"] == "breakdown" and 1 <= s["bars"] <= 3 and sections[i + 1]["type"] in ("full", "mid"):
        start, drop = s["start"], sections[i + 1]["start"]
        later = [d for d in drops if d > drop and 15 <= d - start <= 26]
        end = (later[0] + 0.9) if later else min(start + 21.0, dur)
        windows.append({"start": round(start, 2), "drop": round(drop, 2), "end": round(end, 2),
                        "length": round(end - start, 2),
                        "shape": f"{s['bars']}-bar breakdown (hook) → drop at {drop:.2f}" + (f" → next drop at {later[0]:.2f} (end hit)" if later else "")})

tempo_map = [{"t": round(float(c), 1), "bpm": round(60 / float(p), 2)} for c, p in zip(centers[::3], pc[::3])]
out = {"song": a.song, "duration_s": round(dur, 2), "tempo_bpm_median": round(60 / beat, 2),
       "tempo_bpm_range": [round(60 / float(pc.max()), 1), round(60 / float(pc.min()), 1)],
       "anchor_s": round(anchor, 3), "anchor_index": ai,
       "note": "beats[] are song seconds and follow tempo drift; beats[anchor_index] is the anchor downbeat; "
               "downbeats every 4th beat from it. Video time = song time - window start.",
       "tempo_map": tempo_map, "beats": [round(float(b), 3) for b in beats], "downbeats": [round(float(b), 3) for b in downbeats],
       "sections": sections, "drops": [round(d, 3) for d in drops], "windows": windows, "bars": bars}
json.dump(out, open(a.out, "w"), indent=1)
if a.js:
    js_path = a.out.rsplit(".", 1)[0] + ".js"
    open(js_path, "w").write("window.GML = window.GML || {}; (GML.beatMaps = GML.beatMaps || {})[" + json.dumps(a.js) + "] = " + json.dumps(out) + ";\n")
print(f"{60/beat:.2f} BPM median ({60/pc.max():.1f}–{60/pc.min():.1f}), anchor {anchor:.3f}s, {len(beats)} beats, {len(sections)} sections, {len(drops)} drops → {a.out}")

if a.chart:
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    col = {"breakdown": "#4A4E57", "mid": "#F4B740", "full": "#EB1C2D"}
    fig, ax = plt.subplots(figsize=(14, 3.2), facecolor="#0E0F12"); ax.set_facecolor("#0E0F12")
    for b in bars:
        ax.bar(b["start"], b["bass"], width=(b["end"] - b["start"]) * 0.92, align="edge", color=col[b["type"]])
    ax.plot([(b["start"] + b["end"]) / 2 for b in bars], [b["rms"] for b in bars], color="#F5F5F7", lw=1, alpha=0.7)
    for d in drops: ax.axvline(d, color="#4ADE80", lw=1, ls="--")
    for w in windows: ax.axvspan(w["start"], w["end"], color="#4ADE80", alpha=0.08)
    ax.set_xlim(0, dur); ax.set_xlabel("song seconds", color="#aaa"); ax.tick_params(colors="#aaa")
    for s in ax.spines.values(): s.set_color("#333")
    ax.set_title(f"{60/pc.max():.1f}–{60/pc.min():.1f} BPM (drifts) · bars: grey breakdown / amber mid / red full · green dashed = drops · shaded = promo windows",
                 color="#ddd", fontsize=9)
    plt.tight_layout(); plt.savefig(a.chart, dpi=110, facecolor="#0E0F12")
