// Extra sets/props for the Barry Marshall video (realistic look: HDRI + physical materials).
import * as THREE from 'three';
import { canvasTexture, rng, label } from 'kit';
import { spiralBug } from './sets.js';

export const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, ...o });
export const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };
export const boxM = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
export function textTex(lines, { w = 1024, h = 512, bg = '#fbf8ef', color = '#222', font = 'bold 72px serif', align = 'center', lineH = 90, top = null } = {}) {
  return canvasTexture(w, h, (g) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.fillStyle = color; g.font = font; g.textAlign = align; g.textBaseline = 'middle';
    const y0 = top ?? h / 2 - (lines.length - 1) * lineH / 2; lines.forEach((l, i) => g.fillText(l, align === 'center' ? w / 2 : 60, y0 + i * lineH)); });
}

// ---------- PERTH city flyover (stylised-real: river, blocks with lit windows, sunset sky) ----------
export function citySet(scene) {
  scene.fog = new THREE.Fog('#f0b27a', 30, 140);
  const sun = new THREE.DirectionalLight('#ffcf94', 3); sun.position.set(-40, 30, -60); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 200 }); scene.add(sun);
  const ground = mesh(new THREE.PlaneGeometry(400, 400), phys('#7d8f5a', { roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const river = mesh(new THREE.PlaneGeometry(400, 26), phys('#3f78a8', { roughness: 0.08, metalness: 0.2, clearcoat: 1 })); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.05, 22); scene.add(river);
  const R = rng(21); const winT = canvasTexture(128, 256, (g, w, h) => { g.fillStyle = '#c9cfd6'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 14) for (let x = 6; x < w; x += 14) { g.fillStyle = R() < 0.3 ? '#ffe2a8' : '#5d6f86'; g.fillRect(x, y, 8, 9); } });
  winT.wrapS = winT.wrapT = THREE.RepeatWrapping;
  const towers = new THREE.Group(); scene.add(towers);
  for (let i = 0; i < 70; i++) {
    const x = (R() - 0.5) * 110, z = -8 - R() * 60, hgt = 4 + Math.pow(R(), 2) * (Math.abs(x) < 25 ? 38 : 14), w = 3 + R() * 5;
    const t = winT.clone(); t.needsUpdate = true; t.repeat.set(w / 4, hgt / 8);
    towers.add(boxM(w, hgt, w, phys('#ffffff', { map: t, roughness: 0.35, metalness: 0.1 }), x, hgt / 2, z));
  }
  for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 120, z = 6 + R() * 6; const trunk = mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 6), phys('#6b4a2a'), x, 1.5, z); scene.add(trunk);
    const crown = mesh(new THREE.SphereGeometry(1.2, 10, 8), phys('#3f7a3a', { roughness: 0.9 }), x, 3.4, z); crown.scale.y = 0.6; scene.add(crown); }
  // hospital: a long low block with a sign
  const hosp = boxM(26, 9, 10, phys('#e9e2d4', { roughness: 0.7 }), 8, 4.5, -2); scene.add(hosp);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) scene.add(boxM(2, 1.4, 0.1, phys('#7fa3c4', { roughness: 0.1, metalness: 0.4 }), -3 + i * 3.1, 3 + j * 3, 3.06));
  const sign = mesh(new THREE.PlaneGeometry(10, 1.3), new THREE.MeshBasicMaterial({ map: textTex(['ROYAL PERTH HOSPITAL'], { w: 2048, h: 256, bg: '#1f3a5f', color: '#ffffff', font: 'bold 150px sans-serif' }) }), 8, 7.6, 3.1); scene.add(sign);
  return { sun, hosp };
}

