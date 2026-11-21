// Reference scene for the v3 cartoon look: dressed set, mood lighting, face rig, emotions, lip-sync, IK gestures,
// one continuous camera move. Copy its structure for new productions.
import * as THREE from 'three';
import { makeRenderer, makePost, clamp, smooth } from 'kit';
import { makeToon, speech } from '/kit/toon.js';
import { mood, faceRig } from '/kit/look.js';
import { cozyRoom } from '/kit/props.js';
import { particles, cameraRail, drift } from '/kit/fx.js';

export const duration = 10; export const fps = 30;
export const captions = [
  { t0: 0.3, t1: 2.3, text: 'Meet Sam.' }, { t0: 2.6, t1: 4.0, text: 'Hmm...' }, { t0: 4.2, t1: 5.8, text: 'Wait, WHAT?' },
  { t0: 6.1, t1: 7.9, text: 'Oh no...' }, { t0: 8.1, t1: 9.8, text: 'It worked!' },
];
// fake word timings for the demo lip-sync (a real production uses align.py words.json)
const WORDS = [[0.3, 0.7], [0.8, 1.4], [1.5, 2.2], [4.2, 4.6], [4.8, 5.6], [6.1, 6.5], [6.6, 7.6], [8.1, 8.4], [8.5, 9.4]].map(([start, end]) => ({ start, end }));
// emotion track: [time, emotion]; blends over 0.35 s
const EMO = [[0, 'happy'], [2.5, 'thinking'], [4.1, 'surprised'], [6.0, 'worried'], [8.0, 'joy']];

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height); renderer.toneMappingExposure = 1.0;
  const post = makePost(renderer, width, height, { ao: false, bloom: 0, grain: 0.025, vignette: 0.4 });
  const scene = new THREE.Scene();
  const M = mood(scene, 'interior'); M.focus(new THREE.Vector3(0, 1, 0), 3.5);
  const room = cozyRoom(scene, { seed: 3 });
  const sam = makeToon({ shirt: '#e8754a', pants: '#3f5f8a', hair: '#4a2c1a', hairStyle: 'tuft', eye: '#3f6fb0', skin: '#f0c09a' });
  sam.group.position.set(-0.2, 0, 0.3); sam.group.rotation.y = 0.25; scene.add(sam.group);
  const rig = faceRig(scene, sam);
  const dust = particles({ count: 220, center: [0.6, 1.5, -0.6], box: [2.2, 2, 2.5], size: 0.008, color: '#fff2d0', opacity: 0.6, motion: 'float', speed: 0.15, seed: 3 });
  dust.setScale(height); scene.add(dust.points);
  const cam = new THREE.PerspectiveCamera(35, width / height, 0.05, 100);
  const rail = cameraRail([
    { t: 0, pos: [2.2, 1.7, 4.4], at: [-0.1, 1.15, -0.4] },
    { t: 4, pos: [1.0, 1.6, 2.4], at: [-0.15, 1.45, 0.2] },
    { t: 7, pos: [0.2, 1.6, 2.1], at: [-0.2, 1.5, 0.3] },
    { t: 10, pos: [-0.75, 1.6, 2.1], at: [-0.2, 1.52, 0.3] },
  ]);
  const emoAt = t => { let i = 0; while (i + 1 < EMO.length && t >= EMO[i + 1][0]) i++; const k = i ? smooth((t - EMO[i][0]) / 0.35) : 1; return { from: EMO[Math.max(0, i - 1)][1], to: EMO[i][1], k }; };
  return { render(t) {
    const e = emoAt(t);
    sam.rest(); sam.posture(e.to, e.k); sam.idle(t);
    sam.face(e.to, { from: e.from, k: e.k, talk: speech(t, WORDS) });
    if (t > 4.1 && t < 6) { const k = smooth((t - 4.1) / 0.4) * (1 - smooth((t - 5.6) / 0.4)); sam.reach('L', sam.headWorld().add(new THREE.Vector3(0.28, -0.05 + 0.1 * k, 0.15)).lerp(sam.handWorld('L'), 1 - k)); }
    if (t > 6 && t < 8) { const k = smooth((t - 6.0) / 0.4) * (1 - smooth((t - 7.6) / 0.4)); const h = sam.headWorld(); sam.reach('R', new THREE.Vector3(h.x - 0.2, h.y + 0.12, h.z + 0.02).lerp(sam.handWorld('R'), 1 - k)); }
    if (t > 8) { const k = smooth((t - 8.0) / 0.3); for (const s of ['L', 'R']) { const h = sam.headWorld(); sam.reach(s, new THREE.Vector3(h.x + (s === 'L' ? 0.45 : -0.45), h.y + 0.35, h.z + 0.1).lerp(sam.handWorld(s), 1 - k)); sam.grip(s, 0.9); } }
    const r = rail.at(t); cam.position.copy(r.pos).add(drift(t, 0.012)); cam.lookAt(r.at); cam.fov = 35; cam.updateProjectionMatrix();
    rig.update(cam); dust.update(t);
    post.render(scene, cam, t, { focus: cam.position.distanceTo(sam.headWorld()), aperture: 0.004 });
  } };
}
