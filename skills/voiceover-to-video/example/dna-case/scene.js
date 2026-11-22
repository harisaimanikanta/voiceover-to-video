// Reference production 2 (polished cartoon, 11 environments, host lip-sync, real-crime explainer). voice.mp3 not included: supply your own 103.8 s narration or render silent.
// "Caught by His Cousins' DNA" - one continuous take, polished 3D cartoon. Synced to voice.mp3 (103.8 s).
import * as THREE from 'three';
import { makeRenderer, makePost, lerp, clamp, prog, smooth, easeInOut, easeOut, easeIn, captionsFromLines } from 'kit';
import { particles, drift, shake, bell, guardCamera } from '/kit/fx.js';
import { makeToon, speech } from '/kit/toon.js';
import { mood, faceRig, soft } from '/kit/look.js';
import { V, hostSet, street70s, car, bedroom, bat, caseOffice, dnaWorld, recordsRoom, office2018, familyTree, suburb, binoculars, swabStick, policeCap, matchLab, driveway, handcuffs, badge, hammer, sprayCan } from './sets.js';

const LINES = await (await fetch('/scene/lines.json')).json();
const WORDS = (await (await fetch('/scene/words.json')).json()).map(w => ({ start: w[1], end: w[2] }));
const NUM = [['forty years', '40 years'], ['nineteen seventies', '1970s'], ['thirteen', '13'], ['nineteen eighty six', '1986'], ['thirty years', '30 years'], ['twenty eighteen', '2018'], ['eighteen hundreds', '1800s'], ['seventy two', '72']];
export const duration = 103.81;
export const fps = 30;
export const captions = captionsFromLines(LINES.map(([t, end, text]) => ({ t, end, text: NUM.reduce((s, [a, b]) => s.replace(a, b), text) })));
export const captionStyle = { y: 0.75, size: 0.058 };

const PORTALS = [[10.63, 0.2, '#0b1430', 0.6], [16.9, 0.14, '#05070f', 0.5], [22.79, 0.15, '#000000', 0.3], [32.18, 0.14, '#eaf6ff', 0.6], [37.73, 0.13, '#ffffff', 0.5],
  [47.65, 0.15, '#d9c8a8', 0.5], [56.83, 0.25, '#cfe8ff', 0.7], [73.31, 0.14, '#fff4d6', 0.6], [88.37, 0.15, '#ffffff', 0.6], [89.57, 0.14, '#ff3b3b', 0.5], [96.5, 0.12, '#fff1d6', 0.5]];
const ACCENTS = [14.28, 23.07, 42.62, 67.6, 88.53, 94.88, 99.19];
const SEG = [['host', 0, 10.63], ['street', 10.63, 16.9], ['bed', 16.9, 22.79], ['case', 22.79, 32.18], ['dna', 32.18, 37.73], ['records', 37.73, 47.65], ['office', 47.65, 56.83],
  ['tree', 56.83, 73.31], ['suburb', 73.31, 88.37], ['match', 88.37, 89.57], ['arrest', 89.57, 96.5], ['host2', 96.5, 103.82]].map(([n, s, e]) => ({ n, s, e }));
