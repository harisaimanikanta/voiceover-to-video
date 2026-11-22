// Sets and props for "Caught by His Cousins' DNA" - polished rounded cartoon style (kit/look.js + kit/props.js).
import * as THREE from 'three';
import { soft, roundBox, lathe, tubeR, practical } from '/kit/look.js';
import { bookshelf, plant, deskLamp, desk, mug, pictureFrame, windowFrame, clock, rug, plankTexture, wallTexture, tree, bush, house, street, lab, flask } from '/kit/props.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const rng = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sph = (r, m) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m); s.castShadow = true; return s; };
const cyl = (r1, r2, h, m, seg = 24) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); c.castShadow = c.receiveShadow = true; return c; };

export function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const FONT = 'Inter, "DejaVu Sans", Arial, sans-serif';
/** cartoon portrait for photos on boards and in the family tree */
export function portrait({ skin = '#f1c4a0', hair = '#5a3a22', shirt = '#3f8fd2', bg = '#cfe6f5', sepia = false, unknown = false, style = 0 } = {}) {
  return tex(256, 320, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (unknown) { g.fillStyle = '#2a2a33'; g.beginPath(); g.arc(W / 2, 140, 62, 0, 7); g.fill(); g.beginPath(); g.ellipse(W / 2, 320, 110, 95, 0, 0, 7); g.fill();
      g.fillStyle = '#ffd24a'; g.font = `900 120px ${FONT}`; g.textAlign = 'center'; g.fillText('?', W / 2, 185); return; }
    g.fillStyle = shirt; g.beginPath(); g.ellipse(W / 2, 330, 115, 100, 0, 0, 7); g.fill();
    g.fillStyle = skin; g.beginPath(); g.arc(W / 2, 145, 70, 0, 7); g.fill();
    g.fillStyle = hair; g.beginPath(); if (style % 3 === 0) g.arc(W / 2, 120, 72, Math.PI * 1.05, Math.PI * 1.95); else if (style % 3 === 1) g.ellipse(W / 2, 110, 78, 50, 0, Math.PI, 0); else { g.arc(W / 2, 140, 78, Math.PI * 0.9, Math.PI * 2.1); } g.fill();
    g.fillStyle = '#2a1a10'; for (const s of [-1, 1]) { g.beginPath(); g.arc(W / 2 + s * 24, 150, 8, 0, 7); g.fill(); }
    g.strokeStyle = '#8a3a2a'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, 165, 26, 0.2, Math.PI - 0.2); g.stroke();
    if (sepia) { const d = g.getImageData(0, 0, W, H); for (let i = 0; i < d.data.length; i += 4) { const l = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]; d.data[i] = Math.min(255, l * 1.1 + 30); d.data[i + 1] = l * 0.92 + 18; d.data[i + 2] = l * 0.7; } g.putImageData(d, 0, 0); }
  });
}
function photoCard(t, w = 0.22, h = 0.27) {
  const g = new THREE.Group();
  g.add(roundBox(w + 0.03, h + 0.03, 0.006, soft('#fbf8f0', 'paper'), 0.003));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0, emissiveMap: t })); p.position.z = 0.004; g.add(p);
  g.userData.photo = p; return g;
}
const pin = (c = '#e03a3a') => { const g = new THREE.Group(); g.add(sph(0.014, soft(c, 'plastic'))); const n = cyl(0.002, 0.002, 0.02, soft('#cccccc', 'metal')); n.rotation.x = Math.PI / 2; n.position.z = -0.01; g.add(n); return g; };

