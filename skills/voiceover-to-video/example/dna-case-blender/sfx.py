#!/usr/bin/env python3
"""Sound design for "Caught by His Cousins' DNA": ambience beds + effects synced to dna.py's animation, all synthesized (no sample
libraries needed). Writes sfx.wav (48 kHz stereo, 103.81 s); post.py mixes it under the voice with sidechain ducking.
Run with any Python that has numpy, e.g. Blender's:  "<Blender>\\5.2\\python\\bin\\python.exe" sfx.py   (render_all.py does this)."""
import os, sys, wave
import numpy as np

SR = 48000; DUR = 103.81; N = int(DUR * SR) + SR
HERE = os.path.dirname(os.path.abspath(__file__))
_in_blender = os.path.basename(sys.argv[0]).lower().startswith('blender')
_args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ([] if _in_blender else sys.argv[1:])   # standalone, or: blender -b -P sfx.py [-- out.wav]
OUT = _args[0] if _args else os.path.join(HERE, 'sfx.wav')
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

# ---------------------------------------------------------------- tools
def db(x): return 10 ** (x / 20)
def T(t): return np.arange(int(t * SR)) / SR
def white(d): return rng.standard_normal(int(d * SR))
def shape(x, fn):   # FFT filter: fn(freqs) -> gain
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * fn(f), len(x))
def band(x, lo, hi, soft=1.0):   # smooth band-pass (lo/hi in Hz; 0 / None = open)
    def g(f):
        a = np.ones_like(f)
        if lo: a *= 1 / (1 + (lo / np.maximum(f, 1)) ** (4 * soft))
        if hi: a *= 1 / (1 + (f / hi) ** (4 * soft))
        return a
    return shape(x, g)
def pink(d): x = white(d); return shape(x, lambda f: 1 / np.sqrt(np.maximum(f, 20)))
def brown(d): x = white(d); return shape(x, lambda f: 1 / np.maximum(f, 15))
def norm(x): m = np.max(np.abs(x)) or 1; return x / m
def env_ad(n, a, d):   # attack/decay seconds -> envelope of n samples (exp decay)
    t = np.arange(n) / SR; e = np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) / max(d, 1e-4))); return e
def fade(x, fi=0.05, fo=0.05):
    n = len(x); a = min(int(fi * SR), n // 2); b = min(int(fo * SR), n // 2); e = np.ones(n)
    if a: e[:a] = np.linspace(0, 1, a)
    if b: e[-b:] = np.linspace(1, 0, b)
    return x * e
def slow_lfo(d, rate=0.2, depth=0.5):   # smooth random level wobble
    k = max(4, int(d * rate * 4)); pts = 1 + depth * (rng.random(k) * 2 - 1); return np.interp(np.linspace(0, k - 1, int(d * SR)), np.arange(k), pts)
def conv(x, ir): n = len(x) + len(ir) - 1; m = 1 << (n - 1).bit_length(); return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:n]
def room_ir(rt=0.6, bright=4000): n = int(rt * SR); return band(white(rt) * np.exp(-np.arange(n) / SR * 6.9 / rt), 150, bright) * 0.25
def verb(x, rt=0.6, wet=0.35, bright=4000): ir = room_ir(rt, bright); y = conv(x, ir); y = y / (np.max(np.abs(y)) or 1) * np.max(np.abs(x)); out = np.zeros(len(y)); out[:len(x)] = x * (1 - wet); return out + y * wet
def add(x, t0, gain_db=0.0, pan=0.0):   # place a mono signal at t0 seconds, equal-power pan -1..1
    i = int(t0 * SR); x = x[:max(0, N - i)]
    if i < 0: x = x[-i:]; i = 0
    g = db(gain_db); a = (pan + 1) * np.pi / 4; L[i:i + len(x)] += x * g * np.cos(a); R[i:i + len(x)] += x * g * np.sin(a)
