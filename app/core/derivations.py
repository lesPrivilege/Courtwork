"""BE-41: read-only projection of Core metadata, never candidate/source bodies."""
import hashlib
from datetime import datetime, timezone

from core import CoreError, _exact_keys, _ident, canonical_json, parse_json


def project(store, request):
    _exact_keys(request, {'project_id', 'limit', 'offset', 'snapshot_ref'}, 'derivations query')
    project_id = request['project_id']
    _ident(project_id, 'project_id')
    limit, offset = request['limit'], request['offset']
    if (type(limit) is not int or not 1 <= limit <= 100 or type(offset) is not int
            or not 0 <= offset <= 9007199254740991):
        raise CoreError('INVALID', 'derivations page')
    expected = request['snapshot_ref']
    if expected is not None and (not isinstance(expected, str) or len(expected) != 75
                                 or not expected.startswith('core-state:')
                                 or any(c not in '0123456789abcdef' for c in expected[11:])):
        raise CoreError('INVALID', 'derivations snapshot')
    conn = store.conn
    # All pages bind the same project-wide metadata read transaction. Hash the
    # inputs incrementally, including off-page candidates and disclosure policy.
    conn.execute('BEGIN')
    try:
        digest = hashlib.sha256()
        digest.update(canonical_json(['work-derivations/v1', project_id]).encode())
        queries = [
            ('matter', '''SELECT m.id,m.version,m.source_version,m.contract_version,m.active_artifact,s.extension_id,a.title FROM app_work_scope s
                JOIN matter m ON m.id=s.matter_id LEFT JOIN app_matter a ON a.matter_id=m.id
                WHERE s.project_id=? ORDER BY m.id'''),
            ('candidate', '''SELECT c.id,c.matter_id,c.source_version,c.contract_version,c.status,c.payload_hash
                FROM candidate c JOIN app_work_scope s ON s.matter_id=c.matter_id
                WHERE s.project_id=? ORDER BY c.matter_id,c.id'''),
            ('history', '''SELECT h.* FROM source_history h JOIN app_work_scope s ON s.matter_id=h.matter_id
                WHERE s.project_id=? ORDER BY h.matter_id,h.revision,h.source_id'''),
            ('sources', '''SELECT h.* FROM source_set h JOIN app_work_scope s ON s.matter_id=h.matter_id
                WHERE s.project_id=? ORDER BY h.matter_id,h.source_id'''),
            ('policy', 'SELECT * FROM matter_disclosure WHERE project_id=? ORDER BY matter_id'),
        ]
        selected, total, partial = [], 0, False
        for kind, sql in queries:
            for row in conn.execute(sql, (project_id,)):
                digest.update((canonical_json([kind, dict(row)]) + '\n').encode())
                if kind == 'matter':
                    reason = history_reason(conn, row)
                    item = matter_projection(conn, row, reason)
                    partial = partial or item['availability'] != 'observed'
                    if offset <= total < offset + limit:
                        selected.append(item)
                    total += 1
        snapshot = 'core-state:' + digest.hexdigest()
        if expected is not None and expected != snapshot:
            raise CoreError('DERIVATIONS_SNAPSHOT_CHANGED', 'refresh derivations before paging')
        for item in selected:
            item['snapshotRef'] = snapshot
        return {'schemaVersion': 1, 'asOf': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
                'scopeRef': 'project:' + project_id, 'snapshotRef': snapshot,
                'coverage': {'matters': 'partial' if partial else 'complete',
                             'reason': 'matter_projection_incomplete' if partial else None},
                'page': {'limit': limit, 'offset': offset, 'total': total}, 'matters': selected}
    finally:
        conn.rollback()


def history_reason(conn, matter):
    mid, revision = matter['id'], matter['source_version']
    current = [(r['source_id'], r['source_version']) for r in conn.execute(
        'SELECT * FROM source_set WHERE matter_id=? AND revision=? ORDER BY source_id', (mid, revision))]
    history = [(r['source_id'], r['source_version']) for r in conn.execute(
        'SELECT * FROM source_history WHERE matter_id=? AND revision=? ORDER BY source_id', (mid, revision))]
    if not current or current != history:
        return 'source_history_unavailable'
    previous = conn.execute('SELECT MAX(revision) FROM source_history WHERE matter_id=? AND revision<?', (mid, revision)).fetchone()[0]
    # A migrated old database can retain only the current membership. Core has
    # no revision ledger proving whether an oldest revision >1 was the first.
    if previous is None and revision != 1:
        return 'source_history_unavailable'
    if conn.execute('SELECT 1 FROM candidate WHERE matter_id=? AND source_version>? LIMIT 1', (mid, revision)).fetchone():
        return 'source_version_inconsistent'
    return None


def matter_projection(conn, row, reason):
    mid, revision = row['id'], row['source_version']
    result = {'matterId': mid, 'title': row['title'] or mid, 'extensionId': row['extension_id'],
              'version': row['version'], 'sourceVersion': revision,
              'availability': 'partial' if reason else 'observed', 'reason': reason,
              'derivations': {'total': None, 'current': None, 'stale': None, 'byStatus': []},
              'staleRefs': [], 'staleRefsTruncated': False, 'sourceSetChange': None}
    if reason:
        return result
    groups = [{'status': r['status'], 'current': r['current'], 'stale': r['stale']} for r in conn.execute(
        '''SELECT status,SUM(source_version=?) AS current,SUM(source_version<?) AS stale
           FROM candidate WHERE matter_id=? GROUP BY status ORDER BY status''', (revision, revision, mid))]
    current, stale = sum(r['current'] for r in groups), sum(r['stale'] for r in groups)
    result['derivations'] = {'total': current + stale, 'current': current, 'stale': stale, 'byStatus': groups}
    for c in conn.execute('SELECT id,status,source_version,payload_json FROM candidate WHERE matter_id=? AND source_version<? ORDER BY id LIMIT 20', (mid, revision)):
        result['staleRefs'].append({'candidateId': c['id'], 'status': c['status'], 'candidateSourceVersion': c['source_version'],
                                   'matterSourceVersion': revision, 'supersedes': parse_json(c['payload_json']).get('supersedes')})
    result['staleRefsTruncated'] = stale > 20
    prev = conn.execute('SELECT MAX(revision) FROM source_history WHERE matter_id=? AND revision<?', (mid, revision)).fetchone()[0]
    if prev is not None:
        def members(rev):
            return {r['source_id']: r['source_version'] for r in conn.execute(
                'SELECT source_id,source_version FROM source_history WHERE matter_id=? AND revision=? ORDER BY source_id', (mid, rev))}
        before, after = members(prev), members(revision)
        result['sourceSetChange'] = {'fromRevision': prev, 'toRevision': revision,
            'added': [{'sourceId': sid, 'version': after[sid]} for sid in after if sid not in before],
            'replaced': [{'sourceId': sid, 'fromVersion': before[sid], 'toVersion': after[sid]} for sid in after if sid in before and before[sid] != after[sid]],
            'removed': [{'sourceId': sid, 'version': before[sid]} for sid in before if sid not in after]}
    # Bound the whole DTO below the existing JSONL frame budget even at 100
    # Matters. Never silently truncate a source diff or turn missing counts to 0.
    if len(canonical_json(result).encode('utf-8')) > 8192:
        result.update(availability='partial', reason='projection_budget_exceeded',
                      derivations={'total': None, 'current': None, 'stale': None, 'byStatus': []},
                      staleRefs=[], staleRefsTruncated=False, sourceSetChange=None)
    return result