// ---------------------------------------------------------------- host study (night)
export function hostSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const W = 6, D = 5, Hh = 3;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), soft('#ffffff', 'wood', { map: plankTexture('#9a6a46', { seed: 4 }) })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const wm = soft('#ffffff', 'clay', { map: wallTexture('#3f5a6e', { stripes: 'rgba(255,255,255,0.05)' }) });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), wm); back.position.set(0, Hh / 2, -D / 2); back.receiveShadow = true; g.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(D, Hh), wm); side.position.set(-W / 2, Hh / 2, 0); side.rotation.y = Math.PI / 2; side.receiveShadow = true; g.add(side);
  const trim = soft('#e8dcc8', 'plastic'); g.add(at(roundBox(W, 0.12, 0.04, trim, 0.015), 0, 0.06, -D / 2 + 0.02), at(roundBox(W, 0.06, 0.05, trim, 0.015), 0, 0.95, -D / 2 + 0.025));
  // night window with moon
  const win = windowFrame({ w: 1.0, h: 1.3, sky: ['#0d1838', '#2a3f78'], light: '#9fb8ff', intensity: 1.4 }); win.position.set(1.75, 1.7, -D / 2 + 0.01); g.add(win);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), new THREE.MeshBasicMaterial({ color: '#fff4d0' })); moon.position.set(1.95, 2.0, -D / 2 + 0.015); g.add(moon);
  // cold-case cork board
  const board = new THREE.Group(); board.position.set(-0.55, 1.65, -D / 2 + 0.03); g.add(board);
  board.add(roundBox(1.7, 1.15, 0.05, soft('#6a4a30', 'wood'), 0.02));
  const cork = tex(512, 340, (c, w, h) => { c.fillStyle = '#c8975e'; c.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 4000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(120,70,30,0.25)' : 'rgba(255,220,170,0.2)'; c.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); } });
  const cp = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 1.03), soft('#ffffff', 'clay', { map: cork })); cp.position.z = 0.027; board.add(cp);
  const title = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.13), new THREE.MeshStandardMaterial({ map: tex(512, 108, (c, w, h) => { c.fillStyle = '#fbf3df'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3261e'; c.font = `900 76px ${FONT}`; c.textAlign = 'center'; c.fillText('COLD CASE', w / 2, 82); }), roughness: 0.7 }));
  title.position.set(0, 0.43, 0.035); title.rotation.z = -0.02; board.add(title);
  const sketch = photoCard(tex(256, 320, (c, w, h) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2a2a'; c.lineWidth = 5; c.fillStyle = '#3a3a44';
    c.beginPath(); c.ellipse(w / 2, 150, 72, 92, 0, 0, 7); c.fill(); c.fillStyle = '#f4efe2'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * 28, 140, 16, 10, 0, 0, 7); c.fill(); }
    c.fillStyle = '#2a2a2a'; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * 28, 140, 6, 0, 7); c.fill(); } c.font = `800 26px ${FONT}`; c.textAlign = 'center'; c.fillText('UNKNOWN', w / 2, 295); }), 0.3, 0.37);
  sketch.position.set(-0.45, 0.02, 0.035); sketch.rotation.z = 0.04; board.add(sketch);
  const caMap = photoCard(tex(256, 200, (c, w, h) => { c.fillStyle = '#e8eef0'; c.fillRect(0, 0, w, h); c.fillStyle = '#9cc28a'; c.beginPath(); const P = [[60, 10], [120, 10], [120, 70], [210, 150], [200, 190], [150, 190], [80, 120], [50, 60]]; P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.fill(); c.fillStyle = '#e03a3a'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(80 + i * 12, 60 + i * 13, 5, 0, 7); c.fill(); } }), 0.3, 0.23);
  caMap.position.set(0.05, 0.22, 0.035); caMap.rotation.z = -0.05; board.add(caMap);
  const cousins = [];
  const looks = [['#f1c4a0', '#7a4a22', '#e85d4a'], ['#c98f6a', '#2a1a12', '#5fb36b'], ['#f3d1b5', '#d8a040', '#7a5cc8'], ['#8a5a3c', '#1a1008', '#f2a541']];
  looks.forEach(([skin, hair, shirt], i) => { const p = photoCard(portrait({ skin, hair, shirt, style: i, bg: ['#ffe2c0', '#d8f0d8', '#e6dcff', '#fff0b8'][i] }), 0.16, 0.2);
    p.position.set(0.38 + (i % 2) * 0.22, 0.2 - Math.floor(i / 2) * 0.28, 0.035); p.rotation.z = (i - 1.5) * 0.06; board.add(p); cousins.push(p); });
  const note = photoCard(tex(200, 140, (c, w, h) => { c.fillStyle = '#fff38a'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a3a3a'; c.font = `700 30px ${FONT}`; c.fillText('1976-86', 20, 60); c.fillText('DNA?', 20, 110); }), 0.18, 0.13);
  note.position.set(0.0, -0.3, 0.035); note.rotation.z = 0.08; board.add(note);
  const pins = [[-0.45, 0.18], [0.05, 0.32], [0.38, 0.3], [0.6, 0.3], [0.38, 0.02], [0.6, 0.02], [0.0, -0.25]];
  pins.forEach(([x, y]) => { const p = pin(); p.position.set(x, y, 0.05); board.add(p); });
  const str = soft('#d81e1e', 'fabric', { roughness: 0.6 });
  for (const [a, b] of [[0, 1], [1, 2], [1, 4], [0, 6], [2, 3], [4, 5]]) board.add(tubeR([V(pins[a][0], pins[a][1], 0.05), V((pins[a][0] + pins[b][0]) / 2, (pins[a][1] + pins[b][1]) / 2 - 0.03, 0.052), V(pins[b][0], pins[b][1], 0.05)], 0.004, str, { seg: 8, radial: 5 }));
  // furniture
  const sh = bookshelf({ seed: 7, color: '#6a4a34' }); sh.position.set(-2.35, 0, -D / 2 + 0.2); g.add(sh);
  const dk = desk({ w: 1.3, color: '#8a5a3c' }); dk.position.set(1.55, 0, -D / 2 + 0.55); g.add(dk);
  const lamp = deskLamp({ color: '#2fb8b0', intensity: 2.2 }); lamp.position.set(2.0, 0.785, -D / 2 + 0.45); lamp.rotation.y = -2.3; g.add(lamp);
  const mg = mug('#f2a541'); mg.position.set(1.1, 0.785, -D / 2 + 0.6); g.add(mg);
  for (let i = 0; i < 4; i++) { const f = roundBox(0.24, 0.035, 0.31, soft(['#e8c070', '#c8d8e8', '#f0e0c0', '#e0b0a0'][i], 'paper'), 0.006); f.position.set(1.45 + i * 0.02, 0.8 + i * 0.035, -D / 2 + 0.6); f.rotation.y = (i - 1.5) * 0.12; g.add(f); }
  g.add(at(rug(1.1, ['#7a3b2e', '#d9a441', '#2f5d62', '#efe3c8']), 0.1, 0, -0.3));
  const p1 = plant({ h: 1.0, seed: 9 }); p1.position.set(-2.55, 0, 0.4); g.add(p1);
  const ck = clock('#d9643f'); ck.position.set(-0.55, 2.55, -D / 2 + 0.03); g.add(ck);
  const arm = new THREE.Group(); arm.position.set(0.9, 0, 1.0); g.add(arm);          // foreground armchair
  arm.add(at(roundBox(0.85, 0.42, 0.8, soft('#b8503c', 'fabric'), 0.12), 0, 0.3, 0), at(roundBox(0.85, 0.6, 0.18, soft('#b8503c', 'fabric'), 0.09), 0, 0.7, -0.33));
  for (const s of [-1, 1]) arm.add(at(roundBox(0.16, 0.3, 0.8, soft('#a84632', 'fabric'), 0.07), s * 0.38, 0.58, 0));
  arm.rotation.y = -0.5;
  // DNA kit (Dan picks it up)
  const kit = new THREE.Group();
  const kitTex = tex(256, 384, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2fb8b0'); gr.addColorStop(1, '#1f6f9a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; for (let i = 0; i < 2; i++) { c.beginPath(); for (let y = 40; y <= 230; y += 4) { const x = w / 2 + Math.sin(y * 0.05 + i * Math.PI) * 50; y === 40 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
    c.lineWidth = 4; for (let y = 50; y < 230; y += 18) { c.beginPath(); c.moveTo(w / 2 + Math.sin(y * 0.05) * 50, y); c.lineTo(w / 2 - Math.sin(y * 0.05) * 50, y); c.stroke(); }
    c.fillStyle = '#ffffff'; c.font = `900 64px ${FONT}`; c.textAlign = 'center'; c.fillText('DNA', w / 2, 305); c.font = `700 30px ${FONT}`; c.fillText('ANCESTRY KIT', w / 2, 345); });
  const kb = roundBox(0.14, 0.21, 0.06, soft('#2fb8b0', 'plastic'), 0.012); kit.add(kb);
  const kf = new THREE.Mesh(new THREE.PlaneGeometry(0.125, 0.19), new THREE.MeshStandardMaterial({ map: kitTex, roughness: 0.45, emissive: '#ffffff', emissiveMap: kitTex, emissiveIntensity: 0.15 })); kf.position.z = 0.031; kit.add(kf);
  kit.position.set(1.25, 0.785 + 0.105, -D / 2 + 0.75); g.add(kit);
  return { group: g, board, cousins, kit, sketch, desk: dk };
}

// ---------------------------------------------------------------- retro car / van / police car
export function car({ color = '#d0563c', police = false, van = false } = {}) {
  const g = new THREE.Group(), body = soft(police ? '#f4f4f4' : color, 'plastic', { clearcoat: 0.8 }), dark = soft('#1d2230', 'rubber'), glass = soft('#9fc8e8', 'plastic', { roughness: 0.1, clearcoat: 1 });
  const L = van ? 4.4 : 4.2, h = van ? 1.0 : 0.55;
  g.add(at(roundBox(1.8, h, L, body, 0.18), 0, 0.35 + h / 2, 0));
  if (police) { g.add(at(roundBox(1.82, 0.3, 2.0, soft('#1d2a4a', 'plastic', { clearcoat: 0.8 }), 0.1), 0, 0.55, 0)); }
  const cab = roundBox(1.6, van ? 0.75 : 0.55, van ? 3.0 : 2.1, glass, 0.2); cab.position.set(0, 0.35 + h + (van ? 0.35 : 0.24), van ? 0.4 : -0.2); g.add(cab);
  g.add(at(roundBox(1.62, 0.08, van ? 3.02 : 2.12, body, 0.04), 0, 0.35 + h + (van ? 0.72 : 0.5), van ? 0.4 : -0.2));
  for (const x of [-1, 1]) for (const z of [-1, 1]) { const w = cyl(0.34, 0.34, 0.26, dark, 28); w.rotation.z = Math.PI / 2; w.position.set(x * 0.86, 0.34, z * L * 0.32); g.add(w);
    const hub = cyl(0.17, 0.17, 0.27, soft('#d8d8d8', 'metal'), 20); hub.rotation.z = Math.PI / 2; hub.position.copy(w.position); g.add(hub); }
  for (const x of [-1, 1]) { g.add(at(sph(0.11, soft('#fff6d8', 'ceramic', { emissive: '#fff2c0', emissiveIntensity: 0.6 })), x * 0.62, 0.65, L / 2 - 0.02)); g.add(at(sph(0.08, soft('#ff4040', 'ceramic', { emissive: '#ff2020', emissiveIntensity: 0.5 })), x * 0.68, 0.65, -L / 2 + 0.02)); }
  g.add(at(roundBox(1.85, 0.12, 0.14, soft('#d8d8d8', 'metal'), 0.05), 0, 0.42, L / 2), at(roundBox(1.85, 0.12, 0.14, soft('#d8d8d8', 'metal'), 0.05), 0, 0.42, -L / 2));
  const handle = roundBox(0.03, 0.04, 0.16, soft('#d8d8d8', 'metal'), 0.012); handle.position.set(0.91, 0.82, 0.25); g.add(handle);
  let lights = null;
  if (police) { const bar = new THREE.Group(); bar.position.set(0, 0.35 + h + 0.58, -0.2); g.add(bar);
    const red = soft('#ff2a2a', 'plastic', { emissive: '#ff2020', emissiveIntensity: 1 }), blue = soft('#2a6aff', 'plastic', { emissive: '#2050ff', emissiveIntensity: 1 });
    bar.add(at(roundBox(0.5, 0.12, 0.22, red, 0.05), -0.3, 0, 0), at(roundBox(0.5, 0.12, 0.22, blue, 0.05), 0.3, 0, 0));
    const lr = new THREE.PointLight('#ff2a2a', 6, 9, 1.5), lb = new THREE.PointLight('#3a6aff', 6, 9, 1.5); lr.position.set(-0.4, 0.3, 0); lb.position.set(0.4, 0.3, 0); bar.add(lr, lb); lights = { lr, lb, red, blue }; }
  g.userData = { handle, lights }; return g;
}
const streetLamp = (h = 4) => { const g = new THREE.Group(); const m = soft('#2a3040', 'metal'); g.add(tubeR([V(0, 0, 0), V(0, h * 0.9, 0), V(0.35, h, 0), V(0.6, h * 0.97, 0)], 0.06, m, { seg: 16 }));
  const shade = lathe([[0.001, 0.12], [0.06, 0.12], [0.22, 0], [0.001, 0]], m); shade.position.set(0.62, h * 0.94, 0); g.add(shade);
  const b = practical('#ffcf8a', 7, 9, { radius: 0.09 }); b.position.set(0.62, h * 0.92, 0); g.add(b); return g; };

// ---------------------------------------------------------------- 1970s night street
export function street70s(scene) {
  const s = street(scene, { seed: 11, length: 30 });
  for (const o of [...s.group.children]) if (o.position.x > 4 && Math.abs(o.position.z) < 5) s.group.remove(o);   // room for the hero house
  const hero = house({ w: 3.4, h: 2.8, d: 3.4, wall: '#c8b8e8', roof: '#5a4a7a' }); hero.position.set(7.2, 0, 0); hero.rotation.y = -Math.PI / 2; scene.add(hero);
  const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ color: '#0a0e1c' })); winGlow.position.set(5.48, 1.68, -1.02); winGlow.rotation.y = -Math.PI / 2; scene.add(winGlow);
  const lamps = []; for (const z of [-14, -4, 6, 16]) { const l = streetLamp(); l.position.set(z === 6 ? -2.6 : 2.4, 0, z); if (z === 6) l.rotation.y = Math.PI; scene.add(l); lamps.push(l); }
  const c1 = car({ color: '#d98b3a' }); c1.position.set(1.0, 0, 9); scene.add(c1);
  const c2 = car({ color: '#4f8a6a' }); c2.position.set(-1.1, 0, -6); c2.rotation.y = Math.PI; scene.add(c2);
  const fence = new THREE.Group(); scene.add(fence);
  for (let z = -10; z < 12; z += 0.35) if (z < -1.8 || z > -0.2) fence.add(at(roundBox(0.08, 0.8, 0.12, soft('#e8e0d0', 'wood'), 0.02), 3.75, 0.4, z));
  for (const [z0, z1] of [[-10, -1.8], [-0.2, 12]]) fence.add(at(roundBox(0.06, 0.08, z1 - z0, soft('#e8e0d0', 'wood'), 0.02), 3.75, 0.6, (z0 + z1) / 2));
  for (const [x, z] of [[4.4, 3.5], [4.6, 6.5], [4.3, -2.5]]) { const b = bush({ s: 0.7, seed: x * 10 + z }); b.position.set(x, 0, z); scene.add(b); }
  return { hero };
}