BED_BOOST = 9.0   # ambience beds relative to one-shot effects (without it the hits set the level and the beds were ~35 dB under the voice)
def bed(x, t0, t1, gain_db, pan=0.0, fi=0.4, fo=0.4): add(fade(x[:int((t1 - t0) * SR)], fi, fo), t0, gain_db + BED_BOOST, pan)
def sine(f, d, phase=0.0):
    t = T(d); f = np.broadcast_to(f, t.shape) if np.ndim(f) else np.full(t.shape, f); return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)

# ---------------------------------------------------------------- sound recipes
def room_tone(d): return norm(band(brown(d), 30, 350) + 0.15 * band(pink(d), 200, 2000)) * slow_lfo(d, 0.1, 0.15)
def city(d):   # distant traffic hum with the odd car passing
    x = norm(band(pink(d), 50, 700)) * slow_lfo(d, 0.15, 0.4)
    for t in np.arange(rng.uniform(0, 4), d - 3, rng.uniform(5, 9)):
        n = int(3 * SR); e = np.hanning(n); p = band(white(3), 150, 1500) * e; i = int(t * SR); x[i:i + n] += 0.6 * norm(p)[:len(x[i:i + n])]
    return norm(x)
def crickets(d, n_bugs=4):
    out = np.zeros(int(d * SR))
    for b in range(n_bugs):
        f0 = rng.uniform(3900, 5200); per = rng.uniform(0.55, 1.0); t = rng.uniform(0, per)
        while t < d - 0.2:
            for p in range(rng.integers(2, 5)):   # pulses within a chirp
                n = int(0.018 * SR); i = int((t + p * 0.032) * SR)
                if i + n >= len(out): break
                out[i:i + n] += np.sin(2 * np.pi * f0 * np.arange(n) / SR) * np.hanning(n) * (0.6 + 0.4 / (b + 1))
            t += per * rng.uniform(0.85, 1.15)
    return norm(verb(out, 0.4, 0.3, 9000)[:int(d * SR)])
def wind(d): return norm(band(pink(d), 150, 1100)) * slow_lfo(d, 0.25, 0.6)
def birds(d, density=1.2):
    out = np.zeros(int(d * SR)); t = 0.3
    while t < d - 1:
        f0 = rng.uniform(2600, 4800); notes = rng.integers(2, 6); typ = rng.integers(0, 3)
        for k in range(notes):
            nd = rng.uniform(0.05, 0.12); n = int(nd * SR); tt = np.arange(n) / SR
            if typ == 0: f = f0 + 1800 * tt / nd                       # upward whistle
            elif typ == 1: f = f0 * (1 + 0.25 * np.sin(2 * np.pi * 28 * tt))   # trill
            else: f = f0 + 1500 * (1 - tt / nd)                        # downward chirp
            s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / nd) ** 2
            i = int((t + k * (nd + 0.04)) * SR)
            if i + n < len(out): out[i:i + n] += s * rng.uniform(0.4, 1.0)
        t += rng.exponential(1 / density) + 0.25
    return norm(verb(out, 0.9, 0.35, 10000)[:int(d * SR)])
def hum(d, f=60, buzz=0.3): t = T(d); x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.2 for k in range(1, 7)); return norm(x + buzz * band(white(d), 100, 600)) * 0.5
def step(surface='pave'):
    d = 0.22; n = int(d * SR); t = np.arange(n) / SR
    lo = {'pave': 95, 'wood': 130, 'tile': 160, 'office': 120}[surface]
    thump = np.sin(2 * np.pi * lo * t) * np.exp(-t / 0.035)
    scuff = band(white(d), {'pave': 600, 'wood': 300, 'tile': 900, 'office': 400}[surface], 5000) * np.exp(-t / 0.03) * 0.5
    heel = np.zeros(n); k = int(0.012 * SR); heel[k:] = (band(white(d), 800, 6000) * np.exp(-t / 0.012))[:n - k] * 0.35   # toe after heel
    return norm(thump + scuff + heel) * rng.uniform(0.75, 1.0)
def steps(t0, t1, every, surface, gain, pan=0.0, room=None):
    t = t0
    while t < t1:
        s = step(surface); s = verb(s, *room) if room else s; add(s, t + rng.uniform(-0.02, 0.02), gain + rng.uniform(-2, 1), pan); t += every
