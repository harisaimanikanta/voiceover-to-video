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

## Learning loop (every production, no exceptions)
This skill gets better with every video. Its memory is `learning/` (lessons.json = every mistake ever made, with cause, fix and rule;
runs.jsonl = scorecard of every past video; bar.json = the quality floor, which only goes up).
- **Before anything:** `python3 ${CLAUDE_SKILL_DIR}/scripts/learn.py brief`. Read it fully. Its "MUST APPLY" rules outrank habits and the
  example; its "weakest areas last time" get your effort first.
- **Before the full render:** `TREATMENT.md` ends with `## Lessons applied`: one line per must-apply lesson ID saying how this production
  avoids it. `learn.py gate <workdir>` must print `GATE OK`.
- **After the render (post-mortem):**
  1. `python3 ${CLAUDE_SKILL_DIR}/scripts/review.py final.mp4 <workdir> --portals "<t:w,...>"` measures every second
     (dark/blown/flat/grey/empty/soft frames, frozen camera, hard cuts, monotony) and writes `review/sheet.png`. Look at the sheet and the flag frames.
  2. Be a harsh critic: compare with the previous run and with a broadcast-quality animated Short. Every problem you or the review find:
     `learn.py add --area … --title … --symptom … --cause … --fix … --rule …` (a repeat bumps the old lesson automatically; repeats must be
     fixed in code: kit default, template, or a review.py check, then `learn.py promote ID --where …`).
  3. Anything the user says about the result is a lesson with `--source user`, recorded verbatim in spirit, and outranks your own opinion.
  4. `learn.py run --project <name> --review <workdir>/review/review.json --score story=N storyboard=N camera=N transitions=N composition=N
     lighting=N materials=N sets=N character=N motion=N captions=N polish=N --next "…" [--feedback "user words"] [--approved]`.
     Anything BELOW BAR is fixed and re-rendered (affected range) before delivery. `--approved` only when the user accepts it; that raises the bar.
  5. Fix the skill itself, not just this video: when a fix is reusable, put it in `kit/`, `example/` or the scripts.
  6. **Persist:** the memory only survives if it is saved. Commit `learning/` (+ any kit fixes) in the skill's git repo and push
     (ask the user once per session). In a cloud session the container is discarded, so an unpushed lesson is a lost lesson.

## Workflow
0. **Memory first:** `learn.py brief` (above).
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
7. **Gate + render:** `learn.py gate <workdir>` → `bash ${CLAUDE_SKILL_DIR}/scripts/render-chunks.sh scene.js voice.mp3 final.mp4`
   (resumable 10 s chunks at 720×1280, ~1.6 s/frame on CPU, run in the background; concatenates, upscales to 1080×1920, muxes the voice, yuv420p).
8. **Post-mortem** (Learning loop above), fix anything below bar, then deliver with the scorecard and what improved since the last run.

## Rules (learned the hard way; the live list is `learn.py brief`)
- **One take, zero cuts; the camera never stops** (always a move + `drift()`); scene switches only inside a portal fill at a pause.
- **No glow by default:** `makePost(..., { bloom: 0 })`, no `glowMat`/`halo`/emissive boosts unless the user asks. Keep exposure ~0.8–0.9 on white sets.
- **Props via IK:** place the prop where it must be, then `toon.reach(side, gripPoint)`. Never hand-tune arm angles. Check poses from 3+ angles.
- **No dead space:** foreground props, busy set dressing, particles (dust, bubbles, sparks, gas, pages).
- **Camera safety:** never inside characters/walls (stills from each segment), never parent the camera to a scene, avoid stray full-height walls.
- Saturated grade (sat ~1.25, con ~1.08) is on by default; captions 1–3 words from `lines.json`.
- Be honest: stylised cartoon characters, not photoreal humans.
- Walks use `toon.walkDist(metresTravelled)` so feet never slide.
