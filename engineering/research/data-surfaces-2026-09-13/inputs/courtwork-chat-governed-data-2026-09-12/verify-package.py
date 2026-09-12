"""Verify this research packet's integrity and registration references only."""
from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'MANIFEST.json').read_text(encoding='utf-8'))
for item in manifest['files']:
    path = root / item['path']
    data = path.read_bytes()
    assert len(data) == item['bytes'], f"size mismatch: {path.name}"
    assert hashlib.sha256(data).hexdigest() == item['sha256'], f"hash mismatch: {path.name}"

sources = json.loads((root / 'source-ledger.json').read_text(encoding='utf-8'))['sources']
ids = {source['id'] for source in sources}
channels = json.loads((root / 'channel-register.json').read_text(encoding='utf-8'))
assert channels['policy_approval'] is False
for channel in channels['channels']:
    assert set(channel['source_ids']) <= ids, f"unknown source: {channel['id']}"
    assert channel['implementation'] == 'not-implemented'

orders = json.loads((root / 'work-order-map.json').read_text(encoding='utf-8'))['orders']
by_id = {order['id']: order for order in orders}
assert len(by_id) == len(orders)
visiting, visited = set(), set()
def visit(key):
    assert key in by_id, f'unknown dependency: {key}'
    assert key not in visiting, f'cycle: {key}'
    if key in visited:
        return
    visiting.add(key)
    for dep in by_id[key]['depends_on']:
        visit(dep)
    visiting.remove(key)
    visited.add(key)
for key in by_id:
    visit(key)

for path in root.glob('*.md'):
    text = path.read_text(encoding='utf-8')
    assert text.count('```') % 2 == 0, f'unclosed code fence: {path.name}'
    for target in re.findall(r'\]\(([^)]+)\)', text):
        if '://' in target or target.startswith('#'):
            continue
        filepart, _, anchor = target.partition('#')
        linked = root / filepart
        assert linked.is_file(), f'broken local link: {path.name}: {target}'
        if anchor and filepart == 'SOURCES.md':
            assert f'id="{anchor}"' in linked.read_text(encoding='utf-8'), target
print(f"PASS: {len(manifest['files'])} file hashes; {len(sources)} source records; "
      f"{len(channels['channels'])} channel entries; {len(orders)} acyclic proposed slices; local links.")
print('Research packet only. Product/GUI/provider/policy approval tests: NOT RUN.')
