#!/usr/bin/env python3
"""Polished storyboard sheet rendered from the REAL scene - shown to the user for approval before the full render.

  storyboard.py scene.js <workdir> [--treatment TREATMENT.md | --panels panels.json] [--title "..."] [--cols 4] [--rows 3]

Panels come from the treatment table (| time a–b | VO | visual | camera | transition |, one panel per row, frame
taken at the row's midpoint, or at "@t" if the visual cell contains e.g. "@12.4") or from panels.json
([{"t": 3.2, "vo": "...", "visual": "...", "camera": "...", "transition": "...", "range": [a, b]}]).
Writes <workdir>/storyboard/storyboard-01.png ... (12 panels per page) + panels.json. Each panel: number, timecode,
camera move, narration, what we see, transition out. Look at every page yourself before showing it.
"""
import argparse, json, os, re, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = {'bold': ['/usr/share/fonts/opentype/inter/Inter-Bold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf'],
         'reg': ['/usr/share/fonts/opentype/inter/Inter-Regular.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf', 'C:/Windows/Fonts/arial.ttf'],
         'black': ['/usr/share/fonts/opentype/inter/Inter-Black.otf', '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']}
def font(kind, size):
    for f in FONTS[kind]:
        if os.path.exists(f): return ImageFont.truetype(f, size)
    return ImageFont.load_default()

PAPER, INK, MUTED, ACCENT, CARD = '#f5efe4', '#1f1b16', '#6b6157', '#e8613c', '#fffdf8'


def parse_treatment(p):
    rows = []
    for line in open(p, encoding='utf-8'):
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 4: continue
        m = re.match(r'^(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)$', cells[0])
        if not m: continue
        a, b = float(m.group(1)), float(m.group(2))
        at = re.search(r'@(\d+(?:\.\d+)?)', ' '.join(cells))
        clean = lambda s: re.sub(r'\*\*|@\d+(\.\d+)?', '', s).strip()
        rows.append(dict(t=float(at.group(1)) if at else round((a + b) / 2, 2), range=[a, b], vo=clean(cells[1]), visual=clean(cells[2]),
                         camera=clean(cells[3]) if len(cells) > 3 else '', transition=clean(cells[4]) if len(cells) > 4 else '', learn=clean(cells[5]) if len(cells) > 5 else ''))
    return rows


def wrap(draw, text, f, width, max_lines):
    words, lines, cur = text.split(), [], ''
    for w in words:
        trial = (cur + ' ' + w).strip()
        if draw.textlength(trial, font=f) <= width: cur = trial
        else:
            lines.append(cur); cur = w
            if len(lines) == max_lines: break
    if len(lines) < max_lines and cur: lines.append(cur)
    if len(lines) == max_lines and ' '.join(lines) != ' '.join(words):
        while lines[-1] and draw.textlength(lines[-1] + '…', font=f) > width: lines[-1] = lines[-1][:-1]
        lines[-1] = lines[-1].rstrip() + '…'
    return lines


def js(t): return str(int(t)) if float(t).is_integer() else repr(float(t))   # number as JS prints it (render.mjs file names)


