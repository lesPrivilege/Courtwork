"""Attention domain within the existing B0 Core transaction and process owner."""
from datetime import datetime, timezone
from uuid import uuid4
from core import CoreError, _exact_keys, canonical_json, parse_json, sha256_text

ATTENTION_SCHEMA = (
    """CREATE TABLE IF NOT EXISTS attention (
      id TEXT NOT NULL, project_id TEXT NOT NULL, schema_version INTEGER NOT NULL,
      revision INTEGER NOT NULL CHECK(revision >= 1), state_json TEXT NOT NULL,
      state_digest TEXT NOT NULL, PRIMARY KEY(project_id,id))""",
    """CREATE TABLE IF NOT EXISTS attention_event (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, attention_id TEXT NOT NULL, revision INTEGER NOT NULL,
      event_json TEXT NOT NULL, event_digest TEXT NOT NULL,
      UNIQUE(project_id,attention_id,revision), FOREIGN KEY(project_id,attention_id) REFERENCES attention(project_id,id))""",
    """CREATE TABLE IF NOT EXISTS attention_request (
      project_id TEXT NOT NULL, request_id TEXT NOT NULL, attention_id TEXT NOT NULL,
      request_hash TEXT NOT NULL, result_json TEXT NOT NULL, result_digest TEXT NOT NULL,
      PRIMARY KEY(project_id,request_id), FOREIGN KEY(project_id,attention_id) REFERENCES attention(project_id,id))""",
)
FIELDS = {'registry','details','sources','relations','events','signal'}
STATUSES = {'investigating','needs_you','waiting','later','resolved'}
ACTIONS = {'create','acknowledge','snooze','set_waiting','resume','resolve','reopen','attach_relation','request_disclosure','record_signal'}
MAX_OBJECTS = 1000


def fail(code='INVALID', detail='invalid Attention input'):
    raise CoreError(code, detail)


def string(value, maximum=200, nullable=False):
    if value is None and nullable: return value
    if not isinstance(value,str) or not value.strip() or '\x00' in value or len(value)>maximum: fail()
    try: value.encode('utf-8')
    except UnicodeError: fail()
    return value


def choice(value,allowed):
    if not isinstance(value,str) or value not in allowed: fail()
    return value


def bounded_json(value,limit=32768):
    text=canonical_json(value)
    try: size=len(text.encode('utf-8'))
    except UnicodeError: fail()
    if size>limit: fail('ATTENTION_LIMIT','request or object too large')
    return text


def integer(value, maximum=2**53-1):
    if type(value) is not int or not 0 <= value <= maximum: fail()
    return value


def timestamp(value):
    string(value,80)
    try:
        dt = datetime.fromisoformat(value.replace('Z','+00:00'))
        if dt.tzinfo is None: fail()
        return dt
    except ValueError: fail()


def now():
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds')


def checked_json(text, digest):
    if sha256_text(text) != digest: fail('INTEGRITY_REFUSAL','Attention record digest mismatch')
    return parse_json(text)


def receipt_value(store,row):
    result=checked_json(row['result_json'],row['result_digest'])
    event_row=store.conn.execute('SELECT * FROM attention_event WHERE project_id=? AND attention_id=? AND id=?',(row['project_id'],row['attention_id'],result.get('event_id'))).fetchone()
    if event_row is None: fail('INTEGRITY_REFUSAL','Attention receipt event missing')
    event=checked_json(event_row['event_json'],event_row['event_digest'])
    if event.get('result')!=result or event.get('request_id')!=row['request_id'] or event.get('attention_id')!=row['attention_id'] or event.get('revision')!=event_row['revision']:
        fail('INTEGRITY_REFUSAL','Attention receipt event mismatch')
    original={'schema_version':1,'request_id':event['request_id'],'attention_id':event['attention_id'],'expected_revision':event['previous_revision'],'action':event['action'],'payload':event['payload']}
    if sha256_text(canonical_json({'context':event['context'],'request':original}))!=row['request_hash']:
        fail('INTEGRITY_REFUSAL','Attention request identity mismatch')
    return result


