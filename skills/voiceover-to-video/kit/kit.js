// shorts-renderer scene kit - reusable building blocks for vertical explainer Shorts (Three.js).
// Everything is a pure function of time t (seconds) so renders are deterministic.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- math & timing ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = x => Math.pow(clamp(x), 3);
export const easeInOut = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
/** progress of t through [a,b], clamped 0..1 */
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export function rng(seed = 1) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/** shot list: [{name, start, end}] -> at(t) = {shot, local, p} */
export function timeline(shots) {
  return { shots, at(t) { const s = shots.find(s => t >= s.start && t < s.end) || shots[shots.length - 1];
    return { shot: s, name: s.name, local: t - s.start, p: prog(t, s.start, s.end) }; } };
}

// ---------- captions ----------
/** lines: [{t, text, end?}] (narration with start times) -> 1–3 word caption chunks with times. */
export function captionsFromLines(lines, { maxWords = 3, maxChars = 16 } = {}) {
  const out = [];
  lines.forEach((ln, i) => {
    const end = ln.end ?? (lines[i + 1] ? lines[i + 1].t : ln.t + 2.5);
    const words = ln.text.split(/\s+/).filter(Boolean);
    const chunks = []; let cur = [];
    for (const w of words) {
      const next = [...cur, w].join(' ');
      if (cur.length && (cur.length >= maxWords || next.length > maxChars)) { chunks.push(cur.join(' ')); cur = [w]; } else cur.push(w);
      if (/[.,!?;:]$/.test(w)) { chunks.push(cur.join(' ')); cur = []; }
    }
    if (cur.length) chunks.push(cur.join(' '));
    const weights = chunks.map(c => c.length + 4), total = weights.reduce((a, b) => a + b, 0);
    let t = ln.t;
    chunks.forEach((c, k) => { const d = (end - ln.t) * weights[k] / total; out.push({ t0: t, t1: t + d, text: c.replace(/[,;:]$/, '') }); t += d; });
  });
  return out;
}

