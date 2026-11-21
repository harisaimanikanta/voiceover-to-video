# Kit API (`import { … } from 'kit'`)

Scene module contract (see `templates/scene-template.js`):
```js
export const duration = 40, fps = 30;
export const captions = captionsFromLines([{ t: 0.2, text: '…' }, …]);   // or [] / custom [{t0,t1,text}]
export const captionStyle = { y: 0.66, size: 0.062 };                     // optional; { off: true } to hide
export async function setup({ THREE, canvas, width, height }) { …; return { render(t) { … } }; }
```

| Function | What |
|---|---|
| `clamp, lerp, smooth, easeIn, easeOut, easeInOut, prog(t,a,b), rng(seed)` | Timing and maths. `prog` = 0..1 progress of t through [a,b]. Use a seeded `rng`, never `Math.random`. |
| `timeline([{name,start,end}])` → `.at(t)` = `{name, local, p}` | Shot list lookup |
| `captionsFromLines(lines)` | Narration lines → 1–3-word timed captions |
| `makeRenderer(canvas,w,h)` | WebGL renderer (ACES, sRGB, soft shadows, preserveDrawingBuffer) |
| `studio(scene, {sky, ground, groundSize})` | Bright explainer set: flat sky, ground disc, key light with shadows |
| `makeCharacter({shirt, pants, skin, hair, shoes, style:'cartoon'|'plain'})` | Posable stylised human (~1.8 m). `.joints` (pelvis, chest, neck, head, shoulderL/R, elbowL/R, hipL/R, kneeL/R), `.idle(t)`, `.setOpacity(a)` (x-ray), `.segments()` (limb lines for vessel networks) |
| `makeVessels(segments, origin, {seed, branches, depth, color})` | Branching tube network grown from `origin`; `.setGrow(0..1)`. Also works as roots, cracks, lightning, rivers |
| `growLine(points, {radius, color, segments, tip})` | Tube that draws itself: `.setProgress(p)`, `.tipAt(p)`, `.tangentAt(p)` (chase cameras) |
| `footballFieldTexture()` | Scale-reference prop texture |
| `loadWorld('110m'|'50m'|'10m')` | Country polygons (world-atlas) |
| `mapTexture(world, {lon0,lon1,lat0,lat1,w,h,ocean,palette})` | Stylised equirectangular map texture (whole world or a region) |
| `makeGlobe(texture, r)` → `{group, lonLat(lon,lat,alt)}` | Earth with atmosphere glow |
| `makeFlatMap(texture, bounds)` → `{mesh, lonLat(lon,lat,y)}` | Flat regional map on the ground plane |
| `stars(n, radius)`, `label(text,{size})`, `canvasTexture(w,h,draw)`, `aim(camera,pos,target,fov)` | Space backdrop, map pins / number tags, custom textures, camera placement |

## Recipes
- **Peel-out / reveal:** build the hidden thing at the subject, `setGrow` 0→1, then slide it out with `easeInOut`.
- **Scale ladder:** one continuous `growLine` across bigger and bigger sets (field → city map → globe → space); a chase camera via `tipAt`/`tangentAt`; cut on the narration's new unit.
- **X-ray:** `char.setOpacity(0.18)` with the network visible inside.
- **Top-down on 9:16:** blend `camera.up` toward the long axis of the subject so it runs vertically; raise near-plane or offset planes to avoid z-fighting.
- **Comedy beats:** quick pose snaps (`shoulder.rotation.z`, `elbow.rotation.x`), a hold, then a cut.

## Limits (be honest with the user)
- Characters are stylised primitives, not photoreal humans. For realistic humans use Blender (+ a Blender MCP server) or a game engine on the user's machine, or AI video generators per shot.
- External 3D models (.glb) work if the user supplies them (put them next to the scene; load with `GLTFLoader` from `three/addons/loaders/GLTFLoader.js`, URL `/scene/<file>.glb`).
- Rendering runs on the CPU in cloud sessions: keep geometry moderate (< ~1M triangles visible) and use `--preview` while iterating.

## Realism layer (v2)
| Function | What |
|---|---|
| `useHDRI(renderer, scene, name, {intensity, background, blur, rotation})` | Real-world image-based lighting + reflections from `@pmndrs/assets` (CC0): apartment, bridge, city, dawn, esplanade, forest, hall, lab, lobby, night, park, sky, studio, sunrise, sunset, venice, warehouse, workshop |
| `makePost(renderer, w, h, {ao, bloom, dof, grain, vignette})` → `.render(scene, camera, t, {focus, aperture})` | GTAO contact shadows → NaN-sanitize → bloom → depth of field → tone mapping → film grain + vignette. Use instead of `renderer.render`. Typical close-up: `aperture 0.003–0.006`, `focus` = distance to subject |
| `import { makeHuman } from '/kit/human.js'` | Realistic-proportion human (mannequin-js body, GPL-3.0 npm dep) with skin/fabric/leather physical materials, eyes, brows, nose, ears, mouth, hair (`short`/`side`/`bald`/`none`), glasses, moustache, lab coat, tie. Pose in degrees via `h.m.<joint>.<prop>`: `l_arm.raise/straddle/turn`, `l_elbow.bend`, `l_wrist.bend`, `l_fingers.bend`, `torso.bend/turn/tilt`, `head.nod/turn/tilt`, `l_leg.raise/straddle`, `l_knee.bend`. `h.rest()`, `h.idle(t)`, `h.face('neutral'|'o'|'frown'|'smile')`, `h.setOpacity(a)`. Hand position: `h.m.r_wrist.localToWorld(new THREE.Vector3())` |