// ---------- HALL (corridor / lecture / conference / Nobel stage) ----------
export function hallSet(scene, variant = 'lecture') {
  const floorT = canvasTexture(512, 512, (g, w) => { const R = rng(7); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const v = 200 + R() * 30; g.fillStyle = variant === 'stage' ? `rgb(${v * .55},${v * .32},${v * .2})` : `rgb(${v},${v},${v - 8})`; g.fillRect(i * 32, j * 32, 31, 31); } });
  floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(4, 4);
  const floor = mesh(new THREE.PlaneGeometry(30, 30), phys('#ffffff', { map: floorT, roughness: variant === 'stage' ? 0.25 : 0.4, clearcoat: 0.3 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wallC = { corridor: '#d8e3e0', lecture: '#c9b79c', conference: '#3c4a62', stage: '#2a1a12' }[variant];
  if (variant !== 'corridor') scene.add(boxM(30, 8, 0.2, phys(wallC, { roughness: 0.8 }), 0, 4, -4));
  if (variant === 'corridor') {
    scene.add(boxM(0.2, 6, 40, phys(wallC), -2.2, 3, -10)); scene.add(boxM(0.2, 6, 40, phys(wallC), 2.2, 3, -10));
    for (let i = 0; i < 8; i++) { scene.add(mesh(new THREE.BoxGeometry(1.2, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: '#fffbee' }), 0, 3, 2 - i * 4));
      const l = new THREE.PointLight('#fff4dd', 4, 7, 1.5); l.position.set(0, 2.9, 2 - i * 4); scene.add(l);
      scene.add(boxM(0.08, 2.1, 1, phys('#8a6a4a'), -2.1, 1.05, -1 - i * 4)); }
  }
  if (variant === 'stage') {
    for (let i = -3; i <= 3; i++) { const s = new THREE.SpotLight('#ffd27a', 60, 20, 0.35, 0.6, 1.4); s.position.set(i * 2, 7, 4); s.target.position.set(i * 0.6, 0, 0); s.castShadow = i === 0; scene.add(s, s.target); }
    const curtain = canvasTexture(512, 512, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 0.55 + 0.45 * Math.sin(x * 0.12); g.fillStyle = `rgb(${120 * v},${18 * v},${24 * v})`; g.fillRect(x, 0, 1, h); } });
    scene.add(mesh(new THREE.PlaneGeometry(30, 8), phys('#ffffff', { map: curtain, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#ff6060') }), 0, 4, -3.85));
    scene.add(boxM(12, 0.6, 5, phys('#3a2414', { roughness: 0.3, clearcoat: 0.6 }), 0, 0.3, -1.2));
  }
  return { floor };
}
export function boardTexture() {      // lecture diagram: stomach outline + arrows
  return canvasTexture(1024, 768, (g, w, h) => {
    g.fillStyle = '#1e3b2c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f0f0e8'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(380, 80); g.bezierCurveTo(330, 260, 260, 300, 300, 470); g.bezierCurveTo(340, 640, 640, 660, 700, 520); g.bezierCurveTo(760, 380, 620, 330, 560, 260); g.bezierCurveTo(500, 190, 470, 130, 470, 80); g.stroke();
    g.font = 'bold 54px sans-serif'; g.fillStyle = '#f0f0e8'; g.fillText('ULCER', 470, 470); g.beginPath(); g.arc(520, 430, 26, 0, 7); g.stroke();
  });
}

// ---------- CYAN product studio ----------
export function studioSet(scene, color = '#5fc8e8') {
  scene.background = new THREE.Color(color);
  const sweep = mesh(new THREE.CylinderGeometry(12, 12, 30, 64, 1, true, Math.PI * 0.5, Math.PI), phys(color, { roughness: 0.9, side: THREE.BackSide })); sweep.rotation.z = Math.PI / 2; sweep.position.set(0, 11.6, 0); scene.add(sweep);
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(3, 6, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key);
  return { key };
}

// ---------- tunnel (throat / stomach fly-through) ----------
export function tunnelSet(scene) {
  scene.background = new THREE.Color('#2a0508'); scene.fog = new THREE.Fog('#2a0508', 1, 9);
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector3(Math.sin(u * 5) * 0.6, -u * 12, Math.cos(u * 4) * 0.5 - u * 2)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 400, 0.9, 48, false); const P = geo.attributes.position, N = geo.attributes.normal;
  for (let i = 0; i < P.count; i++) { const ring = Math.floor(i / 49), k = 0.12 * Math.sin(ring * 0.9) + 0.05 * Math.sin(i * 0.37); P.setXYZ(i, P.getX(i) - N.getX(i) * k, P.getY(i) - N.getY(i) * k, P.getZ(i) - N.getZ(i) * k); }
  geo.computeVertexNormals();
  const mat = phys('#e46a78', { side: THREE.BackSide, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.6, sheenColor: new THREE.Color('#ffb0b8') });
  scene.add(new THREE.Mesh(geo, mat));
  const headlamp = new THREE.PointLight('#ffffff', 6, 6, 1.2); scene.add(headlamp);
  scene.add(new THREE.AmbientLight('#ff8a8a', 0.4));
  return { curve, mat, headlamp };
}

// ---------- microscope slide view ----------
export function slideSet(scene) {
  scene.background = new THREE.Color('#000000');
  const tissue = canvasTexture(2048, 2048, (g, w, h) => { const R = rng(31); g.fillStyle = '#f1b9c8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const x = R() * w, y = R() * h, r = 18 + R() * 30; g.fillStyle = `rgba(${200 + R() * 40},${110 + R() * 40},${150 + R() * 40},0.55)`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = 'rgba(90,40,120,0.55)'; g.beginPath(); g.arc(x + r * 0.2, y, r * 0.35, 0, 7); g.fill(); } });
  const plane = mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: tissue })); scene.add(plane);
  const bugs = []; const R = rng(9);
  for (let i = 0; i < 14; i++) { const b = spiralBug({ color: '#3a1a40', radius: 0.035, length: 0.55 }); b.scale.setScalar(0.5); b.position.set((R() - .5) * 2.4, (R() - .5) * 2.4, 0.05); b.rotation.z = R() * 6.28; b.userData.p = R() * 6; scene.add(b); bugs.push(b); }
  scene.add(new THREE.AmbientLight('#ffffff', 2));
  return { bugs };
}
/** Black mask with a round hole, placed in front of the camera (eyepiece look). */
export function eyepieceMask(camera, radius = 0.36) {
  const shape = new THREE.Shape(); shape.moveTo(-5, -5); shape.lineTo(5, -5); shape.lineTo(5, 5); shape.lineTo(-5, 5);
  const hole = new THREE.Path(); hole.absarc(0, 0, radius, 0, Math.PI * 2, true); shape.holes.push(hole);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 64), new THREE.MeshBasicMaterial({ color: '#000' })); m.position.z = -1; m.renderOrder = 99; m.material.depthTest = false; camera.add(m); return m;
}

