#!/usr/bin/env node
// Render a Shorts scene module (kit-based Three.js + caption overlay) to MP4, frame by frame.
// Usage:
//   node render.mjs <scene.js> [out.mp4] [--width 1080 --height 1920 --fps 30] [--from s --to s]
//                   [--audio voice.mp3] [--music bed.mp3 --music-db -20] [--still t [--still t ...]] [--preview]
// --preview  = 540x960 @ 15 fps (fast check).  --still t = write PNG(s) at time t instead of a video.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skill = path.dirname(here);
const argv = process.argv.slice(2);
const flags = {};
const stills = [];
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--preview') flags.preview = true;
  else if (a === '--still') stills.push(+argv[++i]);
  else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
  else pos.push(a);
}
const [sceneArg, outArg] = pos;
if (!sceneArg) { console.error('usage: node render.mjs <scene.js> [out.mp4] [options] (see header)'); process.exit(1); }
const scenePath = path.resolve(sceneArg);
const sceneDir = path.dirname(scenePath);
const base = path.basename(scenePath, '.js');
let W = +(flags.width || 1080), H = +(flags.height || 1920);
if (flags.preview) { W = 540; H = 960; }

const fontCandidates = ['/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', '/usr/share/fonts/opentype/inter/Inter-Bold.otf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'];
const fontFile = flags.font || fontCandidates.find(f => fs.existsSync(f));

const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const roots = { '/node_modules/': path.join(skill, 'node_modules'), '/kit/': path.join(skill, 'kit'), '/scene/': sceneDir };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = null;
  if (url === '/') file = path.join(here, 'harness.html');
  else if (url === '/fonts/caption.otf') file = fontFile;
  else for (const [p, root] of Object.entries(roots)) if (url.startsWith(p)) {
    const f = path.resolve(root, url.slice(p.length));
    if (f.startsWith(root)) file = f;
  }
  if (!file) { res.writeHead(404); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    // on-the-fly compatibility patches for third-party modules (files on disk are not modified)
    if (file.endsWith(path.join('mannequin-js', 'src', 'bodies', 'Mannequin.js'))) data = Buffer.from(String(data).replace('scene.add( this );', 'scene?.add( this );'));
    if (file.endsWith(path.join('mannequin-js', 'src', 'scene.js'))) data = Buffer.from(String(data).replace(/document\.head\.appendChild\( link \);/, '').replace(/document\.head\.appendChild\( meta \);/, '').replace('var stage = initStage( );', 'var stage = {};'));
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('[page]', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/?scene=${encodeURIComponent(path.basename(scenePath))}&w=${W}&h=${H}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
const err = await page.evaluate(() => window.__error);
if (err) { console.error('Scene failed:\n' + err); await browser.close(); server.close(); process.exit(1); }
const sceneDur = await page.evaluate(() => window.__duration);
const fps = flags.preview ? 15 : +(flags.fps || (await page.evaluate(() => window.__fps)) || 30);
const shot = async t => { await page.evaluate(t => window.renderFrame(t), t); return page.screenshot({ type: 'jpeg', quality: 92 }); };

fs.mkdirSync(path.join(process.cwd(), 'out'), { recursive: true });
if (flags.qa) {
  // QA: sample every --qa seconds; flag flat/blank/black/blown frames (ignores intended portal fills via --qa-ignore "c:w,c:w")
  const step = +flags.qa, ign = (flags['qa-ignore'] || '').split(',').filter(Boolean).map(s => s.split(':').map(Number));
  const bad = [];
  for (let t = 0; t < sceneDur; t += step) {
    const st = await page.evaluate(async t => { await window.renderFrame(t); const c = document.getElementById('c'); const o = document.createElement('canvas'); o.width = 96; o.height = 170;
      const g = o.getContext('2d'); g.drawImage(c, 0, 0, 96, 170); const d = g.getImageData(0, 0, 96, 170).data; let s = 0, s2 = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; s2 += l * l; n++; } const m = s / n; return { m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)) }; }, t);
    const ignored = ign.some(([c, w]) => Math.abs(t - c) < w);
    const flag = st.sd < 9 ? 'FLAT' : st.m < 12 ? 'BLACK' : st.m > 245 ? 'BLOWN' : '';
    if (flag && !ignored) bad.push(`${t.toFixed(2)}s ${flag} mean=${st.m.toFixed(0)} sd=${st.sd.toFixed(1)}`);
  }
  console.log(bad.length ? 'QA ISSUES:\n' + bad.join('\n') : 'QA OK: no blank/flat/black/blown frames');
} else if (stills.length) {
  for (const t of stills) {
    const f = path.resolve(outArg && stills.length === 1 ? outArg : path.join('out', `${base}-${t}s.jpg`));
    fs.writeFileSync(f, await shot(t)); console.log('wrote', f);
  }
} else {
  const t0 = +(flags.from || 0), t1 = +(flags.to || sceneDur);
  const frames = Math.round((t1 - t0) * fps);
  const out = path.resolve(outArg || path.join('out', base + (flags.preview ? '-preview' : '') + '.mp4'));
  const silent = out.replace(/\.mp4$/, '.video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  const start = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = await shot(t0 + i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\rframe ${i}/${frames}  ${((Date.now() - start) / 1000 / (i + 1)).toFixed(2)} s/frame   `);
  }
  ff.stdin.end(); await done;
  // audio: voice (+ optional music bed ducked under it)
  const inputs = [];
  if (flags.audio) inputs.push('-ss', String(t0), '-i', path.resolve(flags.audio));
  if (flags.music) inputs.push('-ss', String(t0), '-i', path.resolve(flags.music));
  if (inputs.length) {
    const db = flags['music-db'] || -20;
    const graph = flags.audio && flags.music ? `[2:a]volume=${db}dB[m];[1:a][m]amix=inputs=2:duration=first:normalize=0[a]`
      : flags.audio ? '[1:a]anull[a]' : `[1:a]volume=${db}dB[a]`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, ...inputs, '-filter_complex', graph, '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out]);
    fs.unlinkSync(silent);
  } else fs.renameSync(silent, out);
  console.log(`\nwrote ${out} (${frames} frames, ${(t1 - t0).toFixed(1)} s @ ${fps} fps, ${W}x${H})`);
}
await browser.close();
server.close();
