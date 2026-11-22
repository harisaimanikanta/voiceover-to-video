# Feasibility test: path-traced (Cycles) cute original character in a night-office set lit like the reference.
import bpy, math, time, sys, random
from mathutils import Vector

W, H, SAMPLES = int(sys.argv[-3]), int(sys.argv[-2]), int(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
try: bpy.ops.preferences.addon_enable(module='cycles')
except Exception as e: print('cycles addon:', e)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6; sc.cycles.glossy_bounces = 3; sc.cycles.transparent_max_bounces = 4
sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.film_transparent = False
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'

def mat(name, color, rough=0.4, coat=0.0, metal=0.0, emit=None, emit_s=0.0, sss=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.05
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (1.0, 0.4, 0.25); b.inputs['Subsurface Scale'].default_value = 0.02
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = emit_s
    return m
def hexc(h): h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))
def obj(o, m, smooth=True):
    if m: o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o
def sphere(loc, r, m, scale=(1, 1, 1), seg=64):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc); o = bpy.context.object; o.scale = scale; return obj(o, m)
def rbox(loc, size, m, bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.object; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True); md = o.modifiers.new('b', 'BEVEL'); md.width = bevel; md.segments = 6; return obj(o, m)
def cyl(loc, r, d, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=d, location=loc, rotation=rot); o = bpy.context.object; return obj(o, m)


def area(loc, rot, size, color, power):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot); L = bpy.context.object; L.data.size = size; L.data.color = color; L.data.energy = power; return L
# ---------- DAYTIME test: bright soft daylight, satin (not glass) materials, an animated-character design with a pose
wood = mat('wood', hexc('#e8a04a'), rough=0.28, coat=0.45)
wallm = mat('wall', hexc('#2f7f86'), rough=0.85)
accent = mat('accent', hexc('#256870'), rough=0.85)
floorm = mat('floor', hexc('#9a5a30'), rough=0.3, coat=0.4)
skin = mat('skin', hexc('#f4b48a'), rough=0.42, coat=0.15, sss=0.3)
shirt = mat('shirt', hexc('#ff5a1f'), rough=0.5, coat=0.15)
pants = mat('pants', hexc('#1f48c8'), rough=0.55, coat=0.1)
hairm = mat('hair', hexc('#4a2c1c'), rough=0.4, coat=0.2)
white = mat('white', hexc('#f8f6f2'), rough=0.15, coat=0.6)
iris = mat('iris', hexc('#5a3a1e'), rough=0.1, coat=0.8)
pupil = mat('pupil', hexc('#0a0808'), rough=0.05, coat=1.0)
brow = mat('brow', hexc('#3a2216'), rough=0.6)
mouthm = mat('mouth', hexc('#8a2a32'), rough=0.4)
shoe = mat('shoe', hexc('#f4f4f4'), rough=0.3, coat=0.4)
leaf = mat('leaf', hexc('#5aa04a'), rough=0.45, coat=0.2)
pot = mat('pot', hexc('#d8744f'), rough=0.3, coat=0.5)
metal = mat('metal', hexc('#d0d4dc'), rough=0.2, metal=1.0)
screen = mat('screen', hexc('#e8f4ff'), rough=0.2, emit=hexc('#dff0ff'), emit_s=2.0)
# room: warm walls, a big window (sunlit), floor
rbox((0, 2.2, 1.6), (10, 0.1, 3.4), wallm)
rbox((-3.0, 0, 1.6), (0.1, 6, 3.4), accent)
bpy.ops.mesh.primitive_plane_add(size=1); f = bpy.context.object; f.scale = (12, 12, 1); f.data.materials.append(floorm)
# window opening in the back wall (frame + bright sky behind), sun coming through
for x in (0.9, 2.6): rbox((x, 2.13, 1.7), (0.08, 0.1, 1.8), white)
for z in (0.8, 2.6): rbox((1.75, 2.13, z), (1.78, 0.1, 0.08), white)
skyc = hexc('#bfe3ff'); bpy.ops.mesh.primitive_plane_add(size=1, location=(1.75, 2.3, 1.7), rotation=(math.pi / 2, 0, 0)); p = bpy.context.object; p.scale = (1.7, 1.8, 1); p.data.materials.append(mat('sky', skyc, emit=skyc, emit_s=3.0))
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True; bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*hexc('#dcecff'), 1); bg.inputs['Strength'].default_value = 0.22
# props: desk, laptop, plant, shelf
rbox((-0.9, 0.9, 0.74), (1.3, 0.6, 0.05), wood, 0.015)
for x in (-1.45, -0.35):
    for y in (0.7, 1.1): cyl((x, y, 0.37), 0.025, 0.74, wood)
rbox((-1.05, 0.9, 0.78), (0.4, 0.28, 0.02), metal, 0.008)
bpy.ops.mesh.primitive_plane_add(size=1, location=(-1.05, 1.03, 0.92), rotation=(math.radians(75), 0, 0)); s_ = bpy.context.object; s_.scale = (0.38, 0.25, 1); s_.data.materials.append(screen)
cyl((2.4, 1.3, 0.25), 0.18, 0.5, pot)
cyl((-1.3, 1.0, 0.78), 0.07, 0.02, metal); cyl((-1.3, 1.0, 0.97), 0.01, 0.38, metal); sphere((-1.3, 1.0, 1.15), 0.035, mat('bulbd', hexc('#ffffff'), emit=hexc('#ffb060'), emit_s=30))
for k in range(9):
    a = k / 9 * math.tau; sphere((2.4 + math.cos(a) * 0.12, 1.3 + math.sin(a) * 0.12, 0.75 + 0.1 * (k % 3)), 0.12, leaf, scale=(0.45, 0.45, 1.5), seg=24)
