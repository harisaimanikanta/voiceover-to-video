#!/usr/bin/env python3
"""Split a storyboard sheet into panels and extract palettes (for Phase 4 storyboard analysis).

  python3 split-storyboard.py STORYBOARD.(png|jpg|webp) --out analysis/storyboard [--grid 3x2] [--colors 6]

Detects gutters (uniform rows/columns matching the sheet's border colour), crops each panel in reading order
(panel-01.png …), and writes storyboard.json with panel boxes and dominant colours (k-means) per panel and overall.
After running, LOOK at each panel and fill <workdir>/storyboard-follow.md (see SKILL.md, "Following a user storyboard").
Requires ffmpeg/ffprobe and numpy.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import shutil


def need(tool):
    if not shutil.which(tool): sys.exit(f"error: required tool '{tool}' not found on PATH (install FFmpeg)")


def ffprobe(path):
    need("ffprobe")
    return json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)], text=True, capture_output=True, check=True).stdout)


def write_json(p, data):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")

try:
    import numpy as np
except ImportError:  # pragma: no cover
    sys.exit("error: split-storyboard.py needs numpy (pip install numpy)")


def load_rgb(path: Path) -> np.ndarray:
    need("ffmpeg")
    st = next(s for s in ffprobe(path)["streams"] if s["codec_type"] == "video")
    w, h = int(st["width"]), int(st["height"])
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(h, w, 3)


def runs(mask: np.ndarray, min_len: int) -> list[tuple[int, int]]:
    out, start = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and start is None:
            start = i
        elif not m and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def segments(length: int, gutters: list[tuple[int, int]], min_size: int) -> list[tuple[int, int]]:
    cuts, prev = [], 0
    for a, b in gutters:
        if a - prev >= min_size:
            cuts.append((prev, a))
        prev = b
    if length - prev >= min_size:
        cuts.append((prev, length))
    return cuts


def gutter_mask(img: np.ndarray, axis: int, bg: np.ndarray, tol: float) -> np.ndarray:
    # axis=1 → per-row stats (rows are gutters), axis=0 → per-column
    diff = np.abs(img.astype(np.int16) - bg[None, None, :]).max(axis=2)
    frac_bg = (diff < tol).mean(axis=axis)
    return frac_bg > 0.97


def kmeans_palette(px: np.ndarray, k: int, seed: int = 0) -> list[dict]:
    rng = np.random.default_rng(seed)
    if len(px) > 20000:
        px = px[rng.choice(len(px), 20000, replace=False)]
    px = px.astype(np.float64)
    cent = px[rng.choice(len(px), k, replace=False)]
    for _ in range(20):
        d = ((px[:, None, :] - cent[None, :, :]) ** 2).sum(axis=2)
        lab = d.argmin(axis=1)
        new = np.array([px[lab == j].mean(axis=0) if np.any(lab == j) else cent[j] for j in range(k)])
        if np.allclose(new, cent, atol=0.5):
            break
        cent = new
    counts = np.bincount(lab, minlength=k) / len(px)
    order = np.argsort(-counts)
    return [{"hex": "#%02x%02x%02x" % tuple(int(round(c)) for c in cent[j]), "share": round(float(counts[j]), 3)} for j in order]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--out", default="analysis/storyboard")
    ap.add_argument("--grid", help="force a uniform grid, e.g. 3x2 (cols x rows)")
    ap.add_argument("--colors", type=int, default=6)
    ap.add_argument("--tol", type=float, default=24)
    a = ap.parse_args()
    src = Path(a.image)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    img = load_rgb(src)
    H, W, _ = img.shape
    boxes: list[tuple[int, int, int, int]] = []
    method = "grid"
    if a.grid:
        cols, rows = (int(x) for x in a.grid.lower().split("x"))
        for r in range(rows):
            for c in range(cols):
                boxes.append((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows))
    else:
        method = "gutters"
        border = np.concatenate([img[0], img[-1], img[:, 0], img[:, -1]])
        bg = np.median(border, axis=0)
        min_g = max(2, int(min(H, W) * 0.004))
        row_g = runs(gutter_mask(img, 1, bg, a.tol), min_g)
        bands = segments(H, row_g, int(H * 0.08))
        for y0, y1 in bands:
            band = img[y0:y1]
            col_g = runs(gutter_mask(band, 0, bg, a.tol), min_g)
            for x0, x1 in segments(W, col_g, int(W * 0.08)):
                # trim residual border inside the panel
                sub = img[y0:y1, x0:x1]
                rm = ~gutter_mask(sub, 1, bg, a.tol)
                cm = ~gutter_mask(sub, 0, bg, a.tol)
                if rm.any() and cm.any():
                    ys, xs = np.where(rm)[0], np.where(cm)[0]
                    boxes.append((x0 + int(xs[0]), y0 + int(ys[0]), x0 + int(xs[-1]) + 1, y0 + int(ys[-1]) + 1))
        if len(boxes) <= 1:
            print("note: no gutters detected — treating the whole image as one panel (use --grid CxR to force a grid)", file=sys.stderr)
            boxes = [(0, 0, W, H)]
            method = "single"
    panels = []
    for i, (x0, y0, x1, y1) in enumerate(boxes, 1):
        name = f"panel-{i:02d}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-frames:v", "1", "-vf", f"crop={x1 - x0}:{y1 - y0}:{x0}:{y0}", str(out / name)], check=True)
        px = img[y0:y1, x0:x1].reshape(-1, 3)
        panels.append({"index": i, "file": name, "box": [x0, y0, x1, y1], "palette": kmeans_palette(px, a.colors, seed=i),
                       "meanLuma": round(float((px @ np.array([0.2126, 0.7152, 0.0722])).mean() / 255), 3)})
    # overall palette from panel pixels only (gutters/borders excluded)
    overall = kmeans_palette(np.concatenate([img[y0:y1, x0:x1].reshape(-1, 3) for x0, y0, x1, y1 in boxes]), a.colors)
    write_json(out / "storyboard.json", {"source": str(src.resolve()), "size": [W, H], "method": method, "panels": panels, "palette": overall})
    print(f"{len(panels)} panels ({method}) → {out}/panel-XX.png, storyboard.json")
    print("overall palette:", ", ".join(f"{c['hex']} {c['share'] * 100:.0f}%" for c in overall))
    print("next: view each panel image and write docs/storyboard-analysis.md")


if __name__ == "__main__":
    main()