Gotchas learned the hard way:
- Never parent the camera to a scene (stale camera matrices in other scenes). Put overlays such as eyepiece masks in world space, in front of the camera.
- mannequin-js overrides `attach()`: use `THREE.Object3D.prototype.attach.call(joint, mesh)`. The render server patches its demo stage out on the fly.
- Render cost with the realism layer: ~2.5 s/frame at 1080×1920 on CPU. Render long videos in parallel chunks (`--from/--to`), then `ffmpeg -f concat` and mux the voiceover.

## v3 cartoon look (the default style): `/kit/look.js`, `/kit/toon.js`, `/kit/props.js`
Reference scene: `example/cartoon/scene.js` (+ `TREATMENT.md`, `storyboard/storyboard-01.png`, `demo.mp4`). Copy its structure.

| Function | What |
|---|---|
| `mood(scene, 'day'|'golden'|'interior'|'night'|'lab'|'drama'|'dream'|'sick')` → `{key, fill, rim, hemi, sky, focus(v,size)}` | Whole lighting rig per mood: warm key with soft shadows, cool fill, coloured rim, hemisphere, gradient sky dome, fog haze. Call `focus()` on the subject. |
| `faceRig(scene, toon)` → `.update(camera)` every frame | Soft face key, silhouette rim and eye catchlight that follow the head relative to the camera. Use on every on-screen character. |
| `soft(color, 'plastic'|'clay'|'fabric'|'skin'|'wood'|'paper'|'metal'|'rubber'|'ceramic'|'glass', overrides)` | Physical material with micro-surface normal map. Never use bare MeshStandardMaterial. |
| `roundBox(w,h,d,mat,r)`, `lathe([[r,y]…],mat)`, `tubeR(points, radius(u), mat, {closed})` | Rounded geometry: bevelled boxes, turned objects, tapered tubes. |
| `practical(color, intensity, distance, {shape:'bulb'|'panel'})` | Visible light source (lamp bulb, ceiling panel, screen): emissive mesh plus a real light. |
| `skyDome({top, horizon, bottom, sunDir})`, `detailNormal(kind)` | Sky gradient with a sun glow; tileable normal maps. |
| `makeToon({skin, shirt, pants, shoes, hair, hairStyle:'tuft'|'side'|'spiky'|'bob'|'long'|'bun'|'curly'|'bald'|'none', eye, coat, tie, glasses, moustache, lips, brows, build, headScale, shape:{jaw,cranium,nose,cheeks,chin}})` | Sculpted cartoon character: one-piece head, glossy eyes with irises and lids, brows, lips/teeth/tongue, 3-finger hands, tapered limbs. |
| `toon.face(emotion, {k, from, talk})` | 14 emotions: `neutral happy joy sad angry surprised scared disgust thinking smug worried sick proud embarrassed` (plus legacy smile/grin/frown/flat/o). `k` blends from `from`; `talk` (0..1) opens the jaw. Also accepts a params object `{bi,bm,bo,ul,ll,lt,sm,op,wd,pk,ch,teeth,tg,as,bl,gaze}`. |
| `speech(t, words)` | Lip-sync openness from `align.py` words.json → `face(e, {talk: speech(t, words)})`. |
| `toon.posture(emotion,k)`, `.look(x,y)` / `.look(null)`, `.blink(k)`, `.grip(side,k)`, `.idle(t)` (auto-blinks), `.walkDist(m)`, `.reach(side, worldPoint)`, `.hold(obj, side)` | Body language, gaze, blinks, finger curl, breathing, distance-driven walk, IK, props. |
| `cozyRoom(scene)`, `lab(scene)`, `street(scene)` | Fully dressed sets in one call (floors, walls, windows with light, shelves of books, plants, lamps, rugs, pictures; benches, glowing flasks, microscope; houses, trees, bushes, clouds). |
| `bookshelf, plant, deskLamp, desk, mug, pictureFrame, windowFrame, clock, rug, tree, bush, cloud, house, flask, microscope, plankTexture, wallTexture` | Individual rounded props to dress your own sets. |

Order every frame: `rest()` → `posture()` → `idle(t)` → `face()` → `reach()`/`grip()` → camera → `faceRig.update(cam)` → `post.render`.
Acting rule: every narration line gets an emotion that changes on the meaning (blend 0.3–0.4 s), lip-sync while the character speaks, eyes look at what matters, and hands do something.