const segAt = t => SEG.find(x => t >= x.s && t < x.e) || SEG[SEG.length - 1];
const L = (a, b, k) => a.clone().lerp(b, clamp(k));
// emotion tracks: [[time, emotion], ...] blended over 0.35 s
function emoAt(track, t) { let i = 0; while (i + 1 < track.length && t >= track[i + 1][0]) i++; return { from: track[Math.max(0, i - 1)][1], to: track[i][1], k: i ? smooth((t - track[i][0]) / 0.35) : 1 }; }
function act(c, t, track, { talk = 0, idle = 1, look = null } = {}) {
  const e = emoAt(track, t); c.rest(); c.posture(e.to, e.k); c.idle(t, idle); c.face(e.to, { from: e.from, k: e.k, talk }); c.look(...(look || [null]));
  return e;
}
const put = (c, scene, x, z, ry = 0, s = 1) => { if (c.group.parent !== scene) scene.add(c.group); c.group.position.set(x, 0, z); c.group.rotation.set(0, ry, 0); c.group.scale.setScalar(s); };

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height); renderer.toneMappingExposure = 1.0;
  const post = makePost(renderer, width, height, { ao: false, bloom: 0, grain: 0.025, vignette: 0.4 });
  const cam = new THREE.PerspectiveCamera(38, width / height, 0.02, 400);
  const S = {}; const P = [];
  const mk = (n, m, o) => { const s = new THREE.Scene(); S[n] = s; s.userData.mood = mood(s, m, o); return s; };
  const addP = (scene, o) => { const p = particles(o); p.setScale(height); scene.add(p.points); P.push([scene, p]); return p; };

  // ---- cast
  const dan = makeToon({ shirt: '#2f8f8a', pants: '#3a3f52', hair: '#3a2618', hairStyle: 'side', eye: '#5a3b20', skin: '#e8b088', glasses: true, build: 1.05 });
  const masked = makeToon({ skin: '#262b3a', shirt: '#1b1f2a', pants: '#22262f', shoes: '#111111', hairStyle: 'none', eye: '#4a4a4a', lips: '#262b3a', brows: '#151821' });
  const wife = makeToon({ skin: '#f3c7a5', hair: '#c8742c', hairStyle: 'bob', shirt: '#e8a0b8', eye: '#4a7a3a' });
  const husband = makeToon({ hair: '#2a1c12', hairStyle: 'tuft', shirt: '#9ab8e0', moustache: true, eye: '#5a3b20' });
  const det86 = makeToon({ hair: '#5a4030', hairStyle: 'side', shirt: '#e8e4d8', tie: '#7a3a2a', moustache: true, skin: '#e8b796', pants: '#5a4a3a' });
  const det1 = makeToon({ skin: '#c98f6a', hair: '#2a1a12', hairStyle: 'bun', shirt: '#f2efe6', coat: '#6a5a8a', eye: '#3a2a1a', pants: '#2a2e3a' });
  const det2 = makeToon({ hair: '#7a7a7a', hairStyle: 'side', shirt: '#e8e8e0', tie: '#2f4f8a', glasses: true, skin: '#f0c09a', build: 1.1, pants: '#3a3f52' });
  const cous = [{ skin: '#f1c4a0', hair: '#7a4a22', shirt: '#e85d4a', hairStyle: 'curly' }, { skin: '#c98f6a', hair: '#1a1008', shirt: '#5fb36b', hairStyle: 'spiky' }, { skin: '#f3d1b5', hair: '#d8a040', shirt: '#7a5cc8', hairStyle: 'long' }].map(o => makeToon(o));
  const oldman = makeToon({ skin: '#efc4a4', hair: '#e0e0e0', hairStyle: 'bald', shirt: '#c8b48a', pants: '#6a6a6a', eye: '#5a6a7a', brows: '#d8d8d8', build: 1.1, shape: { jaw: 1.15 } });
  const officer = makeToon({ skin: '#8a5a3c', hair: '#1a1008', hairStyle: 'none', shirt: '#2f4f8a', pants: '#1d2a4a', eye: '#3a2a1a' });
  const cap = policeCap(); officer.head.add(cap); cap.position.set(0, officer.HR * 0.72, -officer.HR * 0.05); cap.scale.setScalar(1.55); cap.rotation.x = -0.12;

  // ---- sets
  const host = mk('host', 'interior'); const H = hostSet(host); H.board.updateMatrixWorld(true);
  addP(host, { count: 200, center: [0.6, 1.5, -1.2], box: [3, 2, 2.5], size: 0.008, color: '#fff2d0', opacity: 0.55, motion: 'float', speed: 0.15, seed: 3 });
  const kitHome = H.kit.position.clone();
  const sparkle = addP(host, { count: 120, center: [0, 0, 0], box: [0.6, 0.6, 0.6], size: 0.014, color: '#7ff0e8', opacity: 0.9, motion: 'swirl', speed: 1.2, seed: 8 });
  const rigDan = faceRig(host, dan);

  const st = mk('street', 'night', { shadowSize: 8 }); const ST = street70s(st);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), new THREE.MeshBasicMaterial({ color: '#fff2c8', fog: false })); moon.position.set(35, 40, -120); st.add(moon);
  addP(st, { count: 160, center: [2, 2, 2], box: [12, 4, 16], size: 0.02, color: '#c8ff9a', opacity: 0.8, motion: 'float', speed: 0.4, seed: 5 });
  const flash = new THREE.Group(); flash.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.2, 16), soft('#3a3a40', 'metal')));
  const beam = new THREE.SpotLight('#fff2c8', 25, 9, 0.4, 0.5, 1.2); beam.position.y = -0.1; flash.add(beam, beam.target); beam.target.position.set(0, -2, 0); beam.castShadow = true;
  masked.hold(flash, 'R', [0, -0.08, 0.04], [Math.PI / 2 + 0.6, 0, 0]);
  const rigMasked = faceRig(st, masked, { key: '#9fb8ff', rim: '#7fa8ff', keyI: 0.8 });

  const bd = mk('bed', 'night', { sky: false }); const BD = bedroom(bd);
  const theBat = bat(); husband.hold(theBat, 'R', [0, -0.08, 0.03], [0.3, 0, 0]);
  const rigHus = faceRig(bd, husband, { keyI: 1.0 }), rigWife = faceRig(bd, wife, { keyI: 0.9 });
  addP(bd, { count: 120, center: [0, 1.4, -0.5], box: [4, 2, 3], size: 0.008, color: '#c8d8ff', opacity: 0.5, motion: 'float', speed: 0.12, seed: 9 });

  const cs = mk('case', 'interior'); const CS = caseOffice(cs);
  const rigDet86 = faceRig(cs, det86);
  addP(cs, { count: 220, center: [0, 1.5, -0.8], box: [5, 2.5, 3], size: 0.009, color: '#ffe8c0', opacity: 0.6, motion: 'float', speed: 0.12, seed: 4 });

  const dn = mk('dna', 'dream'); const DN = dnaWorld(dn);
  addP(dn, { count: 400, center: [0, 0, 0], box: [8, 10, 8], size: 0.03, color: '#ffffff', opacity: 0.8, motion: 'float', speed: 0.3, seed: 6 });

  const rc = mk('records', 'lab', { sky: false }); const RC = recordsRoom(rc);
  const dust = addP(rc, { count: 260, center: [3.95, 2.6, -1.0], box: [2.5, 2.5, 1.6], size: 0.012, color: '#fff4d6', opacity: 0.8, motion: 'fall', speed: 0.15, seed: 12 });

  const of = mk('office', 'day', { sky: false }); const OF = office2018(of);
  const rigDet1 = faceRig(of, det1), rigDet2 = faceRig(of, det2, { keyI: 0.9 });
  const upload = addP(of, { count: 160, center: [0, 0, 0], box: [0.5, 0.5, 0.5], size: 0.012, color: '#ff8f3a', opacity: 0.95, motion: 'swirl', speed: 1.5, seed: 14 });

  const tr = mk('tree', 'golden', { shadowSize: 8 }); const TR = familyTree(tr);
  const rigCous = faceRig(tr, cous[1]);
  addP(tr, { count: 200, center: [0, 4, 2], box: [10, 6, 8], size: 0.025, color: '#fff2a0', opacity: 0.9, motion: 'float', speed: 0.4, seed: 22 });

  const sb = mk('suburb', 'day', { shadowSize: 10 }); const SB = suburb(sb);
  const nozzle = new THREE.Group(); nozzle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 12), soft('#2fa86a', 'plastic'))); oldman.hold(nozzle, 'R', [0, -0.09, 0.05], [1.4, 0, 0]);
  const water = addP(sb, { count: 140, center: [0, 0, 0], box: [0.4, 0.3, 0.8], size: 0.016, color: '#bfe8ff', opacity: 0.85, motion: 'fall', speed: 2.2, seed: 31 });
  const bino = binoculars(); const swab = swabStick();
  const rigOld = faceRig(sb, oldman), rigOff = faceRig(sb, officer, { keyI: 1.0 });

  const mt = mk('match', 'lab', { sky: false }); const MT = matchLab(mt);
  const rc2 = faceRig(mt, det2);

  const ar = mk('arrest', 'golden', { shadowSize: 6 }); const AR = driveway(ar);
  const cuffs = handcuffs(); ar.add(cuffs);
  const props = { badge: badge(), cap: policeCap('#2f4f8a'), hammer: hammer(), spray: sprayCan() }; Object.values(props).forEach(p => ar.add(p));
  const rigOld2 = faceRig(ar, oldman), rigOff2 = faceRig(ar, officer, { keyI: 0.9 });
  const pop = addP(ar, { count: 80, center: [0, 0, 0], box: [0.5, 0.5, 0.5], size: 0.02, color: '#ffd166', opacity: 1, motion: 'burst', speed: 1, seed: 41 });

  const grade = { sat: 1.18, con: 1.06 };
  let lastScene = null;

  return {
    async render(t) {
      const seg = segAt(t), p = prog(t, seg.s, seg.e);
      let scene, pos, at, fov = 38, focus = null, aperture = 0, exposure = 1.0;
      const rig = [];
      switch (seg.n) {
        // ================================================================ HOST (opening)
        case 'host': case 'host2': {
          scene = host; put(dan, host, 0.35, -0.85, -0.12);
          const end = seg.n === 'host2';
          const track = end ? [[96.5, 'neutral'], [97.6, 'sad'], [99.0, 'smug'], [100.3, 'worried'], [102.2, 'smug']] : [[0, 'thinking'], [1.9, 'neutral'], [4.0, 'smug'], [5.6, 'happy'], [7.7, 'thinking'], [9.2, 'surprised']];
          const gaze = !end && t < 1.9 ? [-0.7, 0.15] : null;
          act(dan, t, track, { talk: speech(t, WORDS), look: gaze });
          if (!end && t < 1.9) dan.joints.head.rotation.y -= 0.5 * (1 - smooth((t - 1.4) / 0.5));
          // board gestures
          const pointK = end ? bell(t, 99.55, 0.9) : smooth(prog(t, 4.2, 4.7)) * (1 - smooth(prog(t, 7.0, 7.6)));
          if (pointK > 0.01) { dan.reach('R', L(dan.handWorld('R'), dan.group.localToWorld(V(-0.5, 1.42, 0.25)), pointK), V(-0.3, -1, -0.6)); dan.grip('R', 0.6 * pointK); }
          H.cousins.forEach((c, i) => { const glow = end ? bell(t, 99.6 + i * 0.08, 0.9) : bell(t, 5.2 + i * 0.25, 1.4); c.userData.photo.material.emissiveIntensity = glow * 0.6; c.scale.setScalar(1 + glow * 0.12); });
          // DNA kit: desk -> hand
          const grab = end ? 1 : smooth(prog(t, 7.75, 8.4));
          const hold = dan.group.localToWorld(V(0.05, 1.28, 0.38));
          H.kit.position.copy(L(kitHome, hold, grab)); H.kit.rotation.set(0, lerp(0, 0.15, grab), lerp(0, 0.1, grab) + (end ? 0.05 * Math.sin(t * 2) : 0));
          if (grab > 0.05) { H.kit.updateMatrixWorld(true); dan.reach('L', H.kit.localToWorld(V(0.085, -0.04, 0.0)), V(1, -1, 0.3)); dan.grip('L', 0.8); }
          sparkle.points.visible = end && t > 100.3; sparkle.points.position.copy(L(H.kit.position, V(0.5, 1.5, 0.8), prog(t, 100.3, 103.8)));
          if (!end) {
            const sk = V(-1.0, 1.67, -2.43), danHead = dan.headWorld();
            if (t < 3.8) { const k = easeInOut(prog(t, 0.2, 3.6)); pos = L(V(-0.95, 1.68, -1.6), V(0.35 + Math.sin(0.35) * 2.2, 1.5, -0.85 + Math.cos(0.35) * 2.2), k); at = L(sk, danHead.clone().add(V(-0.35, -0.15, 0)), easeInOut(prog(t, 0.6, 3.4))); fov = lerp(30, 38, k); }
            else if (t < 7.7) { const k = easeInOut(prog(t, 3.8, 7.6)); const a = lerp(0.35, -0.3, k); pos = V(0.35 + Math.sin(a) * 2.2, 1.5, -0.85 + Math.cos(a) * 2.2); at = L(danHead.clone().add(V(-0.35, -0.15, 0)), L(danHead.clone().add(V(0, -0.2, 0)), V(-0.35, 1.55, -1.6), 0.35), smooth(k * 3)); }
            else { const k = easeIn(prog(t, 7.9, 10.63)); const kitP = H.kit.position.clone(); const a = -0.3; const from = V(0.35 + Math.sin(a) * 2.2, 1.5, -0.85 + Math.cos(a) * 2.2);
              pos = L(from, kitP.clone().add(V(0, 0.02, 0.16)), k); at = L(L(danHead.clone().add(V(0, -0.2, 0)), V(-0.35, 1.55, -1.6), 0.35), kitP, smooth(prog(t, 7.9, 9.8))); fov = 38; }
          } else {
            const danHead = dan.headWorld(), kitP = H.kit.position.clone();
            if (t < 99.0) { const k = easeOut(prog(t, 96.5, 98.9)); pos = L(kitP.clone().add(V(0, 0.02, 0.2)), V(0.85, 1.5, 1.5), k); at = L(kitP, danHead.clone().add(V(0, -0.15, 0)), smooth(prog(t, 96.8, 98.6))); }
            else if (t < 100.3) { const k = easeInOut(prog(t, 99.0, 100.3)); pos = L(V(0.85, 1.5, 1.5), V(0.2, 1.55, 1.6), k); at = L(danHead.clone().add(V(0, -0.15, 0)), V(-0.3, 1.6, -1.8), bell(t, 99.6, 0.7) * 0.6); }
            else { const k = easeInOut(prog(t, 100.3, 103.8)); pos = L(V(0.2, 1.55, 1.6), danHead.clone().add(V(0.08, 0.0, 1.25)), k); at = danHead.clone().add(V(0, -0.1, 0)); fov = lerp(38, 34, k); }
          }
          focus = cam.position.distanceTo(dan.headWorld()); aperture = 0.0025; rig.push(rigDan); break;
        }
        // ================================================================ 1970s STREET
        case 'street': {
          scene = st;
          // masked man: pavement walk, then through the gate to the window
          const A = V(2.8, 0, 5.0), B = V(2.8, 0, -1.0), C = V(4.9, 0, -1.0);
          const k1 = prog(t, 11.0, 14.6), k2 = smooth(prog(t, 14.6, 16.6));
          const mp = k2 > 0 ? L(B, C, k2) : L(A, B, k1); const dist = A.distanceTo(B) * k1 + B.distanceTo(C) * k2;
          const dir = k2 > 0 ? Math.PI / 2 : Math.PI;
          put(masked, st, mp.x, mp.z, k2 > 0 && k2 < 0.25 ? lerp(Math.PI, Math.PI / 2, k2 / 0.25) : dir);
          act(masked, t, [[0, 'smug'], [15.8, 'angry']], { idle: 0.3, look: [0.3 * Math.sin(t * 1.3), -0.1] });
          if (t < 16.4) masked.walkDist(dist, 0.62, 0.8);
          masked.joints.chest.rotation.x += 0.25; masked.joints.head.rotation.x -= 0.1;
          masked.reach('R', masked.group.localToWorld(V(-0.18, 1.05, 0.35)));
          const mh = masked.headWorld();
          if (t < 13.9) { const k = easeInOut(prog(t, 10.63, 13.9)); pos = L(V(-1.2, 9, 18), V(0.6, 2.2, 9.5), k); at = L(V(1, 1, -8), mh.clone().add(V(0, -0.4, -1)), smooth(prog(t, 11.5, 13.9))); fov = lerp(45, 40, k); }
          else if (t < 16.0) { const k = easeInOut(prog(t, 13.9, 16.0)); pos = L(V(0.6, 2.2, 9.5), mh.clone().add(V(-1.6, -0.6, 1.8)), k); at = L(mh.clone().add(V(0, -0.4, -1)), mh.clone().add(V(0.3, -0.2, -0.5)), k); }
          else { const k = easeIn(prog(t, 16.0, 16.9)); const win = V(5.46, 1.68, -1.02); pos = L(mh.clone().add(V(-1.6, -0.6, 1.8)), win.clone().add(V(-0.45, 0, 0.05)), k); at = L(mh.clone().add(V(0.3, -0.2, -0.5)), win, smooth(prog(t, 16.0, 16.6))); }
          st.userData.mood.focus(V(3, 0, 1), 8); rig.push(rigMasked); break;
        }
        // ================================================================ BEDROOM
        case 'bed': {
          scene = bd;
          for (const [c, x] of [[wife, -0.72], [husband, 0.12]]) { put(c, bd, x, -1.28, 0); c.group.position.y = -0.24; }
          const hTrack = [[0, 'worried'], [20.7, 'scared']], wTrack = [[0, 'scared']];
          act(wife, t, wTrack, { idle: 0.5, look: [0.6 + 0.3 * Math.sin(t * 2.1), 0] }); act(husband, t, hTrack, { idle: 0.5, look: [0.5 * Math.sin(t * 2.7), 0.1] });
          for (const c of [wife, husband]) { c.joints.hipL.rotation.x = c.joints.hipR.rotation.x = -1.45; c.joints.head.rotation.y += 0.45; }
          wife.reach('L', wife.group.localToWorld(V(0.12, 1.0, 0.3))); wife.reach('R', wife.group.localToWorld(V(-0.05, 1.0, 0.32))); wife.grip('L', 1); wife.grip('R', 1);
          const up = smooth(prog(t, 20.6, 21.2));
          husband.reach('R', husband.group.localToWorld(L(V(-0.2, 0.95, 0.3), V(-0.15, 1.25, 0.32), up))); husband.reach('L', husband.group.localToWorld(L(V(0.15, 0.85, 0.3), V(-0.02, 1.08, 0.33), up))); husband.grip('L', up);
          theBat.rotation.set(lerp(0.3, -0.5, up), 0, lerp(0, 0.4, up));
          const jing = bell(t, 18.3, 1.0) + bell(t, 20.0, 0.5) * 0.5;
          BD.tam.rotation.z = Math.sin(t * 38) * 0.18 * jing; BD.tam.userData.jingles.forEach((j, i) => { j.rotation.z = Math.sin(t * 50 + i) * jing; });
          BD.bulb.intensity = 4.5 * (1 - smooth(prog(t, 22.45, 22.62))); BD.shade.material.emissiveIntensity = 0.6 * (1 - smooth(prog(t, 22.45, 22.62)));
          const tam = V(2.38, 0.85, -0.24), hus = husband.headWorld();
          if (t < 18.3) { const k = easeInOut(prog(t, 16.9, 18.3)); pos = L(V(1.8, 0.95, 0.35), V(1.65, 1.05, 0.6), k); at = tam; }
          else if (t < 20.75) { const k = easeInOut(prog(t, 18.3, 20.75)); pos = L(V(1.65, 1.05, 0.6), V(0.9, 1.35, 1.25), k); at = L(tam, V(-0.3, 1.15, -1.2), k); }
          else { const k = easeInOut(prog(t, 20.75, 22.79)); pos = L(V(0.9, 1.35, 1.25), hus.clone().add(V(0.55, -0.05, 1.0)), k); at = L(V(-0.3, 1.15, -1.2), hus.clone().add(V(-0.05, -0.12, 0)), k); }
          focus = cam.position.distanceTo(hus); aperture = 0.002; rig.push(rigHus, rigWife); break;
        }
        // ================================================================ COLD-CASE OFFICE (1980s)
        case 'case': {
          scene = cs; put(det86, cs, 1.45, -0.3, -0.7);
          const track = [[22.79, 'worried'], [25.6, 'thinking'], [27.9, 'sad'], [30.3, 'surprised'], [31.0, 'thinking']];
          act(det86, t, track, { idle: 0.6, look: t < 27.5 ? [-0.5, 0.2] : t < 30.3 ? [-0.7, -0.1] : [-0.3, -0.6] });
          if (t > 27.9 && t < 30.3) det86.joints.chest.rotation.x += 0.1 * bell(t, 29.2, 1.2);
          CS.pins13.forEach((pn, i) => { const k = easeOut(prog(t, 23.07 + i * 0.16, 23.27 + i * 0.16)); pn.scale.setScalar(Math.max(0.001, k * (1 + 0.4 * bell(t, 23.2 + i * 0.16, 0.12)))); });
          CS.setYear(Math.round(lerp(1976, 1986, easeInOut(prog(t, 25.7, 27.3)))));
          const fall = easeIn(prog(t, 27.9, 28.6)); CS.cut.rotation.set(-fall * 1.45, 0, 0);
          const gone = easeIn(prog(t, 29.43, 29.9)); CS.cut.scale.setScalar(Math.max(0.001, 1 - gone)); CS.cut.rotation.y = gone * 6;
          CS.lamp.userData.light.intensity = 2.6 * smooth(prog(t, 30.3, 30.45));
          CS.bag.position.y = 0.79 + 0.01 * bell(t, 30.6, 0.3);
          const bag = CS.bag.position.clone();
          if (t < 25.5) { const k = easeInOut(prog(t, 22.79, 25.5)); pos = L(V(-0.1, 1.5, -0.4), V(-1.3, 1.75, -1.15), k); at = L(V(-0.6, 1.6, -2.45), V(-0.9, 1.6, -2.45), k); fov = 42; }
          else if (t < 27.7) { const k = easeInOut(prog(t, 25.5, 27.7)); pos = L(L(V(-1.3, 1.75, -1.15), V(-0.9, 1.7, 1.0), k), L(V(-0.9, 1.7, 1.0), V(1.9, 1.6, 1.5), k), k); at = L(V(-0.9, 1.6, -2.45), V(0.75, 1.7, -1.4), k); fov = 42; }
          else if (t < 30.2) { const k = easeInOut(prog(t, 27.7, 30.2)); pos = L(V(1.9, 1.6, 1.5), V(0.4, 1.45, 2.6), k); at = L(V(0.75, 1.7, -1.4), V(-0.35, 1.0, -0.9), k); fov = lerp(42, 50, k); }
          else { const k = easeIn(prog(t, 30.2, 32.18)); pos = L(V(0.4, 1.45, 2.6), bag.clone().add(V(0, 0.2, 0.16)), k); at = L(V(-0.6, 1.0, -0.8), bag, smooth(prog(t, 30.2, 31.2))); }
          focus = cam.position.distanceTo(at); aperture = t > 30.2 ? 0.003 : 0.0015; rig.push(rigDet86); break;
        }
        // ================================================================ DNA WORLD
        case 'dna': {
          scene = dn; DN.helix.rotation.y = t * 0.35;
          const k = easeInOut(p), a = lerp(0.3, 2.6, k), r = lerp(2.4, 1.35, k), y = lerp(3.2, -2.2, k);
          pos = V(Math.sin(a) * r, y, Math.cos(a) * r); at = V(0, y - 0.6, 0); fov = 46; focus = r; aperture = 0.004; exposure = 1.05; break;
        }
        // ================================================================ RECORDS ROOM
        case 'records': {
          scene = rc;
          const k = easeInOut(prog(t, 37.9, 42.4)); const cp = V(lerp(-4.6, 2.2, k), 1.05 + 0.06 * Math.sin(t * 3), -1.25);
          RC.card.position.copy(cp); RC.card.rotation.set(0, -0.25 + 0.1 * Math.sin(t * 2), 0.05 * Math.sin(t * 3));
          RC.cabs.forEach(c => { const d = Math.abs(c.position.x - cp.x); c.userData.fronts.forEach((f, i) => { f.position.z = 0.33 + (i === 1 ? 0.25 * Math.max(0, 1 - d / 0.5) : 0); }); });
          const sk = easeOut(prog(t, 42.62, 42.75)); RC.stamp.visible = t > 42.6; RC.stamp.scale.setScalar(lerp(3, 1, sk)); RC.stamp.material.opacity = sk;
          RC.glow.color.set(t > 42.62 ? '#ff6a6a' : '#bfe8ff');
          RC.hands.forEach((h, i) => { h.rotation.z = -(i ? 0.6 : 2.2) - (t > 43.6 ? (t - 43.6) * (i ? 8 : 0.7) : 0); });
          dust.points.visible = t > 43.5;
          const box = V(3.95, 2.95, -1.58);
          if (t < 43.4) { pos = cp.clone().add(V(0.55, 0.3, 1.45)).add(shake(t, 42.62, 0.4, 0.05)); at = cp.clone().add(V(0.1, 0, 0)); fov = 40; }
          else { const k2 = easeInOut(prog(t, 43.4, 47.65)); pos = L(V(2.75, 1.35, 0.2), box.clone().add(V(-0.15, 0.1, 1.05)), k2); at = L(V(2.4, 1.05, -1.25), box, smooth(prog(t, 43.4, 44.6))); fov = 40; }
          focus = cam.position.distanceTo(at); aperture = 0.002; break;
        }
        // ================================================================ 2018 OFFICE
        case 'office': {
          scene = of; put(det1, of, -0.55, -1.85, 0.15); put(det2, of, 0.12, -1.9, -0.25);
          act(det1, t, [[47.65, 'thinking'], [50.6, 'surprised'], [51.4, 'happy'], [55.5, 'joy']], { idle: 0.6, look: t < 50.6 ? [0.3, -0.6] : t < 51.8 ? [0.7, 0.1] : [0.2, -0.7] });
          act(det2, t, [[47.65, 'thinking'], [50.9, 'surprised'], [51.6, 'smug'], [55.5, 'proud']], { idle: 0.6, look: t < 50.9 ? [-0.2, -0.6] : t < 51.6 ? [-0.7, 0.1] : [-0.3, -0.7] });
          const lapP = OF.laptop.position;
          if (t > 52.0) { const type = smooth(prog(t, 52.0, 52.4)); for (const [s, dx] of [['L', 0.07], ['R', -0.07]]) det1.reach(s, L(det1.handWorld(s), lapP.clone().add(V(-dx, 0.04 + 0.012 * Math.abs(Math.sin(t * 18 + dx * 40)), -0.07)), type)); }
          if (t > 49.0 && t < 51.0) det2.reach('R', det2.headWorld().add(V(-0.05, -0.2, 0.12)));     // hand on chin
          const up = clamp(prog(t, 52.6, 55.9)); OF.screen.draw(up, up >= 1 ? 'done' : 'upload');
          const sc = OF.tvScreen.getWorldPosition(new THREE.Vector3());
          upload.points.visible = t > 52.4; upload.points.position.copy(L(lapP.clone().add(V(0.2, 0.4, 0.4)), sc, (t * 0.7) % 1));
          const c0 = V(-0.22, 1.45, -1.85);
          if (t < 52.2) { const k = easeInOut(prog(t, 47.65, 52.2)); const a = lerp(0.5, -0.25, k); pos = V(c0.x + Math.sin(a) * 2.4, 1.55, c0.z + Math.cos(a) * 2.4); at = c0; }
          else if (t < 55.0) { const k = easeInOut(prog(t, 52.2, 55.0)); pos = L(V(c0.x + Math.sin(-0.25) * 2.4, 1.55, c0.z + Math.cos(-0.25) * 2.4), V(-0.25, 2.0, 0.2), k); at = L(c0, sc, k); }
          else { const k = easeIn(prog(t, 55.0, 56.83)); pos = L(V(-0.25, 2.0, 0.2), sc.clone().add(V(0, 0, 0.22)), k); at = sc; }
          focus = cam.position.distanceTo(at); aperture = 0.002; rig.push(rigDet1, rigDet2); break;
        }
        // ================================================================ FAMILY TREE
        case 'tree': {
          scene = tr; const pf = TR.platform.position;
          cous.forEach((c, i) => { put(c, tr, pf.x - 0.55 + i * 0.55, pf.z, -0.25, 0.72); c.group.position.y = pf.y + 0.05;
            act(c, t + i, [[56.8, i === 1 ? 'joy' : 'happy'], [63, 'happy']], { idle: 0.8 });
            if (t < 62.8) { const w = Math.sin(t * 9 + i) * 0.08; c.reach(i % 2 ? 'L' : 'R', c.group.localToWorld(V(i % 2 ? 0.32 : -0.32, 1.85 + w * 2, 0.15 + w))); c.grip(i % 2 ? 'L' : 'R', 0); } });
          // ribbons of shared DNA travel from the cousins to the unknown frame
          const unk = TR.unknown.position.clone().add(V(0, -0.35, 0.1));
          TR.ribbons.forEach((rb, i) => { const k = easeInOut(prog(t, 60.0 + i * 0.35, 62.2 + i * 0.35)); const from = cous[i % 3].headWorld();
            const end = unk.clone().add(V(Math.cos(i * 1.57 + 0.6) * 0.34, Math.sin(i * 1.57 + 0.6) * 0.4, 0.06)); const mid = from.clone().lerp(end, 0.5).add(V(0, 1.2, 0.8)); const q = new THREE.QuadraticBezierCurve3(from, mid, end).getPoint(k);
            rb.position.copy(q); rb.rotation.set(t * 3 + i, t * 2, 0); rb.visible = t > 59.9 && t < 73.0; rb.scale.setScalar(1 + 0.5 * bell(t, 62.2 + i * 0.35, 0.3)); });
          // frames light up: roots (1800s) on the dive, branches on the climb, the unknown frame at the end
          TR.frames.forEach((fr, i) => { const art = fr.f.children[1]; const on = fr.gen === 0 ? bell(t, 65.2 + i * 0.2, 1.2) : fr.gen === 1 ? smooth(prog(t, 66.8 + (i - 5) * 0.35, 67.2 + (i - 5) * 0.35)) * (1 - smooth(prog(t, 71.0, 71.6))) : smooth(prog(t, 71.1, 71.6));
            art.material.emissive = art.material.emissive || new THREE.Color(); art.material.emissive.set(fr.gen === 2 ? '#ffd24a' : '#ffffff'); art.material.emissiveIntensity = on * (fr.gen === 2 ? 0.9 : 0.4); fr.g.rotation.z = 0.04 * Math.sin(t * 1.3 + i); });
          if (t < 59.9) { const k = easeInOut(prog(t, 56.83, 59.9)); pos = L(V(3.6, 5.6, 9.5), pf.clone().add(V(0.1, 1.0, 2.7)), k); at = L(V(1.5, 4.2, 0), pf.clone().add(V(0, 0.95, 0)), k); }
          else if (t < 63.0) { const k = easeInOut(prog(t, 59.9, 63.0)); pos = L(pf.clone().add(V(0.1, 1.0, 2.7)), V(0.2, 4.6, 9.0), k); at = L(pf.clone().add(V(0, 0.95, 0)), V(0, 4.3, 0.4), k); }
          else if (t < 66.3) { const k = easeInOut(prog(t, 63.0, 66.3)); pos = L(V(0.2, 4.6, 9.0), V(0.9, 1.35, 4.3), k); at = L(V(0, 4.3, 0.4), V(0, 0.85, 1.2), k); }
          else if (t < 71.0) { const k = easeInOut(prog(t, 66.3, 71.0)); pos = L(V(0.9, 1.35, 4.3), V(-1.3, 4.6, 5.0), k); at = L(V(0, 0.85, 1.2), V(-1.4, 4.4, 0.8), k); }
          else { const k = easeIn(prog(t, 71.0, 73.31)); pos = L(V(-1.3, 4.6, 5.0), unk.clone().add(V(0, 0, 0.32)), k); at = L(V(-1.4, 4.4, 0.8), unk, smooth(prog(t, 71.0, 72.0))); }
          fov = 42; tr.userData.mood.focus(V(0, 3, 0), 8); rig.push(rigCous); break;
        }
        // ================================================================ SUBURB (2018)
        case 'suburb': {
          scene = sb;
          const shopping = t > 82.5;
          if (!shopping) { put(oldman, sb, 5.0, 0.3, -Math.PI / 2 - 0.3); act(oldman, t, [[73.3, 'happy'], [79.0, 'neutral']], { idle: 0.7, look: [0, -0.4] });
            oldman.reach('R', oldman.group.localToWorld(V(-0.15, 1.05, 0.38)));
            water.points.visible = true; water.points.position.copy(oldman.group.localToWorld(V(-0.1, 0.5, 0.9))); }
          else { water.points.visible = false; const k = prog(t, 82.7, 84.9); const a = V(-3.6, 0, -10.2), b = V(-5.7, 0, -9.8);
            put(oldman, sb, lerp(a.x, b.x, k), lerp(a.z, b.z, k), -Math.PI / 2 + 0.2); oldman.group.visible = t < 84.95; act(oldman, t, [[82.5, 'happy']], { idle: 0.4 }); oldman.walkDist(a.distanceTo(b) * k, 0.6, 0.7); }
          // detectives at the van (binoculars)
          put(det2, sb, 0.05, 5.6, Math.PI / 2 + 0.35); put(det1, sb, 0.15, 6.4, Math.PI / 2 + 0.2);
          act(det2, t, [[73, 'thinking'], [81.2, 'smug']], { idle: 0.4 }); act(det1, t, [[73, 'thinking'], [81.6, 'worried']], { idle: 0.4, look: [-0.3, 0] });
          if (bino.parent !== sb) sb.add(bino); const eyes = det2.eyeWorld(); const fwd = det2.group.localToWorld(V(0, 0, 1)).sub(det2.group.position).normalize();
          bino.position.copy(eyes).addScaledVector(fwd, 0.13); bino.lookAt(eyes.clone().addScaledVector(fwd, 2)); bino.updateMatrixWorld(true);
          det2.reach('L', bino.localToWorld(V(0.05, -0.03, 0))); det2.reach('R', bino.localToWorld(V(-0.05, -0.03, 0)));
          // officer swabs the car door handle while he is inside
          const crouch = smooth(prog(t, 85.0, 85.6));
          put(officer, sb, -3.05, -10.35, -Math.PI / 2); act(officer, t, [[73, 'neutral'], [85.4, 'thinking'], [87.6, 'proud']], { idle: 0.4, look: [0, -0.3] });
          officer.group.visible = t > 84.8; officer.group.position.x = lerp(-2.2, -3.05, smooth(prog(t, 84.8, 85.4)));
          officer.joints.pelvis.position.y = 0.92 - 0.3 * crouch; officer.joints.hipL.rotation.x = officer.joints.hipR.rotation.x = -1.0 * crouch; officer.joints.kneeL.rotation.x = officer.joints.kneeR.rotation.x = 1.6 * crouch; officer.joints.chest.rotation.x += 0.35 * crouch;
          const handle = V(-3.69, 0.82, -10.35);
          if (swab.parent !== sb) sb.add(swab);
          const wipe = Math.sin(t * 9) * 0.04 * smooth(prog(t, 86.0, 86.3)); swab.position.copy(handle).add(V(0.13, 0.12, wipe)); swab.rotation.set(0, 0, -0.6);
          officer.reach('R', swab.position.clone().add(V(0.05, 0.05, 0)), V(0, -1, 1)); officer.grip('R', 0.9);
          if (t < 79.7) { const k = easeInOut(prog(t, 73.31, 79.7)); const a = lerp(-0.2, 0.5, k); pos = V(5.0 - Math.cos(a) * lerp(1.7, 3.4, k), lerp(1.55, 1.75, k), 0.3 + Math.sin(a) * lerp(1.7, 3.4, k)); at = oldman.headWorld().add(V(0, -0.25, 0)); }
          else if (t < 82.5) { const k = easeInOut(prog(t, 79.7, 81.5)), k2 = smooth(prog(t, 81.5, 82.5)); pos = L(L(V(5.0 - Math.cos(0.5) * 3.4, 1.75, 0.3 + Math.sin(0.5) * 3.4), V(1.9, 1.7, 8.4), k), V(1.6, 1.68, 7.3), k2); at = L(oldman.headWorld(), det2.headWorld().add(V(0.05, -0.12, 0.35)), k); }
          else if (t < 85.2) { const k = easeInOut(prog(t, 82.5, 85.2)); pos = L(V(1.6, 1.68, 7.3), V(-1.6, 1.6, -7.0), k); at = L(det2.headWorld().add(V(0.05, -0.12, 0.35)), V(-4.9, 1.2, -10.0), smooth(prog(t, 82.5, 84.0))); }
          else { const k = easeInOut(prog(t, 85.2, 88.37)); pos = L(V(-1.6, 1.6, -7.0), handle.clone().add(V(0.3, 0.12, 0.55)), easeIn(k)); at = L(V(-4.9, 1.2, -10.0), swab.localToWorld(V(0, -0.16, 0)), smooth(prog(t, 85.2, 86.6))); fov = lerp(38, 34, k); }
          focus = cam.position.distanceTo(at); aperture = 0.0018; sb.userData.mood.focus(at.clone().setY(0), 10); rig.push(t < 82.5 ? rigOld : rigOff); break;
        }
        // ================================================================ MATCH
        case 'match': {
          scene = mt; put(det2, mt, 0.4, -0.95, -0.45);
          const k = clamp(prog(t, 88.5, 89.0)); MT.screen.draw(t > 89.0 ? 1 : k); MT.glow.intensity = t > 89.0 ? 2.5 : 0;
          act(det2, t, [[88.3, 'surprised'], [89.0, 'joy']], { idle: 0.5, look: [-0.5, 0] });
          if (t > 89.0) { const u = smooth(prog(t, 89.0, 89.25)); for (const s of ['L', 'R']) { det2.reach(s, L(det2.handWorld(s), det2.headWorld().add(V(s === 'L' ? 0.35 : -0.35, 0.35, 0.1)), u)); det2.grip(s, 1); } }
          pos = L(V(1.3, 1.6, 1.6), V(0.85, 1.6, 0.8), easeOut(prog(t, 88.37, 89.57))); at = V(-0.05, 1.5, -1.5); fov = 44; rig.push(rc2); break;
        }
        // ================================================================ ARREST
        case 'arrest': {
          scene = ar; put(oldman, ar, 0.55, 0.5, 0.25); put(officer, ar, 1.25, 0.25, -0.35); oldman.group.visible = officer.group.visible = true;
          officer.joints.pelvis.position.y = 0.92;
          act(oldman, t, [[89.6, 'sad'], [93.4, 'embarrassed'], [95.2, 'sick']], { idle: 0.4, look: t < 91.2 ? [0, -0.7] : [-0.6, 0.2] });
          act(officer, t, [[89.6, 'neutral'], [94.9, 'smug']], { idle: 0.4, look: [-0.5, 0] });
          const wrist = oldman.group.localToWorld(V(0.0, 0.95, 0.3));
          oldman.reach('L', wrist.clone().add(V(0.07, 0, 0))); oldman.reach('R', wrist.clone().add(V(-0.07, 0, 0))); oldman.grip('L', 0.9); oldman.grip('R', 0.9);
          cuffs.position.copy(wrist).add(V(0, -0.06, 0)); cuffs.rotation.set(0, oldman.group.rotation.y, 0);
          officer.reach('R', oldman.group.localToWorld(V(0.22, 1.15, -0.05)));
          AR.cars.forEach((c, i) => { const L2 = c.userData.lights; const w = 0.5 + 0.5 * Math.sin(t * 5 + i); L2.lr.intensity = 1.5 + 4 * w; L2.lb.intensity = 1.5 + 4 * (1 - w); L2.red.emissiveIntensity = 0.4 + w; L2.blue.emissiveIntensity = 1.4 - w; });
          const side = oldman.group.localToWorld(V(-0.42, 1.9, 0.5));
          const kb = easeOut(prog(t, 91.3, 91.8)) * (1 - easeIn(prog(t, 93.4, 93.9)));
          props.badge.position.copy(side).add(V(0, 0.1 * Math.sin(t * 2), 0)); props.badge.scale.setScalar(Math.max(0.001, kb)); props.badge.rotation.set(0, t * 1.5, 0);
          props.cap.position.copy(side).add(V(0.02, 0.3 + 0.05 * Math.sin(t * 2 + 1), -0.05)); props.cap.scale.setScalar(Math.max(0.001, kb * 1.3)); props.cap.rotation.set(0.2, -t * 1.2, 0);
          const kh = easeOut(prog(t, 94.7, 95.0)), ks = easeOut(prog(t, 95.5, 95.8));
          props.hammer.position.copy(side).add(V(-0.05, 0.05 + 0.6 * (1 - kh), 0)); props.hammer.scale.setScalar(Math.max(0.001, kh * 0.95)); props.hammer.rotation.set(0, t, 0.6 + 0.15 * Math.sin(t * 3));
          props.spray.position.copy(side).add(V(-0.2, -0.06 + 0.6 * (1 - ks), 0.12)); props.spray.scale.setScalar(Math.max(0.001, ks * 1.15)); props.spray.rotation.set(0, -t * 0.8, -0.2);
          pop.points.visible = (t > 94.7 && t < 95.4) || (t > 95.5 && t < 96.2) || (t > 91.3 && t < 91.9); pop.points.position.copy(side);
          if (t < 91.1) { const k = easeOut(prog(t, 89.57, 91.1)); pos = L(cuffs.position.clone().add(V(0.15, 0.08, 0.32)), V(0.2, 1.4, 2.6), k); at = L(cuffs.position, oldman.headWorld().add(V(0.2, -0.4, 0)), k); }
          else if (t < 93.4) { const k = easeInOut(prog(t, 91.1, 93.4)); pos = L(V(0.2, 1.4, 2.6), V(0.2, 1.65, 3.2), k); at = L(oldman.headWorld().add(V(0.2, -0.4, 0)), V(0.28, 1.72, 0.6), k); }
          else { const k = easeInOut(prog(t, 93.4, 96.5)); pos = L(V(0.2, 1.65, 3.2), V(0.25, 1.72, 2.8), k); at = V(0.28, 1.72, 0.6); }
          fov = 42; focus = cam.position.distanceTo(at); aperture = 0.0015; ar.userData.mood.focus(V(0.5, 0, 0.5), 6); rig.push(rigOld2, rigOff2); break;
        }
      }
      pos = guardCamera(pos.clone().add(drift(t, 0.01, 2)), [dan, masked, wife, husband, det86, det1, det2, oldman, officer, ...cous].filter(c => c.group.parent === scene), 0.4);
      cam.position.copy(pos); cam.lookAt(at); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      for (const r of rig) r.update(cam);
      for (const [s, p] of P) if (s === scene) p.update(t);
      let fill = 0, fillColor = null, zoom = 0;
      for (const [c, w, col, z] of PORTALS) { const b = bell(t, c, w); if (b > fill) { fill = b; fillColor = col; } zoom = Math.max(zoom, b * z); }
      for (const c of ACCENTS) zoom = Math.max(zoom, bell(t, c + 0.05, 0.2) * 0.35);
      post.render(scene, cam, t, { focus, aperture, zoom, fill: fill * 0.97, fillColor, exposure, ...grade });
    },
  };
}