// ---------- renderer / studio ----------
export function makeRenderer(canvas, width, height) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setSize(width, height, false);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}
/** Bright "explainer studio": flat sky colour, big ground disc, soft key light with shadows. */
export function studio(scene, { sky = '#76c4f0', ground = '#4f9a3c', groundSize = 60 } = {}) {
  scene.background = new THREE.Color(sky);
  const hemi = new THREE.HemisphereLight('#ffffff', '#5a7a40', 1.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(3, 8, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 }); sun.shadow.bias = -0.0005;
  scene.add(sun);
  const g = new THREE.Mesh(new THREE.CircleGeometry(groundSize, 64), new THREE.MeshStandardMaterial({ color: ground, roughness: 0.95 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  return { hemi, sun, ground: g };
}

// ---------- realism: HDRI lighting + post-processing ----------
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const _hdriCache = {};
/** Real-world HDRI lighting from @pmndrs/assets (CC0): apartment bridge city dawn esplanade forest hall lab lobby night park sky studio sunrise sunset venice warehouse workshop. */
export async function loadHDRI(renderer, name) {
  if (_hdriCache[name]) return _hdriCache[name];
  const url = (await import(`/node_modules/@pmndrs/assets/hdri/${name}.exr.js`)).default;
  const tex = await new EXRLoader().loadAsync(url); tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(tex).texture; pm.dispose();
  return (_hdriCache[name] = { env, tex });
}
/** Apply an HDRI to a scene: env lighting (+ optional blurred background). */
export async function useHDRI(renderer, scene, name, { intensity = 1, background = false, blur = 0.6, rotation = 0 } = {}) {
  const { env, tex } = await loadHDRI(renderer, name);
  scene.environment = env; scene.environmentIntensity = intensity; scene.environmentRotation = new THREE.Euler(0, rotation, 0);
  if (background) { scene.background = tex; scene.backgroundBlurriness = blur; scene.backgroundRotation = new THREE.Euler(0, rotation, 0); }
}
// Final grade: zoom blur (transitions) → chromatic fringe → saturation/contrast → split-tone → colour fill (portal transitions) → vignette → grain
const GrainVignette = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.045 }, uVig: { value: 0.35 }, uWarm: { value: 0.03 },
    uSat: { value: 1.22 }, uCon: { value: 1.08 }, uZoom: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uFill: { value: 0 }, uFillColor: { value: new THREE.Color('#ffffff') }, uCA: { value: 0.0015 },
    uShadow: { value: new THREE.Color('#1d4a5a') }, uHigh: { value: new THREE.Color('#ffb070') }, uSplit: { value: 0.12 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uWarm, uSat, uCon, uZoom, uFill, uCA, uSplit; uniform vec2 uCenter;
    uniform vec3 uFillColor, uShadow, uHigh; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*7.) * 43758.5453); }
    vec3 samp(vec2 uv){ vec2 d = uv - .5; float ca = uCA * (1. + 6.*uZoom);
      return vec3(texture2D(tDiffuse, uv - d*ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv + d*ca).b); }
    void main(){
      vec3 c = vec3(0.);
      if (uZoom > 0.001) { vec2 dir = vUv - uCenter; for (int i = 0; i < 10; i++) { float k = float(i) / 9.; c += samp(vUv - dir * k * uZoom * 0.18); } c /= 10.; }
      else c = samp(vUv);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - .5) * uCon + .5;
      c += uSplit * (mix(uShadow, vec3(0.), smoothstep(0., .5, l)) - .5*0.) * (1. - l) * 0.5;
      c += uSplit * uHigh * smoothstep(.55, 1., l) * 0.35;
      c.r += uWarm*.5; c.b -= uWarm*.5;
      c = mix(c, uFillColor, clamp(uFill, 0., 1.));
      vec2 d = vUv - .5; c *= 1. - uVig * dot(d, d) * 2.2;
      c += (h(vUv*1000.) - .5) * uGrain;
      gl_FragColor = vec4(c, 1.); }`,
};
/**
 * Cinematic post chain: GTAO contact shadows → bloom → optional depth of field → output (tone map) → grain + vignette.
 * Returns {render(scene, camera, t, {focus, aperture})}. Call instead of renderer.render.
 */
export function makePost(renderer, width, height, { ao = true, bloom = 0.25, dof = true, grain = 0.04, vignette = 0.35, threshold = 0.78 } = {}) {
  const composer = new EffectComposer(renderer); composer.setSize(width, height);
  const dummyS = new THREE.Scene(), dummyC = new THREE.PerspectiveCamera();
  const rp = new RenderPass(dummyS, dummyC); composer.addPass(rp);
  let gtao = null; if (ao) { gtao = new GTAOPass(dummyS, dummyC, width, height); gtao.blendIntensity = 0.85; composer.addPass(gtao); }
  // sanitize: NaN/Inf from any material (e.g. sheen + HDRI edge cases) would be smeared into black blocks by bloom
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.,0.,0.,1.); gl_FragColor = min(c, vec4(32.)); }' }));
  let bloomPass = null; if (bloom) { bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), bloom, 0.55, threshold); composer.addPass(bloomPass); }
  let bokeh = null; if (dof) { bokeh = new BokehPass(dummyS, dummyC, { focus: 3, aperture: 0.0, maxblur: 0.008 }); composer.addPass(bokeh); }
  composer.addPass(new OutputPass());
  const gv = new ShaderPass(GrainVignette); gv.uniforms.uGrain.value = grain; gv.uniforms.uVig.value = vignette; composer.addPass(gv);
  return {
    composer,
    grade: gv.uniforms,
    /** fx: {focus, aperture, bloom, zoom (0..1 radial blur), fill (0..1), fillColor, sat, con, warm, split} */
    render(scene, camera, t = 0, { focus = null, aperture = 0, bloom: bl = null, zoom = 0, fill = 0, fillColor = null, sat = null, con = null, warm = null, exposure = null } = {}) {
      const u = gv.uniforms; u.uZoom.value = zoom; u.uFill.value = fill; if (fillColor) u.uFillColor.value.set(fillColor);
      if (sat != null) u.uSat.value = sat; if (con != null) u.uCon.value = con; if (warm != null) u.uWarm.value = warm;
      if (bloomPass && bl != null) bloomPass.strength = bl; if (exposure != null) renderer.toneMappingExposure = exposure;
      rp.scene = scene; rp.camera = camera;
      if (gtao) { gtao.scene = scene; gtao.camera = camera; }
      if (bokeh) { bokeh.scene = scene; bokeh.camera = camera; bokeh.enabled = aperture > 0 && focus != null;
        if (bokeh.enabled) { const u = bokeh.uniforms; u.focus.value = focus; u.aperture.value = aperture; u.nearClip.value = camera.near; u.farClip.value = camera.far; u.aspect.value = camera.aspect; } }
      gv.uniforms.uTime.value = t;
      composer.render();
    },
  };
}

// ---------- character ----------
const capsule = (r, len, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat); m.castShadow = true; return m; };
/**
 * Stylised humanoid (~1.8 m) with a posable joint hierarchy.
 * joints: pelvis, chest, neck, head, shoulderL/R, elbowL/R, hipL/R, kneeL/R. Rotate joints[x].rotation to pose.
 * style 'cartoon' = big round white head with dot eyes (reference-channel look); 'plain' = skin-toned head.
 */
export function makeCharacter({ shirt = '#2f4d8f', pants = '#6f8fb8', skin = '#e8b796', hair = '#5a3b22', shoes = '#f2f2f2', style = 'cartoon',
  hairStyle = 'none', glasses = false, coat = null, tie = null, moustache = false } = {}) {
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, transparent: true });
  const mats = { shirt: M(shirt), pants: M(pants), skin: M(skin), hair: M(hair), shoes: M(shoes), head: M(style === 'cartoon' ? '#fbfbf8' : skin), eye: M('#111111'),
    coat: M(coat || '#ffffff'), tie: M(tie || '#aa2222'), glass: M('#222222') };
  const root = new THREE.Group(), J = {};
  const joint = (name, parent, x, y, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const pelvis = joint('pelvis', root, 0, 0.98);
  const hipsMesh = capsule(0.17, 0.08, mats.pants); hipsMesh.rotation.z = Math.PI / 2; hipsMesh.scale.set(1, 1, 0.75); pelvis.add(hipsMesh);
  const chest = joint('chest', pelvis, 0, 0.08);
  const torso = capsule(0.19, 0.32, mats.shirt); torso.position.y = 0.26; torso.scale.set(1, 1, 0.7); chest.add(torso);
  if (coat) {                                       // open lab coat: tapered shell from shoulders to mid-thigh + lapels
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.85, 24, 1, true, Math.PI * 0.62, Math.PI * 1.76), mats.coat);
    shell.material.side = THREE.DoubleSide; shell.position.y = 0.12; shell.scale.z = 0.78; shell.castShadow = true; chest.add(shell);
    for (const s of [-1, 1]) { const lap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.02), mats.coat); lap.position.set(s * 0.07, 0.4, 0.14); lap.rotation.z = s * 0.25; chest.add(lap); }
  }
  if (tie) { const tieM = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.02), mats.tie); tieM.position.set(0, 0.36, 0.135); chest.add(tieM); }
  const neck = joint('neck', chest, 0, 0.56);
  const neckMesh = capsule(0.055, 0.06, mats.skin); neckMesh.position.y = 0.03; neck.add(neckMesh);
  const head = joint('head', neck, 0, 0.1);
  const hr = style === 'cartoon' ? 0.17 : 0.12;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(hr, 32, 24), mats.head); skull.position.y = hr * 0.9; skull.castShadow = true; head.add(skull);
  if (style !== 'cartoon') { const h = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.04, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.1), mats.hair); h.position.y = hr * 0.95; head.add(h); }
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.09, 12, 8), mats.eye); e.position.set(s * hr * 0.35, hr * 1.0, hr * 0.92); head.add(e);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.22, hr * 0.035, 6, 16, Math.PI), mats.eye);
  mouth.position.set(0, hr * 0.62, hr * 0.95); mouth.rotation.z = Math.PI; head.add(mouth);
  // expression mouths: 'smile' (default), 'frown', 'o' (shock), 'flat'
  const frown = mouth.clone(); frown.rotation.z = 0; frown.position.y = hr * 0.5; frown.visible = false; head.add(frown);
  const oMouth = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.1, hr * 0.035, 8, 20), mats.eye); oMouth.position.set(0, hr * 0.55, hr * 0.97); oMouth.visible = false; head.add(oMouth);
  const flat = new THREE.Mesh(new THREE.CapsuleGeometry(hr * 0.03, hr * 0.3, 4, 8), mats.eye); flat.rotation.z = Math.PI / 2; flat.position.set(0, hr * 0.58, hr * 0.97); flat.visible = false; head.add(flat);
  const mouths = { smile: mouth, frown, o: oMouth, flat };
  if (hairStyle !== 'none') {                       // a cartoon hair cap (tuft = young, side = parted, bald = ring)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.03, 32, 16, 0, Math.PI * 2, 0, hairStyle === 'bald' ? Math.PI * 0.25 : Math.PI * 0.42), mats.hair);
    cap.position.y = hr * 0.9; cap.rotation.x = -0.35; head.add(cap);
    if (hairStyle === 'bald') cap.visible = false;
    if (hairStyle === 'tuft') { const t = new THREE.Mesh(new THREE.ConeGeometry(hr * 0.35, hr * 0.5, 12), mats.hair); t.position.set(0.02, hr * 1.95, hr * 0.25); t.rotation.set(0.6, 0, -0.3); head.add(t); }
    if (hairStyle === 'bald' || hairStyle === 'side') { const ring = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.92, hr * 0.12, 8, 32, Math.PI * 1.4), mats.hair);
      ring.position.y = hr * 1.05; ring.rotation.set(Math.PI / 2, 0, Math.PI * 0.8); head.add(ring); }
  }
  if (glasses) for (const s of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.2, hr * 0.03, 8, 24), mats.glass); lens.position.set(s * hr * 0.35, hr * 1.0, hr * 0.97); head.add(lens);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(hr * 0.3, hr * 0.03, hr * 0.03), mats.glass); bridge.position.set(0, hr * 1.02, hr * 0.98); head.add(bridge);
  }
  if (moustache) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(hr * 0.06, hr * 0.35, 4, 8), mats.hair); m.rotation.z = Math.PI / 2; m.position.set(0, hr * 0.7, hr * 1.0); head.add(m); }
  for (const [s, n] of [[1, 'L'], [-1, 'R']]) {
    const sh = joint('shoulder' + n, chest, s * 0.24, 0.48);
    const ua = capsule(0.062, 0.24, mats.shirt); ua.position.y = -0.15; sh.add(ua);
    const el = joint('elbow' + n, sh, 0, -0.3);
    const fa = capsule(0.05, 0.22, mats.skin); fa.position.y = -0.13; el.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mats.skin); hand.position.y = -0.3; hand.castShadow = true; el.add(hand);
    sh.rotation.z = s * 0.12;
    const hip = joint('hip' + n, pelvis, s * 0.1, -0.02);
    const th = capsule(0.085, 0.3, mats.pants); th.position.y = -0.22; hip.add(th);
    const kn = joint('knee' + n, hip, 0, -0.45);
    const sn = capsule(0.07, 0.32, mats.pants); sn.position.y = -0.22; kn.add(sn);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.24), mats.shoes); foot.position.set(0, -0.48, 0.05); foot.castShadow = true; kn.add(foot);
  }
  if (coat) for (const n of ['L', 'R']) J['shoulder' + n].children[0].material = mats.coat;   // coat sleeves
  const all = Object.values(mats).filter(m => m !== mats.eye);
  return {
    group: root, joints: J, mats,
    /** 'smile' | 'frown' | 'o' | 'flat' */
    face(expr) { for (const [k, m] of Object.entries(mouths)) m.visible = k === expr; },
    /** gentle breathing + sway; call every frame before custom poses */
    idle(t, amt = 1) {
      J.chest.rotation.x = 0.02 * Math.sin(t * 1.7) * amt; J.chest.position.y = 0.08 + 0.004 * Math.sin(t * 1.7) * amt;
      J.head.rotation.y = 0.08 * Math.sin(t * 0.6) * amt; J.pelvis.rotation.y = 0.03 * Math.sin(t * 0.5) * amt;
      J.shoulderL.rotation.z = 0.12 + 0.02 * Math.sin(t * 1.7) * amt; J.shoulderR.rotation.z = -0.12 - 0.02 * Math.sin(t * 1.7) * amt;
      J.elbowL.rotation.x = J.elbowR.rotation.x = -0.08;
    },
    /** 0 = invisible, 1 = solid (x-ray effect when ~0.2) */
    setOpacity(a) { for (const m of all) { m.opacity = a; m.depthWrite = a > 0.95; } mats.eye.opacity = a; },
    /** limb segments in the character's local space, for vessel networks */
    segments() {
      root.updateMatrixWorld(true);
      const inv = root.matrixWorld.clone().invert();
      const P = (g, y = 0, x = 0, z = 0) => g.localToWorld(new THREE.Vector3(x, y, z)).applyMatrix4(inv);
      const S = [];
      const heart = P(J.chest, 0.36, 0.05, 0.04);
      S.push([heart, P(J.neck, 0.05), 0.022], [P(J.neck, 0.05), P(J.head, hr * 1.6), 0.012]);
      for (const n of ['L', 'R']) {
        S.push([heart, P(J['shoulder' + n]), 0.02], [P(J['shoulder' + n]), P(J['elbow' + n]), 0.016], [P(J['elbow' + n]), P(J['elbow' + n], -0.3), 0.012]);
        S.push([P(J.pelvis, 0), P(J['hip' + n], -0.02), 0.022], [P(J['hip' + n], -0.02), P(J['knee' + n]), 0.018], [P(J['knee' + n]), P(J['knee' + n], -0.46), 0.013]);
      }
      S.push([heart, P(J.pelvis, 0), 0.026]);
      return { heart, list: S };
    },
  };
}

// ---------- growable tubes ----------
/** Patch a material so geometry with attribute aGrow only shows where aGrow <= uniforms.uGrow. */
function growMaterial(mat) {
  mat.userData.uGrow = { value: 1 };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uGrow = mat.userData.uGrow;
    sh.vertexShader = 'attribute float aGrow;\nvarying float vGrow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrow = aGrow;');
    sh.fragmentShader = 'uniform float uGrow;\nvarying float vGrow;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\nif (vGrow > uGrow) discard;');
  };
  return mat;
}
/**
 * Procedural vessel / root / branch network along segments [[a, b, radius]...] grown outward from `origin`.
 * setGrow(0..1) reveals it progressively from the origin. Returns {mesh, setGrow}.
 */
export function makeVessels(segments, origin, { seed = 7, color = '#d0121b', branches = 9, depth = 2, jitter = 0.035 } = {}) {
  const R = rng(seed), geos = [];
  const maxD = Math.max(...segments.map(([a, b]) => Math.max(a.distanceTo(origin), b.distanceTo(origin)))) + 0.15;
  const tube = (pts, radius, g0, g1) => {
    const curve = new THREE.CatmullRomCurve3(pts), segs = Math.max(6, pts.length * 3);
    const geo = new THREE.TubeGeometry(curve, segs, radius, 5, false);
    const n = geo.attributes.position.count, a = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = Math.floor(i / 6) / segs; a[i] = lerp(g0, g1, u); }
    geo.setAttribute('aGrow', new THREE.BufferAttribute(a, 1)); geos.push(geo);
  };
  const wiggle = (a, b, steps, amp) => { const pts = [];
    for (let i = 0; i <= steps; i++) { const p = a.clone().lerp(b, i / steps);
      if (i > 0 && i < steps) p.add(new THREE.Vector3((R() - .5) * amp, (R() - .5) * amp, (R() - .5) * amp)); pts.push(p); } return pts; };
  const branch = (from, dir, len, radius, g0, lvl) => {
    const to = from.clone().add(dir.clone().multiplyScalar(len));
    const g1 = g0 + len / maxD * 0.9;
    tube(wiggle(from, to, 4, len * 0.25), radius, g0, g1);
    if (lvl < depth) for (let k = 0; k < 3; k++) {
      const u = 0.3 + R() * 0.6, p = from.clone().lerp(to, u);
      const d = dir.clone().add(new THREE.Vector3((R() - .5) * 1.6, (R() - .5) * 1.6, (R() - .5) * 1.6)).normalize();
      branch(p, d, len * (0.45 + R() * 0.3), radius * 0.55, lerp(g0, g1, u), lvl + 1);
    }
  };
  for (const [a, b, r] of segments) {
    const g0 = a.distanceTo(origin) / maxD, g1 = b.distanceTo(origin) / maxD;
    for (const side of [-1, 1]) {                 // paired artery/vein for density
      const off = new THREE.Vector3(side * 0.018, 0, 0.01 * side);
      tube(wiggle(a.clone().add(off), b.clone().add(off), 6, jitter), r * (side > 0 ? 1 : 0.8), g0, g1);
    }
    const axis = b.clone().sub(a);
    for (let k = 0; k < branches; k++) {
      const u = R(), p = a.clone().lerp(b, u);
      const d = new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize().add(axis.clone().normalize().multiplyScalar(0.6)).normalize();
      branch(p, d, 0.06 + R() * 0.1, r * 0.45, lerp(g0, g1, u), 1);
    }
  }
  const mat = growMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, emissive: color, emissiveIntensity: 0.25 }));
  const mesh = new THREE.Mesh(mergeGeometries(geos), mat); mesh.castShadow = true;
  return { mesh, setGrow: v => { mat.userData.uGrow.value = v; } };
}
/** A tube along points that draws itself: setProgress(0..1). Optional glowing tip. */
export function growLine(points, { radius = 0.05, color = '#e0141e', segments = 600, radial = 8, tip = true, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, segments, radius, radial, closed);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.35 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
  const group = new THREE.Group(); group.add(mesh);
  let tipMesh = null;
  if (tip) { tipMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.8, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffd6d6' })); group.add(tipMesh); }
  const perSeg = radial * 6;
  return {
    group, curve, mesh,
    setProgress(p) {
      p = clamp(p); geo.setDrawRange(0, Math.floor(p * segments) * perSeg);
      if (tipMesh) { tipMesh.visible = p > 0.001 && p < 0.999; tipMesh.position.copy(curve.getPointAt(Math.max(p, 0.0001))); }
    },
    tipAt: p => curve.getPointAt(clamp(p, 0.0001, 1)),
    tangentAt: p => curve.getTangentAt(clamp(p, 0.0001, 0.9999)),
  };
}

// ---------- textures ----------
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/** American-football field texture (length along x). */
export function footballFieldTexture() {
  return canvasTexture(2400, 1066, (g, w, h) => {
    for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? '#3f8f34' : '#469c3a'; g.fillRect(i * w / 24, 0, w / 24 + 1, h); }
    g.fillStyle = '#2f6fbf'; g.fillRect(0, 0, w / 12, h); g.fillRect(w - w / 12, 0, w / 12, h);
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    for (let y = 0; y <= 100; y += 5) { const x = w / 12 + y / 100 * (w * 10 / 12); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.lineWidth = y % 10 ? 3 : 6; g.stroke(); }
    g.fillStyle = '#fff'; g.font = 'bold 70px sans-serif'; g.textAlign = 'center';
    for (let y = 10; y < 100; y += 10) { const x = w / 12 + y / 100 * (w * 10 / 12), n = String(y <= 50 ? y : 100 - y);
      g.fillText(n, x, h * 0.2); g.save(); g.translate(x, h * 0.8); g.rotate(Math.PI); g.fillText(n, 0, 0); g.restore(); }
  });
}
/** Load world-atlas countries (needs topojson-client global, loaded by the harness). */
export async function loadWorld(res = '50m') {
  const topo = await (await fetch(`/node_modules/world-atlas/countries-${res}.json`)).json();
  return { land: window.topojson.feature(topo, topo.objects.countries), borders: window.topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b) };
}
/** Equirectangular map texture of a lon/lat window (stylised flat colours). */
export function mapTexture(world, { w = 4096, h = 2048, lon0 = -180, lon1 = 180, lat0 = -90, lat1 = 90, ocean = '#1f6fb8',
  palette = ['#5fae4a', '#6cbb52', '#7cc35c', '#58a346', '#8fca63', '#a7c96a', '#c9b977'], border = 'rgba(255,255,255,0.55)', seed = 3 } = {}) {
  const X = lon => (lon - lon0) / (lon1 - lon0) * w, Y = lat => (lat1 - lat) / (lat1 - lat0) * h;
  const R = rng(seed);
  const ringPath = (g, ring) => { let prev = null;
    for (const [lo, la] of ring) { if (!prev || Math.abs(lo - prev) > 180) g.moveTo(X(lo), Y(la)); else g.lineTo(X(lo), Y(la)); prev = lo; } g.closePath(); };
  return canvasTexture(w, h, g => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#2a7cc4'); grd.addColorStop(1, ocean); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (const f of world.land.features) {
      g.fillStyle = palette[Math.floor(R() * palette.length)];
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      g.beginPath(); for (const poly of polys) for (const ring of poly) ringPath(g, ring); g.fill('evenodd');
    }
    g.strokeStyle = border; g.lineWidth = Math.max(1, w / 2048);
    g.beginPath(); for (const line of world.borders.coordinates) ringPath(g, line); g.stroke();
  });
}
/** Sphere globe with atmosphere glow. lonLat(lon, lat, alt) -> Vector3 on the sphere (globe-local). */
export function makeGlobe(texture, radius = 1) {
  const group = new THREE.Group();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }));
  group.add(earth);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.06, 64, 48), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.75 - dot(vN, vec3(0,0,1.)), 3.0); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*i; }',
  }));
  group.add(atmo);
  const lonLat = (lon, lat, alt = 0) => { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180, r = radius * (1 + alt);
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  return { group, earth, lonLat };
}
/** Flat map plane on the XZ plane. lonLat(lon, lat, y) -> Vector3. */
export function makeFlatMap(texture, { lon0, lon1, lat0, lat1, scale = 1 }) {
  const wdt = (lon1 - lon0) * scale, dep = (lat1 - lat0) * scale;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wdt, dep), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }));
  mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true;
  const lonLat = (lon, lat, y = 0) => new THREE.Vector3((lon - lon0) * scale - wdt / 2, y, -((lat - lat0) * scale - dep / 2));
  return { mesh, lonLat, width: wdt, depth: dep };
}
export function stars(n = 2000, radius = 80, seed = 9) {
  const R = rng(seed), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(radius * (0.8 + R() * 0.2)); p.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: radius * 0.004, sizeAttenuation: true }));
}
/** Text label sprite (map pins, numbers). */
export function label(text, { size = 0.5, color = '#ffffff', bg = 'rgba(0,0,0,0.55)' } = {}) {
  const tex = canvasTexture(512, 128, (g, w, h) => { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 40); g.fill();
    g.fillStyle = color; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); s.scale.set(size * 4, size, 1); s.renderOrder = 10; return s;
}
/** Place camera on a path and aim it, in one call. */
export function aim(camera, pos, target, fov) { camera.position.copy(pos); camera.lookAt(target); if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); } }
