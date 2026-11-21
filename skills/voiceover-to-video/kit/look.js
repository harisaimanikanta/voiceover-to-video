// Polished 3D-cartoon look: mood lighting rigs, gradient sky + atmosphere, soft "clay/plastic/fabric" materials with
// micro-surface detail, rounded geometry, and per-character face lights (catchlights in the eyes, rim on the silhouette).
// The style target is a feature-animation cartoon: rounded forms, warm key + cool fill, glowing rim, soft shadows, haze.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------- procedural textures
const _tex = {};
function valueNoise(size, freq, seed) {
  const r = (i, j) => { const s = Math.sin((i % freq) * 127.1 + (j % freq) * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / size * freq, fy = y / size * freq, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const a = r(i, j), b = r(i + 1, j), c = r(i, j + 1), d = r(i + 1, j + 1);
    out[y * size + x] = a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
  }
  return out;
}
/** Tileable height noise as a normal map. kind: 'skin' (pores, very fine), 'fabric' (weave), 'clay' (soft lumps), 'wood', 'paper'. */
export function detailNormal(kind = 'clay', strength = 1) {
  const key = kind + strength; if (_tex[key]) return _tex[key];
  const S = 256, h = new Float32Array(S * S);
  const oct = { skin: [[32, 0.5], [64, 0.5]], fabric: [[64, 0.6], [16, 0.4]], clay: [[4, 0.6], [16, 0.3], [64, 0.1]], wood: [[8, 1]], paper: [[32, 0.5], [128, 0.5]] }[kind] || [[8, 1]];
  oct.forEach(([f, w], k) => { const n = valueNoise(S, f, k + 1); for (let i = 0; i < h.length; i++) h[i] += n[i] * w; });
  if (kind === 'fabric') for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] += 0.35 * (Math.sin(x * 0.8) * Math.sin(y * 0.8) > 0 ? 1 : 0);
  if (kind === 'wood') for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = 0.5 + 0.5 * Math.sin(y * 0.15 + h[y * S + x] * 9);
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
  const k = 2.5 * strength;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const H = (i, j) => h[((j + S) % S) * S + ((i + S) % S)];
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), o = (y * S + x) * 4;
    img.data[o] = 128 - dx / l * 127; img.data[o + 1] = 128 - dy / l * 127; img.data[o + 2] = 128 + 127 / l; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (_tex[key] = t);
}

// ---------------------------------------------------------------- materials
/**
 * Soft cartoon material. kind: 'plastic' | 'clay' | 'fabric' | 'skin' | 'wood' | 'paper' | 'metal' | 'glass' | 'rubber' | 'ceramic'.
 * Every kind carries a micro-normal so nothing looks like default flat plastic (lesson L013).
 */
export function soft(color, kind = 'plastic', o = {}) {
  const base = {
    plastic: { roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.35, n: 'clay', ns: 0.15, rep: 2 },
    clay: { roughness: 0.62, sheen: 0.25, n: 'clay', ns: 0.35, rep: 2 },
    fabric: { roughness: 0.85, sheen: 0.8, sheenRoughness: 0.6, n: 'fabric', ns: 0.12, rep: 5 },
    skin: { roughness: 0.48, sheen: 0.6, sheenRoughness: 0.45, clearcoat: 0.1, clearcoatRoughness: 0.45, n: 'skin', ns: 0.035, rep: 10 },
    wood: { roughness: 0.55, clearcoat: 0.25, n: 'wood', ns: 0.25, rep: 1 },
    paper: { roughness: 0.9, n: 'paper', ns: 0.15, rep: 3 },
    metal: { roughness: 0.3, metalness: 0.85, n: 'clay', ns: 0.08, rep: 3 },
    rubber: { roughness: 0.75, n: 'clay', ns: 0.2, rep: 4 },
    ceramic: { roughness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.08, n: 'clay', ns: 0.05, rep: 1 },
    glass: { roughness: 0.05, transmission: 0.9, thickness: 0.05, ior: 1.45, n: null },
  }[kind] || {};
  const { n, ns, rep, ...p } = base;
  const m = new THREE.MeshPhysicalMaterial({ color, ...p, ...o });
  if (n) { m.normalMap = detailNormal(n).clone(); m.normalMap.needsUpdate = true; m.normalMap.repeat.set(rep, rep); m.normalScale.set(ns, ns); }
  if (kind === 'skin') m.sheenColor = new THREE.Color(o.sheenColor || '#ff7a5c');
  if (kind === 'fabric') m.sheenColor = new THREE.Color(color).offsetHSL(0, -0.1, 0.25);
  return m;
}

