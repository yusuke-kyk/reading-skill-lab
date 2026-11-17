"""Validate structure of an original RST-inspired question bank (not semantic correctness)."""
import json
import sys
from collections import Counter
from pathlib import Path

path=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).with_name('questions.pilot.json')
data=json.loads(path.read_text(encoding='utf-8'))
errors=[]
assert data['schemaVersion']==1
categories={c['id'] for c in data['categories']}
ids=[]
for i,q in enumerate(data['questions'],1):
    prefix=f"item {i} ({q.get('id','?')})"
    ids.append(q['id'])
    if q.get('category') not in categories: errors.append(f'{prefix}: invalid category')
    if not q['id'].startswith(q['category']+'-'): errors.append(f'{prefix}: category / id mismatch')
    if q.get('difficulty') not in ('basic','standard','advanced'): errors.append(f'{prefix}: invalid difficulty')
    if q.get('format')!='single_choice': errors.append(f'{prefix}: unsupported format')
    if q.get('version',0)<1: errors.append(f'{prefix}: invalid version')
    if q.get('status') not in ('pilot','approved','draft'): errors.append(f'{prefix}: unknown status')
    opts=q.get('options',[])
    if len(opts)!=4 or [x['id'] for x in opts]!=list('ABCD'): errors.append(f'{prefix}: options must be A,B,C,D')
    if q.get('answer') not in [x.get('id') for x in opts]: errors.append(f'{prefix}: invalid answer')
    for field in ('question','explanation','trap'):
        if not q.get(field,'').strip(): errors.append(f'{prefix}: blank {field}')
    for o in opts:
        if not o.get('text','').strip(): errors.append(f'{prefix}: blank option')
    vis=q.get('visual')
    if vis:
        if vis.get('type')!='table': errors.append(f'{prefix}: unsupported visual type')
        else:
            n=len(vis.get('headers',[]))
            if n<2 or any(len(r)!=n for r in vis.get('rows',[])) or not vis.get('rows'): errors.append(f'{prefix}: invalid table shape')
if len(ids)!=len(set(ids)): errors.append('duplicate IDs')
print(f"Validated {len(ids)} questions; categories={dict(Counter(q['category'] for q in data['questions']))}; answers={dict(Counter(q['answer'] for q in data['questions']))}")
if errors:
    print('ERRORS:',*errors,sep='\n - ')
    sys.exit(1)
print('Structure OK; semantic review by teacher is still required.')
