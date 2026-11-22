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
def car(C, loc, color='#d98b3a', rotz=0.0, police=False):
    x, y, z = loc; body = mat('car' + color, color, 0.25, 0.8); dark = mat('tyre', '#1d2230', 0.7); glass = mat('cglass', '#9fc8e8', 0.08, 1.0)
    c = math.cos(rotz); s_ = math.sin(rotz)
    def P(dx, dy, dz): return (x + dx * c - dy * s_, y + dx * s_ + dy * c, dz)
    box(C, P(0, 0, 0.62), (1.8, 4.2, 0.55), body, 0.15, rot=(0, 0, rotz)); box(C, P(0, 0.2, 1.1), (1.6, 2.1, 0.5), glass, 0.15, rot=(0, 0, rotz))
    for dx in (-0.86, 0.86):
        for dy in (-1.35, 1.35): cyl(C, P(dx, dy, 0.34), 0.34, 0.26, dark, rot=(0, math.pi / 2, rotz))
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
    cork.scale = (1.4, 0.24, 1); cork.location.z = 2.32
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
    # kit: rests on the desk, Dan lifts it to show the camera (7.7-10.6 and 96.6-103.8); hands rest on the desk otherwise
    DESK_L, DESK_R = V((0.22, -0.2, 0.84)), V((-0.22, -0.2, 0.84)); SHOW = V((0.05, -0.35, 1.28))
    for t, side, p, inf in [(0, 'L', DESK_L, 1), (0, 'R', DESK_R, 1), (7.6, 'L', DESK_L, 1), (8.3, 'L', SHOW + V((0.08, 0, -0.05)), 1), (10.6, 'L', SHOW + V((0.08, 0, -0.05)), 1),
                            (96.5, 'L', SHOW + V((0.08, 0, -0.05)), 1), (103.8, 'L', SHOW + V((0.08, 0, -0.05)), 1), (96.5, 'R', DESK_R, 1),
                            (100.6, 'R', DESK_R, 1), (101.2, 'R', V((-0.12, -0.55, 1.32)), 1), (103.8, 'R', V((-0.12, -0.55, 1.32)), 1),
                            (4.2, 'R', DESK_R, 1), (4.8, 'R', V((-0.45, -0.35, 1.35)), 1), (6.9, 'R', V((-0.45, -0.35, 1.35)), 1), (7.4, 'R', DESK_R, 1)]:
        dan.hand(side, F(t), p, inf)
    for t, p in [(0, V((0.3, -0.35, 0.9))), (7.6, V((0.3, -0.35, 0.9))), (8.3, SHOW), (10.63, SHOW), (96.5, SHOW), (103.8, SHOW)]: key(KIT, 'location', F(t), p)
    for i, c in enumerate(cous):   # cousin photos pop onto the board on "cousins"
        s0 = c.scale.copy(); key(c, 'scale', 1, s0 * 0.001); key(c, 'scale', F(4.3 + i * 0.25), s0 * 0.001); key(c, 'scale', F(4.6 + i * 0.25), s0)
    shot(sc, C, 'h1', 0, [(0, (0.25, -3.4, 1.3), (0, 0.3, 1.25)), (3.9, (0.22, -3.0, 1.32), (0, 0.3, 1.28))], lens=55, fstop=2.8)
    shot(sc, C, 'h2', 4.0, [(4.0, (-1.9, 0.1, 1.68), (-2.25, 2.1, 1.7)), (7.6, (-1.95, 0.35, 1.68), (-2.25, 2.1, 1.7))], lens=40, fstop=4)
    shot(sc, C, 'h3', 7.65, [(7.65, (0.15, -2.2, 1.35), (0.05, 0.2, 1.3)), (10.63, (0.08, -1.2, 1.3), SHOW)], lens=55, fstop=2.4)
    shot(sc, C, 'h4', 96.5, [(96.5, (0.25, -2.6, 1.32), (0.02, 0.3, 1.3)), (98.9, (0.25, -2.4, 1.32), (0.02, 0.3, 1.3))], lens=50, fstop=2.8)
    shot(sc, C, 'h5', 99.0, [(99.0, (-1.75, 0.6, 1.62), (-2.15, 2.1, 1.62)), (100.25, (-1.78, 0.7, 1.62), (-2.15, 2.1, 1.62))], lens=40, fstop=4)
    shot(sc, C, 'h6', 100.3, [(100.3, (0.1, -3.2, 1.32), (0.02, 0.3, 1.32)), (103.81, (0.05, -1.9, 1.45), (0.02, 0.3, 1.5))], lens=55, fstop=2.2)

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
        point(C, (2.2, y, 3.8), '#ffcf8a', 600, 0.15)
    for y in [k * 0.35 for k in range(-28, 28)]: box(C, (3.75, y, 0.4), (0.08, 0.12, 0.8), mat('fence', '#e8e0d0', 0.6), 0.02)
    car(C, (1.0, 6, 0), '#d98b3a'); car(C, (-1.1, -9, 0), '#4f8a6a', math.pi)
    bg = sc.world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*hexc('#0b1430'), 1); bg.inputs['Strength'].default_value = 1.2
    sun(C, (0.3, 0.6, -0.7), '#9fb8ff', 2.6, 1.0)
    area(C, (0, -6, 8), (2, 2, 0), 12, '#7f9cff', 1500, 'moonfill', shadow=False)
    villain = Character(C, 'villain', (2.9, 8, 0), math.pi, skin='#1a1d26', shirt='#14161c', pants='#1a1c22', shoes='#0c0c0c', hair_style='none', hood='#121419', eyes='#c8c0a8')
    villain.rest(F(10.6)); villain.emote(F(10.7), 'menacing'); villain.walk(11.0, 16.9, (2.9, 8), (2.9, -2.5), 0.6)
    flash = cyl(C, (0, 0, 0), 0.03, 0.2, mat('flash', '#3a3a40', 0.3, metal=0.8)); fl = spot(C, (0, 0, 0), (0, -1, -0.6), '#fff2c8', 120, 35, 0.6)
    flash.parent = villain.arm; flash.parent_type = 'BONE'; flash.parent_bone = 'hand.R'; flash.location = (0, 0.05, 0); flash.rotation_euler = (math.pi / 2, 0, 0)
    fl.parent = flash; fl.location = (0, 0, 0); fl.rotation_euler = (math.radians(-80), 0, 0)
    point(C, (2.9, 0.5, 1.2), '#ff3a2a', 25, 0.3)   # red rim behind the villain (menace)
    shot(sc, C, 's1', 10.63, [(10.63, (-1.0, -14, 7.5), (1.5, 6, 1.0)), (13.9, (-0.2, -11, 3.5), (2.0, 5, 1.2))], lens=35, fstop=None)
    shot(sc, C, 's2', 13.95, [(13.95, (2.4, -3.8, 0.75), (2.9, 3.0, 1.45)), (16.9, (2.5, -4.6, 0.7), (2.9, -1.0, 1.5))], lens=40, fstop=2.8, focus=None)

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
    wife = Character(C, 'wife', (-0.42, 0.95, -0.12), 0, skin='#f3c7a5', hair='#c8742c', hair_style='bob', shirt='#e8a0b8', pants='#e8a0b8')
    hus = Character(C, 'hus', (0.42, 0.95, -0.12), 0, hair='#2a1c12', hair_style='tuft', shirt='#9ab8e0', pants='#9ab8e0', moustache=True)
    for c, e1 in ((wife, 'worried'), (hus, 'worried')):
        c.rest(F(16.9)); c.sit(F(16.9)); c.emote(F(17.0), e1); c.blinks(16.9, 22.8, 2.6)
        c.pose(F(16.9), {'head': (0, 0, math.radians(-25 if c is wife else -15))})
    hus.emote(F(20.8), 'scared')
    batm = mat('bat', '#d8a868', 0.35, 0.3); bat = cyl(C, (0, 0, 0), 0.035, 0.8, batm, r2=0.018); bat.parent = hus.arm; bat.parent_type = 'BONE'; bat.parent_bone = 'hand.R'; bat.location = (0, 0.15, 0); bat.rotation_euler = (0, 0, 0)
    wife.hand('L', F(16.9), (-0.3, 0.55, 0.95)); wife.hand('R', F(16.9), (-0.52, 0.55, 0.95))
    hus.hand('R', F(16.9), (0.32, 0.55, 0.9)); hus.hand('R', F(20.4), (0.32, 0.55, 0.9)); hus.hand('R', F(21.0), (0.3, 0.45, 1.25))
    hus.hand('L', F(16.9), (0.55, 0.6, 0.88)); hus.hand('L', F(20.4), (0.55, 0.6, 0.88)); hus.hand('L', F(21.0), (0.38, 0.45, 1.05))
    for f, e in ((F(22.45), 120), (F(22.62), 0)): key(blight.data, 'energy', f, e)
    shot(sc, C, 'b1', 16.9, [(16.9, (-2.2, -1.75, 0.9), (-2.86, -0.95, 0.8)), (19.5, (-2.25, -1.6, 0.88), (-2.86, -0.95, 0.8))], lens=55, fstop=2.0)
    shot(sc, C, 'b2', 19.55, [(19.55, (0.3, -2.4, 1.35), (0, 0.9, 1.1)), (22.79, (0.45, -1.7, 1.3), (0.4, 0.95, 1.2))], lens=45, fstop=2.8)

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
    cals = {y: board(C, (0.6, 1.97, 1.9), (0.42, 0.56), os.path.join(TEX, f'cal{y}.png'), '#fbf8f0') for y in (1976, 1979, 1982, 1984, 1986)}
    for i, (y, o) in enumerate(cals.items()):   # calendar flips 1976 -> 1986
        t_on = 25.7 + i * 0.35; o.location.y -= 0.002 * i
        key_vis(o, 1, i == 0); key_vis(o, F(t_on), True)
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
    det86 = Character(C, 'det86', (0.55, 0.85, -0.12), 0, hair='#5a4030', hair_style='side', shirt='#e8e4d8', tie='#7a3a2a', moustache=True, skin='#e8b796', pants='#5a4a3a')
    det86.rest(F(22.8)); det86.blinks(22.8, 32.2, 3.0)
    for t, e in ((22.9, 'worried'), (25.6, 'thinking'), (28.0, 'sad'), (30.3, 'surprised'), (31.0, 'determined')): det86.emote(F(t), e)
    det86.hand('L', F(22.8), (0.75, 0.35, 0.83)); det86.hand('R', F(22.8), (0.35, 0.35, 0.83))
    det86.pose(F(22.8), {'head': (0, 0, 0)}); det86.pose(F(25.6), {'head': (0, 0, math.radians(25))}); det86.pose(F(26.5), {'head': (0, 0, math.radians(30))}); det86.pose(F(28), {'head': (math.radians(10), 0, 0)})
    shot(sc, C, 'c1', 22.79, [(22.79, (-1.2, -0.15, 1.65), (-1.2, 1.97, 1.62)), (25.5, (-1.2, 0.1, 1.65), (-1.2, 1.97, 1.62))], lens=35, fstop=None)
    shot(sc, C, 'c2', 25.55, [(25.55, (0.6, -2.0, 1.35), (0.6, 1.0, 1.5)), (30.2, (0.6, -1.7, 1.38), (0.6, 1.0, 1.5))], lens=40, fstop=2.8)
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
    mon_scr = plane(C, (-0.6, 0.85, 1.12), (0.6, 0.375), image_mat('site', os.path.join(TEX, 'site.mp4'), emit_s=1.2, sequence=(F(47.6), 270)), rot=(math.radians(95), 0, 0))
    box(C, (-0.6, 0.88, 1.12), (0.66, 0.04, 0.42), mat('monb', '#2a2e38', 0.3), 0.015); cyl(C, (-0.6, 0.9, 0.9), 0.02, 0.22, mat('monb', '#2a2e38', 0.3))
    box(C, (1.4, 2.12, 1.65), (1.2, 0.06, 2.0), mat('tvb', '#1d2230', 0.3), 0.03)
    chart = plane(C, (1.4, 2.08, 1.65), (1.1, 1.92), image_mat('chart', os.path.join(TEX, 'chart.mp4'), emit_s=1.5, sequence=(F(56.6), 504)), rot=(math.pi / 2, 0, 0))
    key_vis(chart, 1, False); key_vis(chart, F(56.55), True)
    plane(C, (1.4, 2.085, 1.65), (1.1, 1.92), mat('tvoff', '#0c1018', 0.15, 0.8), rot=(math.pi / 2, 0, 0))
    plant(C, (-2.6, 1.6, 0), 1.1); plant(C, (3.0, 1.5, 0), 0.9)
    for i in range(5): box(C, (-2.2 + i * 0.14, 2.1, 1.45), (0.1, 0.22, 0.32), mat(f'book{i}', ['#e8603c', '#3a7ca5', '#f2c14e', '#5fb36b', '#7a5cc8'][i], 0.5), 0.01)
    box(C, (-1.9, 2.1, 1.27), (1.0, 0.26, 0.04), WOOD_L, 0.01)
    look_day(sc, C, (0.2, 1.0, 1.3), sun_dir=(0.9, 0.5, -0.65))
    det1 = Character(C, 'det1', (-0.85, 1.25, 0), math.pi * 0, skin='#c98f6a', hair='#2a1a12', hair_style='bun', shirt='#f2efe6', coat='#6a5a8a', pants='#2a2e3a', eyes='#3a2a1a')
    det2 = Character(C, 'det2', (-0.15, 1.3, 0), 0, hair='#7a7a7a', hair_style='side', shirt='#e8e8e0', tie='#2f4f8a', glasses=True, skin='#f0c09a', pants='#3a3f52')
    for c in (det1, det2): c.rest(F(47.6)); c.blinks(47.6, 73.4, 3.1)
    for t, e in ((47.8, 'calm'), (50.5, 'surprised'), (51.3, 'determined'), (57.4, 'calm'), (71.2, 'happy')): det1.emote(F(t), e)
    for t, e in ((47.8, 'thinking'), (51.0, 'determined'), (62.8, 'calm'), (71.2, 'happy')): det2.emote(F(t), e)
    for t, p in ((47.6, (-0.75, 0.75, 0.84)), (52.0, (-0.75, 0.75, 0.84)), (52.3, (-0.7, 0.6, 0.83)), (56.4, (-0.7, 0.6, 0.83)), (56.8, (-0.75, 0.75, 0.84))): det1.hand('R', F(t), p)
    for t, p in ((47.6, (-1.0, 0.75, 0.84)), (52.3, (-0.85, 0.6, 0.83)), (56.4, (-0.85, 0.6, 0.83)), (56.8, (-1.0, 0.75, 0.84))): det1.hand('L', F(t), p)
    det2.hand('R', F(48.5), (-0.25, 1.05, 1.05), 0); det2.hand('R', F(49.0), (-0.2, 0.98, 1.42), 1); det2.hand('R', F(51.0), (-0.2, 0.98, 1.42), 1); det2.hand('R', F(51.5), (-0.25, 1.05, 1.05), 0)
    det2.walk(56.8, 58.3, (-0.15, 1.3), (0.55, 1.65)); det2.place(F(58.4), (0.55, 1.65, 0), math.radians(-60))
    for t0, t1, (u, v) in ((66.6, 70.9, (0.3, 0.55)), (71.3, 73.4, (0.74, 0.6))):
        p = (1.4 + (u - 0.5) * 1.1, 2.0, 1.65 + (0.5 - v) * 1.92)
        det2.hand('L', F(t0), (0.8, 1.7, 0.9), 0); det2.hand('L', F(t0 + 0.4), p, 1); det2.hand('L', F(t1 - 0.4), p, 1); det2.hand('L', F(t1), (0.8, 1.7, 0.9), 0)
    shot(sc, C, 'o1', 47.65, [(47.65, (-0.5, -2.2, 1.45), (-0.5, 1.2, 1.35)), (52.15, (-0.5, -1.9, 1.45), (-0.5, 1.2, 1.35))], lens=45, fstop=2.8)
    shot(sc, C, 'o2', 52.2, [(52.2, (-0.6, 0.05, 1.18), (-0.6, 0.85, 1.12)), (56.55, (-0.6, 0.2, 1.15), (-0.6, 0.85, 1.12))], lens=40, fstop=None)
    for name, t0, t1, a, b in (('o3', 56.6, 59.8, (1.2, 0.5, 1.2), (1.18, 2.08, 1.15)), ('o4', 59.85, 62.9, (1.4, 0.9, 0.95), (1.4, 2.08, 0.9)),
                                ('o5', 62.95, 66.4, (1.4, 0.7, 2.05), (1.4, 2.08, 2.05)), ('o7', 71.15, 73.31, (1.6, 0.9, 1.5), (1.62, 2.08, 1.45))):
        shot(sc, C, name, t0, [(t0, a, b), (t1, (a[0], a[1] + 0.25, a[2]), b)], lens=35, fstop=None)
    shot(sc, C, 'o6', 66.45, [(66.45, (0.4, -1.7, 1.55), (1.0, 2.0, 1.6)), (71.1, (0.5, -1.5, 1.55), (1.0, 2.0, 1.6))], lens=35, fstop=4)