def click(f=2500, d=0.03, noise=0.5):
    t = T(d); return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + noise * band(white(d), 1500, 9000) * np.exp(-t / 0.002))
def thud(f0=55, d=0.7, f1=None, crack=0.6, lo_crack=200, hi_crack=6000):
    t = T(d); f = np.linspace(f0, f1 or f0 * 0.7, len(t)); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * 0.3))
    c = band(white(d), lo_crack, hi_crack) * np.exp(-t / 0.04) * crack; return norm(s + c)
def splinters(d=0.5, n=40):
    out = np.zeros(int(d * SR))
    for _ in range(n):
        i = int(rng.uniform(0, d - 0.02) ** 1.6 / d ** 0.6 * SR); k = int(0.004 * SR); out[i:i + k] += band(white(0.004), 1500, 9000)[:len(out[i:i + k])] * rng.uniform(0.3, 1)
    return norm(out)
def metal_ping(fs, d=0.4, decay=0.12):
    t = T(d); return norm(sum(np.sin(2 * np.pi * f * rng.uniform(0.99, 1.01) * t) * np.exp(-t / (decay * rng.uniform(0.6, 1.3))) for f in fs))
def jingle(): return metal_ping([5200, 6700, 8100, 9600, 11300, 7400], 0.3, 0.07) + 0.3 * band(white(0.3), 5000, 12000) * np.exp(-T(0.3) / 0.03)
def bell(fs, d=1.6, decay=0.5): t = T(d); return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t / (decay / (1 + 0.3 * i))) * (0.6 ** i) for i, f in enumerate(fs)))
def chime(base, d=1.6): return bell([base, base * 2.01, base * 2.76, base * 5.4], d)
def whoosh(d=0.6, lo=300, hi=3000, up=True):
    t = T(d); e = np.sin(np.pi * t / d) ** 2; x = white(d) * e; out = np.zeros_like(x); seg = int(0.02 * SR)
    for i in range(0, len(x), seg):   # moving band
        k = i / len(x); fc = lo * (hi / lo) ** (k if up else 1 - k); out[i:i + seg] = band(x[i:i + seg] if len(x[i:i + seg]) > 64 else x[i:i + seg], fc * 0.5, fc * 2)
    return norm(out)
def riser(d=1.4): t = T(d); return norm(whoosh(d, 200, 6000) * (t / d) ** 2 + 0.4 * sine(np.linspace(80, 400, len(t)), d) * (t / d) ** 3)
def boom(d=2.5): t = T(d); return norm(sine(np.linspace(48, 32, len(t)), d) * np.exp(-t / 0.8) + 0.5 * band(white(d), 30, 900) * np.exp(-t / 0.25) + 0.3 * band(white(d), 1000, 7000) * np.exp(-t / 0.05))
def drone(d, f=41.2):
    t = T(d); x = np.sin(2 * np.pi * f * t) + 0.8 * np.sin(2 * np.pi * (f * 1.06) * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t) + 0.5 * band(brown(d), 20, 120)
    return norm(x) * np.minimum(1, t / 1.0)
def tv_murmur(d):   # muffled TV dialogue/music through a small speaker + CRT whine
    t = T(d); syl = slow_lfo(d, 5, 0.9) ** 2; x = band(pink(d), 250, 2800) * syl
    x += 0.25 * band(white(d), 600, 1800) * (np.sin(2 * np.pi * 0.7 * t) > 0.6)   # laughter-ish bursts
    return norm(band(x, 300, 3200)) + 0.02 * np.sin(2 * np.pi * 15734 * t)