// ---------------------------------------------------------------- bedroom (night)
export function tambourine() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 12, 40), soft('#c8763a', 'wood')); g.add(rim);
  const skin = cyl(0.112, 0.112, 0.006, soft('#d99a50', 'paper', { map: tex(128, 128, (c, w) => { c.fillStyle = '#e8b070'; c.fillRect(0, 0, w, w); c.strokeStyle = '#c0392b'; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, w / 2, 40, 0, 7); c.stroke(); c.fillStyle = '#2f5d62'; c.beginPath(); c.arc(w / 2, w / 2, 16, 0, 7); c.fill(); }) }), 40); skin.rotation.x = Math.PI / 2; g.add(skin);
  const jingles = []; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const j = cyl(0.025, 0.025, 0.008, soft('#e8d070', 'metal'), 16); j.rotation.x = Math.PI / 2; j.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0); g.add(j); jingles.push(j); }
  const ribbon = tubeR([V(0, 0.13, 0), V(0.01, 0.2, 0), V(0, 0.26, 0)], 0.006, soft('#d81e1e', 'fabric'), { seg: 8 }); g.add(ribbon);
  g.userData.jingles = jingles; return g;
}
export function bedroom(scene) {
  const g = new THREE.Group(); scene.add(g); const W = 5, D = 4.5, H = 2.8;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), soft('#ffffff', 'wood', { map: plankTexture('#8a6448', { seed: 6 }) })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const wm = soft('#ffffff', 'clay', { map: wallTexture('#6a7fa8', { stripes: 'rgba(255,255,255,0.07)' }) });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wm); back.position.set(0, H / 2, -D / 2); back.receiveShadow = true; g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wm); left.position.set(-W / 2, H / 2, 0); left.rotation.y = Math.PI / 2; left.receiveShadow = true; g.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wm); right.position.set(W / 2, H / 2, 0); right.rotation.y = -Math.PI / 2; right.receiveShadow = true; g.add(right);
  // door (right wall) with tambourine on the knob
  const door = new THREE.Group(); door.position.set(W / 2 - 0.03, 0, -0.6); door.rotation.y = -Math.PI / 2; g.add(door);
  door.add(at(roundBox(0.95, 2.05, 0.06, soft('#e8dcc4', 'wood'), 0.02), 0, 1.03, 0));
  for (const [x, y] of [[-0.22, 1.5], [0.22, 1.5], [-0.22, 0.6], [0.22, 0.6]]) door.add(at(roundBox(0.34, 0.6, 0.02, soft('#dccfb4', 'wood'), 0.01), x, y, 0.035));
  const knob = sph(0.04, soft('#e8c060', 'metal')); knob.position.set(0.36, 1.0, 0.07); door.add(knob);
  const tam = tambourine(); tam.position.set(0.36, 0.78, 0.09); door.add(tam);
  const tie = tubeR([V(0.36, 1.0, 0.08), V(0.37, 0.92, 0.09), V(0.36, 0.86, 0.09)], 0.006, soft('#d81e1e', 'fabric'), { seg: 8 }); door.add(tie);
  // window with moonlight
  const win = windowFrame({ w: 0.9, h: 1.1, sky: ['#0b1430', '#263a70'], light: '#8fb0ff', intensity: 2.6 });
  const doorLight = new THREE.PointLight('#9fb8ff', 2.0, 3, 1.6); doorLight.position.set(1.6, 1.6, 0.2); g.add(doorLight); win.position.set(-0.9, 1.6, -D / 2 + 0.01); g.add(win);
  // bed
  const bed = new THREE.Group(); bed.position.set(-0.3, 0, -0.9); g.add(bed);
  bed.add(at(roundBox(1.7, 0.35, 2.1, soft('#7a5038', 'wood'), 0.06), 0, 0.2, 0), at(roundBox(1.7, 1.0, 0.1, soft('#7a5038', 'wood'), 0.05), 0, 0.55, -1.05));
  bed.add(at(roundBox(1.6, 0.2, 2.0, soft('#f4efe6', 'fabric'), 0.08), 0, 0.46, 0));
  for (const x of [-0.4, 0.4]) bed.add(at(roundBox(0.6, 0.15, 0.36, soft('#ffffff', 'fabric'), 0.07), x, 0.62, -0.78));
  const blanket = roundBox(1.66, 0.32, 1.5, soft('#d9643f', 'fabric'), 0.14); blanket.position.set(0, 0.7, 0.3); bed.add(blanket);
  // nightstands + lamp
  for (const x of [-1.5, 0.9]) { const n = roundBox(0.5, 0.55, 0.45, soft('#8a5a3c', 'wood'), 0.04); n.position.set(x - 0.3, 0.275, -1.7); g.add(n); }
  const lampG = new THREE.Group(); lampG.position.set(0.6, 0.55, -1.7); g.add(lampG);
  lampG.add(lathe([[0.001, 0], [0.08, 0], [0.04, 0.05], [0.02, 0.25], [0.001, 0.25]], soft('#e8c070', 'ceramic')));
  const shade = lathe([[0.16, 0.22], [0.1, 0.42], [0.001, 0.42]], soft('#fff0d0', 'fabric', { side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0.6 })); lampG.add(shade);
  const bulb = new THREE.PointLight('#ffc070', 4.5, 6, 1.6); bulb.position.y = 0.3; lampG.add(bulb);
  const clockR = clock('#4a6fa5'); clockR.position.set(1.0, 1.9, -D / 2 + 0.03); g.add(clockR);
  const ward = new THREE.Group(); ward.position.set(1.95, 0, -1.7); ward.rotation.y = -0.6; g.add(ward);
  ward.add(at(roundBox(0.85, 2.0, 0.55, soft('#c8763a', 'wood'), 0.04), 0, 1.0, 0));
  for (const x of [-0.21, 0.21]) { ward.add(at(roundBox(0.38, 1.7, 0.03, soft('#d9894a', 'wood'), 0.02), x, 1.05, 0.28)); ward.add(at(sph(0.025, soft('#e8c060', 'metal')), x * 0.2, 1.05, 0.31)); }
  const wp = plant({ h: 0.5, seed: 33 }); wp.position.set(0.1, 2.0, 0); wp.scale.setScalar(0.7); ward.add(wp);
  const coat = tubeR([V(0.3, 1.75, 0.33), V(0.34, 1.3, 0.38), V(0.3, 0.95, 0.36)], u => 0.04 + 0.08 * u, soft('#2f5d62', 'fabric'), { seg: 12 }); ward.add(coat);
  const pic2 = pictureFrame({ w: 0.35, h: 0.45, seed: 61 }); pic2.position.set(1.4, 1.7, -D / 2 + 0.03); g.add(pic2);
  g.add(at(rug(0.9, ['#2f5d62', '#efe3c8', '#d9a441']), 0.9, 0, 0.6));
  const p = plant({ h: 0.8, seed: 21 }); p.position.set(-2.1, 0, 0.6); g.add(p);
  const f = pictureFrame({ seed: 31 }); f.position.set(-W / 2 + 0.03, 1.7, 0.4); f.rotation.y = Math.PI / 2; g.add(f);
  return { bed, tam, door, bulb, shade };
}
export function bat() { const g = new THREE.Group(); g.add(lathe([[0.001, 0], [0.022, 0], [0.018, 0.02], [0.016, 0.3], [0.035, 0.6], [0.04, 0.78], [0.03, 0.82], [0.001, 0.82]], soft('#d8a868', 'wood'))); return g; }

