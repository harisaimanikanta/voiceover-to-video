// v2 sets: chalkboard, paper canyon, years tunnel, monitor, stomach chamber, audience, envelope.
import * as THREE from 'three';
import { canvasTexture, rng } from 'kit';
import { phys, mesh, boxM, textTex } from './sets2.js';
import { spiralBug } from './sets.js';

export function chalkboard({ w = 2.2, h = 1.3 } = {}) {
  const tex = canvasTexture(1400, 820, (g, W, H) => {
    g.fillStyle = '#1f3a2c'; g.fillRect(0, 0, W, H); g.strokeStyle = '#efefe6'; g.fillStyle = '#efefe6'; g.lineWidth = 7; g.lineCap = 'round';
    g.font = 'bold 82px "Comic Sans MS", cursive, sans-serif'; g.fillText('STRESS?', 70, 150); g.fillText('BACTERIA!', 820, 150);
    g.beginPath(); g.moveTo(420, 120); g.lineTo(780, 120); g.moveTo(760, 100); g.lineTo(790, 120); g.lineTo(760, 140); g.stroke();
    g.beginPath(); g.ellipse(700, 470, 230, 170, -0.3, 0, 7); g.stroke();
    const R = rng(3); for (let i = 0; i < 9; i++) { const x = 560 + R() * 260, y = 380 + R() * 180; g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(x + k * 10, y + Math.sin(k * 2) * 10); g.stroke(); }
    g.font = 'bold 54px sans-serif'; g.fillText('H. pylori ?', 560, 720); g.fillText('ULCER', 120, 520); g.beginPath(); g.arc(240, 600, 40, 0, 7); g.stroke();
    g.strokeStyle = '#ff7a7a'; g.beginPath(); g.moveTo(60, 70); g.lineTo(400, 180); g.stroke();
  });
  const g = new THREE.Group();
  g.add(mesh(new THREE.PlaneGeometry(w, h), phys('#ffffff', { map: tex, roughness: 0.95 })));
  const frame = phys('#7a5230', { roughness: 0.5 });
  g.add(boxM(w + 0.1, 0.06, 0.05, frame, 0, h / 2, 0), boxM(w + 0.1, 0.06, 0.05, frame, 0, -h / 2, 0), boxM(0.06, h, 0.05, frame, -w / 2, 0, 0), boxM(0.06, h, 0.05, frame, w / 2, 0, 0));
  g.add(boxM(w, 0.04, 0.12, frame, 0, -h / 2 - 0.02, 0.06));
  return g;
}

/** Canyon of paper stacks (the stacks are the bar chart); ours is the short red-tagged one. */
export function paperCanyon(scene) {
  scene.background = new THREE.Color('#2a3550'); scene.fog = new THREE.Fog('#2a3550', 8, 34);
  scene.add(new THREE.HemisphereLight('#bcd2ff', '#20140a', 1.6));
  const key = new THREE.DirectionalLight('#ffe2b8', 3.2); key.position.set(4, 20, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, far: 60 }); scene.add(key);
  const side = canvasTexture(256, 1024, (g, W, H) => { for (let y = 0; y < H; y += 3) { const v = 225 + ((y * 37) % 23); g.fillStyle = `rgb(${v},${v - 4},${v - 14})`; g.fillRect(0, y, W, 2); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y + 2, W, 1); } });
  side.wrapS = side.wrapT = THREE.RepeatWrapping;
  const R = rng(5), stacks = [];
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2, r = 2.6 + R() * 2.5, h = 3 + Math.pow(R(), 0.7) * 14;
    const t = side.clone(); t.needsUpdate = true; t.repeat.set(1, h / 3);
    const s = boxM(0.85, h, 1.1, phys('#ffffff', { map: t, roughness: 0.9 }), Math.cos(a) * r, h / 2, Math.sin(a) * r); s.rotation.y = R(); scene.add(s); stacks.push(s);
  }
  scene.add(mesh(new THREE.CircleGeometry(12, 64), phys('#2a2a33', { roughness: 0.9 }))).rotation.x = -Math.PI / 2;
  const ours = boxM(0.85, 0.9, 1.1, phys('#ffffff', { map: side, roughness: 0.9 }), 0, 0.45, 0); scene.add(ours);
  const tag = mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: textTex(['BOTTOM 10%'], { w: 1024, h: 256, bg: '#d4141c', color: '#ffffff', font: 'bold 150px sans-serif' }), transparent: true }), 0, 1.25, 0.6); scene.add(tag);
  const glow = new THREE.PointLight('#ff3030', 6, 4, 1.5); glow.position.set(0, 1.2, 0.9); scene.add(glow);
  return { ours, tag, glow };
}

