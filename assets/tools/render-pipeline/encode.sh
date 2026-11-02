#!/usr/bin/env bash
# Frames + audio → H.264 MP4 with a poster frame baked in as frame 0 (keeps duration and sync), plus the poster JPG.
#   bash encode.sh <framesDir> <audio.wav> <out.mp4> [--poster <frameNumber>] [--fps 30] [--crf 17]
# Writes <out>_poster.jpg next to the video when --poster is given. Frames must be f00000.png, f00001.png, …
set -euo pipefail
frames=$1; audio=$2; out=$3; shift 3
poster=""; fps=30; crf=17
while [ $# -gt 0 ]; do case $1 in --poster) poster=$2; shift 2;; --fps) fps=$2; shift 2;; --crf) crf=$2; shift 2;; *) echo "unknown $1"; exit 1;; esac; done
src=$frames
if [ -n "$poster" ]; then
  src=$(mktemp -d); for f in "$frames"/f*.png; do ln -s "$(realpath "$f")" "$src/$(basename "$f")"; done
  pf=$(printf "%s/f%05d.png" "$frames" "$poster"); rm "$src/f00000.png"; ln -s "$(realpath "$pf")" "$src/f00000.png"
  ffmpeg -hide_banner -loglevel error -y -i "$pf" -q:v 2 "${out%.mp4}_poster.jpg"
fi
ffmpeg -hide_banner -loglevel error -y -framerate "$fps" -i "$src/f%05d.png" -i "$audio" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf "$crf" -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 256k -shortest "$out"
[ "$src" != "$frames" ] && rm -r "$src"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$out" | xargs -I{} echo "$out  ({} s)"