def paper(d=0.18): t = T(d); return norm(band(white(d), 1200, 7000) * np.sin(np.pi * t / d) * (0.6 + 0.4 * np.sin(2 * np.pi * 45 * t)))
def zap(d=0.09): t = T(d); sq = np.sign(np.sin(2 * np.pi * 120 * t)); return norm(sq * 0.5 + band(white(d), 2000, 9000) * 0.6) * np.exp(-t / 0.04)
def pad(d, notes=(110, 164.8, 220, 277.2, 329.6)):
    t = T(d); x = sum(np.sin(2 * np.pi * f * (1 + 0.002 * np.sin(2 * np.pi * 0.2 * t + i)) * t) / (1 + i * 0.4) for i, f in enumerate(notes))
    x += 0.15 * (np.sin(2 * np.pi * 1760 * t) + np.sin(2 * np.pi * 2217 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t))
    return norm(x) * np.minimum(1, t / 1.2)
def keystroke(): d = 0.05; t = T(d); return norm(band(white(d), 1500, 7000) * np.exp(-t / 0.006) + 0.6 * np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.012)) * rng.uniform(0.6, 1)
def drawer(d=0.35): t = T(d); roll = band(white(d), 700, 3500) * (0.6 + 0.4 * np.sin(2 * np.pi * 32 * t)) * np.sin(np.pi * t / d); return norm(roll + 0.5 * thud(140, d, None, 0.2) * (t > d * 0.8))
def engine(d, f0s, gains):   # f0s/gains: arrays over the duration (firing frequency & loudness)
    f = np.interp(np.linspace(0, 1, int(d * SR)), np.linspace(0, 1, len(f0s)), f0s); g = np.interp(np.linspace(0, 1, int(d * SR)), np.linspace(0, 1, len(gains)), gains)
    ph = 2 * np.pi * np.cumsum(f) / SR; x = sum(np.sin(k * ph) / k ** 0.9 for k in range(1, 12))
    x = band(x * (1 + 0.3 * band(white(d), 5, 40)), 25, 1800) + 0.4 * band(brown(d), 40, 400)
    return norm(x) * g
def ratchet(n=10, d=0.3):
    out = np.zeros(int((d + 0.2) * SR))
    for k in range(n): i = int(k * d / n * SR); s = metal_ping([3100, 4700, 6300], 0.06, 0.012); out[i:i + len(s)] += s * (0.6 + 0.4 * k / n)
    s = metal_ping([1800, 2900, 4400], 0.2, 0.05); i = int(d * SR); out[i:i + len(s)] += s; return norm(out)
def siren(d): t = T(d); f = 900 + 380 * np.sin(2 * np.pi * t / 3.6); x = sine(f, d) + 0.3 * sine(f * 2, d); return norm(band(x, 300, 2500))
def crackle(d, rate=18):
    out = np.zeros(int(d * SR)); idx = rng.integers(0, len(out) - 200, int(d * rate))
    for i in idx: k = rng.integers(10, 120); out[i:i + k] += band(white(k / SR + 0.001), 800, 9000)[:k] * rng.uniform(0.2, 1)
    return norm(out)
def projector(d): t = T(d); x = band(white(d), 1500, 6000) * (np.mod(t * 24, 1) < 0.18) + 0.4 * np.sin(2 * np.pi * 48 * t); return norm(x)
def cloth(d=0.35): t = T(d); return norm(band(white(d), 400, 3500) * np.sin(np.pi * t / d) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * t))))

# ================================================================ cue sheet (times match dna.py / words.json)
# --- 1. host, night office (0-10.63, 96.5-103.81)
for t0, t1 in ((0, 10.63), (96.5, 103.81)):
    bed(room_tone(t1 - t0), t0, t1, -36, fi=1.2 if t0 == 0 else 0.2, fo=0.2 if t0 == 0 else 2.5)
    bed(city(t1 - t0), t0, t1, -38, pan=0.3, fi=1.5 if t0 == 0 else 0.2, fo=0.2 if t0 == 0 else 2.5)
