#!/usr/bin/env python3
"""Rebuild or verify source coverage, without interpreting conversation as code."""
import hashlib
import json
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent
raw = (root / 'inputs/conversation.json').read_bytes()
pages = json.loads(raw)
turns = list(reversed([t for page in pages for t in page['turns']]))
assert len(pages) == 3 and [len(p['turns']) for p in pages] == [10, 10, 3]
assert [p['page']['hasMore'] for p in pages] == [True, True, False]
assert pages[-1]['page']['nextCursor'] is None
assert all(p['thread']['id'] == '6aa1c824-d7a8-83ec-b559-5d8f855ddecb' for p in pages)
assert len({t['id'] for t in turns}) == 23
assert all(turns[i]['startedAt'] <= turns[i+1]['startedAt'] for i in range(22))

def digest(data):
    return hashlib.sha256(data).hexdigest()

def content(item):
    if item['type'] == 'agentMessage':
        return item['text']
    assert item['type'] == 'userMessage'
    assert all(p['type'] == 'text' for p in item['content'])
    return '\n'.join(p['text'] for p in item['content'])

entries, links, counts = [], [], {'userMessage': 0, 'agentMessage': 0}
for number, turn in enumerate(turns, 1):
    messages = []
    for item in turn['items']:
        text = content(item)
        counts[item['type']] += 1
        urls = re.findall(r'\]\((https?://[^\s)]+)\)', text)
        links.extend({'turn': f'T{number:02}', 'messageId': item['id'], 'url': u} for u in urls)
        messages.append({'id': item['id'], 'type': item['type'], 'characters': len(text),
                         'utf8Sha256': digest(text.encode('utf-8'))})
    entries.append({'label': f'T{number:02}', 'turnId': turn['id'], 'messages': messages})
assert counts == {'userMessage': 23, 'agentMessage': 21}
assert len(links) == 45
unique = list(dict.fromkeys(x['url'] for x in links))
assert len(unique) == 44
assert [i+1 for i,t in enumerate(turns) if len(t['items']) == 1] == [7, 13]
assert content(turns[11]['items'][-1]).endswith('干')
manifest = {
    'schemaVersion': 1, 'capturedOn': '2026-09-10',
    'baseCommit': '8b1e0b143f7091da0acba3ee24af58595e721eb8',
    'conversationId': pages[0]['thread']['id'], 'title': pages[0]['thread']['title'],
    'rawFile': 'inputs/conversation.json', 'rawSha256': digest(raw),
    'pages': [p['page'] for p in pages], 'counts': counts, 'turns': entries,
    'urlOccurrences': links,
    'sources': [{'id': f'S{i:02}', 'url': u} for i,u in enumerate(unique, 1)],
    'limitations': ['T07 and T13 have no returned assistant message',
                    'T12 ends mid-sentence in both paginated and single-turn reads',
                    'Opaque citations and image references are not restored external sources',
                    'Accessible pagination coverage does not establish external full-text coverage']
}
rendered = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
if '--write' in sys.argv:
    (root / 'source-manifest.json').write_text(rendered)
else:
    assert (root / 'source-manifest.json').read_text() == rendered, 'manifest drift'
ledger = (root / 'turn-ledger.md').read_text()
index = (root / 'source-index.md').read_text()
for entry in entries:
    assert ledger.count('`' + entry['turnId'] + '`') == 1, entry['label']
for i, url in enumerate(unique, 1):
    assert f'| S{i:02} ' in index and f']({url})' in index, url
plan = (root / 'pr-plan.md').read_text()
for prefix, count in [('HC', 7), ('RA', 7), ('AT', 8)]:
    for n in range(count):
        assert f'| {prefix}{n} ' in plan
print(json.dumps({'pass': True, 'turns': 23, 'messages': 44,
                  'urlOccurrences': 45, 'uniqueUrls': 44,
                  'legacyPlanItemsMapped': 22, 'rawSha256': digest(raw)}, indent=2))