def context(value):
    _exact_keys(value,{'actor','project_id','purpose','execution'},'Attention context')
    string(value['project_id'])
    if value['actor']=='local-user':
        if value['purpose']!='human-attention' or value['execution'] is not None: fail('DISCLOSURE_DENIED','Attention unavailable')
    elif value['actor']=='runtime':
        if value['purpose']!='attention-runtime': fail('DISCLOSURE_DENIED','Attention unavailable')
        _exact_keys(value['execution'],{'adapter_id','session_id','run_id'},'execution')
        for v in value['execution'].values(): string(v)
    else: fail('DISCLOSURE_DENIED','Attention unavailable')
    return value


def load(store, ident, ctx):
    string(ident)
    row=store.conn.execute('SELECT * FROM attention WHERE id=? AND project_id=?',(ident,ctx['project_id'])).fetchone()
    if row is None: fail('NOT_FOUND','Attention unavailable')
    if ctx['actor']=='runtime':
        try:
            if 'registry' not in permissions(parse_json(row['state_json']),ctx): fail('NOT_FOUND','Attention unavailable')
        except (KeyError,TypeError,CoreError): fail('NOT_FOUND','Attention unavailable')
    if row['schema_version']!=1: fail('CONTRACT_UNSUPPORTED','Attention schema')
    state=checked_json(row['state_json'],row['state_digest'])
    if state.get('schema_version')!=1 or state.get('attention_id')!=ident or state.get('revision')!=row['revision'] or state.get('project_id')!=ctx['project_id'] or not isinstance(state.get('status'),str) or state.get('status') not in STATUSES:
        fail('INTEGRITY_REFUSAL','Attention state mismatch')
    event_row=store.conn.execute('SELECT * FROM attention_event WHERE project_id=? AND attention_id=? AND id=?',(ctx['project_id'],ident,state.get('last_event_id'))).fetchone()
    if event_row is None: fail('INTEGRITY_REFUSAL','Attention current event missing')
    event=checked_json(event_row['event_json'],event_row['event_digest'])
    if event.get('state_digest')!=row['state_digest'] or event.get('revision')!=row['revision']:
        fail('INTEGRITY_REFUSAL','Attention current event mismatch')
    receipt=store.conn.execute('SELECT * FROM attention_request WHERE project_id=? AND attention_id=? AND request_id=?',(ctx['project_id'],ident,event.get('request_id'))).fetchone()
    if receipt is None or receipt_value(store,receipt).get('event_id')!=state['last_event_id']:
        fail('INTEGRITY_REFUSAL','Attention current receipt missing')
    return state


def permissions(state,ctx):
    if ctx['actor']=='local-user': return FIELDS
    grant=state['policy']['grant']
    if not grant or grant['adapter_id']!=ctx['execution']['adapter_id'] or grant['purpose']!=ctx['purpose'] or timestamp(grant['expires_at'])<=datetime.now(timezone.utc): return set()
    return set(grant['fields'])


def require(state,ctx,field):
    if field not in permissions(state,ctx): fail('NOT_FOUND','Attention unavailable')


def matter_scope(store, ident, ctx):
    row=store.conn.execute('SELECT project_id FROM app_work_scope WHERE matter_id=?',(ident,)).fetchone()
    if row is None or row['project_id']!=ctx['project_id']: fail('NOT_FOUND','relation unavailable')


