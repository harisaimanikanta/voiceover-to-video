---
name: voiceover-to-video
description: Turn a voiceover (mp3/wav) + its script into a finished vertical 1080x1920 Short in a polished 3D feature-animation cartoon style rendered with Three.js - sculpted characters with expressive emotional faces and lip-sync, cinematic mood lighting, densely dressed sets, one continuous camera take, portal transitions on the narrator's pauses, word-synced captions, a polished storyboard sheet for approval (or faithful following of the user's storyboard), automated QA and a self-improving lessons memory. Use when the user gives a voiceover/audio (optionally with script text) and wants the video made.
argument-hint: "<voice.mp3> [script.txt]"
---

# Voiceover → Video (one-take Three.js Short)

Skill folder: `${CLAUDE_SKILL_DIR}`.

**Default style: polished 3D feature-animation cartoon** (not brutalist). Rounded, sculpted characters with expressive faces
(glossy eyes with irises and lids, brows, lips, teeth, 14 emotions, lip-sync). Warm cinematic mood lighting with a key, rim, practical
lights and haze. Densely dressed rounded sets. Reference: `example/cartoon/` (scene.js, TREATMENT.md, storyboard sheet, demo.mp4).
Full production reference: `example/dna-case/` (104 s true-crime explainer: 11 sets incl. study, 70s street, bedroom, offices, DNA world, records
room, family tree, suburb, lab, arrest; host lip-sync, portal map, emotion tracks; sets.js has cars, police props, filing cabinets, portraits…).
**Realism reference:** `references/reference-look.md`, a frame-by-frame breakdown of the user's reference reel (low-key practical
lighting, soft contact shadows plus AO, glossy hero reflector, long lens plus bokeh, cut-based clarity). Read it before lighting a set.
Build with `kit/look.js` (mood, faceRig, soft materials), `kit/toon.js` (cast), `kit/props.js` (cozyRoom/lab/street + props). Worked example (87.7 s, 22 environments): `example/` (scene.js + sets*.js + TREATMENT-v2.md + voiceover.mp3).
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
1. **Get the script text.** If the user gave a script, use it (keep stage tags like `[PAUSE]` - align.py strips them). If they gave only audio,
   transcribe it yourself: `python3 ${CLAUDE_SKILL_DIR}/scripts/transcribe.py voice.mp3 <workdir>` (offline Whisper; pip install sherpa-onnx).
   It writes `script.txt` with numbers spelled out for the aligner, plus `numbers.json` for restoring digits in captions. Fix names by hand.
   Ask for the script only if transcription is impossible.
2. **Analyse the voice:** `python3 ${CLAUDE_SKILL_DIR}/scripts/align.py voice.mp3 script.txt <workdir>` → `words.json`, `lines.json`, `beats.json`
   (pauses > 0.3 s = transition slots; accents = stressed words). Read the output twice before designing.
3. **Story clarity first (lesson L031, the most important rule):** the viewer must understand the story from the pictures. Plan
   chapters (hook, setup, problem, turn, investigation, reveal, payoff). Every beat **literally shows the subject of its sentence**
   (who/what/where), one idea per shot, held at least 2.5 s. Put the key fact on screen as a title: export `titles = [{t0, t1, text, sub}]`
   (big pill at the top, e.g. "13 VICTIMS", "1986", "MATCH"). Explain mechanisms with a clear diagram or chart in the world (a screen, a board),
   not with metaphors. Keep recurring anchors (same characters, same room for a whole chapter). Use fewer environments and gentle camera moves;
   portals only at chapter breaks. **Mute test:** with the audio off, the storyboard panels alone must tell the story.
4. **Treatment** (`<workdir>/TREATMENT.md`, same table format as `example/TREATMENT-v2.md`): for every line → what we SEE (literal + creative
   metaphor), camera move, and the portal used at the next pause (window, lens, door gap, liquid, mouth, screen, paper, gold, gas…).
   Show it to the user and wait for approval when they asked to review; otherwise continue.
5. **Build `<workdir>/scene.js`** from `example/cartoon/scene.js` (look + cast + acting); for multi-environment portal structure, borrow from `example/scene.js`: copy needed sets from `example/sets*.js`, keep its structure
   (SEG list of environments, PORTALS = [time, halfWidth, fillColour, zoom] at pauses, ACCENTS = stressed-word times, captions from `lines.json`).