/** Flying calendar pages tunnel (1984 → 2005). */
export function yearsTunnel(scene) {
  scene.background = new THREE.Color('#4a2a0c'); scene.fog = new THREE.Fog('#4a2a0c', 4, 30);
  scene.add(new THREE.AmbientLight('#ffe2b0', 2.2)); const pl = new THREE.PointLight('#ffd27a', 30, 30, 1.2); pl.position.set(0, 0, 2); scene.add(pl);
  const pages = [], R = rng(8);
  for (let i = 0; i < 160; i++) {
    const y = 1984 + Math.floor(R() * 22);
    const p = mesh(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshStandardMaterial({ map: textTex([String(y)], { w: 256, h: 320, bg: '#f7f1e3', color: '#b01818', font: 'bold 90px serif' }), side: THREE.DoubleSide, emissive: '#3a2a10', emissiveIntensity: 0.4 }));
    const a = R() * Math.PI * 2, r = 1 + R() * 2.2; p.position.set(Math.cos(a) * r, Math.sin(a) * r, -i * 0.25); p.rotation.set(R() * 3, R() * 3, R() * 3); p.userData = { a, r, s: 0.5 + R(), z0: -i * 0.25 }; scene.add(p); pages.push(p);
  }
  const yearPlane = mesh(new THREE.PlaneGeometry(3, 1.4), new THREE.MeshBasicMaterial({ map: textTex(['1984'], { w: 1024, h: 480, bg: null, color: '#ffd76a', font: 'bold 330px serif' }), transparent: true }));
  scene.add(yearPlane);
  const texCache = {};
  return { pages, yearPlane, setYear(y) { if (yearPlane.userData.y === y) return; texCache[y] ||= textTex([String(y)], { w: 1024, h: 480, bg: null, color: '#ffd76a', font: 'bold 330px serif' }); yearPlane.material.map = texCache[y]; yearPlane.userData.y = y; },
    update(t) { pages.forEach(p => { const u = p.userData; p.rotation.x += 0.0; p.rotation.set(t * u.s + u.a, t * 0.7 * u.s, u.a); p.position.set(Math.cos(u.a + t * 0.3) * u.r, Math.sin(u.a + t * 0.3) * u.r, u.z0); }); } };
}

/** Endoscopy room monitor; screen texture swaps to a live render target view. */
export function monitorSet(scene) {
  scene.background = new THREE.Color('#0d1a22');
  scene.add(new THREE.HemisphereLight('#9fd0ff', '#102030', 0.6));
  const key = new THREE.SpotLight('#cfe8ff', 25, 10, 0.7, 0.6, 1.3); key.position.set(-1.5, 3, 2); key.target.position.set(0, 1.2, 0); scene.add(key, key.target);
  const body = boxM(1.3, 0.9, 0.12, phys('#2a2f36', { roughness: 0.35, clearcoat: 0.6 }), 0, 1.4, 0); scene.add(body);
  const screen = mesh(new THREE.PlaneGeometry(1.18, 0.78), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0, 1.4, 0.065); scene.add(screen);
  const glow = new THREE.PointLight('#ff6a7a', 4, 3, 1.5); glow.position.set(0, 1.4, 0.6); scene.add(glow);
  scene.add(boxM(0.1, 0.8, 0.1, phys('#555'), 0, 0.6, -0.05), boxM(0.6, 0.06, 0.5, phys('#555'), 0, 0.2, 0));
  for (let i = 0; i < 6; i++) scene.add(boxM(0.35, 0.18, 0.3, phys(['#d9dfe6', '#c9d2dc'][i % 2], { roughness: 0.4 }), -1.6 + (i % 3) * 0.4, 0.2 + Math.floor(i / 3) * 0.2, -0.4));
  const bed = boxM(0.9, 0.12, 2.0, phys('#e7eef4', { roughness: 0.6 }), 1.6, 0.8, 0.3); scene.add(bed);
  const leds = []; for (let i = 0; i < 5; i++) { const l = mesh(new THREE.SphereGeometry(0.015, 8, 6), new THREE.MeshBasicMaterial({ color: ['#3cff7a', '#ffb43c'][i % 2] }), -0.5 + i * 0.06, 1.0, 0.07); scene.add(l); leds.push(l); }
  return { screen, glow };
}

