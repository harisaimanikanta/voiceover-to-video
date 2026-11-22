# Blender kit for voiceover-to-video (v4 renderer): materials, two lighting looks (night practical / day sunbeam),
# rigged cute characters (armature + IK hands + face rig with blink/emotion/lip-sync), props, shots with cuts.
# Coordinates: Z up, characters face -Y (toward cameras at negative Y). Units: metres. Everything is keyed in
# absolute frames (30 fps) so every scene shares one timeline.
import bpy, math, random
from mathutils import Vector, Matrix, Euler

FPS = 30
def F(t): return int(round(t * FPS))
def hexc(h): h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))
_mats = {}
def mat(name, color, rough=0.4, coat=0.0, metal=0.0, emit=None, emit_s=0.0, sss=0.0, alpha=1.0, transmission=0.0):
    key = (name, color, rough, coat, metal, emit, emit_s, sss, alpha, transmission)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    c = hexc(color) if isinstance(color, str) else color
    b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.08
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (1.0, 0.4, 0.25); b.inputs['Subsurface Scale'].default_value = 0.02
    if emit: e = hexc(emit) if isinstance(emit, str) else emit; b.inputs['Emission Color'].default_value = (*e, 1); b.inputs['Emission Strength'].default_value = emit_s
    if transmission: b.inputs['Transmission Weight'].default_value = transmission
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    _mats[key] = m; return m

