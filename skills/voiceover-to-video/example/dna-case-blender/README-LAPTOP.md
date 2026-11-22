# Render "Caught by His Cousins' DNA" on your laptop (Blender)

Tested setup: Windows laptop, RTX 3050, Ryzen 7, 24 GB RAM. Everything is scripted: you don't open or edit anything in Blender.

## One-time setup (about 10 minutes)
1. **Blender 4.2 or newer** (4.2 LTS is fine). Note where `blender.exe` is, for example
   `C:\Program Files\Blender Foundation\Blender 4.2\blender.exe`.
2. **ffmpeg:** open PowerShell and run `winget install Gyan.FFmpeg`, then close and reopen PowerShell.
3. **Python 3** (python.org or `winget install Python.Python.3.12`).
4. Optional, for nicer captions: install the free **Inter** font (rsms.me/inter). Without it, captions use a default bold font.
5. Download this repository (GitHub → Code → Download ZIP), unzip it, and open the folder
   `skills/voiceover-to-video/example/dna-case-blender`.
6. Copy your voiceover MP3 into that folder and name it **`voice.mp3`**.

## Make the video
Open PowerShell in that folder and run:

**1. Quick preview first** (half resolution; roughly 20–50 minutes on an RTX 3050):
```
python render_all.py --blender "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" --preview --out preview.mp4
```
**2. Final** (1080×1920; roughly 1.5–3 hours with EEVEE):
```
python render_all.py --blender "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"
```
The result is `final.mp4`. Rendering is resumable: if it stops, run the same command again and finished frames are skipped.
To redo one set only (after a fix): `--sets office` (set names: host street bed case dna records office suburb match arrest).
For maximum realism on a short clip, use `--engine CYCLES --samples 64`, which is about 10× slower.

## If something goes wrong
- `blender is not recognized` → pass the full path with `--blender "...\blender.exe"`.
- Out of video memory → close other apps, or add `--samples 16`.
- Send Claude the last lines of the error output, or connect this folder to the session
  (Claude desktop app → Settings → Claude Code → Remote Control) so Claude can run and fix it directly on your laptop.