def relations(store, values, ctx, provenance):
    if not isinstance(values,list) or len(values)>32: fail()
    result=[]
    for ref in values:
        _exact_keys(ref,{'kind','id','relation'},'relation')
        string(ref['id'])
        choice(ref['kind'],{'matter','session','run','external'}); choice(ref['relation'],{'about','execution','origin'})
        if ref in result: fail()
        if ref['kind']=='matter': matter_scope(store,ref['id'],ctx)
        if ref['kind'] in {'session','run'}:
            # Host observations are private bridge inputs, never copied from HTTP payload.
            observed=next((p for p in provenance if p['kind']==ref['kind'] and p['id']==ref['id']),None)
            if not observed or observed['project_id']!=ctx['project_id']: fail('NOT_FOUND','relation unavailable')
            if ref['kind']=='run':
                core_run=store.conn.execute('SELECT matter_id FROM app_run WHERE id=?',(ref['id'],)).fetchone()
                if core_run: matter_scope(store,core_run['matter_id'],ctx)
        result.append(ref)
    return result


def sources(store, values, ctx):
    if not isinstance(values,list) or len(values)>16: fail()
    result=[]
    for ref in values:
        _exact_keys(ref,{'kind','matter_id','source_id','version','locator','role','digest'},'source ref')
        string(ref['source_id']); integer(ref['version']); string(ref['locator'],2048)
        choice(ref['kind'],{'core','external'}); choice(ref['role'],{'supports','reports','contradicts'})
        if ref in result: fail()
        if ref['kind']=='core':
            string(ref['matter_id']); string(ref['digest'],64)
            source_record(store,ref,ctx)
        elif ref['matter_id'] is not None or ref['digest'] is not None: fail()
        result.append(ref)
    return result


def source_record(store,ref,ctx):
    matter_scope(store,ref['matter_id'],ctx)
    row=store.conn.execute('SELECT s.* FROM source s WHERE s.id=? AND s.version=? AND EXISTS (SELECT 1 FROM source_history h WHERE h.matter_id=? AND h.source_id=s.id AND h.source_version=s.version)',(ref['source_id'],ref['version'],ref['matter_id'])).fetchone()
    if row is None: fail('NOT_FOUND','source unavailable')
    if row['digest']!=ref['digest'] or sha256_text(row['text'])!=ref['digest']: fail('INTEGRITY_REFUSAL','source bytes mismatch')
    return row


def next_action(value):
    _exact_keys(value,{'kind','label','trigger','due_at'},'next_action')
    choice(value['kind'],{'inspect','decide','wait','follow_up','none'}); choice(value['trigger'],{'manual','at','after','external'})
    string(value['label'],500)
    if value['due_at'] is not None: timestamp(value['due_at'])
    if value['trigger']=='at' and value['due_at'] is None: fail()
    return value


def human_actions(state):
    reason={'type':'string','minLength':1,'maxLength':4000}
    next_schema={'type':'object','additionalProperties':False,'required':['kind','label','trigger','due_at'],'properties':{'kind':{'enum':['inspect','decide','wait','follow_up','none']},'label':{'type':'string','minLength':1,'maxLength':500},'trigger':{'enum':['manual','at','after','external']},'due_at':{'type':['string','null'],'format':'date-time'}}}
    relation_schema={'type':'object','additionalProperties':False,'required':['kind','id','relation'],'properties':{'kind':{'enum':['matter','session','run','external']},'id':{'type':'string','minLength':1,'maxLength':200},'relation':{'enum':['about','execution','origin']}}}
    grant_schema={'type':['object','null'],'additionalProperties':False,'required':['adapter_id','purpose','fields','expires_at'],'properties':{'adapter_id':{'type':'string','minLength':1,'maxLength':200},'purpose':{'const':'attention-runtime'},'fields':{'type':'array','uniqueItems':True,'minItems':1,'items':{'enum':sorted(FIELDS)}},'expires_at':{'type':'string','format':'date-time'}}}
    schemas={
        'acknowledge':({},[]),
        'snooze':({'reason':reason,'next_action':next_schema},['reason','next_action']),
        'set_waiting':({'reason':reason,'next_action':next_schema},['reason','next_action']),
        'resume':({'reason':reason,'status':{'enum':['investigating','needs_you']}},['reason']),
        'resolve':({'reason':reason},['reason']),
        'reopen':({'reason':reason,'status':{'enum':['investigating','needs_you']}},['reason']),
        'attach_relation':({'operation':{'enum':['add','remove']},'relation':relation_schema},['operation','relation']),
        'request_disclosure':({'grant':grant_schema},['grant']),
    }
    available=set(schemas)-({'resolve','resume','snooze','set_waiting'} if state['status']=='resolved' else {'reopen'})
    return [{'schema_version':1,'action':a,'expected_revision':state['revision'],'payload_schema':{'type':'object','additionalProperties':False,'required':schemas[a][1],'properties':schemas[a][0]}} for a in sorted(available)]