for i in range(4): add(click(1400, 0.05, 0.8), 4.45 + i * 0.25, -30, -0.4)          # cousin photos pinned to the board
add(cloth(0.5), 7.95, -32); add(thud(180, 0.15, None, 0.4), 7.97, -34)                # kit lifted off the desk
add(riser(1.4), 98.95, -30); add(boom(), 100.33, -22)                               # "IS YOUR DNA OUT THERE?" hit
# --- 2. 1970s street (10.63-13.95)
bed(crickets(3.4), 10.63, 13.95, -33, fi=0.6, fo=0.15); bed(wind(3.4), 10.63, 13.95, -36, pan=-0.2, fo=0.15)
bed(hum(3.4, 60, 0.6), 10.63, 13.95, -46, pan=0.5, fo=0.15)                          # streetlight buzz
add(whoosh(0.7, 200, 2000, up=False), 10.4, -34)
steps(11.0, 13.9, 0.34, 'pave', -30, pan=0.35)                                       # villain walking
# --- break-in (13.95-16.9): dark room, kick, door slams down, he steps in
bed(room_tone(3.0), 13.95, 16.9, -34, fi=0.05, fo=0.1); bed(drone(3.0), 13.95, 16.9, -37, fi=0.3, fo=0.3)
TK = 14.32
add(verb(thud(60, 0.9, 40, 1.0, 300, 8000), 0.9, 0.35), TK, -15)                    # the kick
add(verb(splinters(0.6, 60), 0.6, 0.3), TK + 0.01, -18, 0.15)
add(verb(thud(45, 1.4, 30, 0.8, 100, 3000), 1.1, 0.4), TK + 0.27, -14)               # door slams flat
add(verb(thud(55, 0.5, 40, 0.5), 0.8, 0.4), TK + 0.33, -20)                          # bounce
for k in range(7): add(click(rng.uniform(1800, 3200), 0.04, 0.9), TK + 0.25 + rng.uniform(0, 0.35), -26, rng.uniform(-0.6, 0.6))   # splinters land
for t in (15.25, 15.5, 15.78, 16.02): add(verb(step('wood'), 0.7, 0.35), t, -20)       # heavy steps over the door
add(band(brown(0.8), 20, 90) * np.hanning(int(0.8 * SR)), 15.9, -18)                 # low heartbeat-like swell
# --- 3. bedroom (16.9-22.79)
bed(room_tone(5.9), 16.9, 22.79, -36, fi=0.1, fo=0.3); bed(crickets(5.9, 3), 16.9, 22.79, -42, pan=-0.6, fi=0.1)
for k in range(6): add(click(3200, 0.02, 0.4), 17.2 + k, -38, 0.6)                   # bedside clock
for f in range(int(16.9 * 30), int(22.8 * 30)):                                      # tambourine jingles follow its sway (dna.py)
    t = f / 30; w = np.exp(-((t - 18.4) / 0.9) ** 2) + 0.5 * np.exp(-((t - 20.1) / 0.5) ** 2)
    if w > 0.08 and t < 20.77 and f % 3 == 0: add(jingle(), t + rng.uniform(0, 0.03), -40 + 22 * min(w, 1), -0.5)
