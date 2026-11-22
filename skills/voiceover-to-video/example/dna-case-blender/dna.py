# "Caught by His Cousins' DNA" - v4 (Blender). Night look for night scenes, day sunbeam look for day scenes.
# Clarity-first storyboard with clean cuts: every line shows its subject; facts appear on objects and as titles (added in post).
# Usage (Blender):  blender -b -P dna.py -- [--stills t1,t2,...] [--render] [--engine EEVEE|CYCLES] [--res 1080x1920] [--out frames/]
import sys, os, math, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=False)
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
from bkit import *

HERE = os.path.dirname(os.path.abspath(__file__)); TEX = os.path.join(HERE, 'tex')
WORDS = json.load(open(os.path.join(HERE, 'words.json')))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(n, d=None): return argv[argv.index(n) + 1] if n in argv else d
RES = tuple(int(x) for x in arg('--res', '1080x1920').split('x'))
V = Vector
S = {}   # scene name -> (scene, collection, [(t0, t1)])
SET = arg('--set', 'host')
def scene(name, ranges):
    sc = bpy.context.scene; sc.name = name; sc.frame_start, sc.frame_end = F(ranges[0][0]), F(ranges[-1][1]); sc.render.fps = FPS
    sc.render.resolution_x, sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    w = bpy.data.worlds.new(name + '_world'); sc.world = w; w.use_nodes = True
    S[name] = (sc, sc.collection, ranges); return sc, sc.collection

# ---------------------------------------------------------------- shared props
WOOD = mat('wood', '#6a3a22', 0.22, 0.6); WOOD_L = mat('woodl', '#e8a04a', 0.28, 0.45); METAL = mat('metal', '#c8ccd4', 0.2, metal=1.0)
def desk(C, loc, w=1.8, d=0.8, h=0.76, m=WOOD, front=True):
    x, y, z = loc; box(C, (x, y, h), (w, d, 0.05), m, 0.015)
    if front: box(C, (x, y - d / 2 + 0.03, h / 2), (w, 0.05, h), m, 0.015)
    else:
        for dx in (-w / 2 + 0.06, w / 2 - 0.06):
            for dy in (-d / 2 + 0.06, d / 2 - 0.06): box(C, (x + dx, y + dy, h / 2), (0.06, 0.06, h), m, 0.01)
def desk_lamp(C, loc, color='#2f8f8a', on=True):
    x, y, z = loc; lm = mat('lamp' + color, color, 0.2, 0.8)
    cyl(C, (x, y, z + 0.01), 0.1, 0.03, lm); cyl(C, (x, y, z + 0.25), 0.012, 0.5, lm)
    cyl(C, (x + 0.12, y, z + 0.5), 0.15, 0.18, lm, rot=(0, math.radians(-60), 0), r2=0.04)
    return sphere(C, (x + 0.17, y, z + 0.44), 0.04, mat('bulb', '#ffffff', emit='#ffc070', emit_s=40 if on else 0), seg=24)
def laptop(C, loc, rotz, screen_m):
    x, y, z = loc; b = box(C, (x, y, z + 0.01), (0.42, 0.3, 0.02), METAL, 0.008, rot=(0, 0, rotz))
    s = plane(C, (x + 0.14 * math.sin(rotz), y + 0.14 * math.cos(rotz), z + 0.15), (0.39, 0.25), screen_m, rot=(math.radians(100), 0, rotz)); return s
def plant(C, loc, h=0.45):
    x, y, z = loc; pot = mat('pot', '#d8744f', 0.3, 0.5); leaf = mat('leaf', '#5aa04a', 0.45, 0.2)
    cyl(C, (x, y, z + h * 0.18), h * 0.2, h * 0.36, pot)
    for k in range(8): a = k / 8 * math.tau; sphere(C, (x + math.cos(a) * h * 0.14, y + math.sin(a) * h * 0.14, z + h * 0.55 + 0.05 * (k % 3)), h * 0.16, leaf, (0.45, 0.45, 1.5), seg=20)
def room(C, wall='#2f7f86', floor='#9a5a30', w=8, d=6, h=3.2, back_y=2.2, hole=None):
    wm = mat('wall' + wall, wall, 0.85)
    if hole:   # (x0, x1, z0, z1): build the back wall around a window opening
        x0, x1, z0, z1 = hole
        box(C, ((-w / 2 + x0) / 2, back_y, h / 2), (x0 + w / 2, 0.1, h), wm, 0); box(C, ((x1 + w / 2) / 2, back_y, h / 2), (w / 2 - x1, 0.1, h), wm, 0)
        box(C, ((x0 + x1) / 2, back_y, z0 / 2), (x1 - x0, 0.1, z0), wm, 0); box(C, ((x0 + x1) / 2, back_y, (z1 + h) / 2), (x1 - x0, 0.1, h - z1), wm, 0)
    else: box(C, (0, back_y, h / 2), (w, 0.1, h), wm, 0)
    for x in (-w / 2, w / 2): box(C, (x, back_y - d / 2, h / 2), (0.1, d, h), mat('wall' + wall, wall, 0.85), 0)
    plane(C, (0, 0, 0), (w + 2, d + 6), mat('floor' + floor, floor, 0.3, 0.4))
def night_window(C, x0, x1, z0, z1, y):
    fr = mat('frame', '#0d1018', 0.3, metal=0.6)
    for x in [x0 + (x1 - x0) * k / 3 for k in range(4)]: box(C, (x, y - 0.03, (z0 + z1) / 2), (0.07, 0.1, z1 - z0), fr, 0.01)
    for z in (z0, z1): box(C, ((x0 + x1) / 2, y - 0.03, z), (x1 - x0, 0.1, 0.07), fr, 0.01)
    plane(C, ((x0 + x1) / 2, y + 6, (z0 + z1) / 2 + 0.6), (16, 8), image_mat('city', os.path.join(TEX, 'city.png'), emit_s=1.6), rot=(math.pi / 2, 0, 0))
def board(C, loc, size, img, frame='#5a3a22'):
    x, y, z = loc; box(C, (x, y + 0.02, z), (size[0] + 0.08, 0.04, size[1] + 0.08), mat('bframe' + frame, frame, 0.4), 0.01)
    return plane(C, (x, y - 0.005, z), size, image_mat('img_' + os.path.basename(img), img, rough=0.6), rot=(math.pi / 2, 0, 0))
def kit_box(C):
    o = box(C, (0, 0, 0), (0.15, 0.06, 0.22), mat('kit', '#2fb8b0', 0.25, 0.7), 0.015, name='dnakit')
    t = text(C, 'DNA', (0, -0.035, 0.02), 0.06, mat('kittxt', '#ffffff', 0.3, emit='#ffffff', emit_s=0.5), name='kittxt'); t.parent = o
    t2 = text(C, 'ANCESTRY KIT', (0, -0.035, -0.04), 0.018, mat('kittxt', '#ffffff', 0.3, emit='#ffffff', emit_s=0.5), name='kittxt2'); t2.parent = o
    return o
def house(C, loc, wall='#c8b8e8', roof='#5a4a7a', rotz=0.0, lit=False):
    x, y, z = loc; b = box(C, (x, y, 1.4), (3.4, 3.4, 2.8), mat('house' + wall, wall, 0.6), 0.08, rot=(0, 0, rotz))
    cyl(C, (x, y, 3.3), 2.6, 1.6, mat('roof' + roof, roof, 0.5), rot=(0, 0, math.pi / 4 + rotz), verts=4, r2=0.01)
    wm = mat('hwin' + str(lit), '#ffd890' if lit else '#1a2638', 0.2, emit='#ffc870' if lit else None, emit_s=3 if lit else 0)
    for dx in (-0.8, 0.8): plane(C, (x + dx * math.cos(rotz), y - 1.71, 1.7), (0.6, 0.6), wm, rot=(math.pi / 2, 0, rotz))
    box(C, (x, y - 1.72, 0.65), (0.7, 0.06, 1.3), mat('door', '#7a4a30', 0.4), 0.02)
def tree(C, loc, h=3.0):
    x, y, z = loc; cyl(C, (x, y, h * 0.3), 0.12, h * 0.6, mat('trunk', '#7a4a2c', 0.6))
    for k, (dx, dy, dz, r) in enumerate([(0, 0, 0.75, 0.32), (0.25, 0.1, 0.65, 0.24), (-0.25, -0.1, 0.68, 0.25), (0.05, 0.2, 0.9, 0.2)]): sphere(C, (x + dx * h, y + dy * h, dz * h), r * h, mat('leafT', '#4f9a48', 0.5, 0.1), seg=24)
def car(C, loc, color='#d98b3a', rotz=0.0, police=False, rig=False, see_through=False):
    """rig=True: all parts parented to an empty at (x, y, 0), returned so the car can be driven. see_through: windows show who is inside."""
    x, y, z = loc; body = mat('car' + color, color, 0.25, 0.8); dark = mat('tyre', '#1d2230', 0.7)
    glass = mat('cglass_st', '#bfe0f4', 0.05, 0.6, alpha=0.3) if see_through else mat('cglass', '#9fc8e8', 0.08, 1.0)
    c = math.cos(rotz); s_ = math.sin(rotz)
    def P(dx, dy, dz): return (x + dx * c - dy * s_, y + dx * s_ + dy * c, dz)
    parts = [box(C, P(0, 0, 0.62), (1.8, 4.2, 0.55), body, 0.15, rot=(0, 0, rotz)), box(C, P(0, 0.2, 1.1), (1.6, 2.1, 0.5), glass, 0.15, rot=(0, 0, rotz))]
    for dx in (-0.86, 0.86):
        for dy in (-1.35, 1.35): parts.append(cyl(C, P(dx, dy, 0.34), 0.34, 0.26, dark, rot=(0, math.pi / 2, rotz)))
    if rig:
        root = bpy.data.objects.new('carrig', None); root.location = (x, y, 0); root.rotation_euler = (0, 0, rotz); C.objects.link(root); bpy.context.view_layer.update()
        for o in parts: mw = o.matrix_world.copy(); o.parent = root; o.matrix_parent_inverse = root.matrix_world.inverted(); o.matrix_world = mw
        return root
    if police:
        r = box(C, P(-0.3, 0.2, 1.42), (0.5, 0.22, 0.12), mat('pred', '#ff2a2a', 0.3, emit='#ff2020', emit_s=8), 0.04, rot=(0, 0, rotz))
        b = box(C, P(0.3, 0.2, 1.42), (0.5, 0.22, 0.12), mat('pblue', '#2a6aff', 0.3, emit='#2050ff', emit_s=8), 0.04, rot=(0, 0, rotz)); return r, b

