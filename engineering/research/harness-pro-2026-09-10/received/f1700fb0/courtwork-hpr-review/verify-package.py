#!/usr/bin/env python3
"""Verify this review bundle, not Courtwork or the live source repository."""
from pathlib import Path
import hashlib, json, re, sys
ROOT = Path(__file__).resolve().parent

def fail(message):
    raise RuntimeError(message)

def path_inside(name):
    p=(ROOT/name).resolve()
    if not p.is_relative_to(ROOT) or not p.is_file():
        fail('Missing or unsafe artifact: '+name)
    return p

def main():
    manifest=json.loads(path_inside('output-manifest.json').read_text())
    seen=set()
    for item in manifest['artifacts']:
        name=item['path']
        if name in seen: fail('Duplicate artifact: '+name)
        seen.add(name)
        b=path_inside(name).read_bytes()
        if len(b)!=item['bytes'] or hashlib.sha256(b).hexdigest()!=item['sha256']:
            fail('Digest/length mismatch: '+name)
    for line in path_inside('SHA256SUMS').read_text().splitlines():
        digest,name=line.split('  ',1)
        if hashlib.sha256(path_inside(name).read_bytes()).hexdigest()!=digest:
            fail('SHA256SUMS mismatch: '+name)
    register=json.loads(path_inside('decision-register.json').read_text())['items']
    ids=[x['id'] for x in register]
    if len(ids)!=24 or len(set(ids))!=len(ids): fail('Expected 24 unique output IDs')
    m=json.loads(path_inside('implementation-map.json').read_text())
    if len(m['workOrders'])!=13: fail('Expected 13 proposed work orders')
    if set(m['outputToWorkOrders'])!=set(ids): fail('Output coverage mismatch')
    for o,targets in m['outputToWorkOrders'].items():
        if not targets: fail('Unmapped output: '+o)
        for t in targets:
            if o not in m['workOrderToOutputs'].get(t,[]): fail('Missing reverse mapping: '+o+' -> '+t)
    for t,outputs in m['workOrderToOutputs'].items():
        for o in outputs:
            if t not in m['outputToWorkOrders'].get(o,[]): fail('Missing forward mapping: '+t+' -> '+o)
    deps={x['id']:x['dependsOn'] for x in m['workOrders']}
    active=set(); done=set()
    def visit(n):
        if n in active: fail('Work-order dependency cycle')
        if n in done: return
        if n not in deps: fail('Missing dependency '+n)
        active.add(n)
        for d in deps[n]:visit(d)
        active.remove(n);done.add(n)
    for n in deps:visit(n)
    source=json.loads(path_inside('source-manifest.json').read_text())
    srcids={x['id'] for x in source['repositoryFiles']}|{x['id'] for x in source['officialWebSources']}
    for i in register:
        if i['localDisposition'] is not None: fail('Unexpected claimed local disposition')
        if not set(i['sourceIds'])<=srcids: fail('Unknown source ID '+i['id'])
        text=path_inside(i['primaryArtifact']).read_text()
        if i['id'] not in text: fail('Missing primary output ID: '+i['id'])
    for item in manifest['artifacts']:
        if not set(item['outputIds'])<=set(ids): fail('Unknown artifact mapping')
    for x in m['workOrders']:path_inside(x['file'])
    b=path_inside('reference/mcp-manager.baseline.mjs').read_bytes()
    blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
    if blob!='055e66223a91eec4a4aade665f8d96af488e9573': fail('Baseline source blob mismatch')
    # Verify the combined report actually contains all originals, not summaries.
    combined=path_inside('FULL_REVIEW.md').read_text()
    for name in ['README.md','HPR-01-baseline.md','architecture-contracts.md','HPR-02-work-orders.md','HPR-03-gates.md','collection-handoff.md']:
        if path_inside(name).read_text().strip() not in combined: fail('Incomplete combined report: '+name)
    print(json.dumps({'bundleIntegrity':'pass','artifactCount':len(seen),'outputItems':len(ids),'workOrders':len(deps),'bidirectionalMappings':'pass','dependencyGraph':'acyclic','localDispositions':'all unset','baselineGitBlob':blob,'productAcceptance':'not-run'},ensure_ascii=False,indent=2))
if __name__=='__main__':
    try: main()
    except Exception as error:
        print(str(error),file=sys.stderr);sys.exit(1)
