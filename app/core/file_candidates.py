"""Bounded file candidates in the existing Core transaction and database.

No filesystem resolution, provider access, or model-controlled verification.
The bridge supplies recorded bytes and private Run input facts.
"""
import re
from datetime import datetime

FILE_CONTRACT = 'se-file-memo-v1'
FILE_SCHEMA = (
    '''CREATE TABLE IF NOT EXISTS file_run_basis (
      run_id TEXT PRIMARY KEY, matter_id TEXT NOT NULL, basis_json TEXT NOT NULL, input_json TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES app_run(id),
      FOREIGN KEY(matter_id) REFERENCES matter(id))''',
    '''CREATE TABLE IF NOT EXISTS candidate_file_bundle (
      candidate_id TEXT PRIMARY KEY, digest TEXT NOT NULL, manifest_json TEXT NOT NULL,
      basis_json TEXT NOT NULL, FOREIGN KEY(candidate_id) REFERENCES candidate(id))''',
    '''CREATE TABLE IF NOT EXISTS candidate_file (
      candidate_id TEXT NOT NULL, path TEXT NOT NULL, bytes BLOB NOT NULL,
      byte_length INTEGER NOT NULL, digest TEXT NOT NULL,
      PRIMARY KEY(candidate_id,path), FOREIGN KEY(candidate_id) REFERENCES candidate_file_bundle(candidate_id))''',
    '''CREATE TABLE IF NOT EXISTS candidate_verification (
      candidate_id TEXT PRIMARY KEY, record_json TEXT NOT NULL, record_digest TEXT NOT NULL,
      FOREIGN KEY(candidate_id) REFERENCES candidate_file_bundle(candidate_id))''',
    '''CREATE TABLE IF NOT EXISTS artifact_file_bundle (
      artifact_id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL,
      FOREIGN KEY(artifact_id) REFERENCES artifact(id),
      FOREIGN KEY(candidate_id) REFERENCES candidate_file_bundle(candidate_id))''',
)
POLICY = {'id':'file-memo-structure-v1','version':1,
          'rules':['recorded-utf8-v1','source-evidence-required-v1','obligations-v1','fixed-basis-v1']}


def api():
    # Lazy import keeps the standalone experiment's Core API intact.
    from core import CoreError, canonical_json, parse_json, sha256_text, sha256_bytes, _exact_keys, validate_candidate_payload
    return CoreError, canonical_json, parse_json, sha256_text, sha256_bytes, _exact_keys, validate_candidate_payload


def bounded_json(value, limit=32768):
    E, canonical, _, _, _, _, _ = api()
    def validate(v):
        if isinstance(v, float): raise E('INVALID','floating point metadata is unsupported')
        if isinstance(v, str):
            if '\x00' in v: raise E('INVALID','NUL in metadata')
            try: v.encode('utf-8')
            except UnicodeError as exc: raise E('INVALID','invalid Unicode') from exc
        elif isinstance(v, dict):
            for k, item in v.items(): validate(k); validate(item)
        elif isinstance(v, list):
            for item in v: validate(item)
    validate(value)
    result = canonical(value)
    if len(result.encode('utf-8')) > limit: raise E('FILE_LIMIT','metadata exceeds limit')
    return result


