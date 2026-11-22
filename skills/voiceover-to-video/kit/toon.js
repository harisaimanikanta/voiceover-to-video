// Cartoon cast v3: feature-animation style 3D cartoon characters.
// - One sculpted head mesh (rounded cranium, soft cheeks that rise when smiling, bulb nose, chin, eye sockets) - no seams.
// - Real eyes: glossy eyeballs with painted irises (limbal ring, striations, pupil), catchlights, eyelids that blink,
//   squint and tilt with emotion, lash line. Eyes rotate to look.
// - Sculpted mouth that changes shape: smile/frown curve, open jaw, teeth, tongue, pucker, asymmetry, full lips.
// - Tapered eyebrows driven by inner/mid/outer controls.
// - 14 emotions (+ blending, talking): neutral happy joy sad angry surprised scared disgust thinking smug worried
//   sick proud embarrassed. Legacy names smile/grin/frown/flat/o still work.
// Joints (Groups): pelvis, chest, neck, head, shoulderL/R, elbowL/R, wristL/R (hand sockets), hipL/R, kneeL/R.
// L = character's left (+x). Character faces +z. Height ≈ 1.75 m.
import * as THREE from 'three';
import { soft, tubeR, lathe } from './look.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const N = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const cap = (r, len, m, seg = 24) => { const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 10, seg), m); x.castShadow = x.receiveShadow = true; return x; };
const sph = (r, m, w = 32, h = 24) => { const x = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m); x.castShadow = true; x.receiveShadow = true; return x; };

// ---------------------------------------------------------------- emotions
// bi/bm/bo = brow inner/mid/outer raise (-1..1); ul = upper lid open (0 closed .. 1 wide); ll = lower lid raise (squint);
// lt = lid tilt (+ angry, - sad); sm = smile (-1 frown .. 1); op = mouth open; wd = mouth width; pk = pucker;
// ch = cheek raise; teeth 0/1/2 (upper/both); tg = tongue; as = asymmetry (smirk/one brow); bl = blush; gaze = [x, y]
const BASE = { bi: 0, bm: 0, bo: 0, ul: 0.8, ll: 0.12, lt: 0, sm: 0.12, op: 0, wd: 1, pk: 0, ch: 0.1, teeth: 1, tg: 0, as: 0, bl: 0 };
export const EMOTIONS = {
  neutral: {},
  happy: { bi: 0.25, bo: 0.15, ul: 0.72, ll: 0.42, sm: 0.85, op: 0.12, ch: 0.85, bl: 0.15 },
  joy: { bi: 0.55, bm: 0.3, bo: 0.3, ul: 0.6, ll: 0.6, sm: 1, op: 0.7, wd: 1.12, ch: 1, tg: 1, bl: 0.3 },
  sad: { bi: 1, bm: 0.25, bo: -0.6, ul: 0.64, ll: 0.1, lt: -0.45, sm: -0.7, op: 0.04, wd: 0.82, ch: 0 },
  angry: { bi: -1, bm: -0.3, bo: 0.45, ul: 0.7, ll: 0.38, lt: 0.6, sm: -0.6, op: 0.4, wd: 1.15, teeth: 2, ch: 0.2 },
  surprised: { bi: 1, bm: 1, bo: 0.85, ul: 1, ll: 0, sm: 0, op: 1, wd: 0.85, pk: 0.4, ch: 0 },
  scared: { bi: 1, bm: 0.5, bo: 0.1, ul: 1, ll: 0.05, lt: -0.3, sm: -0.55, op: 0.45, wd: 1.2, teeth: 2, ch: 0 },
  disgust: { bi: -0.5, bm: -0.2, bo: 0.2, ul: 0.48, ll: 0.55, lt: 0.2, sm: -0.45, op: 0.16, wd: 0.95, teeth: 1, as: 0.7, ch: 0.5 },
  thinking: { bi: 0.15, bm: 0.1, bo: -0.15, ul: 0.62, ll: 0.25, sm: -0.08, op: 0, wd: 0.85, as: 0.6, gaze: [0.5, 0.6] },
  smug: { bi: -0.15, bo: 0.35, ul: 0.45, ll: 0.35, sm: 0.55, op: 0, wd: 1.05, as: 0.8, ch: 0.5 },
  worried: { bi: 0.95, bm: 0.25, bo: -0.35, ul: 0.82, ll: 0.12, lt: -0.35, sm: -0.35, op: 0.1, wd: 0.82, teeth: 1 },
  sick: { bi: 0.6, bo: -0.45, ul: 0.4, ll: 0.3, lt: -0.2, sm: -0.5, op: 0.08, wd: 0.9, as: 0.5 },
  proud: { bi: 0.1, bo: 0.2, ul: 0.55, ll: 0.38, sm: 0.7, op: 0, wd: 1.08, ch: 0.7 },
  menacing: { bi: -1, bm: -0.45, bo: 0.4, ul: 0.36, ll: 0.55, lt: 0.8, sm: -0.05, op: 0, wd: 0.8, as: 0.25, ch: 0.1 },
  determined: { bi: -0.35, bm: -0.1, bo: 0.1, ul: 0.7, ll: 0.3, lt: 0.2, sm: -0.05, op: 0, wd: 0.9 },
  calm: { bi: 0.05, ul: 0.68, ll: 0.25, sm: 0.25, ch: 0.3 },
  embarrassed: { bi: 0.55, bo: -0.15, ul: 0.5, ll: 0.3, lt: -0.15, sm: 0.35, op: 0, wd: 0.85, as: 0.35, bl: 1, gaze: [-0.4, -0.6] },
  // legacy names (v2 API)
  smile: { ul: 0.75, ll: 0.3, sm: 0.7, ch: 0.6 }, grin: 'joy', frown: 'sad', flat: { sm: 0, wd: 0.8 }, o: 'surprised',
};
const resolve = e => { let x = typeof e === 'string' ? EMOTIONS[e] : e; while (typeof x === 'string') x = EMOTIONS[x]; if (!x) throw new Error('unknown emotion ' + e); return { ...BASE, ...x }; };
/** Mix two emotions: k=0 → a, k=1 → b. */
export function blendEmotion(a, b, k) { const A = resolve(a), B = resolve(b), o = {}; for (const key in A) o[key] = key === 'gaze' ? null : lerp(A[key], B[key] ?? BASE[key], k); o.gaze = (k < 0.5 ? A : B).gaze; return o; }
/** Lip-sync: mouth openness 0..1 at time t from word timings [{start,end}] (align.py words.json). */
export function speech(t, words, { syllable = 0.12 } = {}) {
  const w = words.find(w => t >= w.start - 0.02 && t <= w.end + 0.02); if (!w) return 0;
  const k = (t - w.start) / syllable, env = Math.min(1, (t - w.start + 0.02) / 0.05, (w.end + 0.02 - t) / 0.05);
  return env * (0.3 + 0.55 * Math.abs(Math.sin(k * Math.PI)) * (0.75 + 0.25 * Math.sin(k * 2.3)));
}

