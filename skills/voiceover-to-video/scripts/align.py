#!/usr/bin/env python3
"""Voiceover analysis: force-align script text to audio (offline, pocketsphinx), then find emphasis words and pauses.
Usage: align.py voice.mp3 script.txt out_dir
Writes words.json [[word,start,end]], lines.json [[start,end,text]], beats.json {pauses:[[a,b]], accents:[[t,word]], duration}.
Strip stage directions like [PAUSE] from script.txt (done automatically for [...] tags)."""
import json, math, re, struct, subprocess, sys, wave, os
from pocketsphinx import Decoder
audio, script, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
wav = os.path.join(out, 'vo16k.wav'); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', audio, '-ac', '1', '-ar', '16000', wav], check=True)
raw = re.sub(r'\[[^\]]*\]', ' ', open(script).read())
raw = re.sub(r'(\d+)s\b', lambda m: {'1980': 'nineteen eighties'}.get(m.group(1), m.group(1)), raw)
toks = raw.split(); words = [re.sub(r"[^a-z']", '', w.lower()) for w in toks]; keep = [i for i, w in enumerate(words) if w]
d = Decoder(samprate=16000, bestpath=False)
for w in set(words[i] for i in keep):
    if d.lookup_word(w) is None:
        base = w.rstrip("'s"); pron = d.lookup_word(base)
        d.add_word(w, (pron + ' Z') if pron else 'AH', True); print('OOV (check pronunciation):', w)
d.set_align_text(' '.join(words[i] for i in keep))
data = open(wav, 'rb').read()[44:]; d.start_utt(); d.process_raw(data, full_utt=True); d.end_utt()
segs = [(s.word, s.start_frame / 100, (s.end_frame + 1) / 100) for s in d.seg() if s.word not in ('<s>', '</s>', '<sil>', '(NULL)')]
json.dump(segs, open(os.path.join(out, 'words.json'), 'w'))
lines, cur, st = [], [], None
for (w, a, b), i in zip(segs, keep):
    st = a if st is None else st; cur.append(toks[i])
    if toks[i].endswith(('.', '?', '!')): lines.append([st, b, ' '.join(cur)]); cur, st = [], None
json.dump(lines, open(os.path.join(out, 'lines.json'), 'w'), indent=1)
w = wave.open(wav); n = w.getnframes(); pcm = struct.unpack('<%dh' % n, w.readframes(n))
rms = lambda a, b: math.sqrt(sum(x * x for x in pcm[int(a * 16000):int(b * 16000)] or [0]) / max(1, int((b - a) * 16000)))
R = [rms(a, b) for _, a, b in segs]; acc = []
for i, (wd, a, b) in enumerate(segs):
    nb = [R[j] for j in range(max(0, i - 3), min(len(R), i + 4)) if j != i]
    if R[i] / (sum(nb) / len(nb)) > 1.45 and b - a > 0.15: acc.append([round(a, 2), wd])
pauses = [[round(b1, 2), round(a2, 2)] for (_, _, b1), (_, a2, _) in zip(segs, segs[1:]) if a2 - b1 > 0.3]
json.dump({'duration': n / 16000, 'pauses': pauses, 'accents': acc}, open(os.path.join(out, 'beats.json'), 'w'), indent=1)
for l in lines: print(f'{l[0]:6.2f}-{l[1]:6.2f}  {l[2]}')
print('pauses (transition slots):', len(pauses), '| accents:', ', '.join(f'{t}:{w}' for t, w in acc))