bt = T(2.0); breath = band(white(2.0), 250, 1600) * (np.sin(np.pi * bt / 2.0) ** 2)
add(norm(breath), 20.8, -38, 0.2); add(norm(breath) * 0.8, 21.85, -40, 0.2)           # he breathes in his sleep
add(click(900, 0.04, 0.6), 22.45, -30, 0.5)                                           # lamp switched off
# --- 4. case office: map pins, 1986 living room, evidence (22.79-32.18)
bed(room_tone(2.8), 22.79, 25.55, -36, fi=0.05); add(boom(1.8) * 0.5, 22.85, -28)     # "He kills at least 13 people"
for i in range(13): add(click(1100, 0.04, 0.7), 23.25 + i * 0.16, -32, -0.3 + 0.05 * i)   # red pins
bed(room_tone(4.7), 25.55, 30.25, -38, fi=0.05, fo=0.05); bed(tv_murmur(4.7), 25.55, 30.25, -30, pan=0.15, fi=0.1, fo=0.05)
for i in range(1, 5): add(paper(), 25.9 + i * 0.4, -30, 0.4)                          # calendar pages flip
for t in (29.43, 29.63, 29.78): add(zap(), t, -24)                                    # he flickers out
add(whoosh(0.5, 4000, 300, up=False) * 0.7, 29.78, -30)
bed(room_tone(1.95), 30.25, 32.18, -36, fi=0.05); add(click(700, 0.05, 0.7), 30.42, -26); bed(hum(1.8, 120, 0.2), 30.45, 32.18, -44)   # desk lamp on
# --- 5. DNA (32.18-37.73)
bed(pad(5.6), 32.18, 37.73, -38, fi=0.5, fo=0.4); add(whoosh(0.8, 300, 5000), 31.95, -32)
# --- 6. records room (37.73-47.65)
bed(room_tone(9.9), 37.73, 47.65, -35, fi=0.1); bed(hum(9.9, 120, 0.15), 37.73, 47.65, -43, pan=-0.3)   # fluorescent tubes
for i in range(12): add(drawer(), 37.9 + 0.41 * i - 0.25, -34, -0.6 + 0.1 * i)          # drawers slide as the card passes
add(verb(thud(75, 0.4, 60, 0.9, 800, 5000), 0.5, 0.3), 42.62, -18)                     # NO MATCH stamp
for k, t in enumerate(np.cumsum(np.linspace(0.35, 0.09, 30)) + 43.55):                # clock races: 30 years pass
    if t < 47.5: add(click(2600, 0.02, 0.3), t, -30 + 6 * k / 30, 0.2)
add(whoosh(1.2, 200, 1500, up=False), 46.6, -34)
# --- 7. 2018 office (47.65-73.31)
bed(room_tone(25.7), 47.65, 73.31, -35, fi=0.3); bed(band(pink(25.7), 80, 900), 47.65, 73.31, -43, fi=0.3)   # HVAC
add(whoosh(0.7, 300, 3000), 47.45, -34)
for t in (47.7, 49.0, 50.3): add(paper(0.25), t, -40, 0.3)                              # case-file pages under the magnifier
for k in range(23):                                                                    # typing, in time with det1's mittens
    t = 52.45 + 0.17 * k; add(keystroke(), t, -30, -0.3)
    if rng.random() < 0.6: add(keystroke(), t + 0.085, -32, -0.3)