def tc(t): return f'{int(t // 60)}:{t % 60:04.1f}'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('scene'); ap.add_argument('workdir')
    ap.add_argument('--treatment'); ap.add_argument('--panels'); ap.add_argument('--title', default='')
    ap.add_argument('--cols', type=int, default=4); ap.add_argument('--rows', type=int, default=3)
    ap.add_argument('--thumb', type=int, default=540, help='panel render width (9:16)')
    a = ap.parse_args()
    panels = json.load(open(a.panels)) if a.panels else parse_treatment(a.treatment or os.path.join(a.workdir, 'TREATMENT.md'))
    if not panels: sys.exit('no panels found (treatment rows need a "a–b" time range in the first column)')
    out = os.path.join(a.workdir, 'storyboard'); os.makedirs(out, exist_ok=True)
    json.dump(panels, open(os.path.join(out, 'panels.json'), 'w'), indent=1, ensure_ascii=False)

    # render every panel frame from the real scene in one browser session
    scene = os.path.abspath(a.scene); base = os.path.splitext(os.path.basename(scene))[0]
    W, H = a.thumb, a.thumb * 16 // 9
    cmd = ['node', os.path.join(HERE, 'render.mjs'), scene, '--width', str(W), '--height', str(H)]
    for p in panels: cmd += ['--still', js(p['t'])]
    subprocess.run(cmd, cwd=out, check=True, stdout=subprocess.DEVNULL)
    frames = [os.path.join(out, 'out', f"{base}-{js(p['t'])}s.jpg") for p in panels]

    # compose pages
    per = a.cols * a.rows; pad, gap = 70, 44; tw = W; th = H; text_h = 380
    PW = pad * 2 + a.cols * tw + (a.cols - 1) * gap; head = 230
    fT, fS, fN, fTC, fCam, fVO, fVis, fTr = font('black', 64), font('reg', 28), font('black', 40), font('bold', 26), font('bold', 22), font('bold', 27), font('reg', 23), font('bold', 22)
    dur = max(p['range'][1] if p.get('range') else p['t'] for p in panels)
    per = -(-len(panels) // -(-len(panels) // per))   # balance pages (never leave one lonely panel on the last page)
    pages = [panels[i:i + per] for i in range(0, len(panels), per)]
    written = []
    for pi, page in enumerate(pages):
        rows = -(-len(page) // a.cols); PH = head + rows * (th + text_h + gap) + pad
        img = Image.new('RGB', (PW, PH), PAPER); d = ImageDraw.Draw(img)
        d.text((pad, 60), (a.title or 'Storyboard').upper(), font=fT, fill=INK)
        d.text((pad, 140), f'{len(panels)} panels · {tc(dur)} · 9:16 one continuous take · page {pi + 1}/{len(pages)}', font=fS, fill=MUTED)
        bx = PW - pad - 330; d.rounded_rectangle([bx, 62, PW - pad, 128], 14, outline=INK, width=3)
        d.text((bx + 22, 78), 'APPROVED', font=font('bold', 30), fill=INK); d.rounded_rectangle([PW - pad - 70, 77, PW - pad - 34, 113], 6, outline=INK, width=3)
        d.line([pad, 200, PW - pad, 200], fill=ACCENT, width=4)
        for k, p in enumerate(page):
            i = pi * per + k; c, r = k % a.cols, k // a.cols
            x, y = pad + c * (tw + gap), head + r * (th + text_h + gap)
            sh = Image.new('L', (tw + 40, th + text_h + 40), 0); ImageDraw.Draw(sh).rounded_rectangle([20, 24, tw + 20, th + text_h + 20], 22, fill=90)
            img.paste(Image.new('RGB', sh.size, '#8a7a66'), (x - 20, y - 20), sh.filter(ImageFilter.GaussianBlur(14)))
            d.rounded_rectangle([x, y, x + tw, y + th + text_h], 22, fill=CARD)
            fr = Image.open(frames[i]).convert('RGB').resize((tw, th), Image.LANCZOS)
            m = Image.new('L', (tw, th), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, tw - 1, th + 40], 22, fill=255); img.paste(fr, (x, y), m)
            d.ellipse([x + 18, y + 18, x + 92, y + 92], fill=ACCENT); n = f'{i + 1:02d}'
            d.text((x + 55 - d.textlength(n, font=fN) / 2, y + 30), n, font=fN, fill='#ffffff')
            rng = p.get('range'); t = f"{tc(rng[0])} – {tc(rng[1])}" if rng else tc(p['t'])
            tl = d.textlength(t, font=fTC); d.rounded_rectangle([x + tw - tl - 46, y + 26, x + tw - 18, y + 72], 23, fill='#1f1b16'); d.text((x + tw - tl - 32, y + 34), t, font=fTC, fill='#ffffff')
            ty = y + th + 22
            if p.get('camera'):
                cam = wrap(d, 'CAMERA · ' + p['camera'], fCam, tw - 44, 1)[0]
                d.rounded_rectangle([x + 18, ty - 4, x + 26 + d.textlength(cam, font=fCam) + 14, ty + 34], 17, fill='#efe6d8'); d.text((x + 30, ty + 2), cam, font=fCam, fill=INK); ty += 50
            for ln in wrap(d, f"“{p.get('vo', '')}”", fVO, tw - 40, 3): d.text((x + 20, ty), ln, font=fVO, fill=INK); ty += 36
            if p.get('learn'):   # comprehension: what the viewer must understand from this picture (lesson L031)
                for ln in wrap(d, 'VIEWER LEARNS: ' + p['learn'], fTr, tw - 40, 2): d.text((x + 20, ty + 4), ln, font=fTr, fill='#1f8a5a'); ty += 30
            ty += 6
            for ln in wrap(d, p.get('visual', ''), fVis, tw - 40, 3): d.text((x + 20, ty), ln, font=fVis, fill=MUTED); ty += 31
            if p.get('transition') and p['transition'] not in ('(continuous)', '-', ''):
                tr = wrap(d, '→ ' + p['transition'], fTr, tw - 40, 1)[0]; d.text((x + 20, y + th + text_h - 44), tr, font=fTr, fill=ACCENT)
        f = os.path.join(out, f'storyboard-{pi + 1:02d}.png'); img.save(f, optimize=True); written.append(f)
    print('\n'.join(written)); print('LOOK at every page, fix weak panels in scene.js, re-run, then show the user for approval.')


if __name__ == '__main__':
    main()
