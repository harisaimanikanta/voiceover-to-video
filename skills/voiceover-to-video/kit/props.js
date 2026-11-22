// Rounded cartoon set dressing. Every prop has soft bevels, micro-surface normals and colour variation, so frames
// never look empty or plasticky (lessons L013/L014). Presets dress a whole set in one call: cozyRoom, lab, street.
// All sizes in metres, props stand on y = 0 and face +z.
import * as THREE from 'three';
import { soft, roundBox, lathe, tubeR, practical } from './look.js';

const rng = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const PALETTE = ['#e85d4a', '#f2a541', '#f6d86b', '#5fb36b', '#3f8fd2', '#7a5cc8', '#e77aa8', '#2fb8b0', '#f08a5d', '#4a6fa5'];
const sphere = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; return m; };
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; return t;
}
/** Wood planks with per-plank tone variation and grain. */
export function plankTexture(base = '#a8754f', { planks = 8, seed = 3 } = {}) {
  const r = rng(seed);
  return canvasTex(512, 512, (g, w, h) => {
    const c = new THREE.Color(base);
    for (let i = 0; i < planks; i++) {
      const k = c.clone().offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.08); g.fillStyle = '#' + k.getHexString(); g.fillRect(0, i * h / planks, w, h / planks);
      g.strokeStyle = 'rgba(60,30,10,0.12)'; for (let j = 0; j < 12; j++) { const y = i * h / planks + r() * h / planks; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 6 * (r() - 0.5), w * 0.6, y - 6 * (r() - 0.5), w, y); g.stroke(); }
      g.fillStyle = 'rgba(40,20,5,0.45)'; g.fillRect(0, (i + 1) * h / planks - 2, w, 3); const x = r() * w; g.fillRect(x, i * h / planks, 3, h / planks);
    }
  });
}
/** Painted wall with soft vertical variation (and optional wallpaper stripes). */
export function wallTexture(base = '#e8c9a0', { stripes = null } = {}) {
  return canvasTex(512, 512, (g, w, h) => {
    const c = new THREE.Color(base), gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#' + c.clone().offsetHSL(0, 0, 0.04).getHexString()); gr.addColorStop(1, '#' + c.clone().offsetHSL(0, 0.02, -0.05).getHexString());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (stripes) { g.fillStyle = stripes; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 22, h); }
    const r = rng(5); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.025)`; g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4); }
  }, [3, 1]);
}
/** Round rug with concentric stripes. */
export function rug(radius = 1.2, colors = ['#d9643f', '#f2c14e', '#3a7ca5', '#f4ead5']) {
  const t = canvasTex(512, 512, (g, w) => { for (let i = 0; i < 10; i++) { g.fillStyle = colors[i % colors.length]; g.beginPath(); g.arc(w / 2, w / 2, w / 2 * (1 - i / 10), 0, Math.PI * 2); g.fill(); } });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.02, 64), soft('#ffffff', 'fabric', { map: t }));
  m.position.y = 0.01; m.receiveShadow = true; return m;
}

// ---------------------------------------------------------------- furniture & small props
export function bookshelf({ w = 1.2, h = 1.8, d = 0.32, color = '#8a5a3c', seed = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed), wood = soft(color, 'wood');
  const shelves = Math.round(h / 0.38);
  g.add(at(roundBox(w, h, 0.03, wood, 0.01), 0, h / 2, -d / 2));
  for (const s of [-1, 1]) g.add(at(roundBox(0.04, h, d, wood, 0.012), s * (w / 2 - 0.02), h / 2, 0));
  const books = [];
  for (let i = 0; i <= shelves; i++) {
    const y = i * (h - 0.04) / shelves + 0.02; g.add(at(roundBox(w, 0.035, d, wood, 0.01), 0, y, 0));
    if (i === shelves) break;
    let x = -w / 2 + 0.05;
    while (x < w / 2 - 0.08) {
      if (r() < 0.12) { x += 0.06 + r() * 0.1; continue; }
      const bw = 0.025 + r() * 0.035, bh = 0.2 + r() * 0.12, tilt = r() < 0.1 ? 0.25 : 0;
      books.push({ x: x + bw / 2, y: y + 0.0175 + bh / 2, w: bw, h: bh, d: d * (0.7 + r() * 0.2), tilt, c: pick(r, PALETTE) }); x += bw + 0.003;
    }
    if (r() < 0.5) { const pot = plant({ h: 0.25, seed: seed * 10 + i }); pot.scale.setScalar(0.6); pot.position.set(w / 2 - 0.15, y + 0.02, 0); g.add(pot); }
  }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1, 1, 1, 1), soft('#ffffff', 'paper', { roughness: 0.7 }), books.length);
  const o = new THREE.Object3D();
  books.forEach((b, i) => { o.position.set(b.x, b.y, 0); o.rotation.set(0, 0, b.tilt); o.scale.set(b.w, b.h, b.d); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color(b.c)); });
  im.castShadow = im.receiveShadow = true; g.add(im);
  return g;
}
export function plant({ h = 0.6, pot = '#d8744f', leaf = '#4e9f50', seed = 2 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  g.add(lathe([[0.001, 0], [0.09 * h / 0.6, 0], [0.12 * h / 0.6, 0.18 * h / 0.6], [0.13 * h / 0.6, 0.2 * h / 0.6], [0.001, 0.2 * h / 0.6]], soft(pot, 'ceramic')));
  const lm = soft(leaf, 'clay', { roughness: 0.5, sheen: 0.5 }), n = 9;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r(), tilt = 0.3 + r() * 0.6, len = h * (0.45 + r() * 0.35);
    const l = sphere(len * 0.5, lm.clone(), 0.38, 1, 0.12); l.material.color.offsetHSL(0, 0, (r() - 0.5) * 0.12);
    const p = new THREE.Group(); p.position.y = 0.18 * h / 0.6; p.rotation.set(tilt * Math.cos(a), a, tilt * Math.sin(a)); l.position.y = len * 0.45; p.add(l); g.add(p);
  }
  return g;
}
export function deskLamp({ color = '#2f7fd8', light = '#ffd08a', intensity = 2.5 } = {}) {
  const g = new THREE.Group(), m = soft(color, 'plastic');
  g.add(at(lathe([[0.001, 0], [0.1, 0], [0.1, 0.02], [0.03, 0.04], [0.001, 0.04]], m), 0, 0, 0));
  g.add(tubeR([V(0, 0.03, 0), V(0.02, 0.25, 0), V(0.1, 0.42, 0), V(0.2, 0.42, 0)], 0.012, m, { seg: 24 }));
  const shade = lathe([[0.001, 0.08], [0.03, 0.08], [0.1, 0.0], [0.11, -0.01], [0.001, -0.01]], soft(color, 'plastic', { side: THREE.DoubleSide }));
  shade.position.set(0.22, 0.4, 0); shade.rotation.z = -0.5; g.add(shade);
  const bulb = practical(light, intensity, 3, { radius: 0.03 }); bulb.position.set(0.24, 0.36, 0); g.add(bulb);
  g.userData.light = bulb.userData.light; return g;
}
export function desk({ w = 1.4, d = 0.7, h = 0.76, color = '#b57a4f' } = {}) {
  const g = new THREE.Group(), m = soft(color, 'wood');
  g.add(at(roundBox(w, 0.05, d, m, 0.02), 0, h, 0));
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(at(roundBox(0.06, h, 0.06, m, 0.02), x * (w / 2 - 0.06), h / 2, z * (d / 2 - 0.06)));
  g.add(at(roundBox(0.45, 0.22, d * 0.9, soft(color, 'wood'), 0.02), w / 2 - 0.28, h - 0.14, 0));
  g.add(at(sphere(0.018, soft('#e8c060', 'metal')), w / 2 - 0.28, h - 0.14, d * 0.46));
  return g;
}
export function mug(color = '#e85d4a') {
  const g = new THREE.Group(), m = soft(color, 'ceramic');
  g.add(lathe([[0.001, 0], [0.04, 0], [0.042, 0.1], [0.036, 0.1], [0.034, 0.008], [0.001, 0.008]], m));
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 10, 20, Math.PI), m); h.position.set(0.042, 0.05, 0); h.rotation.z = -Math.PI / 2; g.add(h);
  return g;
}
export function pictureFrame({ w = 0.5, h = 0.4, art = null, frame = '#4a3020', seed = 4 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  g.add(roundBox(w, h, 0.04, soft(frame, 'wood'), 0.012));
  const tex = art || canvasTex(256, 200, (c, W, H) => {   // a soft landscape painting
    const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, pick(r, ['#7fb8e8', '#f5b48a', '#b8a0e0'])); sky.addColorStop(1, '#fdf0d8'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) { c.fillStyle = pick(r, ['#5a9f5a', '#3f7a4a', '#88b860', '#c8a060']); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 16) c.lineTo(x, H * (0.55 + i * 0.12) + Math.sin(x * 0.03 + i * 2 + r() * 2) * 18); c.lineTo(W, H); c.fill(); }
    c.fillStyle = '#fff3c0'; c.beginPath(); c.arc(W * (0.2 + r() * 0.6), H * 0.3, 18, 0, 7); c.fill();
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, h * 0.78), soft('#ffffff', 'paper', { map: tex })); p.position.z = 0.021; g.add(p);
  return g;
}
export function windowFrame({ w = 1.2, h = 1.4, frame = '#f4efe6', sky = ['#8cc8f0', '#fff0d0'], light = '#fff2d6', intensity = 3, shadow = true } = {}) {
  const g = new THREE.Group(), m = soft(frame, 'plastic');
  const tex = canvasTex(256, 256, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.85)'; if (new THREE.Color(sky[0]).getHSL({}).l > 0.35) for (const [x, y, s] of [[60, 70, 30], [180, 50, 22], [130, 120, 18]]) { for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * s * 0.6, y + (k % 2) * 6, s * (0.7 + (k % 2) * 0.3), 0, 7); c.fill(); } } });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); g.add(pane);
  for (const [x, y, ww, hh] of [[0, h / 2, w + 0.1, 0.08], [0, -h / 2, w + 0.16, 0.1], [-w / 2, 0, 0.08, h], [w / 2, 0, 0.08, h], [0, 0, 0.04, h], [0, 0, w, 0.04]]) g.add(at(roundBox(ww, hh, 0.08, m, 0.015), x, y, 0.03));
  if (intensity <= 0) return g;   // decorative window (houses): no light - every shadow-casting light costs a texture unit (lesson L021)
  const sun = new THREE.SpotLight(light, intensity * 6, 8, 0.6, 0.6, 1.2); sun.position.set(0, 0.3, 0.5); sun.target.position.set(0.4, -2.2, 3); sun.castShadow = shadow; sun.shadow.mapSize.set(1024, 1024);
  g.add(sun, sun.target); g.userData.light = sun; return g;
}
export function clock(color = '#f2a541') {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 48), soft(color, 'plastic')).rotateX(Math.PI / 2));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.13, 48), soft('#fffaf0', 'paper')); face.position.z = 0.021; g.add(face);
  for (const [len, a] of [[0.09, 0.6], [0.06, 2.2]]) { const h = roundBox(0.012, len, 0.006, soft('#2a2a2a', 'plastic'), 0.003); h.geometry.translate(0, len / 2, 0); h.rotation.z = -a; h.position.z = 0.03; g.add(h); }
  return g;
}

// ---------------------------------------------------------------- outdoors
export function tree({ h = 3, seed = 3, leaf = '#5aa34f', trunk = '#8a5a3c' } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  g.add(tubeR([V(0, 0, 0), V(0.05, h * 0.3, 0), V(-0.03, h * 0.55, 0.02)], u => 0.12 * h / 3 * (1 - u * 0.5), soft(trunk, 'wood'), { seg: 12 }));
  const lm = soft(leaf, 'clay', { roughness: 0.6, sheen: 0.4 });
  for (let i = 0; i < 7; i++) { const s = h * (0.18 + r() * 0.12); const b = sphere(s, lm.clone(), 1, 0.9, 1); b.material.color.offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.1);
    b.position.set((r() - 0.5) * h * 0.35, h * (0.6 + r() * 0.25), (r() - 0.5) * h * 0.35); g.add(b); }
  return g;
}
export function bush({ s = 0.5, seed = 5, leaf = '#4f9a48' } = {}) {
  const g = new THREE.Group(), r = rng(seed), m = soft(leaf, 'clay', { sheen: 0.4 });
  for (let i = 0; i < 5; i++) { const b = sphere(s * (0.4 + r() * 0.3), m, 1, 0.85, 1); b.position.set((r() - 0.5) * s, s * 0.3 + r() * s * 0.2, (r() - 0.5) * s * 0.6); g.add(b); }
  return g;
}
export function cloud({ s = 1, seed = 7 } = {}) {
  const g = new THREE.Group(), r = rng(seed), m = soft('#ffffff', 'clay', { roughness: 0.9, emissive: '#ffffff', emissiveIntensity: 0.25 });
  for (let i = 0; i < 6; i++) { const b = sphere(s * (0.35 + r() * 0.3), m); b.castShadow = false; b.position.set((i - 2.5) * s * 0.4, r() * s * 0.25, (r() - 0.5) * s * 0.3); g.add(b); }
  return g;
}
export function house({ w = 3, h = 2.6, d = 3, wall = '#f2d0a4', roof = '#d0563c', seed = 2 } = {}) {
  const g = new THREE.Group();
  g.add(at(roundBox(w, h, d, soft(wall, 'clay'), 0.08), 0, h / 2, 0));
  const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.6, 4, 1), soft(roof, 'clay')); rf.rotation.y = Math.PI / 4; rf.position.y = h + h * 0.3; rf.castShadow = true; g.add(rf);
  g.add(at(roundBox(0.7, 1.3, 0.1, soft('#7a4a30', 'wood'), 0.05), 0, 0.65, d / 2 + 0.02));
  for (const s of [-1, 1]) { const wi = windowFrame({ w: 0.6, h: 0.6, intensity: 0 }); wi.position.set(s * w * 0.3, h * 0.6, d / 2 + 0.02); g.add(wi); }
  return g;
}

// ---------------------------------------------------------------- science
export function flask({ liquid = '#7ee07a', glow = 0.6, h = 0.25 } = {}) {
  const g = new THREE.Group(), s = h / 0.25;
  g.add(lathe([[0.001, 0], [0.09 * s, 0], [0.1 * s, 0.02 * s], [0.03 * s, 0.17 * s], [0.028 * s, 0.25 * s], [0.032 * s, 0.26 * s]], soft('#ffffff', 'glass', { side: THREE.DoubleSide })));
  const liq = lathe([[0.001, 0.003], [0.085 * s, 0.003], [0.093 * s, 0.02 * s], [0.06 * s, 0.09 * s], [0.001, 0.09 * s]], soft(liquid, 'plastic', { emissive: liquid, emissiveIntensity: glow, transparent: true, opacity: 0.9 }));
  g.add(liq); if (glow > 0) { const l = new THREE.PointLight(liquid, glow * 0.8, 1, 2); l.position.y = 0.05 * s; g.add(l); }
  return g;
}
export function microscope(color = '#f4f4f4') {
  const g = new THREE.Group(), m = soft(color, 'plastic'), k = soft('#2a2a30', 'plastic');
  g.add(at(roundBox(0.22, 0.04, 0.28, m, 0.015), 0, 0.02, 0));
  g.add(tubeR([V(0, 0.04, -0.1), V(0, 0.2, -0.1), V(0, 0.3, -0.04)], 0.03, m, { seg: 16 }));
  g.add(at(roundBox(0.16, 0.02, 0.14, k, 0.006), 0, 0.14, 0.01));
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 24), k); tube.position.set(0, 0.32, 0); tube.rotation.x = 0.35; tube.castShadow = true; g.add(tube);
  return g;
}

// ---------------------------------------------------------------- presets: a fully dressed set in one call
/** Warm living room / study: planked floor, papered walls, window light shaft, shelves, plants, lamp, rug, pictures. */
export function cozyRoom(scene, { w = 6, d = 5, h = 3, wall = '#e8c9a0', floor = '#a8754f', seed = 1 } = {}) {
  const g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), soft('#ffffff', 'wood', { map: plankTexture(floor, { seed }) })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const wm = soft('#ffffff', 'clay', { map: wallTexture(wall, { stripes: 'rgba(255,255,255,0.12)' }) });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wm); back.position.set(0, h / 2, -d / 2); back.receiveShadow = true; g.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wm); side.position.set(-w / 2, h / 2, 0); side.rotation.y = Math.PI / 2; side.receiveShadow = true; g.add(side);
  const trim = soft('#f6efe2', 'plastic');
  g.add(at(roundBox(w, 0.12, 0.04, trim, 0.015), 0, 0.06, -d / 2 + 0.02), at(roundBox(w, 0.06, 0.05, trim, 0.015), 0, 0.95, -d / 2 + 0.025));
  const win = windowFrame({}); win.position.set(w * 0.18, 1.65, -d / 2 + 0.01); g.add(win);
  const sh = bookshelf({ seed }); sh.position.set(-w / 2 + 0.75, 0, -d / 2 + 0.2); g.add(sh);
  const dk = desk({}); dk.position.set(w * 0.25, 0, -d / 2 + 0.55); g.add(dk);
  const lamp = deskLamp({}); lamp.position.set(w * 0.25 + 0.5, 0.785, -d / 2 + 0.45); lamp.rotation.y = -2.4; g.add(lamp);
  const mg = mug(); mg.position.set(w * 0.25 - 0.3, 0.785, -d / 2 + 0.6); g.add(mg);
  for (let i = 0; i < 3; i++) { const p = roundBox(0.21, 0.004, 0.29, soft('#fbf7ee', 'paper'), 0.001); p.position.set(w * 0.25 - 0.05 + i * 0.03, 0.79 + i * 0.004, -d / 2 + 0.62); p.rotation.y = (i - 1) * 0.15; g.add(p); }
  g.add(at(rug(1.3), 0.2, 0, 0.3));
  const p1 = plant({ h: 0.9, seed: seed + 3 }); p1.position.set(-w / 2 + 0.4, 0, d / 2 - 1.2); g.add(p1);
  const p2 = plant({ h: 0.5, seed: seed + 4 }); p2.position.set(w * 0.25 - 0.55, 0.785, -d / 2 + 0.4); p2.scale.setScalar(0.5); g.add(p2);
  const f1 = pictureFrame({ seed: seed + 1 }); f1.position.set(-w * 0.12, 1.9, -d / 2 + 0.03); g.add(f1);
  const f2 = pictureFrame({ w: 0.35, h: 0.45, seed: seed + 2 }); f2.position.set(-w / 2 + 0.03, 1.7, 0.4); f2.rotation.y = Math.PI / 2; g.add(f2);
  const ck = clock(); ck.position.set(-w * 0.12, 2.5, -d / 2 + 0.03); g.add(ck);
  return { group: g, window: win, lamp, desk: dk, deskTop: 0.785 };
}
/** Bright cartoon lab: benches, glowing flasks, microscope, shelves of bottles, posters. */
export function lab(scene, { w = 7, d = 5, h = 3.2, wall = '#d8ecf0', seed = 2 } = {}) {
  const r = rng(seed), g = new THREE.Group(); scene.add(g);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), soft('#ffffff', 'plastic', { map: canvasTex(256, 256, (c, W) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#e8eef2' : '#cfdbe2'; c.fillRect(i * W / 8, j * W / 8, W / 8, W / 8); } }, [w / 2, d / 2]) }));
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const wm = soft('#ffffff', 'clay', { map: wallTexture(wall) });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wm); back.position.set(0, h / 2, -d / 2); back.receiveShadow = true; g.add(back);
  const bench = new THREE.Group(); g.add(bench); bench.position.set(0, 0, -d / 2 + 0.55);
  bench.add(at(roundBox(w * 0.8, 0.9, 0.7, soft('#f4f4f4', 'plastic'), 0.04), 0, 0.45, 0), at(roundBox(w * 0.82, 0.06, 0.76, soft('#2d3a4a', 'plastic'), 0.02), 0, 0.93, 0));
  for (let i = 0; i < 6; i++) { const f = flask({ liquid: pick(r, ['#7ee07a', '#5fd0ff', '#ff7ab0', '#ffd24a']), glow: 0.5, h: 0.15 + r() * 0.15 }); f.position.set(-w * 0.35 + i * 0.35 + r() * 0.1, 0.96, (r() - 0.5) * 0.3); bench.add(f); }
  const mic = microscope(); mic.position.set(w * 0.25, 0.96, 0); mic.rotation.y = -0.4; bench.add(mic);
  for (let row = 0; row < 2; row++) { const shelf = roundBox(w * 0.6, 0.04, 0.25, soft('#ffffff', 'plastic'), 0.01); shelf.position.set(-0.2, 1.7 + row * 0.5, -d / 2 + 0.13); g.add(shelf);
    for (let i = 0; i < 9; i++) { const b = lathe([[0.001, 0], [0.04, 0], [0.04, 0.12], [0.015, 0.16], [0.015, 0.2], [0.001, 0.2]], soft(pick(r, PALETTE), 'glass', { transmission: 0.5, roughness: 0.15 })); b.position.set(-w * 0.28 + i * w * 0.07, 1.72 + row * 0.5, -d / 2 + 0.13); g.add(b); } }
  const poster = pictureFrame({ w: 0.7, h: 0.9, frame: '#ffffff', seed }); poster.position.set(w * 0.3, 2.1, -d / 2 + 0.03); g.add(poster);
  for (const x of [-1.5, 1.5]) { const p = practical('#e8f6ff', 1.2, 5, { radius: 0.5, shape: 'panel' }); p.rotation.x = Math.PI / 2; p.position.set(x, h - 0.01, 0); p.userData.light.position.y = -0.3; g.add(p); }
  return { group: g, bench, benchTop: 0.96 };
}
/** Sunny street: houses, trees, bushes, clouds, road and pavement. */
export function street(scene, { seed = 4, length = 30 } = {}) {
  const r = rng(seed), g = new THREE.Group(); scene.add(g);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), soft('#7cc35a', 'clay')); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; g.add(grass);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4, length * 2), soft('#5a5f6a', 'rubber')); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.005, 0); road.receiveShadow = true; g.add(road);
  for (const s of [-1, 1]) { const pv = roundBox(1.6, 0.12, length * 2, soft('#d8d0c4', 'clay'), 0.04); pv.position.set(s * 2.8, 0.06, 0); g.add(pv); }
  for (let z = -length; z < length; z += 2.5) { const l = roundBox(0.12, 0.01, 1, soft('#f4f0e0', 'plastic'), 0.004); l.position.set(0, 0.012, z); g.add(l); }
  for (let i = 0; i < 10; i++) for (const s of [-1, 1]) {
    const z = -length + i * length / 5 + r() * 2;
    const ho = house({ wall: pick(r, ['#f2d0a4', '#cfe3f0', '#f4c6c0', '#e3f0c8', '#f7e3a3']), roof: pick(r, ['#d0563c', '#4a6fa5', '#8a5a3c', '#5a8a5a']) });
    ho.position.set(s * (8 + r() * 1.5), 0, z); ho.rotation.y = -s * Math.PI / 2; g.add(ho);
    const t = tree({ h: 2.5 + r() * 1.5, seed: i * 7 + (s > 0 ? 1 : 0) }); t.position.set(s * (4.4 + r()), 0, z + 2); g.add(t);
    const b = bush({ s: 0.5 + r() * 0.3, seed: i * 3 + s }); b.position.set(s * 4.2, 0, z - 0.8); g.add(b);
  }
  for (let i = 0; i < 8; i++) { const c = cloud({ s: 2 + r() * 2, seed: i }); c.position.set((r() - 0.5) * 60, 16 + r() * 8, -20 - r() * 40); g.add(c); }
  return { group: g };
}
