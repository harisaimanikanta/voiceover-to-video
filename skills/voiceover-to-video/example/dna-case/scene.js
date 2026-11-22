// Reference production (V3, clarity-first): titles, live family-tree chart, chained shots, smooth gestures, subtle acting, menacing villain. voice.mp3 not included.
// "Caught by His Cousins' DNA" v3 - clarity first. One continuous take, 10 environments, key-fact titles,
// every shot literally shows its sentence; camera = chained shots (no snaps); gestures = smooth envelopes;
// subtle acting for normal people, a menacing hooded villain. Synced to voice.mp3 (103.8 s).
import * as THREE from 'three';
import { makeRenderer, makePost, lerp, clamp, prog, smooth, easeInOut, captionsFromLines } from 'kit';
import { particles, drift, bell, guardCamera, env, lensProbe, shots } from '/kit/fx.js';
import { makeToon, speech } from '/kit/toon.js';
import { mood, faceRig, soft } from '/kit/look.js';
import { V, hostSet, street70s, bedroom, bat, caseOffice, dnaWorld, recordsRoom, suburb, binoculars, swabStick, policeCap, matchLab, driveway, handcuffs } from './sets.js';
import { wantedPoster, office3, newspaper } from './sets3.js';

const LINES = await (await fetch('/scene/lines.json')).json();
const WORDS = (await (await fetch('/scene/words.json')).json()).map(w => ({ start: w[1], end: w[2] }));
const NUM = [['forty years', '40 years'], ['nineteen seventies', '1970s'], ['thirteen', '13'], ['nineteen eighty six', '1986'], ['thirty years', '30 years'], ['twenty eighteen', '2018'], ['eighteen hundreds', '1800s'], ['seventy two', '72']];
export const duration = 103.81;
export const fps = 30;
export const captions = captionsFromLines(LINES.map(([t, end, text]) => ({ t, end, text: NUM.reduce((s, [a, b]) => s.replace(a, b), text) })));
export const captionStyle = { y: 0.78, size: 0.056 };
// key facts on screen (what the viewer must understand), top of frame
const T = (t0, t1, text, sub, o = {}) => ({ t0, t1, text, sub, ...o });
export const titles = [
  T(0.3, 3.6, '40 YEARS', 'never caught'), T(4.1, 7.3, 'HIS COUSINS', 'turned him in, without knowing'), T(7.8, 10.4, 'A DNA TEST', "but someone else's"),
  T(10.9, 13.7, 'CALIFORNIA', 'the 1970s', { color: '#3a4f8a' }), T(14.2, 16.75, 'A MASKED MAN', 'breaking into homes', { color: '#7a1e14' }),
  T(17.1, 22.6, 'PEOPLE WERE TERRIFIED', 'tambourines on doors, bats in bed', { size: 0.062, color: '#7a1e14' }),
  T(23.0, 25.3, '13 VICTIMS', '', { color: '#7a1e14' }), T(25.7, 30.0, '1986', 'he just stops'), T(30.4, 33.3, 'HE LEFT DNA', 'at the crime scenes'),
  T(33.6, 37.6, 'DNA', 'your unique code', { color: '#2f8f8a' }), T(37.9, 42.3, 'POLICE DNA FILES', 'only criminals are in them', { size: 0.07, color: '#3a4f8a' }),
  T(42.6, 43.4, 'NO MATCH', '', { color: '#c0392b' }), T(43.7, 47.5, '30 YEARS', 'waiting'), T(47.9, 52.0, '2018', 'a new idea', { color: '#2f8f8a' }),
  T(52.2, 56.4, 'FAMILY WEBSITE', "upload the killer's DNA", { size: 0.07, color: '#2f8f8a' }), T(57.3, 59.8, 'COUSINS FOUND', 'he is not on it, they are', { color: '#1f8a5a' }),
  T(60.0, 62.8, 'SHARED DNA', 'family share pieces', { color: '#c0392b' }), T(63.1, 66.3, 'BACK TO THE 1800s', '', { size: 0.068 }), T(66.5, 70.9, 'FORWARD AGAIN', 'branch by branch'),
  T(71.2, 73.2, 'RIGHT AGE + PLACE', '', { size: 0.066 }), T(73.5, 74.8, 'ONE NAME', ''), T(75.1, 79.8, 'AGE 72', 'living quietly near Sacramento'),
  T(80.1, 82.4, 'STAKEOUT', 'they need proof'), T(85.4, 88.2, 'SECRET DNA SAMPLE', 'from his car door handle', { size: 0.064 }), T(88.55, 89.4, "IT'S A MATCH", '', { color: '#1f8a5a' }),
  T(91.2, 93.3, 'EX-POLICE OFFICER', '', { size: 0.068, color: '#3a4f8a' }), T(93.4, 96.4, 'FIRED', 'for stealing a hammer + dog spray', { color: '#7a1e14' }),
  T(96.7, 98.8, 'HE NEVER TOOK A TEST', '', { size: 0.064 }), T(99.05, 100.1, 'HIS COUSINS DID', '', { size: 0.07, color: '#1f8a5a' }), T(100.35, 103.75, 'IS YOUR DNA OUT THERE?', '', { size: 0.058 }),
];

