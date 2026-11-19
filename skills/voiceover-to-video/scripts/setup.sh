#!/usr/bin/env bash
# deps: npm (three, mannequin-js, @pmndrs/assets, world-atlas, topojson-client), pocketsphinx, ffmpeg, Playwright Chromium
set -e; cd "$(dirname "$0")/.."; npm install --no-audit --no-fund
python3 -m pip install -q pocketsphinx pillow || python3 -m pip install -q --user pocketsphinx pillow
command -v ffmpeg >/dev/null || echo "MISSING ffmpeg"
node -e "require('playwright')" 2>/dev/null || { npm install --no-save playwright && npx playwright install chromium; }
echo ready
