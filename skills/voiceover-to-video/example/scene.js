// v2 - "The Doctor Who Drank the Cure": ONE continuous camera take (no cuts), synced to ../voiceover.mp3.
// Transitions happen through portals (window, glint, door gap, chalk, lens, iris, paper, hay, mouth, gas, screen, glare, gold, flash)
// at the narrator's measured pauses. See ../TREATMENT-v2.md.
import * as THREE from 'three';
import { makeRenderer, makePost, useHDRI, lerp, clamp, prog, smooth, easeInOut, easeOut, easeIn, captionsFromLines, label } from 'kit';
import { particles, lightBeam, glowMat, halo, drift, shake, bell } from '/kit/fx.js';
import { makeToon } from '/kit/toon.js';
import { labSet, flask, deskSet, barnSet, microSet, spiralBug } from './sets.js';
import { citySet, hallSet, boardTexture, slideSet, eyepieceMask, typewriter, calendar, journalTexture, confetti, pill, phys, mesh, boxM, textTex } from './sets2.js';
import { chalkboard, paperCanyon, yearsTunnel, monitorSet, stomachChamber, audience, envelope } from './sets3.js';

export const duration = 87.72;
export const fps = 30;
const L = (t, end, text) => ({ t, end, text });
export const captions = captionsFromLines([
  L(0.06, 3.4, 'He drank a broth full of LIVE stomach bacteria?'), L(3.81, 4.9, 'On purpose?'), L(5.23, 6.6, 'To win an argument?'),
  L(7.0, 10.3, "You see, it's the early 1980s in Perth, Australia."), L(10.61, 15.0, 'Barry Marshall is a young doctor with a theory almost nobody takes seriously.'),
  L(15.33, 18.5, 'Doctors are taught that ulcers come from stress and acid...'), L(18.64, 21.0, 'And that NOTHING can live inside a stomach anyway.'),
  L(21.3, 26.3, 'But his colleague, a pathologist named Robin Warren, keeps finding something strange.'), L(26.57, 28.5, 'Tiny spiral bacteria...'),
  L(28.66, 30.6, "Inside sick patients' stomachs."), L(30.87, 34.5, "So they send their findings to Australia's big gut-doctor conference."),
  L(34.93, 35.7, 'Rejected.'), L(35.96, 37.9, 'Ranked in the bottom ten percent.'), L(38.23, 40.5, 'Marshall tries to infect piglets to prove it.'),
  L(40.63, 42.1, "But the piglets won't get sick."), L(42.38, 43.0, 'So...'), L(43.23, 44.7, 'He becomes the piglet.'),
  L(45.02, 47.5, 'A camera down his throat shows a healthy stomach.'), L(47.75, 48.2, 'Then...'), L(48.3, 49.8, 'He drinks the bacteria.'),
  L(50.12, 51.7, "Days later, he's vomiting."), L(51.92, 53.25, 'His breath is foul.'), L(53.51, 54.4, 'Another camera.'),
  L(54.57, 56.2, 'His stomach lining is inflamed...'), L(56.2, 58.95, 'And crawling with the SAME spiral bacteria.'),
  L(59.34, 62.5, "He'd caught the infection the experts said couldn't exist."), L(62.85, 64.1, 'Twenty-one years later...'),
  L(64.21, 66.3, 'He and Warren win the Nobel Prize.'), L(66.59, 68.5, "But here's the really fascinating part."), L(68.69, 69.55, "The bug's trick?"),
  L(69.78, 70.85, 'It makes ammonia.'), L(71.16, 73.52, 'A tiny cloud of antacid around itself...'), L(73.52, 76.15, "And hides in the mucus where acid can't reach."),
  L(76.44, 78.3, 'Antacids only hid the pain.'), L(78.5, 80.6, 'Antibiotics clear the infection.'), L(80.93, 82.3, 'And the paper where he proved it?'),
  L(82.5, 84.0, 'He wrote it in the third person.'), L(84.37, 86.0, 'He was too embarrassed to admit...'), L(86.17, 87.6, 'The patient was HIM.'),
]);

// portal transitions: centre time, half-width, fill colour, zoom-blur strength
const PORTALS = [
  [6.8, 0.3, '#fff1d6', 0.7], [10.45, 0.22, '#ffffff', 0.6], [15.25, 0.2, '#050505', 0.5], [18.6, 0.22, '#1e3b2c', 0.6], [21.2, 0.22, '#ffffff', 0.5],
  [26.5, 0.18, '#000000', 0.4], [30.8, 0.2, '#ffffff', 0.5], [32.6, 0.15, '#f4ecd8', 0.6], [34.62, 0.1, '#fbf8ef', 0.4], [35.9, 0.18, '#ffffff', 0.6],
  [38.15, 0.2, '#d9b45a', 0.6], [44.95, 0.2, '#0a0202', 0.6], [46.55, 0.15, '#e8838e', 0.6], [51.35, 0.18, '#ffd0d0', 0.8], [53.45, 0.25, '#6f9f3a', 0.4],
  [55.0, 0.18, '#c21f35', 0.6], [59.25, 0.2, '#ffd0d0', 0.6], [62.8, 0.22, '#ffffff', 0.7], [64.15, 0.2, '#ffd76a', 0.7], [66.45, 0.22, '#ffd76a', 0.8],
  [80.85, 0.25, '#ffffff', 0.7],
];
// accents (zoom-blur pulses on stressed words)
const ACCENTS = [10.61, 38.23, 53.51, 56.53, 67.08, 76.44, 84.89];

const SEG = [
  ['lab', 0, 6.8], ['city', 6.8, 10.45], ['corridor', 10.45, 15.25], ['lecture', 15.25, 18.6], ['acid', 18.6, 21.2], ['warren', 21.2, 26.5],
  ['slide', 26.5, 30.8], ['typing', 30.8, 32.6], ['conference', 32.6, 34.62], ['stamp', 34.62, 35.9], ['canyon', 35.9, 38.15], ['barn', 38.15, 44.95],
  ['throat', 44.95, 46.55], ['stomach', 46.55, 51.35], ['sick', 51.35, 53.45], ['monitor', 53.45, 55.0], ['swarm', 55.0, 59.25], ['triumph', 59.25, 62.8],
  ['years', 62.8, 64.15], ['stage', 64.15, 66.45], ['micro', 66.45, 80.85], ['journal', 80.85, 87.73],
].map(([n, s, e]) => ({ n, s, e }));
const segAt = t => SEG.find(x => t >= x.s && t < x.e) || SEG[SEG.length - 1];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);

const marshallLook = { coat: '#d6d2c6', shirt: '#7aa2e0', tie: '#a02828', hair: '#5a3a22', hairStyle: 'tuft' };
const warrenLook = { coat: '#d6d2c6', shirt: '#d9dfe8', hair: '#d0d0d0', hairStyle: 'side', glasses: true, moustache: true, skin: '#efc4a4' };