6. **Storyboard sheet (approval gate):** `python3 ${CLAUDE_SKILL_DIR}/scripts/storyboard.py scene.js <workdir> --title "…"` renders
   one real frame per treatment row and lays out a polished sheet (numbered panels, timecodes, camera, narration, what we see,
   transitions). Look at every panel first and fix weak ones. Then show it to the user and wait for approval before the full render.
   **Following a user's storyboard:** `python3 ${CLAUDE_SKILL_DIR}/scripts/split-storyboard.py board.png --out <workdir>/board` → look at every panel;
   write `<workdir>/storyboard-follow.md` (panel → beat time, framing/angle, subject and pose, emotion, props, palette from board.json);
   make the treatment follow it panel by panel. Then render our sheet with the same numbering and compare side by side. Every panel must match in composition,
   subject, emotion and colour, rebuilt in our polished 3D cartoon style (not traced).
7. **Stills check:** `node ${CLAUDE_SKILL_DIR}/scripts/render.mjs scene.js --preview --still t1 --still t2 …` (one per segment). View them; fix framing.
8. **QA:** `node …/render.mjs scene.js --width 270 --height 480 --qa 0.25 --qa-ignore "<portal t:w,…>"` must print `QA OK`.
9. **Gate + render:** `learn.py gate <workdir>` → `bash ${CLAUDE_SKILL_DIR}/scripts/render-chunks.sh scene.js voice.mp3 final.mp4`
   (resumable 10 s chunks at 720×1280, ~1.6 s/frame on CPU, run in the background; concatenates, upscales to 1080×1920, muxes the voice, yuv420p).
10. **Post-mortem** (Learning loop above), fix anything below bar, then deliver with the scorecard and what improved since the last run.

## Rules (learned the hard way; the live list is `learn.py brief`)
- **One take, zero cuts; the camera never stops** (always a move + `drift()`); scene switches only inside a portal fill at a pause.
- **No glow by default:** `makePost(..., { bloom: 0 })`, no `glowMat`/`halo`/emissive boosts unless the user asks. Keep exposure ~0.8–0.9 on white sets.
- **Props via IK:** place the prop where it must be, then `toon.reach(side, gripPoint)`. Never hand-tune arm angles. Check poses from 3+ angles.
- **No dead space:** foreground props, busy set dressing, particles (dust, bubbles, sparks, gas, pages).
- **Camera safety:** write camera moves with `shots([{t,pos,at,fov}…])` (kit/fx.js: no snaps), pass the position through `guardCamera()`, and call
  `lensProbe(scene, cam)` every frame: QA (`--qa`) then reports any frame where the lens touches a prop, door or wall. Portals fill the frame
  before the lens reaches the object. Characters walk around furniture and cars, never through them.
- **Gestures:** every hand move uses `env(t, start, end, fade)` ramps (fade >= 0.3 s) and blends from the rest pose; props are held from the start
  (never fly in from across the room); IK elbows follow the character's own frame.
- Saturated grade (sat ~1.25, con ~1.08) is on by default; captions 1–3 words from `lines.json`.
- Be honest: stylised cartoon characters, not photoreal humans.
- **Acting (lesson L035):** normal people act subtly (`makeToon({acting: 0.4-0.55})`, mostly calm/thinking/worried); villains look evil by *design*
  (hood, dark mask, `catchlights: false`, `menacing`, red rim + `faceRig({keyY: -0.35})` under-light), never by grimaces. Every line has an emotion (`toon.face`) that changes on the meaning, lip-sync (`speech`) while a character talks, matching `posture`,
  eyes on what matters, hands busy (`reach`/`grip`). Faces are the story: hold medium close-ups on emotional beats, with the head in the upper third and headroom.
- **Look:** `mood()` + `faceRig()` on every set, all materials via `soft()`, sets dressed with `props.js` (foreground, midground and background), dust in light beams.
- Walks use `toon.walkDist(metresTravelled)` so feet never slide.
- **9:16 is narrow:** at 2.3 m the frame is only ~0.9 m wide. Keep a two-shot within 0.35 × camera distance, put characters facing the camera
  (behind desks, not in front of them), and never route a camera move through anyone (render the midpoints).
- **Real people and crimes:** imply violence (shadows, props, reactions) and never show it. Real people are generic cartoons, not likenesses.