/** Inside of the stomach: a big soft chamber with folds (rugae) and a glossy wet surface. */
export function stomachChamber(scene, { inflamed = false } = {}) {
  scene.background = new THREE.Color(inflamed ? '#2a0306' : '#3a0a12'); scene.fog = new THREE.Fog(scene.background, 2, 9);
  const geo = new THREE.SphereGeometry(4, 160, 120); const P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i); const n = v.clone().normalize();
    const k = 0.22 * Math.sin(n.x * 9 + n.y * 3) * Math.cos(n.z * 8) + 0.08 * Math.sin(n.y * 23 + n.x * 7); P.setXYZ(i, v.x - n.x * k, v.y - n.y * k, v.z - n.z * k); }
  geo.computeVertexNormals(); geo.scale(1, 0.8, 1.2);
  const mat = phys(inflamed ? '#c21f35' : '#ea8a96', { side: THREE.BackSide, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.7, sheenColor: new THREE.Color('#ffc0c8'),
    emissive: inflamed ? '#5a0010' : '#2a0508', emissiveIntensity: inflamed ? 0.6 : 0.25 });
  const wall = new THREE.Mesh(geo, mat); scene.add(wall);
  const lamp = new THREE.PointLight('#ffe8e0', 12, 10, 1.3); scene.add(lamp);
  scene.add(new THREE.AmbientLight('#ff9aa8', 0.35));
  const pool = mesh(new THREE.CircleGeometry(3.2, 64), phys('#e8d76a', { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85, emissive: '#5a4a08', emissiveIntensity: 0.5 }), 0, -2.6, 0); pool.rotation.x = -Math.PI / 2; scene.add(pool);
  return { wall, mat, lamp, pool };
}

/** Silhouetted audience heads for the foreground (fills dead space, adds depth). */
export function audience(n = 14, z = 2.2) {
  const g = new THREE.Group(), m = phys('#0c0806', { roughness: 0.9 }), R = rng(14);
  for (let i = 0; i < n; i++) { const x = (i - n / 2) * 0.42 + R() * 0.1, y = 0.95 + R() * 0.1;
    g.add(mesh(new THREE.SphereGeometry(0.15, 20, 14), m, x, y + 0.3, z + R() * 0.3)); g.add(mesh(new THREE.CapsuleGeometry(0.2, 0.3, 6, 12), m, x, y - 0.05, z + R() * 0.3)); }
  return g;
}
export function envelope() {
  const g = new THREE.Group(); g.add(boxM(0.36, 0.005, 0.24, phys('#efe4c8', { roughness: 0.8 }), 0, 0, 0));
  const flap = mesh(new THREE.ConeGeometry(0.21, 0.12, 3), phys('#e6d8b6')); flap.rotation.set(Math.PI / 2, 0, 0); flap.scale.set(1, 1, 0.03); flap.position.set(0, 0.004, -0.06); g.add(flap);
  const stampM = boxM(0.05, 0.006, 0.06, phys('#c0141c'), 0.13, 0.004, 0.07); g.add(stampM);
  return g;
}
export { spiralBug };
