// Sets, props and characters for "The Doctor Who Drank the Cure" (shorts-renderer).
import * as THREE from 'three';
import { makeCharacter, canvasTexture, rng, lerp } from 'kit';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };
const cyl = (rt, rb, h, mat, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; };

// ---------- characters ----------
export const marshall = () => makeCharacter({ shirt: '#5b84c4', pants: '#8a7f6a', hairStyle: 'tuft', hair: '#6b4426', coat: '#f4f4f0', tie: '#9c2a2a', shoes: '#3a2a1e' });
export const warren = () => makeCharacter({ shirt: '#cfd8e3', pants: '#555b66', hairStyle: 'side', hair: '#bdbdbd', glasses: true, coat: '#f4f4f0', moustache: true, shoes: '#2a2a2a' });
export const reviewer = (shirt = '#4a4a5a', hair = '#333') => makeCharacter({ shirt, pants: '#2f2f3a', hairStyle: 'bald', hair, glasses: true, tie: '#1f3f7a', shoes: '#111' });

// ---------- textures ----------
const tiles = (a, b, n = 8) => { const t = canvasTexture(512, 512, (g, w) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * w / n, j * w / n, w / n, w / n); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const planks = (base = '#8b5a33') => { const R = rng(4); const t = canvasTexture(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { const l = 0.85 + R() * 0.3; g.fillStyle = shade(base, l); g.fillRect(0, i * h / 8, w, h / 8 - 3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, (i + 1) * h / 8 - 3, w, 3); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(R() * w, i * h / 8 + R() * h / 8, 40 + R() * 80, 2); } } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

// ---------- LAB (night, single lamp) ----------
export function labSet(scene, { night = true } = {}) {
  scene.background = new THREE.Color(night ? '#1b2333' : '#cfe3ee');
  scene.add(new THREE.HemisphereLight(night ? '#8fa6d6' : '#ffffff', '#3a3020', night ? 0.55 : 1.2));
  const lamp = new THREE.PointLight('#ffd59a', night ? 9 : 4, 8, 1.6); lamp.position.set(0.6, 2.1, 0.8); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); scene.add(lamp);
  const fill = new THREE.DirectionalLight('#9fb8ff', night ? 0.6 : 1.5); fill.position.set(-3, 4, 4); scene.add(fill);
  const floorT = tiles('#cfd6d9', '#b9c2c6', 10); floorT.repeat.set(3, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), std('#ffffff', { map: floorT })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = std('#7d9a8f'); const wall = box(12, 4, 0.1, wallM, 0, 2, -1.6); scene.add(wall);
  const sideWall = box(0.1, 4, 8, wallM, -3, 2, 0); scene.add(sideWall);
  // window with night sky + moon
  const winTex = canvasTexture(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, night ? '#0e1a3a' : '#9fd3f5'); gr.addColorStop(1, night ? '#27406e' : '#e6f4fb'); g.fillStyle = gr; g.fillRect(0, 0, w, h); if (night) { g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(w * .7, h * .3, 22, 0, 7); g.fill(); } g.strokeStyle = '#ddd'; g.lineWidth = 10; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: winTex })); win.position.set(-1.2, 2.2, -1.54); scene.add(win);
  // cabinets + shelves with bottles
  for (let i = 0; i < 4; i++) scene.add(box(0.7, 0.9, 0.5, std('#e9e3d6'), 0.6 + i * 0.72, 2.6, -1.3));
  const R = rng(2);
  for (let i = 0; i < 9; i++) { const b = cyl(0.04, 0.05, 0.16 + R() * 0.1, std(['#6aa84f', '#c27c0e', '#3d85c6', '#a61c00'][i % 4], { transparent: true, opacity: 0.85 })); b.position.set(0.4 + i * 0.3, 2.0 + 0.08, -1.35); scene.add(b); }
  scene.add(box(3, 0.04, 0.35, std('#c8b89a'), 1.6, 1.98, -1.35));
  // bench
  const bench = new THREE.Group(); scene.add(bench);
  bench.add(box(2.6, 0.08, 0.8, std('#2f3a40', { roughness: 0.3 }), 0.4, 0.94, -0.4));
  bench.add(box(2.5, 0.9, 0.7, std('#d9d2c2'), 0.4, 0.45, -0.42));
  // microscope
  const mic = new THREE.Group(); mic.position.set(1.3, 0.98, -0.45); scene.add(mic);
  const mm = std('#e8e8e8', { metalness: 0.3, roughness: 0.3 }), md = std('#222', { metalness: 0.5 });
  mic.add(box(0.22, 0.03, 0.28, mm, 0, 0.015)); const arm = box(0.05, 0.3, 0.06, mm, 0, 0.17, -0.09); arm.rotation.x = 0.2; mic.add(arm);
  const tube = cyl(0.03, 0.03, 0.22, md); tube.position.set(0, 0.3, -0.02); tube.rotation.x = -0.4; mic.add(tube); mic.add(box(0.14, 0.02, 0.14, md, 0, 0.12, 0));
  // petri dishes
  for (let i = 0; i < 3; i++) { const p = cyl(0.07, 0.07, 0.015, std('#ffffff', { transparent: true, opacity: 0.6, roughness: 0.1 })); p.position.set(-0.5 + i * 0.18, 0.99, -0.2 + (i % 2) * 0.1); scene.add(p);
    const agar = cyl(0.065, 0.065, 0.008, std('#e8c66a')); agar.position.copy(p.position); scene.add(agar); }
  // desk lamp
  const lampG = new THREE.Group(); lampG.position.set(0.7, 0.98, -0.6); scene.add(lampG);
  lampG.add(cyl(0.08, 0.1, 0.03, md)); const la = cyl(0.012, 0.012, 0.6, md); la.position.set(0, 0.3, 0); la.rotation.z = 0.3; lampG.add(la);
  const shadeM = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 24, 1, true), std('#2f6d4f', { side: THREE.DoubleSide })); shadeM.position.set(-0.1, 0.62, 0.05); shadeM.rotation.z = -0.5; lampG.add(shadeM);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); bulb.position.set(-0.13, 0.57, 0.05); lampG.add(bulb);
  return { lamp, bench, mic };
}

