#!/usr/bin/env bash
#
# Regenerates the Android launcher icons from the Electron app artwork.
#
#   electron/resources/icon.svg   vector master: light-grey plate + target
#   electron/resources/icon.png   the same target, transparent background
#
# The SVG is the source because an Android launcher icon needs the plate — using
# icon.png alone would leave the launcher showing a floating target. The result
# matches the web/PWA icon (frontend/public/icons/apple-touch-icon.png).
#
# Requires: cairosvg, ImageMagick 7 (`magick`).
#
#   bash scripts/generate-android-icons.sh
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SVG="$REPO/electron/resources/icon.svg"
RES="$REPO/mobile/android/app/src/main/res"

for tool in cairosvg magick; do
  command -v "$tool" >/dev/null || { echo "error: $tool is not installed" >&2; exit 1; }
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Render the vector well above the largest density (432px) once, then downscale.
cairosvg "$SRC_SVG" -o "$WORK/master.png" -W 1024 -H 1024
SRC="$WORK/master.png"

echo "master $(magick identify -format '%wx%h %[channels]' "$SRC")"
echo "  plate  $(magick "$SRC" -crop 1x1+200+200 +repage -depth 8 txt:- | tail -1 | awk '{print $3}')"
echo "  corner $(magick "$SRC" -crop 1x1+4+4 +repage -depth 8 txt:- | tail -1 | awk '{print $3}')"

# density  legacy edge  adaptive canvas edge (108dp)
for row in "mdpi 48 108" "hdpi 72 162" "xhdpi 96 216" "xxhdpi 144 324" "xxxhdpi 192 432"; do
  set -- $row
  DENSITY=$1
  LEGACY=$2
  ADAPTIVE=$3
  OUT="$RES/mipmap-$DENSITY"

  mkdir -p "$OUT"

  # Box (area-average) downscaling. The artwork's fine concentric rings alias
  # badly under a sharpening filter such as Lanczos.
  #
  # 1. Legacy square icon — the complete logo, used below API 26.
  magick "$SRC" -filter Box -resize "${LEGACY}x${LEGACY}" -strip "$OUT/ic_launcher.png"

  # 2. Legacy round icon — the same logo clipped to a centred circle.
  magick -size "${LEGACY}x${LEGACY}" xc:black -fill white \
    -draw "circle $((LEGACY / 2)),$((LEGACY / 2)) $((LEGACY / 2)),0" \
    -alpha off "$WORK/mask.png"
  magick "$SRC" -filter Box -resize "${LEGACY}x${LEGACY}" \
    \( "$WORK/mask.png" \) -alpha off -compose CopyOpacity -composite \
    -strip "$OUT/ic_launcher_round.png"

  # 3. Adaptive foreground — the plate inside the 72dp safe zone of the 108dp
  #    canvas. It matches values/ic_launcher_background.xml, so on screen only
  #    the target is visible on top of the background layer.
  INNER=$((ADAPTIVE * 2 / 3))
  magick "$SRC" -filter Box -resize "${INNER}x${INNER}" \
    -background none -gravity center -extent "${ADAPTIVE}x${ADAPTIVE}" \
    -strip "$OUT/ic_launcher_foreground.png"

  printf '  %-9s ic_launcher %spx   foreground %spx (plate %spx)\n' \
    "$DENSITY" "$LEGACY" "$ADAPTIVE" "$INNER"
done

echo "regenerated $RES/mipmap-*/ic_launcher*.png"
