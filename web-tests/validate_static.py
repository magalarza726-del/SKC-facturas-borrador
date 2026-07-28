from __future__ import annotations
import json,re
from pathlib import Path

root=Path(__file__).resolve().parents[1]
docs=root/'docs'
errors=[]

for required in ['index.html','404.html','.nojekyll','manifest.webmanifest','sw.js','assets/app.js','assets/styles.css','supabase-schema.sql']:
    if not (docs/required).exists(): errors.append(f'Missing {required}')

# Resolve relative ES-module imports.
pat=re.compile(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]")
for js in docs.rglob('*.js'):
    text=js.read_text(encoding='utf-8')
    for ref in pat.findall(text):
        if ref.startswith('.'):
            p=(js.parent/ref).resolve()
            if not p.exists(): errors.append(f'{js.relative_to(root)} imports missing {ref}')

# Validate referenced HTML assets.
html=(docs/'index.html').read_text(encoding='utf-8')
for ref in re.findall(r'(?:href|src)=["\']([^"\']+)',html):
    if ref.startswith(('./','../')):
        p=(docs/ref.split('#')[0].split('?')[0]).resolve()
        if not p.exists(): errors.append(f'index.html references missing {ref}')

manifest=json.loads((docs/'manifest.webmanifest').read_text(encoding='utf-8'))
for icon in manifest.get('icons',[]):
    p=(docs/icon['src']).resolve()
    if not p.exists(): errors.append(f'Manifest icon missing: {icon["src"]}')

sw=(docs/'sw.js').read_text(encoding='utf-8')
for ref in re.findall(r"'((?:\./)[^']+)'",sw):
    if ref=='./': continue
    p=(docs/ref).resolve()
    if not p.exists(): errors.append(f'Service worker caches missing {ref}')

workflow=root/'.github/workflows/pages.yml'
if not workflow.exists(): errors.append('Missing Pages workflow')
elif 'path: docs' not in workflow.read_text(encoding='utf-8'): errors.append('Pages workflow does not upload docs')

if errors:
    raise SystemExit('\n'.join(errors))
print('STATIC VALIDATION OK')