// ---------------------------------------------------------------- 1980s cold-case office
export function caseOffice(scene) {
  const g = new THREE.Group(); scene.add(g); const W = 6, D = 5, H = 3;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), soft('#ffffff', 'plastic', { map: tex(256, 256, (c, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#8a7a68' : '#a89880'; c.fillRect(i * w / 8, j * w / 8, w / 8, w / 8); } }) })); fl.material.map.wrapS = fl.material.map.wrapT = THREE.RepeatWrapping; fl.material.map.repeat.set(3, 3);
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const wm = soft('#ffffff', 'clay', { map: wallTexture('#a8b89a') });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wm); back.position.set(0, H / 2, -D / 2); back.receiveShadow = true; g.add(back);
  // big California map with pins
  const map = new THREE.Group(); map.position.set(-0.8, 1.65, -D / 2 + 0.03); g.add(map);
  map.add(roundBox(1.5, 1.6, 0.04, soft('#5a4030', 'wood'), 0.02));
  const CA = [[0.2, 0.02], [0.52, 0.02], [0.52, 0.36], [0.92, 0.72], [0.9, 0.96], [0.7, 0.98], [0.62, 0.88], [0.4, 0.74], [0.3, 0.52], [0.16, 0.3], [0.12, 0.12]];
  const mapTex = tex(512, 560, (c, w, h) => { c.fillStyle = '#d8e8ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2e8c8'; c.strokeStyle = '#6a5a40'; c.lineWidth = 6;
    c.beginPath(); CA.forEach(([x, y], i) => (i ? c.lineTo : c.moveTo).call(c, x * w, y * h)); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1f3a5a'; c.font = `900 44px ${FONT}`; c.fillText('CALIFORNIA', 30, h - 26); c.strokeStyle = 'rgba(80,110,130,0.25)'; c.lineWidth = 2; for (let i = 0; i < w; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } });
  const mp = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.48), soft('#ffffff', 'paper', { map: mapTex })); mp.position.z = 0.022; map.add(mp);
  const pinsP = [[0.3, 0.2], [0.33, 0.26], [0.38, 0.3], [0.42, 0.24], [0.36, 0.36], [0.45, 0.42], [0.4, 0.48], [0.62, 0.8], [0.66, 0.84], [0.7, 0.88], [0.58, 0.76], [0.48, 0.55], [0.44, 0.33]];
  const pins13 = pinsP.map(([x, y]) => { const p = pin('#e02020'); p.position.set((x - 0.5) * 1.36, (0.5 - y) * 1.48, 0.04); p.scale.setScalar(0.001); map.add(p); return p; });
  // calendar
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ roughness: 0.8 })); cal.position.set(0.55, 1.95, -D / 2 + 0.02); g.add(cal);
  const calTex = {}; const setYear = y => { if (!calTex[y]) calTex[y] = tex(256, 340, (c, w, h) => { c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0392b'; c.fillRect(0, 0, w, 90); c.fillStyle = '#ffffff'; c.font = `900 64px ${FONT}`; c.textAlign = 'center'; c.fillText(String(y), w / 2, 70);
    c.fillStyle = '#6a6a6a'; c.font = `600 22px ${FONT}`; for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) if (r * 7 + k < 31) c.fillText(String(r * 7 + k + 1).padStart(2, ' '), 26 + k * 34, 140 + r * 42); }); if (cal.material.map !== calTex[y]) { cal.material.map = calTex[y]; cal.material.needsUpdate = true; } };
  setYear(1976);
  // desk, evidence bag, lamp, files, detective chair
  const dk = desk({ w: 1.5, color: '#6a5040' }); dk.position.set(0.9, 0, -0.9); g.add(dk);
  const lampD = deskLamp({ color: '#3a6a4a', intensity: 0 }); lampD.position.set(1.45, 0.785, -1.05); lampD.rotation.y = -2.6; g.add(lampD);
  const bag = new THREE.Group(); bag.position.set(0.4, 0.79, -0.72); g.add(bag);
  const bagMesh = roundBox(0.22, 0.01, 0.3, soft('#eaf2f8', 'plastic', { transparent: true, opacity: 0.6, roughness: 0.15, clearcoat: 1 }), 0.004); bag.add(bagMesh);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.06), soft('#d81e1e', 'plastic')); stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.007, -0.12); bag.add(stripe);
  const swab = new THREE.Group(); swab.add(at(cyl(0.004, 0.004, 0.15, soft('#f4f4f4', 'plastic'), 8), 0, 0, 0)); const bud = sph(0.012, soft('#ffffff', 'fabric')); bud.scale.set(1, 1.6, 1); bud.position.y = 0.08; swab.add(bud);
  swab.rotation.set(Math.PI / 2, 0, 0.5); swab.position.set(0, 0.012, 0.02); bag.add(swab);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), soft('#ffffff', 'paper', { map: tex(200, 120, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; c.font = `800 34px ${FONT}`; c.fillText('EVIDENCE', 12, 50); c.font = `600 26px ${FONT}`; c.fillText('#1979-0412', 12, 96); }) })); tag.rotation.x = -Math.PI / 2; tag.position.set(0.05, 0.008, 0.1); bag.add(tag);
  for (let i = 0; i < 5; i++) { const f = roundBox(0.25, 0.03, 0.32, soft(['#e8c070', '#d8c8a8', '#e0b070'][i % 3], 'paper'), 0.006); f.position.set(0.35 + i * 0.01, 0.8 + i * 0.03, -1.0); f.rotation.y = i * 0.07; g.add(f); }
  const cab = filingCabinet({}); cab.position.set(2.4, 0, -D / 2 + 0.35); g.add(cab);
  const cut = new THREE.Group(); cut.position.set(-1.15, 0, -1.0); g.add(cut);            // cardboard cutout of the masked man
  const cutTex = tex(256, 512, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); c.fillStyle = '#1d2230'; c.beginPath(); c.ellipse(w / 2, 90, 60, 75, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(40, 190); c.quadraticCurveTo(w / 2, 140, w - 40, 190); c.lineTo(w - 20, h); c.lineTo(20, h); c.fill();
    c.fillStyle = '#f4efe2'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * 24, 85, 14, 9, 0, 0, 7); c.fill(); } });
  const cutM = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.7), new THREE.MeshStandardMaterial({ map: cutTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 })); cutM.position.y = 0.85; cutM.castShadow = true; cut.add(cutM);
  const plantO = plant({ h: 0.9, seed: 41 }); plantO.position.set(-2.6, 0, -1.8); g.add(plantO);
  const ceil = practical('#fff2d8', 1.2, 5, { radius: 0.4, shape: 'panel' }); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H - 0.02, -0.5); g.add(ceil);
  return { map, pins13, setYear, cal, lamp: lampD, bag, cut, desk: dk };
}
export function filingCabinet({ drawers = 4, color = '#8a98a8', label = true, seed = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed), m = soft(color, 'metal', { metalness: 0.4, roughness: 0.45 });
  g.add(at(roundBox(0.55, drawers * 0.33 + 0.06, 0.65, m, 0.03), 0, (drawers * 0.33 + 0.06) / 2, 0));
  const fronts = [];
  for (let i = 0; i < drawers; i++) { const d = new THREE.Group(); d.position.set(0, 0.2 + i * 0.33, 0.33); g.add(d);
    d.add(roundBox(0.5, 0.29, 0.03, soft(color, 'metal', { metalness: 0.4, roughness: 0.4 }), 0.012));
    d.add(at(roundBox(0.18, 0.035, 0.04, soft('#d8d8d8', 'metal'), 0.012), 0, -0.04, 0.03));
    if (label) d.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), soft('#fbf8f0', 'paper')), 0, 0.06, 0.017)); fronts.push(d); }
  g.userData.fronts = fronts; return g;
}