/** Erlenmeyer flask with cloudy broth. Returns {group, liquid}. */
export function flask() {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.11, 0], [0.12, 0.01], [0.12, 0.03], [0.05, 0.19], [0.035, 0.22], [0.035, 0.3], [0.042, 0.31]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshPhysicalMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide }));
  const lp = [[0, 0.005], [0.115, 0.005], [0.115, 0.03], [0.07, 0.12], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x, y));
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(lp, 40), new THREE.MeshStandardMaterial({ color: '#d9b84a', emissive: '#6b5410', emissiveIntensity: 0.4, roughness: 0.3, transparent: true, opacity: 0.92 }));
  g.add(liquid, glass);
  const R = rng(8);                                   // floating specks
  for (let i = 0; i < 40; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff4b0' }));
    const a = R() * 6.28, r = R() * 0.09; s.position.set(Math.cos(a) * r, 0.02 + R() * 0.07, Math.sin(a) * r); g.add(s); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, liquid };
}

// ---------- DESK + REJECTED stamp ----------
export function deskSet(scene) {
  scene.background = new THREE.Color('#2a2420');
  scene.add(new THREE.HemisphereLight('#fff1dc', '#3a2a1a', 0.9));
  const key = new THREE.SpotLight('#ffe2b0', 40, 10, 0.6, 0.5, 1.2); key.position.set(0.8, 3, 1.5); key.target.position.set(0, 0, 0); key.castShadow = true; scene.add(key, key.target);
  const woodT = planks('#7a4a2a'); woodT.repeat.set(2, 2);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), std('#ffffff', { map: woodT, roughness: 0.5 })); desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);
  const paperT = canvasTexture(850, 1100, (g, w, h) => { g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = 'bold 34px serif'; g.fillText('ABSTRACT', 60, 110);
    g.font = '28px serif'; ['Spiral bacteria in the stomachs of', 'patients with gastritis and ulcers', '', 'B. Marshall, J. R. Warren', 'Royal Perth Hospital'].forEach((s, i) => g.fillText(s, 60, 180 + i * 44));
    g.fillStyle = '#555'; for (let i = 0; i < 14; i++) g.fillRect(60, 440 + i * 40, 600 + (i * 37) % 120, 10); });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.8), std('#ffffff', { map: paperT, roughness: 0.9 })); paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.08; paper.position.y = 0.002; paper.receiveShadow = true; scene.add(paper);
  const inkT = canvasTexture(1024, 400, (g, w, h) => { g.strokeStyle = '#d4141c'; g.lineWidth = 22; g.strokeRect(20, 20, w - 40, h - 40); g.fillStyle = '#d4141c'; g.font = 'bold 190px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('REJECTED', w / 2, h / 2 + 10);
    g.globalCompositeOperation = 'destination-out'; const R = rng(5); for (let i = 0; i < 400; i++) { g.fillRect(R() * w, R() * h, 2 + R() * 6, 2 + R() * 6); } });
  const ink = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.22), new THREE.MeshBasicMaterial({ map: inkT, transparent: true })); ink.rotation.x = -Math.PI / 2; ink.rotation.z = 0.22; ink.position.set(0.02, 0.004, 0.05); scene.add(ink);
  const stamp = new THREE.Group(); scene.add(stamp);
  stamp.add(box(0.3, 0.06, 0.14, std('#3a2a1e'), 0, 0.03, 0)); stamp.add(box(0.29, 0.02, 0.13, std('#b01218'), 0, 0.0, 0));
  const handle = cyl(0.03, 0.045, 0.16, std('#6b3d1f')); handle.position.y = 0.14; stamp.add(handle);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), std('#6b3d1f')); knob.position.y = 0.24; stamp.add(knob);
  stamp.rotation.y = 0.22;
  return { paper, ink, stamp, key };
}

