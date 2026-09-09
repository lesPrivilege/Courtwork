"""Owner-backed directory; Matter disclosure is policy, never a second Matter."""
from datetime import datetime, timezone
from uuid import uuid4

import attention
from core import CoreError, _exact_keys, canonical_json, parse_json, sha256_text
from file_candidates import FILE_CONTRACT

GOVERNANCE_SCHEMA = (
    """CREATE TABLE IF NOT EXISTS matter_disclosure (
      project_id TEXT NOT NULL, matter_id TEXT NOT NULL, schema_version INTEGER NOT NULL,
      revision INTEGER NOT NULL CHECK(revision >= 1), state_json TEXT NOT NULL, state_digest TEXT NOT NULL,
      PRIMARY KEY(project_id,matter_id), FOREIGN KEY(matter_id) REFERENCES matter(id))""",
    """CREATE TABLE IF NOT EXISTS matter_disclosure_event (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, matter_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK(revision >= 1), event_json TEXT NOT NULL, event_digest TEXT NOT NULL,
      UNIQUE(project_id,matter_id,revision),
      FOREIGN KEY(project_id,matter_id) REFERENCES matter_disclosure(project_id,matter_id))""",
    """CREATE TABLE IF NOT EXISTS matter_disclosure_request (
      project_id TEXT NOT NULL, request_id TEXT NOT NULL, matter_id TEXT NOT NULL,
      request_hash TEXT NOT NULL, result_json TEXT NOT NULL, result_digest TEXT NOT NULL,
      PRIMARY KEY(project_id,request_id),
      FOREIGN KEY(project_id,matter_id) REFERENCES matter_disclosure(project_id,matter_id))""",
)
GOVERNANCE_TABLES = {'matter_disclosure', 'matter_disclosure_event', 'matter_disclosure_request'}
FIELDS = {'registry', 'details', 'sources', 'artifacts'}
CONTRACTS = {'se-contract-v5.0', 'inbound-nda-v1', FILE_CONTRACT}
MAX_VISIBLE = 1000
MAX_REFS = 128


def fail(code='INVALID', detail='invalid governed object input'):
    raise CoreError(code, detail)


def unavailable():
    fail('NOT_FOUND', 'governed object unavailable')


def digest(value):
    return sha256_text(canonical_json(value))


def bounded(value, maximum=131072):
    if len(canonical_json(value).encode('utf-8')) > maximum:
        fail('GOVERNANCE_LIMIT', 'governed object page exceeds budget')
    return value


def version(value):
    attention.string(value, 64)
    if len(value) != 64 or any(c not in '0123456789abcdef' for c in value): fail()
    return value


def context(ctx):
    _exact_keys(ctx, {'actor','project_id','purpose','execution'}, 'governance context')
    attention.string(ctx['project_id'])
    if ctx['actor'] == 'local-user':
        if ctx['purpose'] != 'human-governance' or ctx['execution'] is not None:
            fail('DISCLOSURE_DENIED', 'invalid governance actor')
    else:
        attention.context(ctx)
    return ctx


def att_context(ctx):
    return {**ctx, 'purpose':'human-attention'} if ctx['actor'] == 'local-user' else ctx


def object_ref(value, ctx):
    _exact_keys(value, {'project_id','kind','id'}, 'object ref')
    attention.string(value['id']); attention.choice(value['kind'], {'matter','attention'})
    if value['project_id'] != ctx['project_id']: unavailable()
    return value


def scope(store, ident, ctx):
    attention.string(ident)
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
    attention.string(grant['adapter_id'])
    if grant['purpose'] != 'attention-runtime' or grant['content_scope'] != 'current': fail()
    fields = grant['fields']
    if (not isinstance(fields, list) or any(not isinstance(f,str) or f not in FIELDS for f in fields)
            or len(set(fields)) != len(fields) or 'registry' not in fields): fail()
    expiry = attention.timestamp(grant['expires_at'])
    if future and expiry <= datetime.now(timezone.utc): fail('INVALID', 'disclosure expiry must be future')