# ================================================================ 8. SUBURB (day)  73.31-88.37
if SET == 'suburb':
    sc, C = scene('suburb', [(73.31, 88.37)])
    plane(C, (0, 0, 0), (60, 60), mat('grassd', '#5fae48', 0.7)); plane(C, (0, 0, 0.005), (4, 60), mat('roadd', '#5a5f6a', 0.6))
    house(C, (8.2, 0.5, 0), '#f4e0b0', '#7a5a8a', rotz=math.pi / 2); tree(C, (4.6, 3.5, 0), 3); tree(C, (4.6, -3.0, 0), 2.6)
    store = box(C, (-7.5, -9, 1.7), (4, 8, 3.4), mat('storew', '#f4f0e6', 0.6), 0.1)
    sg = board(C, (-5.45, -9, 3.0), (3.0, 0.6), os.path.join(TEX, 'grocery.png'), '#2fa86a'); sg.rotation_euler = (math.pi / 2, 0, math.pi / 2)
    for o in [sg]: pass
    box(C, (-5.47, -9.8, 1.1), (0.06, 1.4, 2.2), mat('storedoor', '#9fc8e8', 0.08, 1.0), 0.03)
    for dy in (-11.5, -6.6): box(C, (-5.47, dy, 1.4), (0.06, 1.8, 1.5), mat('storewin', '#bfe0f4', 0.08, 1.0), 0.03)
    car(C, (-3.9, -10.4, 0), '#b8c8d8'); box(C, (-2.98, -10.15, 0.86), (0.04, 0.17, 0.045), METAL, 0.015, name='handle'); car(C, (-1.1, 4.5, 0), '#e8e4da', math.pi)
    for y in (-2.5, 2.5): box(C, (4.5, y, 0.45), (0.06, 0.06, 0.9), mat('mbox', '#2f5fa8', 0.4), 0.02)
    look_day(sc, C, (2, -2, 1), sun_dir=(0.7, 0.5, -0.6))
    old = Character(C, 'old', (4.7, 0.3, 0), -math.pi / 2 + 0.5, skin='#efc4a4', hair='#e0e0e0', hair_style='bald', shirt='#c8b48a', pants='#6a6a6a', eyes='#5a6a7a', scale=1.0)
    old.rest(F(73.3)); old.emote(F(73.4), 'calm'); old.blinks(73.3, 85, 3.4); bpy.context.view_layer.update(); old.hand('R', F(73.3), tuple(old.arm.matrix_world @ V((-0.12, -0.35, 0.95))))
    nozzle = cyl(C, (0, 0, 0), 0.025, 0.14, mat('noz', '#2fa86a', 0.3)); nozzle.parent = old.arm; nozzle.parent_type = 'BONE'; nozzle.parent_bone = 'hand.R'; nozzle.location = (0, 0.06, 0)
    old.place(F(73.3), (4.7, 0.3, 0), -math.pi / 2 + 0.5); old.place(F(82.45), (4.7, 0.3, 0), -math.pi / 2 + 0.5); old.place(F(82.5), (-5.05, -10.2, 0), -math.pi / 2); old.walk(82.9, 84.7, (-5.05, -10.2), (-5.75, -9.8))
    key_vis(nozzle, F(82.4), True); key_vis(nozzle, F(82.5), False)
    for o in old.parts: key_vis(o, F(84.75), True); key_vis(o, F(84.8), False)
    d1s = Character(C, 'd1s', (0.2, 6.4, 0), math.radians(70), skin='#c98f6a', hair='#2a1a12', hair_style='bun', shirt='#f2efe6', coat='#6a5a8a', pants='#2a2e3a')
    d2s = Character(C, 'd2s', (0.1, 5.6, 0), math.radians(60), hair='#7a7a7a', hair_style='side', shirt='#e8e8e0', tie='#2f4f8a', glasses=True, skin='#f0c09a', pants='#3a3f52')
    for c in (d1s, d2s): c.rest(F(73.3)); c.emote(F(73.4), 'determined'); c.blinks(73.3, 88.4, 3.0)
    bino = box(C, (0, 0, 0), (0.12, 0.08, 0.05), mat('bino', '#1d2230', 0.5), 0.015)
    bino.parent = d2s.arm; bino.parent_type = 'BONE'; bino.parent_bone = 'head'; bino.location = (0, -0.195, 0.33)
    bpy.context.view_layer.update()
    for sd, dx in (('L', 0.07), ('R', -0.07)): d2s.hand(sd, F(73.3), tuple(d2s.arm.matrix_world @ V((dx, -0.33, 1.63))))
    officer = Character(C, 'officer', (-1.6, -10.05, 0), -math.pi / 2, skin='#8a5a3c', hair_style='none', shirt='#2f4f8a', pants='#1d2a4a', eyes='#3a2a1a', cap='#1d2a4a')
    officer.rest(F(84.5)); officer.emote(F(84.6), 'determined'); officer.walk(84.6, 85.25, (-1.6, -10.05), (-2.55, -10.05))
    # swab: its own object wiping the handle; the officer's hand follows the top of the stick
    TIP = V((-2.99, -10.15, 0.86)); TOPO = V((0.14, 0.0, 0.11))
    swab2 = bpy.data.objects.new('swabrig', None); C.objects.link(swab2)
    stick = capsule(C, (0, 0, 0), tuple(TOPO), 0.006, mat('stick', '#f4f4f4', 0.4), 'stick'); bud2 = sphere(C, (0, 0, 0), 0.02, mat('cotton', '#ffffff', 0.9), (1.7, 1, 1), seg=16)
    for o in stick + [bud2]: o.parent = swab2
    key_vis(swab2, 1, False)
    for o in stick + [bud2]: key_vis(o, 1, False); key_vis(o, F(85.5), True)
    for k, t in enumerate([85.5, 85.9] + [86.2 + j * 0.25 for j in range(8)]):
        p = TIP + V((0.25 if k == 0 else 0, 0.05 * ((k % 2) * 2 - 1) if k > 1 else 0, 0.08 if k == 0 else 0))
        key(swab2, 'location', F(t), p); officer.hand('L', F(t), tuple(p + TOPO + V((0.05, 0, -0.015))))
    officer.place(F(85.3), (-2.55, -10.05, 0), -math.pi / 2); officer.place(F(85.7), (-2.7, -10.0, 0), -math.pi / 2)   # step close to the car, lean in
    officer.pose(F(85.3), {'spine': (0, 0, 0)}); officer.pose(F(85.8), {'spine': (0.3, 0, 0), 'neck': (0.25, 0, 0)})
    shot(sc, C, 'u1', 73.31, [(73.31, (2.2, -1.9, 1.5), (4.7, 0.3, 1.4)), (79.9, (2.1, -0.9, 1.55), (4.7, 0.3, 1.4))], lens=45, fstop=2.8)
    shot(sc, C, 'u2', 79.95, [(79.95, (2.3, 5.2, 1.55), (0.15, 6.0, 1.55)), (82.45, (2.1, 5.4, 1.55), (0.15, 6.0, 1.55))], lens=45, fstop=2.8)
    shot(sc, C, 'u3', 82.5, [(82.5, (-1.0, -5.5, 1.7), (-5.0, -10.0, 1.2)), (85.0, (-1.2, -6.0, 1.6), (-5.3, -9.9, 1.2))], lens=35, fstop=None)
    shot(sc, C, 'u4', 85.05, [(85.05, (-1.5, -11.6, 1.4), (-2.6, -10.0, 1.0)), (86.6, (-2.45, -11.15, 1.05), (-2.95, -10.15, 0.92)), (88.37, (-2.72, -10.75, 0.97), (-2.97, -10.15, 0.92))], lens=50, fstop=2.0)

