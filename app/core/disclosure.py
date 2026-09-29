"""Matter disclosure policy: the one reader both governance and Attention use."""
from datetime import datetime, timezone

from core import CoreError, _exact_keys, canonical_json, parse_json, sha256_text, string, timestamp

FIELDS = {'registry', 'details', 'sources', 'artifacts'}
MAX_REFS = 128


def fail(code='INVALID', detail='invalid Matter disclosure input'):
    raise CoreError(code, detail)


def unavailable():
    fail('NOT_FOUND', 'governed object unavailable')


def digest(value):
    return sha256_text(canonical_json(value))


def scope(store, ident, ctx):
    string(ident)
    row = store.conn.execute('SELECT s.project_id FROM app_work_scope s JOIN matter m ON m.id=s.matter_id WHERE s.matter_id=?', (ident,)).fetchone()
    if row is None or row['project_id'] != ctx['project_id']: unavailable()


def checked(text, expected):
    if sha256_text(text) != expected: fail('INTEGRITY_REFUSAL', 'disclosure record digest mismatch')
    try:
        value = parse_json(text)
    except CoreError:
        fail('INTEGRITY_REFUSAL', 'invalid disclosure JSON')
    if not isinstance(value, dict): fail('INTEGRITY_REFUSAL', 'disclosure record must be an object')
    return value


def receipt(store, row):
    result = checked(row['result_json'], row['result_digest'])
    event_row = store.conn.execute('SELECT * FROM matter_disclosure_event WHERE id=? AND project_id=? AND matter_id=?',
                                  (result.get('event_id'), row['project_id'], row['matter_id'])).fetchone()
    if event_row is None: fail('INTEGRITY_REFUSAL', 'disclosure event missing')
    event = checked(event_row['event_json'], event_row['event_digest'])
    if not isinstance(event.get('request'), dict): fail('INTEGRITY_REFUSAL', 'disclosure request must be an object')
    if (event.get('schema_version') != 1 or result.get('schema_version') != 1
            or result.get('event_id') != event_row['id'] or result.get('matter_id') != row['matter_id']
            or result.get('request_id') != row['request_id'] or result.get('policy_revision') != event_row['revision']
            or event.get('result') != result or event.get('revision') != event_row['revision']
            or event.get('request', {}).get('request_id') != row['request_id']
            or event.get('request', {}).get('matter_id') != row['matter_id']
            or digest({'context':event.get('context'), 'request':event.get('request')}) != row['request_hash']):
        fail('INTEGRITY_REFUSAL', 'disclosure receipt identity mismatch')
    return result


def policy(store, ident, ctx):
    row = store.conn.execute('SELECT * FROM matter_disclosure WHERE project_id=? AND matter_id=?',
                             (ctx['project_id'], ident)).fetchone()
    if row is None: return {'revision':0, 'grant':None}
    state = checked(row['state_json'], row['state_digest'])
    if (row['schema_version'] != 1 or state.get('schema_version') != 1 or state.get('revision') != row['revision']
            or state.get('matter_id') != ident or state.get('project_id') != ctx['project_id']):
        fail('INTEGRITY_REFUSAL', 'disclosure state identity mismatch')
    event_row = store.conn.execute('SELECT * FROM matter_disclosure_event WHERE id=? AND project_id=? AND matter_id=?',
                                  (state.get('last_event_id'), ctx['project_id'], ident)).fetchone()
    if event_row is None: fail('INTEGRITY_REFUSAL', 'disclosure current event missing')
    event = checked(event_row['event_json'], event_row['event_digest'])
    if event.get('state_digest') != row['state_digest'] or event.get('revision') != row['revision']:
        fail('INTEGRITY_REFUSAL', 'disclosure current event mismatch')
    if not isinstance(event.get('request'), dict): fail('INTEGRITY_REFUSAL', 'disclosure request must be an object')
    rr = store.conn.execute('SELECT * FROM matter_disclosure_request WHERE project_id=? AND matter_id=? AND request_id=?',
                            (ctx['project_id'], ident, event.get('request', {}).get('request_id'))).fetchone()
    if rr is None or receipt(store, rr).get('event_id') != state['last_event_id']:
        fail('INTEGRITY_REFUSAL', 'disclosure current receipt missing')
    validate_grant(state.get('grant'), future=False)
    return state


def validate_grant(grant, *, future):
    if grant is None: return
    _exact_keys(grant, {'adapter_id','purpose','fields','expires_at','content_scope'}, 'Matter grant')
    string(grant['adapter_id'])
    if grant['purpose'] != 'attention-runtime' or grant['content_scope'] != 'current': fail()
    fields = grant['fields']
    if (not isinstance(fields, list) or any(not isinstance(f,str) or f not in FIELDS for f in fields)
            or len(set(fields)) != len(fields) or 'registry' not in fields): fail()
    expiry = timestamp(grant['expires_at'])
    if future and expiry <= datetime.now(timezone.utc): fail('INVALID', 'disclosure expiry must be future')


def permitted(state, ctx):
    if ctx['actor'] == 'local-user': return FIELDS
    if not isinstance(state, dict): fail('INTEGRITY_REFUSAL', 'disclosure policy must be an object')
    grant = state.get('grant')
    if not grant: return set()
    validate_grant(grant, future=False)
    if (grant['adapter_id'] != ctx['execution']['adapter_id'] or grant['purpose'] != ctx['purpose']
            or timestamp(grant['expires_at']) <= datetime.now(timezone.utc)): return set()
    return set(grant['fields'])


def access(store, ident, ctx):
    scope(store, ident, ctx)
    # Check raw policy before interpreting hidden schemas or corrupt content.
    if ctx['actor'] == 'runtime':
        row = store.conn.execute('SELECT state_json FROM matter_disclosure WHERE project_id=? AND matter_id=?',
                                 (ctx['project_id'], ident)).fetchone()
        try:
            if row is None or 'registry' not in permitted(parse_json(row['state_json']), ctx): unavailable()
        except (CoreError, KeyError, TypeError, ValueError): unavailable()
    try:
        state = policy(store, ident, ctx)
        allowed = permitted(state, ctx)
    except CoreError:
        if ctx['actor'] == 'runtime': unavailable()
        raise
    if 'registry' not in allowed: unavailable()
    return state, allowed


def source_descriptors(store, ident):
    rows = store.conn.execute('SELECT ss.source_id,ss.source_version,s.digest FROM source_set ss '
                              'LEFT JOIN source s ON s.id=ss.source_id AND s.version=ss.source_version '
                              'WHERE ss.matter_id=? ORDER BY ss.source_id LIMIT ?', (ident, MAX_REFS+1)).fetchall()
    if len(rows) > MAX_REFS: fail('GOVERNANCE_LIMIT', 'source descriptor budget')
    refs = []
    for row in rows:
        ref = {'kind':'core','matter_id':ident,'source_id':row['source_id'],'version':row['source_version'],'digest':row['digest']}
        refs.append({**ref,'source_ref':digest(ref),'availability':'retained' if row['digest'] else 'unavailable','integrity':'unchecked'})
    return refs


def source_disclosed(store, ref, ctx):
    """True when a core source ref names a current source of a Matter whose policy discloses sources to ctx."""
    try:
        _, allowed = access(store, ref['matter_id'], ctx)
        if 'sources' not in allowed: return False
        return any(all(s[k] == ref[k] for k in ['source_id','version','digest']) for s in source_descriptors(store, ref['matter_id']))
    except CoreError as exc:
        if ctx['actor'] == 'runtime' or exc.code == 'NOT_FOUND': return False
        raise