// ---------------------------------------------------------------- geometry
/** Rounded box (radius r) - use instead of BoxGeometry for every prop: soft edges catch the light. */
export function roundBox(w, h, d, mat, r = Math.min(w, h, d) * 0.15) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat); m.castShadow = m.receiveShadow = true; return m;
}
/** Lathe from [[radius, y], ...] - bottles, lamps, cups, pots, bodies. */
export function lathe(profile, mat, seg = 48) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat); m.castShadow = m.receiveShadow = true; return m;
}
/** Smooth tube with per-point radius function radius(u) (0..1). closed for loops. */
export function tubeR(points, radius, mat, { seg = 48, radial = 12, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, seg, 1, radial, closed), P = geo.attributes.position;
  const frames = curve.computeFrenetFrames(seg, closed), c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c); const r = typeof radius === 'function' ? radius(i / seg) : radius;
    for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; v.fromBufferAttribute(P, k).sub(c).multiplyScalar(r).add(c); P.setXYZ(k, v.x, v.y, v.z); }
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m;
}

// ---------------------------------------------------------------- sky, atmosphere, light rigs
/** Vertical-gradient sky dome with a soft sun glow. Pair with scene.fog of the horizon colour for depth haze. */
export function skyDome({ top = '#5fa8e8', horizon = '#ffe3c2', bottom = '#f3c9a0', sunDir = [0.4, 0.3, -1], sun = '#fff1d0', sunSize = 0.06, radius = 300 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, bot: { value: new THREE.Color(bottom) },
      sunD: { value: new THREE.Vector3(...sunDir).normalize() }, sunC: { value: new THREE.Color(sun) }, sunS: { value: sunSize } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top, hor, bot, sunC, sunD; uniform float sunS; varying vec3 vD;
      void main(){ float y = vD.y; vec3 c = y > 0. ? mix(hor, top, pow(clamp(y,0.,1.), .55)) : mix(hor, bot, pow(clamp(-y*3.,0.,1.), .7));
        float s = max(dot(normalize(vD), sunD), 0.); c += sunC * (pow(s, 1./sunS) * .6 + pow(s, 8.) * .25);
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10; return m;
}

/**
 * Mood lighting rig. moods:
 *  'day'      bright warm sun, blue sky, cool soft fill          'golden'  low orange sun, long shadows, pink haze
 *  'interior' warm lamp key, teal ambience, window rim            'night'   moonlight blue + warm practicals
 *  'lab'      clean cool white with a cyan rim                    'drama'   dark, single hard key, strong coloured rim
 *  'dream'    pastel lilac/peach, very soft                       'sick'    desaturated green-yellow, low contrast
 * Returns { key, fill, rim, hemi, sky, focus(v3, radius) } - call focus() on the subject so shadows stay sharp there.
 */
export function mood(scene, name = 'day', { sky = true, fog = true, shadowSize = 4 } = {}) {
  const P = {
    day: { key: ['#fff2dc', 3.2, [4, 7, 5]], fill: ['#bcd8ff', 0.6], rim: ['#ffe6b8', 2.2], hemi: ['#cfe6ff', '#c9a27a', 0.9], sky: { top: '#4f9fe6', horizon: '#dff0ff', bottom: '#cfe3c0' }, fog: ['#dceeff', 18, 90] },
    golden: { key: ['#ffb36b', 3.4, [-6, 3.2, 3]], fill: ['#8fa6ff', 0.45], rim: ['#ffcf8a', 3.2], hemi: ['#ffd2b0', '#6a4a7a', 0.7], sky: { top: '#6b7fd8', horizon: '#ffc78f', bottom: '#f2a07a', sunDir: [-0.9, 0.15, -0.4], sun: '#ffdca0' }, fog: ['#f7c3a0', 12, 70] },
    interior: { key: ['#ffd9a8', 2.6, [2.5, 3.5, 2.5]], fill: ['#7fb8c8', 0.5], rim: ['#b8e0ff', 2.4], hemi: ['#ffe8cc', '#5a4a40', 0.55], sky: null, fog: ['#3a2f2c', 8, 30] },
    night: { key: ['#9fb8ff', 1.6, [-3, 6, 2]], fill: ['#ffb070', 0.5], rim: ['#7fa8ff', 2.6], hemi: ['#30406a', '#1a1420', 0.5], sky: { top: '#0b1030', horizon: '#2a3570', bottom: '#151828', sunDir: [0.3, 0.5, -1], sun: '#c8d8ff', sunSize: 0.02 }, fog: ['#1a2040', 10, 60] },
    lab: { key: ['#f4f8ff', 2.8, [2, 6, 4]], fill: ['#c8e8ff', 0.7], rim: ['#7ff0ff', 2.4], hemi: ['#eaf6ff', '#8aa0b0', 0.8], sky: null, fog: ['#dfeaf2', 10, 40] },
    drama: { key: ['#ffe2c0', 3.6, [3, 5, 2]], fill: ['#304060', 0.2], rim: ['#ff5a3c', 3.5], hemi: ['#202838', '#100c10', 0.35], sky: null, fog: ['#0e0c12', 6, 25] },
    dream: { key: ['#ffe0ec', 2.4, [3, 6, 4]], fill: ['#c8b8ff', 0.8], rim: ['#ffd0f0', 2.2], hemi: ['#f0e0ff', '#ffd8c0', 1.0], sky: { top: '#b8a8f0', horizon: '#ffe4f0', bottom: '#ffd8c4' }, fog: ['#f0dff4', 10, 60] },
    sick: { key: ['#e8f0a0', 2.2, [2, 6, 3]], fill: ['#7a9a60', 0.5], rim: ['#c8ff80', 1.8], hemi: ['#c8d8a0', '#4a5a30', 0.7], sky: null, fog: ['#a8b880', 8, 40] },
  }[name];
  if (!P) throw new Error('unknown mood ' + name);
  const g = new THREE.Group(); g.name = 'mood-' + name; scene.add(g);
  const hemi = new THREE.HemisphereLight(P.hemi[0], P.hemi[1], P.hemi[2]); g.add(hemi);
  const key = new THREE.DirectionalLight(P.key[0], P.key[1]); key.position.set(...P.key[2]); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 0.1, far: 60 });
  g.add(key, key.target);
  const fill = new THREE.DirectionalLight(P.fill[0], P.fill[1]); fill.position.set(-P.key[2][0], P.key[2][1] * 0.4, P.key[2][2]); g.add(fill, fill.target);
  const rim = new THREE.DirectionalLight(P.rim[0], P.rim[1]); rim.position.set(-P.key[2][0] * 0.5, 4, -6); g.add(rim, rim.target);
  let dome = null;
  if (sky && P.sky) { dome = skyDome(P.sky); scene.add(dome); }
  else if (sky) scene.background = new THREE.Color(P.fog[0]);
  if (fog) scene.fog = new THREE.Fog(P.fog[0], P.fog[1], P.fog[2]);
  const off = [key, fill, rim].map(l => l.position.clone());
  return {
    key, fill, rim, hemi, sky: dome, group: g,
    /** keep the light rig centred on the subject (shadow resolution where it matters) */
    focus(v, size = shadowSize) {
      [key, fill, rim].forEach((l, i) => { l.position.copy(v).add(off[i]); l.target.position.copy(v); });
      Object.assign(key.shadow.camera, { left: -size, right: size, top: size, bottom: -size }); key.shadow.camera.updateProjectionMatrix();
    },
  };
}

