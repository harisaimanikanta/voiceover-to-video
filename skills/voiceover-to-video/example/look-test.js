// Lighting test: apply the reference reel's look (night interior, warm practical key, cool window rim, soft contact
// shadows, AO, city bokeh, long lens, restrained grade) to our own host character.
import * as THREE from 'three';
import { makeRenderer, makePost } from 'kit';
import { makeToon } from '/kit/toon.js';
import { soft, roundBox, practical } from '/kit/look.js';
import { desk, mug, plant, plankTexture } from '/kit/props.js';
import { tex } from './sets.js';
export const duration = 4; export const fps = 30; export const captions = [];
export async function setup({ canvas, width, height }) {
  const r = makeRenderer(canvas, width, height); r.shadowMap.type = THREE.VSMShadowMap; r.toneMappingExposure = 1.0;
  const post = makePost(r, width, height, { ao: true, bloom: 0.25, threshold: 0.97, grain: 0.03, vignette: 0.45 });
  const s = new THREE.Scene(); s.background = new THREE.Color('#05080f');
  // room: dark wall with a big window; city far behind (emissive lights -> bokeh)
  const wall = soft('#1a2230', 'clay', { roughness: 0.9 });
  for (const [x, w] of [[-2.6, 1.6], [2.6, 1.6]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.2), wall); p.position.set(x, 1.6, -1.6); p.receiveShadow = true; s.add(p); }
  const top = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.5), wall); top.position.set(0, 2.95, -1.6); s.add(top);
  for (const x of [-1.8, -0.6, 0.6, 1.8]) { const b = roundBox(0.06, 2.7, 0.08, soft('#0c0f16', 'metal'), 0.01); b.position.set(x, 1.55, -1.58); s.add(b); }
  const city = tex(2048, 1024, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a1530'); g.addColorStop(1, '#16264a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    let sd = 3; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) { const bw = 60 + rn() * 140, bh = 250 + rn() * 650, x = rn() * w; c.fillStyle = `rgb(${10 + rn() * 15},${18 + rn() * 15},${40 + rn() * 25})`; c.fillRect(x, h - bh, bw, bh);
      for (let k = 0; k < bh / 18; k++) for (let j = 0; j < bw / 16; j++) if (rn() < 0.22) { c.fillStyle = rn() < 0.7 ? '#ffc874' : '#cfe0ff'; c.fillRect(x + j * 16 + 4, h - bh + k * 18 + 4, 6, 8); } } });
  const cityM = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ map: city, toneMapped: false })); cityM.position.set(0, 3, -12); s.add(cityM);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), soft('#ffffff', 'wood', { map: plankTexture('#3a2a22', { seed: 2 }), roughness: 0.5 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  // desk (glossy wood), props
  const dk = desk({ w: 2.0, d: 0.8, color: '#6a3f26' }); dk.position.set(0, 0, 0.35); s.add(dk);
  const front = roundBox(2.0, 0.74, 0.05, soft('#4a2c1a', 'wood', { roughness: 0.35, clearcoat: 0.5 }), 0.02); front.position.set(0, 0.39, 0.74); s.add(front);
  dk.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.roughness = 0.28; o.material.clearcoat = 0.6; o.material.clearcoatRoughness = 0.2; } });
  const lap = new THREE.Group(); lap.position.set(-0.55, 0.785, 0.45); lap.rotation.y = 0.5; s.add(lap);
  lap.add(roundBox(0.42, 0.02, 0.3, soft('#b8bcc6', 'metal'), 0.008));
  const lid = new THREE.Group(); lid.position.set(0, 0.02, -0.15); lid.rotation.x = -0.3; lap.add(lid); const lb = roundBox(0.42, 0.28, 0.012, soft('#b8bcc6', 'metal'), 0.008); lb.position.y = 0.14; lid.add(lb);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.25), new THREE.MeshBasicMaterial({ color: '#cfe6ff', toneMapped: false })); scr.position.set(0, 0.14, 0.007); lid.add(scr);
  const p = plant({ h: 0.45, seed: 5 }); p.position.set(0.75, 0.785, 0.2); s.add(p); const m = mug('#d9643f'); m.position.set(0.45, 0.785, 0.55); s.add(m);
  // character
  const dan = makeToon({ headScale: 1.3, acting: 0.55, shirt: '#2f3f5f', pants: '#2a2e3a', hair: '#d8d8d8', hairStyle: 'curly', eye: '#3a2a1a', skin: '#efc6a6', glasses: true, build: 1.05 });
  dan.group.position.set(0, -0.3, -0.3); s.add(dan.group);
  // LIGHTS: warm practical key (desk lamp, upper left), cool window rim from behind, screen fill from below-front, very low ambient
  s.add(new THREE.HemisphereLight('#2a3a5a', '#1a120c', 0.25));
  const lamp = practical('#ffcf8a', 0, 1, { radius: 0.06 }); lamp.position.set(-1.0, 1.65, 0.3); s.add(lamp);
  const key = new THREE.SpotLight('#ffc98a', 7, 6, 0.75, 1.0, 1.6); key.position.set(-1.0, 1.65, 0.45); key.target.position.set(0, 1.2, -0.3); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 10; key.shadow.blurSamples = 20; key.shadow.bias = -0.0002; s.add(key, key.target);
  const rim = new THREE.DirectionalLight('#7fa8ff', 2.2); rim.position.set(1.5, 2.5, -3); rim.target.position.set(0, 1.3, -0.3); s.add(rim, rim.target);
  const fill = new THREE.PointLight('#bcd8ff', 1.2, 2.5, 2); fill.position.set(-0.45, 1.0, 0.55); s.add(fill);
  const bounce = new THREE.PointLight('#ff9a5a', 0.5, 3, 2); bounce.position.set(0, 0.9, 0.9); s.add(bounce);
  const cam = new THREE.PerspectiveCamera(22, width / height, 0.05, 100);
  return { render(t) {
    dan.rest(); dan.joints.hipL.rotation.x = dan.joints.hipR.rotation.x = -1.4; dan.joints.kneeL.rotation.x = dan.joints.kneeR.rotation.x = 1.4; dan.idle(t, 0.4); dan.face('calm'); dan.look(0, 0);
    for (const sd of ['L', 'R']) dan.reach(sd, new THREE.Vector3(sd === 'L' ? 0.17 : -0.17, 0.86, 0.2));
    const close = t > 2; const h = dan.headWorld();
    if (close) { cam.fov = 16; cam.position.set(0.1, 1.38, 2.9); cam.lookAt(h.x, h.y - 0.08, h.z); }
    else { cam.fov = 24; cam.position.set(0.3, 0.98, 4.0); cam.lookAt(0, 0.98, -0.2); }
    cam.updateProjectionMatrix();
    post.render(s, cam, t, { focus: cam.position.distanceTo(h), aperture: close ? 0.03 : 0.02, maxblur: 0.03, sat: 1.0, con: 1.08 });
  } };
}