// ---------- BARN + PIGLETS ----------
export function piglet(seed = 1) {
  const R = rng(seed), g = new THREE.Group(), pink = std('#f3a6b4', { roughness: 0.8 }), dark = std('#1a1a1a');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.22, 8, 16), pink); body.rotation.z = Math.PI / 2; body.position.y = 0.24; g.add(body);
  const head = new THREE.Group(); head.position.set(0.3, 0.3, 0); g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), pink));
  const snout = cyl(0.06, 0.065, 0.06, std('#f08ea0')); snout.rotation.z = Math.PI / 2; snout.position.x = 0.14; head.add(snout);
  for (const s of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), dark); n.position.set(0.172, 0, s * 0.022); head.add(n);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), dark); e.position.set(0.11, 0.06, s * 0.07); head.add(e);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 12), pink); ear.position.set(0.0, 0.13, s * 0.08); ear.rotation.set(s * 0.4, 0, -0.3); head.add(ear);
  }
  for (const [x, z] of [[0.15, 0.08], [0.15, -0.08], [-0.15, 0.08], [-0.15, -0.08]]) { const l = cyl(0.035, 0.03, 0.14, pink, 10); l.position.set(x, 0.07, z); g.add(l); }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 16, Math.PI * 1.6), pink); tail.position.set(-0.3, 0.3, 0); tail.rotation.y = Math.PI / 2; g.add(tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.head = head; g.userData.phase = R() * 6.28;
  return g;
}
export function barnSet(scene) {
  scene.background = new THREE.Color('#f2c98a');
  scene.add(new THREE.HemisphereLight('#fff4e0', '#6b4a2a', 1.1));
  const sun = new THREE.DirectionalLight('#ffd9a0', 2.6); sun.position.set(-3, 5, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); scene.add(sun);
  const pl = planks('#8a5530'); pl.repeat.set(3, 2);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), std('#ffffff', { map: pl })); back.position.set(0, 2, -2); back.receiveShadow = true; scene.add(back);
  const side = back.clone(); side.rotation.y = Math.PI / 2; side.position.set(-3, 2, 0); scene.add(side);
  const hayT = canvasTexture(512, 512, (g, w, h) => { const R = rng(3); g.fillStyle = '#d9b45a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.strokeStyle = ['#c9a04a', '#e8c873', '#b98f3a'][i % 3]; g.lineWidth = 2; const x = R() * w, y = R() * h, a = R() * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); g.stroke(); } });
  hayT.wrapS = hayT.wrapT = THREE.RepeatWrapping; hayT.repeat.set(4, 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), std('#ffffff', { map: hayT, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  for (const [x, z] of [[-2.2, -1.3], [2.4, -1.5]]) { const bale = box(0.9, 0.5, 0.5, std('#ffffff', { map: hayT }), x, 0.25, z); scene.add(bale); scene.add(box(0.9, 0.5, 0.5, std('#ffffff', { map: hayT }), x + 0.2, 0.75, z)); }
  // fence
  for (let i = 0; i < 9; i++) scene.add(box(0.08, 0.7, 0.08, std('#a0703f'), -2 + i * 0.5, 0.35, -1.0));
  for (const y of [0.3, 0.6]) scene.add(box(4.2, 0.06, 0.04, std('#a0703f'), 0, y, -1.0));
  // window light beam
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 4, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2cc', transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.set(-1.5, 2, -0.5); beam.rotation.z = 0.5; scene.add(beam);
  const trough = box(0.9, 0.12, 0.3, std('#7a5a3a'), 0.3, 0.06, 0.2); scene.add(trough);
  const slop = box(0.84, 0.02, 0.24, std('#d9b84a', { emissive: '#4a3a08' }), 0.3, 0.12, 0.2); scene.add(slop);
  const pigs = [0, 1, 2].map(i => { const p = piglet(i + 3); p.position.set(-0.4 + i * 0.45, 0, 0.55 - (i % 2) * 0.15); p.rotation.y = -Math.PI / 2 + (i - 1) * 0.3; scene.add(p); return p; });
  return { pigs, sun };
}

// ---------- MICRO: stomach lining, mucus, acid, bacterium ----------
export function spiralBug({ color = '#2fb37d', length = 0.9, radius = 0.06, turns = 2.5 } = {}) {
  const pts = []; for (let i = 0; i <= 80; i++) { const u = i / 80; pts.push(new THREE.Vector3((u - 0.5) * length, Math.sin(u * turns * 6.283) * 0.12, Math.cos(u * turns * 6.283) * 0.12)); }
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, radius, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: color, emissiveIntensity: 0.15 }));
  body.castShadow = true; g.add(body);
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {        // flagella
    const f = []; for (let i = 0; i <= 30; i++) { const u = i / 30; f.push(new THREE.Vector3(s * (length / 2 + u * 0.45), Math.sin(u * 12 + k) * 0.05 + (k - .5) * 0.06, Math.cos(u * 9) * 0.04)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(f), 40, 0.008, 6), new THREE.MeshStandardMaterial({ color: '#a8e6c9' })));
  }
  const head = pts[pts.length - 1];
  for (const s of [-1, 1]) {                                       // cartoon eyes on the leading end
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); w.position.copy(head).add(new THREE.Vector3(0.02, 0.05, s * 0.04)); g.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 6), new THREE.MeshBasicMaterial({ color: '#111' })); p.position.copy(w.position).add(new THREE.Vector3(0.025, 0, 0)); g.add(p);
  }
  return g;
}
export function microSet(scene) {
  scene.background = new THREE.Color('#5a0f1e'); scene.fog = new THREE.Fog('#5a0f1e', 4, 12);
  scene.add(new THREE.HemisphereLight('#ffc2c8', '#3a0510', 1.2));
  const key = new THREE.DirectionalLight('#ffe0e0', 2.2); key.position.set(2, 5, 4); key.castShadow = true; scene.add(key);
  // stomach lining: bumpy pink surface (villi-like folds)
  const lin = new THREE.PlaneGeometry(14, 14, 220, 220); const P = lin.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, 0.18 * Math.sin(x * 3.1) * Math.cos(y * 2.7) + 0.08 * Math.sin(x * 9 + y * 7)); }
  lin.computeVertexNormals();
  const lining = new THREE.Mesh(lin, new THREE.MeshStandardMaterial({ color: '#d9536a', roughness: 0.45 })); lining.rotation.x = -Math.PI / 2; lining.receiveShadow = true; scene.add(lining);
  // mucus layer: glossy translucent slab
  const mucus = new THREE.Mesh(new THREE.BoxGeometry(14, 0.9, 14), new THREE.MeshPhysicalMaterial({ color: '#f6e7c8', transparent: true, opacity: 0.35, roughness: 0.1, transmission: 0.2, depthWrite: false }));
  mucus.position.y = 0.45; scene.add(mucus);
  // acid droplets raining above the mucus
  const acid = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: '#c8f04a', emissive: '#6a8a10', emissiveIntensity: 0.6, roughness: 0.2 }), 140);
  scene.add(acid);
  const R = rng(12), drops = Array.from({ length: 140 }, () => ({ x: (R() - .5) * 8, z: (R() - .5) * 6, s: 0.6 + R() * 0.9, o: R() * 10 }));
  const bug = spiralBug(); bug.position.set(0, 0.55, 0.6); scene.add(bug);
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.75, 48, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(vN,vV)),2.2); gl_FragColor=vec4(0.45,0.8,1.0, 0.08+0.6*f); }' }));
  cloud.position.copy(bug.position); scene.add(cloud);
  const dummy = new THREE.Object3D();
  return {
    bug, cloud, acid,
    update(t) {
      drops.forEach((d, i) => { const y = 4 - ((t * d.s * 1.6 + d.o) % 4.2);
        // droplets that hit the cloud bounce off sideways
        let x = d.x, z = d.z; const dx = x - cloud.position.x, dz = z - cloud.position.z, r = Math.hypot(dx, dz);
        if (r < 0.9 && y < 1.6) { const push = (0.9 - r) * 1.2; x += dx / (r || 1) * push; z += dz / (r || 1) * push; }
        dummy.position.set(x, Math.max(y, 0.95), z); dummy.scale.setScalar(y < 1 ? 0.4 : 1); dummy.updateMatrix(); acid.setMatrixAt(i, dummy.matrix); });
      acid.instanceMatrix.needsUpdate = true;
      bug.rotation.x = t * 3; bug.position.y = 0.55 + 0.04 * Math.sin(t * 2);
    },
  };
}
