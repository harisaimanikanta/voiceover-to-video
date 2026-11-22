#!/usr/bin/env python3
"""Transcribe a voiceover when the user gives no script (offline Whisper via sherpa-onnx; model from GitHub releases,
which works even where huggingface.co is blocked).

  transcribe.py voice.mp3 <workdir> [--model small.en|base.en|medium.en]

Writes <workdir>/script.txt (one sentence per line, numbers spelled out so align.py can align them) and
<workdir>/numbers.json ([[spoken, written], ...]) to restore digits in captions (see the NUM table in the reference
scene). Read the transcript: fix proper nouns (names, places) by hand before running align.py.
Needs: pip install sherpa-onnx numpy; ffmpeg.
"""
import argparse, json, os, re, subprocess, sys, tarfile, urllib.request, wave
import numpy as np

ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split()
def words(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' and ' + words(n % 100))
    if n < 1000000: return words(n // 1000) + ' thousand' + ('' if n % 1000 == 0 else ' ' + words(n % 1000))
    return str(n)
def year(n):
    hi, lo = divmod(n, 100)
    if lo == 0: return words(hi) + ' hundred'
    if 2000 <= n < 2010: return words(n)
    return words(hi) + ' ' + (('oh ' + ONES[lo]) if lo < 10 else words(lo))
def plural(w): return w[:-1] + 'ies' if w.endswith('y') else w + 's'
def spell(text):
    pairs = []
    def rep(m):
        s = m.group(0); n = int(s.rstrip('s').replace(',', ''))
        if s.endswith('s') and 1000 <= n < 2100: w = plural(year(n)) if n % 100 else words(n // 100) + ' hundreds'
        elif 1100 <= n < 2100 and len(s) == 4: w = year(n)
        else: w = words(n)
        pairs.append([w, s]); return w
    return re.sub(r'\b\d[\d,]*s?\b', rep, text), pairs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('voice'); ap.add_argument('workdir'); ap.add_argument('--model', default='small.en')
    a = ap.parse_args()
    import sherpa_onnx
    cache = os.path.expanduser('~/.cache/vtv-asr'); d = os.path.join(cache, f'sherpa-onnx-whisper-{a.model}')
    if not os.path.isdir(d):
        os.makedirs(cache, exist_ok=True); url = f'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-{a.model}.tar.bz2'
        print('downloading', url); tmp = os.path.join(cache, 'm.tar.bz2'); urllib.request.urlretrieve(url, tmp); tarfile.open(tmp).extractall(cache); os.remove(tmp)
    m = a.model
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{d}/{m}-encoder.int8.onnx', decoder=f'{d}/{m}-decoder.int8.onnx', tokens=f'{d}/{m}-tokens.txt', language='en', task='transcribe', num_threads=4)
    os.makedirs(a.workdir, exist_ok=True); wav = os.path.join(a.workdir, 'voice16.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.voice, '-ac', '1', '-ar', '16000', wav], check=True)
    w = wave.open(wav); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768; sr = 16000
    fr = int(0.02 * sr); e = np.sqrt(np.convolve(x ** 2, np.ones(fr) / fr, 'same'))
    cuts = [0]
    while len(x) - cuts[-1] > 28 * sr:   # whisper takes <= 30 s: cut at the quietest point 18-28 s in
        lo, hi = cuts[-1] + 18 * sr, cuts[-1] + 28 * sr; cuts.append(lo + int(np.argmin(e[lo:hi])))
    cuts.append(len(x)); text = []
    for s0, s1 in zip(cuts, cuts[1:]):
        st = rec.create_stream(); st.accept_waveform(sr, x[s0:s1]); rec.decode_stream(st); text.append(st.result.text.strip())
        print(f'{s0 / sr:6.1f}-{s1 / sr:6.1f}  {text[-1]}')
    spoken, pairs = spell(' '.join(text))
    open(os.path.join(a.workdir, 'script.txt'), 'w').write('\n'.join(re.split(r'(?<=[.?!])\s+', spoken.strip())) + '\n')
    json.dump(pairs, open(os.path.join(a.workdir, 'numbers.json'), 'w'), indent=1)
    print(f'wrote {a.workdir}/script.txt ({len(pairs)} numbers spelled out -> numbers.json). Check names/spelling, then run align.py.')


if __name__ == '__main__':
    main()
