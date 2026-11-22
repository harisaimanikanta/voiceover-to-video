# In-world graphics for the DNA-case production (PIL). Run with system python: python3 textures.py
import os, math, random
from PIL import Image, ImageDraw, ImageFont
OUT = '/home/user/bl-project/tex'; os.makedirs(OUT, exist_ok=True)
def font(size, bold=True):
    for f in (['/usr/share/fonts/opentype/inter/Inter-Black.otf', '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'] if bold else ['/usr/share/fonts/opentype/inter/Inter-Medium.otf']) + ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, size)
def ctext(d, xy, s, f, fill):
    w = d.textlength(s, font=f); d.text((xy[0] - w / 2, xy[1]), s, font=f, fill=fill)

def wanted():
    im = Image.new('RGB', (600, 800), '#f3e6c4'); d = ImageDraw.Draw(im)
    ctext(d, (300, 30), 'WANTED', font(96), '#7a1e14')
    d.polygon([(140, 560), (150, 250), (220, 160), (300, 140), (380, 160), (450, 250), (460, 560)], fill='#1d1a18')
    for x in (255, 345): d.ellipse([x - 26, 330, x + 26, 350], fill='#f3e6c4')
    ctext(d, (300, 600), 'GOLDEN STATE', font(60), '#1d1a18'); ctext(d, (300, 670), 'KILLER', font(60), '#1d1a18'); ctext(d, (300, 745), 'NEVER CAUGHT', font(36), '#7a1e14')
    im.save(f'{OUT}/wanted.png')
def portrait(i, skin, hair, shirt, bg):
    im = Image.new('RGB', (400, 500), bg); d = ImageDraw.Draw(im)
    d.ellipse([70, 330, 330, 620], fill=shirt); d.ellipse([110, 110, 290, 310], fill=skin)
    if i % 2 == 0: d.pieslice([100, 90, 300, 290], 180, 360, fill=hair)
    else: d.ellipse([100, 80, 300, 200], fill=hair)
    for x in (165, 235): d.ellipse([x - 12, 195, x + 12, 219], fill='#2a1a10')
    d.arc([160, 220, 240, 275], 20, 160, fill='#8a3a2a', width=8)
    im.save(f'{OUT}/cousin{i}.png')
def ca_map():
    im = Image.new('RGB', (900, 1000), '#d8e8ee'); d = ImageDraw.Draw(im)
    for x in range(0, 900, 60): d.line([(x, 0), (x, 1000)], fill='#c0d0d8', width=2)
    for y in range(0, 1000, 60): d.line([(0, y), (900, y)], fill='#c0d0d8', width=2)
    P = [(0.2, 0.02), (0.52, 0.02), (0.52, 0.36), (0.92, 0.72), (0.9, 0.96), (0.7, 0.98), (0.62, 0.88), (0.4, 0.74), (0.3, 0.52), (0.16, 0.3), (0.12, 0.12)]
    d.polygon([(x * 900, y * 1000) for x, y in P], fill='#f2e8c8', outline='#6a5a40', width=8)
    d.text((40, 920), 'CALIFORNIA', font=font(64), fill='#1f3a5a'); im.save(f'{OUT}/camap.png')
def calendar(year):
    im = Image.new('RGB', (420, 560), '#fbf8f0'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 420, 140], fill='#c0392b'); ctext(d, (210, 25), str(year), font(96), '#ffffff')
    for r in range(5):
        for k in range(7):
            n = r * 7 + k + 1
            if n <= 31: ctext(d, (40 + k * 57, 180 + r * 70), str(n), font(34, False), '#555555')
    im.save(f'{OUT}/cal{year}.png')
def label(name, lines, w=600, h=300, bg='#fbf8f0', colors=None, sizes=None):
    im = Image.new('RGB', (w, h), bg); d = ImageDraw.Draw(im); y = 30
    for i, s in enumerate(lines):
        f = font((sizes or [80] * 9)[i]); ctext(d, (w / 2, y), s, f, (colors or ['#1a1a1a'] * 9)[i]); y += (sizes or [80] * 9)[i] * 1.25
    im.save(f'{OUT}/{name}.png')
