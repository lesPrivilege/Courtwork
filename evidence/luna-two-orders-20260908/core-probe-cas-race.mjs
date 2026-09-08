import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const python = String.raw`
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, 'app/core')
from core import CoreError, HookController, RunContext, SCHEMA, Store, TrustedReviewer

db = Path(sys.argv[1])
source_text = 'CAS source 😀'
source_digest = hashlib.sha256(source_text.encode('utf-8')).hexdigest()
store = Store(db)
store.conn.executescript(SCHEMA)
store.conn.execute("INSERT INTO meta(key,value) VALUES('mode','b0')")
store.conn.execute("INSERT INTO meta(key,value) VALUES('schema_version','1')")
store.conn.execute("PRAGMA user_version=1")
store.conn.execute(
    "INSERT INTO matter(id,version,contract_version,source_version,active_artifact,obligations_json) VALUES(?,?,?,?,?,?)",
    ('cas-matter', 0, 'generic-v1', 1, None, '[]'),
)
store.conn.execute(
    "INSERT INTO source(id,version,text,digest) VALUES(?,?,?,?)",
    ('cas-source', 1, source_text, source_digest),
)
store.conn.execute(
    "INSERT INTO source_set(matter_id,source_id,source_version,revision) VALUES(?,?,?,?)",
    ('cas-matter', 'cas-source', 1, 1),
)
store.conn.commit()

candidate = {
    'id': 'cas-candidate',
    'matter_id': 'cas-matter',
    'run_id': 'cas-run',
    'base_version': 0,
    'source_version': 1,
    'contract_version': 'generic-v1',
    'artifact_text': 'CAS artifact',
    'evidence': [{
        'source_id': 'cas-source', 'source_version': 1, 'start': 0,
        'end': len(source_text), 'quote': source_text, 'digest': source_digest,
    }],
    'obligations': [],
}
store.save_candidate(candidate, context=RunContext('cas-matter', 'cas-run'))

def mutate_after_audit(stage):
    if stage == 'after_audit':
        store.inject_source_revision_in_transaction('cas-matter', 2)

store.hooks = HookController(callback=mutate_after_audit)
request = {
    'request_id': 'cas-race', 'matter_id': 'cas-matter', 'candidate_id': 'cas-candidate',
    'base_version': 0, 'action': 'accept', 'reason': 'synthetic CAS race',
}
error_code = None
try:
    TrustedReviewer(store).decide(request)
except CoreError as exc:
    error_code = exc.code

state = store.state_envelope('cas-matter')
integrity = store.integrity()
assert error_code == 'STALE_INPUT', error_code
assert state['matter']['version'] == 0
assert state['matter']['source_version'] == 1
assert state['matter']['active_artifact'] is None
assert state['candidates'][0]['status'] == 'pending'
assert state['decisions'] == []
assert state['audits'] == []
assert integrity == {'integrity_check': 'ok', 'foreign_key_check': []}
print(json.dumps({
    'probe': 'cas-recheck-after-audit', 'status': 'pass', 'error': error_code,
    'matterVersion': state['matter']['version'],
    'sourceVersionAfterRollback': state['matter']['source_version'],
    'candidateStatus': state['candidates'][0]['status'],
    'decisions': len(state['decisions']), 'audits': len(state['audits']),
    'artifact': state['matter']['active_artifact'], 'integrity': integrity,
}, sort_keys=True))
store.close()
`;

const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-core-cas-race-'));
try {
  const dbPath = path.join(dataDir, 'state.db');
  const result = spawnSync(process.env.WORK_AGENT_PYTHON ?? 'python3', ['-c', python, dbPath], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  const observation = JSON.parse(result.stdout);
  assert.equal(observation.status, 'pass');
  assert.equal(observation.error, 'STALE_INPUT');
  assert.equal(observation.decisions, 0);
  assert.equal(observation.audits, 0);
  assert.equal(observation.artifact, null);
  console.log(result.stdout.trim());
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