# ================================================================ 9. LAB MATCH (day)  88.37-89.57
if SET == 'match':
    sc, C = scene('match', [(88.37, 89.57)])
    room(C, '#d8ecf0', '#e8eef2', back_y=1.5)
    box(C, (0, 1.0, 0.45), (3, 0.7, 0.9), mat('bench', '#f4f4f4', 0.3, 0.3), 0.04)
    ms0 = plane(C, (-0.2, 1.2, 1.5), (1.2, 0.75), image_mat('match0', os.path.join(TEX, 'match0.png'), emit_s=1.5), rot=(math.pi / 2, 0, 0))
    ms1 = plane(C, (-0.2, 1.195, 1.5), (1.2, 0.75), image_mat('match1', os.path.join(TEX, 'match1.png'), emit_s=1.5), rot=(math.pi / 2, 0, 0))
    key_vis(ms1, 1, False); key_vis(ms1, F(89.0), True); key_vis(ms0, 1, True); key_vis(ms0, F(89.0), False)
    look_day(sc, C, (0, 0.5, 1.3), sun_dir=(0.6, 0.7, -0.6))
    dm = Character(C, 'dm', (0.9, 0.2, 0), math.radians(25), hair='#7a7a7a', hair_style='side', shirt='#e8e8e0', tie='#2f4f8a', glasses=True, skin='#f0c09a', pants='#3a3f52')
    dm.rest(F(88.3)); dm.emote(F(88.4), 'surprised'); dm.emote(F(89.0), 'joy')
    dm.hand('L', F(88.9), (1.15, 0.0, 0.8), 0); dm.hand('L', F(89.15), (1.3, -0.05, 1.7), 1); dm.hand('R', F(88.9), (0.65, 0.0, 0.8), 0); dm.hand('R', F(89.15), (0.55, -0.05, 1.7), 1)
    shot(sc, C, 'm1', 88.37, [(88.37, (0.6, -2.4, 1.5), (0.2, 1.0, 1.45)), (89.57, (0.55, -1.9, 1.5), (0.2, 1.0, 1.45))], lens=35, fstop=2.8)

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
    cm_ = mat('cuff', '#c8ccd4', 0.15, metal=1.0)
    for dx in (-0.07, 0.07): torus(C, tuple(W0 + V((dx, 0, -0.05))), 0.05, 0.011, cm_, rot=(math.pi / 2, 0, 0))
    capsule(C, tuple(W0 + V((-0.03, 0, -0.06))), tuple(W0 + V((0.03, 0, -0.06))), 0.006, cm_, 'chain')
    offc = Character(C, 'offc', (1.15, 0.3, 0), math.radians(-30), skin='#8a5a3c', hair_style='none', shirt='#2f4f8a', pants='#1d2a4a', eyes='#3a2a1a', cap='#1d2a4a')
    offc.rest(F(89.5)); offc.emote(F(89.6), 'determined'); offc.hand('R', F(89.5), (0.75, 0.4, 1.15))
    det1a = Character(C, 'det1a', (-0.45, 0.7, 0), math.radians(20), skin='#c98f6a', hair='#2a1a12', hair_style='bun', shirt='#f2efe6', coat='#6a5a8a', pants='#2a2e3a')
    det1a.rest(F(89.5)); det1a.emote(F(89.6), 'determined')
    bpy.context.view_layer.update()
    paper = plane(C, (0, 0, 0), (0.42, 0.56), image_mat('news', os.path.join(TEX, 'newspaper.png'), rough=0.8), rot=(math.pi / 2, 0, math.radians(20)))
    P0 = det1a.arm.matrix_world @ V((0, -0.35, 0.95)); P1 = det1a.arm.matrix_world @ V((0, -0.45, 1.35))
    key(paper, 'location', F(89.5), P0); key(paper, 'location', F(90.9), P0); key(paper, 'location', F(91.5), P1); key(paper, 'location', F(96.5), P1)
    for sd, dx in (('L', 0.19), ('R', -0.19)):
        for t, base in ((89.5, P0), (90.9, P0), (91.5, P1), (96.5, P1)): det1a.hand(sd, F(t), tuple(base + det1a.arm.matrix_world.to_3x3() @ V((dx, 0.01, -0.18))))
    shot(sc, C, 'a1', 89.57, [(89.57, tuple(W0 + V((0.12, -0.5, 0.1))), tuple(W0 + V((0, 0, -0.04)))), (91.1, tuple(W0 + V((0.15, -0.8, 0.25))), tuple(W0 + V((0, 0, 0.1))))], lens=50, fstop=2.0)
    shot(sc, C, 'a2', 91.15, [(91.15, (0.9, -2.0, 1.55), (0.5, 0.5, 1.5)), (93.35, (0.9, -1.8, 1.55), (0.5, 0.5, 1.5))], lens=45, fstop=2.8)
    shot(sc, C, 'a3', 93.4, [(93.4, tuple(P1 + V((0.2, -1.4, 0.05))), tuple(P1)), (96.5, tuple(P1 + V((0.15, -0.95, 0.02))), tuple(P1))], lens=45, fstop=2.8)

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