def stamp():
    im = Image.new('RGBA', (700, 240), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([10, 10, 690, 230], outline='#d81e1e', width=18); ctext(d, (350, 50), 'NO MATCH', font(130), '#d81e1e'); im.save(f'{OUT}/nomatch.png')
def dna_card():
    im = Image.new('RGB', (640, 400), '#fbf8f0'); d = ImageDraw.Draw(im); d.text((30, 25), 'DNA PROFILE', font=font(56), fill='#1f3a5a')
    random.seed(17)
    for i in range(26): d.rectangle([30 + i * 22, 130 + random.random() * 60, 46 + i * 22, 370], fill=random.choice(['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0']))
    im.save(f'{OUT}/dnacard.png')
def newspaper():
    im = Image.new('RGB', (900, 1200), '#f2ecdc'); d = ImageDraw.Draw(im)
    ctext(d, (450, 30), 'THE DAILY NEWS', font(92), '#1d1a18'); d.rectangle([40, 150, 860, 158], fill='#1d1a18'); ctext(d, (450, 170), '1979', font(40, False), '#1d1a18')
    ctext(d, (450, 250), 'OFFICER', font(120), '#1d1a18'); ctext(d, (450, 390), 'FIRED', font(120), '#1d1a18'); ctext(d, (450, 540), 'caught shoplifting', font(56), '#1d1a18')
    d.polygon([(170, 760), (210, 730), (330, 960), (290, 990)], fill='#b8864a'); d.rectangle([110, 700, 300, 770], fill='#6a6e78')
    d.rectangle([560, 690, 720, 1000], fill='#f2a541'); d.rectangle([585, 640, 695, 690], fill='#c8c8c8'); d.rectangle([620, 605, 660, 640], fill='#d81e1e')
    ctext(d, (640, 790), 'DOG', font(52), '#1d1a18'); ctext(d, (640, 850), 'SPRAY', font(52), '#1d1a18')
    ctext(d, (450, 1060), 'a hammer and dog spray', font(48), '#1d1a18'); im.save(f'{OUT}/newspaper.png')
def city():
    im = Image.new('RGB', (2048, 1024), '#0a1530'); d = ImageDraw.Draw(im); random.seed(3)
    for i in range(45):
        bw, bh, x = 60 + random.random() * 140, 250 + random.random() * 650, random.random() * 2048
        d.rectangle([x, 1024 - bh, x + bw, 1024], fill=(12 + int(random.random() * 15), 20 + int(random.random() * 15), 45 + int(random.random() * 25)))
        for k in range(int(bh / 18)):
            for j in range(int(bw / 16)):
                if random.random() < 0.22: d.rectangle([x + j * 16 + 4, 1024 - bh + k * 18 + 4, x + j * 16 + 10, 1024 - bh + k * 18 + 12], fill='#ffc874' if random.random() < 0.7 else '#cfe0ff')
    im.save(f'{OUT}/city.png')
def website(k, i):
    im = Image.new('RGB', (1280, 800), '#eaf6ff'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1280, 140], fill='#2fb8b0'); ctext(d, (640, 30), 'FamilyFinder', font(84), '#ffffff')
    ctext(d, (640, 190), 'Find your long-lost family', font(56), '#1f3a5a')
    for j in range(5): x = 160 + j * 240; d.ellipse([x - 70, 300, x + 70, 440], fill=['#ffd6c0', '#d6f0d6', '#e6dcff', '#fff0b8', '#ffd6e0'][j]); d.rectangle([x - 80, 450, x + 80, 500], fill='#ffffff')
    ctext(d, (640, 560), "Uploading: killer's DNA", font(56), '#1f3a5a'); d.rounded_rectangle([100, 650, 1180, 740], 45, fill='#ffffff')
    d.rounded_rectangle([100, 650, 100 + max(90, 1080 * k), 740], 45, fill='#ff8f3a'); ctext(d, (640, 668), f'{int(k * 100)}%', font(52), '#1f3a5a')
    im.save(f'{OUT}/site/{i:04d}.png')
def match_screen(state):
    im = Image.new('RGB', (1280, 800), '#0f3a26' if state else '#101a2a'); d = ImageDraw.Draw(im); random.seed(77)
    bars = [(random.random(), random.choice(['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0'])) for _ in range(22)]
    for off in (-1, 1):
        x0 = 640 + off * (150 if state else 320) - 150
        for i, (_, c) in enumerate(bars): d.rectangle([x0, 40 + i * 32, x0 + 300, 40 + i * 32 + 18], fill=c)
    if state: ctext(d, (640, 320), 'MATCH', font(220), '#5cff9a')
    im.save(f'{OUT}/match{state}.png')

wanted(); ca_map(); stamp(); dna_card(); newspaper(); city()
for i, (sk, h, sh, bg) in enumerate([('#f1c4a0', '#7a4a22', '#e85d4a', '#ffe2c0'), ('#c98f6a', '#1a1008', '#5fb36b', '#d8f0d8'), ('#f3d1b5', '#d8a040', '#7a5cc8', '#e6dcff'), ('#8a5a3c', '#1a1008', '#f2a541', '#fff0b8')]): portrait(i, sk, h, sh, bg)
for y in (1976, 1979, 1982, 1984, 1986): calendar(y)
label('evidence', ['EVIDENCE', '#1979-0412'], 600, 260, sizes=[90, 64]); label('unsolved', ['UNSOLVED', 'EAR / ONS'], 600, 300, colors=['#b3261e', '#2a2a2a'], sizes=[96, 70])
label('files', ['CRIMINAL', 'DNA FILES'], 800, 300, bg='#1f3a5a', colors=['#ffffff', '#ffd166'], sizes=[100, 100]); label('grocery', ['GROCERY'], 1000, 200, bg='#2fa86a', colors=['#ffffff'], sizes=[130])
label('coldcase', ['COLD CASE'], 700, 170, bg='#fbf3df', colors=['#b3261e'], sizes=[110])
os.makedirs(f'{OUT}/site', exist_ok=True)
for i in range(1, 133): website(min(1, max(0, (i - 6) / 108)), i)
match_screen(0); match_screen(1)
print('ok')