def permitted(state, ctx):
    if ctx['actor'] == 'local-user': return FIELDS
    if not isinstance(state, dict): fail('INTEGRITY_REFUSAL', 'disclosure policy must be an object')
    grant = state.get('grant')
    if not grant: return set()
    validate_grant(grant, future=False)
    if (grant['adapter_id'] != ctx['execution']['adapter_id'] or grant['purpose'] != ctx['purpose']
            or attention.timestamp(grant['expires_at']) <= datetime.now(timezone.utc)): return set()
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


def matter_snapshot(store, ident, ctx):
    state, allowed = access(store, ident, ctx)
    row = store.conn.execute('SELECT m.*,a.title FROM matter m LEFT JOIN app_matter a ON a.matter_id=m.id WHERE m.id=?', (ident,)).fetchone()
    if row is None: unavailable()
    supported = row['contract_version'] in CONTRACTS
    entry = {'registry_version':1,'object_ref':{'project_id':ctx['project_id'],'kind':'matter','id':ident},
             'schema_ref':row['contract_version'],'schema_version':1 if supported else None,
             'object_revision':row['version'],'descriptor':{'title':row['title'] or ident},
             'state_class':'unknown','updated_at':None,'availability':'retained' if supported else 'unsupported',
             'disclosure_handle':{'policy':'matter-disclosure-v1','revision':state['revision']}}
    view = {**entry,'disclosure':{'fields':sorted(allowed),'purpose':ctx['purpose']}}
    if ctx['actor'] == 'local-user': view['policy'] = state
    if supported and 'details' in allowed:
        domain = store.conn.execute('SELECT domain_json FROM app_work_data WHERE matter_id=?', (ident,)).fetchone()
        domain = None if domain is None else parse_json(domain['domain_json'])
        if domain is not None and (not isinstance(domain,dict) or type(domain.get('schemaVersion')) is not int or domain['schemaVersion'] != 1):
            fail('CONTRACT_UNSUPPORTED', 'Matter domain schema')
        # Preserve the typed domain; do not create a universal editable schema.
        view['details'] = {'version':row['version'],'source_version':row['source_version'],
                           'contract_version':row['contract_version'],'obligations':parse_json(row['obligations_json']), 'domain':domain}
    if supported and 'sources' in allowed: view['sources'] = source_descriptors(store, ident)
    if supported and 'artifacts' in allowed:
        aid = row['active_artifact']
        artifact = store.conn.execute('SELECT a.id,a.candidate_id,a.content_digest FROM artifact a JOIN candidate c ON c.id=a.candidate_id '
                                      'WHERE a.id=? AND c.matter_id=?', (aid,ident)).fetchone() if aid else None
        view['artifact'] = None if aid is None else {'id':aid,'candidate_id':artifact['candidate_id'] if artifact else None,
                           'digest':artifact['content_digest'] if artifact else None,
                           'format':'file-bundle' if row['contract_version'] == FILE_CONTRACT else 'text',
                           'availability':'retained' if artifact else 'unavailable','integrity':'unchecked'}
    bounded(view)
    token = digest(view)
    return {**entry, 'object_version':token}, {**view, 'object_version':token}


