// Realistic-proportion human for shorts-renderer, built on mannequin-js (GPL-3.0, npm dependency; not vendored).
// Skin/fabric/leather physical materials + face (eyes, brows, nose, ears, mouth), hair, glasses, moustache, lab coat, tie.
// Pose with degrees through the mannequin joints:  h.m.l_arm.raise = 30; h.m.r_elbow.bend = 90; h.m.head.nod = -10; h.m.torso.bend = 5 …
import * as THREE from 'three';
import { Male } from '/node_modules/mannequin-js/src/bodies/Male.js';

const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...o });
let noiseNormal = null;
function clothNormal() {                     // procedural woven-fabric normal map (shared)
  if (noiseNormal) return noiseNormal;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4, nx = Math.sin(x * 0.8) * 0.5 + (Math.random() - .5) * 0.25, ny = Math.sin(y * 0.8) * 0.5 + (Math.random() - .5) * 0.25;
    img.data[i] = 128 + nx * 40; img.data[i + 1] = 128 + ny * 40; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseNormal = new THREE.CanvasTexture(c); noiseNormal.wrapS = noiseNormal.wrapT = THREE.RepeatWrapping; noiseNormal.repeat.set(6, 6);
  return noiseNormal;
}

export function makeHuman({ skin = '#d9a07e', coat = null, shirt = '#6f8fc7', trousers = '#4a4a52', shoes = '#2b1d14', hair = '#4a2e1a',
  hairStyle = 'short', glasses = false, moustache = false, tie = null, eyes = '#4a3424', height = 1.78 } = {}) {
  const m = new Male();
  const root = new THREE.Group(); root.add(m);
  const mats = {
    skin: phys(skin, { roughness: 0.48, sheen: 0.6, sheenColor: new THREE.Color('#ff8a70'), sheenRoughness: 0.5, clearcoat: 0.05 }),
    top: phys(coat || shirt, { roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), normalMap: clothNormal(), normalScale: new THREE.Vector2(0.35, 0.35) }),
    shirt: phys(shirt, { roughness: 0.8, normalMap: clothNormal(), normalScale: new THREE.Vector2(0.3, 0.3) }),
    trousers: phys(trousers, { roughness: 0.9, sheen: 0.3, normalMap: clothNormal(), normalScale: new THREE.Vector2(0.4, 0.4) }),
    shoes: phys(shoes, { roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    hair: phys(hair, { roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(hair).offsetHSL(0, 0, 0.25), sheenRoughness: 0.3 }),
    dark: phys('#141414', { roughness: 0.3 }),
    white: phys('#f4f1ea', { roughness: 0.15, clearcoat: 1 }),
    iris: phys(eyes, { roughness: 0.2, clearcoat: 1 }),
    lip: phys(new THREE.Color(skin).offsetHSL(-0.02, 0.1, -0.12), { roughness: 0.4 }),
    tie: phys(tie || '#8a1f1f', { roughness: 0.5, sheen: 0.6 }),
  };
  const setImg = (organ, mat) => organ.image && organ.image.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = o.receiveShadow = true; } });
  for (const k of ['head', 'neck', 'l_wrist', 'r_wrist']) setImg(m[k], mats.skin);
  for (let s of ['l', 'r']) for (let i = 0; i < 5; i++) { const f = m[`${s}_finger_${i}`]; if (f) { setImg(f, mats.skin); f.traverse(o => { if (o.isMesh) o.material = mats.skin; }); } }
  for (const k of ['l_nails', 'r_nails']) if (m[k]) m[k].traverse?.(o => { if (o.isMesh) o.material = mats.skin; });
  for (const k of ['torso', 'l_arm', 'r_arm', 'l_elbow', 'r_elbow']) setImg(m[k], mats.top);
  for (const k of ['pelvis', 'l_leg', 'r_leg', 'l_knee', 'r_knee']) setImg(m[k], mats.trousers);
  for (const k of ['l_ankle', 'r_ankle']) setImg(m[k], mats.shoes);
  setImg(m.body, mats.trousers);

  // normalise size and stand on y=0, facing +z
  m.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(m);
  const sc = height / (box.max.y - box.min.y); m.scale.multiplyScalar(sc);
  m.updateMatrixWorld(true);
  const toe = new THREE.Box3().setFromObject(m.l_ankle.image).getCenter(new THREE.Vector3()), ank = m.l_ankle.getWorldPosition(new THREE.Vector3());
  const fwd = toe.sub(ank).setY(0).normalize();
  m.rotation.y = Math.atan2(fwd.x, fwd.z) * -1 + 0;          // rotate so the toes point to +z
  m.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(m); m.position.y -= box.min.y; m.updateMatrixWorld(true);

  // ---- face & hair, built in world space then parented to the head (keeps transforms) ----
  const hb = new THREE.Box3().setFromObject(m.head.image), hc = hb.getCenter(new THREE.Vector3()), hs = hb.getSize(new THREE.Vector3());
  const front = hb.max.z, R = hs.x / 2;
  const add = (mesh, x, y, z) => { mesh.position.set(hc.x + x, hc.y + y, z); mesh.castShadow = true; root.add(mesh); root.updateMatrixWorld(true); THREE.Object3D.prototype.attach.call(m.head, mesh); return mesh; };
  const parts = {};
  for (const s of [-1, 1]) {
    const eyeY = hs.y * 0.06, eyeX = R * 0.34, ez = front - R * 0.16;
    add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.11, 24, 16), mats.white), s * eyeX, eyeY, ez);
    add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.06, 16, 12), mats.iris), s * eyeX, eyeY, ez + R * 0.068);
    add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.03, 12, 8), mats.dark), s * eyeX, eyeY, ez + R * 0.1);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.035, R * 0.28, 4, 8), mats.hair); brow.rotation.z = Math.PI / 2 + s * 0.12;
    parts['brow' + s] = add(brow, s * eyeX, eyeY + R * 0.2, front - R * 0.1);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 16, 12), mats.skin); ear.scale.set(0.45, 1, 0.75); add(ear, s * R * 0.98, hs.y * 0.0, hc.z);
  }
  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.08, R * 0.22, 4, 12), mats.skin); nose.rotation.x = 0.35; add(nose, 0, -hs.y * 0.05, front - R * 0.02);
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.03, R * 0.3, 4, 8), mats.lip); mouth.rotation.z = Math.PI / 2; parts.mouth = add(mouth, 0, -hs.y * 0.2, front - R * 0.07);
  const mouthO = new THREE.Mesh(new THREE.SphereGeometry(R * 0.09, 16, 12), mats.dark); mouthO.scale.set(1, 1.3, 0.4); mouthO.visible = false; parts.mouthO = add(mouthO, 0, -hs.y * 0.2, front - R * 0.1);
  if (hairStyle !== 'none') {
    const cap = new THREE.SphereGeometry(R * 1.07, 48, 32, 0, Math.PI * 2, 0, hairStyle === 'bald' ? 0 : Math.PI * 0.55);
    const P = cap.attributes.position; for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i); const n = 1 + 0.04 * Math.sin(v.x * 80) * Math.sin(v.z * 70) + 0.03 * Math.sin(v.y * 90); P.setXYZ(i, v.x * n, v.y * n, v.z * n); }
    cap.computeVertexNormals();
    const hm = new THREE.Mesh(cap, mats.hair); hm.scale.set(1, hairStyle === 'side' ? 0.85 : 1.05, 1.08); hm.rotation.x = -0.45;
    add(hm, 0, hs.y * 0.08, hc.z - R * 0.08);
    if (hairStyle === 'side') hm.material = mats.hair;
  }
  if (moustache) { const mo = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.06, R * 0.36, 4, 8), mats.hair); mo.rotation.z = Math.PI / 2; add(mo, 0, -hs.y * 0.13, front - R * 0.06); }
  if (glasses) for (const s of [-1, 1]) {
    add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.22, R * 0.025, 8, 32), mats.dark), s * R * 0.36, hs.y * 0.06, front + R * 0.02);
    if (s > 0) add(new THREE.Mesh(new THREE.BoxGeometry(R * 0.3, R * 0.03, R * 0.03), mats.dark), 0, hs.y * 0.08, front + R * 0.03);
  }
  // ---- lab coat skirt + tie, parented to the torso ----
  const tb = new THREE.Box3().setFromObject(m.torso.image), tc = tb.getCenter(new THREE.Vector3()), ts = tb.getSize(new THREE.Vector3());
  const addT = (mesh, pos) => { mesh.position.copy(pos); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); root.updateMatrixWorld(true); THREE.Object3D.prototype.attach.call(m.torso, mesh); return mesh; };
  if (coat) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(ts.x * 0.4, ts.x * 0.46, height * 0.3, 40, 6, true, Math.PI * 0.62, Math.PI * 1.76),
      phys(coat, { roughness: 0.85, side: THREE.DoubleSide, normalMap: clothNormal(), normalScale: new THREE.Vector2(0.35, 0.35) }));
    skirt.scale.z = ts.z / ts.x * 1.15;
    addT(skirt, new THREE.Vector3(tc.x, tb.min.y - height * 0.08, tc.z));
  }
  if (tie) { const t = new THREE.Mesh(new THREE.CylinderGeometry(ts.x * 0.035, ts.x * 0.06, ts.y * 0.42, 4), mats.tie); t.scale.z = 0.25; t.rotation.x = -0.18; addT(t, new THREE.Vector3(tc.x, tc.y + ts.y * 0.14, tb.max.z - ts.z * 0.06)); }

  return {
    group: root, m, mats,
    /** 'neutral' | 'o' (shock) | 'frown' | 'smile' */
    face(expr) {
      parts.mouth.visible = expr !== 'o'; parts.mouthO.visible = expr === 'o';
      if (!parts._b) parts._b = { m: parts.mouth.position.clone(), b1: parts['brow-1'].position.clone(), b2: parts['brow1'].position.clone() };
      const lift = expr === 'o' ? 0.012 : expr === 'frown' ? -0.008 : 0;    // brows up for shock, down for frown (head-local units scale-free)
      parts['brow-1'].position.copy(parts._b.b1); parts['brow1'].position.copy(parts._b.b2);
      parts['brow-1'].position.y += lift / this.m.head.matrixWorld.getMaxScaleOnAxis(); parts['brow1'].position.y += lift / this.m.head.matrixWorld.getMaxScaleOnAxis();
    },
    /** reset to a relaxed standing pose */
    rest() { const M = m; M.torso.bend = 0; M.torso.turn = 0; M.torso.tilt = 0; M.head.nod = 0; M.head.turn = 0; M.head.tilt = 0;
      for (const s of ['l', 'r']) { M[s + '_arm'].raise = 0; M[s + '_arm'].straddle = 8; M[s + '_arm'].turn = 0; M[s + '_elbow'].bend = 15; M[s + '_wrist'].bend = 0; M[s + '_fingers'].bend = 15;
        M[s + '_leg'].raise = 0; M[s + '_leg'].straddle = 4; M[s + '_knee'].bend = 0; } },
    idle(t, amt = 1) { m.torso.bend = 1.5 * Math.sin(t * 1.6) * amt; m.head.turn = 4 * Math.sin(t * 0.5) * amt; m.head.nod = 2 * Math.sin(t * 0.8) * amt; },
    setOpacity(a) { root.traverse(o => { if (o.isMesh) { o.material.transparent = a < 1; o.material.opacity = a; o.material.depthWrite = a > 0.95; } }); },
  };
}
