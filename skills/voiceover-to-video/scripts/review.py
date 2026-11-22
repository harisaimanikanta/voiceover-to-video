#!/usr/bin/env python3
"""Automatic critique of a rendered video - the measurable half of the post-mortem.

  review.py out/final.mp4 <workdir> [--portals "t:w,t:w,..."] [--fps 4]

Writes <workdir>/review/review.json, a 1-fps contact sheet (review/sheet.png) and worst-offender frames
(review/flag-*.png). Each flagged second names the lesson area it belongs to, so `learn.py add` is one step away.
Measures per frame: brightness, contrast, saturation, sharpness, detail (edge density = set dressing), and motion;
flags dark / blown / flat / grey / soft / empty frames, frozen camera, hard cuts outside portals, and visual monotony
(the same look for too long). Compare its summary with learning/bar.json via `learn.py run --review`.
"""
import argparse, json, os, subprocess, sys
import numpy as np

W, H = 270, 480


def frames(path, fps):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={fps},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32) / 255


def metrics(f):
    lum = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    mx, mn = f.max(2), f.min(2)
    sat = np.where(mx > 0.02, (mx - mn) / np.maximum(mx, 1e-3), 0)
    lap = np.abs(4 * lum[1:-1, 1:-1] - lum[:-2, 1:-1] - lum[2:, 1:-1] - lum[1:-1, :-2] - lum[1:-1, 2:])
    gx, gy = np.abs(np.diff(lum, axis=1))[:-1], np.abs(np.diff(lum, axis=0))[:, :-1]
    edges = (gx + gy) > 0.08
    hist = np.histogramdd(f.reshape(-1, 3), bins=(6, 6, 6), range=[(0, 1)] * 3)[0].ravel()
    return dict(lum=float(lum.mean()), contrast=float(lum.std()), sat=float(sat.mean()), sharp=float(lap.var() * 1e3),
                detail=float(edges.mean()), hist=hist / hist.sum(), small=lum[::8, ::8])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video'); ap.add_argument('workdir')
    ap.add_argument('--portals', default='', help='t:halfwidth list; cuts/flat frames inside are intentional')
    ap.add_argument('--fps', type=float, default=4)
    a = ap.parse_args()
    out = os.path.join(a.workdir, 'review'); os.makedirs(out, exist_ok=True)
    portals = [tuple(map(float, x.split(':'))) for x in a.portals.split(',') if x.strip()]
    in_portal = lambda t: any(abs(t - c) <= w + 0.15 for c, w in portals)

    M, keep = [], {}
    for i, f in enumerate(frames(a.video, a.fps)):
        m = metrics(f); m['t'] = i / a.fps; M.append(m); keep[i] = f if i % max(1, int(a.fps)) == 0 else None
    if not M: sys.exit('no frames decoded')
    flags = []
    def flag(t, kind, area, why, val): flags.append(dict(t=round(t, 2), kind=kind, area=area, why=why, value=round(val, 4)))
    for i, m in enumerate(M):
        t = m['t']
        if in_portal(t): continue
        if m['lum'] < 0.10: flag(t, 'dark', 'lighting', 'frame too dark: subject unreadable; add key/practical light or raise exposure', m['lum'])
        if m['lum'] > 0.86: flag(t, 'blown', 'lighting', 'frame blown out: lower exposure / white set too bright', m['lum'])
        if m['contrast'] < 0.07: flag(t, 'flat', 'lighting', 'flat frame: no light shape; add a rim/kick light and darker background', m['contrast'])
        if m['sat'] < 0.14: flag(t, 'grey', 'grade', 'washed-out colour: cartoon style needs saturated, intentional palette', m['sat'])
        if m['detail'] < 0.025: flag(t, 'empty', 'sets', 'empty frame: dead space; dress foreground/background, add props or particles', m['detail'])
        if m['sharp'] < 0.15 and m['detail'] < 0.05: flag(t, 'soft', 'composition', 'soft/mushy frame: DoF or blur hides the subject', m['sharp'])
        if i:
            d = float(np.abs(m['small'] - M[i - 1]['small']).mean())
            hd = float(np.abs(m['hist'] - M[i - 1]['hist']).sum())
            m['motion'] = d
    # hard cuts: a one-frame spike in frame difference at 15 fps (a pan changes steadily; a cut jumps once). Lesson L027:
    # the old histogram test flagged fast pans past saturated props as cuts.
    small = [f[::6, ::6].mean(2) for f in frames(a.video, 15)]
    dd = [0.0] + [float(np.abs(small[i] - small[i - 1]).mean()) for i in range(1, len(small))]
    for i in range(2, len(dd) - 2):
        t = i / 15; ctx = max(dd[i - 2], dd[i - 1], dd[i + 1], dd[i + 2])
        if dd[i] > 0.08 and dd[i] > 3.5 * max(ctx, 0.01) and not in_portal(t): flag(t, 'cut', 'transitions', 'hard cut outside a portal: one-take rule broken', dd[i])
    # frozen camera: motion ~0 for >= 1 s outside portals
    still = 0
    for m in M[1:]:
        still = still + 1 if m.get('motion', 1) < 0.0025 and not in_portal(m['t']) else 0
        if still == int(a.fps): flag(m['t'], 'frozen', 'camera', 'picture frozen for 1 s: the camera must always move', 0)
    # monotony: near-identical colour histogram for > 8 s means the visuals stopped telling the story
    j = 0
    for i in range(len(M)):
        if np.abs(M[i]['hist'] - M[j]['hist']).sum() > 0.5: j = i
        elif M[i]['t'] - M[j]['t'] > 8 and (i == len(M) - 1 or np.abs(M[i + 1]['hist'] - M[j]['hist']).sum() > 0.5):
            flag(M[j]['t'], 'monotony', 'story', f"same look for {M[i]['t'] - M[j]['t']:.0f} s: add a new beat, angle or prop", M[i]['t'] - M[j]['t'])

    secs = lambda kinds: len({int(f['t']) for f in flags if f['kind'] in kinds})
    arr = lambda k: np.array([m[k] for m in M])
    summary = dict(duration=round(M[-1]['t'], 2), lum_mean=round(arr('lum').mean(), 4), contrast_mean=round(arr('contrast').mean(), 4),
                   sat_mean=round(arr('sat').mean(), 4), sharp_median=round(float(np.median(arr('sharp'))), 4),
                   detail_mean=round(arr('detail').mean(), 4), flagged_seconds=len({int(f['t']) for f in flags}),
                   flat_seconds=secs({'flat', 'grey', 'empty'}), cuts=sum(f['kind'] == 'cut' for f in flags))
    counts = {}
    for f in flags: counts[f['kind']] = counts.get(f['kind'], 0) + 1
    json.dump(dict(video=a.video, summary=summary, flag_counts=counts, flags=flags), open(os.path.join(out, 'review.json'), 'w'), indent=1)

    # contact sheet (1 fps, 6 columns) with timestamps; worst offenders saved for inspection
    from PIL import Image, ImageDraw
    tiles = [(M[i]['t'], f) for i, f in keep.items() if f is not None]
    cols, tw, th = 6, 135, 240
    sheet = Image.new('RGB', (cols * tw, -(-len(tiles) // cols) * th), '#111')
    bad = {int(f['t']) for f in flags}
    for k, (t, f) in enumerate(tiles):
        im = Image.fromarray((f * 255).astype(np.uint8)).resize((tw, th)); d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 44, 14], fill='#c00' if int(t) in bad else '#000'); d.text((3, 2), f'{t:5.1f}s', fill='#fff')
        sheet.paste(im, ((k % cols) * tw, (k // cols) * th))
    sheet.save(os.path.join(out, 'sheet.png'))
    seen = set()
    for f in sorted(flags, key=lambda f: f['kind']):
        if f['kind'] in seen: continue
        seen.add(f['kind']); i = min(range(len(M)), key=lambda i: abs(M[i]['t'] - f['t']))
        fr = keep.get(i - i % max(1, int(a.fps)))
        if fr is not None: Image.fromarray((fr * 255).astype(np.uint8)).save(os.path.join(out, f"flag-{f['kind']}-{f['t']}.png"))

    print(json.dumps(summary, indent=1))
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]): print(f'  {k:9} x{v}  e.g. ' + next(f['why'] for f in flags if f['kind'] == k))
    print(f'contact sheet: {out}/sheet.png  -> LOOK at it, then score with learn.py run')


if __name__ == '__main__':
    main()