for i in range(4): rbox((-2.2 + i * 0.12, 2.05, 1.4 + (i % 2) * 0.02), (0.08, 0.2, 0.3), mat(f'book{i}', hexc(['#e8603c', '#3a7ca5', '#f2c14e', '#5fb36b'][i]), rough=0.5), 0.01)
rbox((-2.0, 2.05, 1.23), (0.9, 0.25, 0.04), wood, 0.01)

# character "Juno": an animated-cartoon actor (head about 1/3.5 of height), satin skin, real eyes, a waving pose
cx, cy = 0.2, 0.3
sphere((cx, cy, 1.02), 0.2, shirt, scale=(1, 0.8, 1.25))                                  # torso
cyl((cx, cy, 1.33), 0.06, 0.1, skin)                                                       # neck
for s_ in (-1, 1): cyl((cx + s_ * 0.09, cy, 0.5), 0.075, 0.6, pants); sphere((cx + s_ * 0.09, cy - 0.06, 0.06), 0.08, shoe, scale=(1, 1.6, 0.6))
# left arm relaxed, right arm waving (shoulder -> elbow -> hand)
def limb(a, b, r, m):
    a, b = Vector(a), Vector(b); d = b - a; c = (a + b) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r, depth=d.length, location=c); o = bpy.context.object
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized()); obj(o, m); sphere(tuple(b), r, m, seg=24); return o
limb((cx + 0.2, cy, 1.22), (cx + 0.24, cy - 0.02, 0.95), 0.055, shirt); limb((cx + 0.24, cy - 0.02, 0.95), (cx + 0.25, cy - 0.06, 0.72), 0.048, skin)
sphere((cx + 0.25, cy - 0.07, 0.66), 0.06, skin, scale=(0.8, 0.9, 1.1))                       # mitten hand
limb((cx - 0.2, cy, 1.22), (cx - 0.38, cy - 0.05, 1.32), 0.055, shirt); limb((cx - 0.38, cy - 0.05, 1.32), (cx - 0.42, cy - 0.08, 1.58), 0.048, skin)
sphere((cx - 0.43, cy - 0.09, 1.65), 0.065, skin, scale=(0.85, 0.7, 1.1)); sphere((cx - 0.37, cy - 0.11, 1.62), 0.025, skin)  # waving mitten + thumb
# head
H0 = (cx, cy - 0.01, 1.62); sphere(H0, 0.25, skin, scale=(1, 0.96, 1.0))
for s_ in (-1, 1): sphere((cx + s_ * 0.245, cy + 0.02, 1.6), 0.06, skin, scale=(0.5, 0.8, 1.0))      # ears
sphere((cx, cy - 0.255, 1.585), 0.035, skin)                                                          # nose
for s_ in (-1, 1):
    e = (cx + s_ * 0.095, cy - 0.2, 1.655); sphere(e, 0.068, white, scale=(0.9, 0.7, 1.12))
    sphere((e[0], e[1] - 0.042, e[2] - 0.005), 0.038, iris, scale=(1, 0.45, 1.1)); sphere((e[0], e[1] - 0.056, e[2] - 0.005), 0.02, pupil, scale=(1, 0.4, 1.1))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.05, minor_radius=0.011, location=(e[0], e[1] - 0.02, e[2] + 0.1), rotation=(math.radians(80), 0, 0)); obj(bpy.context.object, brow).scale = (1, 1, 0.5)
bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.014, location=(cx, cy - 0.235, 1.52), rotation=(math.radians(75), 0, 0)); m_ = bpy.context.object; obj(m_, mouthm); m_.scale = (1, 1, 0.6)
for s_ in (-1, 1): sphere((cx + s_ * 0.165, cy - 0.17, 1.55), 0.035, mat('cheek', hexc('#ff9a9a'), rough=0.5), scale=(1, 0.3, 0.7))
for k, (dx, dz, r) in enumerate([(0, 0.2, 0.17), (-0.13, 0.15, 0.13), (0.13, 0.15, 0.13), (0.07, 0.22, 0.12), (-0.08, 0.23, 0.11), (0.0, 0.12, 0.2)]):
    sphere((cx + dx, cy + 0.03 - (0.05 if k < 3 else 0), 1.62 + dz), r, hairm, scale=(1, 1, 0.75))

# LIGHTS: bright daylight. Sun through the window (soft shadows), a big soft window area light, a warm fill, sky ambient
bpy.ops.object.light_add(type='SUN', location=(-3, -2, 4)); sun = bpy.context.object
sun.rotation_euler = Vector((-1.0, -0.55, 0.75)).to_track_quat('Z', 'Y').to_euler(); sun.data.energy = 6.0; sun.data.angle = math.radians(2.5); sun.data.color = hexc('#ffd9a8')
area((2.4, -2.0, 1.8), (math.radians(70), 0, math.radians(50)), 2.0, hexc('#9fc8ff'), 70)            # cool bounce/fill (weak)
bpy.ops.object.light_add(type='POINT', location=(-1.3, 1.0, 1.15)); L = bpy.context.object; L.data.energy = 30; L.data.color = hexc('#ffb060'); L.data.shadow_soft_size = 0.05   # desk practical
bpy.ops.object.camera_add(location=(0.55, -3.3, 1.42), rotation=(math.radians(89), 0, math.radians(6)))
cam = bpy.context.object; sc.camera = cam; cam.data.lens = 50; cam.data.dof.use_dof = True; cam.data.dof.focus_distance = 3.55; cam.data.dof.aperture_fstop = 4.0
sc.view_settings.look = 'AgX - Punchy'
t0 = time.time(); sc.render.filepath = sys.argv[-4]; bpy.ops.render.render(write_still=True); print(f'RENDER_TIME {time.time() - t0:.1f}s at {W}x{H} {SAMPLES} spp')
