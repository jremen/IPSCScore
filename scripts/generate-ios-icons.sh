#!/usr/bin/env bash
#
# Regenerates the iOS app icon from the Electron app artwork.
#
#   electron/resources/icon.svg   vector master: light-grey plate + target
#   electron/resources/icon.png   the same target, transparent background
#
# The SVG is the source, the same as for Android: the launcher icon needs the
# plate, and iOS also masks the artwork into a rounded square by itself, so the
# full plate has to be present. iOS rejects icons with an alpha channel, so the
# render is flattened onto the plate colour before it is written.
#
# Capacitor's Xcode template ships a single 1024×1024 universal icon
# (AppIcon.appiconset/AppIcon-512@2x.png) — Xcode derives every smaller size
# from it, so that is the only file this script produces.
#
# Requires: cairosvg, ImageMagick 7 (`magick`).
#
#   bash scripts/generate-ios-icons.sh
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SVG="$REPO/electron/resources/icon.svg"
OUT="$REPO/mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
PLATE="#EFEFEF"

for tool in cairosvg magick; do
  command -v "$tool" >/dev/null || { echo "error: $tool is not installed" >&2; exit 1; }
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Render larger than the target first so the concentric rings stay clean, then
# downscale with Box (area-average). A sharpening filter aliases the fine rings.
cairosvg "$SRC_SVG" -o "$WORK/master.png" -W 2048 -H 2048 --background "$PLATE"

# -flatten drops the transparency, -alpha off and PNG24 force an RGB PNG:
# App Store Connect rejects icons whose PNG still carries an alpha channel.
# -strip removes the colour profile.
magick "$WORK/master.png" \
  -background "$PLATE" -flatten \
  -filter Box -resize 1024x1024 \
  -alpha off -strip "PNG24:$OUT"

echo "regenerated $OUT"
magick identify -format '  %wx%h %[channels] %b\n' "$OUT"