def image_mat(name, path, emit_s=0.0, rough=0.5, sequence=None):
    """Material from an image (or image sequence: sequence=(frame_start, frame_count))."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); img = bpy.data.images.load(path); t.image = img
    if sequence:   # image sequence or movie file (mp4): plays from scene frame sequence[0]
        if not path.lower().endswith(('.mp4', '.mov', '.webm')): img.source = 'SEQUENCE'
        t.image_user.frame_start = sequence[0]; t.image_user.frame_duration = sequence[1]; t.image_user.use_auto_refresh = True
    nt.links.new(t.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
    if emit_s: nt.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit_s
    return m

# ---------------------------------------------------------------- geometry helpers (all return the object)
def _link(o, coll):
    for c in o.users_collection: c.objects.unlink(o)
    coll.objects.link(o); return o
def _smooth(o):
    for p in o.data.polygons: p.use_smooth = True
    return o
def sphere(coll, loc, r, m, scale=(1, 1, 1), seg=48, name='sph'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(12, seg // 2), radius=r, location=loc); o = bpy.context.object; o.name = name; o.scale = scale
    o.data.materials.append(m); _smooth(o); return _link(o, coll)
def box(coll, loc, size, m, bevel=0.02, rot=(0, 0, 0), name='box'):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot); o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel: md = o.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = 4; md.limit_method = 'NONE'
    o.data.materials.append(m); _smooth(o)
    return _link(o, coll)
def cyl(coll, loc, r, depth, m, rot=(0, 0, 0), verts=40, name='cyl', r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); _smooth(o); return _link(o, coll)
def torus(coll, loc, R, r, m, rot=(0, 0, 0), scale=(1, 1, 1), name='tor', arc=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=48, minor_segments=16)
    o = bpy.context.object; o.name = name; o.scale = scale; o.data.materials.append(m); _smooth(o)
    if arc is not None:   # keep only part of the ring (angle range in radians around local Z)
        import bmesh
        bm = bmesh.new(); bm.from_mesh(o.data)
        kill = [v for v in bm.verts if not (arc[0] <= math.atan2(v.co.y, v.co.x) <= arc[1])]
        bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(o.data); bm.free()
    return _link(o, coll)
def capsule(coll, a, b, r, m, name='cap'):
    a, b = Vector(a), Vector(b); d = b - a; c = (a + b) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r, depth=max(d.length, 1e-3), location=c); o = bpy.context.object; o.name = name
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized()); o.data.materials.append(m); _smooth(o); _link(o, coll)
    e1 = sphere(coll, tuple(a), r, m, seg=24, name=name + '_a'); e2 = sphere(coll, tuple(b), r, m, seg=24, name=name + '_b')
    return [o, e1, e2]
def plane(coll, loc, size, m, rot=(0, 0, 0), name='plane'):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = name; o.scale = (size[0], size[1], 1); o.data.materials.append(m); return _link(o, coll)
def text(coll, s, loc, size, m, rot=(math.pi / 2, 0, 0), extrude=0.0, align='CENTER', name='txt'):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = s; cu.size = size; cu.extrude = extrude; cu.align_x = align; cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu); o.location = loc; o.rotation_euler = rot; o.data.materials.append(m); coll.objects.link(o); return o

def key(o, path, frame, value=None, index=-1):
    if value is not None:
        if index >= 0: getattr(o, path)[index] = value
        else: setattr(o, path, value)
    o.keyframe_insert(path, frame=frame, index=index)
def key_vis(o, frame, visible):
    o.hide_render = not visible; o.hide_viewport = not visible; o.keyframe_insert('hide_render', frame=frame); o.keyframe_insert('hide_viewport', frame=frame)

# ---------------------------------------------------------------- scenes, looks
def new_scene(name, fs, fe, res=(1080, 1920)):
    sc = bpy.data.scenes.new(name); sc.frame_start = fs; sc.frame_end = fe; sc.render.fps = FPS
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.engine = 'BLENDER_EEVEE'
    try:
        sc.eevee.taa_render_samples = 32; sc.eevee.use_shadows = True; sc.eevee.use_raytracing = True
        sc.eevee.ray_tracing_options.resolution_scale = '2'; sc.eevee.use_fast_gi = True
    except Exception: pass
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    w = bpy.data.worlds.new(name + '_world'); sc.world = w; w.use_nodes = True
    coll = bpy.data.collections.new(name); sc.collection.children.link(coll); bpy.context.scene.collection.children.link(coll)   # build in the main scene, render per set scene
    return sc, coll

def area(coll, loc, aim, size, color, power, name='area', shadow=True):
    d = bpy.data.lights.new(name, 'AREA'); d.size = size; d.color = hexc(color); d.energy = power; d.use_shadow = shadow
    o = bpy.data.objects.new(name, d); o.location = loc; coll.objects.link(o)
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
def point(coll, loc, color, power, radius=0.05, name='pt'):
    d = bpy.data.lights.new(name, 'POINT'); d.energy = power; d.color = hexc(color); d.shadow_soft_size = radius
    o = bpy.data.objects.new(name, d); o.location = loc; coll.objects.link(o); return o
def spot(coll, loc, aim, color, power, angle=60, blend=1.0, radius=0.05, name='spot'):
    d = bpy.data.lights.new(name, 'SPOT'); d.energy = power; d.color = hexc(color); d.spot_size = math.radians(angle); d.spot_blend = blend; d.shadow_soft_size = radius
    o = bpy.data.objects.new(name, d); o.location = loc; coll.objects.link(o); o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
def sun(coll, direction, color, energy, angle=2.5, name='sun'):
    d = bpy.data.lights.new(name, 'SUN'); d.energy = energy; d.color = hexc(color); d.angle = math.radians(angle)
    o = bpy.data.objects.new(name, d); coll.objects.link(o); o.rotation_euler = Vector(direction).to_track_quat('-Z', 'Y').to_euler(); return o

def look_night(sc, coll, lamp_pos, subject, window_dir=(0.6, 1, 0.4), sky='#0a1530'):
    """Look A (night practical): low blue ambient, warm lamp key with soft shadows, cool window rim, faint warm bounce."""
    bg = sc.world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*hexc(sky), 1); bg.inputs['Strength'].default_value = 0.5
    S = Vector(subject); L = Vector(lamp_pos)
    point(coll, lamp_pos, '#ffc070', 60, 0.05, 'lamp_bulb')
    area(coll, tuple(L + (S - L) * 0.25), subject, 0.35, '#ffc890', 120, 'lamp_key')
    area(coll, tuple(S + Vector(window_dir).normalized() * 3), subject, 2.0, '#7fa8ff', 260, 'window_rim', shadow=False)
    area(coll, tuple(S + Vector((0, -1.5, -0.6))), subject, 1.0, '#ff9a5a', 18, 'bounce', shadow=False)

def look_day(sc, coll, subject, sun_dir=(1.0, 0.55, -0.75), sky='#dcecff'):
    """Look B (day sunbeam): one strong side sun with crisp soft shadows, weak cool fill, low ambient, punchy grade."""
    bg = sc.world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*hexc(sky), 1); bg.inputs['Strength'].default_value = 0.3
    sun(coll, sun_dir, '#ffd9a8', 5.5, 2.5)
    S = Vector(subject); area(coll, tuple(S + Vector((2.4, -2.2, 0.6))), subject, 2.0, '#9fc8ff', 90, 'fill', shadow=False)

# ---------------------------------------------------------------- shots (cuts via timeline markers)
def shot(sc, coll, name, t0, keys, lens=50, fstop=2.8, focus=None):
    """keys = [(t, (x,y,z) pos, (x,y,z) aim), ...]. Camera eases between keys; bound to a marker at t0 (a cut)."""
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_width = 36; cd.dof.use_dof = fstop is not None
    if fstop: cd.dof.aperture_fstop = fstop
    cam = bpy.data.objects.new(name, cd); coll.objects.link(cam)
    tgt = bpy.data.objects.new(name + '_aim', None); coll.objects.link(tgt)
    con = cam.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    for t, p, a in keys: key(cam, 'location', F(t), Vector(p)); key(tgt, 'location', F(t), Vector(a))
    if fstop: cd.dof.focus_object = focus or tgt
    m = sc.timeline_markers.new(name, frame=F(t0)); m.camera = cam
    if sc.camera is None: sc.camera = cam
    return cam

# ---------------------------------------------------------------- characters
EMO = {   # brow raise (m), brow tilt (rad, + = angry inner-down), mouth: smile/flat/frown/open/o, lid (0 open .. 1 closed)
    'neutral': (0.0, 0.0, 'flat', 0.0), 'calm': (0.0, 0.0, 'smile', 0.05), 'happy': (0.01, -0.05, 'smile', 0.15), 'joy': (0.015, -0.1, 'open', 0.2),
    'thinking': (0.008, 0.12, 'flat', 0.15), 'worried': (0.012, -0.3, 'frown', 0.05), 'sad': (0.0, -0.35, 'frown', 0.3), 'scared': (0.02, -0.3, 'o', 0.0),
    'surprised': (0.025, 0.0, 'o', 0.0), 'determined': (-0.008, 0.25, 'flat', 0.2), 'menacing': (-0.012, 0.45, 'flat', 0.45), 'smug': (0.0, 0.15, 'smile', 0.3),
}
class Character:
    def __init__(s, coll, name, loc=(0, 0, 0), rot=0.0, skin='#f4b48a', shirt='#ff5a1f', pants='#1f48c8', shoes='#f4f4f4', hair='#4a2c1c',
                 hair_style='tuft', eyes='#5a3a1e', glasses=False, hood=None, cap=None, moustache=False, tie=None, coat=None, scale=1.0, sleeve=None, catchlight=True):
        s.name, s.coll = name, coll
        s.M = dict(skin=mat(name + 'skin', skin, 0.42, 0.15, sss=0.3), shirt=mat(name + 'shirt', shirt, 0.5, 0.15), pants=mat(name + 'pants', pants, 0.55, 0.1),
                   shoe=mat('shoe' + shoes, shoes, 0.3, 0.4), hair=mat(name + 'hair', hair, 0.4, 0.2), white=mat('eyewhite', '#f8f6f2', 0.15, 0.6),
                   iris=mat('iris' + eyes, eyes, 0.1, 0.8), pupil=mat('pupil', '#0a0808', 0.05, 1.0), brow=mat(name + 'brow', hair if hair_style != 'none' else '#2a1a12', 0.6),
                   mouth=mat('mouth', '#6a1a24', 0.4), tongue=mat('tongue', '#e0606a', 0.4), cheek=mat('cheek', '#ff8a8a', 0.5), black=mat('black', '#151517', 0.25, 0.6))
        sl = s.M['shirt'] if sleeve is None else mat(name + 'sleeve', sleeve, 0.5, 0.15)
        # ---- armature
        ad = bpy.data.armatures.new(name + '_rig'); s.arm = bpy.data.objects.new(name + '_rig', ad); coll.objects.link(s.arm)
        vl = bpy.context.view_layer; bpy.context.view_layer.objects.active = s.arm; s.arm.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); eb = ad.edit_bones
        def bone(n, h, t, parent=None):
            b = eb.new(n); b.head = Vector(h); b.tail = Vector(t)
            if parent: b.parent = eb[parent]; b.use_connect = False
            return b
        bone('root', (0, 0, 0), (0, 0.3, 0)); bone('hips', (0, 0, 0.82), (0, 0, 0.95), 'root'); bone('spine', (0, 0, 0.95), (0, 0, 1.28), 'hips')
        bone('neck', (0, 0, 1.28), (0, 0, 1.38), 'spine'); bone('head', (0, 0, 1.38), (0, 0, 1.85), 'neck')
        for sd, x in (('L', 1), ('R', -1)):
            bone('upper_arm.' + sd, (x * 0.2, 0, 1.22), (x * 0.24, -0.01, 0.95), 'spine'); bone('forearm.' + sd, (x * 0.24, -0.01, 0.95), (x * 0.25, 0, 0.72), 'upper_arm.' + sd)
            bone('hand.' + sd, (x * 0.25, 0, 0.72), (x * 0.25, 0, 0.6), 'forearm.' + sd)
            bone('thigh.' + sd, (x * 0.09, 0, 0.82), (x * 0.09, 0.01, 0.45), 'hips'); bone('shin.' + sd, (x * 0.09, 0.01, 0.45), (x * 0.09, 0, 0.08), 'thigh.' + sd)
        bpy.ops.object.mode_set(mode='OBJECT')
        for pb in s.arm.pose.bones: pb.rotation_mode = 'XYZ'
        s.parts = []
        def attach(objs, bname):
            for o in (objs if isinstance(objs, list) else [objs]):
                mw = o.matrix_world.copy(); o.parent = s.arm; o.parent_type = 'BONE'; o.parent_bone = bname; vl.update(); o.matrix_world = mw; s.parts.append(o)
        C, Mm = coll, s.M
        # ---- body
        attach(sphere(C, (0, 0, 1.05), 0.2, Mm['shirt'], (1, 0.82, 1.25), name=name + '_torso'), 'spine')
        if coat: attach(cyl(C, (0, 0, 0.95), 0.235, 0.62, mat(name + 'coat', coat, 0.55, 0.1), name=name + '_coat', r2=0.205), 'spine')
        if tie: attach(box(C, (0, -0.175, 1.1), (0.05, 0.02, 0.26), mat(name + 'tie', tie, 0.4, 0.3), 0.008, name=name + '_tie'), 'spine')
        attach(sphere(C, (0, 0, 0.86), 0.17, Mm['pants'], (1, 0.85, 0.6), name=name + '_hips'), 'hips')
        attach(cyl(C, (0, 0, 1.33), 0.06, 0.12, Mm['skin'], name=name + '_neck'), 'neck')
        for sd, x in (('L', 1), ('R', -1)):
            attach(capsule(C, (x * 0.2, 0, 1.22), (x * 0.24, -0.01, 0.97), 0.056, sl, name + '_ua' + sd), 'upper_arm.' + sd)
            attach(capsule(C, (x * 0.24, -0.01, 0.95), (x * 0.25, 0, 0.75), 0.048, Mm['skin'] if not coat else sl, name + '_fa' + sd), 'forearm.' + sd)
            attach([sphere(C, (x * 0.25, -0.005, 0.67), 0.062, Mm['skin'], (0.85, 0.78, 1.12), name=name + '_hand' + sd),
                    sphere(C, (x * 0.25 - x * 0.055, -0.03, 0.69), 0.026, Mm['skin'], name=name + '_thumb' + sd)], 'hand.' + sd)       # mitten + thumb
            attach(capsule(C, (x * 0.09, 0, 0.8), (x * 0.09, 0.01, 0.47), 0.075, Mm['pants'], name + '_th' + sd), 'thigh.' + sd)
            attach(capsule(C, (x * 0.09, 0.01, 0.45), (x * 0.09, 0, 0.12), 0.068, Mm['pants'], name + '_sh' + sd) +
                   [sphere(C, (x * 0.09, -0.06, 0.06), 0.08, Mm['shoe'], (1, 1.6, 0.6), name=name + '_shoe' + sd)], 'shin.' + sd)
        # ---- head + face
        HC = Vector((0, -0.01, 1.62)); R = 0.25
        head = sphere(C, tuple(HC), R, Mm['skin'], (1, 0.96, 1.0), seg=64, name=name + '_head'); attach(head, 'head')
        for x in (-1, 1): attach(sphere(C, (x * 0.245, 0.02, 1.6), 0.06, Mm['skin'], (0.5, 0.8, 1.0), name=name + '_ear'), 'head')
        attach(sphere(C, (0, -0.255, 1.585), 0.034, Mm['skin'], name=name + '_nose'), 'head')
        for x in (-1, 1): attach(sphere(C, (x * 0.165, -0.17, 1.55), 0.035, Mm['cheek'], (1, 0.3, 0.7), name=name + '_cheek'), 'head')
        s.eyes, s.brows = [], []
        for x in (-1, 1):
            e = bpy.data.objects.new(name + '_eye' + str(x), None); e.location = (x * 0.095, -0.2, 1.655); C.objects.link(e); attach(e, 'head')
            for o in [sphere(C, (x * 0.095, -0.2, 1.655), 0.068, Mm['white'], (0.9, 0.7, 1.12), name=name + '_sclera'),
                      sphere(C, (x * 0.095, -0.242, 1.65), 0.038, Mm['iris'], (1, 0.45, 1.1), name=name + '_iris'),
                      sphere(C, (x * 0.095, -0.256, 1.65), 0.02, Mm['pupil'], (1, 0.4, 1.1), name=name + '_pupil')]:
                mw = o.matrix_world.copy(); o.parent = e; vl.update(); o.matrix_world = mw
            s.eyes.append(e)
            b = bpy.data.objects.new(name + '_brow' + str(x), None); b.location = (x * 0.095, -0.215, 1.755); C.objects.link(b); attach(b, 'head')
            bo = torus(C, (x * 0.095, -0.215, 1.755), 0.05, 0.012, Mm['brow'], rot=(math.radians(80), 0, 0), scale=(1, 1, 0.55), name=name + '_browmesh', arc=(0.35, math.pi - 0.35))
            mw = bo.matrix_world.copy(); bo.parent = b; vl.update(); bo.matrix_world = mw; s.brows.append((b, x, b.location.copy(), b.rotation_euler.copy()))
        s.mouth = bpy.data.objects.new(name + '_mouth', None); s.mouth.location = (0, -0.235, 1.52); C.objects.link(s.mouth); attach(s.mouth, 'head')
        def mpart(o):
            mw = o.matrix_world.copy(); o.parent = s.mouth; vl.update(); o.matrix_world = mw; return o
        s.mouths = {
            'smile': mpart(torus(C, (0, -0.235, 1.535), 0.055, 0.012, Mm['mouth'], rot=(math.radians(80), 0, 0), name=name + '_smile', arc=(-math.pi + 0.5, -0.5))),
            'frown': mpart(torus(C, (0, -0.235, 1.49), 0.045, 0.011, Mm['mouth'], rot=(math.radians(80), 0, 0), name=name + '_frown', arc=(0.6, math.pi - 0.6))),
            'flat': mpart(capsule(C, (-0.035, -0.238, 1.52), (0.035, -0.238, 1.52), 0.009, Mm['mouth'], name + '_flat')[0]),
            'open': mpart(sphere(C, (0, -0.232, 1.515), 0.045, Mm['mouth'], (1.0, 0.35, 0.75), name=name + '_open')),
            'o': mpart(sphere(C, (0, -0.236, 1.515), 0.026, Mm['mouth'], (1, 0.4, 1.2), name=name + '_o')),
        }
        # hair
        hs = {'tuft': [(0, 0.2, 0.17), (-0.13, 0.15, 0.13), (0.13, 0.15, 0.13), (0.07, 0.22, 0.12), (-0.08, 0.23, 0.11), (0.0, 0.12, 0.2)],
              'bob': [(0, 0.18, 0.2), (-0.18, 0.05, 0.13), (0.18, 0.05, 0.13), (-0.2, -0.08, 0.1), (0.2, -0.08, 0.1), (0, 0.1, 0.22)],
              'bun': [(0, 0.17, 0.2), (0, 0.28, 0.12), (-0.12, 0.12, 0.13), (0.12, 0.12, 0.13)], 'spiky': [(0, 0.2, 0.18), (-0.1, 0.25, 0.08), (0.1, 0.25, 0.08), (0, 0.3, 0.08)],
              'side': [(0.04, 0.2, 0.19), (-0.15, 0.12, 0.12), (0.14, 0.14, 0.13)], 'bald': [(-0.2, -0.02, 0.09), (0.2, -0.02, 0.09), (0, -0.04, 0.12)], 'none': []}[hair_style]
        for k, (dx, dz, r) in enumerate(hs):
            attach(sphere(C, (dx, 0.03 + (0.06 if hair_style == 'bald' else 0) - (0.05 if k < 3 and hair_style != 'bald' else 0), 1.62 + dz), r, Mm['hair'], (1, 1, 0.75), seg=32, name=name + '_hair'), 'head')
        if glasses:
            for x in (-1, 1): attach(torus(C, (x * 0.095, -0.268, 1.655), 0.075, 0.01, Mm['black'], rot=(math.pi / 2, 0, 0), name=name + '_glass'), 'head')
            attach(capsule(C, (-0.025, -0.27, 1.665), (0.025, -0.27, 1.665), 0.008, Mm['black'], name + '_bridge')[0], 'head')
        if moustache: attach(sphere(C, (0, -0.25, 1.555), 0.05, Mm['hair'], (1.3, 0.35, 0.35), name=name + '_moust'), 'head')
        if hood:
            hm = mat(name + 'hood', hood, 0.55)
            attach(sphere(C, (0, 0.03, 1.64), 0.29, hm, (1.04, 1.0, 1.05), seg=48, name=name + '_hood'), 'head')
            attach(torus(C, (0, -0.2, 1.6), 0.21, 0.04, hm, rot=(math.pi / 2, 0, 0), scale=(0.95, 1.15, 1), name=name + '_hoodrim'), 'head')
        if cap:
            cm = mat(name + 'cap', cap, 0.5)
            attach(cyl(C, (0, -0.02, 1.83), 0.24, 0.12, cm, name=name + '_cap'), 'head'); attach(cyl(C, (0, -0.2, 1.78), 0.14, 0.015, mat('brim', '#111111', 0.2, 0.8), name=name + '_brim'), 'head')
            attach(sphere(C, (0, -0.25, 1.83), 0.03, mat('badge', '#e8c060', 0.25, metal=1.0), name=name + '_capbadge'), 'head')
        # ---- IK hands (targets animated; influence keyed so arms can rest)
        s.ik = {}
        for sd, x in (('L', 1), ('R', -1)):
            t = bpy.data.objects.new(name + '_ik' + sd, None); t.location = (x * 0.25, -0.05, 0.67); C.objects.link(t)
            p = bpy.data.objects.new(name + '_pole' + sd, None); p.location = (x * 0.6, 0.5, 0.95); C.objects.link(p)
            p.parent = s.arm   # hand targets live in world space (lesson: local targets drifted when the character moved)
            c = s.arm.pose.bones['forearm.' + sd].constraints.new('IK'); c.target = t; c.pole_target = p; c.pole_angle = math.radians(-90); c.chain_count = 2; c.influence = 0
            s.ik[sd] = (t, p, c)
        s.arm.location = loc; s.arm.rotation_euler = (0, 0, rot); s.arm.scale = (scale,) * 3
        s.emo_name = 'calm'; s.set_mouth(1, 'smile')

    # ---------------- animation API (frames)
    def pose(s, frame, rots):
        for b, r in rots.items(): pb = s.arm.pose.bones[b]; pb.rotation_euler = Euler(r); pb.keyframe_insert('rotation_euler', frame=frame)
    def place(s, frame, loc, rot=None):
        s.arm.location = loc; s.arm.keyframe_insert('location', frame=frame)
        if rot is not None: s.arm.rotation_euler = (0, 0, rot); s.arm.keyframe_insert('rotation_euler', frame=frame)
    def hand(s, side, frame, world_pos, influence=1.0):
        """Put a hand at a world position (IK), keyed. influence 0 = arm hangs (FK)."""
        t, p, c = s.ik[side]
        t.location = Vector(world_pos); t.keyframe_insert('location', frame=frame); c.influence = influence; c.keyframe_insert('influence', frame=frame)
    def set_mouth(s, frame, shape, open_amt=0.0):
        for k, o in s.mouths.items():
            on = k == shape; sc = 1.0 if on else 0.001
            if k == 'open' and on: o.scale = (1.0, 0.35, 0.35 + 0.75 * max(0.2, open_amt))
            else: o.scale = (sc, sc * (0.35 if k == 'open' else (0.4 if k == 'o' else 1)), sc * (1.2 if k == 'o' else 1)) if k in ('open', 'o') else (sc, sc, sc * (0.55 if k in ('smile', 'frown') else 1))
            o.keyframe_insert('scale', frame=frame)
    def emote(s, frame, name, blend=8):
        """Face at `frame` (blended from the previous emotion over `blend` frames)."""
        br, tilt, mouth, lid = EMO[name]
        for b, x, l0, r0 in s.brows:   # brow offsets are in the head bone's space (bone Y = up the head)
            b.keyframe_insert('location', frame=frame - blend); b.keyframe_insert('rotation_euler', frame=frame - blend)
            b.location = l0 + Vector((0, br, 0)); b.rotation_euler = (r0.x, r0.y + x * tilt, r0.z); b.keyframe_insert('location', frame=frame); b.keyframe_insert('rotation_euler', frame=frame)
        for e in s.eyes: e.keyframe_insert('scale', frame=frame - blend); e.scale = (1, 1, 1 - 0.55 * lid); e.keyframe_insert('scale', frame=frame)
        s.set_mouth(frame - 1, s._mouth_of(s.emo_name)); s.set_mouth(frame, mouth); s.emo_name = name
    def _mouth_of(s, name): return EMO[name][2]
    def blink(s, frame):
        for e in s.eyes:
            z = e.scale.z; e.keyframe_insert('scale', frame=frame - 2); e.scale = (1, 1, 0.08); e.keyframe_insert('scale', frame=frame); e.scale = (1, 1, z); e.keyframe_insert('scale', frame=frame + 3)
    def blinks(s, t0, t1, every=3.3, phase=0.7):
        t = t0 + phase
        while t < t1 - 0.2: s.blink(F(t)); t += every
    def talk(s, words, t0, t1):
        """Lip-sync: open mouth on every word syllable inside [t0, t1], back to the current emotion mouth between words."""
        base = s._mouth_of(s.emo_name)
        for w in words:
            if w[1] < t0 or w[2] > t1: continue
            a, b = w[1], w[2]; n = max(1, int((b - a) / 0.14)); s.set_mouth(F(a) - 1, base)
            for i in range(n):
                f = F(a + (i + 0.5) * (b - a) / n); s.set_mouth(f, 'open', 0.45 + 0.35 * ((i * 7) % 3) / 2)
            s.set_mouth(F(b) + 1, base)
    def walk(s, t0, t1, a, b, stride=0.55):
        """Walk from a to b (world xy) between t0 and t1, legs driven by distance (no sliding)."""
        a, b = Vector(a), Vector(b); d = (b - a).length; ang = math.atan2(-(b - a).x, (b - a).y) + math.pi
        n = max(2, int((t1 - t0) * 8))
        for i in range(n + 1):
            k = i / n; f = F(t0 + k * (t1 - t0)); p = a.lerp(b, k); s.place(f, (p.x, p.y, 0), ang)
            ph = k * d / stride * math.pi; sw = 0.45 * math.sin(ph)
            s.pose(f, {'thigh.L': (sw, 0, 0), 'thigh.R': (-sw, 0, 0), 'shin.L': (-0.5 * max(0, -math.sin(ph)), 0, 0), 'shin.R': (-0.5 * max(0, math.sin(ph)), 0, 0),
                       'upper_arm.L': (-0.3 * math.sin(ph), 0, 0), 'upper_arm.R': (0.3 * math.sin(ph), 0, 0), 'hips': (0, 0, 0)})
    def sit(s, frame):
        s.pose(frame, {'thigh.L': (math.radians(-90), 0, 0), 'thigh.R': (math.radians(-90), 0, 0), 'shin.L': (math.radians(90), 0, 0), 'shin.R': (math.radians(90), 0, 0)})
    def rest(s, frame):
        s.pose(frame, {b: (0, 0, 0) for b in ['spine', 'neck', 'head', 'upper_arm.L', 'upper_arm.R', 'forearm.L', 'forearm.R', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'hips']})
        s.pose(frame, {'upper_arm.L': (0, 0, math.radians(-8)), 'upper_arm.R': (0, 0, math.radians(8))})
    def head_world(s):
        bpy.context.view_layer.update(); return s.arm.matrix_world @ s.arm.pose.bones['head'].head + s.arm.matrix_world.to_3x3() @ Vector((0, -0.01, 0.24))
