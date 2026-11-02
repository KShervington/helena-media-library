#!/usr/bin/env bash
# Cut a song window, fade it, mix SFX, and report loudness.
#   bash audio.sh <song> <startSec> <durationSec> <out.wav> [--fade-out 0.65] [--sfx file.wav@videoSec@gain ...]
# e.g. bash audio.sh eerie-phonk.mp3 29.36 21.6 mix.wav --sfx tap.wav@6.745@0.55
# Target: about -14 LUFS integrated, true peak below -1 dBTP (prints both; adjusts gain if off by > 0.5 LU).
set -euo pipefail
song=$1; start=$2; dur=$3; out=$4; shift 4
fade=0.65; sfx=()
while [ $# -gt 0 ]; do case $1 in --fade-out) fade=$2; shift 2;; --sfx) sfx+=("$2"); shift 2;; *) echo "unknown $1"; exit 1;; esac; done
inputs=(-ss "$start" -t "$dur" -i "$song"); fc="[0:a]afade=t=in:d=0.006,afade=t=out:st=$(python3 -c "print($dur-$fade)"):d=$fade[m]"; mix="[m]"; n=1
for s in "${sfx[@]}"; do
  IFS=@ read -r f at gain <<<"$s"; ms=$(python3 -c "print(int(($at-0.01)*1000))")
  inputs+=(-i "$f"); fc+=";[$n:a]adelay=$ms|$ms,volume=${gain:-0.5}[s$n]"; mix+="[s$n]"; n=$((n+1))
done
fc+=";${mix}amix=inputs=$n:duration=first:normalize=0"
tmp=$(mktemp --suffix=.wav)
ffmpeg -hide_banner -loglevel error -y "${inputs[@]}" -filter_complex "$fc" -ar 48000 "$tmp"
read -r I TP < <(ffmpeg -hide_banner -i "$tmp" -af loudnorm=print_format=json -f null - 2>&1 | python3 -c "import sys,json,re; j=json.loads(re.search(r'\{[^{}]*\}',sys.stdin.read(),re.S).group(0)); print(j['input_i'], j['input_tp'])")
gain=$(python3 -c "i=$I; tp=$TP; g=-14-i; g=min(g, -1.0-tp); print(round(g,2) if abs(-14-i)>0.5 or tp>-1 else 0)")
ffmpeg -hide_banner -loglevel error -y -i "$tmp" -af "volume=${gain}dB" -ar 48000 "$out"; rm "$tmp"
echo "measured ${I} LUFS / ${TP} dBTP → applied ${gain} dB → $out"
