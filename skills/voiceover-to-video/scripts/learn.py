#!/usr/bin/env python3
"""The skill's memory. Every production reads it first and writes to it last, so each video starts where the
previous one ended and nothing that went wrong once is allowed to go wrong twice.

  learn.py brief                         rules to obey now (read BEFORE the treatment) + targets this run must beat
  learn.py gate  <workdir>               fails unless TREATMENT.md has a "## Lessons applied" section naming every
                                         must-apply lesson (open, user-reported, or recurring)
  learn.py add   --area A --title T --symptom S --cause C --fix F --rule R [--source user|self|qa] [--check NAME]
                                         record a mistake; a near-duplicate bumps the existing lesson instead
  learn.py hit   ID [--note N]           the same mistake happened again (recurrence -> must be fixed in code)
  learn.py promote ID --where W          the lesson is now enforced in code/QA (kit default, validator, template)
  learn.py run   --project P --review review.json --score area=N ... [--feedback "..."] [--next "..."] [--approved]
                                         log the post-mortem scorecard; raises the quality bar when a run beats it
  learn.py trend                         every run so far, per-area scores, so progress (or regression) is visible

Data lives in ../learning/ (lessons.json, runs.jsonl, bar.json); override with VTV_LEARN_DIR.
"""
import argparse, datetime, difflib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.environ.get('VTV_LEARN_DIR') or os.path.join(HERE, '..', 'learning')
LESSONS, RUNS, BAR = (os.path.join(DIR, f) for f in ('lessons.json', 'runs.jsonl', 'bar.json'))
AREAS = ['story', 'storyboard', 'camera', 'transitions', 'composition', 'lighting', 'materials', 'sets', 'character',
         'motion', 'particles', 'captions', 'grade', 'audio', 'render', 'pipeline']
JUDGED = ['story', 'storyboard', 'camera', 'transitions', 'composition', 'lighting', 'materials', 'sets', 'character',
          'motion', 'captions', 'polish']
today = lambda: datetime.date.today().isoformat()


def load(p, default):
    try:
        with open(p) as f: return json.load(f)
    except FileNotFoundError: return default


def save(p, data):
    os.makedirs(DIR, exist_ok=True)
    with open(p, 'w') as f: json.dump(data, f, indent=2, ensure_ascii=False); f.write('\n')


def runs():
    if not os.path.exists(RUNS): return []
    with open(RUNS) as f: return [json.loads(l) for l in f if l.strip()]


def must_apply(L):
    """Lessons a new production has to state how it avoids: not yet enforced in code, or reported by the user, or recurring."""
    return [l for l in L if l['status'] != 'enforced' or l.get('source') == 'user' or l.get('hits', 1) >= 2]


def cmd_brief(a):
    L = load(LESSONS, []); bar = load(BAR, {}); R = runs()
    print(f'# voiceover-to-video memory: {len(L)} lessons, {len(R)} past runs\n')
    import subprocess
    if subprocess.run(['git', '-C', DIR, 'rev-parse'], capture_output=True).returncode:
        print('WARNING: learning/ is not in a git checkout - lessons written here are lost on update. Set VTV_LEARN_DIR to a '
              'clone of the skill repo (or copy learning/ there) and commit it after the post-mortem.\n')
    print('## MUST APPLY this run (name each in TREATMENT.md "## Lessons applied")')
    for l in sorted(must_apply(L), key=lambda l: (-l.get('hits', 1), l['area'])):
        tag = 'USER' if l.get('source') == 'user' else l['status'].upper()
        print(f"- [{l['id']}] ({l['area']}, {tag}, seen x{l.get('hits', 1)}) {l['rule']}")
    enforced = [l for l in L if l not in must_apply(L)]
    if enforced:
        print('\n## Already enforced in code (do not undo)')
        for l in enforced: print(f"- [{l['id']}] {l['title']} -> {l.get('where', '?')}")
    if bar:
        print('\n## Quality bar this run must meet or beat')
        for k, v in bar.get('auto', {}).items(): print(f'- auto {k}: {v}')
        for k, v in bar.get('judged', {}).items(): print(f'- judged {k}: >= {v}/10')
    if R:
        last = R[-1]
        print(f"\n## Last run: {last['project']} ({last['date']}), overall {last.get('overall', '?')}/10")
        if last.get('feedback'): print(f"- user said: {last['feedback']}")
        for n in last.get('next', []): print(f'- do better: {n}')
        weak = sorted(last.get('scores', {}).items(), key=lambda kv: kv[1])[:3]
        if weak: print('- weakest areas last time: ' + ', '.join(f'{k} {v}/10' for k, v in weak) + '  <- spend effort here first')


