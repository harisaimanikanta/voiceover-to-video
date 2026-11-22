#!/usr/bin/env python3
"""One command to make the whole video on your laptop (Blender 4.2+ with a GPU):

    python render_all.py --blender "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" --voice voice.mp3

Renders every set with EEVEE at 1080x1920 into frames/ (resumable: finished frames are skipped), then adds titles,
captions and your voice -> final.mp4.  Options: --preview (540x960, fast check), --engine CYCLES, --samples N, --sets host,bed
Needs: Blender, ffmpeg on PATH, Python 3 with Pillow (only for textures.py if you regenerate graphics)."""
import argparse, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
SETS = ['host', 'street', 'bed', 'case', 'dna', 'records', 'office', 'suburb', 'match', 'arrest']
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('--blender', default='blender'); ap.add_argument('--voice', default=os.path.join(HERE, 'voice.mp3'))
ap.add_argument('--engine', default='EEVEE'); ap.add_argument('--samples', default='32'); ap.add_argument('--preview', action='store_true')
ap.add_argument('--sets', default=','.join(SETS)); ap.add_argument('--out', default=os.path.join(HERE, 'final.mp4'))
a = ap.parse_args()
res = '540x960' if a.preview else '1080x1920'; frames = os.path.join(HERE, 'frames_preview' if a.preview else 'frames')
os.makedirs(frames, exist_ok=True); t0 = time.time()
for s in a.sets.split(','):
    print(f'== {s} ({time.time() - t0:.0f}s elapsed)', flush=True)
    subprocess.run([a.blender, '-b', '--factory-startup', '-P', os.path.join(HERE, 'dna.py'), '--', '--set', s, '--render', '--engine', a.engine,
                    '--samples', '16' if a.preview else a.samples, '--res', res, '--out', frames, '--device', 'GPU'], check=True)
subprocess.run([a.blender, '-b', '--factory-startup', '-P', os.path.join(HERE, 'sfx.py')], check=True)   # sound design -> sfx.wav (Blender's Python has numpy)
subprocess.run([sys.executable, os.path.join(HERE, 'post.py'), frames, a.voice, a.out], check=True)
print(f'done in {(time.time() - t0) / 60:.1f} min -> {a.out}')
