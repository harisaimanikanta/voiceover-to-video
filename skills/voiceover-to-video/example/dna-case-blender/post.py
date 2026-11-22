#!/usr/bin/env python3
"""Titles + captions (ASS subtitles) and the final mux.  python3 post.py frames/ voice.mp3 final.mp4
Captions: 1-3 word chunks from lines.json (numbers restored as digits), white bold with an outline, lower third.
Titles: key facts as orange pills at the top (same list as the treatment)."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
frames, voice, out = sys.argv[1], sys.argv[2], sys.argv[3]
NUM = [['forty years', '40 years'], ['nineteen seventies', '1970s'], ['thirteen', '13'], ['nineteen eighty six', '1986'], ['thirty years', '30 years'],
       ['twenty eighteen', '2018'], ['eighteen hundreds', '1800s'], ['seventy two', '72']]
TITLES = [(0.3, 3.6, '40 YEARS', 'never caught'), (4.1, 7.3, 'HIS COUSINS', 'turned him in, without knowing'), (7.8, 10.4, 'A DNA TEST', "but someone else's"),
          (10.9, 13.7, 'CALIFORNIA', 'the 1970s'), (14.2, 16.75, 'A MASKED MAN', 'breaking into homes'), (17.1, 22.6, 'PEOPLE WERE TERRIFIED', 'tambourines on doors, bats in bed'),
          (23.0, 25.3, '13 VICTIMS', ''), (25.7, 30.0, '1986', 'he just stops'), (30.4, 33.3, 'HE LEFT DNA', 'at the crime scenes'), (33.6, 37.6, 'DNA', 'your unique code'),
          (37.9, 42.3, 'POLICE DNA FILES', 'only criminals are in them'), (42.6, 43.4, 'NO MATCH', ''), (43.7, 47.5, '30 YEARS', 'waiting'), (47.9, 52.0, '2018', 'a new idea'),
          (52.2, 56.4, 'FAMILY WEBSITE', "upload the killer's DNA"), (57.3, 59.8, 'COUSINS FOUND', 'he is not on it, they are'), (60.0, 62.8, 'SHARED DNA', 'family share pieces'),
          (63.1, 66.3, 'BACK TO THE 1800s', ''), (66.5, 70.9, 'FORWARD AGAIN', 'branch by branch'), (71.2, 73.2, 'RIGHT AGE + PLACE', ''), (73.5, 74.8, 'ONE NAME', ''),
          (75.1, 79.8, 'AGE 72', 'living quietly near Sacramento'), (80.1, 82.4, 'STAKEOUT', 'they need proof'), (85.4, 88.2, 'SECRET DNA SAMPLE', 'from his car door handle'),
          (88.55, 89.4, "IT'S A MATCH", ''), (91.2, 93.3, 'EX-POLICE OFFICER', ''), (93.4, 96.4, 'FIRED', 'for stealing a hammer + dog spray'), (96.7, 98.8, 'HE NEVER TOOK A TEST', ''),
          (99.05, 100.1, 'HIS COUSINS DID', ''), (100.35, 103.75, 'IS YOUR DNA OUT THERE?', '')]
def ts(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h}:{m:02d}:{s:05.2f}'
def chunks(text, t0, t1, maxw=3):
    w = text.split(); groups = [w[i:i + maxw] for i in range(0, len(w), maxw)]; tot = sum(len(' '.join(g)) for g in groups); t = t0; out = []
    for g in groups:
        s = ' '.join(g); d = (t1 - t0) * len(s) / tot; out.append((t, t + d, s.strip(',;:'))); t += d
    return out
lines = json.load(open(os.path.join(HERE, 'lines.json')))
ev = []
for a, b, text in lines:
    for x, y in NUM: text = text.replace(x, y)
    for c0, c1, s in chunks(text, a, b): ev.append(f'Dialogue: 0,{ts(c0)},{ts(c1)},Cap,,0,0,0,,{{\\fscx85\\fscy85\\t(0,80,\\fscx100\\fscy100)}}{s}')
SHOW_TITLES = False   # user: no orange title pills / sub-lines at the top; only the word captions low in the frame
for t0, t1, t, sub in (TITLES if SHOW_TITLES else []):
    ev.append(f'Dialogue: 1,{ts(t0)},{ts(t1)},Title,,0,0,0,,{{\\fad(120,150)}}{t}')
    if sub: ev.append(f'Dialogue: 1,{ts(t0)},{ts(t1)},Sub,,0,0,0,,{{\\fad(120,150)}}{sub}')
ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter ExtraBold,66,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,6,2,2,60,60,380,1
Style: Title,Inter ExtraBold,84,&H00FFFFFF,&H00FFFFFF,&H003C61E8,&H003C61E8,1,0,0,0,100,100,0,0,3,18,0,8,60,60,190,1
Style: Sub,Inter SemiBold,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,4,1,8,60,60,320,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + '\n'.join(ev) + '\n'
open(os.path.join(HERE, 'subs.ass'), 'w', encoding='utf-8').write(ass)
# Windows: a drive letter ("D:") inside the filter string breaks ffmpeg's option parser, so run from HERE and pass a bare file name.
frames, voice, out = (os.path.abspath(p) for p in (frames, voice, out))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-start_number', '1', '-i', os.path.join(frames, '%05d.png'), '-i', voice,
                # 93.4-96.45: the 1979 shoplifting flashback in black & white with film grain and a vignette (titles stay in colour)
                '-vf', "scale=1080:1920:flags=lanczos,hue=s=0:enable='between(t,93.4,96.45)',noise=alls=14:allf=t+u:enable='between(t,93.4,96.45)',"
                       "vignette=PI/4:enable='between(t,93.4,96.45)',ass=subs.ass,format=yuv420p", '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
                '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True, cwd=HERE)
print('final:', out)