def cmd_gate(a):
    p = os.path.join(a.workdir, 'TREATMENT.md')
    if not os.path.exists(p): sys.exit(f'GATE FAIL: {p} missing')
    txt = open(p).read()
    if '## Lessons applied' not in txt: sys.exit('GATE FAIL: TREATMENT.md has no "## Lessons applied" section (run learn.py brief)')
    sec = txt.split('## Lessons applied', 1)[1]
    missing = [l['id'] for l in must_apply(load(LESSONS, [])) if l['id'] not in sec]
    if missing: sys.exit('GATE FAIL: lessons not addressed: ' + ', '.join(missing))
    print('GATE OK: every must-apply lesson is addressed')


def cmd_add(a):
    L = load(LESSONS, [])
    key = (a.title + ' ' + a.symptom).lower()
    best = max(L, key=lambda l: difflib.SequenceMatcher(None, key, (l['title'] + ' ' + l['symptom']).lower()).ratio(), default=None)
    if best and difflib.SequenceMatcher(None, key, (best['title'] + ' ' + best['symptom']).lower()).ratio() > 0.62:
        a.id, a.note = best['id'], f'dup of new report: {a.title}'
        return cmd_hit(a)
    nid = 'L%03d' % (1 + max([int(l['id'][1:]) for l in L] or [0]))
    L.append(dict(id=nid, date=today(), last_seen=today(), area=a.area, title=a.title, symptom=a.symptom, cause=a.cause,
                  fix=a.fix, rule=a.rule, source=a.source, check=a.check, status='open', hits=1, history=[]))
    save(LESSONS, L); print(f'added {nid}: {a.title}  (fix it at the source, then `learn.py promote {nid} --where ...`)')


def cmd_hit(a):
    L = load(LESSONS, [])
    l = next((l for l in L if l['id'] == a.id), None)
    if not l: sys.exit(f'no lesson {a.id}')
    l['hits'] = l.get('hits', 1) + 1; l['last_seen'] = today()
    l.setdefault('history', []).append({'date': today(), 'note': a.note or ''})
    if l['status'] == 'enforced': l['status'] = 'regressed'
    save(LESSONS, L)
    print(f"{l['id']} seen x{l['hits']} ({l['status']}). A repeat mistake means the rule alone is not enough: "
          'encode it in the kit, a template default or an automatic check, then promote.')


def cmd_promote(a):
    L = load(LESSONS, [])
    l = next((l for l in L if l['id'] == a.id), None)
    if not l: sys.exit(f'no lesson {a.id}')
    l['status'], l['where'] = 'enforced', a.where
    save(LESSONS, L); print(f"{l['id']} enforced in {a.where}")