// ---------------------------------------------------------------- DNA world
export function dnaWorld(scene) {
  const g = new THREE.Group(); scene.add(g);
  const helix = new THREE.Group(); g.add(helix);
  const colors = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f1c'];
  const N = 70, R = 0.55, step = 0.13;
  const bb = [soft('#4cc9f0', 'plastic', { emissive: '#4cc9f0', emissiveIntensity: 0.25 }), soft('#ff8fab', 'plastic', { emissive: '#ff8fab', emissiveIntensity: 0.25 })];
  for (const s of [0, 1]) { const pts = []; for (let i = 0; i <= N; i++) { const a = i * 0.36 + s * Math.PI; pts.push(V(Math.cos(a) * R, i * step - N * step / 2, Math.sin(a) * R)); } helix.add(tubeR(pts, 0.07, bb[s], { seg: 400, radial: 14 })); }
  const r = rng(5);
  for (let i = 0; i < N; i++) { const a = i * 0.36, y = i * step - N * step / 2; const c1 = colors[Math.floor(r() * 6)], c2 = colors[Math.floor(r() * 6)];
    for (const [k, c] of [[0, c1], [1, c2]]) { const rung = cyl(0.035, 0.035, R, soft(c, 'plastic', { emissive: c, emissiveIntensity: 0.2 }), 12); rung.rotation.z = Math.PI / 2;
      const p = new THREE.Group(); p.rotation.y = -a + (k ? Math.PI : 0); p.position.y = y; rung.position.x = R / 2; p.add(rung); helix.add(p); } }
  // soft cell background blobs
  for (let i = 0; i < 26; i++) { const b = sph(0.6 + r() * 1.4, soft(['#ffd6e8', '#d6f0ff', '#e8dcff', '#fff0c8'][i % 4], 'clay', { roughness: 0.4, transparent: true, opacity: 0.85, emissive: '#ffffff', emissiveIntensity: 0.1 }));
    const a = r() * Math.PI * 2, d = 4 + r() * 6; b.position.set(Math.cos(a) * d, (r() - 0.5) * 12, Math.sin(a) * d); b.castShadow = false; g.add(b); }
  return { helix };
}