/**
 * Per-character face rig: a soft key on the face, a strong rim behind the head (silhouette glow), and an eye
 * catchlight. Call rig.update(camera) every frame after posing. This is what makes cartoon faces read on phones.
 */
export function faceRig(scene, toon, { key = '#fff0de', rim = '#bfe3ff', keyI = 1.4, rimI = 3.0, side = 1 } = {}) {
  const k = new THREE.SpotLight(key, keyI, 4, 0.55, 0.9, 1.5), r = new THREE.SpotLight(rim, rimI, 4, 0.6, 0.8, 1.5), c = new THREE.PointLight('#ffffff', 0.08, 1.2, 2);
  scene.add(k, k.target, r, r.target, c);
  const tmp = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return {
    lights: [k, r, c],
    update(camera) {
      const h = toon.headWorld(); const toCam = camera.position.clone().sub(h).normalize();
      right.crossVectors(up, toCam).normalize();
      k.position.copy(h).addScaledVector(toCam, 0.9).addScaledVector(right, 0.55 * side).addScaledVector(up, 0.45); k.target.position.copy(h);
      r.position.copy(h).addScaledVector(toCam, -0.9).addScaledVector(right, -0.6 * side).addScaledVector(up, 0.5); r.target.position.copy(h);
      c.position.copy(h).addScaledVector(toCam, 0.5).addScaledVector(up, 0.08);
    },
  };
}

/** A practical (visible light source: lamp bulb, screen, window) = emissive mesh + real light; motivates the lighting. */
export function practical(color = '#ffcf8a', intensity = 2, distance = 4, { radius = 0.05, shape = 'bulb' } = {}) {
  const g = new THREE.Group();
  const m = shape === 'panel' ? new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ color }))
    : new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), new THREE.MeshBasicMaterial({ color }));
  const l = new THREE.PointLight(color, intensity, distance, 2); l.castShadow = false;
  g.add(m, l); g.userData.light = l; return g;
}
