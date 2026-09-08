"""Bounded conventional SQLite approval baseline. No Courtwork imports.

Separate source/document/task/approval/receipt tables; transaction, CAS and
idempotency. This is a mechanism comparator, not a production workflow engine.
"""
import sys, json, sqlite3, hashlib

def enc(x):
    return json.dumps(x, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()

db, op = sys.argv[1:3]
p = json.load(sys.stdin)
c = sqlite3.connect(db)
c.row_factory = sqlite3.Row
c.execute('PRAGMA foreign_keys=ON')
if op == 'seed':
    c.executescript('''
      CREATE TABLE jobs(key TEXT PRIMARY KEY, revision INTEGER, source_revision TEXT, document_key TEXT);
      CREATE TABLE sources(key TEXT, revision TEXT, content TEXT, digest TEXT, PRIMARY KEY(key,revision));
      CREATE TABLE submissions(key TEXT PRIMARY KEY, job_key TEXT, base INTEGER, source_revision TEXT, content TEXT, tasks_json TEXT, status TEXT, contract TEXT);
      CREATE TABLE documents(key TEXT PRIMARY KEY, submission_key TEXT, content TEXT, digest TEXT);
      CREATE TABLE tasks(key TEXT PRIMARY KEY, job_key TEXT, value_json TEXT);
      CREATE TABLE approvals(key TEXT PRIMARY KEY, value_json TEXT);
      CREATE TABLE audit(key TEXT PRIMARY KEY, value_json TEXT);
      CREATE TABLE receipts(key TEXT PRIMARY KEY, request_hash TEXT, value_json TEXT);
      CREATE TABLE reviewers(key TEXT PRIMARY KEY, job_key TEXT);
    ''')
    ids = p['identities']
    task = dict(id=ids['obligationId'],text=p['spec']['obligation']['text'],status='open',blocking=False,evidence_refs=[])
    c.execute('INSERT INTO jobs VALUES(?,?,?,NULL)',(ids['workspaceId'],41,'edition-A'))
    c.execute('INSERT INTO reviewers VALUES(?,?)',(ids['reviewerId'],ids['workspaceId']))
    c.execute('INSERT INTO sources VALUES(?,?,?,?)',(ids['sourceId'],'edition-A',p['spec']['source'],sha(p['spec']['source'])))
    c.execute('INSERT INTO submissions VALUES(?,?,?,?,?,?,?,?)',(ids['proposalId'],ids['workspaceId'],41,'edition-A',p['spec']['artifact'],enc([task]),'pending',ids['contractVersion']))
    if 'stale-base' in p['task']['steps']:
        c.execute('INSERT INTO submissions VALUES(?,?,?,?,?,?,?,?)',(ids['peerProposalId'],ids['workspaceId'],41,'edition-A',p['spec']['artifact'],enc([task]),'pending',ids['contractVersion']))
    c.commit()
    print(enc({'operation':'seeded'}))
else:
    ids = p['identities']
    outcome = {'observe':'observed','restart':'restarted','replace':'source_replaced'}.get(op)
    c.execute('BEGIN IMMEDIATE')
    job = c.execute('SELECT * FROM jobs WHERE key=?',(ids['workspaceId'],)).fetchone()
    sub = c.execute('SELECT * FROM submissions WHERE key=?',(ids['proposalId'],)).fetchone()
    if op == 'replace':
        text = p['replacement']
        c.execute('INSERT INTO sources VALUES(?,?,?,?)',(ids['sourceId'],'edition-B',text,sha(text)))
        c.execute('UPDATE jobs SET source_revision=? WHERE key=?',('edition-B',job['key']))
    elif op in ('accept','spoof','changed-request','stale-base'):
        target = c.execute('SELECT * FROM submissions WHERE key=?',(ids['peerProposalId'],)).fetchone() if op == 'stale-base' else sub
        request = {'key':ids['requestId'] if op != 'stale-base' else 'different-request','submission':target['key'],'job':job['key'],'base':target['base'],'reason':'reviewed'}
        if op == 'changed-request': request['reason'] = 'changed'
        if op == 'spoof': request['actor'] = 'injected'
        fingerprint = sha(enc(request))
        receipt = c.execute('SELECT * FROM receipts WHERE key=?',(request['key'],)).fetchone()
        if 'actor' in request:
            outcome = 'authority_rejected'
        elif not c.execute('SELECT 1 FROM reviewers WHERE key=? AND job_key=?',(ids['reviewerId'],job['key'])).fetchone():
            outcome = 'authority_rejected'
        elif receipt:
            outcome = 'accepted' if receipt['request_hash'] == fingerprint else 'request_conflict'
        elif job['revision'] != request['base']:
            outcome = 'version_conflict'
        elif job['source_revision'] != sub['source_revision']:
            outcome = 'stale_source'
        else:
            document = 'doc-approved-77'
            result = dict(requestId=request['key'],workspaceId=job['key'],proposalId=sub['key'],artifactId=document,action='accept')
            approval = dict(**result,actorId=ids['reviewerId'],scope=dict(workspaceId=job['key'],proposalId=sub['key']))
            c.execute('INSERT INTO documents VALUES(?,?,?,?)',(document,sub['key'],sub['content'],sha(sub['content'])))
            for task in json.loads(sub['tasks_json']):
                c.execute('INSERT INTO tasks VALUES(?,?,?)',(task['id'],job['key'],enc(task)))
            c.execute('INSERT INTO approvals VALUES(?,?)',(request['key'],enc(approval)))
            c.execute('INSERT INTO audit VALUES(?,?)',(request['key'],enc(approval)))
            c.execute('INSERT INTO receipts VALUES(?,?,?)',(request['key'],fingerprint,enc(result)))
            c.execute('UPDATE jobs SET revision=revision+7,document_key=? WHERE key=?',(document,job['key']))
            c.execute("UPDATE submissions SET status='accepted' WHERE key=?",(target['key'],))
            outcome = 'accepted'
    elif op not in ('observe','restart'):
        raise ValueError('unknown operation')
    c.commit()
    job = dict(c.execute('SELECT * FROM jobs WHERE key=?',(ids['workspaceId'],)).fetchone())
    def source(rev):
        r = c.execute('SELECT * FROM sources WHERE key=? AND revision=?',(ids['sourceId'],rev)).fetchone()
        return dict(id=r['key'],version=r['revision'],text=r['content'],digest=r['digest'])
    doc = c.execute('SELECT * FROM documents WHERE key=?',(job['document_key'],)).fetchone()
    submissions = [dict(id=r['key'],workspaceId=r['job_key'],sourceVersion=r['source_revision'],baseVersion=str(r['base']),contractVersion=r['contract'],status=r['status'],content=r['content'],obligations=json.loads(r['tasks_json'])) for r in c.execute('SELECT * FROM submissions ORDER BY key')]
    raw = dict(job=job,source=source(job['source_revision']),original=source(sub['source_revision']),
      submissions=submissions,
      document=None if doc is None else dict(id=doc['key'],proposalId=doc['submission_key'],content=doc['content'],digest=doc['digest']),
      tasks=[json.loads(r['value_json']) for r in c.execute('SELECT value_json FROM tasks WHERE job_key=? ORDER BY key',(job['key'],))],
      approvals=[json.loads(r['value_json']) for r in c.execute('SELECT value_json FROM approvals ORDER BY key')],
      auditLog=[json.loads(r['value_json']) for r in c.execute('SELECT value_json FROM audit ORDER BY key')],
      receipts=[dict(**json.loads(r['value_json']),requestDigest=r['request_hash']) for r in c.execute('SELECT value_json,request_hash FROM receipts ORDER BY key')])
    print(enc(dict(operation=outcome,raw=raw)))
c.close()
