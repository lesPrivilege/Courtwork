"""Build a credential-free UI source/reference handoff from an explicit Git base."""
from pathlib import Path
import hashlib, json, subprocess, sys, zipfile
ROOT = Path(__file__).resolve().parents[3]
BASE = '6e211bd5f5169a603bc801024d16f87eec16a071'
HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/courtwork-attention-ui-handoff-20260913.zip')
def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])
def tree(path):
    return git('ls-tree', '-r', '--name-only', BASE, path).decode().splitlines()
paths = tree('app/web') + tree('evidence/delivery-rollup-20260910/attention/screenshots')
paths += [
    'AGENTS.md', 'engineering/current.md',
    'engineering/design/attention-agent-2026-09-10/README.md',
    'engineering/design/attention-triage-2026-09-10/README.md',
    'engineering/design/frontend-audit-2026-09-13/ia-plan.md',
    'engineering/design/frontend-audit-2026-09-13/ia-delivery.md',
    'engineering/research/attention-human-loop-2026-09-09/work-orders.md',
    'engineering/design/scout/README.md',
    'evidence/delivery-rollup-20260910/attention/independent-browser-verification.json',
    'evidence/semantic-polish-20260911/README.md',
    'evidence/dystopia-sk3-20260910/README.md',
    'docs/work-core/attention.md', 'app/docs/attention-agent.md',
    'engineering/design/agent-interface-2026-09-10/frontend-contract.md',
    'engineering/design/agent-interface-2026-09-10/precedents.md',
    'engineering/design/agent-interface-2026-09-10/precedent-map.md',
    'engineering/design/agent-interface-2026-09-10/change-template.md',
    'engineering/design/ui-composition-standard.md', 'engineering/design/copy-convention.md',
    'engineering/design/atlas/README.md',
    'engineering/mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md',
    'engineering/mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts',
    'engineering/mvp/execution/work-surface-kit/contracts/color-governance.md',
    'engineering/mvp/execution/work-surface-kit/work-orders/WO-ATT-FE01.md',
    'engineering/design/skin-injection-2026-09-10/skin-constitution.md',
    'engineering/design/home-composition-2026-09-10/disclosure-overlay.md',
    'engineering/design/frontend-audit-2026-09-13/attention-consumption.md',
    'engineering/design/frontend-audit-2026-09-13/attention-source.json',
    'engineering/design/frontend-audit-2026-09-13/ia-data-surfaces.md',
    'engineering/design/frontend-audit-2026-09-13/context-tps-audit.md',
    'engineering/design/frontend-audit-2026-09-13/evidence/42-tasktori-reference.png',
    'evidence/delivery-rollup-20260910/attention/independent-verification.md',
]
files = {p: git('show', BASE + ':' + p) for p in sorted(set(paths))}
for p in sorted(HERE.glob('*')):
    if p.is_file() and p.suffix in ('.md', '.py'):
        files[p.relative_to(ROOT).as_posix()] = p.read_bytes()
files['START-HERE.md'] = '''# Courtwork Attention UI handoff

Read engineering/design/attention-ui-handoff-2026-09-13/CLAUDE-PROMPT.md first.
Product source is fixed at 6e211bd; the dated handoff documents express the newer assignment.
This packet includes app/web source, selected contracts and historical screenshots. It does not include a running backend or the whole repository. Links outside the manifest require the Courtwork repository and are not required to understand the primary assignment. Build the candidate with independent synthetic data. Context/TPS belongs to Astra's later serial task.
'''.encode()
manifest = {'productBase': BASE, 'scope': 'Attention UI and motion authoring input, not acceptance',
            'files': [{'path': p, 'sha256': hashlib.sha256(b).hexdigest(), 'bytes': len(b)} for p,b in sorted(files.items())]}
files['PACKET-MANIFEST.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for p,b in sorted(files.items()):
        info = zipfile.ZipInfo(p, date_time=(2026,9,13,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,b)
with zipfile.ZipFile(OUT) as z:
    assert z.testzip() is None
    for row in manifest['files']:
        assert hashlib.sha256(z.read(row['path'])).hexdigest() == row['sha256']
print(json.dumps({'path':str(OUT),'files':len(files),'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()}))