def attention_snapshot(store, ident, ctx):
    ac = att_context(ctx)
    try:
        state = attention.load(store, ident, ac)
        allowed = attention.permissions(state, ac)
    except (CoreError, KeyError, TypeError, AttributeError):
        if ctx['actor'] == 'runtime': unavailable()
        raise
    if 'registry' not in allowed: unavailable()
    entry = {'registry_version':1,'object_ref':{'project_id':ctx['project_id'],'kind':'attention','id':ident},
             'schema_ref':'attention/v1','schema_version':1,'object_revision':state['revision'],
             'descriptor':{'title':state['descriptor']['title']},'state_class':state['status'],
             'updated_at':state['updated_at'],'availability':'retained',
             'disclosure_handle':{'policy':'local-attention-v1','revision':state['policy']['version']}}
    view = {**entry,'disclosure':{'fields':sorted(allowed & {'registry','details','sources'}),'purpose':ctx['purpose']}}
    if 'details' in allowed:
        view['details'] = {k:state[k] for k in ['descriptor','reason','next_action','seen','freshness']}
    if 'sources' in allowed:
        refs = []
        for ref in state['source_refs']:
            if ref['kind'] == 'core':
                try:
                    _, target_allowed = access(store, ref['matter_id'], ctx)
                    if 'sources' not in target_allowed: continue
                    if not any(all(s[k] == ref[k] for k in ['source_id','version','digest']) for s in source_descriptors(store,ref['matter_id'])): continue
                except CoreError as exc:
                    if ctx['actor']=='runtime' or exc.code == 'NOT_FOUND': continue
                    raise
            refs.append({**ref,'source_ref':digest(ref),'availability':'retained' if ref['kind']=='core' else 'unknown','integrity':'unchecked'})
        view['sources'] = refs
        view['source_coverage'] = 'permitted-current-refs-only'
    bounded(view)
    token = digest(view)
    return {**entry,'object_version':token}, {**view,'object_version':token}


def snapshot(store, ref, ctx):
    object_ref(ref, ctx)
    return (matter_snapshot if ref['kind']=='matter' else attention_snapshot)(store, ref['id'], ctx)


def candidates(store, kind, ctx):
    if kind == 'matter':
        if ctx['actor'] == 'local-user':
            return store.conn.execute('SELECT matter_id AS id FROM app_work_scope WHERE project_id=? ORDER BY matter_id',(ctx['project_id'],))
        # SQL narrows by adapter, then access() validates expiry/shape/digest.
        return store.conn.execute("SELECT d.matter_id AS id FROM matter_disclosure d JOIN app_work_scope s ON s.matter_id=d.matter_id AND s.project_id=d.project_id "
            "WHERE d.project_id=? AND json_extract(CASE WHEN json_valid(d.state_json) THEN d.state_json ELSE '{}' END,'$.grant.adapter_id')=? ORDER BY d.matter_id",
            (ctx['project_id'],ctx['execution']['adapter_id']))
    if ctx['actor'] == 'local-user':
        return store.conn.execute('SELECT id FROM attention WHERE project_id=? ORDER BY id',(ctx['project_id'],))
    return store.conn.execute("SELECT id FROM attention WHERE project_id=? AND json_extract(CASE WHEN json_valid(state_json) THEN state_json ELSE '{}' END,'$.policy.grant.adapter_id')=? ORDER BY id",
                              (ctx['project_id'],ctx['execution']['adapter_id']))


def source_page(store, view, q, ctx):
    if 'sources' not in view: unavailable()
    attention.string(q.get('source_ref'),64)
    ref = next((s for s in view['sources'] if s['source_ref']==q['source_ref']),None)
    if ref is None: unavailable()
    if ref['kind'] == 'external':
        return {'registry_version':1,'object_ref':view['object_ref'],'object_version':view['object_version'],
                'source':ref,'availability':'unknown','text':None}
    row = store.conn.execute('SELECT text,digest FROM source WHERE id=? AND version=?', (ref['source_id'],ref['version'])).fetchone()
    if row is None: unavailable()
    if row['digest'] != ref['digest'] or sha256_text(row['text']) != ref['digest']:
        fail('INTEGRITY_REFUSAL', 'governed source bytes mismatch')
    return text_page(row['text'],q,{'source':ref,'object_ref':view['object_ref'],'object_version':view['object_version']})


def text_page(text, q, identity):
    start = attention.integer(q.get('offset',0)); size = attention.integer(q.get('limit',4000),4000)
    if size < 1 or start > len(text): fail()
    end = min(len(text),start+size)
    return {'registry_version':1,**identity,'availability':'retained','unit':'codepoint','text':text[start:end],
            'offset':start,'end':end,'length':len(text),'next_offset':end if end<len(text) else None}