def cmd_run(a):
    scores = {k: float(v) for k, v in (s.split('=', 1) for s in a.score)}
    unknown = set(scores) - set(JUDGED)
    if unknown: sys.exit(f'unknown score areas {unknown}; use {JUDGED}')
    missing = [k for k in JUDGED if k not in scores]
    if missing: sys.exit(f'score every area (be harsh, 10 = broadcast quality): missing {missing}')
    review = load(a.review, {}) if a.review else {}
    bar = load(BAR, {'auto': {}, 'judged': {}})
    overall = round(sum(scores.values()) / len(scores), 2)
    fails = []
    for k, v in bar.get('judged', {}).items():
        if scores.get(k, 0) < v: fails.append(f'{k} {scores.get(k)} < bar {v}')
    for k, v in bar.get('auto', {}).items():
        got = review.get('summary', {}).get(k[:-4] if k.endswith('_max') else k)
        if got is None: continue
        worse = got > v if k.endswith('_max') else got < v
        if worse: fails.append(f'auto {k} {got} vs bar {v}')
    rec = dict(date=today(), project=a.project, scores=scores, overall=overall, auto=review.get('summary', {}),
               flags=review.get('flag_counts', {}), feedback=a.feedback, next=a.next, approved=a.approved, below_bar=fails)
    os.makedirs(DIR, exist_ok=True)
    with open(RUNS, 'a') as f: f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    prev = runs()[:-1]
    if prev: print(f"overall {overall}/10 (previous {prev[-1]['overall']}, best {max(r['overall'] for r in prev)})")
    else: print(f'overall {overall}/10 (first logged run)')
    if fails:
        print('BELOW BAR - each of these needs a lesson (learn.py add) and a fix before delivery:')
        for x in fails: print('  - ' + x)
    # ratchet: an approved run that clears the bar becomes the new floor (judged: its score, capped; auto: its value)
    if a.approved and not fails:
        for k, v in scores.items(): bar['judged'][k] = max(bar['judged'].get(k, 0), min(v, 9.5))
        for k in ('sat_mean', 'contrast_mean', 'sharp_median', 'detail_mean'):
            if k in rec['auto']: bar['auto'][k] = round(max(bar['auto'].get(k, 0), rec['auto'][k] * 0.97), 4)
        for k in ('flagged_seconds_max', 'flat_seconds_max'):
            src = rec['auto'].get(k.replace('_max', ''))
            if src is not None: bar['auto'][k] = min(bar['auto'].get(k, 1e9), src)
        save(BAR, bar); print('quality bar raised: the next run has to be at least this good')


def cmd_trend(a):
    R = runs()
    if not R: return print('no runs yet')
    print('date        project               overall ' + ' '.join(k[:5].rjust(5) for k in JUDGED))
    for r in R:
        print(f"{r['date']}  {r['project'][:20]:20}  {r['overall']:6} " + ' '.join(str(r['scores'].get(k, '-')).rjust(5) for k in JUDGED))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest='cmd', required=True)
    s.add_parser('brief')
    g = s.add_parser('gate'); g.add_argument('workdir')
    ad = s.add_parser('add')
    for k in ('area', 'title', 'symptom', 'cause', 'fix', 'rule'): ad.add_argument('--' + k, required=True)
    ad.add_argument('--source', default='self', choices=['user', 'self', 'qa']); ad.add_argument('--check', default=None)
    h = s.add_parser('hit'); h.add_argument('id'); h.add_argument('--note', default='')
    pr = s.add_parser('promote'); pr.add_argument('id'); pr.add_argument('--where', required=True)
    r = s.add_parser('run'); r.add_argument('--project', required=True); r.add_argument('--review')
    r.add_argument('--score', nargs='+', default=[]); r.add_argument('--feedback', default='')
    r.add_argument('--next', action='append', default=[]); r.add_argument('--approved', action='store_true')
    s.add_parser('trend')
    a = p.parse_args()
    if a.cmd == 'add' and a.area not in AREAS: sys.exit(f'area must be one of {AREAS}')
    {'brief': cmd_brief, 'gate': cmd_gate, 'add': cmd_add, 'hit': cmd_hit, 'promote': cmd_promote, 'run': cmd_run, 'trend': cmd_trend}[a.cmd](a)


if __name__ == '__main__':
    main()
