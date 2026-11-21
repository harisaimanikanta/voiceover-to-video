#!/usr/bin/env bash
# Resumable final render (lessons L011, L012): renders CHUNK-second pieces, skips pieces already on disk,
# concatenates, upscales to 1080x1920, muxes the voice, and forces broadcast-safe yuv420p.
#   render-chunks.sh scene.js voice.mp3 final.mp4 [--chunk 10] [--width 720 --height 1280]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCENE="$1"; VOICE="$2"; FINAL="$3"; shift 3
CHUNK=10; WIDTH=720; HEIGHT=1280
while [[ $# -gt 0 ]]; do case "$1" in --chunk) CHUNK="$2"; shift 2;; --width) WIDTH="$2"; shift 2;; --height) HEIGHT="$2"; shift 2;; *) echo "unknown $1"; exit 2;; esac; done
DUR=$(grep -oP 'export const duration\s*=\s*\K[0-9.]+' "$SCENE")
DIR="out/chunks-$(basename "$SCENE" .js)"; mkdir -p "$DIR"; : > "$DIR/list.txt"
for FROM in $(python3 -c "import math;d=$DUR;c=$CHUNK;print(' '.join(str(i*c) for i in range(math.ceil(d/c))))"); do
  TO=$(python3 -c "print(min($FROM+$CHUNK,$DUR))"); F="$DIR/$(printf '%06.1f' "$FROM").mp4"
  if [[ -s "$F" ]]; then echo "skip $F"; else node "$HERE/render.mjs" "$SCENE" "$F.tmp.mp4" --width "$WIDTH" --height "$HEIGHT" --from "$FROM" --to "$TO" && mv "$F.tmp.mp4" "$F"; fi
  echo "file '$(realpath "$F")'" >> "$DIR/list.txt"
done
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/list.txt" -i "$VOICE" -map 0:v -map 1:a \
  -vf "scale=1080:1920:flags=lanczos,format=yuv420p" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -shortest -movflags +faststart "$FINAL"
PF=$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$FINAL")
[[ "$PF" == "yuv420p" ]] || { echo "pix_fmt $PF != yuv420p"; exit 1; }
echo "final: $FINAL"