// ---------------------------------------------------------------- records room + evidence shelf
export function recordsRoom(scene) {
  const g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), soft('#8a6a50', 'wood', { map: plankTexture('#9a7050', { seed: 12 }) })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), soft('#ffffff', 'clay', { map: wallTexture('#c8d0b8') })); back.position.set(0, 2, -2.2); back.receiveShadow = true; g.add(back);
  const cabs = [];
  for (let i = 0; i < 14; i++) { const c = filingCabinet({ drawers: 4, color: ['#3f8f8a', '#d9a441', '#c8604a', '#4a6fa5'][i % 4], seed: i }); c.position.set(-5 + i * 0.62, 0, -1.8); g.add(c); cabs.push(c); }
  for (let i = 0; i < 4; i++) { const p = practical('#f4fbff', 1.6, 6, { radius: 0.35, shape: 'panel' }); p.rotation.x = Math.PI / 2; p.position.set(-4 + i * 2.6, 3.4, -0.6); g.add(p); }
  // card that searches
  const cardTex = tex(320, 200, (c, w, h) => { c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1f3a5a'; c.font = `800 28px ${FONT}`; c.fillText('DNA PROFILE', 18, 40);
    const r = rng(17); for (let i = 0; i < 26; i++) { c.fillStyle = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0'][Math.floor(r() * 4)]; c.fillRect(18 + i * 11, 60 + r() * 30, 8, 70 + r() * 30); } });
  const card = new THREE.Group(); card.add(roundBox(0.34, 0.22, 0.008, soft('#fbf8f0', 'paper'), 0.004)); const cf = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshStandardMaterial({ map: cardTex, emissive: '#ffffff', emissiveMap: cardTex, emissiveIntensity: 0.35 })); cf.position.z = 0.005; card.add(cf); g.add(card);
  const glow = new THREE.PointLight('#bfe8ff', 1.5, 2, 2); card.add(glow);
  const stamp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), new THREE.MeshStandardMaterial({ map: tex(400, 130, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#d81e1e'; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#d81e1e'; c.font = `900 72px ${FONT}`; c.textAlign = 'center'; c.fillText('NO MATCH', w / 2, 92); }), transparent: true, roughness: 0.8 }));
  stamp.position.z = 0.01; stamp.rotation.z = 0.15; card.add(stamp);
  // shelf with the evidence box (waiting)
  const shelf = new THREE.Group(); shelf.position.set(4.2, 0, -1.6); g.add(shelf);
  for (let i = 0; i < 4; i++) shelf.add(at(roundBox(2.2, 0.05, 0.6, soft('#8a6a4a', 'wood'), 0.015), 0, 0.5 + i * 0.75, 0));
  for (const x of [-1.1, 1.1]) shelf.add(at(roundBox(0.06, 2.9, 0.6, soft('#7a5a3a', 'wood'), 0.02), x, 1.45, 0));
  const r = rng(3);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { if (i === 3 && k === 1) continue; const b = roundBox(0.42, 0.3, 0.45, soft(['#c8a070', '#b89060', '#d8b080'][Math.floor(r() * 3)], 'paper'), 0.02); b.position.set(-0.75 + k * 0.5, 0.68 + i * 0.75, 0); b.rotation.y = (r() - 0.5) * 0.1; shelf.add(b); }
  const box = new THREE.Group(); box.position.set(-0.25, 2.93, 0.02); shelf.add(box);
  box.add(roundBox(0.44, 0.32, 0.46, soft('#c89a62', 'paper'), 0.02));
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), soft('#ffffff', 'paper', { map: tex(340, 160, (c, w, h) => { c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3261e'; c.font = `900 40px ${FONT}`; c.fillText('UNSOLVED', 20, 60); c.fillStyle = '#2a2a2a'; c.font = `700 30px ${FONT}`; c.fillText('EAR / ONS', 20, 110); }) })); lbl.position.z = 0.235; box.add(lbl);
  const web = new THREE.Group(); web.position.set(0.2, 3.25, 0.25); shelf.add(web);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 0.5 + Math.PI; web.add(tubeR([V(0, 0, 0), V(Math.cos(a) * 0.35, Math.sin(a) * 0.35 + 0.0, 0)], 0.002, soft('#ffffff', 'plastic', { transparent: true, opacity: 0.7 }), { seg: 4, radial: 4 })); }
  for (let k = 1; k <= 4; k++) { const pts = []; for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 0.5 + Math.PI; pts.push(V(Math.cos(a) * 0.08 * k, Math.sin(a) * 0.08 * k, 0)); } web.add(tubeR(pts, 0.0015, soft('#ffffff', 'plastic', { transparent: true, opacity: 0.7 }), { seg: 12, radial: 4 })); }
  const hang = practical('#ffd08a', 3, 5, { radius: 0.07 }); hang.position.set(3.95, 3.9, -0.9); g.add(hang); g.add(tubeR([V(3.95, 3.95, -0.9), V(3.95, 5, -0.9)], 0.008, soft('#2a2a2a', 'plastic'), { seg: 4 }));
  const back2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), soft('#ffffff', 'clay', { map: wallTexture('#c8d0b8') })); back2.position.set(0, 5.5, -2.2); g.add(back2);
  const wallClock = clock('#3a6a8a'); wallClock.position.set(4.2, 3.55, -2.15); wallClock.scale.setScalar(1.3); g.add(wallClock);
  const hands = wallClock.children.filter(c => c.isMesh && c.geometry.type === 'RoundedBoxGeometry');
  return { card, stamp, glow, cabs, box, web, hands, shelf };
}

// ---------------------------------------------------------------- 2018 office
export function screenTex() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 400; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, draw(k, stage = 'upload') { const g = c.getContext('2d'), w = 640, h = 400;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#eaf6ff'); gr.addColorStop(1, '#cfe8ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2fb8b0'; g.fillRect(0, 0, w, 70); g.fillStyle = '#ffffff'; g.font = `900 38px ${FONT}`; g.fillText('FamilyFinder', 24, 48);
    g.fillStyle = '#1f3a5a'; g.font = `800 30px ${FONT}`; g.fillText(stage === 'upload' ? 'Upload DNA file' : 'Matches found', 24, 125);
    g.fillStyle = '#ffffff'; g.fillRect(24, 160, w - 48, 44); g.fillStyle = '#ff8f3a'; g.fillRect(24, 160, (w - 48) * k, 44);
    g.fillStyle = '#1f3a5a'; g.font = `700 24px ${FONT}`; g.fillText(Math.round(k * 100) + '%', w / 2 - 20, 190);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#ffffff'; g.fillRect(24 + i * 150, 240, 130, 130); g.fillStyle = ['#ffd6c0', '#d6f0d6', '#e6dcff', '#fff0b8'][i]; g.beginPath(); g.arc(89 + i * 150, 290, 30, 0, 7); g.fill(); g.fillRect(54 + i * 150, 330, 70, 30); }
    t.needsUpdate = true; } };
}
export function office2018(scene) {
  const g = new THREE.Group(); scene.add(g); const W = 7, D = 5, H = 3;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), soft('#ffffff', 'wood', { map: plankTexture('#c8a888', { seed: 9 }) })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), soft('#ffffff', 'clay', { map: wallTexture('#e8eef2') })); back.position.set(0, H / 2, -D / 2); back.receiveShadow = true; g.add(back);
  const win = windowFrame({ w: 2.4, h: 1.5, sky: ['#7fc0f0', '#e8f6ff'], light: '#fff6e0', intensity: 2.4 }); win.position.set(1.6, 1.75, -D / 2 + 0.01); g.add(win);
  const dk = desk({ w: 1.6, color: '#f4f4f4' }); dk.position.set(-0.2, 0, -1.2); g.add(dk);
  const lap = new THREE.Group(); lap.position.set(-0.25, 0.785, -1.2); lap.rotation.y = Math.PI; g.add(lap);
  lap.add(at(roundBox(0.42, 0.02, 0.3, soft('#c8ccd4', 'metal'), 0.008), 0, 0.01, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.02, -0.15); lid.rotation.x = -0.25; lap.add(lid);
  lid.add(at(roundBox(0.42, 0.28, 0.012, soft('#c8ccd4', 'metal'), 0.008), 0, 0.14, 0));
  const scr = screenTex(); scr.draw(0); const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.25), new THREE.MeshBasicMaterial({ map: scr.tex })); sm.position.set(0, 0.14, 0.007); lid.add(sm);
  const glow = new THREE.PointLight('#bfe8ff', 0.8, 1.5, 2); glow.position.set(0, 0.15, 0.2); lid.add(glow);
  const mon = new THREE.Group(); mon.position.set(-0.85, 0.785, -1.45); mon.rotation.y = 0.35; g.add(mon);
  mon.add(at(roundBox(0.6, 0.38, 0.04, soft('#2a2e38', 'plastic'), 0.015), 0, 0.42, 0), at(cyl(0.02, 0.02, 0.22, soft('#2a2e38', 'plastic')), 0, 0.12, -0.03), at(roundBox(0.22, 0.015, 0.16, soft('#2a2e38', 'plastic'), 0.006), 0, 0.01, 0));
  const ms = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), new THREE.MeshBasicMaterial({ map: tex(320, 200, (c, w, h) => { c.fillStyle = '#16324a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4cc9f0'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(20, 30 + i * 28); c.lineTo(120 + i * 30, 30 + i * 28); c.stroke(); } c.fillStyle = '#ffd166'; c.fillRect(200, 40, 90, 120); }) })); ms.position.set(0, 0.42, 0.021); mon.add(ms);
  const mg = mug('#2fb8b0'); mg.position.set(0.4, 0.785, -1.0); g.add(mg);
  for (const [x, z, h, s] of [[-3, -2, 1.2, 51], [2.9, -2.1, 0.9, 52], [3.1, 0.6, 1.3, 53]]) { const p = plant({ h, seed: s }); p.position.set(x, 0, z); g.add(p); }
  const sh = bookshelf({ w: 1.0, h: 1.6, seed: 13, color: '#e8e8e8' }); sh.position.set(-2.6, 0, -D / 2 + 0.2); g.add(sh);
  const board = new THREE.Group(); board.position.set(-2.0, 1.75, -D / 2 + 0.02); g.add(board); board.add(roundBox(1.4, 0.8, 0.03, soft('#fbfbfb', 'plastic'), 0.02));
  for (let i = 0; i < 5; i++) { const pc = photoCard(portrait({ style: i, skin: ['#f1c4a0', '#c98f6a', '#f3d1b5', '#8a5a3c', '#e8b796'][i], hair: ['#4a2c1a', '#1a1008', '#d8a040', '#2a1a12', '#9a9a9a'][i], shirt: ['#e85d4a', '#3f8fd2', '#5fb36b', '#f2a541', '#7a5cc8'][i] }), 0.15, 0.19); pc.position.set(-0.52 + i * 0.26, 0.05 * Math.sin(i * 2), 0.02); board.add(pc); }
  const ceil = practical('#ffffff', 1.0, 6, { radius: 0.5, shape: 'panel' }); ceil.rotation.x = Math.PI / 2; ceil.position.set(-0.5, H - 0.02, -0.5); g.add(ceil);
  const tv = new THREE.Group(); tv.position.set(-0.25, 2.12, -D / 2 + 0.05); g.add(tv);
  tv.add(roundBox(1.3, 0.78, 0.05, soft('#1d2230', 'plastic'), 0.02));
  const tvs = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.7), new THREE.MeshBasicMaterial({ map: scr.tex })); tvs.position.z = 0.027; tv.add(tvs);
  const tvGlow = new THREE.PointLight('#bfe8ff', 1.2, 3, 2); tvGlow.position.z = 0.5; tv.add(tvGlow);
  return { laptop: lap, screen: scr, screenMesh: sm, tvScreen: tvs, desk: dk };
}