def public_state(state,ctx,summary=False):
    allowed=permissions(state,ctx)
    if 'registry' not in allowed: fail('NOT_FOUND','Attention unavailable')
    result={key:state[key] for key in ['attention_id','schema_version','revision','status','freshness','updated_at']}
    result['descriptor']={'title':state['descriptor']['title']}
    if not summary and 'details' in allowed:
        result.update({key:state[key] for key in ['descriptor','reason','next_action','seen','last_event_id']})
    if not summary and 'sources' in allowed: result['source_refs']=state['source_refs']
    if not summary and 'relations' in allowed:
        result['relation_refs']=state['relation_refs']; result['execution_provenance']=state['execution_provenance']
    if not summary and ctx['actor']=='local-user':
        result['policy']=state['policy']
        result['human_actions']=human_actions(state)
    if not summary and 'details' in allowed:
        result['basis']={'revision':state['revision'],'event_id':state['last_event_id'],'sources':'exact_version_refs','external_availability':'unknown','execution_availability':'historical_observation_only'}
    result['disclosure']={'policy':'local-attention-v1','fields':sorted(allowed),'purpose':ctx['purpose']}
    return result


def validate_provenance(values):
    if not isinstance(values,list) or len(values)>32: fail()
    for p in values:
        _exact_keys(p,{'kind','id','project_id','session_id','adapter_id','observed_at','availability'},'execution provenance')
        for key in ['id','project_id','session_id']: string(p[key])
        string(p['adapter_id'],200,True); timestamp(p['observed_at'])
        choice(p['kind'],{'session','run'})
        if p['availability']!='observed': fail()
    return values


