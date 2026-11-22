// V3 sets: clarity-first props. The family-tree search is a live chart on a tall screen (portrait, fits 9:16).
import * as THREE from 'three';
import { soft, roundBox, practical, tubeR } from '/kit/look.js';
import { plant, deskLamp, desk, mug, windowFrame, plankTexture, wallTexture, bookshelf, pictureFrame } from '/kit/props.js';
import { V, tex, portrait } from './sets.js';

const FONT = 'Inter, "DejaVu Sans", Arial, sans-serif';
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };

/** WANTED-style poster with a hooded silhouette (opening board). */
export function wantedPoster() {
  return tex(360, 480, (c, w, h) => {
    c.fillStyle = '#f3e6c4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7a1e14'; c.font = `900 58px ${FONT}`; c.textAlign = 'center'; c.fillText('WANTED', w / 2, 70);
    c.fillStyle = '#1d1a18'; c.beginPath(); c.moveTo(w / 2 - 95, 330); c.quadraticCurveTo(w / 2 - 100, 110, w / 2, 100); c.quadraticCurveTo(w / 2 + 100, 110, w / 2 + 95, 330); c.closePath(); c.fill();
    c.fillStyle = '#f3e6c4'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * 26, 215, 14, 6, s * -0.25, 0, 7); c.fill(); }
    c.fillStyle = '#1d1a18'; c.font = `900 34px ${FONT}`; c.fillText('GOLDEN STATE', w / 2, 385); c.fillText('KILLER', w / 2, 425);
    c.fillStyle = '#7a1e14'; c.font = `800 24px ${FONT}`; c.fillText('NEVER CAUGHT', w / 2, 462);
  });
}

