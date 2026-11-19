// shorts-renderer FX: particles, volumetric beams, glow materials, continuous camera helpers.
import * as THREE from 'three';
import { rng, clamp, smooth, lerp } from 'kit';

/**
 * Soft particle field (additive or normal blended). Deterministic: positions are a pure function of t.
 * box: [w,h,d] spawn volume centred at `center`; motion: 'float' | 'rise' | 'fall' | 'swirl' | 'burst'.
 */
export function particles({ count = 300, center = [0, 0, 0], box = [4, 3, 4], size = 0.03, color = '#fff6d8', opacity = 0.8, additive = true,
  motion = 'float', speed = 0.2, seed = 1, sizeVar = 0.6, life = 6, burstAt = 0, burstSpeed = 2 } = {}) {
  const R = rng(seed), base = new Float32Array(count * 3), rnd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    base.set([(R() - .5) * box[0], (R() - .5) * box[1], (R() - .5) * box[2]], i * 3);
    rnd.set([R(), R(), R(), R()], i * 4);
  }
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sizes = new Float32Array(count); for (let i = 0; i < count; i++) sizes[i] = size * (1 - sizeVar / 2 + rnd[i * 4] * sizeVar);
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const alphas = new Float32Array(count).fill(1); geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uScale: { value: 600 } },
    vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale;
      void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main(){ vec2 d = gl_PointCoord - .5; float r = length(d); if (r > .5) discard; float a = smoothstep(.5, 0., r); gl_FragColor = vec4(uColor, a * a * uOpacity * vA); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.position.set(...center); pts.frustumCulled = false;
  const api = {
    points: pts, material: mat,
    setScale(h) { mat.uniforms.uScale.value = h * 0.6; },
    update(t) {
      for (let i = 0; i < count; i++) {
        const [a, b, c, d] = [rnd[i * 4], rnd[i * 4 + 1], rnd[i * 4 + 2], rnd[i * 4 + 3]];
        let x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], al = 1;
        if (motion === 'float') { x += Math.sin(t * speed * (0.5 + a) + d * 6.28) * 0.15; y += Math.sin(t * speed * (0.4 + b) + c * 6.28) * 0.12; z += Math.cos(t * speed * (0.5 + c) + a * 6.28) * 0.15; al = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + d * 6)); }
        else if (motion === 'rise' || motion === 'fall') { const ph = ((t * speed * (0.6 + a) / box[1]) + d) % 1; y = (motion === 'rise' ? ph - .5 : .5 - ph) * box[1]; x += Math.sin(t * 2 + d * 6) * 0.05; al = Math.sin(ph * Math.PI); }
        else if (motion === 'swirl') { const ang = t * speed * (0.5 + a) + d * 6.28, r = 0.3 + b * box[0] / 2; x = Math.cos(ang) * r; z = Math.sin(ang) * r; y += Math.sin(t + c * 6) * 0.1; }
        else if (motion === 'burst') { const k = Math.max(0, t - burstAt), dir = new THREE.Vector3(a - .5, b - .5, c - .5).normalize(); const dist = burstSpeed * (0.4 + d) * (1 - Math.exp(-k * 2.5));
          x = dir.x * dist; y = dir.y * dist - 0.3 * k * k; z = dir.z * dist; al = k <= 0 ? 0 : Math.max(0, 1 - k / life); }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; alphas[i] = al;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.aAlpha.needsUpdate = true;
    },
  };
  api.update(0);
  return api;
}

/** Volumetric light shaft (additive cone with soft falloff). from → to, radius at the far end. */
export function lightBeam(from, to, { radius = 1, color = '#fff2cc', opacity = 0.18 } = {}) {
  const len = from.distanceTo(to);
  const geo = new THREE.ConeGeometry(radius, len, 48, 1, true); geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.5); float along = smoothstep(0., .25, vUv.y) * (1. - smoothstep(.6, 1., 1.-vUv.y)); gl_FragColor = vec4(uColor, edge * vUv.y * uOpacity); }',
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from); m.lookAt(to); m.rotateX(-Math.PI / 2);
  return m;
}

/** Emissive "glow" physical material. */
export const glowMat = (color, intensity = 1.5, o = {}) => new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3, ...o });

/** Rim-lit fresnel shell (soft halo around an object). */
export function halo(radius, color = '#7fd6ff', power = 2.4, strength = 0.9) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color(color) }, uP: { value: power }, uS: { value: strength } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uC; uniform float uP, uS; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), uP); gl_FragColor = vec4(uC, f * uS); }' }));
}

/** Smooth camera rail: positions + targets through keyframes [{t, pos:[x,y,z], at:[x,y,z], fov}] with Catmull-Rom interpolation. */
export function cameraRail(keys) {
  const ts = keys.map(k => k.t);
  const P = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.pos)), false, 'centripetal');
  const A = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.at)), false, 'centripetal');
  const u = t => { // map time → curve param with smooth velocity between keys (ease in/out only at the very ends)
    if (t <= ts[0]) return 0; if (t >= ts[ts.length - 1]) return 1;
    let i = 0; while (t > ts[i + 1]) i++;
    const local = (t - ts[i]) / (ts[i + 1] - ts[i]);
    return (i + local) / (ts.length - 1);
  };
  return {
    at(t) {
      const k = u(t), i = Math.min(keys.length - 2, Math.floor(k * (keys.length - 1))), f = k * (keys.length - 1) - i;
      const fov = lerp(keys[i].fov ?? 40, keys[i + 1].fov ?? 40, smooth(f));
      return { pos: P.getPoint(k), at: A.getPoint(k), fov };
    },
  };
}
/** Organic handheld drift (deterministic) to keep the frame alive. */
export function drift(t, amt = 0.02, seed = 0) {
  return new THREE.Vector3(Math.sin(t * 0.9 + seed) * amt + Math.sin(t * 2.3 + seed * 2) * amt * 0.3, Math.sin(t * 1.1 + seed * 3) * amt * 0.7, Math.cos(t * 0.7 + seed) * amt * 0.5);
}
export function shake(t, t0, dur = 0.35, amt = 0.05) {
  const k = clamp((t - t0) / dur); if (k <= 0 || k >= 1) return new THREE.Vector3();
  const e = (1 - k) * (1 - k) * amt; return new THREE.Vector3(Math.sin(t * 97) * e, Math.cos(t * 83) * e, Math.sin(t * 71) * e * 0.5);
}
/** Bell curve 0→1→0 centred at c with half-width w (for fills / zoom blur at transitions). */
export const bell = (t, c, w) => { const x = (t - c) / w; return Math.abs(x) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(x * Math.PI); };