def action(store,ctx,request,provenance):
    context(ctx); validate_provenance(provenance)
    _exact_keys(request,{'schema_version','request_id','attention_id','expected_revision','action','payload'},'Attention request')
    if type(request['schema_version']) is not int or request['schema_version']!=1: fail('CONTRACT_UNSUPPORTED','Attention action schema')
    for k in ['request_id','attention_id']: string(request[k])
    integer(request['expected_revision'])
    string(request['action'],100)
    if request['action'] not in ACTIONS: fail('CONTRACT_UNSUPPORTED','Attention action')
    if not isinstance(request['payload'],dict): fail()
    bounded_json(request)
    a=request['action']; ident=request['attention_id']; p=request['payload']
    if ctx['actor']=='local-user' and a=='record_signal': fail('DISCLOSURE_DENIED','runtime signal required')
    if ctx['actor']!='local-user' and a!='record_signal': fail('DISCLOSURE_DENIED','human action required')
    # Exclude refreshed observation timestamps from request identity; reference IDs
    # and host actor/execution context remain bound to the original request.
    identity=sha256_text(canonical_json({'context':ctx,'request':request}))
    store.conn.execute('BEGIN IMMEDIATE')
    try:
        old=None
        if a!='create':
            old=load(store,ident,ctx)
            require(old,ctx,'signal' if a=='record_signal' else 'registry')
        receipt=store.conn.execute('SELECT * FROM attention_request WHERE project_id=? AND request_id=?',(ctx['project_id'],request['request_id'])).fetchone()
        if receipt:
            if receipt['attention_id']!=ident or receipt['request_hash']!=identity: fail('IDEMPOTENCY_CONFLICT','Attention request content changed')
            result=receipt_value(store,receipt)
            store.conn.commit(); return result
        if a=='create':
            if store.conn.execute('SELECT 1 FROM attention WHERE id=? AND project_id=?',(ident,ctx['project_id'])).fetchone(): fail('CONFLICT','Attention unavailable')
            if request['expected_revision']!=0: fail('VERSION_CONFLICT','Attention revision changed')
            if store.conn.execute('SELECT count(*) FROM attention WHERE project_id=?',(ctx['project_id'],)).fetchone()[0]>=MAX_OBJECTS: fail('ATTENTION_LIMIT','project object limit')
            _exact_keys(p,{'descriptor','reason','next_action','source_refs','relation_refs'},'create')
            _exact_keys(p['descriptor'],{'title','summary'},'descriptor')
            string(p['descriptor']['title'],200); string(p['descriptor']['summary'],2000,True); string(p['reason'],4000)
            state={'attention_id':ident,'project_id':ctx['project_id'],'schema_version':1,'revision':0,'descriptor':p['descriptor'],'reason':p['reason'],'next_action':next_action(p['next_action']),'source_refs':sources(store,p['source_refs'],ctx),'relation_refs':relations(store,p['relation_refs'],ctx,provenance),'execution_provenance':provenance,'status':'investigating','freshness':'unknown','seen':False,'policy':{'version':1,'grant':None}}
        else:
            if old['revision']!=request['expected_revision']: fail('VERSION_CONFLICT','Attention revision changed')
            state=parse_json(canonical_json(old))
            if a=='acknowledge':
                _exact_keys(p,set(),a); state['seen']=True
            elif a in {'snooze','set_waiting'}:
                if state['status']=='resolved': fail('INVALID_TRANSITION','resolved requires reopen')
                _exact_keys(p,{'reason','next_action'},a); string(p['reason'],4000)
                state.update(reason=p['reason'],next_action=next_action(p['next_action']),status='later' if a=='snooze' else 'waiting',freshness='current')
                if state['next_action']['kind']=='none': fail()
            elif a in {'resume','resolve','reopen'}:
                _exact_keys(p,{'reason'} | ({'status'} if a!='resolve' and 'status' in p else set()),a); string(p['reason'],4000)
                if a!='resolve': choice(p.get('status','investigating'),{'investigating','needs_you'})
                if a=='reopen' and state['status']!='resolved': fail('INVALID_TRANSITION','reopen requires resolved')
                if a=='resume' and state['status']=='resolved': fail('INVALID_TRANSITION','resolved requires reopen')
                state.update(reason=p['reason'],status='resolved' if a=='resolve' else p.get('status','investigating'),freshness='current',next_action={'kind':'none' if a=='resolve' else 'inspect','label':'No next action' if a=='resolve' else 'Inspect','trigger':'manual','due_at':None})
            elif a=='attach_relation':
                _exact_keys(p,{'relation','operation'},a)
                choice(p['operation'],{'add','remove'})
                ref=p['relation']
                if p['operation']=='add':
                    relations(store,[ref],ctx,provenance)
                    if ref not in state['relation_refs']: state['relation_refs'].append(ref)
                    for observed in provenance:
                        if not any(x['kind']==observed['kind'] and x['id']==observed['id'] for x in state['execution_provenance']): state['execution_provenance'].append(observed)
                else:
                    _exact_keys(ref,{'kind','id','relation'},'relation')
                    if ref not in state['relation_refs']: fail('NOT_FOUND','relation unavailable')
                    state['relation_refs'].remove(ref)
            elif a=='request_disclosure':
                _exact_keys(p,{'grant'},a); grant=p['grant']
                if grant is not None:
                    _exact_keys(grant,{'adapter_id','purpose','fields','expires_at'},'grant')
                    string(grant['adapter_id'])
                    if grant['purpose']!='attention-runtime' or not isinstance(grant['fields'],list) or not grant['fields'] or any(not isinstance(f,str) or f not in FIELDS for f in grant['fields']) or len(set(grant['fields']))!=len(grant['fields']): fail()
                    if 'registry' not in grant['fields'] or timestamp(grant['expires_at'])<=datetime.now(timezone.utc): fail()
                    grant={**grant,'issued_revision':state['revision']+1}
                state['policy']={'version':state['policy']['version']+1,'grant':grant}
            elif a=='record_signal':
                _exact_keys(p,{'text','source_refs'},a); string(p['text'],4000); sources(store,p['source_refs'],ctx)
                state['freshness']='unknown'
        if len(state['relation_refs'])>32 or len(state['execution_provenance'])>32: fail('ATTENTION_LIMIT','relation limit')
        state['revision']+=1; state['updated_at']=now(); state['last_event_id']='attevt-'+str(uuid4())
        state_text=bounded_json(state)
        event={'schema_version':1,'event_id':state['last_event_id'],'attention_id':ident,'revision':state['revision'],'previous_revision':state['revision']-1,'request_id':request['request_id'],'context':ctx,'action':a,'payload':p,'recorded_at':state['updated_at'],'state_digest':sha256_text(state_text)}
        result={'schema_version':1,'attention_id':ident,'request_id':request['request_id'],'revision':state['revision'],'event_id':state['last_event_id'],'status':state['status']}
        event['result']=result
        store.conn.execute('INSERT INTO attention VALUES(?,?,?,?,?,?) ON CONFLICT(project_id,id) DO UPDATE SET revision=excluded.revision,state_json=excluded.state_json,state_digest=excluded.state_digest',(ident,ctx['project_id'],1,state['revision'],state_text,sha256_text(state_text)))
        et=canonical_json(event); rt=canonical_json(result)
        store.conn.execute('INSERT INTO attention_event VALUES(?,?,?,?,?,?)',(state['last_event_id'],ctx['project_id'],ident,state['revision'],et,sha256_text(et)))
        store.conn.execute('INSERT INTO attention_request VALUES(?,?,?,?,?,?)',(ctx['project_id'],request['request_id'],ident,identity,rt,sha256_text(rt)))
        store.hooks.hit('before_commit'); store.conn.commit(); store.hooks.hit('after_commit_before_ack')
        return result
    except Exception:
        store.conn.rollback(); raise