/** Live family-tree search chart (720x1260 canvas). draw(t) animates with absolute narration time. */
export function familyChart() {
  const W = 720, H = 1260, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const t3 = new THREE.CanvasTexture(c); t3.colorSpace = THREE.SRGBColorSpace; t3.anisotropy = 8;
  const skins = ['#f1c4a0', '#c98f6a', '#f3d1b5', '#8a5a3c', '#e8b796', '#d8a888'], hairs = ['#4a2c1a', '#1a1008', '#d8a040', '#2a1a12', '#9a9a9a', '#c8742c'];
  const N = {};   // nodes: id -> {x, y, gen, i}
  const add = (id, x, y, gen, i) => (N[id] = { x, y, gen, i });
  add('a1', 290, 300, 0, 0); add('a2', 430, 300, 0, 1);
  add('b1', 150, 520, 1, 2); add('b2', 360, 520, 1, 3); add('b3', 570, 520, 1, 4);
  const cous = ['d1', 'd2', 'd3'], cand = ['d4', 'd5', 'd6', 'd7'];
  [62, 150, 238].forEach((x, k) => add(cous[k], x, 760, 3, k + 1));
  [332, 420, 530, 630].forEach((x, k) => add(cand[k], x, 760, 3, k + 4));
  const E = [['a1', 'b1'], ['a1', 'b2'], ['a1', 'b3'], ['b1', 'd1'], ['b1', 'd2'], ['b1', 'd3'], ['b2', 'd4'], ['b2', 'd5'], ['b3', 'd6'], ['b3', 'd7']];
  const TARGET = 'd6';
  function face(n, r, sepia, a) {
    g.globalAlpha = a; const s = sepia ? '#d8c09a' : skins[n.i % 6], hc = sepia ? '#6a5038' : hairs[n.i % 6];
    g.fillStyle = sepia ? '#efe2c4' : '#ffffff'; g.beginPath(); g.arc(n.x, n.y, r, 0, 7); g.fill();
    g.fillStyle = s; g.beginPath(); g.arc(n.x, n.y + r * 0.05, r * 0.62, 0, 7); g.fill();
    g.fillStyle = hc; g.beginPath(); g.arc(n.x, n.y - r * 0.08, r * 0.64, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    g.fillStyle = '#2a1a10'; for (const k of [-1, 1]) { g.beginPath(); g.arc(n.x + k * r * 0.22, n.y + r * 0.05, r * 0.07, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }
  function line(a, b, k, col, w = 6) { if (k <= 0) return; const A = N[a], B = N[b], my = (A.y + B.y) / 2;
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath();
    const pts = [[A.x, A.y], [A.x, my], [B.x, my], [B.x, B.y]]; let L = 0; const seg = []; for (let i = 1; i < 4; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let rem = L * Math.min(1, k); g.moveTo(...pts[0]); for (let i = 1; i < 4; i++) { const d = seg[i - 1]; if (rem >= d) { g.lineTo(...pts[i]); rem -= d; } else { const f = rem / d; g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); break; } }
    g.stroke(); }
  function label(txt, x, y, size, col, align = 'center') { g.font = `800 ${size}px ${FONT}`; g.textAlign = align; g.fillStyle = col; g.fillText(txt, x, y); }
  function bar(x, y, w, shared, glow, seed) {   // DNA bar, 40 px tall; `shared` = stripe range shared with the killer
    const cols = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff']; let s = seed;
    for (let i = 0; i < 12; i++) { s = (s * 16807) % 2147483647; const isS = i >= shared[0] && i <= shared[1]; g.fillStyle = isS ? '#ff2d55' : cols[s % 5]; g.globalAlpha = isS ? 1 : 0.55; g.fillRect(x + i * w / 12, y, w / 12 - 3, 40); }
    g.globalAlpha = 1; if (glow > 0) { g.strokeStyle = `rgba(255,45,85,${glow})`; g.lineWidth = 5; g.strokeRect(x + shared[0] * w / 12 - 4, y - 4, (shared[1] - shared[0] + 1) * w / 12 + 5, 48); }
  }
  return {
    tex: t3, nodes: N, target: TARGET,
    /** chart-space (0..1) position of a node, for pointing gestures */
    uv(id) { return [N[id].x / W, N[id].y / H]; },
    draw(t) {
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#13233a'); bg.addColorStop(1, '#0c1626'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8613c'; g.fillRect(0, 0, W, 16);
      // ghost of the whole tree (so the screen is never empty and the structure is visible from the start)
      for (const [a, b] of E) line(a, b, 1, 'rgba(160,180,210,0.22)', 4);
      for (const id in N) { const n = N[id]; g.globalAlpha = 0.25; g.fillStyle = '#9fb0c8'; g.beginPath(); g.arc(n.x, n.y, n.gen === 3 ? 40 : n.gen === 0 ? 50 : 44, 0, 7); g.fill(); g.globalAlpha = 1; }
      label('1800s', W / 2, 215, 40, 'rgba(216,192,154,0.35)'); label('TODAY', W / 2, 860, 30, 'rgba(160,180,210,0.5)');
      const cousIn = sm((t - 57.3) / 0.6), up = clamp((t - 63.0) / 2.4), down = clamp((t - 66.4) / 4.3), filt = sm((t - 71.2) / 0.8);
      // cousins found on the website
      for (const id of cous) { const n = N[id]; face(n, 40, false, cousIn); if (cousIn > 0.5) { g.globalAlpha = cousIn; g.fillStyle = '#06d6a0'; g.beginPath(); g.roundRect(n.x - 43, n.y + 47, 86, 34, 9); g.fill(); label('COUSIN', n.x, n.y + 71, 19, '#06301f'); g.globalAlpha = 1; } }
      // lines up to the 1800s
      const upOrder = [['b1', 'd1'], ['b1', 'd2'], ['b1', 'd3'], ['a1', 'b1']];
      upOrder.forEach(([a, b], i) => line(a, b, clamp(up * upOrder.length - i * 0.9), '#ffd166', 8));
      if (up > 0.2) face(N.b1, 44, false, sm(up * 3 - 0.6));
      if (up > 0.55) { face(N.a1, 50, true, sm(up * 3 - 1.7)); face(N.a2, 50, true, sm(up * 3 - 1.8)); g.strokeStyle = '#d8c09a'; g.lineWidth = 6; g.beginPath(); g.moveTo(N.a1.x + 50, N.a1.y); g.lineTo(N.a2.x - 50, N.a2.y); g.stroke();
        g.globalAlpha = sm(up * 3 - 1.8); label('1800s', W / 2, 215, 40, '#d8c09a'); g.globalAlpha = 1; }
      // forward again, branch by branch
      const downOrder = [['a1', 'b2'], ['a1', 'b3'], ['b2', 'd4'], ['b2', 'd5'], ['b3', 'd6'], ['b3', 'd7']];
      downOrder.forEach(([a, b], i) => { const k = clamp(down * downOrder.length - i); line(a, b, k, '#4cc9f0', 8); if (k >= 1) { const n = N[b]; const isMan = n.gen === 3;
        const out = isMan && b !== TARGET ? filt : 0; face(n, isMan ? 40 : 44, false, 1 - out * 0.65);
        if (isMan && out > 0) { g.strokeStyle = `rgba(255,59,59,${out})`; g.lineWidth = 9; g.beginPath(); g.moveTo(n.x - 30, n.y - 30); g.lineTo(n.x + 30, n.y + 30); g.moveTo(n.x + 30, n.y - 30); g.lineTo(n.x - 30, n.y + 30); g.stroke(); } } });
      if (filt > 0) { const n = N[TARGET]; g.strokeStyle = `rgba(255,210,74,${filt})`; g.lineWidth = 10; g.beginPath(); g.arc(n.x, n.y, 52 + 4 * Math.sin(t * 6), 0, 7); g.stroke();
        g.globalAlpha = filt; label('RIGHT AGE ✓   RIGHT PLACE ✓', W / 2, 875, 34, '#ffd24a'); label('THIS MAN', N[TARGET].x, N[TARGET].y - 62, 26, '#ffd24a'); g.globalAlpha = 1; }
      // the killer's DNA (not on the site) + shared pieces with each cousin
      const qa = sm((t - 56.9) / 0.5);
      if (qa > 0) { g.globalAlpha = qa; const y0 = 930; g.fillStyle = '#1d2a40'; g.beginPath(); g.roundRect(24, y0, W - 48, 300, 18); g.fill();
        g.fillStyle = '#2a2a33'; g.beginPath(); g.arc(90, y0 + 70, 46, 0, 7); g.fill(); label('?', 90, y0 + 92, 64, '#ffd24a');
        label("KILLER'S DNA", 150, y0 + 62, 34, '#ffffff', 'left'); label('not on the website', 150, y0 + 100, 26, '#9fb0c8', 'left');
        const sh = sm((t - 60.0) / 0.6); bar(150, y0 + 130, 520, [5, 7], sh, 3);
        if (sh > 0) { g.globalAlpha = qa * sh; label('COUSIN', 85, y0 + 210, 24, '#06d6a0'); bar(150, y0 + 185, 520, [5, 7], sh, 11); label('same piece of DNA = family', W / 2, y0 + 268, 30, '#ff8fa8'); }
        g.globalAlpha = 1; }
      t3.needsUpdate = true;
    },
  };
}

/** 2018 office, v3 layout: desk + laptop on the left, tall investigation screen on the right of the back wall. */
export function office3(scene) {
  const g = new THREE.Group(); scene.add(g); const W = 7, D = 5, H = 3;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), soft('#ffffff', 'wood', { map: plankTexture('#c8a888', { seed: 9 }) })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), soft('#ffffff', 'clay', { map: wallTexture('#e4eaee') })); back.position.set(0, H / 2, -D / 2); back.receiveShadow = true; g.add(back);
  const win = windowFrame({ w: 1.3, h: 1.4, sky: ['#7fc0f0', '#e8f6ff'], light: '#fff6e0', intensity: 2.2 }); win.position.set(-2.1, 1.75, -D / 2 + 0.01); g.add(win);
  const dk = desk({ w: 1.5, color: '#f4f4f4' }); dk.position.set(-0.55, 0, -1.25); g.add(dk);
  const lap = new THREE.Group(); lap.position.set(-0.6, 0.785, -1.45); lap.rotation.y = Math.PI; g.add(lap);
  lap.add(at(roundBox(0.42, 0.02, 0.3, soft('#c8ccd4', 'metal'), 0.008), 0, 0.01, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.02, -0.15); lid.rotation.x = -0.25; lap.add(lid); lid.add(at(roundBox(0.42, 0.28, 0.012, soft('#c8ccd4', 'metal'), 0.008), 0, 0.14, 0));
  const lapGlow = new THREE.PointLight('#bfe8ff', 0.8, 1.5, 2); lapGlow.position.set(0, 0.2, -0.3); lid.add(lapGlow);
  const mg = mug('#2fb8b0'); mg.position.set(-0.05, 0.785, -1.05); g.add(mg);
  for (let i = 0; i < 3; i++) { const f = roundBox(0.24, 0.03, 0.31, soft(['#e8c070', '#c8d8e8', '#f0e0c0'][i], 'paper'), 0.006); f.position.set(-1.05 + i * 0.02, 0.8 + i * 0.03, -1.15); f.rotation.y = i * 0.1; g.add(f); }
  // tall investigation screen
  const scr = new THREE.Group(); scr.position.set(1.35, 1.72, -D / 2 + 0.06); g.add(scr);
  scr.add(roundBox(1.12, 1.92, 0.06, soft('#1d2230', 'plastic'), 0.03));
  const chart = familyChart(); chart.draw(0);
  const site = tex(720, 1260, (c, w, h) => {});   // replaced every frame by website() below
  const sm3 = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.82), new THREE.MeshBasicMaterial({ map: chart.tex })); sm3.position.z = 0.032; scr.add(sm3);
  const glow = new THREE.PointLight('#9fd0ff', 1.6, 3.5, 1.8); glow.position.set(0, 0, 0.8); scr.add(glow);
  // website page (shown on the screen before the chart)
  const wc = document.createElement('canvas'); wc.width = 720; wc.height = 1260; const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
  const website = k => { const c = wc.getContext('2d'), w = 720, h = 1260; const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#eaf6ff'); gr.addColorStop(1, '#cfe8ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2fb8b0'; c.fillRect(0, 0, w, 120); c.fillStyle = '#ffffff'; c.font = `900 60px ${FONT}`; c.textAlign = 'center'; c.fillText('FamilyFinder', w / 2, 82);
    c.fillStyle = '#1f3a5a'; c.font = `800 40px ${FONT}`; c.fillText('Find your long-lost family', w / 2, 220); c.font = `600 30px ${FONT}`; c.fillText('free · upload your DNA', w / 2, 270);
    for (let i = 0; i < 6; i++) { const x = 140 + (i % 3) * 220, y = 400 + Math.floor(i / 3) * 230; c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(x - 90, y - 90, 180, 200, 20); c.fill();
      c.fillStyle = ['#ffd6c0', '#d6f0d6', '#e6dcff', '#fff0b8', '#ffd6e0', '#d6e8ff'][i]; c.beginPath(); c.arc(x, y - 10, 50, 0, 7); c.fill(); c.fillRect(x - 55, y + 50, 110, 40); }
    c.fillStyle = '#1f3a5a'; c.font = `800 40px ${FONT}`; c.fillText("Uploading: killer's DNA", w / 2, 940); c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(60, 980, w - 120, 70, 35); c.fill();
    c.fillStyle = '#ff8f3a'; c.beginPath(); c.roundRect(60, 980, Math.max(70, (w - 120) * k), 70, 35); c.fill(); c.fillStyle = '#1f3a5a'; c.font = `800 34px ${FONT}`; c.fillText(Math.round(k * 100) + '%', w / 2, 1028);
    wt.needsUpdate = true; };
  const sh = bookshelf({ w: 1.0, h: 1.7, seed: 13, color: '#e8e8e8' }); sh.position.set(-3.1, 0, -1.0); sh.rotation.y = Math.PI / 2; g.add(sh);
  for (const [x, z, h, s] of [[-3.0, -2.1, 1.2, 51], [2.3, -2.1, 1.1, 52], [3.0, 0.4, 1.3, 53]]) { const p = plant({ h, seed: s }); p.position.set(x, 0, z); g.add(p); }
  const ceil = practical('#ffffff', 1.0, 6, { radius: 0.5, shape: 'panel' }); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H - 0.02, -0.5); g.add(ceil);
  return { laptop: lap, desk: dk, screen: sm3, screenGroup: scr, chart, website, siteTex: wt, chartTex: chart.tex };
}

