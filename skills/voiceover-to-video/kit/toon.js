// Cartoon cast v2 for shorts-renderer: consistent explainer-style characters with expressive faces and hand sockets.
// Joints (Groups, rotate in radians): pelvis, chest, neck, head, shoulderL/R, elbowL/R, wristL/R (hand sockets), hipL/R, kneeL/R.
// L = character's left (+x), R = character's right (-x). Character faces +z. Height ≈ 1.75.
import * as THREE from 'three';

const phys = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.6, ...o });
const cap = (r, len, m, seg = 20) => { const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, seg), m); x.castShadow = x.receiveShadow = true; return x; };
const sph = (r, m, w = 32, h = 24) => { const x = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m); x.castShadow = true; return x; };
const tube = (pts, r, m) => { const x = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8), m); x.castShadow = true; return x; };

export function makeToon({ skin = '#f1c4a0', shirt = '#7aa2e0', pants = '#5b6170', shoes = '#3a2a1e', hair = '#5a3a22', hairStyle = 'tuft',
  coat = null, tie = null, glasses = false, moustache = false, eye = '#3b2a1a', headScale = 1 } = {}) {
  const M = {
    skin: phys(skin, { roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#ff9c80') }),
    shirt: phys(shirt, { roughness: 0.75, sheen: 0.4 }), pants: phys(pants, { roughness: 0.85, sheen: 0.3 }),
    shoes: phys(shoes, { roughness: 0.3, clearcoat: 0.8 }), hair: phys(hair, { roughness: 0.45, sheen: 1, sheenColor: new THREE.Color(hair).offsetHSL(0, 0, 0.3) }),
    coat: phys(coat || '#ffffff', { roughness: 0.7, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') }), tie: phys(tie || '#a02828', { roughness: 0.45, clearcoat: 0.3 }),
    white: phys('#fbfbf8', { roughness: 0.1, clearcoat: 1 }), pupil: phys(eye, { roughness: 0.2, clearcoat: 1 }), black: phys('#151515', { roughness: 0.3 }),
    mouth: phys('#5a1a1a', { roughness: 0.5 }), blush: new THREE.MeshBasicMaterial({ color: '#ff6f7a', transparent: true, opacity: 0, depthWrite: false }),
  };
  const root = new THREE.Group(), J = {};
  const joint = (n, p, x, y, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); J[n] = g; return g; };
  const pelvis = joint('pelvis', root, 0, 0.92);
  const hips = cap(0.16, 0.1, M.pants); hips.rotation.z = Math.PI / 2; hips.scale.set(1, 1, 0.72); pelvis.add(hips);
  const chest = joint('chest', pelvis, 0, 0.06);
  const torso = cap(0.18, 0.3, coat ? M.shirt : M.shirt); torso.position.y = 0.25; torso.scale.set(1, 1, 0.72); chest.add(torso);
  if (coat) {   // flared open lab coat (lathe), lapels, pockets
    const prof = [[0.2, 0.62], [0.215, 0.5], [0.22, 0.3], [0.235, 0.05], [0.26, -0.2], [0.29, -0.45]].map(([r, y]) => new THREE.Vector2(r, y));
    const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 48, Math.PI * 0.62, Math.PI * 1.76), M.coat);
    shell.material.side = THREE.DoubleSide; shell.scale.z = 0.78; shell.castShadow = shell.receiveShadow = true; chest.add(shell);
    for (const s of [-1, 1]) { const lap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.015), M.coat); lap.position.set(s * 0.075, 0.42, 0.15); lap.rotation.set(0.1, 0, s * 0.3); chest.add(lap);
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.01), M.coat); pk.position.set(s * 0.17, -0.12, 0.2); chest.add(pk); }
    const pen = cap(0.008, 0.08, phys('#1f4fa0')); pen.position.set(0.13, 0.38, 0.17); chest.add(pen);
  }
  if (tie) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.035, 0.26, 4), M.tie); t.scale.z = 0.3; t.position.set(0, 0.38, 0.14); t.rotation.x = -0.12; chest.add(t); }
  const neck = joint('neck', chest, 0, 0.52); { const nk = cap(0.06, 0.06, M.skin); nk.position.y = 0.03; neck.add(nk); }
  const head = joint('head', neck, 0, 0.09);
  const HR = 0.2 * headScale, H = new THREE.Group(); H.position.y = HR * 0.92; head.add(H);
  const skull = sph(HR, M.skin, 48, 36); skull.scale.set(1, 1.04, 0.96); H.add(skull);
  // ears, nose
  for (const s of [-1, 1]) { const e = sph(HR * 0.2, M.skin, 16, 12); e.scale.set(0.5, 1, 0.8); e.position.set(s * HR * 0.97, 0, -HR * 0.05); H.add(e); }
  const nose = sph(HR * 0.12, M.skin, 20, 14); nose.scale.set(1, 0.9, 1.1); nose.position.set(0, -HR * 0.08, HR * 0.97); H.add(nose);
  // eyes with highlights
  const eyes = [], brows = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * HR * 0.36, HR * 0.14, HR * 0.84); H.add(g);
    const w = sph(HR * 0.2, M.white, 24, 18); w.scale.set(0.9, 1.1, 0.55); g.add(w);
    const p = sph(HR * 0.1, M.pupil, 16, 12); p.scale.set(1, 1.15, 0.5); p.position.z = HR * 0.09; g.add(p);
    const hl = sph(HR * 0.035, new THREE.MeshBasicMaterial({ color: '#ffffff' }), 8, 6); hl.position.set(HR * 0.03, HR * 0.05, HR * 0.13); g.add(hl);
    eyes.push({ g, p });
    const b = tube([new THREE.Vector3(-HR * 0.16, 0, 0), new THREE.Vector3(0, HR * 0.05, 0.005), new THREE.Vector3(HR * 0.16, 0, 0)], HR * 0.03, M.hair);
    const bg = new THREE.Group(); bg.position.set(s * HR * 0.36, HR * 0.4, HR * 0.86); bg.add(b); H.add(bg); brows.push({ bg, s });
    const bl = new THREE.Mesh(new THREE.CircleGeometry(HR * 0.15, 24), M.blush); bl.position.set(s * HR * 0.55, -HR * 0.18, HR * 0.84); bl.rotation.y = s * 0.55; H.add(bl);
  }
  // mouths
  const mz = HR * 0.93, my = -HR * 0.38;
  const curve = (bend, w = 0.22) => [new THREE.Vector3(-HR * w, 0, 0), new THREE.Vector3(0, bend * HR, 0.01), new THREE.Vector3(HR * w, 0, 0)];
  const mouths = {
    smile: tube(curve(-0.12), HR * 0.03, M.mouth), grin: (() => { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(-HR * 0.22, 0); sh.quadraticCurveTo(0, -HR * 0.34, HR * 0.22, 0); sh.lineTo(-HR * 0.22, 0);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), M.mouth); g.add(m); const teeth = new THREE.Mesh(new THREE.PlaneGeometry(HR * 0.36, HR * 0.07), M.white); teeth.position.set(0, -HR * 0.04, 0.002); g.add(teeth); return g; })(),
    frown: tube(curve(0.1), HR * 0.03, M.mouth), flat: tube(curve(0, 0.14), HR * 0.028, M.mouth),
    o: (() => { const m = sph(HR * 0.1, M.mouth, 16, 12); m.scale.set(0.9, 1.25, 0.35); return m; })(),
    sick: tube([new THREE.Vector3(-HR * 0.2, 0, 0), new THREE.Vector3(-HR * 0.07, HR * 0.05, 0.01), new THREE.Vector3(HR * 0.07, -HR * 0.05, 0.01), new THREE.Vector3(HR * 0.2, 0, 0)], HR * 0.03, M.mouth),
  };
  for (const m of Object.values(mouths)) { m.position.set(0, my, mz); m.visible = false; H.add(m); }
  mouths.smile.visible = true;
  // hair
  if (hairStyle !== 'none') {
    const capG = new THREE.SphereGeometry(HR * 1.06, 48, 24, 0, Math.PI * 2, 0, hairStyle === 'bald' ? Math.PI * 0.18 : Math.PI * 0.5);
    const P = capG.attributes.position; for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i); const n = 1 + 0.035 * Math.sin(v.x * 60 + v.z * 40) * Math.cos(v.y * 50); P.setXYZ(i, v.x * n, v.y * n, v.z * n); }
    capG.computeVertexNormals();
    const hc = new THREE.Mesh(capG, M.hair); hc.castShadow = true; hc.rotation.x = -0.32; hc.position.set(0, HR * 0.08, -HR * 0.05); H.add(hc);
    if (hairStyle === 'bald') hc.visible = false;
    if (hairStyle === 'tuft') for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(HR * 0.22, HR * 0.5, 12), M.hair); t.position.set((k - 1) * HR * 0.22, HR * 1.0, HR * 0.38); t.rotation.set(0.9, 0, (k - 1) * -0.4); t.castShadow = true; H.add(t); }
    if (hairStyle === 'side' || hairStyle === 'bald') { const ring = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.93, HR * 0.13, 10, 40, Math.PI * 1.3), M.hair); ring.rotation.set(Math.PI / 2, 0, Math.PI * 0.85); ring.position.y = HR * 0.12; H.add(ring); }
  }
  if (glasses) for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.21, HR * 0.025, 10, 32), M.black); r.position.set(s * HR * 0.36, HR * 0.14, HR * 0.97); H.add(r);
    if (s > 0) { const br = new THREE.Mesh(new THREE.BoxGeometry(HR * 0.3, HR * 0.03, HR * 0.03), M.black); br.position.set(0, HR * 0.17, HR * 1.0); H.add(br); } }
  if (moustache) { const m = cap(HR * 0.06, HR * 0.34, M.hair); m.rotation.z = Math.PI / 2; m.position.set(0, -HR * 0.24, HR * 0.93); H.add(m); }
  // arms with mitten hands; wrist = prop socket
  for (const [s, n] of [[1, 'L'], [-1, 'R']]) {
    const sh = joint('shoulder' + n, chest, s * 0.23, 0.46);
    const ua = cap(0.06, 0.2, coat ? M.coat : M.shirt); ua.position.y = -0.14; sh.add(ua);
    const el = joint('elbow' + n, sh, 0, -0.29);
    const fa = cap(0.05, 0.18, coat ? M.coat : M.shirt); fa.position.y = -0.12; el.add(fa);
    const wr = joint('wrist' + n, el, 0, -0.27);
    const hand = sph(0.058, M.skin, 20, 16); hand.scale.set(0.85, 1.05, 0.6); hand.position.y = -0.04; wr.add(hand);
    const thumb = cap(0.02, 0.04, M.skin, 10); thumb.position.set(-s * 0.04, -0.02, 0.03); thumb.rotation.z = -s * 0.7; wr.add(thumb);
    sh.rotation.z = s * 0.1;
    const hip = joint('hip' + n, pelvis, s * 0.09, -0.02);
    const th = cap(0.08, 0.28, M.pants); th.position.y = -0.21; hip.add(th);
    const kn = joint('knee' + n, hip, 0, -0.43);
    const sn = cap(0.065, 0.3, M.pants); sn.position.y = -0.2; kn.add(sn);
    const foot = cap(0.06, 0.12, M.shoes); foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.44, 0.06); kn.add(foot);
  }
  const all = []; root.traverse(o => { if (o.isMesh) all.push(o); });
  const api = {
    group: root, joints: J, mats: M, head: H,
    /** smile | grin | frown | flat | o | sick */
    face(expr = 'smile') { for (const [k, m] of Object.entries(mouths)) m.visible = k === expr;
      const lift = { o: 0.05, frown: -0.02, sick: -0.015 }[expr] || 0, tilt = { frown: 0.25, o: -0.15, sick: 0.2 }[expr] || 0;
      for (const b of brows) { b.bg.position.y = HR * 0.4 + lift * HR * 2; b.bg.rotation.z = -b.s * tilt; }
      const sq = expr === 'grin' ? 0.75 : expr === 'sick' ? 0.6 : 1; for (const e of eyes) e.g.scale.y = sq; },
    look(x = 0, y = 0) { for (const e of eyes) { e.p.position.x = x * HR * 0.07; e.p.position.y = y * HR * 0.07; } },
    blink(k) { for (const e of eyes) e.g.scale.y = Math.max(0.08, 1 - k); },
    blush(a) { M.blush.opacity = a * 0.65; },
    skinColor(c) { M.skin.color.set(c); },
    /** reset joints to a relaxed stance */
    rest() { for (const k in J) J[k].rotation.set(0, 0, 0); J.shoulderL.rotation.z = 0.1; J.shoulderR.rotation.z = -0.1; J.elbowL.rotation.x = J.elbowR.rotation.x = -0.15; },
    idle(t, a = 1) { J.chest.rotation.x = 0.02 * Math.sin(t * 1.6) * a; J.head.rotation.y += 0.06 * Math.sin(t * 0.55) * a; J.head.rotation.x += 0.03 * Math.sin(t * 0.8) * a;
      const bk = (t % 3.7) < 0.12 ? 1 : 0; if (bk) api.blink(0.9); },
    /** walking cycle at phase t (call after rest) */
    walk(t, speed = 6, a = 1) { const s = Math.sin(t * speed); J.hipL.rotation.x = 0.45 * s * a; J.hipR.rotation.x = -0.45 * s * a; J.kneeL.rotation.x = 0.5 * Math.max(0, -s) * a; J.kneeR.rotation.x = 0.5 * Math.max(0, s) * a;
      J.shoulderL.rotation.x = -0.35 * s * a; J.shoulderR.rotation.x = 0.35 * s * a; J.pelvis.position.y = 0.92 + Math.abs(s) * 0.02; },
    /** parent a prop to a hand socket ('L'|'R'); offset/rotation in the wrist frame */
    hold(obj, side = 'R', pos = [0, -0.07, 0.05], rot = [0, 0, 0]) { J['wrist' + side].add(obj); obj.position.set(...pos); obj.rotation.set(...rot); return obj; },
    /**
     * Two-bone IK: put the wrist (hand socket) at a WORLD point. pole = world direction the elbow should bend toward.
     * Use for every prop interaction: place the prop where it must be, then reach() its grip point.
     */
    reach(side, target, pole = new THREE.Vector3(side === 'R' ? -0.6 : 0.6, -1, -0.4)) {
      const sh = J['shoulder' + side], el = J['elbow' + side];
      root.updateMatrixWorld(true);
      const S = sh.getWorldPosition(new THREE.Vector3()), a = 0.29, b = 0.27;
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
      root.updateMatrixWorld(true);
    },
    mouthWorld() { root.updateMatrixWorld(true); return H.localToWorld(new THREE.Vector3(0, my, mz)); },
    handWorld(side = 'R') { root.updateMatrixWorld(true); return J['wrist' + side].localToWorld(new THREE.Vector3(0, -0.06, 0)); },
    headWorld() { root.updateMatrixWorld(true); return H.localToWorld(new THREE.Vector3(0, 0, 0)); },
  };
  api.rest(); api.face('smile');
  return api;
}