// ---------------------------------------------------------------- family tree world
export function familyTree(scene) {
  const g = new THREE.Group(); scene.add(g); const r = rng(21);
  const hill = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), soft('#7cc35a', 'clay')); hill.scale.y = 0.12; hill.position.y = -3.6; hill.receiveShadow = true; g.add(hill);
  const bark = soft('#8a5a3c', 'wood'), leaf = soft('#5aa34f', 'clay', { sheen: 0.4 });
  const trunk = tubeR([V(0, -0.5, 0), V(0.1, 2, 0), V(-0.1, 4, 0.1), V(0, 6, 0)], u => 0.75 - 0.4 * u, bark, { seg: 40, radial: 24 }); g.add(trunk);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const root = tubeR([V(0, 0.2, 0), V(Math.cos(a) * 1.0, -0.1, Math.sin(a) * 1.0), V(Math.cos(a) * 1.8, -0.4, Math.sin(a) * 1.8)], u => 0.3 * (1 - u) + 0.03, bark, { seg: 16 }); g.add(root); }
  const branches = [];
  const B = [[0.3, 3.0, 0.2, 2.8, 4.4, 0.6], [-0.4, 3.4, 0.0, -3.0, 5.0, 0.6], [0.2, 4.2, 0.0, 2.4, 6.4, 0.2], [-0.1, 4.6, 0.1, -2.4, 6.9, 0.3], [0.0, 5.4, 0.0, 0.4, 7.8, 0.4]];
  B.forEach(([x0, y0, z0, x1, y1, z1], i) => { const mid = V((x0 + x1) / 2, (y0 + y1) / 2 + 0.6, (z0 + z1) / 2); g.add(tubeR([V(x0, y0, z0), mid, V(x1, y1, z1)], u => 0.28 - 0.2 * u, bark, { seg: 20, radial: 16 })); branches.push(V(x1, y1, z1));
    for (let k = 0; k < 4; k++) { const b = sph(0.7 + r() * 0.5, leaf.clone()); b.material.color.offsetHSL((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.1); b.position.set(x1 + (r() - 0.5) * 1.6, y1 + 0.7 + r() * 0.8, Math.min(z1, 0) - 1.3 - r() * 0.6); g.add(b); } });
  for (let k = 0; k < 9; k++) { const b = sph(1.1 + r() * 0.6, leaf); b.position.set((r() - 0.5) * 5, 7.4 + r() * 1.5, -1.5 - r() * 1.2); g.add(b); }
  // portrait frames hanging from the tree: [generation, position]
  const frames = [];
  const mk = (pos, look, gen) => { const f = pictureFrame({ w: 0.42, h: 0.52, art: portrait(look), frame: gen === 0 ? '#6a5030' : '#c89040' }); const hang = new THREE.Group(); hang.position.copy(pos); hang.add(f); f.position.y = -0.35;
    hang.add(tubeR([V(-0.12, 0, 0), V(0, 0.05, 0), V(0.12, 0, 0)].map(v => v.add(V(0, -0.08, 0))), 0.006, soft('#d8c8a0', 'fabric'), { seg: 6, radial: 4 })); g.add(hang); frames.push({ g: hang, f, gen }); return hang; };
  const skins = ['#f1c4a0', '#c98f6a', '#f3d1b5', '#8a5a3c', '#e8b796', '#d8a888'], hairs = ['#4a2c1a', '#1a1008', '#d8a040', '#2a1a12', '#9a9a9a', '#c8742c'];
  // roots: 1800s sepia ancestors
  for (let i = 0; i < 5; i++) { const a = -1.1 + i * 0.55; mk(V(Math.sin(a) * 1.9, 1.0, Math.cos(a) * 1.9), { skin: skins[i], hair: hairs[i], shirt: '#6a5a4a', sepia: true, style: i, bg: '#e8dcc0' }, 0); }
  // branch frames (family)
  branches.forEach((b, i) => { if (i === 0) return; for (let k = 0; k < 2; k++) mk(b.clone().add(V((k - 0.5) * 0.9 + (i === 1 ? 0.6 : 0), -0.45, 0.5)), { skin: skins[(i + k) % 6], hair: hairs[(i * 2 + k) % 6], shirt: ['#e85d4a', '#3f8fd2', '#5fb36b', '#f2a541', '#7a5cc8'][(i + k) % 5], style: i + k, bg: ['#ffe2c0', '#d8f0d8', '#e6dcff', '#fff0b8'][(i + k) % 4] }, 1); });
  const unknown = mk(V(-2.3, 4.55, 1.3), { unknown: true, bg: '#fff4d6' }, 2);
  [[0.95, 2.3], [-0.95, 2.0], [0.9, 3.2], [-0.85, 3.4]].forEach(([x, y], i) => mk(V(x, y, 0.75), { skin: skins[(i + 2) % 6], hair: hairs[(i + 3) % 6], shirt: ['#2fb8b0', '#e77aa8', '#f08a5d', '#4a6fa5'][i], style: i + 1, bg: ['#fff0b8', '#e6dcff', '#d8f0d8', '#ffe2c0'][i] }, 1));
  const platform = new THREE.Group(); platform.position.copy(branches[0]).add(V(-0.2, -0.95, 0.3)); g.add(platform);
  platform.add(at(roundBox(1.8, 0.1, 0.9, bark, 0.04), 0, 0, 0));
  // DNA ribbons between cousins' frames and the unknown frame
  const ribbons = []; const rc = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0'];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 24), soft(rc[i], 'plastic', { emissive: rc[i], emissiveIntensity: 0.6 })); g.add(m); ribbons.push(m); }
  for (let i = 0; i < 30; i++) { const f = sph(0.03, new THREE.MeshBasicMaterial({ color: '#fff4a0' })); f.position.set((r() - 0.5) * 8, 0.5 + r() * 7, (r() - 0.5) * 6); f.castShadow = false; g.add(f); }
  for (const [x, z, s] of [[-6, -4, 3], [7, -6, 4], [-8, 3, 2.5], [5, 6, 2.2]]) { const t = tree({ h: s, seed: x * 3 + z }); t.position.set(x, -0.2, z); g.add(t); }
  return { frames, unknown, platform, ribbons, branches };
}

// ---------------------------------------------------------------- suburb (day) + store
export function suburb(scene) {
  const s = street(scene, { seed: 5, length: 30 });
  for (const o of [...s.group.children]) if ((o.position.x > 4 && Math.abs(o.position.z) < 6) || (o.position.x < -4 && o.position.z < -4 && o.position.z > -16)) s.group.remove(o);
  const home = house({ w: 3.6, h: 2.6, d: 3.6, wall: '#f4e0b0', roof: '#7a5a8a' }); home.position.set(7.6, 0, 0.5); home.rotation.y = -Math.PI / 2; scene.add(home);
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), soft('#8fd068', 'clay')); lawn.rotation.x = -Math.PI / 2; lawn.position.set(5.2, 0.01, 0.5); lawn.receiveShadow = true; scene.add(lawn);
  for (const [x, z] of [[5.0, -1.8], [5.2, 2.8]]) { const b = bush({ s: 0.6, seed: x + z }); b.position.set(x, 0, z); scene.add(b); }
  const fl = []; for (let i = 0; i < 9; i++) { const f = new THREE.Group(); f.position.set(4.2 + (i % 3) * 0.25, 0, -1.2 + Math.floor(i / 3) * 0.25); f.add(at(cyl(0.008, 0.008, 0.25, soft('#4f9a48', 'clay')), 0, 0.12, 0)); f.add(at(sph(0.05, soft(['#ff6b6b', '#ffd166', '#ff8fab'][i % 3], 'clay')), 0, 0.26, 0)); scene.add(f); fl.push(f); }
  const mbox = new THREE.Group(); mbox.position.set(3.9, 0, 2.2); scene.add(mbox); mbox.add(at(cyl(0.04, 0.04, 1.0, soft('#e8e0d0', 'wood')), 0, 0.5, 0), at(roundBox(0.25, 0.22, 0.45, soft('#2f5fa8', 'plastic'), 0.1), 0, 1.08, 0));
  // grocery store across the street
  const store = new THREE.Group(); store.position.set(-8.0, 0, -9); store.rotation.y = Math.PI / 2; scene.add(store);
  store.add(at(roundBox(8, 3.4, 4, soft('#f4f0e6', 'clay'), 0.1), 0, 1.7, 0));
  const aw = tex(512, 64, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#2fa86a'; c.fillRect(i * 32, 0, 32, h); } });
  const awning = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 24, 1, true, 0, Math.PI), soft('#ffffff', 'fabric', { map: aw, side: THREE.DoubleSide })); awning.rotation.set(0, 0, Math.PI / 2); awning.rotation.x = Math.PI / 2; awning.position.set(0, 2.6, 2.2); awning.scale.set(1, 1, 0.6); store.add(awning);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), new THREE.MeshStandardMaterial({ map: tex(640, 120, (c, w, h) => { c.fillStyle = '#2fa86a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = `900 80px ${FONT}`; c.textAlign = 'center'; c.fillText('GROCERY', w / 2, 92); }), roughness: 0.5 })); sign.position.set(0, 3.1, 2.03); store.add(sign);
  const doorM = roundBox(1.4, 2.2, 0.06, soft('#9fc8e8', 'plastic', { roughness: 0.1, clearcoat: 1 }), 0.03); doorM.position.set(0.8, 1.1, 2.0); store.add(doorM);
  for (const x of [-2.4, 2.6]) { const wi = roundBox(1.8, 1.5, 0.05, soft('#bfe0f4', 'plastic', { roughness: 0.1, clearcoat: 1 }), 0.03); wi.position.set(x, 1.4, 2.01); store.add(wi);
    for (let k = 0; k < 6; k++) store.add(at(roundBox(0.2, 0.25, 0.2, soft(['#ff6b6b', '#ffd166', '#06d6a0', '#f2a541'][k % 4], 'plastic'), 0.04), x - 0.6 + k * 0.24, 0.85, 1.85)); }
  for (const x of [-3.6, 3.6]) { const p = plant({ h: 0.9, seed: x }); p.position.set(x, 0, 2.4); store.add(p); }
  const oldCar = car({ color: '#b8c8d8' }); oldCar.position.set(-4.6, 0, -10.6); scene.add(oldCar);
  const van = car({ color: '#e8e4da', van: true }); van.position.set(-1.1, 0, 4.5); van.rotation.y = Math.PI; scene.add(van);
  const hose = { reel: at(cyl(0.18, 0.18, 0.1, soft('#2fa86a', 'plastic')), 5.9, 0.4, -1.6) }; hose.reel.rotation.x = Math.PI / 2; scene.add(hose.reel);
  return { home, store, oldCar, van, hose, flowers: fl };
}
export function binoculars() { const g = new THREE.Group(), m = soft('#1d2230', 'rubber'); for (const x of [-0.035, 0.035]) { const c = cyl(0.025, 0.03, 0.11, m, 16); c.rotation.x = Math.PI / 2; c.position.x = x; g.add(c); } g.add(at(roundBox(0.05, 0.02, 0.04, m, 0.008), 0, 0, 0)); return g; }
export function swabStick() { const g = new THREE.Group(); g.add(at(cyl(0.004, 0.004, 0.15, soft('#f4f4f4', 'plastic'), 8), 0, -0.075, 0)); const bud = sph(0.012, soft('#ffffff', 'fabric')); bud.scale.set(1, 1.7, 1); bud.position.y = -0.16; g.add(bud); g.userData.bud = bud; return g; }
export function policeCap(color = '#1d2a4a') { const g = new THREE.Group(); g.add(at(cyl(0.12, 0.11, 0.09, soft(color, 'fabric')), 0, 0.05, 0)); const top = cyl(0.14, 0.12, 0.04, soft(color, 'fabric')); top.position.y = 0.11; g.add(top);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 24, 1, false, -Math.PI / 2, Math.PI), soft('#111111', 'plastic', { clearcoat: 1 })); brim.position.set(0, 0.01, 0.06); brim.scale.z = 1.2; g.add(brim);
  g.add(at(sph(0.022, soft('#e8c060', 'metal')), 0, 0.09, 0.115)); return g; }

// ---------------------------------------------------------------- arrest props
export function handcuffs() { const g = new THREE.Group(), m = soft('#c8ccd4', 'metal'); const a = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 10, 24), m), b = a.clone(); a.position.x = -0.07; b.position.x = 0.07; g.add(a, b);
  g.add(tubeR([V(-0.03, 0, 0), V(0, -0.02, 0), V(0.03, 0, 0)], 0.005, m, { seg: 6, radial: 5 })); return g; }