# ================================================================ 1. HOST (night office)  0-10.63 and 96.5-103.81
if SET == 'host':
    sc, C = scene('host', [(0, 10.63), (96.5, 103.81)])
    room(C, '#1c2432', '#3a2416', back_y=2.2, hole=(-1.2, 2.4, 0.9, 2.9)); night_window(C, -1.2, 2.4, 0.9, 2.9, 2.2)
    desk(C, (0, -0.15, 0)); desk_lamp(C, (-0.85, -0.05, 0.785)); plant(C, (0.8, 0.05, 0.785))
    lap_scr = laptop(C, (-0.45, -0.25, 0.785), math.radians(20), mat('lapscreen', '#0a1020', 0.2, emit='#9fd0ff', emit_s=4))
    cyl(C, (0.45, -0.4, 0.83), 0.045, 0.1, mat('mug', '#e8503c', 0.12, 0.9))
    cork = board(C, (-2.2, 2.13, 1.75), (1.4, 1.0), os.path.join(TEX, 'coldcase.png'))
    cork.scale = (1.0, 0.24, 1); cork.location.z = 2.32   # header as wide as the board (was 1.96 m wide and always cropped)
    cb = plane(C, (-2.2, 2.12, 1.62), (1.4, 0.75), mat('cork', '#c8975e', 0.85), rot=(math.pi / 2, 0, 0))
    wanted = board(C, (-2.6, 2.09, 1.62), (0.45, 0.6), os.path.join(TEX, 'wanted.png'), '#f3e6c4')
    cous = [board(C, (-2.05 + (i % 2) * 0.32, 2.09, 1.78 - (i // 2) * 0.38), (0.26, 0.32), os.path.join(TEX, f'cousin{i}.png'), '#fbf8f0') for i in range(4)]
    string = mat('string', '#d81e1e', 0.6)
    for i in range(4): capsule(C, (-2.45, 2.07, 1.75), (-2.05 + (i % 2) * 0.32, 2.07, 1.78 - (i // 2) * 0.38), 0.006, string, 'str')
    look_night(sc, C, (-0.68, -0.05, 1.23), (0, 0.35, 1.3))
    spot(C, (-2.2, 1.2, 2.9), (-2.2, 2.1, 1.65), '#ffe2b8', 220, 60, 0.7, 0.1)   # picture light on the cork board
    dan = Character(C, 'dan', (0, 0.4, -0.12), 0, shirt='#2f8f8a', pants='#3a3f52', hair='#5a3420', hair_style='side', skin='#f1b48c')
    KIT = kit_box(C)
    def host_track(t0, t1, emos):
        dan.rest(F(t0)); dan.blinks(t0, t1)
        for t, e in emos: dan.emote(F(t), e)
        dan.talk(WORDS, t0, t1)
    host_track(0, 10.63, [(0.2, 'calm'), (4.1, 'smug'), (7.7, 'thinking'), (9.2, 'surprised')])
    host_track(96.5, 103.81, [(96.6, 'calm'), (97.6, 'sad'), (99.0, 'smug'), (100.4, 'determined')])
    # kit: rests on the desk, Dan lifts it with both mittens to show the camera (7.7-10.6 and 96.6-103.8); hands rest on the desk otherwise.
    # Every hand target stays within arm's reach (~0.45 m from the shoulder at (+-0.2, 0.4, 1.1)); the old targets were 0.65-0.95 m away, so the IK
    # stopped short and the mittens floated beside the kit / above the desk.
    DESK_L, DESK_R = V((0.12, 0.08, 0.86)), V((-0.2, 0.08, 0.86)); KREST = V((0.3, 0.1, 0.925)); SHOW = V((0.0, 0.02, 1.11))
    GL, GR = V((0.105, 0, -0.02)), V((-0.105, 0, -0.02))   # mitten centres pressed against the kit's sides
    POINT = V((-0.2, -0.15, 1.17))   # beyond reach on purpose: the arm straightens and points at the viewer
    for t, side, p in [(0, 'L', DESK_L), (0, 'R', DESK_R), (7.55, 'L', DESK_L), (7.95, 'L', KREST + GL), (8.6, 'L', SHOW + GL), (10.63, 'L', SHOW + GL),
                       (7.95, 'R', DESK_R), (8.6, 'R', SHOW + GR), (10.63, 'R', SHOW + GR),
                       (96.5, 'L', SHOW + GL), (103.81, 'L', SHOW + GL), (96.5, 'R', SHOW + GR), (100.6, 'R', SHOW + GR), (101.2, 'R', POINT), (103.81, 'R', POINT),
                       (4.2, 'R', DESK_R), (7.4, 'R', DESK_R)]:
        dan.hand(side, F(t), p, 1)
    for t, p in [(0, KREST), (7.95, KREST), (8.6, SHOW), (10.63, SHOW), (96.5, SHOW), (103.81, SHOW)]: key(KIT, 'location', F(t), p)
    for i, c in enumerate(cous):   # cousin photos pop onto the board on "cousins"
        s0 = c.scale.copy(); key(c, 'scale', 1, s0 * 0.001); key(c, 'scale', F(4.3 + i * 0.25), s0 * 0.001); key(c, 'scale', F(4.6 + i * 0.25), s0)
    shot(sc, C, 'h1', 0, [(0, (0.25, -3.4, 1.3), (0, 0.3, 1.25)), (3.9, (0.22, -3.0, 1.32), (0, 0.3, 1.28))], lens=55, fstop=2.8)
    # cork board: far enough back that the whole board incl. the COLD CASE header fits the 9:16 frame (was cropped at 2 m)
    shot(sc, C, 'h2', 4.0, [(4.0, (-2.2, -1.15, 1.9), (-2.2, 2.1, 1.88)), (7.6, (-2.2, -0.9, 1.88), (-2.2, 2.1, 1.86))], lens=40, fstop=5.6)
    shot(sc, C, 'h3', 7.65, [(7.65, (0.15, -2.4, 1.32), (0.05, 0.25, 1.2)), (10.63, (0.1, -1.9, 1.3), (0.02, 0.2, 1.25))], lens=55, fstop=4)
    shot(sc, C, 'h4', 96.5, [(96.5, (0.25, -2.6, 1.32), (0.02, 0.3, 1.25)), (98.9, (0.25, -2.4, 1.32), (0.02, 0.3, 1.25))], lens=50, fstop=2.8)
    shot(sc, C, 'h5', 99.0, [(99.0, (-2.2, -1.05, 1.88), (-2.2, 2.1, 1.86)), (100.25, (-2.2, -0.85, 1.88), (-2.2, 2.1, 1.86))], lens=40, fstop=5.6)
    shot(sc, C, 'h6', 100.3, [(100.3, (0.1, -3.2, 1.3), (0.02, 0.3, 1.25)), (103.81, (0.05, -2.3, 1.36), (0.02, 0.3, 1.32))], lens=55, fstop=2.8)

# ================================================================ 2. 1970s STREET (night)  10.63-16.9
if SET == 'street':
    sc, C = scene('street', [(10.63, 16.9)])
    plane(C, (0, 0, 0), (60, 60), mat('grass', '#2a4a2a', 0.8)); plane(C, (0, 0, 0.005), (4, 60), mat('road', '#2a2c34', 0.6))
    for x in (-2.8, 2.8): box(C, (x, 0, 0.06), (1.6, 60, 0.12), mat('pave', '#6a6660', 0.7), 0.03)
    for i, (x, y, w, r, lit) in enumerate([(7, -8, '#c8b8e8', '#5a4a7a', True), (7, 0, '#e8d0a0', '#7a4a3a', False), (7, 8, '#b8d8c8', '#3a5a6a', True),
                                             (-7, -6, '#e8c8c0', '#6a3a3a', False), (-7, 4, '#c8d8e8', '#3a4a6a', True)]):
        house(C, (x, y, 0), w, r, rotz=(math.pi / 2 if x > 0 else -math.pi / 2), lit=lit)
    for (x, y) in [(4.6, -4), (4.6, 4), (-4.6, 0), (-4.6, 9)]: tree(C, (x, y, 0), 3.2)
    for y in (-10, 0, 10):
        cyl(C, (2.4, y, 2.0), 0.06, 4.0, mat('pole', '#2a3040', 0.4, metal=0.5)); sphere(C, (2.2, y, 3.95), 0.12, mat('sl', '#ffffff', emit='#ffcf8a', emit_s=30), seg=16)
        point(C, (2.2, y, 3.8), '#ffcf8a', 1000, 0.15)
    for y in [k * 0.35 for k in range(-28, 28)]: box(C, (3.75, y, 0.4), (0.08, 0.12, 0.8), mat('fence', '#e8e0d0', 0.6), 0.02)
    car(C, (1.0, 6, 0), '#d98b3a'); car(C, (-1.1, -9, 0), '#4f8a6a', math.pi)
    bg = sc.world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*hexc('#0b1430'), 1); bg.inputs['Strength'].default_value = 1.2
    sun(C, (0.3, 0.6, -0.7), '#9fb8ff', 4.0, 1.0)   # brighter moon: the street read almost black in the preview
    area(C, (0, -6, 8), (2, 2, 0), 12, '#7f9cff', 3000, 'moonfill', shadow=False)
    villain = Character(C, 'villain', (2.9, 8, 0), math.pi, skin='#1a1d26', shirt='#14161c', pants='#1a1c22', shoes='#0c0c0c', hair_style='none', hood='#121419', eyes='#c8c0a8')
    villain.rest(F(10.6)); villain.emote(F(10.7), 'menacing'); villain.walk(11.0, 16.9, (2.9, 8), (2.9, -2.5), 0.6)
    flash = cyl(C, (0, 0, 0), 0.03, 0.2, mat('flash', '#3a3a40', 0.3, metal=0.8)); fl = spot(C, (0, 0, 0), (0, -1, -0.6), '#fff2c8', 120, 35, 0.6)
    flash.parent = villain.arm; flash.parent_type = 'BONE'; flash.parent_bone = 'hand.R'; flash.location = (0, 0.05, 0); flash.rotation_euler = (math.pi / 2, 0, 0)
    fl.parent = flash; fl.location = (0, 0, 0); fl.rotation_euler = (math.radians(-80), 0, 0)
    point(C, (2.9, 0.5, 1.2), '#ff3a2a', 25, 0.3)   # red rim behind the villain (menace)
    # closer crane-down so the villain reads (he was a speck 16 m away); ends on the road, clear of cars and lamp posts
    shot(sc, C, 's1', 10.63, [(10.63, (-0.5, -6.0, 4.5), (2.2, 6.0, 1.0)), (13.9, (0.8, -1.5, 1.8), (2.7, 5.5, 1.2))], lens=35, fstop=None)
    # ---- s2 "A masked man is breaking into homes": inside a dark house (built at x=-40). The front door is kicked off its hinges and slams flat
    # toward the camera; a cold street light floods in behind him: a hooded silhouette with glowing red eyes, his shadow across the floor.
    OX, DY = -40.0, 3.0   # house origin x; y of the front-door wall
    def H(x, y, z): return (OX + x, y, z)
    wallm = mat('hwall', '#3a3f55', 0.8); floorm = mat('hfloor', '#4a3426', 0.45, 0.2)
    plane(C, H(0, 0, 0), (7, 8), floorm); box(C, H(0, 0.0, 2.65), (7, 8, 0.1), wallm, 0)   # floor + ceiling (keeps the moon out)
    for x in (-3.5, 3.5): box(C, H(x, 0, 1.3), (0.1, 8, 2.6), wallm, 0)
    box(C, H(0, -4.0, 1.3), (7, 0.1, 2.6), wallm, 0)
    box(C, H(-1.99, DY, 1.3), (3.02, 0.1, 2.6), wallm, 0); box(C, H(1.99, DY, 1.3), (3.02, 0.1, 2.6), wallm, 0); box(C, H(0, DY, 2.37), (0.96, 0.1, 0.56), wallm, 0)  # wall around the doorway
    box(C, H(-2.2, 1.2, 0.4), (0.9, 0.5, 0.8), mat('hdresser', '#5a3e2c', 0.5), 0.03); cyl(C, H(-2.2, 1.2, 0.95), 0.07, 0.3, mat('hlamp', '#c8b890', 0.5))   # dresser + unlit lamp
    board(C, H(1.6, DY - 0.06, 1.55), (0.6, 0.45), os.path.join(TEX, 'city.png'), '#2a1e16').rotation_euler = (math.pi / 2, 0, 0)   # picture on the wall
    cyl(C, H(2.6, 2.4, 0.9), 0.025, 1.8, mat('hrack', '#3a2a1e', 0.5)); sphere(C, H(2.6, 2.4, 1.6), 0.16, mat('hcoat', '#2a3a5a', 0.7), (1, 0.7, 1.8))   # coat rack
    plane(C, H(0, DY + 5, 0), (12, 10), mat('porch', '#2a2c34', 0.7)); plane(C, H(0, DY + 9, 2.5), (14, 6), image_mat('city2', os.path.join(TEX, 'city.png'), emit_s=0.9), rot=(math.pi / 2, 0, 0))
    spot(C, H(0.5, DY + 5.0, 2.7), H(-0.1, -1.5, 0.0), '#a8b8ff', 2500, 34, 0.25, 0.04)   # street light behind him: the only light in the scene
    doorm = mat('hdoor', '#6a4a32', 0.5); hdoor = box(C, H(0, DY, 1.07), (0.95, 0.06, 2.08), doorm, 0.01, name='hdoor')
    T_KICK = 14.32
    def door_at(t, th, slide=0.0, twist=0.0):   # door falls toward -y about its bottom edge; th in degrees
        a = math.radians(th); key(hdoor, 'location', F(t) if isinstance(t, float) else t, V(H(slide * 0.4, DY - 0.03 - slide - 1.04 * math.sin(a), 0.03 + 1.04 * math.cos(a) + 0.03 * math.sin(a))))
        key(hdoor, 'rotation_euler', F(t) if isinstance(t, float) else t, V((a, 0, twist)))
    door_at(10.6, 0); door_at(T_KICK, 0)
    for k, (dt, th) in enumerate([(0.04, 10), (0.1, 28), (0.16, 50), (0.22, 72), (0.27, 90), (0.32, 84), (0.37, 90)]): door_at(T_KICK + dt, th, slide=min(0.15, 0.04 * (k + 1)), twist=0.12 * min(1, k / 3))
    chipm = mat('chip', '#8a6040', 0.6)
    for i in range(7):   # splinters from the lock side
        ch = box(C, H(0.42, DY, 1.0), (0.04, 0.02, 0.12), chipm, 0.003, name='chip'); v0 = V((0.6 * math.cos(i * 0.9), -2.2 - 0.3 * (i % 3), 1.2 + 0.25 * (i % 4)))
        for j in range(9):
            tt = j * 0.06; p = V(H(0.42, DY - 0.05, 1.0)) + v0 * tt + V((0, 0, -4.9 * tt * tt))
            if p.z < 0.02: p.z = 0.02
            key(ch, 'location', F(T_KICK + tt), p); key(ch, 'rotation_euler', F(T_KICK + tt), V((tt * 20 + i, tt * 14, i)))
        key_vis(ch, 1, False); key_vis(ch, F(T_KICK), True)
    vd = Character(C, 'vild', H(0, DY + 0.75, 0), 0, skin='#1a1d26', shirt='#14161c', pants='#1a1c22', shoes='#0c0c0c', hair_style='none', hood='#121419', eyes='#ff1010')
    redeye = mat('redeye', '#ff1010', 0.3, emit='#ff2010', emit_s=22); blackeye = mat('blackeye', '#050505', 0.6)
    for o in C.objects:
        if o.name.startswith(('vild_iris', 'vild_pupil')): o.data.materials[0] = redeye
        elif o.name.startswith('vild_sclera'): o.data.materials[0] = blackeye
    eyeglow = point(C, H(0, DY + 0.5, 1.66), '#ff2010', 3, 0.05); eyeglow.parent = vd.arm; eyeglow.matrix_parent_inverse = vd.arm.matrix_world.inverted()
    vd.rest(F(10.6)); vd.emote(F(10.7), 'menacing'); vd.blinks(15.0, 16.9, 4.0)
    vd.pose(F(T_KICK - 0.2), {'thigh.R': (math.radians(-70), 0, 0), 'shin.R': (math.radians(80), 0, 0)})   # chamber
    vd.pose(F(T_KICK), {'thigh.R': (math.radians(-80), 0, 0), 'shin.R': (math.radians(5), 0, 0)})        # kick
    vd.pose(F(T_KICK + 0.25), {'thigh.R': (math.radians(-60), 0, 0), 'shin.R': (math.radians(70), 0, 0)})
    vd.pose(F(T_KICK + 0.5), {'thigh.R': (0, 0, 0), 'shin.R': (0, 0, 0)})
    vd.place(F(10.6), H(0, DY + 0.75, 0), 0.0); vd.place(F(15.1), H(0, DY + 0.75, 0), 0.0)
    vd.walk(15.2, 16.0, (OX, DY + 0.75), (OX, DY - 0.45), 0.55)   # steps over the threshold onto the fallen door
    vd.pose(F(16.2), {'head': (math.radians(8), 0, math.radians(-6))})
    shot(sc, C, 's2', 13.95, [(13.95, H(0.3, -0.1, 0.8), H(0, DY, 1.25)), (T_KICK, H(0.3, 0.0, 0.8), H(0, DY, 1.25)),
                               (T_KICK + 0.05, H(0.34, -0.03, 0.83), H(0.02, DY, 1.27)), (T_KICK + 0.12, H(0.27, 0.02, 0.78), H(-0.02, DY, 1.24)),   # impact shake
                               (T_KICK + 0.2, H(0.3, 0.02, 0.8), H(0, DY, 1.25)), (16.9, H(0.25, 0.55, 0.85), H(0, DY - 0.3, 1.4))], lens=32, fstop=None)

# ================================================================ 3. BEDROOM (night)  16.9-22.79
if SET == 'bed':
    sc, C = scene('bed', [(16.9, 22.79)])
    room(C, '#3a4a78', '#5a3a28', w=6, back_y=2.0, hole=(-0.8, 0.8, 1.1, 2.2))
    bed = mat('bedwood', '#7a5038', 0.35, 0.3)
    box(C, (0, 0.6, 0.25), (1.8, 2.2, 0.4), bed, 0.06); box(C, (0, 1.75, 0.6), (1.8, 0.1, 1.1), bed, 0.05)
    box(C, (0, 0.6, 0.5), (1.7, 2.1, 0.18), mat('sheet', '#f4efe6', 0.7), 0.08)
    for x in (-0.45, 0.45): box(C, (x, 1.45, 0.65), (0.6, 0.35, 0.16), mat('pillow', '#ffffff', 0.7), 0.07)
    box(C, (0, 0.1, 0.72), (1.76, 1.3, 0.3), mat('blanket', '#d9643f', 0.75), 0.12)
    box(C, (1.25, 1.6, 0.3), (0.5, 0.45, 0.6), mat('nstand', '#8a5a3c', 0.4), 0.04); blamp = sphere(C, (1.25, 1.6, 0.85), 0.14, mat('lampshade', '#fff0d0', 0.5, emit='#ffcf8a', emit_s=6), (1, 1, 1.2))
    blight = point(C, (1.25, 1.5, 0.95), '#ffb860', 120, 0.1)
    door = box(C, (-2.94, -0.6, 1.03), (0.06, 0.95, 2.05), mat('doorw', '#e8dcc4', 0.5), 0.02)
    sphere(C, (-2.88, -0.95, 1.0), 0.04, mat('knob', '#e8c060', 0.2, metal=1.0))
    tamb = torus(C, (-2.86, -0.95, 0.78), 0.12, 0.018, mat('tambr', '#c8763a', 0.4), rot=(0, math.pi / 2, 0), name='tamb')
    tskin = cyl(C, (-2.86, -0.95, 0.78), 0.112, 0.006, mat('tambs', '#e8b070', 0.6), rot=(0, math.pi / 2, 0))
    tskin.parent = tamb; tskin.location = (0, 0, 0); tskin.rotation_euler = (0, 0, 0)
    for k in range(5):
        a = k / 5 * math.tau; j = cyl(C, (0, 0, 0), 0.025, 0.008, mat('jingle', '#e8d070', 0.2, metal=1.0)); j.parent = tamb; j.location = (math.cos(a) * 0.12, math.sin(a) * 0.12, 0)
    capsule(C, (-2.87, -0.95, 1.0), (-2.86, -0.95, 0.9), 0.006, mat('ribbon', '#d81e1e', 0.6), 'rib')
    for f in range(F(16.9), F(22.8), 2):   # tambourine jingles (smooth sway)
        w = math.exp(-((f / 30 - 18.4) / 0.9) ** 2) + 0.5 * math.exp(-((f / 30 - 20.1) / 0.5) ** 2)
        key(tamb, 'rotation_euler', f, V((0, math.pi / 2, 0.25 * w * math.sin(f * 1.3))))
    night_window(C, -0.8, 0.8, 1.1, 2.2, 2.0)
    look_night(sc, C, (1.25, 1.5, 0.95), (0, 0.9, 1.0), window_dir=(-0.3, 1, 0.5))
    spot(C, (-1.9, -1.9, 1.7), (-2.86, -0.95, 0.8), '#ffd9a8', 90, 40, 0.8, 0.1)   # hallway light so the tambourine reads (was a black ring)
    wife = Character(C, 'wife', (-0.42, 0.95, -0.12), 0, skin='#f3c7a5', hair='#c8742c', hair_style='bob', shirt='#e8a0b8', pants='#e8a0b8')
    hus = Character(C, 'hus', (0.42, 0.95, -0.12), 0, hair='#2a1c12', hair_style='tuft', shirt='#9ab8e0', pants='#9ab8e0', moustache=True)
    for c, e1 in ((wife, 'worried'), (hus, 'worried')):
        c.rest(F(16.9)); c.sit(F(16.9)); c.emote(F(17.0), e1); c.blinks(16.9, 22.8, 2.6)
        c.pose(F(16.9), {'head': (0, 0, math.radians(-25 if c is wife else -15))})
    T_SLEEP = 20.77   # "People sleep with baseball bats": cut to a top view of the couple asleep, him hugging the bat
    # bat: its own object (handle = the thin +Z end). Lies on the blanket under his hand while they sit up listening; in the top view he hugs it.
    batm = mat('bat', '#d8a868', 0.35, 0.3); bat = cyl(C, (0, 0, 0), 0.035, 0.8, batm, r2=0.018, name='bat')
    def bat_at(t, grip, d):   # grip = handle end (world), d = unit vector from barrel to handle
        d = V(d).normalized(); key(bat, 'location', F(t), V(grip) - d * 0.37); key(bat, 'rotation_euler', F(t), d.to_track_quat('Z', 'Y').to_euler())
    LIE_G, LIE_D = (0.32, 0.55, 0.905), (0, 1, 0)
    HUG_G, HUG_D = V((0.31, 1.12, 0.985)), V((-0.25, 0.75, 0.0)).normalized()   # handle under his chin, barrel down across his chest to his far hip
    bat_at(16.9, LIE_G, LIE_D); bat_at(T_SLEEP - 0.04, LIE_G, LIE_D); bat_at(T_SLEEP, HUG_G, HUG_D); bat_at(22.8, HUG_G, HUG_D)
    wife.hand('L', F(16.9), (-0.3, 0.55, 0.95)); wife.hand('R', F(16.9), (-0.52, 0.55, 0.95))
    hus.hand('R', F(16.9), LIE_G); hus.hand('L', F(16.9), (0.55, 0.6, 0.88))
    for c in (wife, hus): c.show(1, True); c.show(F(T_SLEEP), False)   # the first visibility key is held back to frame 1, so key "visible" first
    # sleepers: same couple lying on their backs (armature rotated -90 deg about X: local (x, y, z) -> world (x, z, -y) + loc), eyes closed
    blanket = [o for o in C.objects if o.name.startswith('box') and o.data.materials and o.data.materials[0].name == 'blanket']
    for o in blanket: key_vis(o, 1, True); key_vis(o, F(T_SLEEP), False)
    b2k = box(C, (0, -0.07, 0.72), (1.76, 0.95, 0.3), mat('blanket', '#d9643f', 0.75), 0.12, name='blanket2'); key_vis(b2k, 1, False); key_vis(b2k, F(T_SLEEP), True)
    sw = Character(C, 'sleepw', (-0.42, -0.2, 0.76), 0, skin='#f3c7a5', hair='#c8742c', hair_style='bob', shirt='#e8a0b8', pants='#e8a0b8')
    sm = Character(C, 'sleepm', (0.42, -0.2, 0.76), 0, hair='#2a1c12', hair_style='tuft', shirt='#9ab8e0', pants='#9ab8e0', moustache=True)
    for c in (sw, sm):
        c.arm.rotation_euler = (-math.pi / 2, 0, 0); c.rest(F(16.9)); c.emote(F(16.95), 'asleep'); c.show(1, False); c.show(F(T_SLEEP), True)
        for sd, x in (('L', 1), ('R', -1)): c.ik[sd][1].location = (x * 0.8, -0.3, 0.95)   # elbows out to the sides, not down into the mattress
    sw.pose(F(16.9), {'head': (0, 0, math.radians(-20))})   # head turned toward him
    for o in C.objects:
        if o.name.startswith(('sleepw_shoe', 'sleepm_shoe')): key_vis(o, 1, False); key_vis(o, F(T_SLEEP), False)   # no shoes in bed (they poked through the blanket)
    for t in (T_SLEEP, 22.8):   # both mittens wrapped over the bat
        sm.hand('R', F(t), tuple(HUG_G - HUG_D * 0.14 + V((0, 0, 0.045)))); sm.hand('L', F(t), tuple(HUG_G - HUG_D * 0.4 + V((0.02, 0, 0.045))))
    for f, s_ in ((F(T_SLEEP), 1.0), (F(21.8), 1.03), (F(22.8), 1.0)): key(sm.arm, 'scale', f, V((1, s_, 1)))   # slow breathing (local Y = chest depth when lying)
    for f, e in ((F(22.45), 120), (F(22.62), 0)): key(blight.data, 'energy', f, e)
    shot(sc, C, 'b1', 16.9, [(16.9, (-2.2, -1.75, 0.9), (-2.86, -0.95, 0.8)), (19.5, (-2.25, -1.6, 0.88), (-2.86, -0.95, 0.8))], lens=55, fstop=2.0)
    shot(sc, C, 'b2', 19.55, [(19.55, (0.3, -2.4, 1.35), (0, 0.9, 1.1)), (T_SLEEP - 0.03, (0.4, -2.0, 1.32), (0.2, 0.92, 1.15))], lens=45, fstop=2.8)
    shot(sc, C, 'b3', T_SLEEP, [(T_SLEEP, (0.12, 0.5, 3.4), (0.12, 0.6, 0.75)), (22.79, (0.2, 0.62, 3.0), (0.2, 0.7, 0.75))], lens=28, fstop=None)   # straight down on the bed

# ================================================================ 4. CASE OFFICE 1986 (night, desk lamp)  22.79-32.18
if SET == 'case':
    sc, C = scene('case', [(22.79, 32.18)])
    room(C, '#4a5a48', '#5a4a3a', back_y=2.2)
    mp = board(C, (-1.2, 1.97, 1.65), (1.3, 1.45), os.path.join(TEX, 'camap.png'))
    pin_m = mat('pin', '#e02020', 0.25, 0.8)
    PINS = [(0.3, 0.2), (0.33, 0.26), (0.38, 0.3), (0.42, 0.24), (0.36, 0.36), (0.45, 0.42), (0.4, 0.48), (0.62, 0.8), (0.66, 0.84), (0.7, 0.88), (0.58, 0.76), (0.48, 0.55), (0.44, 0.33)]
    for i, (u, v) in enumerate(PINS):
        p = sphere(C, (-1.2 + (u - 0.5) * 1.3, 1.94, 1.65 + (0.5 - v) * 1.45), 0.025, pin_m, seg=16)
        key(p, 'scale', 1, V((0.001,) * 3)); key(p, 'scale', F(23.07 + i * 0.16), V((0.001,) * 3)); key(p, 'scale', F(23.25 + i * 0.16), V((1, 1, 1)))
    desk(C, (0.5, 0.2, 0), w=1.6, d=0.8); lamp_bulb = desk_lamp(C, (1.0, 0.35, 0.785), '#3a6a4a')
    bag = box(C, (0.25, -0.05, 0.8), (0.24, 0.32, 0.01), mat('bag', '#eaf2f8', 0.1, 1.0, alpha=0.6), 0.004, name='bag')
    plane(C, (0.27, 0.0, 0.808), (0.12, 0.06), image_mat('evid', os.path.join(TEX, 'evidence.png')), rot=(0, 0, 0))
    swab = cyl(C, (0.22, -0.1, 0.812), 0.004, 0.16, mat('stick', '#f4f4f4', 0.4), rot=(math.pi / 2, 0, 0.5)); sphere(C, (0.18, -0.16, 0.812), 0.012, mat('cotton', '#ffffff', 0.9), (1, 1.6, 1))
    for i in range(4): box(C, (0.85 + i * 0.01, 0.0, 0.8 + i * 0.03), (0.25, 0.32, 0.03), mat('folder', ['#e8c070', '#d8c8a8'][i % 2], 0.7), 0.006)
    lamp_key = spot(C, (1.0, 0.0, 1.5), (0.25, -0.05, 0.8), '#ffc890', 0, 50, 0.8, 0.08)
    for f, e in ((1, 0), (F(30.25), 0), (F(30.45), 250)): key(lamp_key.data, 'energy', f, e)
    look_night(sc, C, (1.15, 0.35, 1.25), (0.5, 0.6, 1.3), window_dir=(-0.6, 1, 0.6))
    spot(C, (-1.2, 1.2, 2.9), (-1.2, 1.97, 1.6), '#ffe2b8', 160, 55, 0.7, 0.1)
    point(C, (0, -1.0, 2.8), '#ffd8a8', 60, 0.5)
    # ---- c2 "Then, in 1986, he just stops. Gone.": the killer slumped in an armchair in a dark living room, doing nothing but watching TV,
    # the wall calendar flipping 1976 -> 1986 behind him; on "Gone." he flickers out and leaves an empty chair. Built at x=30.
    OX = 30.0
    def R_(x, y, z): return (OX + x, y, z)
    rwall = mat('lrwall', '#4a4038', 0.85)
    plane(C, R_(0, 0, 0.001), (5.2, 4.4), mat('lrfloor', '#5a4030', 0.5)); box(C, R_(0, 0, 2.65), (5.2, 4.4, 0.1), rwall, 0)
    box(C, R_(0, 1.55, 1.3), (5.2, 0.1, 2.6), rwall, 0); box(C, R_(-2.6, 0, 1.3), (0.1, 4.4, 2.6), rwall, 0); box(C, R_(2.6, 0, 1.3), (0.1, 4.4, 2.6), rwall, 0)
    chm = mat('armchair', '#7a3a34', 0.7, 0.1)
    box(C, R_(0, 0.62, 0.17), (0.95, 0.85, 0.34), chm, 0.05); box(C, R_(0, 0.6, 0.39), (0.85, 0.75, 0.12), chm, 0.05)                  # base + cushion (top 0.45)
    box(C, R_(0, 1.0, 0.8), (0.95, 0.16, 0.85), chm, 0.06); [box(C, R_(sx * 0.47, 0.62, 0.52), (0.14, 0.85, 0.36), chm, 0.05) for sx in (-1, 1)]  # back + arms (top 0.7)
    box(C, R_(0, -1.6, 0.3), (1.0, 0.5, 0.6), mat('tvstand', '#3a2a20', 0.5), 0.02); box(C, R_(0, -1.6, 0.86), (0.8, 0.45, 0.52), mat('tvbody', '#2a2622', 0.4, 0.2), 0.04)
    plane(C, R_(0, -1.37, 0.86), (0.64, 0.4), mat('tvscreen', '#b8d0ff', 0.2, emit='#b8d0ff', emit_s=3.0), rot=(math.pi / 2, 0, math.pi))
    tvl = area(C, R_(0, -1.3, 0.95), R_(0, 0.6, 1.0), 0.6, '#9fc0ff', 80, 'tvlight')
    for f in range(F(25.5), F(30.3), 3):   # soft TV flicker (no strobing)
        key(tvl.data, 'energy', f, 120 + 35 * math.sin(f * 0.7) + 20 * math.sin(f * 1.9))
    point(C, R_(1.6, 1.0, 2.3), '#ffb070', 12, 0.3)   # faint warm bounce so the room is not pure black
    cals = {y: board(C, R_(0.98, 1.47, 1.55), (0.42, 0.56), os.path.join(TEX, f'cal{y}.png'), '#fbf8f0') for y in (1976, 1979, 1982, 1984, 1986)}
    for i, (y, o) in enumerate(cals.items()):   # calendar flips 1976 -> 1986 (years pass, he does nothing)
        t_on = 25.9 + i * 0.4; o.location.y -= 0.002 * i
        key_vis(o, 1, i == 0); key_vis(o, F(t_on), True)
    spot(C, R_(0.4, 0.3, 2.5), R_(0.98, 1.47, 1.55), '#ffe2c0', 25, 40, 0.8, 0.1)   # just enough to read the calendar
    v86 = Character(C, 'vil86', R_(0, 0.58, -0.31), 0, skin='#1a1d26', shirt='#14161c', pants='#1a1c22', shoes='#0c0c0c', hair_style='none', hood='#121419', eyes='#c8c0a8')
    v86.rest(F(25.4)); v86.sit(F(25.4)); v86.emote(F(25.5), 'neutral'); v86.blinks(25.6, 29.3, 2.2)
    v86.pose(F(25.4), {'spine': (math.radians(-12), 0, 0), 'head': (math.radians(6), 0, 0)})   # slumped back
    for sd, x in (('L', 1), ('R', -1)): v86.hand(sd, F(25.4), R_(x * 0.13, 0.3, 0.64))   # mittens resting on his lap
    for t, vis in ((1, True), (29.43, False), (29.53, True), (29.63, False), (29.7, True), (29.78, False)): v86.show(F(t), vis)   # flickers out on "Gone."
    shot(sc, C, 'c1', 22.79, [(22.79, (-1.2, -0.75, 1.6), (-1.2, 1.97, 1.6)), (25.5, (-1.2, -0.5, 1.6), (-1.2, 1.97, 1.6))], lens=35, fstop=None)
    # from just behind the TV: its dark back in the foreground, the screen glow on him
    shot(sc, C, 'c2', 25.55, [(25.55, R_(-0.5, -3.3, 1.75), R_(0.2, 0.55, 0.95)), (30.2, R_(-0.45, -3.05, 1.72), R_(0.2, 0.55, 0.95))], lens=32, fstop=None)
    shot(sc, C, 'c3', 30.25, [(30.25, (0.45, -0.75, 1.25), (0.25, -0.05, 0.81)), (32.18, (0.32, -0.32, 1.0), (0.24, -0.06, 0.81))], lens=50, fstop=2.0)

# ================================================================ 5. DNA (bright, stylised)  32.18-37.73
if SET == 'dna':
    sc, C = scene('dna', [(32.18, 37.73)])
    bgc = sc.world.node_tree.nodes['Background']; bgc.inputs['Color'].default_value = (*hexc('#ffe8f4'), 1); bgc.inputs['Strength'].default_value = 1.0
    helix = bpy.data.objects.new('helix', None); C.objects.link(helix)
    cols = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff']; bb = [mat('bb0', '#4cc9f0', 0.25, 0.8), mat('bb1', '#ff8fab', 0.25, 0.8)]
    for i in range(60):
        a = i * 0.36; z = i * 0.12 - 3.6
        for s_ in (0, 1):
            o = sphere(C, (math.cos(a + s_ * math.pi) * 0.55, math.sin(a + s_ * math.pi) * 0.55, z), 0.08, bb[s_], seg=20); o.parent = helix
        r = cyl(C, (0, 0, z), 0.035, 1.1, mat('rung' + str(i % 5), cols[i % 5], 0.3, 0.6), rot=(0, math.pi / 2, a), verts=16); r.parent = helix
    for f in range(F(32.18), F(37.8), 6): key(helix, 'rotation_euler', f, V((0, 0, f / 30 * 0.35)))
    for k in range(14): sphere(C, (math.cos(k) * (6 + k % 3), 7 + math.sin(k) * 3, (k % 5) - 2), 0.6 + (k % 3) * 0.4, mat('blob' + str(k % 4), ['#ffd6e8', '#d6f0ff', '#e8dcff', '#fff0c8'][k % 4], 0.3, 0.3), seg=24)
    look_day(sc, C, (0, 0, 0), sun_dir=(0.6, 0.8, -0.5), sky='#ffe8f4')
    shot(sc, C, 'd1', 32.18, [(32.18, (0.5, -3.2, 2.2), (0, 0, 1.6)), (37.73, (1.4, -2.2, -1.0), (0, 0, -1.4))], lens=40, fstop=2.8)

# ================================================================ 6. RECORDS (day)  37.73-47.65
if SET == 'records':
    sc, C = scene('records', [(37.73, 47.65)])
    room(C, '#c8d0b8', '#8a6a50', w=14, back_y=1.0)
    sign = board(C, (-1.5, 0.97, 2.55), (1.3, 0.49), os.path.join(TEX, 'files.png'), '#1f3a5a')
    fronts = []
    for i in range(12):
        x = -4.5 + i * 0.62; colr = ['#3f8f8a', '#d9a441', '#c8604a', '#4a6fa5'][i % 4]; cm = mat('cab' + colr, colr, 0.4, 0.3)
        box(C, (x, 0.65, 0.7), (0.55, 0.65, 1.4), cm, 0.03)
        for k in range(4):
            d_ = box(C, (x, 0.31, 0.2 + k * 0.33), (0.5, 0.04, 0.29), cm, 0.012); box(C, (x, 0.28, 0.16 + k * 0.33), (0.18, 0.03, 0.035), METAL, 0.01); fronts.append((x, k, d_))
    card = box(C, (-4.5, 0.0, 1.05), (0.34, 0.008, 0.22), mat('cardb', '#fbf8f0', 0.6), 0.004, name='card')
    cf = plane(C, (0, -0.006, 0), (0.32, 0.2), image_mat('dnacard', os.path.join(TEX, 'dnacard.png'), emit_s=0.3), rot=(math.pi / 2, 0, 0)); cf.parent = card
    st = plane(C, (0, -0.012, 0), (0.3, 0.1), image_mat('nomatch', os.path.join(TEX, 'nomatch.png')), rot=(math.pi / 2, 0.15, 0)); st.parent = card
    st.data.materials[0].blend_method = 'BLEND' if hasattr(st.data.materials[0], 'blend_method') else None
    nt = st.data.materials[0].node_tree; tn = [n for n in nt.nodes if n.type == 'TEX_IMAGE'][0]; nt.links.new(tn.outputs['Alpha'], nt.nodes['Principled BSDF'].inputs['Alpha'])
    s0 = st.scale.copy(); key(st, 'scale', 1, s0 * 0.001); key(st, 'scale', F(42.6), s0 * 0.001); key(st, 'scale', F(42.64), s0 * 1.6); key(st, 'scale', F(42.75), s0)
    for t in [37.9 + k * 0.5 for k in range(10)]:
        x = -4.5 + min(1, max(0, (t - 37.9) / 4.5)) * 6.8; key(card, 'location', F(t), V((x, 0.0, 1.05 + 0.03 * math.sin(t * 2))))
        for (fx, k, d_) in fronts:
            if k == 1: d_.location.y = 0.31 - 0.25 * max(0, 1 - abs(fx - x) / 0.6); d_.keyframe_insert('location', frame=F(t))
    shelf = mat('shelfw', '#8a6a4a', 0.45, 0.2)
    for i in range(4): box(C, (4.2, 0.6, 0.5 + i * 0.75), (2.2, 0.6, 0.05), shelf, 0.015)
    for i in range(4):
        for k in range(4):
            if (i, k) != (3, 1): box(C, (3.45 + k * 0.5, 0.6, 0.68 + i * 0.75), (0.42, 0.45, 0.3), mat('cbox', '#c8a070', 0.7), 0.02)
    evbox = box(C, (3.95, 0.6, 2.93), (0.44, 0.46, 0.32), mat('cbox2', '#c89a62', 0.7), 0.02)
    plane(C, (3.95, 0.365, 2.93), (0.34, 0.16), image_mat('unsolved', os.path.join(TEX, 'unsolved.png')), rot=(math.pi / 2, 0, 0))
    clock_face = cyl(C, (4.2, 0.95, 3.55), 0.2, 0.04, mat('clockf', '#fffaf0', 0.5), rot=(math.pi / 2, 0, 0))
    hand_m = mat('chand', '#2a2a2a', 0.4); hh = box(C, (4.2, 0.92, 3.55), (0.015, 0.01, 0.12), hand_m, 0.003); mh = box(C, (4.2, 0.915, 3.55), (0.012, 0.01, 0.17), hand_m, 0.003)
    for t in [43.6 + k * 0.5 for k in range(9)]: key(mh, 'rotation_euler', F(t), V((0, -(t - 43.6) * 9, 0))); key(hh, 'rotation_euler', F(t), V((0, -(t - 43.6) * 0.75, 0)))
    look_day(sc, C, (0, 0, 1.2), sun_dir=(0.8, 0.6, -0.6))
    shot(sc, C, 'r1', 37.73, [(37.73, (-4.1, -1.5, 1.3), (-4.5, 0.3, 1.05)), (42.4, (2.4, -1.5, 1.3), (2.2, 0.3, 1.05))], lens=40, fstop=2.8)
    shot(sc, C, 'r2', 42.45, [(42.45, (2.35, -1.15, 1.1), (2.28, 0, 1.05)), (43.4, (2.33, -1.05, 1.1), (2.28, 0, 1.05))], lens=50, fstop=2.8)
    shot(sc, C, 'r3', 43.45, [(43.45, (3.4, -2.0, 1.8), (4.0, 0.6, 2.4)), (47.65, (3.9, -0.6, 2.95), (3.95, 0.6, 2.93))], lens=40, fstop=2.4)

# ================================================================ 7. 2018 OFFICE (day sunbeam)  47.65-73.31
if SET == 'office':
    sc, C = scene('office', [(47.65, 73.31)])
    room(C, '#2f7f86', '#9a5a30', back_y=2.2)
    desk(C, (-0.6, 0.6, 0), w=1.6, d=0.8, m=WOOD_L)
    # monitor faces the detectives (+y) so they look at its screen; the screen insert (o2) is an over-the-shoulder shot from behind them
    mon_scr = plane(C, (-0.6, 0.915, 1.12), (0.6, 0.375), image_mat('site', os.path.join(TEX, 'site.mp4'), emit_s=1.2, sequence=(F(47.6), 270)), rot=(math.radians(95), 0, math.pi))
    box(C, (-0.6, 0.88, 1.12), (0.66, 0.04, 0.42), mat('monb', '#2a2e38', 0.3), 0.015); cyl(C, (-0.6, 0.86, 0.9), 0.02, 0.22, mat('monb', '#2a2e38', 0.3))
    box(C, (-0.85, 0.98, 0.797), (0.42, 0.14, 0.02), mat('kbd', '#3a3f4a', 0.4), 0.006)   # keyboard in front of det1, where her mittens rest
    box(C, (1.4, 2.12, 1.65), (1.2, 0.06, 2.0), mat('tvb', '#1d2230', 0.3), 0.03)
    chart = plane(C, (1.4, 2.08, 1.65), (1.1, 1.92), image_mat('chart', os.path.join(TEX, 'chart.mp4'), emit_s=1.5, sequence=(F(56.6), 504)), rot=(math.pi / 2, 0, 0))
    key_vis(chart, 1, False); key_vis(chart, F(56.55), True)
    plane(C, (1.4, 2.085, 1.65), (1.1, 1.92), mat('tvoff', '#0c1018', 0.15, 0.8), rot=(math.pi / 2, 0, 0))
    plant(C, (-2.6, 1.6, 0), 1.1); plant(C, (3.0, 1.5, 0), 0.9)
    for i in range(5): box(C, (-2.2 + i * 0.14, 2.1, 1.45), (0.1, 0.22, 0.32), mat(f'book{i}', ['#e8603c', '#3a7ca5', '#f2c14e', '#5fb36b', '#7a5cc8'][i], 0.5), 0.01)
    box(C, (-1.9, 2.1, 1.27), (1.0, 0.26, 0.04), WOOD_L, 0.01)
    look_day(sc, C, (0.2, 1.0, 1.3), sun_dir=(0.9, 0.5, -0.65))
    det1 = Character(C, 'det1', (-1.0, 1.25, 0), math.pi * 0, skin='#c98f6a', hair='#2a1a12', hair_style='bun', shirt='#f2efe6', coat='#6a5a8a', pants='#2a2e3a', eyes='#3a2a1a')
    det2 = Character(C, 'det2', (-0.1, 1.3, 0), 0, hair='#7a7a7a', hair_style='side', shirt='#e8e8e0', tie='#2f4f8a', glasses=True, skin='#f0c09a', pants='#3a3f52')
    for c in (det1, det2): c.rest(F(47.6)); c.blinks(47.6, 73.4, 3.1)
    for t, e in ((47.8, 'calm'), (50.5, 'surprised'), (51.3, 'determined'), (57.4, 'calm'), (71.2, 'happy')): det1.emote(F(t), e)
    for t, e in ((47.8, 'thinking'), (51.0, 'determined'), (62.8, 'calm'), (71.2, 'happy')): det2.emote(F(t), e)
    # det1 types on the keyboard in front of her (targets within reach; the old ones were past the monitor and the mittens floated)
    for t, p in ((47.6, (-1.15, 0.95, 0.88)), (52.0, (-1.15, 0.95, 0.88)), (52.3, (-0.97, 1.0, 0.9)), (56.4, (-0.97, 1.0, 0.9)), (56.8, (-1.15, 0.95, 0.88))): det1.hand('R', F(t), p)
    for t, p in ((47.6, (-0.85, 0.95, 0.88)), (52.3, (-0.73, 1.0, 0.9)), (56.4, (-0.73, 1.0, 0.9)), (56.8, (-0.85, 0.95, 0.88))): det1.hand('L', F(t), p)
    # det2 studies the killer's case file through a magnifying glass (shows "detective" at a glance), then sets it down when they get the idea
    box(C, (-0.06, 0.9, 0.792), (0.36, 0.27, 0.012), mat('cfolder', '#d8b878', 0.7), 0.003)
    plane(C, (-0.08, 0.9, 0.8), (0.19, 0.25), image_mat('casefile', os.path.join(TEX, 'wanted.png'), rough=0.7))
    for i in range(3): box(C, (-0.05 + 0.01 * i, 0.93, 0.786 - 0.004 * i), (0.22, 0.28, 0.003), mat('cpaper', '#f4f0e4', 0.8), 0)
    mag = bpy.data.objects.new('magroot', None); C.objects.link(mag)
    glassm = mat('magglass', '#dff0ff', 0.03, 0.8, alpha=0.1); rimm = mat('magrim', '#2a2a30', 0.3, metal=0.8); hdlm = mat('maghdl', '#5a3420', 0.5)
    mparts = [torus(C, (0, 0, 0), 0.055, 0.008, rimm, name='magrim'), cyl(C, (0, 0, 0), 0.052, 0.004, glassm, name='maglens')] + capsule(C, (0, 0.06, 0.004), (0, 0.17, 0.03), 0.012, hdlm, 'maghdl')
    for o in mparts: mw = o.matrix_world.copy(); o.parent = mag; o.matrix_world = mw
    mag.scale = (1.6, 1.6, 1.6); MAG_W = V((0, 0.18, 0.04)) * 1.6   # big readable lens; wrist target relative to the lens centre, so the mitten closes round the handle
    for t, p in ((47.6, (-0.1, 0.9, 0.9)), (48.6, (-0.02, 0.86, 0.905)), (49.5, (-0.1, 0.84, 0.895)), (50.4, (-0.03, 0.9, 0.9)), (51.0, (-0.05, 0.88, 0.9)),
                 (51.4, (-0.03, 0.86, 0.96)), (51.9, (0.06, 0.84, 0.8)), (56.9, (0.06, 0.84, 0.8))):
        key(mag, 'location', F(t), V(p))
        if t <= 51.9: det2.hand('R', F(t), tuple(V(p) + MAG_W), 1)
    det2.hand('R', F(52.4), (-0.25, 1.15, 0.9), 0)   # lets go, arm hangs
    det2.hand('L', F(47.6), (0.06, 0.98, 0.86), 1); det2.hand('L', F(51.2), (0.06, 0.98, 0.86), 1); det2.hand('L', F(51.6), (0.1, 1.1, 0.9), 0)   # other mitten on the folder
    det2.pose(F(47.6), {'head': (math.radians(22), 0, 0)}); det2.pose(F(50.9), {'head': (math.radians(22), 0, 0)}); det2.pose(F(51.4), {'head': (0, 0, math.radians(-10))})
    for k, t in enumerate([52.45 + 0.17 * j for j in range(23)]):   # det1 types: mittens tap the keyboard alternately
        for sd, base in (('R', V((-0.97, 1.0, 0.9))), ('L', V((-0.73, 1.0, 0.9)))):
            up = 0.028 if (k + (sd == 'L')) % 2 == 0 else 0.0; det1.hand(sd, F(t), tuple(base + V((0.01 * math.sin(k * 1.7), 0, up))))
    # face the desk until he sets off (walk()'s first rotation key at 56.8 was held from frame 1, so he stood sideways all along)
    det2.place(F(47.6), (-0.1, 1.3, 0), 0.0); det2.place(F(56.5), (-0.1, 1.3, 0), 0.0)
    det2.walk(56.8, 58.3, (-0.1, 1.3), (0.55, 1.65)); det2.place(F(58.4), (0.55, 1.65, 0), math.radians(-60))
    for t0, t1, (u, v) in ((66.6, 70.9, (0.3, 0.55)), (71.3, 73.4, (0.74, 0.6))):
        p = (1.4 + (u - 0.5) * 1.1, 2.0, 1.65 + (0.5 - v) * 1.92)
        det2.hand('L', F(t0), (0.8, 1.7, 0.9), 0); det2.hand('L', F(t0 + 0.4), p, 1); det2.hand('L', F(t1 - 0.4), p, 1); det2.hand('L', F(t1), (0.8, 1.7, 0.9), 0)
    shot(sc, C, 'o0', 47.65, [(47.65, (-0.02, 0.28, 1.3), (-0.06, 0.9, 0.84)), (49.8, (-0.03, 0.38, 1.24), (-0.06, 0.9, 0.84))], lens=40, fstop=2.8)   # insert: lens over the case file
    shot(sc, C, 'o1', 49.85, [(49.85, (-0.45, -2.1, 1.45), (-0.45, 1.2, 1.35)), (52.15, (-0.45, -1.85, 1.45), (-0.45, 1.2, 1.35))], lens=45, fstop=2.8)
    shot(sc, C, 'o2', 52.2, [(52.2, (-0.55, 2.0, 1.5), (-0.6, 0.91, 1.1)), (56.55, (-0.56, 1.85, 1.45), (-0.6, 0.91, 1.1))], lens=36, fstop=4)
    # wall chart: one slow push on the whole chart (the old punch-ins cropped the COUSIN / KILLER'S DNA labels); the chart video itself steps through
    # cousins -> shared DNA -> 1800s. o7 is a gentler punch-in on THIS MAN.
    shot(sc, C, 'o3', 56.6, [(56.6, (1.4, -0.38, 1.72), (1.4, 2.08, 1.72)), (66.4, (1.4, -0.18, 1.7), (1.4, 2.08, 1.7))], lens=35, fstop=None)
    shot(sc, C, 'o7', 71.15, [(71.15, (1.5, 0.35, 1.48), (1.5, 2.08, 1.45)), (73.31, (1.52, 0.55, 1.46), (1.52, 2.08, 1.45))], lens=35, fstop=None)
    shot(sc, C, 'o6', 66.45, [(66.45, (0.4, -1.7, 1.55), (1.0, 2.0, 1.6)), (71.1, (0.5, -1.5, 1.55), (1.0, 2.0, 1.6))], lens=35, fstop=4)

# ================================================================ 8. SUBURB (day)  73.31-88.37
if SET == 'suburb':
    sc, C = scene('suburb', [(73.31, 88.37)])
    plane(C, (0, 0, 0), (60, 60), mat('grassd', '#5fae48', 0.7)); plane(C, (0, 0, 0.005), (4, 60), mat('roadd', '#5a5f6a', 0.6))
    house(C, (8.2, 0.5, 0), '#f4e0b0', '#7a5a8a', rotz=math.pi / 2); tree(C, (4.6, 3.5, 0), 3); tree(C, (4.6, -3.0, 0), 2.6)
    # ---- grocery store: a real hollow shop (front wall with door + window openings, lit interior with stocked shelves), not a solid block
    stw = mat('storew', '#f4f0e6', 0.6); FX = -5.55   # front wall x
    for y0, y1, z0, z1 in ((-13, -12.4, 0, 3.4), (-12.4, -10.8, 0, 0.6), (-12.4, -10.8, 2.2, 3.4), (-10.8, -10.5, 0, 3.4), (-10.5, -9.1, 2.2, 3.4),
                           (-9.1, -7.4, 0, 3.4), (-7.4, -5.6, 0, 0.6), (-7.4, -5.6, 2.2, 3.4), (-5.6, -5.0, 0, 3.4)):
        box(C, (FX, (y0 + y1) / 2, (z0 + z1) / 2), (0.1, y1 - y0, z1 - z0), stw, 0)
    winm = mat('storewin', '#d8eefa', 0.05, 0.6, alpha=0.18)
    for yc in (-11.6, -6.5): box(C, (FX, yc, 1.4), (0.02, 1.6, 1.6), winm, 0)
    box(C, (-7.5, -13.0, 1.7), (4.1, 0.1, 3.4), stw, 0); box(C, (-7.5, -5.0, 1.7), (4.1, 0.1, 3.4), stw, 0); box(C, (-9.5, -9, 1.7), (0.1, 8, 3.4), stw, 0)
    box(C, (-7.5, -9, 3.45), (4.2, 8.2, 0.12), mat('roof', '#d8d0c4', 0.6), 0.03); plane(C, (-7.5, -9, 0.008), (4, 8), mat('tiles', '#e8e2d6', 0.35, 0.3))
    for yc in (-10.6, -7.4): area(C, (-7.5, yc, 3.3), (-7.5, yc, 0), 2.2, '#fff4e0', 500, 'shoplight')
    palette = ['#e8503c', '#f2c14e', '#3a7ca5', '#5fb36b', '#f08a4b', '#c85a8a', '#ffffff', '#7a5cc8']; k = 0
    shelfm = mat('shelfm', '#c8ccd4', 0.4, metal=0.4)
    for yc in (-12.2, -8.3, -6.0):   # three shelf units running into the shop, stocked on both faces
        box(C, (-7.6, yc, 0.85), (2.6, 0.12, 1.7), shelfm, 0.01)
        for zb in (0.12, 0.62, 1.12, 1.62): box(C, (-7.6, yc, zb), (2.6, 0.5, 0.03), shelfm, 0.005)
        for zb in (0.12, 0.62, 1.12):
            for side in (-1, 1):
                for j in range(11):
                    k += 1; h = 0.16 + 0.08 * ((k * 7) % 3) / 2
                    box(C, (-8.75 + j * 0.23, yc + side * 0.15, zb + 0.015 + h / 2), (0.17, 0.16, h), mat('prod' + str(k % 8), palette[k % 8], 0.45, 0.2), 0)
    box(C, (-6.3, -11.7, 0.5), (0.7, 1.0, 1.0), mat('counter', '#5fae8a', 0.5), 0.02)   # checkout
    # sign facing the street: frame AND face rotated together (board() + rotating only the face left the frame sticking out and hiding the sign)
    box(C, (-5.47, -9, 3.0), (0.04, 3.08, 0.68), mat('bframe#2fa86a', '#2fa86a', 0.4), 0.01)
    sg = plane(C, (-5.44, -9, 3.0), (3.0, 0.6), image_mat('img_grocery.png', os.path.join(TEX, 'grocery.png'), rough=0.6), rot=(math.pi / 2, 0, math.pi / 2))
    sdoor = box(C, (0, 0, 0), (0.04, 1.4, 2.2), mat('storedoor', '#d8eefa', 0.05, 0.6, alpha=0.2), 0.02, name='storedoor')
    for t, y in ((1.0, -9.8), (83.95, -9.8), (84.35, -11.15), (85.3, -11.15), (85.7, -9.8)): key(sdoor, 'location', F(t), V((-5.46, y, 1.1)))   # automatic door slides open for him
    plane(C, (-3.6, -9.0, 0.004), (3.6, 10), mat('lot', '#4a4e56', 0.7))   # parking lot
    for yl in (-12.6, -8.2): plane(C, (-3.6, yl, 0.006), (2.6, 0.08), mat('lotline', '#f4f4f4', 0.6))
    # his car: drives in and parks (rigged), windows see-through so he is visible at the wheel
    mycar = car(C, (-3.9, -10.4, 0), '#b8c8d8', rig=True, see_through=True)
    hdl = box(C, (0, 0, 0), (0.04, 0.17, 0.045), METAL, 0.015, name='handle'); hdl.location = (-2.98, -10.15, 0.86)
    bpy.context.view_layer.update(); mw = hdl.matrix_world.copy(); hdl.parent = mycar; hdl.matrix_parent_inverse = mycar.matrix_world.inverted(); hdl.matrix_world = mw
    drv = Character(C, 'drv', (-4.3, -10.65, -0.52), 0, skin='#efc4a4', hair='#e0e0e0', hair_style='bald', shirt='#c8b48a', pants='#6a6a6a', eyes='#5a6a7a')
    bpy.context.view_layer.update(); mw = drv.arm.matrix_world.copy(); drv.arm.parent = mycar; drv.arm.matrix_parent_inverse = mycar.matrix_world.inverted(); drv.arm.matrix_world = mw
    drv.rest(F(82.3)); drv.emote(F(82.35), 'calm'); drv.show(1, False); drv.show(F(82.45), True); drv.show(F(83.62), False)
    for t, (x, y), r in ((1.0, (-1.0, -2.0), -0.27), (82.45, (-1.0, -2.0), -0.27), (83.25, (-3.72, -9.55), -0.05), (83.55, (-3.9, -10.4), 0.0)):
        key(mycar, 'location', F(t), V((x, y, 0))); key(mycar, 'rotation_euler', F(t), V((0, 0, r)))
    car(C, (-1.1, 4.5, 0), '#e8e4da', math.pi)
    for y in (-2.5, 2.5): box(C, (4.5, y, 0.45), (0.06, 0.06, 0.9), mat('mbox', '#2f5fa8', 0.4), 0.02)
    look_day(sc, C, (2, -2, 1), sun_dir=(0.7, 0.5, -0.6))
    old = Character(C, 'old', (4.7, 0.3, 0), -math.pi / 2 + 0.5, skin='#efc4a4', hair='#e0e0e0', hair_style='bald', shirt='#c8b48a', pants='#6a6a6a', eyes='#5a6a7a', scale=1.0)
    old.rest(F(73.3)); old.emote(F(73.4), 'calm'); old.blinks(73.3, 88.3, 3.4); bpy.context.view_layer.update(); old.hand('R', F(73.3), tuple(old.arm.matrix_world @ V((-0.12, -0.35, 0.95))))
    # hose nozzle in his mitten, a hose back to the house and a visible water arc onto the lawn (the preview showed only a tiny green stick)
    M_OLD = old.arm.matrix_world.copy(); HANDW = M_OLD @ V((-0.12, -0.35, 0.95)); WDIR = (M_OLD.to_3x3() @ V((-0.45, -1.0, 0.3))).normalized()
    nozzle = cyl(C, tuple(HANDW + WDIR * 0.07), 0.022, 0.16, mat('noz', '#2fa86a', 0.3), rot=tuple(WDIR.to_track_quat('Z', 'Y').to_euler()), name='nozzle')
    hosem = mat('hose', '#3f9a4a', 0.45, 0.2); water = mat('water', '#bfe6ff', 0.05, 0.6, alpha=0.55)
    HOSE_G = V((HANDW.x + 0.15, HANDW.y + 0.2, 0.03))   # hose drops from the nozzle to the grass, then runs to the house
    wet = [nozzle] + capsule(C, tuple(HANDW - WDIR * 0.03), tuple(HOSE_G), 0.016, hosem, 'hose1') + capsule(C, tuple(HOSE_G), (6.45, 0.9, 0.03), 0.016, hosem, 'hose2')
    tip = HANDW + WDIR * 0.16; vel = WDIR * 2.6; k = 0
    while True:
        tt = k * 0.012; p = tip + vel * tt + V((0, 0, -4.9 * tt * tt)); k += 1
        if p.z < 0.02 or k > 200: break
        wet.append(sphere(C, tuple(p), 0.014, water, seg=12, name='drop'))
    wet.append(cyl(C, (p.x, p.y, 0.012), 0.18, 0.01, water, name='puddle'))
    # off the lawn while he drives (the driver double is in the car), then out of the parked car, through the sliding door, to a shelf inside
    old.place(F(73.3), (4.7, 0.3, 0), -math.pi / 2 + 0.5); old.place(F(83.58), (4.7, 0.3, 0), -math.pi / 2 + 0.5)
    old.show(1, True); old.show(F(82.45), False); old.show(F(83.62), True); old.hand('R', F(83.58), (-5.0, -10.6, 0.7), 0)
    old.place(F(83.6), (-5.05, -10.95, 0), 3.32); old.walk(83.65, 84.4, (-5.05, -10.95), (-5.2, -9.85), 0.5)
    old.walk(84.45, 85.35, (-5.2, -9.85), (-6.75, -9.7), 0.5); old.place(F(85.45), (-6.75, -9.7, 0), math.radians(-60)); old.place(F(85.9), (-6.75, -9.7, 0), math.pi)   # turns to the shelf
    for o in wet: key_vis(o, F(82.4), True); key_vis(o, F(82.5), False)
    d1s = Character(C, 'd1s', (0.2, 6.4, 0), math.radians(70), skin='#c98f6a', hair='#2a1a12', hair_style='bun', shirt='#f2efe6', coat='#6a5a8a', pants='#2a2e3a')
    d2s = Character(C, 'd2s', (0.1, 5.6, 0), math.radians(60), hair='#7a7a7a', hair_style='side', shirt='#e8e8e0', tie='#2f4f8a', glasses=True, skin='#f0c09a', pants='#3a3f52')
    for c in (d1s, d2s): c.rest(F(73.3)); c.emote(F(73.4), 'determined'); c.blinks(73.3, 88.4, 3.0)
    bino = box(C, (0, 0, 0), (0.12, 0.08, 0.05), mat('bino', '#1d2230', 0.5), 0.015)
    bino.parent = d2s.arm; bino.parent_type = 'BONE'; bino.parent_bone = 'head'; bino.location = (0, -0.195, 0.33)
    bpy.context.view_layer.update()
    for sd, dx in (('L', 0.07), ('R', -0.07)): d2s.hand(sd, F(73.3), tuple(d2s.arm.matrix_world @ V((dx, -0.33, 1.63))))
    officer = Character(C, 'officer', (-1.6, -10.05, 0), -math.pi / 2, skin='#8a5a3c', hair_style='none', shirt='#2f4f8a', pants='#1d2a4a', eyes='#3a2a1a', cap='#1d2a4a')
    officer.rest(F(84.5)); officer.emote(F(84.6), 'determined'); officer.walk(84.6, 85.25, (-1.6, -10.05), (-2.55, -10.05))
    officer.show(1, False); officer.show(F(84.55), True)   # arrives only once the old man is inside (he stood in the lot all along)
    officer.hand('L', F(84.5), (-1.5, -10.3, 0.75), 0); officer.hand('L', F(85.3), (-2.6, -10.2, 0.8), 0)   # arm hangs while he walks, then reaches
    # swab: its own object wiping the handle; the officer's hand follows the top of the stick
    TIP = V((-2.99, -10.15, 0.86)); TOPO = V((0.14, 0.0, 0.11))
    swab2 = bpy.data.objects.new('swabrig', None); C.objects.link(swab2)
    stick = capsule(C, (0, 0, 0), tuple(TOPO), 0.01, mat('stick', '#f4f4f4', 0.4), 'stick'); bud2 = sphere(C, (0, 0, 0), 0.032, mat('cotton', '#ffffff', 0.9), (1.7, 1, 1), seg=16)   # bigger: it has to read
    for o in stick + [bud2]: o.parent = swab2
    key_vis(swab2, 1, False)
    for o in stick + [bud2]: key_vis(o, 1, False); key_vis(o, F(85.5), True)
    for k, t in enumerate([85.5, 85.9] + [86.2 + j * 0.25 for j in range(8)]):
        p = TIP + V((0.25 if k == 0 else 0, 0.05 * ((k % 2) * 2 - 1) if k > 1 else 0, 0.08 if k == 0 else 0))
        key(swab2, 'location', F(t), p); officer.hand('L', F(t), tuple(p + TOPO + V((0.05, 0, -0.015))))
    officer.place(F(85.3), (-2.55, -10.05, 0), -math.pi / 2); officer.place(F(85.7), (-2.7, -10.0, 0), -math.pi / 2)   # step close to the car, lean in
    officer.pose(F(85.3), {'spine': (0, 0, 0)}); officer.pose(F(85.8), {'spine': (0.3, 0, 0), 'neck': (0.25, 0, 0)})
    shot(sc, C, 'u1', 73.31, [(73.31, (2.2, -1.9, 1.5), (4.7, 0.3, 1.4)), (79.9, (2.1, -0.9, 1.55), (4.7, 0.3, 1.4))], lens=45, fstop=2.8)
    shot(sc, C, 'u2', 79.95, [(79.95, (3.4, 4.6, 1.6), (0.15, 6.0, 1.5)), (82.45, (3.2, 4.75, 1.6), (0.15, 6.0, 1.5))], lens=45, fstop=2.8)   # both detectives in frame
    # high angle over the parked car, so he is seen entering the store (the car hid him) with the whole GROCERY sign in frame
    shot(sc, C, 'u3a', 82.5, [(82.5, (0.3, -15.8, 2.4), (-3.3, -7.5, 1.0)), (83.6, (0.1, -15.4, 2.35), (-3.7, -9.2, 1.0))], lens=35, fstop=None)   # his car pulls into the lot
    shot(sc, C, 'u3', 83.65, [(83.65, (-3.3, -5.6, 2.2), (-5.4, -9.6, 1.5)), (85.0, (-3.45, -5.9, 2.15), (-5.8, -9.6, 1.45))], lens=32, fstop=None)    # out of the car, into the store
    # medium shot from beyond the car's nose at handle height: officer, swab and door handle all readable (the camera used to end 0.5 m from his back)
    shot(sc, C, 'u4', 85.05, [(85.05, (-1.5, -13.8, 1.15), (-2.85, -10.15, 0.95)), (88.37, (-1.65, -13.4, 1.05), (-2.95, -10.15, 0.88))], lens=50, fstop=2.8)

# ================================================================ 9. LAB MATCH (day)  88.37-89.57
if SET == 'match':
    sc, C = scene('match', [(88.37, 89.57)])
    room(C, '#d8ecf0', '#e8eef2', back_y=1.5)
    box(C, (0, 1.0, 0.45), (3, 0.7, 0.9), mat('bench', '#f4f4f4', 0.3, 0.3), 0.04)
    ms0 = plane(C, (-0.3, 1.2, 1.5), (1.2, 0.75), image_mat('match0', os.path.join(TEX, 'match0.png'), emit_s=1.5), rot=(math.pi / 2, 0, 0))
    ms1 = plane(C, (-0.3, 1.195, 1.5), (1.2, 0.75), image_mat('match1', os.path.join(TEX, 'match1.png'), emit_s=1.5), rot=(math.pi / 2, 0, 0))
    key_vis(ms1, 1, False); key_vis(ms1, F(89.0), True); key_vis(ms0, 1, True); key_vis(ms0, F(89.0), False)
    look_day(sc, C, (0, 0.5, 1.3), sun_dir=(0.6, 0.7, -0.6))
    dm = Character(C, 'dm', (0.45, 0.6, 0), math.radians(25), hair='#7a7a7a', hair_style='side', shirt='#e8e8e0', tie='#2f4f8a', glasses=True, skin='#f0c09a', pants='#3a3f52')
    dm.rest(F(88.3)); dm.emote(F(88.4), 'surprised'); dm.emote(F(89.0), 'joy')
    dm.hand('L', F(88.9), (0.7, 0.4, 0.8), 0); dm.hand('L', F(89.15), (0.8, 0.35, 1.7), 1); dm.hand('R', F(88.9), (0.2, 0.4, 0.8), 0); dm.hand('R', F(89.15), (0.1, 0.35, 1.7), 1)
    # screen left, detective right, both in frame (he used to stand in front of the screen)
    shot(sc, C, 'm1', 88.37, [(88.37, (-0.05, -2.75, 1.5), (-0.05, 1.0, 1.45)), (89.57, (-0.05, -2.5, 1.5), (-0.05, 1.0, 1.45))], lens=35, fstop=4)

# ================================================================ 10. ARREST (day, police lights)  89.57-96.5
if SET == 'arrest':
    sc, C = scene('arrest', [(89.57, 96.5)])
    plane(C, (0, 0, 0), (60, 60), mat('grassa', '#5fae48', 0.7)); plane(C, (0, 1, 0.005), (3.4, 12), mat('drive', '#b8b0a4', 0.6))
    house(C, (-0.5, 6.5, 0), '#f4e0b0', '#7a5a8a'); tree(C, (-4, 4, 0), 3.2); tree(C, (4.5, 5, 0), 2.8)
    lr, lb = car(C, (2.4, 1.2, 0), '#f4f4f4', -0.25, police=True)
    for f in range(F(89.5), F(96.6), 3):   # smooth alternating police glow (no strobe)
        w = 0.5 + 0.5 * math.sin(f / 30 * 5)
        lr.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 2 + 10 * w
        lr.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].keyframe_insert('default_value', frame=f)
        lb.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 2 + 10 * (1 - w)
        lb.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].keyframe_insert('default_value', frame=f)
    pr = point(C, (2.1, 1.0, 1.7), '#ff3030', 0); pb_ = point(C, (2.7, 1.2, 1.7), '#3050ff', 0)
    for f in range(F(89.5), F(96.6), 3):
        w = 0.5 + 0.5 * math.sin(f / 30 * 5); key(pr.data, 'energy', f, 30 + 150 * w); key(pb_.data, 'energy', f, 30 + 150 * (1 - w))
    look_day(sc, C, (0.5, 0.5, 1.2), sun_dir=(0.9, 0.4, -0.45), sky='#ffd8b0')
    old2 = Character(C, 'old2', (0.5, 0.5, 0), math.radians(10), skin='#efc4a4', hair='#e0e0e0', hair_style='bald', shirt='#c8b48a', pants='#6a6a6a', eyes='#5a6a7a')
    old2.rest(F(89.5)); old2.emote(F(89.6), 'neutral'); old2.emote(F(91.3), 'sad'); old2.blinks(89.6, 96.5, 2.8)
    old2.pose(F(89.5), {'head': (math.radians(12), 0, 0)})
    bpy.context.view_layer.update(); W0 = old2.arm.matrix_world @ V((0, -0.3, 0.95))
    old2.hand('L', F(89.5), tuple(W0 + V((0.07, 0, 0)))); old2.hand('R', F(89.5), tuple(W0 + V((-0.07, 0, 0))))
    # cuffs closed around the wrists, ring axis along each forearm (they floated in front of his hands and read as a second pair of eyes)
    cm_ = mat('cuff', '#c8ccd4', 0.15, metal=1.0); bpy.context.scene.frame_set(F(90.0)); bpy.context.view_layer.update(); cuffc = []
    for sd in ('L', 'R'):
        pb = old2.arm.pose.bones['forearm.' + sd]; h_ = old2.arm.matrix_world @ pb.head; t_ = old2.arm.matrix_world @ pb.tail; d_ = (t_ - h_).normalized()
        c_ = t_ - d_ * 0.03; cuffc.append(c_); torus(C, tuple(c_), 0.058, 0.012, cm_, rot=tuple(d_.to_track_quat('Z', 'Y').to_euler()), name='cuff' + sd)
    capsule(C, tuple(cuffc[0] + V((0, 0, -0.05))), tuple(cuffc[1] + V((0, 0, -0.05))), 0.006, cm_, 'chain')
    offc = Character(C, 'offc', (1.15, 0.3, 0), math.radians(-30), skin='#8a5a3c', hair_style='none', shirt='#2f4f8a', pants='#1d2a4a', eyes='#3a2a1a', cap='#1d2a4a')
    offc.rest(F(89.5)); offc.emote(F(89.6), 'determined'); offc.hand('R', F(89.5), (0.75, 0.4, 1.15))
    det1a = Character(C, 'det1a', (-0.45, 0.7, 0), math.radians(20), skin='#c98f6a', hair='#2a1a12', hair_style='bun', shirt='#f2efe6', coat='#6a5a8a', pants='#2a2e3a')
    det1a.rest(F(89.5)); det1a.emote(F(89.6), 'determined')
    # ---- a3 flashback (post.py turns 93.4-96.45 black & white with grain): 1979, the young officer in a hardware aisle glances around,
    # holds his jacket open with one mitten and slips a hammer, then a can of dog spray inside it. Built at x=60, roofed so the sun stays out.
    OX = 60.0
    def Q(x, y, z): return V((OX + x, y, z))
    hw = mat('hwwall', '#b8b0a0', 0.8)
    plane(C, Q(0, 0, 0.002), (4, 4), mat('hwfloor', '#8a8478', 0.5)); box(C, Q(0, 0, 2.75), (4, 4, 0.1), hw, 0)
    box(C, Q(0, 1.05, 1.35), (4, 0.1, 2.7), hw, 0); box(C, Q(1.15, 0, 1.35), (0.1, 4, 2.7), hw, 0); box(C, Q(-1.6, 0, 1.35), (0.1, 4, 2.7), hw, 0)
    box(C, Q(-0.3, 0.98, 1.6), (1.6, 0.03, 1.0), mat('pegboard', '#c8a070', 0.7), 0)   # pegboard with hanging tools
    for i in range(6): box(C, Q(-0.95 + i * 0.26, 0.95, 1.55 + 0.12 * (i % 2)), (0.05, 0.03, 0.32), mat('peg' + str(i % 3), ['#3a3a40', '#8a3a2a', '#c8c8c8'][i % 3], 0.4, metal=0.5), 0.005)
    area(C, Q(0.1, -0.3, 2.6), Q(0.1, -0.3, 0), 1.6, '#f4f8ff', 260, 'fluoro'); area(C, Q(-1.4, -1.8, 1.6), Q(0.2, 0.0, 1.2), 1.0, '#ffffff', 60, 'hwfill', shadow=False)
    shm = mat('hwshelf', '#7a6a58', 0.5, 0.1)
    box(C, Q(0.82, 0.15, 0.95), (0.4, 1.6, 0.04), shm, 0.005); box(C, Q(0.82, 0.15, 1.45), (0.4, 1.6, 0.04), shm, 0.005); box(C, Q(1.04, 0.15, 1.0), (0.04, 1.6, 2.0), shm, 0)
    for yy in (-0.65, 0.95): box(C, Q(0.82, yy, 0.75), (0.4, 0.04, 1.5), shm, 0)
    def hammer(name):   # grip at the origin; handle along local +y to a steel head across x
        r = bpy.data.objects.new(name, None); C.objects.link(r)
        for o in [cyl(C, (0, 0.06, 0), 0.016, 0.3, mat('hhandle', '#a87040', 0.5), rot=(math.pi / 2, 0, 0)), box(C, (0, 0.21, 0), (0.13, 0.04, 0.04), mat('hhead', '#4a4c52', 0.3, metal=0.9), 0.006)]: o.parent = r
        return r
    def spraycan(name):
        r = bpy.data.objects.new(name, None); C.objects.link(r)
        for o in [cyl(C, (0, 0, 0), 0.036, 0.17, mat('can', '#e8b838', 0.3, metal=0.6)), cyl(C, (0, 0, 0.1), 0.026, 0.035, mat('capred', '#d82a2a', 0.4))]: o.parent = r
        return r
    for i, yy in enumerate((0.35, 0.55, 0.75)): h_ = hammer('hamshelf'); h_.location = Q(0.7, yy, 0.985); h_.rotation_euler = (0, 0, -math.pi / 2)
    for i, yy in enumerate((-0.5, -0.4, -0.3, -0.05)): c_ = spraycan('canshelf'); c_.location = Q(0.72 + 0.08 * (i % 2), yy, 1.06)
    for i, yy in enumerate((0.0, 0.2, 0.45)): h_ = hammer('hamtop'); h_.location = Q(0.72, yy, 1.485); h_.rotation_euler = (0, 0, -math.pi / 2)
    young = Character(C, 'young', tuple(Q(0.1, 0, 0)), 0.5, skin='#efc4a4', hair='#3a2418', hair_style='side', shirt='#2f4f8a', pants='#1d2a4a', eyes='#5a6a7a', cap='#1d2a4a', moustache=True)
    young.rest(F(93.3)); young.emote(F(93.4), 'worried'); young.emote(F(94.2), 'determined'); young.emote(F(96.0), 'smug'); young.blinks(93.5, 96.4, 1.6)
    for t, rz, rx in ((93.3, 0.0, 0.0), (93.6, 0.6, 0.0), (93.95, -0.55, 0.0), (94.2, 0.25, 0.2), (95.0, 0.2, 0.2), (95.3, 0.35, 0.15), (95.9, 0.35, 0.15), (96.15, -0.45, 0.0), (96.5, -0.45, 0.0)):
        young.pose(F(t), {'head': (rx, 0, rz)})   # guilty glances left/right, eyes on the shelf, then a look straight at us
    ham = hammer('hamstolen'); can = spraycan('canstolen')
    TUCK = Q(0.2, -0.17, 1.02); GRIP_OFF = V((-0.05, 0, 0.05))   # in front of his chest; wrist target relative to the item
    for t, p, r in ((93.3, Q(0.68, 0.05, 0.985), (0, 0, -math.pi / 2)), (94.5, Q(0.68, 0.05, 0.985), (0, 0, -math.pi / 2)), (94.95, TUCK, (math.pi / 2, 0, 0)), (95.1, TUCK - V((0, 0, 0.14)), (math.pi / 2, 0, 0))):
        key(ham, 'location', F(t), p); key(ham, 'rotation_euler', F(t), V(r))
    for t, p in ((93.3, Q(0.7, -0.15, 1.06)), (95.45, Q(0.7, -0.15, 1.06)), (95.85, TUCK + V((0, 0, 0.03))), (95.98, TUCK - V((0, 0, 0.12)))): key(can, 'location', F(t), p)
    for o in [ham] + list(ham.children): key_vis(o, F(95.1), True); key_vis(o, F(95.15), False)
    for o in [can] + list(can.children): key_vis(o, F(95.98), True); key_vis(o, F(96.03), False)
    young.hand('L', F(93.3), tuple(Q(0.35, 0.1, 0.75)), 0); young.hand('L', F(94.15), tuple(Q(0.4, 0.05, 0.9)), 0)
    young.hand('L', F(94.45), tuple(Q(0.68, 0.05, 0.985) + GRIP_OFF), 1); young.hand('L', F(94.5), tuple(Q(0.68, 0.05, 0.985) + GRIP_OFF), 1)
    young.hand('L', F(94.95), tuple(TUCK + GRIP_OFF), 1); young.hand('L', F(95.1), tuple(TUCK - V((0, 0, 0.14)) + GRIP_OFF), 1)
    young.hand('L', F(95.4), tuple(Q(0.7, -0.15, 1.06) + GRIP_OFF), 1); young.hand('L', F(95.45), tuple(Q(0.7, -0.15, 1.06) + GRIP_OFF), 1)
    young.hand('L', F(95.85), tuple(TUCK + V((0, 0, 0.03)) + GRIP_OFF), 1); young.hand('L', F(95.98), tuple(TUCK - V((0, 0, 0.12)) + GRIP_OFF), 1); young.hand('L', F(96.3), tuple(Q(0.35, 0.1, 0.75)), 0)
    young.hand('R', F(93.3), tuple(Q(0.0, 0.1, 0.75)), 0); young.hand('R', F(94.3), tuple(Q(0.11, -0.19, 1.08)), 1); young.hand('R', F(96.0), tuple(Q(0.11, -0.19, 1.08)), 1); young.hand('R', F(96.3), tuple(Q(0.0, 0.1, 0.75)), 0)   # holds his jacket open
    shot(sc, C, 'a1', 89.57, [(89.57, tuple(W0 + V((0.25, -1.3, 0.35))), tuple(W0 + V((0, 0, 0.25)))), (91.1, tuple(W0 + V((0.3, -1.55, 0.5))), tuple(W0 + V((0, 0, 0.35))))], lens=45, fstop=2.8)   # cuffs + his face
    shot(sc, C, 'a2', 91.15, [(91.15, (0.9, -2.0, 1.55), (0.5, 0.5, 1.5)), (93.35, (0.9, -1.8, 1.55), (0.5, 0.5, 1.5))], lens=45, fstop=2.8)
    shot(sc, C, 'a3', 93.4, [(93.4, tuple(Q(-0.8, -3.0, 1.55)), tuple(Q(0.38, 0.0, 1.2))), (96.5, tuple(Q(-0.7, -2.7, 1.52)), tuple(Q(0.36, 0.0, 1.2)))], lens=40, fstop=4)

# ---------------------------------------------------------------- output
def setup_engine(sc, engine, samples):
    if engine == 'CYCLES':
        sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
        sc.cycles.device = arg('--device', 'GPU')
        if sc.cycles.device == 'GPU':
            pr = bpy.context.preferences.addons['cycles'].preferences
            for kind in ('OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'):
                try: pr.compute_device_type = kind; pr.get_devices(); break
                except Exception: continue
            for d in pr.devices: d.use = True
    else:
        sc.render.engine = 'BLENDER_EEVEE'; sc.eevee.taa_render_samples = samples
ENGINE = arg('--engine', 'EEVEE'); SAMPLES = int(arg('--samples', '32'))
def scene_at(t):
    for n, (sc, C, rr) in S.items():
        for a, b in rr:
            if a <= t < b or (b >= 103.8 and a <= t <= b): return sc
    return None
if '--stills' in argv:
    outdir = arg('--out', os.path.join(HERE, 'stills')); os.makedirs(outdir, exist_ok=True)
    for t in [float(x) for x in arg('--stills').split(',')]:
        sc = scene_at(t)
        if sc is None: continue
        setup_engine(sc, ENGINE, SAMPLES); sc.frame_set(F(t))
        mk = [m for m in sc.timeline_markers if m.frame <= F(t) and m.camera]; sc.camera = max(mk, key=lambda m: m.frame).camera if mk else sc.camera
        sc.render.filepath = os.path.join(outdir, f'{t:07.2f}.png'); t0 = time.time(); bpy.ops.render.render(write_still=True, scene=sc.name); print(f'STILL {t} {sc.name} {time.time() - t0:.1f}s')
if '--render' in argv:
    outdir = arg('--out', os.path.join(HERE, 'frames')); os.makedirs(outdir, exist_ok=True)
    for n, (sc, C, rr) in S.items():
        setup_engine(sc, ENGINE, SAMPLES); sc.render.image_settings.file_format = 'PNG'
        for a, b in rr:
            sc.frame_start, sc.frame_end = max(1, F(a)), F(b) - 1 if b < 103.8 else F(b)
            if '--range' in argv: lo, hi = (int(x) for x in arg('--range').split('-')); sc.frame_start, sc.frame_end = max(sc.frame_start, lo), min(sc.frame_end, hi)
            if sc.frame_start > sc.frame_end: continue
            sc.render.filepath = os.path.join(outdir, '#####'); sc.render.use_overwrite = False
            print(f'RENDER {n} {sc.frame_start}-{sc.frame_end}'); bpy.ops.render.render(animation=True, scene=sc.name)
if '--save' in argv: bpy.ops.wm.save_as_mainfile(filepath=arg('--save'))