def artifact_page(store, view, q):
    ref = view.get('artifact')
    if not ref or ref['availability'] != 'retained': unavailable()
    ident = view['object_ref']['id']
    if ref['format'] == 'file-bundle':
        if 'path' in q: attention.string(q['path'],1024)
        data = store.file_query({'matter_id':ident,'context':None,'kind':'file-content' if 'path' in q else 'file-manifest',
                                'candidate_id':None,'artifact_id':ref['id'],'path':q.get('path'),
                                'offset':q.get('offset',0),'limit':q.get('limit',4000 if 'path' in q else 16)})
        return {'registry_version':1,'object_ref':view['object_ref'],'object_version':view['object_version'],'file':data}
    if 'path' in q: fail()
    row = store.conn.execute('SELECT a.* FROM artifact a JOIN candidate c ON c.id=a.candidate_id WHERE a.id=? AND c.matter_id=?', (ref['id'],ident)).fetchone()
    if row is None: unavailable()
    if row['content_digest'] != ref['digest'] or sha256_text(row['content']) != ref['digest']:
        fail('INTEGRITY_REFUSAL', 'governed Artifact bytes mismatch')
    return text_page(row['content'],q,{'artifact':ref,'object_ref':view['object_ref'],'object_version':view['object_version']})


def query(store, ctx, q):
    context(ctx)
    if not isinstance(q,dict): fail()
    kind = q.get('kind')
    allowed = {'registry':{'object_kind','text','offset','limit','expected_collection_version'},
               'inspect':{'object_ref','expected_object_version'},
               'source':{'object_ref','expected_object_version','source_ref','offset','limit'},
               'artifact':{'object_ref','expected_object_version','offset','limit','path'},
               'policy':{'object_ref'}, 'policy_request':{'object_ref','request_id'}}
    if not isinstance(kind,str) or kind not in allowed: fail('CONTRACT_UNSUPPORTED', 'governance query kind')
    if set(q)-{'schema_version','kind'}-allowed[kind] or 'schema_version' not in q: fail()
    if type(q['schema_version']) is not int or q['schema_version'] != 1: fail('CONTRACT_UNSUPPORTED','governance query schema')
    store.conn.execute('BEGIN')
    try:
        if kind == 'registry':
            kinds = ['attention','matter'] if 'object_kind' not in q else [attention.choice(q['object_kind'],{'matter','attention'})]
            if 'text' in q: attention.string(q['text'],200)
            start = attention.integer(q.get('offset',0)); size = attention.integer(q.get('limit',20),50)
            if not size or (start and 'expected_collection_version' not in q): fail()
            entries = []
            for obj_kind in kinds:
                visible = 0
                for row in candidates(store,obj_kind,ctx):
                    try:
                        entry, _ = snapshot(store,{'project_id':ctx['project_id'],'kind':obj_kind,'id':row['id']},ctx)
                    except CoreError as exc:
                        if ctx['actor']=='runtime' and exc.code=='NOT_FOUND': continue
                        raise
                    visible += 1
                    if visible > MAX_VISIBLE: fail('GOVERNANCE_LIMIT','visible object budget')
                    if q.get('text','') in entry['descriptor']['title']: entries.append(entry)
            collection = digest(entries)
            if 'expected_collection_version' in q and version(q['expected_collection_version']) != collection:
                fail('VERSION_CONFLICT','visible directory changed; rediscover')
            if start > len(entries): fail()
            end = min(len(entries),start+size)
            return bounded({'registry_version':1,'items':entries[start:end],'count':len(entries),'count_scope':'visible',
                            'collection_version':collection,'offset':start,'next_offset':end if end<len(entries) else None,'truncated':end<len(entries)})
        ref = object_ref(q.get('object_ref'),ctx)
        if kind in {'policy','policy_request'}:
            if ctx['actor'] != 'local-user' or ref['kind'] != 'matter': unavailable()
            scope(store,ref['id'],ctx)
            if kind == 'policy':
                return {'registry_version':1,'object_ref':ref,'policy':policy(store,ref['id'],ctx)}
            attention.string(q.get('request_id'))
            row = store.conn.execute('SELECT * FROM matter_disclosure_request WHERE project_id=? AND matter_id=? AND request_id=?',
                                      (ctx['project_id'],ref['id'],q['request_id'])).fetchone()
            return {'registry_version':1,'result':None if row is None else receipt(store,row)}
        _, view = snapshot(store,ref,ctx)
        if kind != 'inspect' or 'expected_object_version' in q:
            if version(q.get('expected_object_version')) != view['object_version']:
                fail('VERSION_CONFLICT','permitted object view changed; rediscover')
        if kind == 'inspect': return view
        if view['availability'] != 'retained': fail('CONTRACT_UNSUPPORTED','governed object schema')
        if kind == 'source': return source_page(store,view,q,ctx)
        if ref['kind'] != 'matter': fail('CONTRACT_UNSUPPORTED','Attention has no Artifact reader')
        return artifact_page(store,view,q)
    finally:
        store.conn.rollback()  # end the read snapshot, including on refusal