export function badge() { const s = new THREE.Shape(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.05 : 0.11; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 3 }), soft('#e8c060', 'metal', { roughness: 0.25 })); m.castShadow = true;
  const g = new THREE.Group(); g.add(m); g.add(at(cyl(0.04, 0.04, 0.02, soft('#2f4f8a', 'plastic')), 0, 0, 0.022)).children; g.children[1].rotation.x = Math.PI / 2; return g; }
export function hammer() { const g = new THREE.Group(); g.add(at(cyl(0.018, 0.022, 0.32, soft('#d8a868', 'wood')), 0, 0, 0)); const h = roundBox(0.16, 0.05, 0.05, soft('#8a8e98', 'metal'), 0.012); h.position.y = 0.17; g.add(h); return g; }
export function sprayCan(label = 'DOG SPRAY') { const g = new THREE.Group(); const t = tex(256, 200, (c, w, h) => { c.fillStyle = '#f2a541'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d2230'; c.font = `900 44px ${FONT}`; c.textAlign = 'center'; c.fillText(label.split(' ')[0], w / 2, 90); c.fillText(label.split(' ')[1] || '', w / 2, 150); });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.17, 32), soft('#ffffff', 'metal', { metalness: 0.3, map: t })); body.castShadow = true; g.add(body);
  g.add(at(cyl(0.032, 0.04, 0.03, soft('#d8d8d8', 'metal')), 0, 0.1, 0), at(cyl(0.012, 0.012, 0.03, soft('#d81e1e', 'plastic')), 0, 0.125, 0)); return g; }
export function matchScreen() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 400; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const r = rng(77), bars = Array.from({ length: 22 }, () => [r() * 60, 40 + r() * 80, ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0'][Math.floor(r() * 4)]]);
  return { tex: t, draw(k) { const g = c.getContext('2d'), w = 640, h = 400; g.fillStyle = k >= 1 ? '#0f3a26' : '#101a2a'; g.fillRect(0, 0, w, h);
    for (const [side, off] of [[0, -1], [1, 1]]) { const x0 = w / 2 + off * (60 + 160 * (1 - k)) - 70; bars.forEach(([y, hh, col], i) => { g.fillStyle = col; g.fillRect(x0, 20 + i * 16, 140, 10); }); }
    if (k >= 1) { g.fillStyle = '#5cff9a'; g.font = `900 96px ${FONT}`; g.textAlign = 'center'; g.fillText('MATCH', w / 2, h / 2 + 34); g.textAlign = 'left'; }
    t.needsUpdate = true; } };
}
export function matchLab(scene) {
  const L = lab(scene, { seed: 5 });
  const mon = new THREE.Group(); mon.position.set(-0.3, L.benchTop, -1.9); scene.add(mon);
  mon.add(at(roundBox(1.3, 0.85, 0.06, soft('#2a2e38', 'plastic'), 0.03), 0, 0.6, 0), at(cyl(0.03, 0.03, 0.2, soft('#2a2e38', 'plastic')), 0, 0.1, -0.03));
  const ms = matchScreen(); ms.draw(0); const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.76), new THREE.MeshBasicMaterial({ map: ms.tex })); sm.position.set(0, 0.6, 0.032); mon.add(sm);
  const glow = new THREE.PointLight('#5cff9a', 0, 3, 2); glow.position.set(0, 0.6, 0.5); mon.add(glow);
  return { ...L, mon, screen: ms, glow };
}
export function driveway(scene) {
  const g = new THREE.Group(); scene.add(g);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), soft('#6fae58', 'clay')); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; g.add(grass);
  const drive = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 12), soft('#b8b0a4', 'clay')); drive.rotation.x = -Math.PI / 2; drive.position.set(0, 0.01, 1); drive.receiveShadow = true; g.add(drive);
  const h = house({ w: 4, h: 2.8, d: 4, wall: '#f4e0b0', roof: '#7a5a8a' }); h.position.set(-0.5, 0, -5.5); g.add(h);
  const garage = roundBox(2.6, 2.2, 0.1, soft('#e8e0d0', 'plastic'), 0.04); garage.position.set(-0.5, 1.1, -3.45); g.add(garage);
  const pc = car({ police: true }); pc.position.set(2.2, 0, 1.6); pc.rotation.y = -0.25; g.add(pc);
  const pc2 = car({ police: true }); pc2.position.set(-3.2, 0, 4.4); pc2.rotation.y = 0.9; g.add(pc2);
  for (const [x, z, s] of [[-4.5, -3, 3.2], [4.5, -4, 2.8], [6, 3, 3.5], [-6, 6, 3]]) { const t = tree({ h: s, seed: x * 7 + z }); t.position.set(x, 0, z); g.add(t); }
  for (const [x, z] of [[-2.6, -2.5], [1.8, -2.6], [-2.0, 0.5]]) { const b = bush({ s: 0.6, seed: x * 5 + z }); b.position.set(x, 0, z); g.add(b); }
  const porch = practical('#ffd08a', 2.5, 5, { radius: 0.06 }); porch.position.set(0.9, 2.2, -3.4); g.add(porch);
  return { cars: [pc, pc2] };
}