def normalize_files(files, run):
    E, canonical, _, hash_text, hash_bytes, exact, _ = api()
    if not isinstance(files,list) or not 1 <= len(files) <= 16: raise E('FILE_LIMIT','file count must be 1..16')
    manifest, contents, seen, indices, total = [], {}, set(), set(), 0
    for f in files:
        exact(f,{'path','sha256','bytes','content','sessionId','runId','recordIndex','kind','writtenAt'},'recorded file')
        p = f['path']
        if not isinstance(p,str) or not re.fullmatch(r'[A-Za-z0-9._/-]{1,240}',p) or any(x in ('','.','..') for x in p.split('/')):
            raise E('INVALID','nonportable file path')
        if p.lower() in seen: raise E('INVALID','duplicate file path')
        seen.add(p.lower())
        if not isinstance(f['content'],str) or '\x00' in f['content']: raise E('INVALID','file must be UTF-8 without NUL')
        try: raw=f['content'].encode('utf-8')
        except UnicodeError as exc: raise E('INVALID','invalid file Unicode') from exc
        total += len(raw)
        if len(raw)>65536 or total>131072: raise E('FILE_LIMIT','file byte limit')
        if type(f['bytes']) is not int or f['bytes'] != len(raw) or f['sha256'] != hash_bytes(raw): raise E('INTEGRITY_REFUSAL','recorded bytes mismatch')
        if f['sessionId'] != run['session_ref'] or f['runId'] != run['id'] or f['kind'] != 'content-version': raise E('BINDING_MISMATCH','recorded provenance')
        if type(f['recordIndex']) is not int or f['recordIndex'] < 0 or not isinstance(f['writtenAt'],str) or not f['writtenAt']:
            raise E('INVALID','recorded provenance')
        try:
            written = datetime.fromisoformat(f['writtenAt'].replace('Z','+00:00'))
            if written.tzinfo is None: raise ValueError('timezone required')
        except ValueError as exc: raise E('INVALID','recorded timestamp') from exc
        if f['recordIndex'] in indices: raise E('BINDING_MISMATCH','duplicate recorded append index')
        indices.add(f['recordIndex'])
        manifest.append({k:v for k,v in f.items() if k!='content'})
        contents[p]=raw
    manifest.sort(key=lambda f:f['path'].encode('utf-8'))
    identity={'schema':'selected-recorded-versions-v1','manifest':manifest}
    return manifest, contents, hash_text(canonical(identity))