def action(store, ctx, request):
    context(ctx)
    if ctx['actor'] != 'local-user': fail('DISCLOSURE_DENIED','human disclosure action required')
    _exact_keys(request,{'schema_version','request_id','matter_id','expected_policy_revision','expected_object_version','grant'},'disclosure request')
    if type(request['schema_version']) is not int or request['schema_version'] != 1: fail('CONTRACT_UNSUPPORTED','disclosure action schema')
    attention.string(request['request_id']); attention.string(request['matter_id'])
    attention.integer(request['expected_policy_revision']); bounded(request,32768)
    if request['grant'] is None:
        if request['expected_object_version'] is not None: fail('INVALID', 'revocation uses a null object version')
    else:
        version(request['expected_object_version'])
    ident = request['matter_id']; identity = digest({'context':ctx,'request':request})
    store.conn.execute('BEGIN IMMEDIATE')
    try:
        scope(store,ident,ctx)
        old_receipt = store.conn.execute('SELECT * FROM matter_disclosure_request WHERE project_id=? AND request_id=?', (ctx['project_id'],request['request_id'])).fetchone()
        if old_receipt:
            if old_receipt['request_hash'] != identity: fail('IDEMPOTENCY_CONFLICT','disclosure request content changed')
            result = receipt(store,old_receipt); store.conn.rollback(); return result
        prior = policy(store,ident,ctx)
        if request['expected_policy_revision'] != prior['revision']: fail('VERSION_CONFLICT','disclosure policy changed')
        if request['grant'] is not None:
            entry, _ = matter_snapshot(store,ident,ctx)
            if request['expected_object_version'] != entry['object_version']: fail('VERSION_CONFLICT','Matter view changed')
        validate_grant(request['grant'],future=True)
        revision = prior['revision']+1; eid = 'disclosure-'+str(uuid4())
        state = {'schema_version':1,'project_id':ctx['project_id'],'matter_id':ident,'revision':revision,
                 'grant':request['grant'],'issued_object_version':request['expected_object_version'],
                 'last_event_id':eid,'updated_at':attention.now()}
        result = {'schema_version':1,'matter_id':ident,'request_id':request['request_id'],'policy_revision':revision,'event_id':eid}
        event = {'schema_version':1,'revision':revision,'context':ctx,'request':request,'result':result,
                 'recorded_at':state['updated_at'],'state_digest':digest(state)}
        store.conn.execute('INSERT INTO matter_disclosure VALUES(?,?,?,?,?,?) ON CONFLICT(project_id,matter_id) DO UPDATE SET revision=excluded.revision,state_json=excluded.state_json,state_digest=excluded.state_digest',
                           (ctx['project_id'],ident,1,revision,canonical_json(state),digest(state)))
        store.conn.execute('INSERT INTO matter_disclosure_event VALUES(?,?,?,?,?,?)',(eid,ctx['project_id'],ident,revision,canonical_json(event),digest(event)))
        store.conn.execute('INSERT INTO matter_disclosure_request VALUES(?,?,?,?,?,?)',(ctx['project_id'],request['request_id'],ident,identity,canonical_json(result),digest(result)))
        store.hooks.hit('before_commit'); store.conn.commit(); store.hooks.hit('after_commit_before_ack')
        return result
    except Exception:
        store.conn.rollback(); raise