def query(store,ctx,q):
    context(ctx)
    if not isinstance(q,dict): fail()
    kind=q.get('kind'); string(kind,100)
    required={'schema_version','kind'}
    extras={
        'registry':{'offset','limit'}, 'inspect':{'attention_id','expected_revision'},
        'exact':{'field','value','offset','limit'}, 'grep':{'text','offset','limit'},
        'relation':{'relation_kind','relation_id','offset','limit'},
        'events':{'attention_id','offset','limit'}, 'source':{'attention_id','source_index','offset','limit'},
        'request':{'attention_id','request_id'},
    }
    if kind not in extras: fail('CONTRACT_UNSUPPORTED','Attention query kind')
    if set(q)-required-extras[kind] or not required.issubset(q): fail()
    if type(q['schema_version']) is not int or q['schema_version']!=1: fail('CONTRACT_UNSUPPORTED','Attention query schema')
    offset=integer(q.get('offset',0)); limit=integer(q.get('limit',20),4000 if kind=='source' else 50)
    if limit<1: fail()
    if kind in {'inspect','events','source','request'}:
        state=load(store,q.get('attention_id'),ctx); require(state,ctx,'registry')
        if kind=='inspect':
            if 'expected_revision' in q and integer(q['expected_revision'])!=state['revision']: fail('VERSION_CONFLICT','Attention revision changed')
            return public_state(state,ctx)
        if kind=='request':
            # Receipts disclose action outcomes: runtime readers need event access.
            require(state,ctx,'events'); string(q.get('request_id'))
            row=store.conn.execute('SELECT * FROM attention_request WHERE project_id=? AND attention_id=? AND request_id=?',(ctx['project_id'],state['attention_id'],q['request_id'])).fetchone()
            return {'schema_version':1,'result':None if row is None else receipt_value(store,row)}
        if kind=='events':
            require(state,ctx,'events')
            rows=store.conn.execute('SELECT * FROM attention_event WHERE project_id=? AND attention_id=? ORDER BY revision LIMIT ? OFFSET ?',(ctx['project_id'],state['attention_id'],limit+1,offset)).fetchall()
            events=[]; used=0
            for r in rows[:limit]:
                size=len(r['event_json'].encode('utf-8'))
                if used+size>131072: break
                events.append(checked_json(r['event_json'],r['event_digest'])); used+=size
            # Event payloads may contain every object field. Event grants must
            # include all detail/reference fields, enforced at this boundary.
            for field in ['details','sources','relations']: require(state,ctx,field)
            return {'schema_version':1,'revision':state['revision'],'events':events,'next_offset':offset+len(events) if len(rows)>len(events) else None,'truncated':len(rows)>len(events)}
        require(state,ctx,'sources')
        i=integer(q.get('source_index')); refs=state['source_refs']
        if i>=len(refs): fail('NOT_FOUND','source unavailable')
        ref=refs[i]
        if ref['kind']=='external': return {'schema_version':1,'source':ref,'availability':'unknown','text':None}
        row=source_record(store,ref,ctx); content=row['text']
        if offset>len(content): fail()
        end=min(len(content),offset+limit)
        return {'schema_version':1,'revision':state['revision'],'source':ref,'availability':'retained','text':content[offset:end],'offset':offset,'end':end,'length':len(content),'next_offset':end if end<len(content) else None}
    if kind=='exact':
        choice(q.get('field'),{'attention_id','title','status'})
        string(q.get('value'),200)
    if kind=='grep': string(q.get('text'),200)
    if kind=='relation':
        choice(q.get('relation_kind'),{'matter','session','run','external'})
        string(q.get('relation_id'))
    rows=store.conn.execute('SELECT id FROM attention WHERE project_id=? ORDER BY id LIMIT ?',(ctx['project_id'],MAX_OBJECTS+1)).fetchall()
    if len(rows)>MAX_OBJECTS: fail('ATTENTION_LIMIT','project object limit')
    visible=[]
    for row in rows:
        # Check runtime grants before schema interpretation to prevent hidden
        # schema errors becoming an existence side channel.
        if ctx['actor']=='runtime':
            raw=store.conn.execute('SELECT state_json FROM attention WHERE project_id=? AND id=?',(ctx['project_id'],row['id'])).fetchone()
            try:
                if 'registry' not in permissions(parse_json(raw['state_json']),ctx): continue
            except (KeyError,TypeError,CoreError): continue
        state=load(store,row['id'],ctx); allowed=permissions(state,ctx)
        if 'registry' not in allowed: continue
        if kind=='exact':
            actual=state['descriptor']['title'] if q['field']=='title' else state[q['field']]
            if actual!=q['value']: continue
        if kind=='grep':
            if 'details' not in allowed: continue
            if q['text'] not in '\n'.join([state['descriptor']['title'],state['descriptor']['summary'] or '',state['reason']]): continue
        if kind=='relation':
            if 'relations' not in allowed: continue
            if not any(r['kind']==q['relation_kind'] and r['id']==q['relation_id'] for r in state['relation_refs']): continue
        visible.append(public_state(state,ctx,summary=True))
    end=min(len(visible),offset+limit)
    return {'schema_version':1,'items':visible[offset:end],'count':len(visible),'offset':offset,'next_offset':end if end<len(visible) else None,'truncated':end<len(visible),'disclosure':{'policy':'local-attention-v1','purpose':ctx['purpose'],'count_scope':'visible'}}