add(click(1800, 0.03, 0.5), 52.3, -32, -0.3); add(click(1800, 0.03, 0.5), 56.25, -32, -0.3)
add(chime(1318.5, 1.2), 56.35, -30); add(chime(1760, 1.2), 56.5, -32)                   # upload complete
steps(56.85, 58.3, 0.36, 'office', -32, 0.3)                                            # det2 walks to the wall screen
for t in (57.3, 60.0, 63.1, 66.5): add(norm(sine(np.linspace(880, 1320, int(0.09 * SR)), 0.09) * np.exp(-T(0.09) / 0.03)), t, -32)   # chart updates
add(chime(659.3, 2.0), 71.35, -26); add(chime(987.8, 2.0), 71.5, -30)                   # THIS MAN
# --- 8. suburb, day (73.31-88.37)
bed(birds(15.1), 73.31, 88.37, -32, pan=-0.2, fi=0.3); bed(wind(15.1), 73.31, 88.37, -42, fi=0.3); bed(city(15.1), 73.31, 88.37, -46, pan=0.4)
add(whoosh(0.7, 300, 3000), 73.1, -36)
bed(norm(band(white(6.6), 2500, 11000)) * slow_lfo(6.6, 2, 0.15), 73.31, 79.92, -36, pan=0.3, fi=0.2, fo=0.05)   # hose spray
bed(crackle(6.6, 60), 73.31, 79.92, -42, pan=0.35, fi=0.2, fo=0.05)                      # water pattering on grass
# car pulls in (82.45-83.55), engine off, door shut
d = 1.3; bed(engine(d, [34, 33, 29, 24, 22], [0.5, 0.8, 1.0, 0.8, 0.4]) + 0.5 * norm(band(white(d), 150, 900)) * np.linspace(1, 0.1, int(d * SR)), 82.45, 83.75, -31, pan=0.1, fi=0.25, fo=0.25)
add(norm(sine(2900, 0.35) * np.sin(np.pi * T(0.35) / 0.35)), 83.3, -40)                   # brake squeal
add(thud(110, 0.35, 90, 0.5, 400, 4000), 83.72, -24, -0.3); add(click(2400, 0.03, 0.6), 83.74, -30, -0.3)   # car door shut
bed(band(white(0.45), 200, 2500) * 0.6 + 0.4 * sine(95, 0.45), 83.95, 84.4, -32, fi=0.1, fo=0.1)   # sliding door motor
add(chime(659.3, 1.4), 84.05, -30, -0.4); add(chime(523.3, 1.4), 84.35, -30, -0.4)         # shop door ding-dong
steps(83.7, 84.4, 0.33, 'pave', -30, -0.4); steps(84.5, 85.35, 0.33, 'tile', -32, -0.5, (0.5, 0.25))
steps(84.6, 85.3, 0.3, 'pave', -30, 0.3)                                                    # officer arrives
for t in [86.2 + 0.25 * j for j in range(8)]: add(norm(band(white(0.12), 1500, 5000) * np.sin(np.pi * T(0.12) / 0.12)), t, -36, 0.2)   # swab rubs (dna.py wipe keys)
# --- 9. match (88.37-89.57)
bed(room_tone(1.2), 88.37, 89.57, -38, fi=0.05, fo=0.05)
for i, t in enumerate((88.42, 88.57, 88.72, 88.87)): add(norm(sine(1200 + 80 * i, 0.06) * np.exp(-T(0.06) / 0.02)), t, -34)
for i, f in enumerate((523.3, 659.3, 784, 1046.5)): add(chime(f, 1.0), 89.0 + i * 0.07, -28)   # MATCH
# --- 10. arrest (89.57-93.35)
bed(birds(3.8, 0.8), 89.57, 93.38, -40, fi=0.05, fo=0.05); bed(siren(3.8), 89.57, 93.38, -44, pan=0.6, fi=0.05, fo=0.1)
add(ratchet(), 89.65, -24, -0.1)                                                            # handcuffs click shut
add(norm(band(white(0.25), 900, 3200)) * np.exp(-T(0.25) / 0.08), 90.6, -36, 0.5); add(norm(sine(1400, 0.08)), 90.85, -40, 0.5)   # police radio
# --- 11. 1979 flashback (93.4-96.45)
add(whoosh(0.5, 3000, 300, up=False), 93.25, -32)
bed(projector(3.05), 93.4, 96.45, -35, fi=0.1, fo=0.1); bed(crackle(3.05, 25), 93.4, 96.45, -33, fi=0.1, fo=0.1)
bed(band(room_tone(3.05), 80, 1200), 93.4, 96.45, -38, fi=0.1, fo=0.1)
add(metal_ping([2400, 3900, 5600], 0.25, 0.05), 94.5, -32, 0.3)                              # hammer lifted off the shelf
add(cloth(0.4), 94.75, -30); add(cloth(0.35), 95.7, -30)                                      # slipped into the jacket
for k in range(5): add(click(5200, 0.02, 0.5), 95.45 + k * 0.06, -34, 0.3)                    # spray can rattle
add(whoosh(0.5, 300, 3000), 96.3, -34)

# ---------------------------------------------------------------- master: gentle limiter, write 16-bit stereo
mix = np.stack([L, R])[:, :int(DUR * SR)]
# level anchored on the steady opening ambience (host room tone + city), not on the loudest hit, so beds and hits keep their balance:
# host bed -> -30 dBFS RMS here; post.py lowers the whole file 10 dB under a voice at about -26 dBFS RMS (beds ~14 dB under the narration)
ref = np.sqrt(np.mean(mix[:, int(1.5 * SR):int(10.0 * SR)] ** 2)) or 1; mix = mix / ref * db(-30)
mix = np.tanh(mix * 1.6) / 1.6   # soft limiter for the hits (door kick, slam, final boom)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(OUT, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('sfx:', OUT, f'{DUR:.2f}s')