export async function setup({ canvas, width, height }) {
  const renderer = makeRenderer(canvas, width, height); renderer.toneMappingExposure = 0.95;
  const post = makePost(renderer, width, height, { ao: false, bloom: 0, grain: 0.03, vignette: 0.42, threshold: 0.92 });
  const cam = new THREE.PerspectiveCamera(40, width / height, 0.02, 400);
  const S = {}; const scn = async (n, hdri, opt) => { const s = new THREE.Scene(); S[n] = s; if (hdri) await useHDRI(renderer, s, hdri, opt); return s; };
  const P = []; const addP = (scene, opts) => { const p = particles(opts); p.setScale(height); scene.add(p.points); P.push([scene, p]); return p; };

  // ===== LAB (night) =====
  const lab = await scn('lab', 'apartment', { intensity: 0.3 }); labSet(lab, { night: true });
  const M1 = makeToon(marshallLook); M1.group.position.set(0.3, 0, 0.45); lab.add(M1.group);
  const F1 = flask(); lab.add(F1.group);
  const F1glow = new THREE.PointLight('#ffd46a', 0.4, 0.8, 2); F1.group.add(F1glow); F1glow.position.y = 0.06;
  const cb = chalkboard(); cb.position.set(-2.94, 1.75, 0.1); cb.rotation.y = Math.PI / 2; lab.add(cb);
  lab.add(lightBeam(V(0.62, 1.68, -0.52), V(0.25, 0.9, 0.2), { radius: 0.55, opacity: 0.1, color: '#ffd59a' }));
  lab.add(lightBeam(V(-1.2, 2.3, -1.5), V(0.4, 0.2, 1.5), { radius: 1.1, opacity: 0.1, color: '#9fb8ff' }));
  addP(lab, { count: 260, center: [0, 1.4, 0], box: [4, 2.4, 3], size: 0.012, color: '#ffe9c0', opacity: 0.55, motion: 'float', speed: 0.3, seed: 2 });
  const flaskSpecks = addP(lab, { count: 60, box: [0.16, 0.08, 0.16], size: 0.006, color: '#b6ff7a', opacity: 1, motion: 'swirl', speed: 2.5, seed: 4 });
  for (let i = 0; i < 6; i++) { const b = boxM(0.22, 0.3, 0.02, phys(['#f2e8d0', '#e6f0f6'][i % 2], { map: textTex(['GASTRITIS', 'study ' + (i + 1)], { w: 256, h: 340, font: 'bold 34px serif', lineH: 50 }) }), -2.2 + i * 0.4, 1.35 + (i % 2) * 0.35, -1.53); lab.add(b); }

  // ===== CITY =====
  const city = await scn('city', 'sunset', { intensity: 0.9, background: true, blur: 0.04 }); citySet(city);
  addP(city, { count: 140, center: [0, 0.4, 22], box: [120, 0.3, 20], size: 0.25, color: '#fff2c0', opacity: 0.9, motion: 'float', speed: 2, seed: 7 });
  addP(city, { count: 40, center: [0, 18, -10], box: [60, 8, 30], size: 0.35, color: '#2a1a10', additive: false, opacity: 0.9, motion: 'float', speed: 1.2, seed: 9 });

  // ===== CORRIDOR =====
  const cor = await scn('corridor', 'lobby', { intensity: 0.55 }); hallSet(cor, 'corridor');
  const M2 = makeToon(marshallLook); cor.add(M2.group); const folder = boxM(0.24, 0.32, 0.02, phys('#d9a03a')); cor.add(folder);
  const D1 = makeToon({ coat: '#ebe7dc', shirt: '#9bb08a', hairStyle: 'bald', hair: '#444', glasses: true }), D2 = makeToon({ coat: '#ebe7dc', shirt: '#c99a9a', hairStyle: 'side', hair: '#2a2a2a', skin: '#c99272' });
  cor.add(D1.group, D2.group);
  const cork = boxM(0.03, 0.6, 0.9, phys('#b98a55', { roughness: 1 }), -2.08, 1.55, -5.6); cor.add(cork);
  const note = mesh(new THREE.PlaneGeometry(0.3, 0.22), phys('#fff59a', { map: textTex(['BACTERIA', '→ ULCERS?'], { w: 512, h: 360, bg: '#fff59a', color: '#c0141c', font: 'bold 80px sans-serif', lineH: 100 }), side: THREE.DoubleSide })); cor.add(note);
  for (let i = 0; i < 5; i++) cor.add(boxM(0.03, 0.5, 0.36, phys(['#e8d9b0', '#cfe2f0', '#f0d0d0'][i % 3]), -2.08 + 0.015 * (i % 2), 1.3 + (i % 2) * 0.55, -1 - i * 1.8));
  addP(cor, { count: 160, center: [0, 1.6, -5], box: [3.6, 2.6, 12], size: 0.01, color: '#fff6e0', opacity: 0.45, motion: 'float', speed: 0.25, seed: 11 });
  const door = boxM(1.2, 2.2, 0.08, phys('#7a5634', { roughness: 0.5, clearcoat: 0.4 }), 0, 1.1, -13.9); cor.add(door);
  cor.add(boxM(4.4, 6, 0.2, phys('#d8e3e0'), 0, 3, -14.05));

  // ===== LECTURE =====
  const lec = await scn('lecture', 'hall', { intensity: 0.75 }); hallSet(lec, 'lecture');
  const board = mesh(new THREE.PlaneGeometry(3.2, 2.4), phys('#ffffff', { map: boardTexture(), roughness: 0.9 }), 0, 2.2, -3.85); lec.add(board);
  const Prof = makeToon({ shirt: '#40445a', pants: '#2b2d36', hairStyle: 'bald', hair: '#888', glasses: true, tie: '#1f3f7a' }); Prof.group.position.set(1.85, 0, -3.15); Prof.group.rotation.y = -0.45; lec.add(Prof.group);
  const pointer = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 8), phys('#5a3a1a')); lec.add(pointer);
  const studs = []; for (let i = 0; i < 9; i++) { const s = makeToon({ shirt: ['#6a7a5a', '#8a5a5a', '#5a6a8a', '#8a7a4a'][i % 4], hairStyle: ['tuft', 'side', 'none'][i % 3], hair: ['#3a2a1a', '#1a1a1a', '#a0702a'][i % 3], glasses: i % 4 === 0, skin: ['#f1c4a0', '#d6a07c', '#b07a54'][i % 3] });
    s.group.position.set(-1.7 + (i % 3) * 1.25, 0, 0.6 + Math.floor(i / 3) * 1.15); s.group.rotation.y = Math.PI; lec.add(s.group); studs.push(s);
    lec.add(boxM(1.0, 0.08, 0.4, phys('#7a5634'), s.group.position.x, 0.82, s.group.position.z - 0.45)); }
  const mkWord = (txt, col) => mesh(new THREE.PlaneGeometry(1.2, 0.36), new THREE.MeshBasicMaterial({ map: textTex([txt], { w: 1024, h: 300, bg: col, color: '#ffffff', font: 'bold 190px sans-serif' }), transparent: true }));
  const wS = mkWord('STRESS', '#c81e1e'), wA = mkWord('ACID', '#e0a018'); lec.add(wS, wA);
  const chalkS = addP(lec, { count: 120, center: [-0.85, 3.0, -3.7], box: [0.1, 0.1, 0.1], size: 0.03, color: '#ffffff', opacity: 0.9, motion: 'burst', burstAt: 17.12, burstSpeed: 0.9, life: 0.9, seed: 3 });
  const chalkA = addP(lec, { count: 120, center: [0.85, 3.0, -3.7], box: [0.1, 0.1, 0.1], size: 0.03, color: '#ffffff', opacity: 0.9, motion: 'burst', burstAt: 17.85, burstSpeed: 0.9, life: 0.9, seed: 5 });
  addP(lec, { count: 200, center: [0, 2.2, -1], box: [6, 3, 6], size: 0.012, color: '#fff2d8', opacity: 0.5, motion: 'float', speed: 0.3, seed: 13 });
  lec.add(lightBeam(V(-3, 5, 2), V(0, 1.5, -3.5), { radius: 1.6, opacity: 0.12, color: '#ffe8c0' }));

  // ===== ACID (chalk-world stomach) =====
  const acid = await scn('acid', 'studio', { intensity: 0.6 }); acid.background = new THREE.Color('#1e3b2c');
  const bowlProf = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 0.55; bowlProf.push(new THREE.Vector2(Math.sin(a) * 1.3 + 0.001, -Math.cos(a) * 1.1 + 1.1)); }
  const bowl = mesh(new THREE.LatheGeometry(bowlProf, 80), phys('#ff9aa8', { side: THREE.DoubleSide, roughness: 0.15, clearcoat: 1, transmission: 0.35, thickness: 0.3, transparent: true, opacity: 0.85 })); acid.add(bowl);
  const acidTop = mesh(new THREE.CircleGeometry(1.24, 80), glowMat('#9ad62a', 0.25, { roughness: 0.05, clearcoat: 1 })); acidTop.rotation.x = -Math.PI / 2; acidTop.position.y = 0.95; acid.add(acidTop);
  const outline = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: '#efefe6' })); outline.rotation.x = Math.PI / 2; outline.position.y = 1.0; acid.add(outline);
  const key2 = new THREE.DirectionalLight('#ffffff', 1.5); key2.position.set(2, 5, 3); acid.add(key2);
  const acidGlow = new THREE.PointLight('#c8ff4a', 2, 4, 1.5); acidGlow.position.y = 1.3; acid.add(acidGlow);
  addP(acid, { count: 140, center: [0, 0.5, 0], box: [2, 0.9, 2], size: 0.05, color: '#d8ff6a', opacity: 0.8, motion: 'rise', speed: 0.5, seed: 21 });
  addP(acid, { count: 90, center: [0, 1.6, 0], box: [2.2, 1.0, 2.2], size: 0.12, color: '#e8ffd0', opacity: 0.18, motion: 'rise', speed: 0.25, seed: 22 });
  const dropBug = spiralBug({ length: 0.5, radius: 0.045 }); acid.add(dropBug);
  const fizzB = addP(acid, { count: 160, center: [0, 1.0, 0], box: [0.1, 0.1, 0.1], size: 0.05, color: '#f4ffb0', opacity: 1, motion: 'burst', burstAt: 19.95, burstSpeed: 0.8, life: 1.0, seed: 23 });

  // ===== HISTOLOGY LAB (day → dusk) =====
  const hist = await scn('hist', 'lab', { intensity: 0.7 }); labSet(hist, { night: false });
  const W1 = makeToon(warrenLook); W1.group.position.set(1.3, 0, 0.12); W1.group.rotation.y = Math.PI; hist.add(W1.group);
  const slidesStack = []; for (let i = 0; i < 18; i++) { const sl = boxM(0.075, 0.004, 0.025, phys('#dff2ff', { transparent: true, opacity: 0.8, roughness: 0.05 }), 0.95 + (i % 3) * 0.02, 0.99 + Math.floor(i / 3) * 0.005 + i * 0.0015, -0.2 + (i % 2) * 0.01); hist.add(sl); slidesStack.push(sl); }
  const cups = []; for (let i = 0; i < 4; i++) { const c = mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 20), phys(['#f2f2f2', '#c84c3c', '#3c6cc8', '#f2f2f2'][i], { roughness: 0.3, clearcoat: 0.6 }), 1.7 + i * 0.1, 1.03, -0.15 - (i % 2) * 0.1); hist.add(c); cups.push(c); }
  const nameTag = label('ROBIN WARREN · PATHOLOGIST', { size: 0.12, bg: 'rgba(20,40,70,0.85)' }); hist.add(nameTag);
  addP(hist, { count: 200, center: [0.5, 1.5, -0.3], box: [3, 2, 2], size: 0.01, color: '#fff2d0', opacity: 0.5, motion: 'float', speed: 0.3, seed: 31 });
  const sunBeam = lightBeam(V(-1.2, 2.3, -1.5), V(1.2, 0.6, 0.6), { radius: 1.0, opacity: 0.16, color: '#ffcf8a' }); hist.add(sunBeam);

  // ===== SLIDE =====
  const sld = await scn('slide'); const slide = slideSet(sld);
  const mask = eyepieceMask(new THREE.Object3D(), 1); mask.parent && mask.parent.remove(mask); sld.add(mask);
  addP(sld, { count: 80, center: [0, 0, 0.3], box: [3, 3, 0.2], size: 0.03, color: '#ffffff', opacity: 0.35, motion: 'float', speed: 0.4, seed: 41 });

  // ===== TYPING desk =====
  const typ = await scn('typing', 'apartment', { intensity: 0.45 }); const typDesk = deskSet(typ); typDesk.ink.visible = false; typDesk.stamp.visible = false; typDesk.paper.visible = false;
  const tw = typewriter(); tw.group.position.set(0, 0, -0.1); typ.add(tw.group); const env1 = envelope(); typ.add(env1);
  addP(typ, { count: 120, center: [0, 0.6, 0], box: [1.5, 1, 1.5], size: 0.008, color: '#fff0d0', opacity: 0.5, motion: 'float', speed: 0.3, seed: 51 });

  // ===== CONFERENCE =====
  const conf = await scn('conference', 'hall', { intensity: 0.5 }); hallSet(conf, 'conference');
  const banner = mesh(new THREE.PlaneGeometry(5, 0.9), new THREE.MeshBasicMaterial({ map: textTex(['GASTRO CONFERENCE'], { w: 2048, h: 360, bg: '#1f3a5f', color: '#ffffff', font: 'bold 200px sans-serif' }) }), 0, 3.6, -3.85); conf.add(banner);
  conf.add(boxM(4.2, 0.08, 1.1, phys('#4a2e1a', { roughness: 0.3, clearcoat: 0.6 }), 0, 0.95, -1.2), boxM(4.2, 0.9, 0.05, phys('#2a3a52'), 0, 0.5, -0.67));
  const revs = [0, 1, 2].map(i => { const r = makeToon({ shirt: ['#3a3d4a', '#4a3a3a', '#2f3f4f'][i], pants: '#22242c', hairStyle: ['bald', 'side', 'bald'][i], hair: '#777', glasses: i !== 1, tie: '#1f3f7a', skin: ['#f1c4a0', '#d6a07c', '#e8b898'][i] });
    r.group.position.set(-1.3 + i * 1.3, -0.2, -1.85); conf.add(r.group); return r; });
  const env2 = envelope(); conf.add(env2);
  const spot = new THREE.SpotLight('#fff0d0', 40, 8, 0.4, 0.5, 1.2); spot.position.set(0, 4.5, 0.5); spot.target.position.set(0, 1, -1.1); spot.castShadow = true; conf.add(spot, spot.target);
  conf.add(lightBeam(V(0, 4.5, 0.5), V(0, 0.95, -1.1), { radius: 1.0, opacity: 0.14 }));
  addP(conf, { count: 160, center: [0, 2.2, -1], box: [4, 3, 3], size: 0.012, color: '#fff0d0', opacity: 0.5, motion: 'float', speed: 0.3, seed: 61 });

  // ===== STAMP desk =====
  const stp = await scn('stamp', 'apartment', { intensity: 0.4 }); const desk = deskSet(stp);
  const stampDust = addP(stp, { count: 180, center: [0, 0.02, 0.05], box: [0.05, 0.01, 0.05], size: 0.012, color: '#fff6e8', opacity: 0.9, motion: 'burst', burstAt: 34.93, burstSpeed: 0.35, life: 0.8, seed: 71 });
  const inkGlow = new THREE.PointLight('#ff3030', 0, 0.8, 2); inkGlow.position.set(0, 0.15, 0.05); stp.add(inkGlow);

  // ===== CANYON =====
  const can = await scn('canyon'); const canyon = paperCanyon(can);
  const sheet = mesh(new THREE.PlaneGeometry(0.42, 0.56), phys('#ffffff', { map: textTex(['ABSTRACT', 'Spiral bacteria'], { w: 512, h: 680, font: 'bold 52px serif', lineH: 80, top: 120 }), side: THREE.DoubleSide })); can.add(sheet);
  const stampOnSheet = mesh(new THREE.PlaneGeometry(0.38, 0.14), new THREE.MeshBasicMaterial({ map: textTex(['REJECTED'], { w: 512, h: 190, bg: null, color: '#d4141c', font: 'bold 120px Impact, sans-serif' }), transparent: true, side: THREE.DoubleSide })); sheet.add(stampOnSheet); stampOnSheet.position.z = 0.002; stampOnSheet.rotation.z = 0.2;
  addP(can, { count: 200, center: [0, 8, 0], box: [10, 16, 10], size: 0.03, color: '#ffffff', opacity: 0.5, motion: 'fall', speed: 1.2, seed: 81 });

  // ===== BARN =====
  const barn = await scn('barn', 'park', { intensity: 0.45 }); const barnK = barnSet(barn);
  const M3 = makeToon(marshallLook); M3.group.position.set(0.9, 0, -0.25); M3.group.rotation.y = -0.75; barn.add(M3.group);
  const bowlB = mesh(new THREE.LatheGeometry([0, 0.02, 0.05, 0.08, 0.1].map((y, i) => new THREE.Vector2([0.06, 0.1, 0.13, 0.145, 0.15][i], y)), 40), phys('#c9ccd2', { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide })); barn.add(bowlB);
  const clip = boxM(0.22, 0.3, 0.015, phys('#7a5230'), 0, 0, 0); barn.add(clip);
  const pour = addP(barn, { count: 90, center: [0.3, 0.45, 0.2], box: [0.06, 0.6, 0.06], size: 0.02, color: '#ffd84a', opacity: 0.9, motion: 'fall', speed: 2.0, seed: 91 });
  const flaskB = flask(); flaskB.group.position.set(2.2, 0.75, -1.3); barn.add(flaskB.group); const fbGlow = new THREE.PointLight('#c8ff4a', 0, 2, 2); fbGlow.position.set(2.2, 0.95, -1.3); barn.add(fbGlow);
  addP(barn, { count: 260, center: [0, 1.4, 0], box: [5, 2.6, 3], size: 0.014, color: '#ffe6b0', opacity: 0.6, motion: 'float', speed: 0.3, seed: 93 });
  barn.add(lightBeam(V(-2.5, 3.6, -1.5), V(0.4, 0, 0.6), { radius: 1.3, opacity: 0.16, color: '#ffd9a0' }));

  // ===== THROAT + STOMACH =====
  const thr = await scn('throat'); const tun = tunnel();
  function tunnel() { const t = tunnelSetLocal(thr); return t; }
  const endo = new THREE.Group(); const tip = mesh(new THREE.SphereGeometry(0.05, 16, 12), glowMat('#e8f6ff', 1.2)); endo.add(tip); thr.add(endo);
  const tipLight = new THREE.PointLight('#e8f6ff', 2.5, 4, 1.5); endo.add(tipLight);
  const stom = await scn('stomach'); const chamber = stomachChamber(stom);
  const brothFall = addP(stom, { count: 420, center: [0, 0.4, 0], box: [0.5, 6, 0.5], size: 0.06, color: '#ffd84a', opacity: 0.9, motion: 'fall', speed: 4.5, seed: 101 });
  const fallBugs = []; for (let i = 0; i < 10; i++) { const b = spiralBug({ length: 0.4, radius: 0.035 }); b.userData.p = i; stom.add(b); fallBugs.push(b); }
  const splash = addP(stom, { count: 260, center: [0, -2.55, 0], box: [0.2, 0.05, 0.2], size: 0.06, color: '#fff2a0', opacity: 1, motion: 'burst', burstAt: 48.9, burstSpeed: 1.6, life: 1.4, seed: 103 });
  const motes = addP(stom, { count: 180, center: [0, 0, 0], box: [5, 4, 6], size: 0.02, color: '#ffd0d8', opacity: 0.5, motion: 'float', speed: 0.4, seed: 105 });

  // ===== SICK lab =====
  const sick = await scn('sick', 'lab', { intensity: 0.55 }); labSet(sick, { night: false }); sick.background = new THREE.Color('#b9c6cc');
  const M4 = makeToon(marshallLook); M4.group.position.set(-0.3, 0, 0.55); M4.group.rotation.y = 0.35; sick.add(M4.group);
  const W2 = makeToon(warrenLook); W2.group.position.set(0.85, 0, 0.6); W2.group.rotation.y = -1.1; sick.add(W2.group);
  const bucket = mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.26, 32, 1, true), phys('#8a96a6', { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })); sick.add(bucket);
  const cal = calendar(); cal.mesh.position.set(-0.3, 1.65, -1.53); sick.add(cal.mesh);
  const gas = addP(sick, { count: 300, center: [0, 0, 0], box: [0.3, 0.3, 0.3], size: 0.35, color: '#8fcf4a', opacity: 0.35, additive: false, motion: 'burst', burstAt: 51.9, burstSpeed: 1.6, life: 3, seed: 111 });

  // ===== MONITOR / SWARM =====
  const mon = await scn('monitor'); const monitor = monitorSet(mon);
  const screenTex = canvasTex => canvasTex;
  monitor.screen.material = new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 640; c.height = 420; const g = c.getContext('2d');
    const gr = g.createRadialGradient(320, 210, 20, 320, 210, 380); gr.addColorStop(0, '#ff6a6a'); gr.addColorStop(0.5, '#c21f35'); gr.addColorStop(1, '#3a0408'); g.fillStyle = gr; g.fillRect(0, 0, 640, 420);
    g.strokeStyle = 'rgba(255,160,160,0.5)'; g.lineWidth = 6; for (let i = 0; i < 14; i++) { g.beginPath(); for (let x = 0; x <= 640; x += 20) g.lineTo(x, 30 + i * 30 + Math.sin(x * 0.03 + i) * 12); g.stroke(); }
    g.strokeStyle = '#2a0a10'; g.lineWidth = 5; for (let i = 0; i < 22; i++) { const x = 60 + (i * 97) % 520, y = 60 + (i * 53) % 300; g.beginPath(); for (let k = 0; k < 8; k++) g.lineTo(x + k * 6, y + Math.sin(k * 1.8) * 6); g.stroke(); }
    g.fillStyle = '#9fffb0'; g.font = '20px monospace'; g.fillText('ENDOSCOPY  REC ●', 18, 30); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() });
  addP(mon, { count: 120, center: [0, 1.5, 0.5], box: [3, 2, 2], size: 0.012, color: '#cfe8ff', opacity: 0.4, motion: 'float', speed: 0.3, seed: 121 });
  const sw = await scn('swarm'); const swarmK = microSet(sw); swarmK.cloud.visible = false; swarmK.bug.visible = false; swarmK.acid.visible = false;
  sw.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHexString() === 'd9536a') { o.material = o.material.clone(); o.material.color.set('#b8202e'); o.material.emissive = new THREE.Color('#6a0010'); o.material.emissiveIntensity = 0.5; swarmK.lining = o; } });
  const swarm = []; for (let i = 0; i < 34; i++) { const b = spiralBug({ length: 0.6, radius: 0.05, color: '#3fd08a' }); b.position.set(Math.sin(i * 2.1) * 2.6, 0.62, Math.cos(i * 1.3) * 2.2); b.userData.p = i; sw.add(b); swarm.push(b); }
  addP(sw, { count: 220, center: [0, 1.2, 0], box: [6, 2, 6], size: 0.03, color: '#ffb0b8', opacity: 0.5, motion: 'float', speed: 0.5, seed: 125 });
  const swGlow = new THREE.PointLight('#ff4a5a', 2.5, 6, 1.5); swGlow.position.set(0, 1.2, 0); sw.add(swGlow);

  // ===== TRIUMPH lab =====
  const tri = await scn('triumph', 'lab', { intensity: 0.85 }); labSet(tri, { night: false }); tri.background = new THREE.Color('#ffd9a8');
  const M5 = makeToon(marshallLook); M5.group.position.set(-0.1, 0, 0.5); M5.group.rotation.y = 0.15; tri.add(M5.group);
  const printout = mesh(new THREE.PlaneGeometry(0.3, 0.4), phys('#ffffff', { map: textTex(['BIOPSY', 'H. pylori', 'POSITIVE ✓'], { w: 512, h: 680, font: 'bold 64px sans-serif', lineH: 110, color: '#1b4d2b' }), side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.15 })); tri.add(printout);
  addP(tri, { count: 160, center: [0, 1.6, 0.4], box: [2.5, 1.8, 1.5], size: 0.03, color: '#fff2b0', opacity: 0.8, motion: 'rise', speed: 0.4, seed: 131 });
  const cb2 = chalkboard(); cb2.position.set(1.4, 1.75, -1.5); tri.add(cb2);

  // ===== YEARS + STAGE =====
  const yrs = await scn('years'); const years = yearsTunnel(yrs);
  addP(yrs, { count: 300, center: [0, 0, -15], box: [6, 6, 34], size: 0.04, color: '#ffd76a', opacity: 0.8, motion: 'float', speed: 0.6, seed: 141 });
  const stg = await scn('stage', 'lobby', { intensity: 0.25 }); hallSet(stg, 'stage');
  const oldLook = { ...marshallLook, hair: '#9a9a9a', hairStyle: 'side' }, oldW = { ...warrenLook, hair: '#f0f0f0', hairStyle: 'bald' };
  const M6 = makeToon({ ...oldLook, coat: null, shirt: '#1a1a22', pants: '#1a1a22', tie: '#ffffff' }), W6 = makeToon({ ...oldW, coat: null, shirt: '#1a1a22', pants: '#1a1a22', tie: '#ffffff' });
  M6.group.position.set(-0.45, 0.6, -1.1); W6.group.position.set(0.45, 0.6, -1.1); stg.add(M6.group, W6.group);
  const medals = [0, 1].map(() => { const md = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 40), phys('#ffcf4a', { metalness: 1, roughness: 0.2, emissive: '#7a5a10', emissiveIntensity: 0.15 })); md.rotation.x = Math.PI / 2; stg.add(md); return md; });
  const cft = confetti(); stg.add(cft.mesh); stg.add(audience(16, 1.9));
  for (const x of [-1.5, 0, 1.5]) stg.add(lightBeam(V(x * 1.4, 7, 3), V(x * 0.3, 0.6, -1.1), { radius: 0.9, opacity: 0.14, color: '#ffd27a' }));
  addP(stg, { count: 220, center: [0, 2.5, -0.5], box: [6, 4, 3], size: 0.03, color: '#ffe08a', opacity: 0.8, motion: 'float', speed: 0.5, seed: 151 });

  // ===== MICRO (hero bug, ammonia, mucus, pills) =====
  const mic = await scn('micro'); const microK = microSet(mic);
  const bugHalo = halo(0.75, '#7fd6ff', 2.2, 0.6); mic.add(bugHalo);
  const sparks = addP(mic, { count: 200, center: [0, 1.2, 0.6], box: [1.6, 0.4, 1.6], size: 0.04, color: '#e8ff7a', opacity: 1, motion: 'float', speed: 3, seed: 161 });
  const antacid = pill('antacid'), capsule = pill('capsule'); antacid.scale.setScalar(2.2); capsule.scale.setScalar(1.8); mic.add(antacid, capsule);
  const gang = []; for (let i = 0; i < 7; i++) { const b = spiralBug({ length: 0.55, radius: 0.05 }); mic.add(b); gang.push(b); }
  const fizz = addP(mic, { count: 240, center: [0, 0.8, 0], box: [1.6, 1.2, 1.6], size: 0.04, color: '#ffffff', opacity: 0.85, motion: 'rise', speed: 1.2, seed: 163 });
  const shock = addP(mic, { count: 400, center: [0, 0.9, 0], box: [0.1, 0.1, 0.1], size: 0.06, color: '#d0f0ff', opacity: 1, motion: 'burst', burstAt: 79.45, burstSpeed: 3.2, life: 1.3, seed: 165 });
  const ring = mesh(new THREE.TorusGeometry(1, 0.03, 8, 80), new THREE.MeshBasicMaterial({ color: '#cff4ff', transparent: true, blending: THREE.AdditiveBlending })); ring.rotation.x = Math.PI / 2; mic.add(ring);

  // ===== JOURNAL desk =====
  const jr = await scn('journal', 'apartment', { intensity: 0.5 }); const jDesk = deskSet(jr); jDesk.ink.visible = false; jDesk.stamp.visible = false; jDesk.paper.visible = false;
  const journal = mesh(new THREE.PlaneGeometry(0.42, 0.56), phys('#ffffff', { map: journalTexture(0), roughness: 0.85, side: THREE.DoubleSide })); jr.add(journal);
  const M7 = makeToon(marshallLook); M7.group.position.set(0, -0.55, -0.62); jr.add(M7.group);
  const sweat = mesh(new THREE.SphereGeometry(0.025, 16, 12), phys('#bfe6ff', { roughness: 0.05, clearcoat: 1, transmission: 0.6, transparent: true })); sweat.scale.y = 1.4; jr.add(sweat);
  addP(jr, { count: 150, center: [0, 0.9, -0.2], box: [1.6, 1.4, 1.2], size: 0.01, color: '#fff0d0', opacity: 0.55, motion: 'float', speed: 0.3, seed: 171 });

  // ---------- helpers ----------
  // flask held at chest (k=0) → at the lips, tipped up (k=1). Hand follows via IK.
  const qUp = new THREE.Quaternion(), qDrink = new THREE.Quaternion().setFromEuler(new THREE.Euler(-2.1, 0, 0));
  function flaskPose(m, fl, k) {
    m.group.updateMatrixWorld(true);
    const chestPos = m.group.localToWorld(V(-0.06, 1.18, 0.3)), mouth = m.mouthWorld();
    const neck = V(0, 0.31, 0).applyQuaternion(qDrink), drinkPos = mouth.clone().sub(neck).add(V(0, 0, 0.02));
    fl.group.position.copy(lerpV(chestPos, drinkPos, k)); fl.group.quaternion.copy(qUp).slerp(qDrink, k);
    fl.group.updateMatrixWorld(true); m.reach('R', fl.group.localToWorld(V(0, 0.1, 0)));
  }
  const grade = { sat: 1.25, con: 1.08, warm: 0.02 };
  let lastScene = null;

  return {
    render(t) {
      const seg = segAt(t), lt = t - seg.s, p = prog(t, seg.s, seg.e);
      let scene, pos, at, fov = 40, focus = null, aperture = 0, bloom = 0.3, exposure = 0.9;
      cam.up.set(0, 1, 0);
      switch (seg.n) {
        case 'lab': {
          scene = lab; M1.rest(); M1.idle(t);
          // flask choreography: chest → lips (gulp) → chest
          const up = easeInOut(prog(t, 1.6, 2.45)), down = easeInOut(prog(t, 3.55, 4.15)), k = up * (1 - down);
          flaskPose(M1, F1, k); M1.joints.head.rotation.x = -0.28 * smooth(prog(t, 2.3, 2.7)) * (1 - down);
          M1.face(t < 2.2 ? 'smile' : t < 3.6 ? 'o' : t < 5.6 ? 'flat' : 'grin');
          if (t > 3.9 && t < 4.7) M1.reach('L', M1.mouthWorld().add(V(-0.05, -0.02, 0.06)));   // wipes mouth
          M1.look(t > 5.0 ? -0.6 : 0, 0);
          flaskSpecks.points.position.copy(F1.group.localToWorld(V(0, 0.06, 0))); F1glow.intensity = 0.35 + 0.15 * Math.sin(t * 6); exposure = 0.78; bloom = 0.22;
          // camera: macro on broth → pull back & arc → face → swing to chalkboard → into the window
          const head = M1.headWorld();
          if (t < 3.6) { const k2 = easeOut(prog(t, 0, 3.4)); const fp = F1.group.position;
            pos = lerpV(fp.clone().add(V(0.3, 0.12, 0.42)), V(1.25, 1.55, 2.35), k2); at = lerpV(fp.clone().add(V(0, 0.08, 0)), head.clone().add(V(-0.1, -0.15, 0)), smooth(prog(t, 0.6, 2.4))); fov = lerp(30, 38, k2); focus = pos.distanceTo(at); aperture = 0.004 * (1 - k2) + 0.0015; }
          else if (t < 5.0) { const k2 = easeInOut(prog(t, 3.6, 5.0)); pos = lerpV(V(1.25, 1.55, 2.35), V(0.55, 1.78, 1.35), k2); at = head.clone(); fov = lerp(38, 30, k2); focus = pos.distanceTo(at); aperture = 0.003; }
          else { const k2 = easeIn(prog(t, 5.0, 6.8)); const sw = smooth(prog(t, 5.0, 5.9));
            pos = lerpV(V(0.55, 1.78, 1.35), V(-1.3, 2.2, -1.25), k2); at = lerpV(lerpV(head, V(-2.9, 1.75, 0.1), sw), V(-1.2, 2.2, -1.6), smooth(prog(t, 5.9, 6.6))); fov = lerp(30, 42, k2); }
          break; }
        case 'city': {
          scene = city; const k = easeInOut(p);
          pos = V(lerp(-48, 6, k), lerp(40, 7.2, k), lerp(70, 9, k)); at = V(lerp(-10, 8, k), lerp(4, 6.6, k), lerp(-10, 3.0, k)); fov = lerp(45, 35, k);
          break; }
        case 'corridor': {
          scene = cor; [M2, D1, D2].forEach(h => h.rest());
          const walkK = prog(t, 10.45, 12.8);
          M2.group.position.set(-0.7, 0, lerp(-9.5, -5.0, walkK)); M2.group.rotation.y = walkK < 1 ? 0 : lerp(0, -Math.PI / 2 + 0.25, smooth(prog(t, 12.8, 13.2)));
          if (walkK < 1) M2.walk(t, 6.5); M2.idle(t, 0.4); M2.face(t < 13.2 ? 'smile' : t < 14.4 ? 'grin' : 'frown');
          M2.group.updateMatrixWorld(true); folder.visible = t < 13.3; folder.position.copy(M2.group.localToWorld(V(0.24, 1.0, 0.15))); folder.rotation.set(0, M2.group.rotation.y, 0.1); M2.reach('L', folder.position.clone().add(V(0, -0.05, 0)));
          // the note: pinned at 13.3, falls at 14.4, slides away toward the door
          const pin = smooth(prog(t, 12.9, 13.35)), fall = easeIn(prog(t, 14.35, 14.95)), slide = easeInOut(prog(t, 14.95, 15.25));
          if (t < 13.35) { note.position.copy(M2.handWorld('R')); M2.reach('R', lerpV(M2.group.localToWorld(V(-0.1, 1.2, 0.3)), V(-2.05, 1.6, -5.6), pin)); note.rotation.set(0, Math.PI / 2, 0); }
          else { note.position.set(-2.05 + fall * 0.2 + slide * 1.6, 1.6 - fall * 1.58, -5.6 - slide * 7.5); note.rotation.set(fall * -Math.PI / 2, Math.PI / 2 * (1 - fall), fall * 0.3); }
          D1.group.position.set(0.6, 0, lerp(-3, -10, prog(t, 10.45, 15.25))); D1.group.rotation.y = Math.PI; D1.walk(t + 1, 6); D1.face(t > 11.5 && t < 12.6 ? 'o' : 'flat');   // yawning
          D2.group.position.set(1.3, 0, lerp(-12, -6.5, prog(t, 10.45, 15.25))); D2.walk(t + 2, 6); D2.face('flat'); D2.look(0, 1);              // eye-roll
          const w = M2.group.position;
          if (t < 12.8) { pos = V(lerp(0.2, 0.0, walkK), 1.62, w.z + lerp(2.6, 1.6, walkK)); at = M2.headWorld().add(V(0, -0.05, 0)); fov = 40 - 12 * bell(t, 10.75, 0.35); }
          else if (t < 14.4) { const k = smooth(prog(t, 12.8, 13.6)); pos = lerpV(V(0.0, 1.62, w.z + 1.6), V(-1.0, 1.62, -3.6), k); at = lerpV(M2.headWorld(), V(-1.75, 1.5, -5.45), k); fov = 36; focus = pos.distanceTo(at); aperture = 0.002; }
          else { const k = easeInOut(prog(t, 14.4, 15.25)); pos = lerpV(V(-1.0, 1.62, -3.6), V(-0.1, 0.25, -10.5), k); at = lerpV(V(-2.0, 1.4, -5.6), V(0.2, 0.05, -13.9), k); fov = 40; }
          break; }
        case 'lecture': {
          scene = lec; Prof.rest(); Prof.idle(t); Prof.face(t > 17 ? 'grin' : 'smile');
          const bp = V(-0.6 + 0.9 * smooth(prog(t, 16.8, 17.6)), 2.4, -3.8); Prof.reach('R', lerpV(Prof.handWorld('R'), bp, 0.85));
          const hp = Prof.handWorld('R'); pointer.position.copy(hp.clone().lerp(bp, 0.5)); pointer.lookAt(bp); pointer.rotateX(Math.PI / 2);
          studs.forEach((s, i) => { s.rest(); s.joints.head.rotation.x = 0.15 * Math.max(0, Math.sin(t * 6 + i * 0.3)) * (t > 16.9 ? 1 : 0.3); s.face('flat'); });
          const sl = (w, t0, x) => { const k = easeOut(prog(t, t0 - 0.12, t0 + 0.05)); w.visible = t > t0 - 0.12; w.position.set(x, 3.0, -3.7); w.scale.setScalar(lerp(3, 1, k)); };
          sl(wS, 17.12, -0.85); sl(wA, 17.85, 0.85);
          const k = easeInOut(prog(t, 15.25, 17.0)), k2 = easeIn(prog(t, 17.9, 18.6));
          pos = lerpV(lerpV(V(-2.9, 1.1, 5.2), V(-0.2, 2.7, 4.6), k), V(0.15, 2.0, -3.35), k2); at = lerpV(lerpV(V(0, 1.6, -2), V(0, 2.3, -3.8), k), V(0.15, 2.0, -3.85), k2); fov = lerp(42, 36, k);
          break; }
        case 'acid': {
          scene = acid; const fallK = easeIn(prog(t, 19.25, 19.95)), dis = prog(t, 19.95, 20.5);
          dropBug.position.set(0.2, lerp(3.2, 0.96, fallK), 0.1); dropBug.rotation.set(t * 3, 0.5, 0.4); dropBug.scale.setScalar(Math.max(0.001, 1 - dis)); dropBug.visible = t > 19.0;
          const a = lerp(0.4, 2.6, p); pos = V(Math.sin(a) * lerp(4.2, 1.2, easeIn(p)), lerp(3.4, 1.05, easeIn(p)), Math.cos(a) * lerp(4.2, 1.2, easeIn(p))); at = V(0.1, lerp(0.9, 0.95, p), 0.05); fov = 40;
          bloom = 0.35; exposure = 0.8; break; }
        case 'warren': {
          scene = hist; W1.rest(); W1.idle(t, 0.4);
          W1.joints.chest.rotation.x = 0.35; W1.joints.head.rotation.x = 0.3; W1.reach('R', V(1.22, 1.08, -0.38)); W1.reach('L', V(1.42, 1.08, -0.38));
          W1.face(t > 25.3 ? 'o' : 'flat');
          const dusk = smooth(prog(t, 22.2, 25.2)); hist.environmentIntensity = lerp(0.75, 0.3, dusk); hist.background = new THREE.Color().lerpColors(new THREE.Color('#cfe3ee'), new THREE.Color('#e8956a'), dusk);
          sunBeam.material.uniforms.uColor.value.set(new THREE.Color().lerpColors(new THREE.Color('#fff2cc'), new THREE.Color('#ff9a5a'), dusk));
          slidesStack.forEach((s, i) => s.visible = i < 4 + Math.floor(dusk * 14)); cups.forEach((c, i) => c.visible = dusk > i * 0.25);
          nameTag.position.set(1.3, 2.05, 0.2); nameTag.visible = t > 23.2 && t < 25.2; nameTag.material.opacity = smooth(prog(t, 23.2, 23.5));
          const eye = V(1.3, 1.36, -0.12);
          if (t < 22.6) { const k = easeOut(prog(t, 21.2, 22.6)); pos = lerpV(V(1.3, 1.3, -0.42), V(1.3 + Math.sin(1.35) * 2.3, 1.7, -0.1 + Math.cos(1.35) * 2.3), k); at = lerpV(V(1.3, 1.25, -0.6), eye, k); fov = lerp(60, 36, k); }
          else if (t < 25.6) { const a = lerp(1.35, 2.05, prog(t, 22.6, 25.6)); pos = V(1.3 + Math.sin(a) * lerp(2.3, 1.8, prog(t, 22.6, 25.6)), 1.7, -0.1 + Math.cos(a) * lerp(2.3, 1.8, prog(t, 22.6, 25.6))); at = eye; fov = 34; focus = 1.4; aperture = 0.002; }
          else { const k = easeIn(prog(t, 25.6, 26.5)); pos = lerpV(V(1.3 + Math.sin(2.05) * 1.8, 1.7, -0.1 + Math.cos(2.05) * 1.8), V(1.24, 1.28, -0.36), k); at = lerpV(eye, V(1.3, 1.24, -0.45), k); fov = lerp(34, 55, k); }
          break; }
        case 'slide': {
          scene = sld; slide.bugs.forEach(b => { b.position.x += Math.sin(t * 2 + b.userData.p) * 0.0015; b.children[0].rotation.x = t * 4 + b.userData.p; });
          pos = V(Math.sin(t * 0.4) * 0.4, Math.cos(t * 0.35) * 0.3, lerp(1.4, 2.0, smooth(p))); at = V(pos.x * 0.6, pos.y * 0.6, 0); fov = 40;
          cam.position.copy(pos); cam.lookAt(at); cam.updateMatrixWorld(true);
          const iris = lerp(0.02, 0.42, easeOut(prog(t, 26.5, 27.1))) * (1 + 3 * easeIn(prog(t, 30.3, 30.8)));
          mask.position.copy(pos).add(V(0, 0, -1).applyQuaternion(cam.quaternion)); mask.quaternion.copy(cam.quaternion); mask.scale.setScalar(iris);
          bloom = 0.6; break; }
        case 'typing': {
          scene = typ; tw.keys.forEach((k, i) => { k.position.y = 0.13 - (Math.floor(t * 15) % 30 === i ? 0.01 : 0); });
          const out = easeInOut(prog(t, 31.7, 32.6)); env1.visible = t > 31.7; env1.position.set(lerp(0, 0.1, out), lerp(0.4, 0.75, out), lerp(-0.2, 0.4, out)); env1.rotation.set(lerp(-1.2, 0.3, out), out * 2, 0);
          const k = easeInOut(prog(t, 30.8, 31.8)); pos = lerpV(V(0.75, 0.8, 1.15), V(0.85, 0.95, 1.35), k); at = lerpV(V(0, 0.12, -0.1), V(0, 0.3, -0.1), k);
          if (t > 31.8) { pos = lerpV(V(0.45, 0.55, 0.75), env1.position.clone().add(V(0.05, 0.05, 0.25)), easeIn(prog(t, 31.8, 32.6))); at = env1.position.clone(); }
          fov = 36; focus = pos.distanceTo(at); aperture = 0.004; break; }
        case 'conference': {
          scene = conf; revs.forEach((r, i) => { r.rest(); r.idle(t + i); r.face(['flat', 'frown', 'flat'][i]); r.joints.head.rotation.x = 0.25; r.reach('L', V(-1.5 + i * 1.3, 1.02, -1.0)); r.reach('R', V(-1.1 + i * 1.3, 1.02, -1.0)); });
          const k = easeOut(prog(t, 32.6, 33.6)); env2.position.set(lerp(0.4, 0, k), lerp(2.2, 1.0, k), lerp(1.5, -1.0, k)); env2.rotation.set(lerp(1, 0, k), lerp(3, 0.2, k), 0);
          pos = V(lerp(0.2, -0.2, p), lerp(2.0, 1.55, easeInOut(p)), lerp(2.6, -0.2, easeInOut(p))); at = lerpV(env2.position, V(0, 0.98, -1.05), smooth(prog(t, 33.6, 34.6))); fov = 40;
          if (t > 34.2) { const k3 = easeIn(prog(t, 34.2, 34.62)); pos = lerpV(pos, V(0, 1.35, -0.95), k3); at = V(0, 0.98, -1.0); }
          break; }
        case 'stamp': {
          scene = stp; const kk = easeIn(prog(t, 34.74, 34.93)); desk.stamp.position.set(0.02, lerp(0.75, 0.02, kk), 0.05); desk.stamp.rotation.set(0, 0.22, 0); desk.ink.visible = t >= 34.95;
          const up = easeOut(prog(t, 35.15, 35.6)); if (up > 0) desk.stamp.position.set(0.02 + up * 0.4, 0.02 + up * 0.6, 0.05 + up * 0.2);
          inkGlow.intensity = 3 * bell(t, 35.1, 0.4);
          const lift = easeIn(prog(t, 35.45, 35.9)); desk.paper.position.y = 0.002 + lift * 0.5; desk.ink.position.y = 0.004 + lift * 0.5;
          pos = V(0, lerp(1.0, 0.75, easeOut(p)), lerp(0.45, 0.32, p)).add(shake(t, 34.93, 0.4, 0.03)); at = V(0, 0.0 + lift * 0.5, 0.03); fov = 40; exposure = 0.62; bloom = 0.2; break; }
        case 'canyon': {
          scene = can; const k = easeIn(prog(t, 35.9, 37.2));
          sheet.position.set(Math.sin(t * 3) * 0.6 * (1 - k), lerp(17, 0.93, k), Math.cos(t * 2.4) * 0.5 * (1 - k)); sheet.rotation.set(-Math.PI / 2 + Math.sin(t * 5) * 0.6 * (1 - k), t * 2 * (1 - k), 0);
          canyon.tag.visible = t > 37.1; canyon.glow.intensity = 6 * smooth(prog(t, 37.1, 37.5));
          pos = sheet.position.clone().add(V(0.6, lerp(2.2, 1.4, k), 1.4)); at = sheet.position.clone(); fov = 50;
          if (t > 37.3) { const k2 = easeIn(prog(t, 37.3, 38.15)); pos = lerpV(V(0.6, 2.3, 1.4), V(0.3, 0.2, 0.9), k2); at = lerpV(V(0, 1.0, 0), V(0, 0, 0.2), k2); }
          bloom = 0.5; break; }
        case 'barn': {
          scene = barn; M3.rest(); M3.idle(t, 0.5);
          barnK.pigs.forEach((pg, i) => { const happy = t > 40.6 && t < 42.3; pg.position.y = happy ? Math.abs(Math.sin(t * 8 + i)) * 0.14 : 0; pg.userData.head.rotation.z = t < 40.6 ? -0.3 + 0.15 * Math.sin(t * 12 + i) : 0.2 * Math.sin(t * 5 + i); });
          const dim = smooth(prog(t, 42.3, 43.6)); barnK.sun.intensity = lerp(2.6, 0.6, dim); barn.environmentIntensity = lerp(0.45, 0.12, dim); fbGlow.intensity = 3 * dim;
          if (t < 40.6) { // pouring broth into the trough
            bowlB.visible = true; clip.visible = false; pour.points.visible = t > 38.9;
            const tilt = smooth(prog(t, 38.6, 39.3)); bowlB.position.set(0.55, 0.75, 0.1); bowlB.rotation.set(0, 0, lerp(0, 1.0, tilt)); M3.reach('R', V(0.6, 0.78, 0.18)); M3.reach('L', V(0.5, 0.78, 0.02)); M3.face('grin');
          } else if (t < 42.3) { bowlB.visible = false; pour.points.visible = false; clip.visible = true; M3.face('frown');
            clip.position.set(0.75, 1.2, 0.0); clip.rotation.set(-0.6, -0.7, 0); M3.reach('L', V(0.76, 1.12, 0.02)); M3.reach('R', M3.headWorld().add(V(-0.17, 0.08, 0)));   // scratches head
          } else { bowlB.visible = false; clip.visible = false; pour.points.visible = false; M3.face(t < 43.2 ? 'flat' : 'o'); M3.joints.head.rotation.y = lerp(0, -0.9, smooth(prog(t, 42.6, 43.3))); M3.look(-1, 0); }
          const head = M3.headWorld();
          if (t < 40.6) { const k = easeOut(prog(t, 38.15, 39.6)); pos = lerpV(V(0.2, 0.08, 1.4), V(-0.4, 1.3, 2.6), k); at = lerpV(V(0.3, 0.05, 0.4), V(0.5, 0.7, 0), k); fov = 40 - 10 * bell(t, 38.3, 0.3); }
          else if (t < 42.3) { const a = lerp(-0.2, 0.5, prog(t, 40.6, 42.3)); pos = V(0.4 + Math.sin(a) * 2.4, 1.0 + 0.08 * Math.sin(t * 6), Math.cos(a) * 2.4); at = V(0.3, 0.45, 0); fov = 40; }
          else { const k = easeInOut(prog(t, 42.3, 44.95)); const mouth = M3.mouthWorld(); pos = lerpV(V(0.4 + Math.sin(0.5) * 2.4, 1.0, Math.cos(0.5) * 2.4), mouth.clone().add(V(0.05, 0, 0.12).applyAxisAngle(V(0, 1, 0), M3.group.rotation.y)), easeIn(k)); at = lerpV(head, mouth, k); fov = lerp(40, 55, k); focus = pos.distanceTo(at); aperture = 0.004 * (1 - k); }
          break; }
        case 'throat': {
          scene = thr; const k = easeInOut(p); const u = clamp(k * 0.95, 0, 0.97);
          const cp = tun.curve.getPointAt(u), ahead = tun.curve.getPointAt(Math.min(1, u + 0.03)); endo.position.copy(tun.curve.getPointAt(Math.min(1, u + 0.05)));
          pos = cp; at = ahead; fov = 62; tun.headlamp.position.copy(cp); bloom = 0.3; exposure = 0.8; break; }
        case 'stomach': {
          scene = stom; const heave = t > 50.1 ? Math.sin(t * 14) * 0.06 * smooth(prog(t, 50.1, 50.5)) : 0; chamber.wall.scale.setScalar(1 + heave);
          chamber.mat.color.set(new THREE.Color().lerpColors(new THREE.Color('#ea8a96'), new THREE.Color('#d2506a'), smooth(prog(t, 49.5, 51)))); chamber.lamp.position.set(0, 1, 1);
          brothFall.points.visible = t > 48.2 && t < 49.9; brothFall.points.position.set(0, 0.4, 0);
          fallBugs.forEach((b, i) => { const k = prog(t, 48.3 + i * 0.08, 49.0 + i * 0.08); b.visible = k > 0 && k < 1 || t > 49.0 + i * 0.08; b.position.set(Math.sin(i * 2) * 0.3, lerp(3.2, -2.5, easeIn(k)), Math.cos(i * 3) * 0.3); b.rotation.set(t * 4 + i, i, t * 2); });
          if (t < 47.75) { const k = easeOut(prog(t, 46.55, 47.75)); pos = V(0, lerp(2.6, 0.4, k), lerp(0.4, 2.4, k)); at = V(0, lerp(-1, -0.8, k), 0); }
          else if (t < 50.1) { const k = smooth(prog(t, 47.75, 48.4)), k2 = smooth(prog(t, 48.9, 49.6)); pos = V(0.2, 0.2, 2.2); at = lerpV(lerpV(V(0, -0.8, 0), V(0, 3, 0), k), V(0, -2.5, 0), k2); }
          else { const k = easeIn(prog(t, 50.6, 51.35)); pos = lerpV(V(0.2, 0.2, 2.2), V(0, 3.3, 0), k).add(shake(t, 50.1, 1.2, 0.08)); at = lerpV(V(0, -2.5, 0), V(0, 6, 0), k); }
          fov = 55; bloom = 0.55; break; }
        case 'sick': {
          scene = sick; M4.rest(); W2.rest(); M4.skinColor('#b8d49a'); M4.face('sick'); M4.joints.chest.rotation.x = 0.45; M4.joints.head.rotation.x = 0.3;
          bucket.position.copy(M4.group.localToWorld(V(0, 0.78, 0.42))); M4.reach('L', bucket.position.clone().add(V(0.13, 0.12, 0))); M4.reach('R', bucket.position.clone().add(V(-0.13, 0.12, 0)));
          W2.face('o'); W2.joints.chest.rotation.x = -0.25; W2.reach('L', W2.mouthWorld().add(V(0, 0.04, 0.06))); W2.reach('R', W2.group.localToWorld(V(-0.4, 1.3, 0.3)));
          cal.set(Math.floor(prog(t, 51.35, 51.8) * 3.99));
          gas.points.position.copy(M4.mouthWorld());
          if (t < 51.8) { const k = easeOut(prog(t, 51.35, 51.8)); pos = lerpV(V(-0.3, 1.65, -0.9), V(-0.3, 1.6, -0.5), k); at = V(-0.3, 1.65, -1.53); }
          else { const k = easeInOut(prog(t, 51.8, 53.45)); pos = lerpV(V(0.4, 1.6, 2.4), V(-0.15, 1.45, 1.4), k); at = M4.headWorld().add(V(0, -0.1, 0)); }
          fov = 38; break; }
        case 'monitor': {
          scene = mon; const k = easeIn(prog(t, 53.45, 55.0)); monitor.glow.intensity = 4 + 2 * Math.sin(t * 5);
          pos = lerpV(V(0.9, 1.55, 2.4), V(0, 1.4, 0.18), k); at = V(0, 1.4, 0); fov = 40 - 14 * bell(t, 53.6, 0.3); break; }
        case 'swarm': {
          scene = sw; swarmK.update(t); if (swarmK.lining) swarmK.lining.material.emissiveIntensity = 0.45 + 0.25 * Math.sin(t * 4);
          swarm.forEach((b, i) => { const crawl = smooth(prog(t, 56.4, 58.8)); const r = lerp(2.6, 0.9, crawl * (i % 3 === 0 ? 1 : 0.6)); const a = i * 0.7 + t * 0.15;
            b.position.set(Math.cos(a) * r, 0.62 + 0.05 * Math.sin(t * 4 + i), Math.sin(a) * r); b.rotation.set(t * 5 + i, -a, 0); });
          const k = easeOut(prog(t, 55.0, 56.5)); const a = lerp(0.2, 1.2, p);
          pos = V(Math.sin(a) * lerp(3.4, 1.6, k), lerp(2.8, 1.0, k), Math.cos(a) * lerp(3.4, 1.6, k)); at = V(0, 0.6, 0); fov = 42; bloom = 0.35; exposure = 0.85; break; }
        case 'triumph': {
          scene = tri; M5.rest(); M5.idle(t, 0.4); M5.face('grin');
          printout.position.copy(M5.group.localToWorld(V(-0.15, 1.75, 0.35))); printout.rotation.set(0, 0.15, -0.05); M5.reach('R', printout.position.clone().add(V(-0.12, -0.15, 0)));
          if (t > 61.3) M5.reach('L', M5.group.localToWorld(V(0.5, 1.8, 0.35))); else M5.reach('L', M5.group.localToWorld(V(0.18, 1.0, 0.25)));
          const k = easeOut(prog(t, 59.25, 61.0)), k2 = easeIn(prog(t, 62.1, 62.8));
          pos = lerpV(lerpV(printout.position.clone().add(V(0, 0, 0.18)), V(0.7, 1.65, 2.3), k), printout.position.clone().add(V(0, 0, 0.1)), k2); at = lerpV(printout.position, lerpV(M5.headWorld(), printout.position, 0.4), k * (1 - k2)); fov = 38; focus = pos.distanceTo(at); aperture = 0.0025; break; }
        case 'years': {
          scene = yrs; years.update(t); years.setYear(Math.round(lerp(1984, 2005, easeInOut(prog(t, 62.85, 64.0))))); years.yearPlane.position.set(0, 0, -6);
          pos = V(0, 0, lerp(3, -4, easeIn(p))); at = V(0, 0, -20); fov = lerp(50, 70, p); bloom = 0.8; break; }
        case 'stage': {
          scene = stg; cft.update(t); [M6, W6].forEach((h, i) => { h.rest(); h.idle(t + i); h.face('grin'); h.group.updateMatrixWorld(true);
            medals[i].position.copy(h.group.localToWorld(V(0, 1.32, 0.17))); h.reach(i ? 'L' : 'R', h.group.localToWorld(V(i ? 0.25 : -0.25, 2.05, 0.1))); });
          const k = easeOut(prog(t, 64.15, 65.6)), k2 = easeIn(prog(t, 65.7, 66.45));
          pos = lerpV(lerpV(V(-0.6, 1.4, 3.6), V(0.25, 2.15, 1.4), k), medals[0].position.clone().add(V(0, 0, 0.12)), k2); at = lerpV(V(0, 2.05, -1.1), medals[0].position, k2); fov = 40; bloom = 0.4; break; }
        case 'micro': {
          scene = mic; microK.update(t);
          const bug = microK.bug, cloud = microK.cloud;
          // 66.45–69.7 hero orbit, turn to camera on "bug's"; 69.7–76.35 ammonia + mucus; 76.35–80.85 pills
          const grow = easeOut(prog(t, 70.2, 71.4)); cloud.visible = t > 70.1 && t < 80.9; cloud.scale.setScalar(Math.max(0.01, grow)); bugHalo.position.copy(bug.position); bugHalo.visible = t < 70.3; bugHalo.scale.setScalar(0.6 + 0.05 * Math.sin(t * 4));
          sparks.points.visible = t > 71.2 && t < 76.4; sparks.points.position.copy(bug.position).add(V(0, 0.6, 0));
          const dig = easeInOut(prog(t, 73.6, 75.8)); bug.position.y = lerp(0.55, 0.12, dig) + 0.04 * Math.sin(t * 2); cloud.position.copy(bug.position); bug.visible = t < 79.6;
          // pills
          const tab = easeIn(prog(t, 76.2, 76.5)); antacid.visible = t > 76.2 && t < 78.4; antacid.position.set(0.9, lerp(4, 0.75, tab), -0.4); antacid.rotation.set(0.3, t, 0);
          fizz.points.visible = t > 76.5 && t < 78.5; fizz.points.position.set(0.9, 0.9, -0.4);
          const cap = easeIn(prog(t, 78.4, 78.8)); capsule.visible = t > 78.4 && t < 80.9; capsule.position.set(-0.3, lerp(4, 1.2, cap), 0.1); const split = easeOut(prog(t, 79.35, 79.7));
          capsule.userData.halves[0].position.y = 0.16 + split * 0.9; capsule.userData.halves[1].position.y = -0.16 - split * 0.4; capsule.rotation.z = 0.3;
          ring.visible = t > 79.4 && t < 80.4; ring.scale.setScalar(0.2 + easeOut(prog(t, 79.4, 80.2)) * 5); ring.position.set(-0.3, 0.9, 0.1); ring.material.opacity = 1 - prog(t, 79.6, 80.3);
          gang.forEach((b, i) => { const a = i / gang.length * Math.PI * 2 + 0.3; b.visible = t > 76.3 && !(t > 79.5 + i * 0.05);
            b.position.set(Math.cos(a) * 1.4, 0.55 + (t < 78.4 ? Math.abs(Math.sin(t * 9 + i)) * 0.18 : 0), Math.sin(a) * 1.4 - 0.2); b.rotation.set(t * 5, -a, 0); });
          if (microK.lining) {}
          let a, r, y;
          if (t < 69.7) { a = lerp(0, 3.0, prog(t, 66.45, 69.7)); r = lerp(1.6, 1.15, prog(t, 66.45, 69.7)); y = 0.75; bug.rotation.y = t > 68.8 ? lerp(bug.rotation.y, a + Math.PI / 2, 0.2) : t; }
          else if (t < 76.35) { a = 3.0 + lerp(0, 1.2, prog(t, 69.7, 76.35)); r = lerp(1.6, 2.0, prog(t, 69.7, 73.6)); y = lerp(1.0, lerp(1.3, 0.55, dig), smooth(prog(t, 69.7, 71))); }
          else { a = 4.2 + lerp(0, 0.6, prog(t, 76.35, 80.85)); r = 3.0; y = 2.0; }
          exposure = 0.85; pos = V(Math.sin(a) * r, y, Math.cos(a) * r + 0.6).add(shake(t, 76.45, 0.5, 0.06)).add(shake(t, 79.45, 0.6, 0.08)); at = t < 76.35 ? bug.position.clone() : V(0.2, 0.7, -0.1); fov = 40 - 10 * bell(t, 67.1, 0.3) - 8 * bell(t, 68.85, 0.25);
          bloom = 0.35; break; }
        case 'journal': {
          scene = jr; M7.rest(); M7.idle(t, 0.3);
          const lift = easeInOut(prog(t, 84.3, 84.9)), hide = easeInOut(prog(t, 86.1, 86.8));
          const flat = V(0, 0.003, 0.15), held = M7.group.localToWorld(V(0, lerp(1.2, 1.55, hide), 0.42));
          journal.position.copy(lerpV(flat, held, lift)); journal.quaternion.copy(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.05)).slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, 0)), lift));
          if (lift > 0) { journal.updateMatrixWorld(true); M7.reach('L', journal.localToWorld(V(0.2, -0.05, 0))); M7.reach('R', journal.localToWorld(V(-0.2, -0.05, 0))); }
          const hl = prog(t, 82.9, 83.6); if (journal.userData.hl !== Math.round(hl * 10)) { journal.material.map = journalTexture(hl); journal.userData.hl = Math.round(hl * 10); }
          M7.face(t < 85.5 ? 'flat' : 'grin'); M7.blush(smooth(prog(t, 84.8, 85.4))); M7.look(0, t > 86.8 ? 0.3 : -0.3);
          sweat.visible = t > 85.0; sweat.position.copy(M7.headWorld().add(V(0.17, 0.12 - (t - 85) * 0.03, 0.12)));
          if (t < 84.3) { const k = prog(t, 80.85, 84.3); pos = V(lerp(-0.12, 0.1, k), lerp(0.22, 0.16, k), lerp(0.3, 0.18, k)); at = V(lerp(-0.12, 0.05, k), 0, lerp(0.05, 0.12, k)); fov = 34; focus = pos.distanceTo(at); aperture = 0.006; exposure = 0.6; bloom = 0.18; }
          else { const k = easeInOut(prog(t, 84.3, 85.6)), k2 = easeIn(prog(t, 86.6, 87.72)); const eyes = M7.headWorld().add(V(0, 0.03, 0.2));
            pos = lerpV(lerpV(V(0.1, 0.3, 0.3), V(0.25, 1.15, 1.45), k), eyes.clone().add(V(0, 0.02, 0.32)), k2); at = lerpV(lerpV(V(0, 0.1, 0.1), M7.headWorld(), k), eyes, k2); fov = lerp(36, 30, k2); focus = pos.distanceTo(at); aperture = 0.003; }
          exposure = 0.6; bloom = 0.18; break; }
      }
      // always-alive camera
      pos = pos.clone().add(drift(t, 0.012, 1));
      cam.position.copy(pos); cam.lookAt(at); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      for (const [s, p] of P) if (s === scene) p.update(t);
      // portal fills + zoom accents
      let fill = 0, fillColor = null, zoom = 0;
      for (const [c, w, col, z] of PORTALS) { const b = bell(t, c, w); if (b > fill) { fill = b; fillColor = col; } zoom = Math.max(zoom, b * z); }
      for (const c of ACCENTS) zoom = Math.max(zoom, bell(t, c + 0.05, 0.22) * 0.45);
      post.render(scene, cam, t, { focus, aperture, bloom, zoom, fill: fill * 0.96, fillColor, exposure, ...grade });
    },
  };
}

// local copy of the tunnel (throat) with a stronger, wetter look
function tunnelSetLocal(scene) {
  scene.background = new THREE.Color('#2a0508'); scene.fog = new THREE.Fog('#2a0508', 0.5, 7);
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector3(Math.sin(u * 5) * 0.6, -u * 12, Math.cos(u * 4) * 0.5 - u * 2)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 400, 0.9, 48, false); const P = geo.attributes.position, N = geo.attributes.normal;
  for (let i = 0; i < P.count; i++) { const ring = Math.floor(i / 49), k = 0.14 * Math.sin(ring * 0.9) + 0.05 * Math.sin(i * 0.37); P.setXYZ(i, P.getX(i) - N.getX(i) * k, P.getY(i) - N.getY(i) * k, P.getZ(i) - N.getZ(i) * k); }
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#e8838e', side: THREE.BackSide, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.7, sheenColor: new THREE.Color('#ffb8c0'), emissive: '#2a0508', emissiveIntensity: 0.3 })));
  const headlamp = new THREE.PointLight('#ffffff', 7, 6, 1.2); scene.add(headlamp); scene.add(new THREE.AmbientLight('#ff8a8a', 0.4));
  return { curve, headlamp };
}
