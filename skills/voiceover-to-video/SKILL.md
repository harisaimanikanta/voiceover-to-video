---
name: voiceover-to-video
description: Turn a voiceover (mp3/wav) + its script into a finished vertical 1080x1920 explainer Short rendered with Three.js - one continuous camera take with no cuts, scene changes through "portals" on the narrator's pauses, camera accents on stressed words, consistent cartoon cast with IK hands, particles, word-synced captions, automated blank-frame QA. Use when the user gives a voiceover/audio (optionally with script text) and wants the video made.
argument-hint: "<voice.mp3> [script.txt]"
---

# Voiceover → Video (one-take Three.js Short)

Skill folder: `${CLAUDE_SKILL_DIR}`. Worked example (87.7 s, 22 environments): `example/` (scene.js + sets*.js + TREATMENT-v2.md + voiceover.mp3).
Kit API and gotchas: `references/kit-api.md` (+ `kit/fx.js` particles/beams/camera helpers, `kit/toon.js` cartoon cast with `reach()` IK).

## Setup (ask first, once)
`bash ${CLAUDE_SKILL_DIR}/scripts/setup.sh` (npm deps, pocketsphinx, ffmpeg check, Playwright Chromium).

## Workflow
1. **Get the script text.** If the user gave only audio, ask for the script (or the text they fed the TTS). Keep stage tags like `[PAUSE]` - align.py strips them.
2. **Analyse the voice:** `python3 ${CLAUDE_SKILL_DIR}/scripts/align.py voice.mp3 script.txt <workdir>` → `words.json`, `lines.json`, `beats.json`
   (pauses > 0.3 s = transition slots; accents = stressed words). Read the output twice before designing.
3. **Treatment first** (`<workdir>/TREATMENT.md`, same table format as `example/TREATMENT-v2.md`): for every line → what we SEE (literal + creative
   metaphor), camera move, and the portal used at the next pause (window, lens, door gap, liquid, mouth, screen, paper, gold, gas…).
   Show it to the user and wait for approval when they asked to review; otherwise continue.
4. **Build `<workdir>/scene.js`** by adapting `example/scene.js`: copy needed sets from `example/sets*.js`, keep its structure
   (SEG list of environments, PORTALS = [time, halfWidth, fillColour, zoom] at pauses, ACCENTS = stressed-word times, captions from `lines.json`).
5. **Stills check:** `node ${CLAUDE_SKILL_DIR}/scripts/render.mjs scene.js --preview --still t1 --still t2 …` (one per segment). View them; fix framing.
6. **QA:** `node …/render.mjs scene.js --width 270 --height 480 --qa 0.25 --qa-ignore "<portal t:w,…>"` must print `QA OK`.
7. **Render:** `node …/render.mjs scene.js out/v720.mp4 --width 720 --height 1280` (background; ~1.6 s/frame on CPU; ONE process - parallel is slower),
   then `ffmpeg -i out/v720.mp4 -i voice.mp3 -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 20 -c:a aac -map 0:v -map 1:a -shortest final.mp4`.
   Spot-check ~30 frames from the final file before delivering.

## Rules (learned the hard way)
- **One take, zero cuts; the camera never stops** (always a move + `drift()`); scene switches only inside a portal fill at a pause.
- **No glow by default:** `makePost(..., { bloom: 0 })`, no `glowMat`/`halo`/emissive boosts unless the user asks. Keep exposure ~0.8–0.9 on white sets.
- **Props via IK:** place the prop where it must be, then `toon.reach(side, gripPoint)`. Never hand-tune arm angles. Check poses from 3+ angles.
- **No dead space:** foreground props, busy set dressing, particles (dust, bubbles, sparks, gas, pages).
- **Camera safety:** never inside characters/walls (stills from each segment), never parent the camera to a scene, avoid stray full-height walls.
- Saturated grade (sat ~1.25, con ~1.08) is on by default; captions 1–3 words from `lines.json`.
- Be honest: stylised cartoon characters, not photoreal humans.