// ---------- props ----------
export function typewriter() {
  const g = new THREE.Group(), body = phys('#2c4a3a', { roughness: 0.35, clearcoat: 0.6 }), key = phys('#f2f0e6', { roughness: 0.3 });
  g.add(boxM(0.5, 0.12, 0.38, body, 0, 0.06, 0)); g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 24), phys('#111'), 0, 0.17, -0.13)).rotation.z = Math.PI / 2;
  const keys = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) { const k = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 16), key, -0.18 + c * 0.04 + r * 0.01, 0.13, 0.05 + r * 0.045); g.add(k); keys.push(k); }
  const paper = mesh(new THREE.PlaneGeometry(0.3, 0.32), phys('#ffffff', { map: textTex(['ABSTRACT', 'Spiral bacteria in', 'gastritis and ulcers'], { w: 512, h: 560, font: 'bold 40px serif', lineH: 60, top: 80 }), side: THREE.DoubleSide }), 0, 0.33, -0.16); paper.rotation.x = -0.25; g.add(paper);
  return { group: g, keys };
}
export function barChart() {
  const g = new THREE.Group(), bars = [], R = rng(17);
  const vals = Array.from({ length: 20 }, () => 0.3 + R() * 1.7).sort((a, b) => b - a);
  vals.forEach((v, i) => { const b = boxM(0.16, 1, 0.16, phys(i === 18 ? '#e0242c' : '#f4f4f4', { roughness: 0.4, clearcoat: 0.5 }), -1.6 + i * 0.17, 0, 0); b.userData.v = v; g.add(b); bars.push(b); });
  return { group: g, bars, ours: bars[18] };
}
export function calendar() {
  const tex = d => textTex(['DAY', String(d)], { w: 512, h: 512, bg: '#ffffff', color: '#c0141c', font: 'bold 150px sans-serif', lineH: 170 });
  const pages = [1, 2, 3, 4].map(tex);
  const m = mesh(new THREE.PlaneGeometry(0.35, 0.35), new THREE.MeshBasicMaterial({ map: pages[0] }));
  return { mesh: m, set(i) { m.material.map = pages[Math.min(3, i)]; } };
}
export function wallClock() {
  const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 48), phys('#f6f6f2'), 0, 0, 0)).rotation.x = Math.PI / 2;
  g.add(mesh(new THREE.TorusGeometry(0.22, 0.02, 12, 48), phys('#222', { metalness: 0.6 })));
  const hh = boxM(0.012, 0.11, 0.01, phys('#111'), 0, 0.05, 0.03), mh = boxM(0.008, 0.17, 0.01, phys('#111'), 0, 0.08, 0.035);
  const ph = new THREE.Group(); ph.position.z = 0.03; ph.add(hh); const pm = new THREE.Group(); pm.position.z = 0.035; pm.add(mh); g.add(ph, pm);
  return { group: g, set(t) { pm.rotation.z = -t * 6; ph.rotation.z = -t * 0.5; } };
}
export function journalTexture(highlight = 0) {
  return canvasTexture(900, 1200, (g, w, h) => { g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#222';
    g.font = 'bold 34px serif'; g.fillText('THE MEDICAL JOURNAL OF AUSTRALIA', 60, 80); g.fillRect(60, 100, 780, 4); g.font = '26px serif'; g.fillText('April 1985', 60, 140);
    g.font = 'bold 30px serif'; g.fillText('Attempt to fulfil Koch’s postulates', 60, 200);
    const text = ['To test the hypothesis, the subject, a healthy', 'volunteer, ingested a culture of the organism.', 'Within days, the subject developed an acute', 'illness with vomiting and halitosis.'];
    g.font = '27px serif'; text.forEach((l, i) => { if (highlight > 0 && /subject/.test(l)) { const x = 60 + g.measureText(l.split('the subject')[0]).width; const ww = g.measureText('the subject').width * highlight;
      g.fillStyle = 'rgba(255,230,40,0.75)'; g.fillRect(x, 250 + i * 46 - 26, ww, 34); g.fillStyle = '#222'; } g.fillText(l, 60, 250 + i * 46); });
    for (let i = 0; i < 16; i += 1) { g.fillStyle = '#777'; g.fillRect(60, 470 + i * 40, 680 + (i * 53) % 100, 9); } });
}
export function confetti(n = 220) {
  const R = rng(44), g = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.6, roughness: 0.3 }), n);
  const data = Array.from({ length: n }, () => ({ x: (R() - .5) * 6, z: (R() - .5) * 3, s: 0.6 + R(), r: R() * 6, c: new THREE.Color().setHSL(0.1 + R() * 0.08, 0.9, 0.55 + R() * 0.2) }));
  data.forEach((d, i) => g.setColorAt(i, d.c)); const o = new THREE.Object3D();
  return { mesh: g, update(t) { data.forEach((d, i) => { o.position.set(d.x + 0.2 * Math.sin(t * 2 + d.r), 6 - ((t * d.s) % 6.5), d.z); o.rotation.set(t * 3 + d.r, t * 2, d.r); o.updateMatrix(); g.setMatrixAt(i, o.matrix); }); g.instanceMatrix.needsUpdate = true; } };
}
export function pill(type = 'antacid') {
  if (type === 'antacid') return mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.14, 48), phys('#f2f2ea', { roughness: 0.95 }));
  const g = new THREE.Group(); const a = mesh(new THREE.CapsuleGeometry(0.16, 0.3, 8, 24), phys('#e03030', { clearcoat: 1, roughness: 0.2 })); const b = mesh(new THREE.CapsuleGeometry(0.16, 0.3, 8, 24), phys('#f4f4f4', { clearcoat: 1, roughness: 0.2 }));
  a.position.y = 0.16; b.position.y = -0.16; g.add(a, b); g.userData.halves = [a, b]; return g;
}
export { label };
