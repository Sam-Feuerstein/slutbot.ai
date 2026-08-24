#!/usr/bin/env bash
set -euo pipefail
# Build JPEG posters + 720p preview MP4s from full preset sources (same pipeline as camslutai/scripts/prepare-cams.sh).
# Usage: put source files in public/presets-src/ as {id}.mp4 then run this script.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="${1:-$ROOT/public/presets-src}"
OUT_DIR="${2:-$ROOT/public/presets}"

mkdir -p "$OUT_DIR"
cd "$SRC_DIR"

for src in *.mp4; do
  [[ "$src" == *-preview.mp4 ]] && continue
  [[ -f "$src" ]] || continue
  base="${src%.mp4}"
  echo "Preparing $base"
  ffmpeg -y -hide_banner -loglevel error -ss 0.3 -i "$src" -vframes 1 -vf "scale=-2:720:flags=lanczos" -q:v 2 "$OUT_DIR/${base}.jpg"
  ffmpeg -y -hide_banner -loglevel error -i "$src" -an -vf "scale=-2:720:flags=lanczos" \
    -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart "$OUT_DIR/${base}-preview.mp4"
  cp "$src" "$OUT_DIR/${base}.mp4"
done

echo "Upload each preset trio to your CDN/R2: {id}.jpg, {id}-preview.mp4, {id}.mp4"