class FileCandidateMixin:
    def file_input_basis(self, matter_id):
        E, canonical, _, h, _, _, _ = api()
        matter=self._matter_row(matter_id)
        sources=[dict(r) for r in self.conn.execute('SELECT s.id,s.version,s.digest FROM source_set ss JOIN source s ON s.id=ss.source_id AND s.version=ss.source_version WHERE ss.matter_id=? ORDER BY s.id',(matter_id,))]
        base=None
        if matter['active_artifact']:
            a=self.conn.execute('SELECT * FROM artifact WHERE id=?',(matter['active_artifact'],)).fetchone()
            origin = self._candidate_row(a['candidate_id']) if a else None
            if not a or origin['matter_id']!=matter_id or a['candidate_hash']!=origin['payload_hash'] or h(a['content'])!=a['content_digest']: raise E('INTEGRITY_REFUSAL','base artifact')
            bundle=self.conn.execute('SELECT b.digest FROM artifact_file_bundle a JOIN candidate_file_bundle b ON b.candidate_id=a.candidate_id WHERE a.artifact_id=?',(a['id'],)).fetchone()
            if bundle is not None: self.file_integrity(a['candidate_id'])
            base={'artifactId':a['id'],'contentDigest':a['content_digest'],'candidateDigest':a['candidate_hash'],'bundleDigest':None if bundle is None else bundle['digest']}
        return {'sources':sources,'sourceVersion':matter['source_version'],'sourceFingerprint':h(canonical({'revision':matter['source_version'],'members':sources})),
                'base':base,'contractVersion':matter['contract_version']}

    def initialize_file_run(self, context, input_value):
        E, canonical, parse, h, _, exact, _ = api()
        if self.mode != 'b0': raise E('CONTRACT_UNSUPPORTED','file candidates require B0 Core')
        exact(input_value,{'systemPrompt','currentContext','runtimeProfile','cleanSession','reasons'},'host input')
        if type(input_value['cleanSession']) is not bool or not isinstance(input_value['reasons'],list) or any(not isinstance(r,str) for r in input_value['reasons']): raise E('INVALID','coverage input')
        for k in ('systemPrompt','currentContext'):
            if not isinstance(input_value[k],str): raise E('INVALID','host input text')
        exact(input_value['runtimeProfile'],{'revision','hash'},'runtime binding')
        bounded_json(input_value,500000)
        self._begin()
        try:
            run=self._file_run(context,True)
            basis=self.file_input_basis(context['matter_id'])
            if run['base_version']!=self._matter_row(context['matter_id'])['version'] or run['source_version']!=basis['sourceVersion']: raise E('STALE_INPUT','Run basis changed')
            basis.update({'schema':'file-memo-fixed-basis-v1','inputDigest':h(canonical({'instruction':run['instruction'],**input_value})),
                          'runtimeProfile':input_value['runtimeProfile'],'coverage':'complete' if input_value['cleanSession'] and not input_value['reasons'] else 'unknown',
                          'reasons':input_value['reasons'] or ([] if input_value['cleanSession'] else ['session_history'])})
            prior=self.conn.execute('SELECT basis_json FROM file_run_basis WHERE run_id=?',(run['id'],)).fetchone()
            if prior:
                if prior['basis_json']!=canonical(basis): raise E('CONFLICT','Run basis already initialized')
            else: self.conn.execute('INSERT INTO file_run_basis VALUES(?,?,?,?)',(run['id'],run['matter_id'],canonical(basis),canonical({'instruction':run['instruction'],**input_value})))
            self.conn.commit()
            return {'initialized':True,'coverage':basis['coverage']}
        except Exception: self._rollback(); raise

    def _file_run(self, context, require_open):
        E, _, _, _, _, exact, _ = api()
        exact(context,{'matter_id','run_id'},'context')
        run=self.conn.execute('SELECT * FROM app_run WHERE id=?',(context['run_id'],)).fetchone()
        if run is None or run['matter_id']!=context['matter_id']: raise E('BINDING_MISMATCH','file Run')
        if not isinstance(run['session_ref'],str) or not run['session_ref'].strip(): raise E('BINDING_MISMATCH','file Run Session identity')
        if run['contract_version']!=FILE_CONTRACT: raise E('CONTRACT_UNSUPPORTED','file Run contract')
        if require_open and (not run['admission_open'] or run['status']!='running'): raise E('CANDIDATE_CLOSED','Run admission closed')
        return run

    def mark_file_input(self, context, reason):
        E, canonical, parse, _, _, _, _ = api()
        if not isinstance(reason,str) or not 1<=len(reason)<=200: raise E('INVALID','coverage reason')
        self._begin()
        try:
            run=self._file_run(context,True)
            row=self.conn.execute('SELECT basis_json FROM file_run_basis WHERE run_id=?',(run['id'],)).fetchone()
            if row is None: raise E('DEPENDENCY_INCOMPLETE','Run basis missing')
            basis=parse(row['basis_json']); basis['coverage']='unknown'
            if reason not in basis['reasons'] and len(basis['reasons'])<32: basis['reasons'].append(reason)
            self.conn.execute('UPDATE file_run_basis SET basis_json=? WHERE run_id=?',(canonical(basis),run['id']))
            self.conn.commit(); return {'coverage':'unknown'}
        except Exception: self._rollback(); raise

    def save_file_candidate(self, payload, files, context):
        E, canonical, parse, h, _, _, validate = api()
        if self.mode != 'b0': raise E('CONTRACT_UNSUPPORTED','file candidates require B0 Core')
        validate(payload); bounded_json(payload)
        if payload['contract_version']!=FILE_CONTRACT: raise E('CONTRACT_UNSUPPORTED','file candidate contract')
        self._begin()
        try:
            existing=self.conn.execute('SELECT * FROM candidate WHERE id=?',(payload['id'],)).fetchone()
            run=self._file_run(context,existing is None)
            if payload['matter_id']!=run['matter_id'] or payload['run_id']!=run['id']: raise E('BINDING_MISMATCH','file candidate binding')
            for p,r in [('base_version','base_version'),('source_version','source_version'),('contract_version','contract_version')]:
                if payload[p]!=run[r]: raise E('STALE_INPUT','candidate Run input')
            manifest,contents,digest=normalize_files(files,run)
            row=self.conn.execute('SELECT basis_json FROM candidate_file_bundle WHERE candidate_id=?',(payload['id'],)).fetchone() if existing else self.conn.execute('SELECT basis_json FROM file_run_basis WHERE run_id=?',(run['id'],)).fetchone()
            if row is None: raise E('DEPENDENCY_INCOMPLETE','Run basis missing')
            basis=parse(row['basis_json'])
            required={**POLICY,'policyDigest':h(canonical(POLICY))}
            identity={**payload,'fileBundle':{'schema':'selected-recorded-versions-v1','digest':digest},'basis':basis,'requiredVerification':required}
            identity_text=bounded_json(identity)
            identity_hash=h(identity_text)
            if existing:
                if existing['payload_hash']!=identity_hash: raise E('IDEMPOTENCY_CONFLICT','file candidate differs')
                self.file_integrity(payload['id'])
                self.conn.commit(); return parse(existing['save_result_json'])
            if payload.get('supersedes') and self._candidate_row(payload['supersedes'])['matter_id']!=run['matter_id']: raise E('BINDING_MISMATCH','candidate lineage')
            reasons=[] if payload['evidence'] else ['EVIDENCE_REQUIRED']
            try:
                self._verify_evidence(payload['evidence'],payload['source_version'],payload['matter_id'])
                self._check_obligations(parse(self._matter_row(payload['matter_id'])['obligations_json']),payload['obligations'],'accept',payload['matter_id'],payload['source_version'])
            except E as exc: reasons.append(exc.code)
            result_status='failed' if reasons else 'passed'
            if basis['coverage']!='complete': result_status='unknown'; reasons+=basis['reasons']
            record={'schemaVersion':1,'candidateDigest':identity_hash,'bundleDigest':digest,'basisFingerprint':h(canonical(basis)),
                    'verifier':required,'result':result_status,'reasons':reasons}
            result={'candidate_id':payload['id'],'status':'pending'}
            self.conn.execute('INSERT INTO candidate VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(payload['id'],payload['matter_id'],payload['run_id'],payload['base_version'],payload['contract_version'],payload['source_version'],payload['artifact_text'],canonical(payload['evidence']),canonical(payload['obligations']),identity_text,identity_hash,canonical(result),'pending'))
            self.conn.execute('INSERT INTO candidate_file_bundle VALUES(?,?,?,?)',(payload['id'],digest,canonical(manifest),canonical(basis)))
            for f in manifest: self.conn.execute('INSERT INTO candidate_file VALUES(?,?,?,?,?)',(payload['id'],f['path'],contents[f['path']],f['bytes'],f['sha256']))
            self.conn.execute('INSERT INTO candidate_verification VALUES(?,?,?)',(payload['id'],canonical(record),h(canonical(record))))
            self.hooks.hit('file_save_before_commit'); self.conn.commit(); self.hooks.hit('file_save_after_commit_before_ack')
            return result
        except Exception: self._rollback(); raise

    def file_integrity(self, candidate_id):
        E, canonical, parse, h, hb, _, _ = api()
        c=self._candidate_row(candidate_id); identity=parse(c['payload_json'])
        if identity.get('fileBundle',{}).get('schema') != 'selected-recorded-versions-v1' or identity.get('basis',{}).get('schema') != 'file-memo-fixed-basis-v1':
            raise E('CONTRACT_UNSUPPORTED','unknown file schema')
        b=self.conn.execute('SELECT * FROM candidate_file_bundle WHERE candidate_id=?',(candidate_id,)).fetchone()
        v=self.conn.execute('SELECT record_json,record_digest FROM candidate_verification WHERE candidate_id=?',(candidate_id,)).fetchone()
        if b is None or v is None: raise E('INTEGRITY_REFUSAL','file bundle or verification missing')
        manifest=parse(b['manifest_json']); basis=parse(b['basis_json']); record=parse(v['record_json'])
        if h(canonical(record))!=v['record_digest']: raise E('INTEGRITY_REFUSAL','verification record digest')
        for key in ('id','matter_id','run_id','base_version','contract_version','source_version','artifact_text'):
            if identity.get(key)!=c[key]: raise E('INTEGRITY_REFUSAL','candidate column binding')
        if identity.get('evidence')!=parse(c['evidence_json']) or identity.get('obligations')!=parse(c['obligations_json']): raise E('INTEGRITY_REFUSAL','candidate semantic binding')
        if h(canonical(identity))!=c['payload_hash'] or identity.get('basis')!=basis or identity.get('fileBundle')!={'schema':'selected-recorded-versions-v1','digest':b['digest']}: raise E('INTEGRITY_REFUSAL','file identity mismatch')
        if h(canonical({'schema':'selected-recorded-versions-v1','manifest':manifest}))!=b['digest']: raise E('INTEGRITY_REFUSAL','manifest digest')
        rows=self.conn.execute('SELECT * FROM candidate_file WHERE candidate_id=?',(candidate_id,)).fetchall()
        if len(rows)!=len(manifest): raise E('INTEGRITY_REFUSAL','file membership')
        files={r['path']:r for r in rows}
        for f in manifest:
            r=files.get(f['path'])
            if r is None or len(r['bytes'])!=f['bytes'] or r['byte_length']!=f['bytes'] or hb(r['bytes'])!=f['sha256'] or r['digest']!=f['sha256']: raise E('INTEGRITY_REFUSAL','file bytes')
            try: r['bytes'].decode('utf-8')
            except UnicodeError as exc: raise E('INTEGRITY_REFUSAL','file encoding') from exc
        if record.get('candidateDigest')!=c['payload_hash'] or record.get('bundleDigest')!=b['digest'] or record.get('basisFingerprint')!=h(canonical(basis)) or record.get('verifier')!=identity.get('requiredVerification'): raise E('INTEGRITY_REFUSAL','verification binding')
        return c,manifest,basis,record,files

    def check_file_accept(self,candidate_id):
        E, canonical, parse, h, _, _, _=api()
        c,manifest,basis,record,files=self.file_integrity(candidate_id)
        if record['verifier']!={**POLICY,'policyDigest':h(canonical(POLICY))}: raise E('POLICY_STALE','file policy changed')
        current=self.file_input_basis(c['matter_id'])
        if any(basis.get(k)!=v for k,v in current.items()): raise E('STALE_INPUT','file basis changed')
        if basis['coverage']!='complete': raise E('DEPENDENCY_INCOMPLETE','file inputs are not closed')
        if record['result']!='passed': raise E('VERIFICATION_REQUIRED','file checks not passed')
        if not parse(c['evidence_json']): raise E('VERIFICATION_REQUIRED','source evidence is required')

    def file_summary(self,candidate_id):
        E,_,parse,_,_,_,_=api()
        c=self._candidate_row(candidate_id)
        identity=parse(c['payload_json'])
        if identity.get('fileBundle',{}).get('schema') != 'selected-recorded-versions-v1' or identity.get('basis',{}).get('schema') != 'file-memo-fixed-basis-v1':
            return {'schemaVersion':None,'candidateDigest':c['payload_hash'],'coverage':'unknown','verification':'unknown','reasons':['CONTRACT_UNSUPPORTED'],'acceptable':False}
        c,manifest,basis,record,_=self.file_integrity(candidate_id)
        reasons=[]
        if c['status'] != 'pending': reasons.append('CANDIDATE_CLOSED')
        if c['base_version'] != self._matter_row(c['matter_id'])['version']: reasons.append('VERSION_CONFLICT')
        try: self.check_file_accept(candidate_id)
        except E as exc: reasons.append(exc.code)
        return {'schemaVersion':1,'candidateDigest':c['payload_hash'],'bundleDigest':record['bundleDigest'],'fileCount':len(manifest),
                'byteLength':sum(f['bytes'] for f in manifest),'coverage':basis['coverage'],'verification':record['result'],
                'basisFingerprint':record['basisFingerprint'],'verifier':record['verifier'],
                'basis':{k:basis[k] for k in ('schema','sourceFingerprint','base','inputDigest','runtimeProfile')},
                'reasons':list(dict.fromkeys(record['reasons']+reasons)),'acceptable':not reasons}

    def file_query(self,p):
        E,canonical,_,h,_,exact,_=api()
        exact(p,{'matter_id','context','kind','candidate_id','artifact_id','path','offset','limit'},'file query')
        if bool(p['candidate_id'])==bool(p['artifact_id']): raise E('INVALID','select exactly one candidate or artifact')
        if p['context'] is not None:
            run=self._file_run(p['context'],True)
            if run['matter_id']!=p['matter_id']: raise E('BINDING_MISMATCH','file query Run')
        cid=p['candidate_id']
        if p['artifact_id']:
            row=self.conn.execute('SELECT a.*,c.matter_id,c.payload_hash FROM artifact a JOIN candidate c ON c.id=a.candidate_id JOIN artifact_file_bundle b ON b.artifact_id=a.id AND b.candidate_id=c.id WHERE a.id=?',(p['artifact_id'],)).fetchone()
            if row is None or row['matter_id']!=p['matter_id']: raise E('BINDING_MISMATCH','file artifact ownership')
            if row['candidate_hash']!=row['payload_hash'] or h(row['content'])!=row['content_digest']: raise E('INTEGRITY_REFUSAL','file artifact identity')
            cid=row['candidate_id']
        c=self._candidate_row(cid)
        if c['matter_id']!=p['matter_id']: raise E('BINDING_MISMATCH','file candidate ownership')
        summary=self.file_summary(cid)
        if summary['schemaVersion'] is None:
            if p['kind'] != 'file-manifest': raise E('CONTRACT_UNSUPPORTED','unknown file schema cannot be decoded')
            return {'schemaVersion':1,'candidateId':cid,'artifactId':p['artifact_id'],'metadata':summary,'status':'unsupported'}
        c,manifest,basis,record,files=self.file_integrity(cid)
        response={'schemaVersion':1,'candidateId':cid,'candidateDigest':c['payload_hash'],'artifactId':p['artifact_id'],'bundleDigest':record['bundleDigest']}
        offset,limit=p['offset'],p['limit']
        if type(offset) is not int or offset<0 or type(limit) is not int or not 1<=limit<=(16 if p['kind']=='file-manifest' else 4000): raise E('INVALID','file page range')
        if p['kind']=='file-manifest':
            if offset>len(manifest): raise E('INVALID','manifest offset')
            end=min(offset+limit,len(manifest))
            return {**response,'files':manifest[offset:end],'offset':offset,'end':end,'nextOffset':end if end<len(manifest) else None,'fileCount':len(manifest)}
        f=files.get(p['path'])
        if f is None: raise E('NOT_FOUND','file path')
        value=f['bytes'].decode('utf-8')
        response.update({'path':p['path'],'fileDigest':f['digest'],'byteLength':f['byte_length']})
        if p['kind']=='file-content':
            if offset>len(value): raise E('INVALID','file offset')
            end=min(offset+limit,len(value))
            return {**response,'text':value[offset:end],'offset':offset,'end':end,'nextOffset':end if end<len(value) else None,'codePointLength':len(value)}
        if p['kind']!='file-diff' or p['artifact_id']: raise E('INVALID','diff needs candidate')
        base=basis['base']
        if base is None: return {**response,'status':'unavailable','reason':'no_corresponding_record'}
        response['base']=base
        row=self.conn.execute('SELECT candidate_id FROM artifact_file_bundle WHERE artifact_id=?',(base['artifactId'],)).fetchone()
        if row is None: return {**response,'status':'unavailable','reason':'base_not_file_bundle'}
        bc,_,_,br,bfiles=self.file_integrity(row['candidate_id'])
        if bc['matter_id']!=p['matter_id'] or bc['payload_hash']!=base['candidateDigest'] or br['bundleDigest']!=base['bundleDigest']: raise E('INTEGRITY_REFUSAL','diff base binding')
        bf=bfiles.get(p['path'])
        if bf is None: return {**response,'status':'unavailable','reason':'no_corresponding_record','selection':'only_in_selected_candidate'}
        if f['byte_length']+bf['byte_length']>131072: return {**response,'status':'unavailable','reason':'too_large'}
        old=bf['bytes'].decode('utf-8')
        # Deterministic linear prefix/suffix replacement, no quadratic LCS.
        a=0
        while a<min(len(old),len(value)) and old[a]==value[a]: a+=1
        z=0
        while z<min(len(old)-a,len(value)-a) and old[len(old)-z-1]==value[len(value)-z-1]: z+=1
        result={**response,'algorithm':'codepoint-prefix-suffix-v1','status':'unchanged' if old==value else 'modified',
                'change':{'offset':a,'removed':old[a:len(old)-z if z else len(old)],'inserted':value[a:len(value)-z if z else len(value)]},
                'baseFinalNewline':old.endswith('\n'),'candidateFinalNewline':value.endswith('\n')}
        if len(canonical(result).encode('utf-8'))>32768: return {**response,'status':'unavailable','reason':'too_large'}
        return result