/** 1979 newspaper: OFFICER FIRED. */
export function newspaper() {
  const t = tex(512, 680, (c, w, h) => {
    c.fillStyle = '#f2ecdc'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d1a18'; c.textAlign = 'center';
    c.font = `900 50px Georgia, serif`; c.fillText('THE DAILY NEWS', w / 2, 62); c.fillRect(30, 80, w - 60, 4); c.font = `600 22px Georgia, serif`; c.fillText('1979', w / 2, 112);
    c.font = `900 54px ${FONT}`; c.fillText('OFFICER', w / 2, 190); c.fillText('FIRED', w / 2, 250); c.font = `800 30px ${FONT}`; c.fillText('caught shoplifting', w / 2, 296);
    // hammer + spray can drawings
    c.save(); c.translate(150, 450); c.rotate(-0.5); c.fillStyle = '#b8864a'; c.fillRect(-12, -10, 24, 170); c.fillStyle = '#6a6e78'; c.fillRect(-55, -40, 110, 44); c.restore();
    c.fillStyle = '#f2a541'; c.fillRect(310, 360, 90, 180); c.fillStyle = '#c8c8c8'; c.fillRect(320, 330, 70, 32); c.fillStyle = '#d81e1e'; c.fillRect(342, 310, 26, 22);
    c.fillStyle = '#1d1a18'; c.font = `900 26px ${FONT}`; c.fillText('DOG', 355, 440); c.fillText('SPRAY', 355, 472);
    c.font = `800 30px ${FONT}`; c.fillText('a hammer and dog spray', w / 2, 610);
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 630; y < h - 10; y += 14) c.fillRect(40, y, w - 80, 5);
  });
  const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide })); m.castShadow = true; g.add(m);
  return g;
}
