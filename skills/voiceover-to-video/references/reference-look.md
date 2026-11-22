# Reference look: "night office" 3D toy short (frame-by-frame analysis)

Source: the user's reference reel (31 s, 1080×1920, 30 fps; a host and a box-robot assistant at a desk at night). It looks real
because of **lighting, materials, lens and editing discipline**, not because of glow. Test scene: `example/look-test.js`.
Comparison: `references/img/reference-look-test.jpg` (our old look, our character with this recipe, the reel, our close-up).

## Lighting (the biggest difference)
| Element | Reel | Our old look | Do this |
|---|---|---|---|
| Overall key | Low-key night interior: most of the frame is dark blue | High-key, everything evenly bright | `hemi` ≤ 0.25, dark blue; let shadows fall into blue darkness |
| Key light | One warm practical (desk lamp, upper left) motivates all warm light: warm on the face's lamp side, a long warm specular streak on the desk | Generic directional sun + mood fill | A SpotLight placed at the visible lamp (penumbra 1, warm #ffc98a, ~6–8), aimed at the face, with shadows |
| Fill | Cool screen glow (laptop) from low front; very weak | Bright cool fill | A small PointLight at the screen (#bcd8ff, ~1) |
| Rim / separation | Cool blue rim from the city window behind | Coloured rim, too strong | A directional from behind (#7fa8ff, ~2), no shadows |
| Colour contrast | Warm skin and wood against blue night (teal–orange) | Saturated everything | sat ≈ 1.0, contrast 1.08; the warm/cool contrast does the work |
| Bounce | A faint warm bounce from the desk onto hands and chin | none | A weak warm PointLight under the face (~0.5) |

## Shadows
- Every object is grounded by **soft contact shadows** (the robot's feet, hands on the desk). No hard edges, no floating objects.
- Do: `renderer.shadowMap.type = VSMShadowMap`, `shadow.radius 8–10`, `blurSamples 20`, map size 2048; **GTAO on** (`makePost({ao: true})`)
  for contact darkening in hair, hands and under objects. Our old renders had AO off, which is why objects looked pasted on.

## Reflections and specular
- **The desk** is the hero reflector: glossy, dark wood (roughness ~0.3, clearcoat 0.6) with a long warm highlight from the lamp. That
  one highlight sells "real material".
- **Eyes:** big white sclera, dark iris, **one** crisp round catchlight, consistent with the key in every shot. No glow.
- **Glasses:** thick glossy black frames; the lenses are effectively invisible (no glare cards). Specular on the frame only.
- **Skin and clothes:** satin vinyl (roughness ~0.5), never shiny. The hair is matte clay with fine fibres, with micro-shadowing in the curls (AO).
- **The laptop screen** is the second practical: content readable, it lights the keyboard and hands.

## Environment and placement
- One set for the whole film: desk in the foreground (occupying the lower third), characters behind it, a big window with a night city behind them.
- **Depth layering:** foreground desk edge → subject → props (lamp, plant, books, laptop) → window frame → city bokeh. Every shot has 3–4 layers.
- **The background is defocused:** city lights become soft discs (long lens + strong DoF: `aperture 0.02–0.03`, `maxblur 0.03`).
- **Long lenses:** 16–26° FOV from 3–4 m. No wide-angle distortion, toy-like compression.
- **The desk front is solid** and hides the lower body (sitting characters), so nobody floats.
- **Characters keep fixed screen positions** (host left/centre, robot right) and eyelines match across cuts (180° rule).
- **Toy proportions:** big head (≈ 1.3× ours), chunky hands, short body. Reads as a miniature, so realism is believable.

## Editing and storyboard (why it is so easy to follow)
- **About 20 shots in 31 s, every one a clear, static or slow-push composition.** Hard cuts on each line of dialogue:
  shot/reverse-shot between speakers, and **insert shots of the laptop** whenever a fact appears ("40 ready for review", the calendar filling up).
- **The speaker is always on screen when talking; facts are always shown on an object (screen, paper), never only spoken.**
- **Captions:** one sentence, top-centre, white bold with a soft shadow; no other text clutter.
- No flythroughs, no portals, no spinning cameras: **the camera never draws attention to itself.**

## What to change in this skill (proposal, pending the user's OK)
1. **Mood preset `night-practical`:** a low hemisphere, a lamp key spot with VSM soft shadows, a screen fill, a window rim, a warm bounce. AO on by default.
2. **Lens rules:** default FOV 20–28° for characters, 30–40° only for establishing shots. DoF on every character shot (`maxblur` is now adjustable).
3. **Materials:** a hero glossy reflector per set (desk, floor, table). Eyes keep a single catchlight; glasses frames thicker and glossier.
4. **Editing:** allow motivated **cuts** (shot/reverse-shot plus insert shots for facts). The one-take/portal rule is good for spectacle but
   hurts comprehension, and the reel proves that clean cuts read faster. Keep continuity rules: 180° line, matching eyelines, stable screen positions.
5. **Storyboard:** for every line, choose (a) the speaker shot, or (b) an insert that shows the fact, or (c) an establishing shot.
   One subject per frame; the fact must be visible on an object or a title.
