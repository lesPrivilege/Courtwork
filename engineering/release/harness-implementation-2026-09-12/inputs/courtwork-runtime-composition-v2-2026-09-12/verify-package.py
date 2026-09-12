#!/usr/bin/env python3
"""Verify this document packet only; never claims product or provider tests."""
from pathlib import Path
import hashlib, json, re, sys, zipfile

def main():
    root=Path(__file__).resolve().parent
    manifest=json.loads((root/'packet-manifest.json').read_text(encoding='utf-8'))
    for entry in manifest['files']:
        p=root/entry['path']
        if not p.is_file():
            raise ValueError(f"missing: {entry['path']}")
        data=p.read_bytes()
        if len(data)!=entry['bytes'] or hashlib.sha256(data).hexdigest()!=entry['sha256']:
            raise ValueError(f"content mismatch: {entry['path']}")
    plan=json.loads((root/'plan.json').read_text(encoding='utf-8'))
    nodes={n['id']:n for n in plan['nodes']}
    visiting=set(); done=set()
    def visit(key):
        if key in visiting: raise ValueError('cyclic node dependencies')
        if key in done: return
        if key not in nodes: raise ValueError('unknown dependency: '+key)
        visiting.add(key)
        for dep in nodes[key]['depends_on']: visit(dep)
        visiting.remove(key); done.add(key)
    for key in nodes: visit(key)
    if any(n['status']!='proposed-not-created' or n['tests']!='not-run' for n in nodes.values()):
        raise ValueError('unexpected implementation/test claim')
    link_count=0
    for p in root.glob('*.md'):
        text=p.read_text(encoding='utf-8')
        for target in re.findall(r'\]\(([^)]+)\)',text):
            if '://' in target or target.startswith('#'): continue
            local,_,anchor=target.partition('#')
            dest=root/local
            if not dest.is_file(): raise ValueError(f'broken link: {p.name} -> {target}')
            if anchor and f'id="{anchor}"' not in dest.read_text(encoding='utf-8'):
                raise ValueError(f'unknown anchor: {target}')
            link_count+=1
    receipt=json.loads((root/'input-receipt.json').read_text(encoding='utf-8'))
    archived=root/receipt['previous_zip_archive_path']
    original=next(x for x in receipt['inputs'] if x['name'].endswith('.zip'))
    if hashlib.sha256(archived.read_bytes()).hexdigest()!=original['sha256']:
        raise ValueError('previous zip bytes changed')
    with zipfile.ZipFile(archived) as z:
        if z.testzip() is not None: raise ValueError('invalid archived zip')
    print(json.dumps({'packet_integrity':'pass','tracked_files':len(manifest['files']),
      'internal_links_checked':link_count,'node_graph':'acyclic','archived_v1':'byte-identical',
      'product_tests':'not-run','provider_tests':'not-run','gui_tests':'not-run'},ensure_ascii=False,indent=2))

if __name__=='__main__':
    try: main()
    except (OSError,ValueError,KeyError,zipfile.BadZipFile) as e:
        print(f'FAIL: {e}',file=sys.stderr);sys.exit(1)