const PORTALS = [[10.63, 0.2, '#0b1430', 0.4], [16.9, 0.14, '#05070f', 0.3], [22.79, 0.15, '#000000', 0.2], [32.18, 0.14, '#eaf6ff', 0.4], [37.73, 0.13, '#ffffff', 0.3],
  [47.65, 0.15, '#d9c8a8', 0.3], [73.31, 0.14, '#fff4d6', 0.4], [88.37, 0.15, '#ffffff', 0.4], [89.57, 0.14, '#ffffff', 0.3], [96.5, 0.12, '#fff1d6', 0.3]];
const SEG = [['host', 0, 10.63], ['street', 10.63, 16.9], ['bed', 16.9, 22.79], ['case', 22.79, 32.18], ['dna', 32.18, 37.73], ['records', 37.73, 47.65], ['office', 47.65, 73.31],
  ['suburb', 73.31, 88.37], ['match', 88.37, 89.57], ['arrest', 89.57, 96.5], ['host2', 96.5, 103.82]].map(([n, s, e]) => ({ n, s, e }));
const segAt = t => SEG.find(x => t >= x.s && t < x.e) || SEG[SEG.length - 1];
const L = (a, b, k) => a.clone().lerp(b, clamp(k));
function emoAt(track, t) { let i = 0; while (i + 1 < track.length && t >= track[i + 1][0]) i++; return { from: track[Math.max(0, i - 1)][1], to: track[i][1], k: i ? smooth((t - track[i][0]) / 0.45) : 1 }; }
function act(c, t, track, { talk = 0, idle = 1, look = null, posture = true } = {}) {
  const e = emoAt(track, t); c.rest(); if (posture) c.posture(e.to, e.k * 0.5); c.idle(t, idle); c.face(e.to, { from: e.from, k: e.k, talk }); c.look(...(look || [null])); return e;
}
const put = (c, scene, x, z, ry = 0) => { if (c.group.parent !== scene) scene.add(c.group); c.group.visible = true; c.group.position.set(x, 0, z); c.group.rotation.set(0, ry, 0); };
/** gesture: blend a hand from its rest position to a target with a smooth envelope (never pops) */
const gesture = (c, side, target, w, grip = null) => { if (w <= 0.001) return; c.reach(side, L(c.handWorld(side), target, w)); if (grip != null) c.grip(side, lerp(0.25, grip, w)); };

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height); renderer.toneMappingExposure = 1.0;
  const post = makePost(renderer, width, height, { ao: false, bloom: 0, grain: 0.02, vignette: 0.35 });
  const cam = new THREE.PerspectiveCamera(40, width / height, 0.02, 400);
  const S = {}; const P = [];
  const mk = (n, m, o) => { const s = new THREE.Scene(); S[n] = s; s.userData.mood = mood(s, m, o); return s; };
  const addP = (scene, o) => { const p = particles(o); p.setScale(height); scene.add(p.points); P.push([scene, p]); return p; };

  // ---- cast: normal people act subtly (acting 0.45-0.55); the villain is menacing by design
  const dan = makeToon({ acting: 0.55, shirt: '#2f8f8a', pants: '#3a3f52', hair: '#3a2618', hairStyle: 'side', eye: '#5a3b20', skin: '#e8b088', glasses: true, build: 1.05 });
  const villain = makeToon({ acting: 1, catchlights: false, hood: '#121419', skin: '#1a1d26', shirt: '#14161c', pants: '#1a1c22', shoes: '#0c0c0c', hairStyle: 'none', eye: '#2a2a2a', lips: '#1a1d26', brows: '#0c0d12', build: 1.15 });
  villain.mats.eye.color.set('#d8d0c0');
  const wife = makeToon({ acting: 0.45, skin: '#f3c7a5', hair: '#c8742c', hairStyle: 'bob', shirt: '#e8a0b8', eye: '#4a7a3a' });
  const husband = makeToon({ acting: 0.45, hair: '#2a1c12', hairStyle: 'tuft', shirt: '#9ab8e0', moustache: true, eye: '#5a3b20' });
  const det86 = makeToon({ acting: 0.45, hair: '#5a4030', hairStyle: 'side', shirt: '#e8e4d8', tie: '#7a3a2a', moustache: true, skin: '#e8b796', pants: '#5a4a3a' });
  const det1 = makeToon({ acting: 0.5, skin: '#c98f6a', hair: '#2a1a12', hairStyle: 'bun', shirt: '#f2efe6', coat: '#6a5a8a', eye: '#3a2a1a', pants: '#2a2e3a' });
  const det2 = makeToon({ acting: 0.5, hair: '#7a7a7a', hairStyle: 'side', shirt: '#e8e8e0', tie: '#2f4f8a', glasses: true, skin: '#f0c09a', build: 1.1, pants: '#3a3f52' });
  const oldman = makeToon({ acting: 0.4, skin: '#efc4a4', hair: '#e0e0e0', hairStyle: 'bald', shirt: '#c8b48a', pants: '#6a6a6a', eye: '#5a6a7a', brows: '#d8d8d8', build: 1.1, shape: { jaw: 1.15 } });
  const officer = makeToon({ acting: 0.45, skin: '#8a5a3c', hair: '#1a1008', hairStyle: 'none', shirt: '#2f4f8a', pants: '#1d2a4a', eye: '#3a2a1a' });
  const cap = policeCap(); officer.head.add(cap); cap.position.set(0, officer.HR * 0.72, -officer.HR * 0.05); cap.scale.setScalar(1.55); cap.rotation.x = -0.12;
  const CAST = [dan, villain, wife, husband, det86, det1, det2, oldman, officer];

  // ---- HOST study
  const host = mk('host', 'interior'); const H = hostSet(host);
  const poster = wantedPoster(); Object.assign(H.sketch.userData.photo.material, { map: poster, emissiveMap: poster }); H.sketch.userData.photo.material.needsUpdate = true; H.sketch.scale.setScalar(1.25);
  addP(host, { count: 160, center: [0.6, 1.5, -1.2], box: [3, 2, 2.5], size: 0.007, color: '#fff2d0', opacity: 0.5, motion: 'float', speed: 0.12, seed: 3 });
  const rigDan = faceRig(host, dan);
  const kitPoint = t => { const show = Math.max(env(t, 7.75, 10.9, 0.5), env(t, 96.3, 104.5, 0.5)); return dan.group.localToWorld(L(V(0.26, 0.98, 0.16), V(0.06, 1.3, 0.36), show)); };

  // ---- 1970s street (night) + villain
  const st = mk('street', 'night', { shadowSize: 8 }); const ST = street70s(st);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), new THREE.MeshBasicMaterial({ color: '#fff2c8', fog: false })); moon.position.set(35, 40, -120); st.add(moon);
  addP(st, { count: 120, center: [2, 2, 2], box: [12, 4, 16], size: 0.02, color: '#c8ff9a', opacity: 0.7, motion: 'float', speed: 0.4, seed: 5 });
  const flash = new THREE.Group(); flash.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.2, 16), soft('#3a3a40', 'metal')));
  const beam = new THREE.SpotLight('#fff2c8', 25, 9, 0.4, 0.5, 1.2); beam.position.y = -0.1; flash.add(beam, beam.target); beam.target.position.set(0, -2, 0);
  villain.hold(flash, 'R', [0, -0.08, 0.04], [Math.PI / 2 + 0.6, 0, 0]);
  const rigVillain = faceRig(st, villain, { key: '#7f9cff', rim: '#ff3a2a', keyI: 0.7, rimI: 4.0, keyY: -0.35 });

  // ---- bedroom
  const bd = mk('bed', 'night', { sky: false }); const BD = bedroom(bd);
  const theBat = bat(); husband.hold(theBat, 'R', [0, -0.08, 0.03], [0.3, 0, 0]);
  const rigHus = faceRig(bd, husband, { keyI: 1.0 }), rigWife = faceRig(bd, wife, { keyI: 0.9 });

  // ---- 1980s case office
  const cs = mk('case', 'interior'); const CS = caseOffice(cs); const rigDet86 = faceRig(cs, det86);
  addP(cs, { count: 160, center: [0, 1.5, -0.8], box: [5, 2.5, 3], size: 0.008, color: '#ffe8c0', opacity: 0.5, motion: 'float', speed: 0.12, seed: 4 });

  // ---- DNA
  const dn = mk('dna', 'dream'); const DN = dnaWorld(dn);
  addP(dn, { count: 300, center: [0, 0, 0], box: [8, 10, 8], size: 0.025, color: '#ffffff', opacity: 0.7, motion: 'float', speed: 0.3, seed: 6 });

  // ---- records
  const rc = mk('records', 'lab', { sky: false }); const RC = recordsRoom(rc);
  const dust = addP(rc, { count: 220, center: [3.95, 2.6, -1.0], box: [2.5, 2.5, 1.6], size: 0.011, color: '#fff4d6', opacity: 0.8, motion: 'fall', speed: 0.15, seed: 12 });

  // ---- 2018 office + live family-tree chart
  const of = mk('office', 'day', { sky: false }); const OF = office3(of);
  const rigDet1 = faceRig(of, det1), rigDet2 = faceRig(of, det2, { keyI: 0.9 });
  const SCR = OF.screenGroup.position; const onScreen = (u, v) => V(SCR.x + (u - 0.5) * 1.04, SCR.y + (0.5 - v) * 1.82, SCR.z + 0.05);

  // ---- suburb
  const sb = mk('suburb', 'day', { shadowSize: 10 }); const SB = suburb(sb); SB.oldCar.position.set(-3.9, 0, -10.4);
  const nozzle = new THREE.Group(); nozzle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 12), soft('#2fa86a', 'plastic'))); oldman.hold(nozzle, 'R', [0, -0.09, 0.05], [1.4, 0, 0]);
  const water = addP(sb, { count: 120, center: [0, 0, 0], box: [0.35, 0.3, 0.7], size: 0.015, color: '#bfe8ff', opacity: 0.85, motion: 'fall', speed: 2.2, seed: 31 });
  const bino = binoculars(); sb.add(bino); const swab = swabStick(); sb.add(swab);
  const rigOld = faceRig(sb, oldman), rigOff = faceRig(sb, officer, { keyI: 1.0 }), rigDet2b = faceRig(sb, det2, { keyI: 0.9 });

  // ---- match lab
  const mt = mk('match', 'lab', { sky: false }); const MT = matchLab(mt); const rigM = faceRig(mt, det2);

  // ---- arrest
  const ar = mk('arrest', 'golden', { shadowSize: 6 }); const AR = driveway(ar);
  const cuffs = handcuffs(); ar.add(cuffs); const paper = newspaper(); ar.add(paper);
  const rigOld2 = faceRig(ar, oldman), rigDet1b = faceRig(ar, det1, { keyI: 0.9 });

  // ---- camera chains (lesson L028): each move starts where the previous ended
  const head = (c, d = V(0, 0, 0)) => () => c.headWorld().add(d);
  const CAM = {
    host: shots([
      { t: 0, pos: V(-0.15, 1.6, 2.3), at: V(-0.12, 1.55, -1.8), fov: 46 },
      { t: 3.9, pos: V(-0.12, 1.6, 1.8), at: V(-0.1, 1.58, -1.8), fov: 46 },
      { t: 7.5, pos: V(0.05, 1.6, 1.45), at: V(0.05, 1.6, -1.8), fov: 44 },
      { t: 10.63, pos: () => kitPoint(10.63).add(V(0.0, 0.04, 0.42)), at: () => kitPoint(10.63), fov: 42 }]),
    street: shots([
      { t: 10.63, pos: V(-1.2, 9, 18), at: V(1, 1, -8), fov: 45 },
      { t: 13.6, pos: V(1.4, 1.2, -2.6), at: head(villain, V(0, -0.2, 0)), fov: 40 },
      { t: 15.0, pos: V(1.7, 1.05, -2.6), at: head(villain, V(0, -0.1, 0)), fov: 40 },
      { t: 16.0, pos: V(3.0, 1.35, -2.9), at: () => villain.headWorld().lerp(V(5.46, 1.68, -1.02), 0.5), fov: 42 },
      { t: 16.9, pos: V(4.6, 1.6, -1.75), at: V(5.46, 1.68, -1.02), fov: 42 }]),
    bed: shots([
      { t: 16.9, pos: V(1.75, 0.95, 0.4), at: V(2.38, 0.85, -0.24), fov: 40 },
      { t: 18.3, pos: V(1.6, 1.05, 0.65), at: V(2.38, 0.85, -0.24), fov: 40 },
      { t: 20.75, pos: V(0.9, 1.35, 1.25), at: V(-0.3, 1.15, -1.2), fov: 40 },
      { t: 22.79, pos: head(husband, V(0.55, -0.05, 1.05)), at: head(husband, V(-0.05, -0.12, 0)), fov: 40 }]),
    case: shots([
      { t: 22.79, pos: V(-0.75, 1.65, -0.1), at: V(-0.8, 1.65, -2.45), fov: 48 },
      { t: 25.3, pos: V(-0.8, 1.65, -0.35), at: V(-0.8, 1.65, -2.45), fov: 48 },
      { t: 26.7, pos: V(0.6, 1.6, 1.4), at: V(0.75, 1.62, -1.5), fov: 46 },
      { t: 27.8, pos: V(0.6, 1.6, 1.3), at: V(0.75, 1.62, -1.5), fov: 46 },
      { t: 29.9, pos: V(-0.3, 1.45, 2.2), at: V(-0.8, 1.0, -1.0), fov: 50 },
      { t: 30.3, pos: V(-0.25, 1.45, 2.1), at: V(-0.6, 1.0, -1.0), fov: 50 },
      { t: 32.18, pos: () => CS.bag.position.clone().add(V(0, 0.28, 0.24)), at: () => CS.bag.position.clone(), fov: 45 }]),
    records: shots([
      { t: 37.73, pos: V(-4.05, 1.35, 0.2), at: V(-4.5, 1.05, -1.25), fov: 40 },
      { t: 42.4, pos: V(2.75, 1.35, 0.2), at: V(2.3, 1.05, -1.25), fov: 40 },
      { t: 43.4, pos: V(2.75, 1.35, 0.2), at: V(2.4, 1.05, -1.25), fov: 40 },
      { t: 47.65, pos: V(3.8, 3.05, -0.5), at: V(3.95, 2.95, -1.58), fov: 40 }]),
    office: shots([
      { t: 47.65, pos: V(-0.5, 1.55, 0.8), at: V(-0.5, 1.42, -1.85), fov: 42 },
      { t: 52.0, pos: V(-0.4, 1.55, 0.55), at: V(-0.5, 1.42, -1.85), fov: 42 },
      { t: 53.6, pos: V(1.0, 1.72, 0.1), at: V(1.35, 1.72, -2.44), fov: 50 },
      { t: 56.6, pos: V(1.3, 1.72, -0.25), at: V(1.35, 1.72, -2.44), fov: 50 },
      { t: 57.6, pos: V(1.2, 1.3, -1.0), at: V(1.18, 1.25, -2.44), fov: 46 },
      { t: 59.6, pos: V(1.22, 1.25, -1.0), at: V(1.2, 1.18, -2.44), fov: 46 },
      { t: 60.6, pos: V(1.33, 1.15, -1.05), at: V(1.35, 1.08, -2.44), fov: 44 },
      { t: 62.8, pos: V(1.33, 1.15, -1.05), at: V(1.35, 1.08, -2.44), fov: 44 },
      { t: 63.9, pos: V(1.33, 1.88, -1.15), at: V(1.35, 1.88, -2.44), fov: 46 },
      { t: 66.3, pos: V(1.33, 1.88, -1.15), at: V(1.35, 1.88, -2.44), fov: 46 },
      { t: 67.6, pos: V(1.2, 1.72, -0.2), at: V(1.35, 1.72, -2.44), fov: 50 },
      { t: 71.2, pos: V(1.2, 1.72, -0.2), at: V(1.35, 1.72, -2.44), fov: 50 },
      { t: 73.31, pos: () => onScreen(0.736, 0.6).add(V(0, 0, 0.38)), at: () => onScreen(0.736, 0.6), fov: 40 }]),
    suburb: shots([
      { t: 73.31, pos: V(3.33, 1.55, -0.04), at: head(oldman, V(0, -0.25, 0)), fov: 40 },
      { t: 79.7, pos: V(2.02, 1.75, 1.93), at: head(oldman, V(0, -0.2, 0)), fov: 40 },
      { t: 81.5, pos: V(1.9, 1.7, 8.4), at: head(det2, V(0.05, -0.12, 0.35)), fov: 40 },
      { t: 82.5, pos: V(1.6, 1.68, 7.3), at: head(det2, V(0.05, -0.12, 0.35)), fov: 40 },
      { t: 83.4, pos: V(0.2, 1.65, 2.0), at: V(-4.0, 1.2, -8.5), fov: 40 },
      { t: 84.9, pos: V(-1.9, 1.6, -7.2), at: V(-5.2, 1.15, -9.9), fov: 40 },
      { t: 85.6, pos: V(-1.6, 1.35, -8.0), at: V(-2.7, 0.85, -10.1), fov: 46 },
      { t: 86.6, pos: V(-2.4, 1.1, -8.9), at: V(-2.9, 0.84, -10.1), fov: 44 },
      { t: 88.37, pos: V(-2.87, 0.95, -9.45), at: V(-2.99, 0.84, -10.12), fov: 36 }]),
    arrest: shots([
      { t: 89.57, pos: () => cuffs.position.clone().add(V(0.12, 0.1, 0.45)), at: () => cuffs.position.clone(), fov: 40 },
      { t: 91.1, pos: V(0.85, 1.5, 2.3), at: head(oldman, V(0, -0.25, 0)), fov: 42 },
      { t: 92.7, pos: V(0.1, 1.45, 2.0), at: () => paper.position.clone(), fov: 42 },
      { t: 96.5, pos: () => paper.position.clone().add(V(0.05, -0.05, 0.95)), at: () => paper.position.clone().add(V(0, -0.04, 0)), fov: 42 }]),
    host2: shots([
      { t: 96.5, pos: head(dan, V(0.12, -0.3, 1.35)), at: head(dan, V(0, -0.3, 0)), fov: 42 },
      { t: 98.9, pos: V(0.85, 1.5, 1.5), at: head(dan, V(0, -0.15, 0)), fov: 42 },
      { t: 100.3, pos: V(0.15, 1.6, 1.6), at: V(0.1, 1.6, -1.6), fov: 44 },
      { t: 103.81, pos: head(dan, V(0.08, 0.0, 1.3)), at: head(dan, V(0, -0.12, 0)), fov: 36 }]),
  };

  return {
    async render(t) {
      const seg = segAt(t);
      let scene, focus = null, aperture = 0, exposure = 1.0; const rig = [];
      switch (seg.n) {
        case 'host': case 'host2': {
          scene = host; put(dan, host, 0.35, -0.85, -0.12);
          const end = seg.n === 'host2';
          const track = end ? [[96.5, 'calm'], [97.6, 'sad'], [99.0, 'smug'], [100.4, 'determined']] : [[0, 'calm'], [4.0, 'smug'], [7.7, 'thinking']];
          act(dan, t, track, { talk: speech(t, WORDS), look: end && t > 100.4 ? [0, 0] : null });
          // point at the cousins on the board
          const pw = end ? env(t, 99.0, 100.5, 0.3) : env(t, 4.3, 7.3, 0.4);
          gesture(dan, 'R', dan.group.localToWorld(V(-0.55, 1.42, 0.22)), pw, 0.55);
          // point at the viewer at the end
          gesture(dan, 'R', dan.group.localToWorld(V(-0.12, 1.38, 0.56)), env(t, 100.9, 104.5, 0.45), 0.6);
          H.cousins.forEach((c, i) => { const s = end ? 1 : smooth(prog(t, 4.3 + i * 0.25, 4.65 + i * 0.25)); c.scale.setScalar(Math.max(0.001, s));
            c.userData.photo.material.emissiveIntensity = 0.5 * (end ? env(t, 99.0, 100.4, 0.3) : env(t, 4.5, 7.3, 0.4)); });
          H.kit.position.copy(kitPoint(t)); H.kit.rotation.set(0, dan.group.rotation.y, 0);
          H.kit.updateMatrixWorld(true); dan.reach('L', H.kit.localToWorld(V(0.075, -0.03, 0))); dan.grip('L', 0.8);
          focus = cam.position.distanceTo(dan.headWorld()); aperture = 0.002; rig.push(rigDan); break;
        }
        case 'street': {
          scene = st;
          const A = V(2.8, 0, 5.0), B = V(2.8, 0, -1.0), C = V(4.85, 0, -1.0);
          const k1 = prog(t, 11.0, 14.6), k2 = smooth(prog(t, 14.6, 16.6));
          const mp = k2 > 0 ? L(B, C, k2) : L(A, B, k1); const dist = A.distanceTo(B) * k1 + B.distanceTo(C) * k2;
          put(villain, st, mp.x, mp.z, lerp(Math.PI, Math.PI / 2, smooth(prog(t, 14.5, 15.1))));
          act(villain, t, [[0, 'menacing']], { idle: 0.2, look: [0.25 * Math.sin(t * 0.9), -0.05], posture: false });
          if (t < 16.6) villain.walkDist(dist, 0.62, 0.7 * (1 - smooth(prog(t, 16.2, 16.6))));
          villain.joints.chest.rotation.x += 0.22; villain.joints.head.rotation.x -= 0.12;
          villain.reach('R', villain.group.localToWorld(V(-0.18, 1.05, 0.35)));
          rig.push(rigVillain); st.userData.mood.focus(V(3, 0, 1), 8); break;
        }
        case 'bed': {
          scene = bd;
          for (const [c, x] of [[wife, -0.72], [husband, 0.12]]) { put(c, bd, x, -1.28, 0); c.group.position.y = -0.24; }
          act(wife, t, [[0, 'worried']], { idle: 0.5, look: [0.55 + 0.15 * Math.sin(t * 0.9), 0], posture: false });
          act(husband, t, [[0, 'worried'], [20.7, 'scared']], { idle: 0.5, look: [0.4 * Math.sin(t * 0.8), 0.05], posture: false });
          for (const c of [wife, husband]) { c.joints.hipL.rotation.x = c.joints.hipR.rotation.x = -1.45; c.joints.head.rotation.y += 0.4; }
          wife.reach('L', wife.group.localToWorld(V(0.12, 1.0, 0.3))); wife.reach('R', wife.group.localToWorld(V(-0.05, 1.0, 0.32))); wife.grip('L', 1); wife.grip('R', 1);
          const up = env(t, 20.5, 30, 0.6);
          husband.reach('R', husband.group.localToWorld(L(V(-0.2, 0.95, 0.3), V(-0.15, 1.22, 0.32), up))); husband.reach('L', husband.group.localToWorld(L(V(0.15, 0.85, 0.3), V(-0.02, 1.06, 0.33), up))); husband.grip('L', lerp(0.3, 1, up));
          theBat.rotation.set(lerp(0.3, -0.5, up), 0, lerp(0, 0.4, up));
          const jing = bell(t, 18.3, 1.0) + bell(t, 20.0, 0.5) * 0.5; BD.tam.rotation.z = Math.sin(t * 38) * 0.18 * jing; BD.tam.userData.jingles.forEach((j, i) => { j.rotation.z = Math.sin(t * 50 + i) * jing; });
          const off = 1 - smooth(prog(t, 22.45, 22.62)); BD.bulb.intensity = 4.5 * off; BD.shade.material.emissiveIntensity = 0.6 * off;
          focus = cam.position.distanceTo(husband.headWorld()); aperture = 0.002; rig.push(rigHus, rigWife); break;
        }
        case 'case': {
          scene = cs; put(det86, cs, 1.0, -1.6, -0.15);
          act(det86, t, [[22.79, 'worried'], [25.6, 'thinking'], [28.0, 'sad'], [30.3, 'calm']], { idle: 0.6, look: t < 27.5 ? [-0.5, 0.2] : t < 30.3 ? [-0.7, -0.1] : [-0.3, -0.6] });
          CS.pins13.forEach((pn, i) => { const k = smooth(prog(t, 23.07 + i * 0.16, 23.3 + i * 0.16)); pn.scale.setScalar(Math.max(0.001, k)); });
          CS.setYear(Math.round(lerp(1976, 1986, easeInOut(prog(t, 25.7, 27.3)))));
          const fall = smooth(prog(t, 27.9, 28.7)); CS.cut.rotation.set(-fall * 1.45, 0, 0);
          const gone = smooth(prog(t, 29.43, 29.95)); CS.cut.scale.setScalar(Math.max(0.001, 1 - gone));
          CS.lamp.userData.light.intensity = 2.6 * smooth(prog(t, 30.25, 30.5));
          focus = cam.position.distanceTo(t > 30.2 ? CS.bag.position : det86.headWorld()); aperture = 0.0015; rig.push(rigDet86); break;
        }
        case 'dna': { scene = dn; DN.helix.rotation.y = t * 0.3; exposure = 1.05; break; }
        case 'records': {
          scene = rc;
          const k = easeInOut(prog(t, 37.9, 42.4)); const cp = V(lerp(-4.6, 2.2, k), 1.05 + 0.04 * Math.sin(t * 2), -1.25);
          RC.card.position.copy(cp); RC.card.rotation.set(0, -0.25, 0.03 * Math.sin(t * 2));
          RC.cabs.forEach(c => { const d = Math.abs(c.position.x - cp.x); c.userData.fronts.forEach((f, i) => { f.position.z = 0.33 + (i === 1 ? 0.25 * smooth(1 - d / 0.6) : 0); }); });
          const sk = smooth(prog(t, 42.62, 42.8)); RC.stamp.visible = t > 42.6; RC.stamp.scale.setScalar(lerp(2.2, 1, sk)); RC.stamp.material.opacity = sk;
          RC.glow.color.set(t > 42.62 ? '#ff6a6a' : '#bfe8ff');
          RC.hands.forEach((h, i) => { h.rotation.z = -(i ? 0.6 : 2.2) - Math.max(0, t - 43.6) * (i ? 6 : 0.5); });
          dust.points.visible = t > 43.5;
          focus = cam.position.distanceTo(t < 43.4 ? cp : V(3.95, 2.95, -1.58)); aperture = 0.0018; break;
        }
        case 'office': {
          scene = of; put(det1, of, -0.85, -1.9, 0.12);
          // det2 walks from the desk to the screen to explain the tree (distance-driven walk, no foot sliding)
          const wa = V(-0.2, 0, -1.95), wb = V(0.42, 0, -1.8), wk = smooth(prog(t, 56.8, 58.3)), wp = L(wa, wb, wk);
          put(det2, of, wp.x, wp.z, lerp(-0.25, 1.15, smooth(prog(t, 56.8, 57.5))));
          act(det1, t, [[47.65, 'calm'], [50.5, 'surprised'], [51.3, 'determined'], [57.4, 'calm'], [71.2, 'happy']], { idle: 0.6, look: t < 56.8 ? [0.15, -0.55] : [0.7, 0.15] });
          act(det2, t, [[47.65, 'thinking'], [51.0, 'determined'], [62.8, 'calm'], [71.2, 'happy']], { idle: 0.5, look: t < 56.8 ? [-0.25, -0.55] : [0, 0.1] });
          if (wk > 0 && wk < 1) det2.walkDist(wa.distanceTo(wb) * wk, 0.6, 1);
          // typing (smooth in/out)
          const ty = env(t, 52.0, 56.6, 0.35); const lp = OF.laptop.position;
          for (const [s, dx] of [['L', 0.07], ['R', -0.07]]) gesture(det1, s, lp.clone().add(V(-dx, 0.045 + 0.01 * Math.abs(Math.sin(t * 16 + dx * 40)), -0.08)), ty, 0.3);
          gesture(det2, 'R', det2.headWorld().add(V(-0.05, -0.2, 0.12)), env(t, 48.6, 51.2, 0.4), 0.7);    // hand on chin, thinking
          // explaining at the screen: point at the part of the tree being narrated
          const pts = [[67.0, 70.9, 0.7, 0.45]];
          for (const [a, b, u, v] of pts) gesture(det2, 'L', onScreen(u, v), env(t, a, b, 0.35), 0.35);
          // screen: website (upload) then the live chart
          const chartOn = t >= 56.6; const mat = OF.screen.material; const want = chartOn ? OF.chartTex : OF.siteTex; if (mat.map !== want) { mat.map = want; mat.needsUpdate = true; }
          if (chartOn) OF.chart.draw(t); else OF.website(clamp(prog(t, 52.4, 56.0)));
          focus = cam.position.distanceTo(t < 52.5 ? det1.headWorld() : SCR); aperture = 0.0015; rig.push(rigDet1, rigDet2); break;
        }
        case 'suburb': {
          scene = sb;
          const shopping = t > 82.5;
          if (!shopping) { put(oldman, sb, 5.0, 0.3, -Math.PI / 2 - 0.3); act(oldman, t, [[73.3, 'calm']], { idle: 0.7, look: [0, -0.4] });
            oldman.reach('R', oldman.group.localToWorld(V(-0.15, 1.05, 0.38))); water.points.visible = true; water.points.position.copy(oldman.group.localToWorld(V(-0.1, 0.5, 0.9))); }
          else { water.points.visible = false; const k = prog(t, 82.9, 84.7); const a = V(-5.05, 0, -10.2), b = V(-5.8, 0, -9.8);
            put(oldman, sb, lerp(a.x, b.x, k), lerp(a.z, b.z, k), -Math.PI / 2 + 0.5); oldman.group.visible = t < 84.75; act(oldman, t, [[82.5, 'calm']], { idle: 0.4 }); oldman.walkDist(a.distanceTo(b) * k, 0.6, 0.7); }
          put(det2, sb, 0.05, 5.6, Math.PI / 2 + 0.35); put(det1, sb, 0.15, 6.4, Math.PI / 2 + 0.2);
          act(det2, t, [[73, 'determined']], { idle: 0.4 }); act(det1, t, [[73, 'determined']], { idle: 0.4, look: [-0.3, 0] });
          const eyes = det2.eyeWorld(); const fwd = det2.group.localToWorld(V(0, 0, 1)).sub(det2.group.position).normalize();
          bino.position.copy(eyes).addScaledVector(fwd, 0.13); bino.lookAt(eyes.clone().addScaledVector(fwd, 2)); bino.updateMatrixWorld(true);
          det2.reach('L', bino.localToWorld(V(0.05, -0.03, 0))); det2.reach('R', bino.localToWorld(V(-0.05, -0.03, 0)));
          const crouch = smooth(prog(t, 85.0, 85.7)), walkIn = smooth(prog(t, 84.6, 85.3));
          put(officer, sb, lerp(-1.6, -2.6, walkIn), -10.05, -Math.PI / 2); officer.group.visible = t > 84.5;
          act(officer, t, [[73, 'calm'], [85.4, 'determined']], { idle: 0.4, look: [0, -0.35] });
          if (walkIn > 0 && walkIn < 1) officer.walkDist(1.0 * walkIn, 0.6, 0.8);
          officer.joints.pelvis.position.y = 0.92 - 0.3 * crouch; officer.joints.hipL.rotation.x = officer.joints.hipR.rotation.x = -1.0 * crouch; officer.joints.kneeL.rotation.x = officer.joints.kneeR.rotation.x = 1.6 * crouch; officer.joints.chest.rotation.x += 0.3 * crouch;
          const handle = V(-2.99, 0.82, -10.15), wipe = Math.sin(t * 7) * 0.035 * env(t, 86.0, 89, 0.3);
          const hold = officer.group.localToWorld(V(-0.1, 1.0, 0.35));
          swab.position.copy(L(hold, handle.clone().add(V(0.13, 0.12, wipe)), smooth(prog(t, 85.3, 86.0)))); swab.rotation.set(0, 0, -0.6); swab.visible = t > 84.5;
          officer.reach('R', swab.position.clone().add(V(0.02, 0.075, 0))); officer.grip('R', 0.9);
          focus = cam.position.distanceTo(t < 79.7 ? oldman.headWorld() : t < 82.5 ? det2.headWorld() : handle); aperture = 0.0015;
          sb.userData.mood.focus(t < 82.5 ? V(3, 0, 3) : V(-4, 0, -10), 10); rig.push(t < 79.7 ? rigOld : t < 82.5 ? rigDet2b : rigOff); break;
        }
        case 'match': {
          scene = mt; put(det2, mt, 0.95, -0.85, -0.6);
          MT.screen.draw(t > 89.0 ? 1 : clamp(prog(t, 88.5, 89.0))); MT.glow.intensity = t > 89.0 ? 2.5 : 0;
          act(det2, t, [[88.3, 'surprised'], [88.95, 'happy']], { idle: 0.5, look: [-0.5, 0] });
          cam.userData.match = true; rig.push(rigM); break;
        }
        case 'arrest': {
          scene = ar; put(oldman, ar, 0.55, 0.5, 0.25); put(det1, ar, -0.45, 0.85, 0.35);
          act(oldman, t, [[89.6, 'calm'], [91.3, 'sad']], { idle: 0.3, look: t < 91.2 ? [0, -0.7] : [-0.3, -0.5] });
          act(det1, t, [[89.6, 'determined']], { idle: 0.4, look: [0.3, 0] });
          const wrist = oldman.group.localToWorld(V(0.0, 0.95, 0.3));
          oldman.reach('L', wrist.clone().add(V(0.07, 0, 0))); oldman.reach('R', wrist.clone().add(V(-0.07, 0, 0))); oldman.grip('L', 0.9); oldman.grip('R', 0.9);
          cuffs.position.copy(wrist).add(V(0, -0.06, 0)); cuffs.rotation.set(0, oldman.group.rotation.y, 0);
          // detective holds up the 1979 newspaper (smoothly)
          const up = env(t, 90.9, 99, 0.6); paper.position.copy(det1.group.localToWorld(L(V(0.05, 0.95, 0.3), V(0.02, 1.32, 0.42), up))); paper.rotation.set(-0.05, det1.group.rotation.y + 0.15, 0);
          paper.updateMatrixWorld(true); det1.reach('L', paper.localToWorld(V(0.19, -0.18, 0.01))); det1.reach('R', paper.localToWorld(V(-0.19, -0.18, 0.01))); det1.grip('L', 0.85); det1.grip('R', 0.85);
          AR.cars.forEach((c, i) => { const L2 = c.userData.lights; const w = 0.5 + 0.5 * Math.sin(t * 5 + i); L2.lr.intensity = 1.5 + 4 * w; L2.lb.intensity = 1.5 + 4 * (1 - w); L2.red.emissiveIntensity = 0.4 + w; L2.blue.emissiveIntensity = 1.4 - w; });
          focus = cam.position.distanceTo(t < 92 ? oldman.headWorld() : paper.position); aperture = 0.0015; ar.userData.mood.focus(V(0.3, 0, 0.6), 6); rig.push(rigOld2, rigDet1b); break;
        }
      }
      // camera
      let c;
      if (seg.n === 'dna') { const k = easeInOut(prog(t, seg.s, seg.e)), a = lerp(0.3, 2.2, k), r = lerp(2.6, 1.7, k), y = lerp(3.0, -1.6, k);
        c = { pos: V(Math.sin(a) * r, y, Math.cos(a) * r), at: V(0, y - 0.5, 0), fov: 46 }; focus = r; aperture = 0.003; }
      else if (seg.n === 'match') c = { pos: L(V(1.3, 1.6, 1.6), V(0.95, 1.6, 0.95), easeInOut(prog(t, 88.37, 89.57))), at: V(-0.05, 1.5, -1.5), fov: 44 };
      else c = CAM[seg.n](t);
      const pos = guardCamera(c.pos.add(drift(t, 0.006, 2)), CAST.filter(x => x.group.parent === scene && x.group.visible), 0.4);
      cam.position.copy(pos); cam.lookAt(c.at); if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
      lensProbe(scene, cam, { min: 0.1 });
      for (const r of rig) r.update(cam);
      for (const [s, p] of P) if (s === scene) p.update(t);
      let fill = 0, fillColor = null, zoom = 0;
      for (const [cc, w, col, z] of PORTALS) { const b = bell(t, cc, w); if (b > fill) { fill = b; fillColor = col; } zoom = Math.max(zoom, b * z); }
      post.render(scene, cam, t, { focus, aperture, zoom, fill: fill * 0.97, fillColor, exposure, sat: 1.15, con: 1.05 });
    },
  };
}
