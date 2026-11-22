# HANDOFF: render the "Caught by His Cousins' DNA" video on my Windows laptop

You are Claude Code running on my Windows laptop (RTX 3050, Ryzen 7, 24 GB RAM). Blender is installed.
Work folder: `D:\Claude Code Blender render`. Please do everything below. Ask me only when you need a file from me.

## The task
Render my finished 3D cartoon Short (vertical 1080×1920, 30 fps, 103.8 s) with Blender, then add titles, captions and my voiceover,
producing `final.mp4` in the work folder. The whole production is already built and scripted in my GitHub repo. You only need to set it up and run it.

## Steps
1. Download the repo **harisaimanikanta/voiceover-to-video** (git clone, or the ZIP from GitHub).
2. Copy everything from `skills/voiceover-to-video/example/dna-case-blender/` into `D:\Claude Code Blender render`.
   It contains: `dna.py` (builds all 10 sets, ~30 shots, cast and animation; one set per Blender run), `bkit.py` (Blender kit),
   `post.py` (titles + captions + voice mux via ffmpeg/libass), `render_all.py` (one-command driver, resumable),
   `tex/` (graphics + two small MP4 screen textures), `words.json` / `lines.json` (voice timings), `TREATMENT.md` (storyboard),
   `README-LAPTOP.md`.
3. **Ask me for my voiceover MP3** and save it in the work folder as `voice.mp3`. It's the ElevenLabs "Dan" narration about the
   Golden State Killer caught through his cousins' DNA (103.8 s).
4. Make sure these exist (install if missing): **ffmpeg** (`winget install Gyan.FFmpeg`), **Python 3** (`winget install Python.Python.3.12`).
   Find my `blender.exe` (usually `C:\Program Files\Blender Foundation\Blender <version>\blender.exe`; needs Blender **4.2 or newer**).
5. **Benchmark first:** render 2–3 frames of one set to measure seconds per frame, e.g.
   `"<blender.exe>" -b --factory-startup -P dna.py -- --set host --render --engine EEVEE --samples 32 --res 1080x1920 --out frames --device GPU --range 60-62`
   and tell me the estimated total time (3,114 frames).
6. **Preview** (half resolution) and show me a few frames:
   `python render_all.py --blender "<blender.exe>" --preview --out preview.mp4`
7. **Final:** `python render_all.py --blender "<blender.exe>"` → `final.mp4`. It is resumable: if it stops, run it again.
   Re-render one set after a fix with `--sets office` (sets: host street bed case dna records office suburb match arrest).
8. After rendering, check the video: extract frames every second (`ffmpeg -i final.mp4 -vf fps=1,scale=270:-1,tile=8x4 sheet%02d.png`),
   look at them, and report any glitches.

## If EEVEE has problems
- Out of video memory: lower `--samples 16`, or close other apps.
- Scripts were developed on Blender 5.3 Python (bpy). If an API name differs on my version (e.g. Principled BSDF input
  "Coat Weight", EEVEE `use_raytracing`), patch it in `bkit.py`/`dna.py`, keep going, and tell me what you changed.
- Optional: `--engine CYCLES --samples 64` for maximum realism (much slower; good for a short clip or thumbnail).

## What the video is (so you can judge the result)
Original cute 3D cartoon characters (glossy satin vinyl look, mitten hands with no fingers or nails, expressive eyes, subtle emotions).
**Night look** for night scenes: warm desk-lamp key, cool blue window rim, city bokeh, soft shadows. **Day look** for day scenes:
one strong side sunbeam with visible cast shadows, saturated teal/orange palette. Clean cuts; every voiceover line shows its subject;
key facts as orange title pills at the top plus 1–3-word captions low in the frame (added by post.py).

Storyboard (time → shot):
0–3.6 host Dan at a night desk ("40 YEARS") · 4.1–7.3 cork board with WANTED poster + cousin photos · 7.7–10.4 Dan holds up a DNA kit ·
10.9–13.7 1970s night street · 14.2–16.8 hooded menacing villain with flashlight · 17.1–20.5 tambourine on a doorknob ·
20.8–22.6 worried couple in bed, husband with bat · 23–25.3 California map, 13 pins · 25.6–30 detective, calendar flips to 1986 ·
30.3–33.3 evidence bag with swab under lamp · 33.5–37.6 DNA helix · 37.9–42.3 police DNA files, profile card searching ·
42.6–43.3 NO MATCH stamp · 43.6–47.5 UNSOLVED box, clock spinning · 47.8–52 two detectives at monitor (2018, day) ·
52.2–56.4 FamilyFinder upload on monitor · 57.3–73.2 wall screen family-tree chart (cousins, shared DNA, 1800s, forward,
THIS MAN), detective walks over and points · 73.5–79.8 ordinary old man watering lawn · 80–82.4 detectives watching ·
82.6–88.2 he enters grocery, officer swabs car door handle · 88.5–89.4 MATCH screen · 89.7–96.4 handcuffs + 1979 newspaper
"OFFICER FIRED" (hammer, dog spray) · 96.6–103.8 Dan with DNA kit, cousins, points at viewer ("IS YOUR DNA OUT THERE?").

## My preferences (important)
- No glitches: the camera never enters objects; hands must actually touch what they hold; nobody walks through things.
- Bright enough to see the characters clearly, with real cast shadows, saturated colours, no flat "ring light" look; not glass-toy shiny.
- Don't copy any reference video's characters; these are my own characters.
- Normal people act subtly; the villain looks evil by design.
- If you change anything, commit it back to the repo (branch main) so the skill keeps learning; the skill's memory is in
  `skills/voiceover-to-video/learning/` (`python scripts/learn.py brief`).
