#!/usr/bin/env python3
"""Validate the delivered planning packet, NOT CourtWork product behavior."""
from pathlib import Path
import hashlib, json, re, sys

def main() -> int:
    root=Path(__file__).resolve().parent
    manifest=json.loads((root/'packet-manifest.json').read_text(encoding='utf-8'))
    for item in manifest['files']:
        p=root/item['path']
        if not p.is_file():raise ValueError(f"Missing: {p.name}")
        raw=p.read_bytes()
        if len(raw)!=item['bytes'] or hashlib.sha256(raw).hexdigest()!=item['sha256']:
            raise ValueError(f"Integrity mismatch: {p.name}")
    plan=json.loads((root/'plan.json').read_text(encoding='utf-8'))
    nodes={n['id']:n for n in plan['nodes']}
    if len(nodes)!=len(plan['nodes']):raise ValueError('Duplicate plan node')
    sources=json.loads((root/'source-manifest.json').read_text(encoding='utf-8'))
    ids={s['id'] for s in sources['sources']}
    active=set(); done=set()
    def visit(nid):
        if nid not in nodes:raise ValueError(f'Unknown dependency: {nid}')
        if nid in active:raise ValueError(f'Dependency cycle: {nid}')
        if nid in done:return
        active.add(nid)
        for dep in nodes[nid]['dependsOn']:visit(dep)
        active.remove(nid);done.add(nid)
    for nid,node in nodes.items():
        visit(nid)
        if node['status'] not in ('proposed-not-created','not-run'):raise ValueError('Unexpected completed status')
        if node['remotePrNumber'] is not None or node['implementationCommit'] is not None:
            raise ValueError('Packet falsely claims remote implementation')
        if not set(node['sourceRefs'])<=ids:raise ValueError(f'Unknown source in {nid}')
        if not (root/node['contractDocument']).exists():raise ValueError('Missing contract')
    for p in root.glob('*.md'):
        text=p.read_text(encoding='utf-8')
        for target in re.findall(r'\]\(([^)]+)\)',text):
            if '://' in target or target.startswith('#'):continue
            targetpath=target.split('#',1)[0]
            if targetpath and not (p.parent/targetpath).is_file():
                raise ValueError(f'Broken local link in {p.name}: {target}')
        for sid in re.findall(r'\[([RE]\d{2})\]',text):
            if sid not in ids:raise ValueError(f'Unknown citation in {p.name}: {sid}')
    audit=json.loads((root/'audit.json').read_text(encoding='utf-8'))
    for field in ('npmCi','npmTest','smoke','browserProductTest'):
        if audit[field]!='not-run':raise ValueError('Audit unexpectedly claims a product test')
    print(json.dumps({'packetValidation':'pass','manifestFiles':len(manifest['files']),
          'planNodes':len(nodes),'sourceEntries':len(ids),'dependencyGraph':'acyclic',
          'productTests':'not-run'},ensure_ascii=False,indent=2))
    return 0
if __name__=='__main__':
    try:sys.exit(main())
    except (OSError,ValueError,KeyError) as exc:
        print(f'Packet validation failed: {exc}',file=sys.stderr);sys.exit(1)
