#!/usr/bin/env python3
"""Make a narration.json with estimated word timings from a script, for storyboarding before the real TTS exists.

  python3 stub-narration.py script.txt narration.json [--wps 2.4] [--pause 0.35]

script.txt: plain narration text. A blank line = a beat boundary (adds --pause seconds). A line starting with '#' names the next beat (e.g. "# hook").
Timings are estimates by word length; replace the file with the TTS/alignment output (tts.mjs / align.py) before rendering for real.
"""
import json, re, sys

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    wps = float(sys.argv[sys.argv.index("--wps") + 1]) if "--wps" in sys.argv else 2.4
    pause = float(sys.argv[sys.argv.index("--pause") + 1]) if "--pause" in sys.argv else 0.35
    src, out = args[0], args[1]
    text = open(src, encoding="utf-8").read()
    t, words, beats, beat_name = 0.15, [], [], None
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = [l for l in block.splitlines() if l.strip()]
        if lines and lines[0].startswith("#"):
            beat_name = lines[0].lstrip("#").strip(); lines = lines[1:]
        if beat_name:
            beats.append({"id": beat_name, "s": round(t, 3)}); beat_name = None
        for w in " ".join(lines).split():
            # longer words take longer; punctuation adds a small pause
            d = max(0.12, (0.6 + 0.09 * len(re.sub(r"[^A-Za-z0-9]", "", w))) / wps)
            words.append({"w": w, "s": round(t, 3), "e": round(t + d, 3)})
            t += d + (0.18 if w.endswith((".", "?", "!", "—")) else 0.02 if w.endswith(",") else 0)
        t += pause
    data = {"audio": None, "stub": True, "duration": round(t, 3), "words": words, "beats": beats}
    json.dump(data, open(out, "w"), indent=1)
    # file:// pages can't fetch(); compositions load the .js twin instead: <script src="narration.json.js">
    open(out + ".js", "w").write("window.NARRATION = " + json.dumps(data) + ";\n")
    print(f"{len(words)} words, {t:.1f}s (stub timings)")

if __name__ == "__main__":
    main()