// ---------------------------------------------------------------- textures
const _iris = {};
function eyeTexture(color) {
  if (_iris[color]) return _iris[color];
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#e9e6ea'); wg.addColorStop(0.5, '#fbfaf8'); wg.addColorStop(1, '#e4dfe0');
  g.fillStyle = wg; g.fillRect(0, 0, W, H);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.strokeStyle = 'rgba(200,90,90,0.12)'; g.lineWidth = 1.2;                 // faint veins toward the back
  for (let i = 0; i < 40; i++) { const y = rnd() * H, x = (W * 0.75 + rnd() * W * 0.3) % W; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y + 10, x + 60 * rnd(), y + 30 * (rnd() - 0.5)); g.stroke(); }
  const cx = W * 0.25, cy = H * 0.5, R = 0.62 * W / (2 * Math.PI), ry = 0.62 * H / Math.PI;   // iris angular radius 0.62 rad
  g.save(); g.translate(cx, cy); g.scale(1, ry / R);
  const col = new THREE.Color(color), dark = col.clone().multiplyScalar(0.35), light = col.clone().lerp(new THREE.Color('#ffffff'), 0.35);
  const ig = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
  ig.addColorStop(0, '#' + light.getHexString()); ig.addColorStop(0.55, '#' + col.getHexString()); ig.addColorStop(0.88, '#' + col.clone().multiplyScalar(0.7).getHexString()); ig.addColorStop(1, '#' + dark.getHexString());
  g.fillStyle = ig; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 140; i++) { const a = rnd() * Math.PI * 2, r0 = R * (0.35 + rnd() * 0.1), r1 = R * (0.7 + rnd() * 0.28);   // striations
    g.strokeStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.08 + rnd() * 0.12})` : `rgba(0,0,0,${0.08 + rnd() * 0.1})`; g.lineWidth = 1 + rnd() * 2;
    g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a + 0.05) * r1, Math.sin(a + 0.05) * r1); g.stroke(); }
  g.strokeStyle = '#' + dark.clone().multiplyScalar(0.6).getHexString(); g.lineWidth = R * 0.08; g.beginPath(); g.arc(0, 0, R * 0.97, 0, Math.PI * 2); g.stroke();  // limbal ring
  const pg = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.44); pg.addColorStop(0, '#050404'); pg.addColorStop(0.85, '#0b0807'); pg.addColorStop(1, 'rgba(10,8,7,0)');
  g.fillStyle = pg; g.beginPath(); g.arc(0, 0, R * 0.44, 0, Math.PI * 2); g.fill();
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (_iris[color] = t);
}

let _dot;
function softDot() {   // radial soft spot for blush
  if (_dot) return _dot; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (_dot = new THREE.CanvasTexture(c));
}

// ---------------------------------------------------------------- head sculpt
// radius of the head surface (in HR units) along unit direction n; params ch (cheek raise) and sm (smile) reshape the cheeks.
function sculpt(n, p, shape) {
  const g = (c, s) => Math.exp(-n.distanceToSquared(c) / (2 * s * s));
  const { jaw = 1, cranium = 1, nose = 1, cheeks = 1, chin = 1 } = shape;
  let r = 1 / Math.sqrt((n.x / 1.0) ** 2 + (n.y / (1.04 * cranium)) ** 2 + (n.z / 0.97) ** 2);
  if (n.y < 0) r *= 1 - 0.05 * (2 - jaw) * Math.min(1, -n.y / 0.9) * Math.abs(n.x) - 0.05 * Math.min(1, -n.y) * (1 - Math.abs(n.z));
  r += 0.05 * chin * g(N(0, -0.74, 0.67), 0.2);
  r += 0.15 * nose * g(N(0, -0.08, 1), 0.085) + 0.04 * nose * g(N(0, 0.06, 1), 0.06) + 0.03 * nose * g(N(0, -0.15, 1), 0.07);   // bulb + bridge + base
  for (const s of [-1, 1]) {
    r += (0.03 + 0.045 * p.ch) * cheeks * g(N(s * 0.48, -0.2 + 0.07 * p.ch, 0.85), 0.2);
    r += 0.022 * g(N(s * 0.33, 0.34, 0.88), 0.13);              // brow ridge
    r += 0.045 * g(N(s * 0.62, -0.4, 0.68), 0.22);              // full lower cheeks / jowl
    r -= 0.045 * g(N(s * 0.36, 0.1, 0.92), 0.12);               // eye socket
    r -= 0.012 * Math.max(0, p.sm) * g(N(s * 0.27, -0.42 + 0.06 * p.sm, 0.9), 0.06);   // smile dimples
  }
  return r;
}

// ---------------------------------------------------------------- character
export function makeToon({ acting = 0.6, hood = null, catchlights = true, skin = '#f1c4a0', shirt = '#7aa2e0', pants = '#5b6170', shoes = '#3a2a1e', hair = '#5a3a22', hairStyle = 'tuft',
  coat = null, tie = null, glasses = false, moustache = false, eye = '#5a3b20', headScale = 1, lips = null, brows = null, shape = {}, build = 1 } = {}) {
  const skinC = new THREE.Color(skin);
  const M = {
    skin: soft(skin, 'skin'), shirt: soft(shirt, 'fabric'), pants: soft(pants, 'fabric'), shoes: soft(shoes, 'plastic', { clearcoat: 0.7 }),
    hair: soft(hair, 'clay', { roughness: 0.55, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(hair).offsetHSL(0, 0, 0.3), clearcoat: 0.12, clearcoatRoughness: 0.4 }),
    coat: soft(coat || '#ffffff', 'fabric'), tie: soft(tie || '#a02828', 'fabric', { sheen: 0.5 }),
    eye: new THREE.MeshPhysicalMaterial({ map: eyeTexture(eye), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }),
    lid: soft(skin, 'skin'), lash: soft('#1e1410', 'plastic', { roughness: 0.6 }), brow: soft(brows || new THREE.Color(hair).multiplyScalar(0.8), 'clay', { roughness: 0.7 }),
    lip: soft(lips || skinC.clone().lerp(new THREE.Color('#b8404c'), 0.55), 'skin', { roughness: 0.34 }),
    mouth: new THREE.MeshStandardMaterial({ color: '#3a0f16', roughness: 0.9 }), teeth: soft('#fbf8f0', 'ceramic', { roughness: 0.25 }),
    tongue: soft('#d0606a', 'skin', { roughness: 0.4 }), black: soft('#1a1a1c', 'plastic'), sparkle: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95 }),
    blush: new THREE.MeshBasicMaterial({ color: '#ff5a6a', map: softDot(), transparent: true, opacity: 0, depthWrite: false }),
    inner: soft(skinC.clone().multiplyScalar(0.8), 'skin'),
  };
  M.mouth.polygonOffset = M.teeth.polygonOffset = M.tongue.polygonOffset = true;
  M.mouth.polygonOffsetFactor = -1; M.teeth.polygonOffsetFactor = M.tongue.polygonOffsetFactor = -2;
  const root = new THREE.Group(), J = {};
  const joint = (n, p, x, y, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); J[n] = g; return g; };
  const B = build;   // body width multiplier (0.85 slim .. 1.25 stocky)

  // ---- body (smooth lathe torso, rounded limbs)
  const pelvis = joint('pelvis', root, 0, 0.92);
  const hips = sph(0.175 * B, M.pants, 32, 20); hips.scale.set(1, 0.72, 0.8); hips.position.y = 0.02; pelvis.add(hips);
  const chest = joint('chest', pelvis, 0, 0.06);
  const torso = lathe([[0.001, -0.1], [0.165, -0.085], [0.2, 0.02], [0.205, 0.15], [0.215, 0.29], [0.205, 0.37], [0.16, 0.43], [0.075, 0.465], [0.001, 0.47]].map(([r, y]) => [r * B, y]), M.shirt);
  torso.scale.z = 0.8;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.168 * B, 0.022, 12, 48), M.pants); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.8; belt.position.y = -0.07; chest.add(belt); chest.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.018, 12, 32), M.shirt); collar.rotation.x = Math.PI / 2 - 0.15; collar.position.set(0, 0.455, 0.005); collar.castShadow = true; chest.add(collar);
  if (coat) {   // flared open coat (lathe), soft lapels, pockets
    const prof = [[0.17, 0.46], [0.212, 0.4], [0.225, 0.25], [0.235, 0.02], [0.26, -0.2], [0.29, -0.42]].map(([r, y]) => new THREE.Vector2(r * B, y));
    const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 64, Math.PI * 0.6, Math.PI * 1.8), M.coat);
    shell.material.side = THREE.DoubleSide; shell.scale.z = 0.8; shell.castShadow = shell.receiveShadow = true; chest.add(shell);
    for (const s of [-1, 1]) {
      const lap = tubeR([V(s * 0.06, 0.44, 0.14), V(s * 0.09, 0.34, 0.17), V(s * 0.12, 0.2, 0.18)], u => 0.012 + 0.012 * Math.sin(u * Math.PI), M.coat, { seg: 16 }); chest.add(lap);
      const pk = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.05, 6, 12), M.coat); pk.rotation.z = Math.PI / 2; pk.scale.z = 0.25; pk.position.set(s * 0.18, -0.12, 0.205); chest.add(pk);
    }
    const pen = cap(0.008, 0.08, soft('#1f4fa0', 'plastic')); pen.position.set(0.15, 0.27, 0.185); chest.add(pen);
  }
  if (tie) { const t = tubeR([V(0, 0.44, 0.14), V(0, 0.33, 0.155), V(0, 0.2, 0.16), V(0, 0.12, 0.158)], u => 0.012 + 0.03 * u, M.tie, { seg: 16, radial: 8 }); t.scale.z = 0.35; t.position.z = 0.1; chest.add(t); }
  const neck = joint('neck', chest, 0, 0.45); { const nk = cap(0.07, 0.04, M.skin); nk.position.y = 0.03; neck.add(nk); }
  const head = joint('head', neck, 0, 0.06);
  const HR = 0.215 * headScale, H = new THREE.Group(); H.position.y = HR * 0.8; head.add(H);

  // ---- sculpted head (deformed per expression: cheeks rise with smiles)
  const headGeo = new THREE.SphereGeometry(HR, 112, 84), base = headGeo.attributes.position.array.slice();
  const headMesh = new THREE.Mesh(headGeo, M.skin); headMesh.castShadow = headMesh.receiveShadow = true; H.add(headMesh);
  let lastKey = '';
  const n = new THREE.Vector3();
  function reshape(p) {
    const key = p.ch.toFixed(2) + p.sm.toFixed(2); if (key === lastKey) return; lastKey = key;
    const P = headGeo.attributes.position;
    for (let i = 0; i < P.count; i++) { n.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]).normalize(); const r = sculpt(n, p, shape) * HR; P.setXYZ(i, n.x * r, n.y * r, n.z * r); }
    P.needsUpdate = true; headGeo.computeVertexNormals();
  }
  // a point on the face surface at head-space (x, y), pushed out by `off`
  const surf = (x, y, p, off = 0) => { let z = HR; for (let k = 0; k < 4; k++) { n.set(x, y, z).normalize(); const r = sculpt(n, p, shape) * HR; z = Math.sqrt(Math.max(1e-6, r * r - x * x - y * y)); } return V(x, y, z + off); };
  const P0 = resolve('neutral'); reshape(P0);

  // ears
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * HR * 1.0, -HR * 0.05, -HR * 0.05); e.rotation.y = s * 0.3; H.add(e);
    const outer = sph(HR * 0.24, M.skin, 24, 16); outer.scale.set(0.45, 1, 0.72); e.add(outer);
    const inner = sph(HR * 0.12, M.inner, 16, 12); inner.scale.set(0.3, 0.8, 0.55); inner.position.set(s * HR * 0.04, 0, HR * 0.02); e.add(inner);
  }

  // ---- eyes
  const ER = HR * 0.205, eyes = [];
  for (const s of [-1, 1]) {
    const dir = N(s * 0.36, 0.1, 0.92), at = dir.clone().multiplyScalar(sculpt(dir, P0, shape) * HR - ER * 0.5);
    const g = new THREE.Group(); g.position.copy(at); g.rotation.y = s * 0.12; H.add(g);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(ER, 48, 32), M.eye); const ballG = new THREE.Group(); ballG.add(ball); g.add(ballG);
    // catchlights: fixed to the head, not the eyeball (that is how a key light reflects)
    const sp1 = new THREE.Mesh(new THREE.CircleGeometry(ER * 0.17, 20), M.sparkle); sp1.position.set(ER * 0.25, ER * 0.38, ER * 0.98); g.add(sp1);
    const sp2 = new THREE.Mesh(new THREE.CircleGeometry(ER * 0.07, 14), M.sparkle); sp2.position.set(-ER * 0.2, -ER * 0.25, ER * 1.0); g.add(sp2);
    // lids: hemispherical shells slightly larger than the eyeball, rotated about x to open/close
    const LR = ER * 1.07;
    const tiltU = new THREE.Group(); g.add(tiltU); const upper = new THREE.Group(); tiltU.add(upper);
    const uShell = new THREE.Mesh(new THREE.SphereGeometry(LR, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), M.lid); uShell.castShadow = true; upper.add(uShell);
    const lash = new THREE.Mesh(new THREE.TorusGeometry(LR, ER * 0.075, 10, 48, Math.PI * 1.1), M.lash); lash.rotation.set(Math.PI / 2, 0, -Math.PI * 0.05); upper.add(lash);
    const tiltL = new THREE.Group(); g.add(tiltL); const lower = new THREE.Group(); tiltL.add(lower);
    const lShell = new THREE.Mesh(new THREE.SphereGeometry(LR, 48, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.lid); lower.add(lShell);
    const lrim = new THREE.Mesh(new THREE.TorusGeometry(LR, ER * 0.05, 8, 48, Math.PI), M.lid); lrim.rotation.set(Math.PI / 2, 0, 0); lower.add(lrim);
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(HR * 0.42, HR * 0.3), M.blush);
    const bp = surf(s * HR * 0.5, -HR * 0.2, P0, HR * 0.02); bl.position.copy(bp); bl.lookAt(bp.clone().multiplyScalar(2)); H.add(bl);
    eyes.push({ s, g, ballG, upper, lower, tiltU, tiltL, sparkles: [sp1, sp2] });
  }

  // ---- brows, mouth (rebuilt when the expression changes)
  const dyn = new THREE.Group(); H.add(dyn);
  let browMeshes = [], mouthMeshes = [], lastFace = '';
  const clear = arr => { for (const m of arr) { dyn.remove(m); m.geometry.dispose(); } };
  function buildBrows(p) {
    clear(browMeshes); browMeshes = [];
    for (const s of [-1, 1]) {
      const a = 1 + p.as * (s > 0 ? 0.6 : -0.4);   // asymmetry: character's left brow higher
      const pts = [[0.15, 0.4 + 0.14 * p.bi * a + (p.lt > 0 ? -0.04 * p.lt : 0)], [0.27, 0.45 + 0.06 * p.bm * a + 0.035 * (p.bi + p.bo) * a],
        [0.4, 0.47 + 0.05 * p.bm * a + 0.045 * p.bo * a], [0.53, 0.42 + 0.08 * p.bo * a]].map(([x, y]) => surf(s * x * HR, y * HR, p, HR * 0.03));
      const m = tubeR(pts, u => HR * Math.max(0.008, 0.042 - 0.024 * u * u - (u < 0.1 ? (0.1 - u) * 0.1 : 0)), M.brow, { seg: 24, radial: 10 });
      dyn.add(m); browMeshes.push(m);
    }
  }
  let curve;
  function curveSet(p) {
    const w = HR * 0.23 * p.wd * (1 - 0.42 * p.pk), y0 = -HR * 0.43, op = clamp(p.op);
    const cornerL = HR * (0.085 * p.sm - 0.012 + 0.07 * p.as * (p.sm >= 0 ? 1 : -1)), cornerR = HR * (0.085 * p.sm - 0.012);
    const up = u => { const k = (u + 1) / 2; return y0 + lerp(cornerR, cornerL, k) * u * u + HR * op * 0.035 * (1 - u * u) + HR * 0.006 * Math.cos(u * Math.PI * 2) * (1 - u * u) * (1 - op); };
    const lo = u => { const open = HR * op * (0.3 + 0.06 * Math.max(0, p.sm) + 0.12 * p.pk) * Math.pow(1 - u * u, 0.75 - 0.25 * p.pk);
      return up(u) - open - HR * 0.024 * Math.pow(1 - u * u, 0.4); };
    return { w, up, lo, op };
  }
  function strip(top, bot, x0, x1, p, off, mat, nu = 20, nv = 6) {   // grid between two curves, wrapped onto the face surface
    const pos = [], idx = [];
    for (let i = 0; i <= nu; i++) { const u = lerp(x0, x1, i / nu); for (let j = 0; j <= nv; j++) { const y = lerp(top(u), bot(u), j / nv); const q = surf(u * curve.w, y, p, off); pos.push(q.x, q.y, q.z); } }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.material.side = THREE.DoubleSide; dyn.add(m); mouthMeshes.push(m); return m;
  }
  function buildMouth(p) {
    clear(mouthMeshes); mouthMeshes = [];
    curve = curveSet(p); const { up, lo, op } = curve;
    const LIP = HR * 0.012;
    strip(up, lo, -1, 1, p, LIP * 0.4, M.mouth, 24, 8);
    if (op > 0.03) {
      const gap = u => up(u) - lo(u);
      if (p.teeth >= 1) strip(u => up(u) - HR * 0.004, u => up(u) - Math.min(HR * 0.065, gap(u) * 0.45), -0.78, 0.78, p, LIP * 0.6, M.teeth, 20, 3);
      if (p.teeth >= 2) strip(u => lo(u) + Math.min(HR * 0.05, gap(u) * 0.35), u => lo(u) + HR * 0.004, -0.7, 0.7, p, LIP * 0.6, M.teeth, 20, 3);
      if (p.tg > 0 && op > 0.25) strip(u => lo(u) + Math.min(HR * 0.09, gap(u) * 0.45) * (1 - u * u * 0.6), u => lo(u) + HR * 0.003, -0.62, 0.62, p, LIP * 0.7, M.tongue, 16, 4);
    }
    // lips: one closed tube around the mouth; the lower lip is fuller
    const pts = [];
    for (let i = 0; i <= 14; i++) { const u = -1 + 2 * i / 14; pts.push(surf(u * curve.w, up(u), p, LIP)); }
    for (let i = 13; i >= 1; i--) { const u = -1 + 2 * i / 14; pts.push(surf(u * curve.w, lo(u), p, LIP)); }
    const lipM = tubeR(pts, u => { const lower = u > 0.5; const c = Math.sin(((lower ? u - 0.5 : u) * 2) * Math.PI); const o = 0.55 + 0.45 * clamp(p.op * 4); return HR * o * (lower ? 0.012 + 0.016 * c : 0.008 + 0.008 * c) * (1 - 0.3 * p.pk) + HR * 0.006 * p.pk; },
      M.lip, { seg: 96, radial: 10, closed: true });
    dyn.add(lipM); mouthMeshes.push(lipM);
    // corner creases when smiling/frowning
    for (const s of [-1, 1]) {
      const cy = s > 0 ? up(1) : up(-1), k = Math.abs(p.sm);
      if (k > 0.3) { const c0 = surf(s * curve.w * 1.08, cy + HR * 0.01 * Math.sign(p.sm), p, HR * 0.003), c1 = surf(s * curve.w * 1.2, cy + HR * 0.06 * Math.sign(p.sm), p, HR * 0.003);
        const cr = tubeR([c0, c0.clone().lerp(c1, 0.5).add(V(s * HR * 0.01, 0, 0)), c1], u => HR * Math.max(0.001, 0.009 * Math.sin(u * Math.PI) * k), M.inner, { seg: 12, radial: 6 }); dyn.add(cr); mouthMeshes.push(cr); }
    }
  }
  let cur = resolve('neutral'), blinkK = 0, gaze = [0, 0], gazeSet = false;
  function applyLids(p) {
    for (const e of eyes) {
      const uOpen = lerp(1.5, -1.25, clamp(p.ul)), lOpen = lerp(1.1, 0.3, clamp(p.ll));
      const closeU = lOpen + 0.04;
      e.upper.rotation.x = lerp(uOpen, Math.max(uOpen, closeU), clamp(blinkK));
      e.lower.rotation.x = lOpen;
      e.tiltU.rotation.z = e.s * p.lt * 0.42 + e.s * 0.04; e.tiltL.rotation.z = -e.s * p.lt * 0.12;
      const gx = gazeSet ? gaze[0] : (p.gaze ? p.gaze[0] : 0), gy = gazeSet ? gaze[1] : (p.gaze ? p.gaze[1] : 0);
      e.ballG.rotation.set(-gy * 0.38, gx * 0.5, 0);
      const vis = catchlights && blinkK < 0.6 && p.ul > 0.2; for (const sp of e.sparkles) sp.visible = vis;
    }
    M.blush.opacity = clamp(p.bl) * 0.7;
  }
  function setFace(p) {
    cur = p; reshape(p);
    const key = ['bi', 'bm', 'bo', 'lt', 'sm', 'op', 'wd', 'pk', 'ch', 'teeth', 'tg', 'as'].map(k => (+p[k]).toFixed(2)).join(',');
    if (key !== lastFace) { lastFace = key; buildBrows(p); buildMouth(p); }
    applyLids(p);
  }

  // ---- hair
  if (hairStyle !== 'none' && hairStyle !== 'bald') {
    const hg = new THREE.SphereGeometry(HR, 128, 96), hp = hg.attributes.position;
    const line = { tuft: 0.5, side: 0.46, bob: 0.42, curly: 0.45, bun: 0.5, long: 0.42, spiky: 0.52 }[hairStyle] ?? 0.48;
    const back = { bob: -0.45, long: -0.9, curly: -0.3 }[hairStyle] ?? -0.15;
    const edgeY = q => lerp(back, line + (hairStyle === 'side' ? -0.12 * q.x : 0) + 0.08 * Math.cos(q.x * 6) * 0.3, clamp(q.z * 1.4 + 0.25)) + (Math.abs(q.x) > 0.6 && q.z > -0.2 && q.z < 0.55 ? 0.12 : 0);
    const q = new THREE.Vector3(), sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
    for (let i = 0; i < hp.count; i++) {
      q.fromBufferAttribute(hp, i).normalize();
      const clump = hairStyle === 'curly' ? 0.08 * Math.abs(Math.sin(q.x * 14) * Math.sin(q.y * 14) * Math.sin(q.z * 14))
        : 0.03 * Math.sin(Math.atan2(q.z, q.x) * 11 + q.y * 5) * clamp(1.2 - q.y);
      const m = sm(-0.02, 0.1, q.y - edgeY(q));
      const r = sculpt(q, P0, shape) * HR * lerp(0.97, 1.06 + clump + 0.035 * clamp(q.y), m);
      hp.setXYZ(i, q.x * r, q.y * r, q.z * r);
    }
    hg.computeVertexNormals();
    const hm = new THREE.Mesh(hg, M.hair); hm.castShadow = true; H.add(hm);
    const lock = (pts, r) => { const m = tubeR(pts.map(([x, y, z]) => V(x * HR, y * HR, z * HR)), u => HR * (r * Math.pow(1 - u, 0.9) * Math.min(1, 0.6 + u * 3) + 0.004), M.hair, { seg: 32, radial: 14 }); H.add(m); return m; };
    if (hairStyle === 'tuft') { lock([[-0.2, 0.8, 0.5], [0.05, 1.05, 0.58], [0.25, 1.12, 0.5], [0.4, 1.02, 0.42]], 0.2); lock([[0.0, 0.85, 0.35], [0.2, 1.08, 0.3], [0.35, 1.18, 0.15]], 0.15); lock([[-0.3, 0.88, 0.2], [-0.2, 1.1, 0.25], [-0.05, 1.2, 0.2]], 0.13); }
    if (hairStyle === 'side') { lock([[-0.55, 0.75, 0.55], [-0.15, 0.98, 0.72], [0.3, 0.92, 0.7], [0.62, 0.62, 0.55]], 0.13); }
    if (hairStyle === 'spiky') for (let k = 0; k < 7; k++) { const a = -0.9 + k * 0.3; lock([[Math.sin(a) * 0.8, 0.75, Math.cos(a) * 0.6], [Math.sin(a) * 0.9, 1.25, Math.cos(a) * 0.4]], 0.14); }
    if (hairStyle === 'bun') { const b = sph(HR * 0.38, M.hair, 32, 24); b.position.set(0, HR * 1.05, -HR * 0.55); H.add(b); }
    if (hairStyle === 'bob' || hairStyle === 'long') { lock([[-0.6, 0.8, 0.6], [-0.1, 0.95, 0.8], [0.5, 0.85, 0.7], [0.8, 0.5, 0.5]], 0.15); }
  }
  if (hairStyle === 'bald') {   // fringe of hair around the back
    for (const s of [-1, 1]) { const m = tubeR([V(s * HR * 0.85, HR * 0.3, HR * 0.15), V(s * HR * 0.95, HR * 0.05, -HR * 0.35), V(s * HR * 0.6, HR * 0.0, -HR * 0.85), V(0, HR * 0.0, -HR * 1.02)].map(v => v.multiplyScalar(1.03)), u => HR * (0.11 * Math.sin(Math.min(1, u * 1.2 + 0.1) * Math.PI) ** 0.5 + 0.01), M.hair, { seg: 24 }); H.add(m); }
  }
  if (hood) {   // hooded silhouette: shell around the head, face opening at the front
    const hm = soft(hood, 'fabric'); const hg = new THREE.SphereGeometry(HR * 1.16, 96, 64), hp = hg.attributes.position, q = new THREE.Vector3(), keep = [];
    for (let i = 0; i < hp.count; i++) { q.fromBufferAttribute(hp, i).normalize(); const r = sculpt(q, P0, shape) * HR * 1.14 + HR * 0.06 * clamp(q.y + 0.3); hp.setXYZ(i, q.x * r, q.y * r, q.z * r);
      keep.push(!(q.z > 0.45 && Math.abs(q.x) < 0.62 && q.y < 0.5 && q.y > -0.75) && q.y > -0.95); }
    const ix = hg.index.array, kept = []; for (let i = 0; i < ix.length; i += 3) if (keep[ix[i]] && keep[ix[i + 1]] && keep[ix[i + 2]]) kept.push(ix[i], ix[i + 1], ix[i + 2]);
    hg.setIndex(kept); hg.computeVertexNormals(); const hd = new THREE.Mesh(hg, hm); hd.material.side = THREE.DoubleSide; hd.castShadow = true; H.add(hd);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.72, HR * 0.09, 12, 48), hm); rim.scale.set(0.95, 1.12, 0.5); rim.position.set(0, -HR * 0.08, HR * 0.86); H.add(rim);
  }
  if (glasses) {
    for (const e of eyes) { const r = new THREE.Mesh(new THREE.TorusGeometry(ER * 1.35, ER * 0.1, 12, 40), M.black); r.position.copy(e.g.position).add(V(0, 0, ER * 0.85)); H.add(r);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(ER * 1.3, 32), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1 })); lens.position.copy(r.position); H.add(lens);
      const arm = cap(ER * 0.08, HR * 0.8, M.black); arm.rotation.x = Math.PI / 2; arm.position.set(e.s * HR * 0.72, e.g.position.y + ER * 0.2, HR * 0.25); H.add(arm); }
    const y = eyes[0].g.position.y, z = eyes[0].g.position.z;
    const br = tubeR([V(-HR * 0.12, y + ER * 0.35, z + ER * 0.9), V(0, y + ER * 0.5, z + ER * 1.15), V(HR * 0.12, y + ER * 0.35, z + ER * 0.9)], ER * 0.1, M.black, { seg: 10 }); H.add(br);
  }
  if (moustache) { const m = tubeR([V(-HR * 0.28, -HR * 0.33, 0), V(-HR * 0.1, -HR * 0.27, 0), V(0, -HR * 0.29, 0), V(HR * 0.1, -HR * 0.27, 0), V(HR * 0.28, -HR * 0.33, 0)].map(v => surf(v.x, v.y, P0, HR * 0.035)),
    u => HR * (0.06 * Math.sin(u * Math.PI) ** 0.6 + 0.008), M.hair, { seg: 32 }); H.add(m); }

  // ---- arms with 4-finger cartoon hands; wrist = prop socket
  const fingers = {};
  for (const [s, n] of [[1, 'L'], [-1, 'R']]) {
    const sh = joint('shoulder' + n, chest, s * 0.19 * B, 0.36);
    const sleeve = coat ? M.coat : M.shirt;
    sh.add(sph(0.07, sleeve, 28, 20));
    sh.add(tubeR([V(0, 0, 0), V(0, -0.15, 0), V(0, -0.29, 0)], u => 0.068 - 0.01 * u, sleeve, { seg: 12, radial: 20 }));
    const el = joint('elbow' + n, sh, 0, -0.29);
    el.add(sph(0.058, sleeve, 24, 16));
    el.add(tubeR([V(0, 0, 0), V(0, -0.12, 0), V(0, -0.215, 0)], u => 0.058 - 0.012 * u, sleeve, { seg: 12, radial: 20 }));
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.014, 10, 24), sleeve); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.215; el.add(cuff);
    { const wrist = cap(0.036, 0.04, M.skin, 16); wrist.position.y = -0.24; el.add(wrist); }
    const wr = joint('wrist' + n, el, 0, -0.27);
    const palm = sph(0.058, M.skin, 28, 20); palm.scale.set(0.6, 1, 0.95); palm.position.y = -0.04; wr.add(palm);
    const F = [];
    for (const z of [0.03, 0, -0.03]) {
      const f1 = new THREE.Group(); f1.position.set(0, -0.085, z); wr.add(f1);
      const s1 = cap(0.021, 0.026, M.skin, 14); s1.position.y = -0.022; f1.add(s1);
      const f2 = new THREE.Group(); f2.position.y = -0.045; f1.add(f2);
      const s2 = cap(0.019, 0.02, M.skin, 14); s2.position.y = -0.016; f2.add(s2);
      F.push([f1, f2]);
    }
    const th = new THREE.Group(); th.position.set(0, -0.035, 0.045); th.rotation.set(0.7, 0, -s * 0.35); wr.add(th);
    const ts = cap(0.021, 0.032, M.skin, 14); ts.position.y = -0.025; th.add(ts);
    fingers[n] = { F, th, s };
    sh.rotation.z = s * 0.1;
    const hip = joint('hip' + n, pelvis, s * 0.09 * B, -0.02);
    hip.add(tubeR([V(0, 0.02, 0), V(0, -0.2, 0), V(0, -0.43, 0)], u => 0.105 - 0.028 * u, M.pants, { seg: 12, radial: 20 }));
    const kn = joint('knee' + n, hip, 0, -0.43);
    kn.add(sph(0.073, M.pants, 24, 16));
    kn.add(tubeR([V(0, 0, 0), V(0, -0.2, 0), V(0, -0.38, 0)], u => 0.073 - 0.008 * u + 0.012 * Math.max(0, u - 0.85) / 0.15, M.pants, { seg: 12, radial: 20 }));
    const shoe = sph(0.085, M.shoes, 32, 24); shoe.scale.set(0.95, 0.62, 1.55); shoe.position.set(0, -0.44, 0.06); kn.add(shoe);
    const sole = cap(0.072, 0.1, soft('#f4efe6', 'rubber')); sole.rotation.x = Math.PI / 2; sole.scale.set(1.15, 1.1, 0.25); sole.position.set(0, -0.477, 0.06); kn.add(sole);
  }

  const api = {
    group: root, joints: J, mats: M, head: H, HR, acting,
    /** set the expression: emotion name or params object; k blends from `from`; talk 0..1 opens the jaw (see speech()). */
    face(expr = 'neutral', { k = 1, talk = 0, from = 'neutral' } = {}) {
      const p = k >= 1 ? resolve(expr) : blendEmotion(from, expr, k);
      // acting intensity (lesson L035): normal people act subtly; villains/cartoon gags pass acting: 1
      for (const key of ['bi', 'bm', 'bo', 'ul', 'll', 'lt', 'sm', 'op', 'wd', 'pk', 'ch', 'as', 'bl']) p[key] = BASE[key] + (p[key] - BASE[key]) * api.acting;
      if (talk) { p.op = clamp(p.op + talk * (1 - p.op * 0.5)); p.teeth = Math.max(p.teeth, 1); }
      setFace(p); return api;
    },
    /** body language that matches the emotion (call after rest(), before reach()). */
    posture(expr = 'neutral', k = 1) {
      const P = { sad: [0.28, 0.12, -0.05], worried: [0.12, 0.05, 0], scared: [-0.12, -0.08, 0.06], surprised: [-0.15, -0.06, 0], angry: [0.08, 0.1, 0], happy: [-0.06, -0.03, 0], joy: [-0.12, -0.05, 0],
        proud: [-0.12, -0.08, 0], thinking: [0.05, 0, 0.12], embarrassed: [0.2, 0.06, 0.1], sick: [0.22, 0.15, -0.06], smug: [-0.08, 0, 0.12], disgust: [-0.06, 0, -0.15] }[expr] || [0, 0, 0];
      J.head.rotation.x += P[0] * k; J.chest.rotation.x += P[1] * k; J.head.rotation.z += P[2] * k;
      if (expr === 'sad' || expr === 'sick') { J.shoulderL.rotation.z -= 0.04 * k; J.shoulderR.rotation.z += 0.04 * k; }
      if (expr === 'proud' || expr === 'joy') { J.shoulderL.rotation.z += 0.08 * k; J.shoulderR.rotation.z -= 0.08 * k; }
      return api;
    },
    /** eye direction (-1..1); overrides the emotion's gaze until look(null) */
    look(x = 0, y = 0) { if (x === null) gazeSet = false; else { gaze = [x, y]; gazeSet = true; } applyLids(cur); return api; },
    blink(k) { blinkK = k; applyLids(cur); return api; },
    blush(a) { cur = { ...cur, bl: a }; applyLids(cur); return api; },
    /** curl fingers 0 (open) .. 1 (fist / grip a prop) */
    grip(side = 'R', k = 1) { const f = fingers[side]; for (const [a, b] of f.F) { a.rotation.z = -f.s * k * 1.1; b.rotation.z = -f.s * k * 1.3; } f.th.rotation.z = -f.s * (0.35 + k * 0.5); return api; },
    skinColor(c) { M.skin.color.set(c); M.lid.color.set(c); M.inner.color.set(new THREE.Color(c).multiplyScalar(0.8)); return api; },
    rest() { for (const k in J) J[k].rotation.set(0, 0, 0); J.shoulderL.rotation.z = 0.1; J.shoulderR.rotation.z = -0.1; J.elbowL.rotation.x = J.elbowR.rotation.x = -0.15; J.pelvis.position.y = 0.92; api.grip('L', 0.25); api.grip('R', 0.25); return api; },
    /** breathing, head drift, automatic blinks every ~3.7 s */
    idle(t, a = 1) {
      J.chest.rotation.x += 0.02 * Math.sin(t * 1.6) * a; J.head.rotation.y += 0.06 * Math.sin(t * 0.55) * a; J.head.rotation.x += 0.03 * Math.sin(t * 0.8) * a;
      const ph = (t + 1.3) % 3.7; api.blink(ph < 0.16 ? Math.sin(ph / 0.16 * Math.PI) : 0); return api;
    },
    /** walking cycle at phase t (call after rest) */
    walk(t, speed = 6, a = 1) { const s = Math.sin(t * speed); J.hipL.rotation.x = 0.45 * s * a; J.hipR.rotation.x = -0.45 * s * a; J.kneeL.rotation.x = 0.5 * Math.max(0, -s) * a; J.kneeR.rotation.x = 0.5 * Math.max(0, s) * a;
      J.shoulderL.rotation.x = -0.35 * s * a; J.shoulderR.rotation.x = 0.35 * s * a; J.pelvis.position.y = 0.92 + Math.abs(s) * 0.025; J.chest.rotation.y = 0.08 * s * a; return api; },
    /** distance-driven walk (lesson L005: no foot sliding): pass metres travelled so far; one step per `stride` metres */
    walkDist(dist, stride = 0.7, a = 1) { return api.walk(dist / stride * Math.PI, 1, a); },
    /** parent a prop to a hand socket ('L'|'R'); offset/rotation in the wrist frame */
    hold(obj, side = 'R', pos = [0, -0.08, 0.04], rot = [0, 0, 0]) { J['wrist' + side].add(obj); obj.position.set(...pos); obj.rotation.set(...rot); api.grip(side, 0.85); return obj; },
    /**
     * Two-bone IK: put the wrist (hand socket) at a WORLD point. pole = world direction the elbow should bend toward.
     * Use for every prop interaction: place the prop where it must be, then reach() its grip point.
     */
    reach(side, target, pole = null) {
      const sh = J['shoulder' + side], el = J['elbow' + side];
      root.updateMatrixWorld(true);
      // pole in the character's own frame (lesson L033: a world-space pole flipped elbows when characters turned)
      if (!pole) pole = new THREE.Vector3(side === 'R' ? -0.6 : 0.6, -1, -0.5).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
      const S = sh.getWorldPosition(new THREE.Vector3()), sc = root.getWorldScale(new THREE.Vector3()).x, a = 0.29 * sc, b = 0.27 * sc;
      const d = target.clone().sub(S); let L = d.length(); L = Math.min(Math.max(L, 0.05), a + b - 0.002);
      const dir = d.normalize(), x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
      const pn = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
      const E = S.clone().add(dir.clone().multiplyScalar(x)).add(pn.multiplyScalar(h)), T = S.clone().add(dir.clone().multiplyScalar(L));
      const down = new THREE.Vector3(0, -1, 0);
      const parentQ = sh.parent.getWorldQuaternion(new THREE.Quaternion());
      const qS = new THREE.Quaternion().setFromUnitVectors(down, E.clone().sub(S).normalize());
      sh.quaternion.copy(parentQ.clone().invert().multiply(qS));
      sh.updateMatrixWorld(true);
      const qE = new THREE.Quaternion().setFromUnitVectors(down, T.clone().sub(E).normalize());
      el.quaternion.copy(sh.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qE));
      root.updateMatrixWorld(true); return api;
    },
    mouthWorld() { root.updateMatrixWorld(true); return H.localToWorld(surf(0, -HR * 0.45, cur, 0)); },
    handWorld(side = 'R') { root.updateMatrixWorld(true); return J['wrist' + side].localToWorld(new THREE.Vector3(0, -0.06, 0)); },
    headWorld() { root.updateMatrixWorld(true); return H.localToWorld(new THREE.Vector3(0, 0, 0)); },
    eyeWorld() { root.updateMatrixWorld(true); return H.localToWorld(eyes[0].g.position.clone().lerp(eyes[1].g.position, 0.5)); },
  };
  api.rest(); api.face('neutral');
  return api;
}
