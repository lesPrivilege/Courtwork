import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile, symlink, readlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

// The old and ES-01 sources are immutable provenance inputs.  The current
// source is copied from the checkout so this probe exercises the product
// bridge that Astra is integrating, rather than a historical label.
const OLD_SHA = 'a7a08f035cc5a716b8c7a93024cdfe4e44e4c07d';
const ES_SHA = '95cfb165ed368e8b4c6afca7ab5c8c838cb4653c';
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptRoot, '../..');
const PYTHON = process.env.WORK_AGENT_PYTHON ?? 'python3';
const ATTENTION_SHA = process.env.ATTENTION_CODE_SHA ?? null;
const CURRENT_FILES = ['core.py','bridge.py','file_candidates.py','attention.py'];

const sourceText = 'Approved legacy source 😀';
const source = {
  id: 'legacy-source',
  version: 1,
  text: sourceText,
  digest: createHash('sha256').update(sourceText).digest('hex'),
};
const candidate = {
  id: 'legacy-candidate',
  matter_id: 'legacy-matter',
  run_id: 'legacy-run',
  base_version: 0,
  source_version: 1,
  contract_version: 'memo-v1',
  artifact_text: 'Legacy memo draft',
  evidence: [{
    source_id: source.id,
    source_version: source.version,
    start: 0,
    end: Array.from(source.text).length,
    quote: source.text,
    digest: source.digest,
  }],
  obligations: [],
};
const decision = {
  request_id: 'legacy-decision',
  matter_id: 'legacy-matter',
  candidate_id: candidate.id,
  base_version: 0,
  action: 'accept',
  reason: 'Attention migration probe',
};

const localAttentionContext = {
  actor: 'local-user',
  project_id: 'attention-migration-project',
  purpose: 'human-attention',
  execution: null,
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fileSha = async (file) => sha256(await readFile(file));

function extractFile(sha, relative, destination) {
  const result = spawnSync('git', ['show', `${sha}:${relative}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 2_000_000,
  });
  assert.equal(result.status, 0, result.stderr || result.error || `git show failed: ${sha}:${relative}`);
  return writeFile(destination, result.stdout, 'utf8');
}

async function materializeSources(root) {
  const oldRoot = path.join(root, 'old-core');
  const esRoot = path.join(root, 'es-core');
  const currentRoot = path.join(root, 'current-core');
  await Promise.all([mkdir(oldRoot, { recursive: true }), mkdir(esRoot, { recursive: true }), mkdir(currentRoot, { recursive: true })]);
  await Promise.all([
    extractFile(OLD_SHA, 'app/core/core.py', path.join(oldRoot, 'core.py')),
    extractFile(OLD_SHA, 'app/core/bridge.py', path.join(oldRoot, 'bridge.py')),
    extractFile(ES_SHA, 'app/core/core.py', path.join(esRoot, 'core.py')),
    extractFile(ES_SHA, 'app/core/bridge.py', path.join(esRoot, 'bridge.py')),
    extractFile(ES_SHA, 'app/core/file_candidates.py', path.join(esRoot, 'file_candidates.py')),
    ...CURRENT_FILES.map(name => ATTENTION_SHA
      ? extractFile(ATTENTION_SHA, `app/core/${name}`, path.join(currentRoot,name))
      : copyFile(path.join(repoRoot,'app/core',name),path.join(currentRoot,name))),
  ]);
  const sourceHashes=Object.fromEntries(await Promise.all(CURRENT_FILES.map(async name=>[name,await fileSha(path.join(currentRoot,name))])));
  return { oldRoot, esRoot, currentRoot, sourceHashes };
}

class Bridge {
  constructor(root, db) {
    this.root = root;
    this.db = db;
    this.child = spawn(PYTHON, ['-u', path.join(root, 'bridge.py'), '--db', db, '--mode', 'b0'], {
      cwd: root,
      env: {
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        PYTHONNOUSERSITE: '1',
        PYTHONHASHSEED: '0',
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child.stderr.setEncoding('utf8');
    this.stderr = '';
    this.child.stderr.on('data', (chunk) => { this.stderr += chunk; });
    this.lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    this.pending = new Map();
    this.sequence = 0;
    this.ready = false;
    this.first = new Promise((resolve, reject) => {
      this.resolveFirst = resolve;
      this.rejectFirst = reject;
      this.firstTimer = setTimeout(() => reject(new Error(`bridge ready timeout (${root})`)), 5_000);
    });
    this.lines.on('line', (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        this.rejectFirst?.(new Error(`bridge emitted invalid JSON: ${error.message}`));
        return;
      }
      if (!this.ready) {
        clearTimeout(this.firstTimer);
        this.resolveFirst?.(message);
        this.resolveFirst = null;
        this.rejectFirst = null;
        if (message.ready === true) this.ready = true;
        return;
      }
      const waiter = this.pending.get(message?.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.ok === true) waiter.resolve(message.result);
      else waiter.reject(Object.assign(new Error(message.error?.detail ?? 'bridge operation failed'), {
        code: message.error?.code ?? 'CORE_ERROR',
        detail: message.error?.detail ?? '',
      }));
    });
    this.child.on('exit', (code, signal) => {
      const error = Object.assign(new Error(`bridge exited code=${code} signal=${signal}; ${this.stderr}`), {
        code: 'CORE_UNAVAILABLE',
      });
      this.rejectFirst?.(error);
      for (const waiter of this.pending.values()) waiter.reject(error);
      this.pending.clear();
    });
  }

  async start() {
    const message = await this.first;
    if (message.ready !== true) {
      const error = Object.assign(new Error(message.error?.detail ?? 'bridge refused startup'), {
        code: message.error?.code ?? 'CORE_UNAVAILABLE',
        detail: message.error?.detail ?? '',
      });
      await this.waitExit();
      throw error;
    }
    return message;
  }

  async call(op, payload = {}) {
    if (!this.ready) throw new Error('bridge is not ready');
    const id = `attention-migration-${++this.sequence}`;
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.child.stdin.write(`${JSON.stringify({ id, op, ...payload })}\n`);
    return result;
  }

  async waitExit() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    await once(this.child, 'exit');
  }

  async close() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    if (this.ready) {
      try { await this.call('close'); } catch { /* startup/close failure is already observed */ }
    }
    try { this.child.stdin.end(); } catch { /* process may already be gone */ }
    await Promise.race([
      this.waitExit(),
      new Promise((resolve) => setTimeout(() => {
        this.child.kill('SIGTERM');
        resolve();
      }, 2_000)),
    ]);
    try { this.lines.close(); } catch { /* already closed */ }
  }
}

async function openBridge(root, db) {
  const bridge = new Bridge(root, db);
  try {
    const ready = await bridge.start();
    return { bridge, ready };
  } catch (error) {
    await bridge.close();
    throw error;
  }
}

async function expectStartupFailure(root, db) {
  const bridge = new Bridge(root, db);
  try {
    await bridge.start();
    await bridge.close();
  } catch (error) {
    await bridge.close();
    return { code: error.code ?? 'CORE_UNAVAILABLE', detail: error.detail ?? error.message };
  }
  throw new Error(`bridge unexpectedly accepted ${db}`);
}

function mutateDatabase(db, source, ...args) {
  const result = spawnSync(PYTHON, ['-c', source, db, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function metadata(db) {
  const code = `import json, sqlite3, sys
c=sqlite3.connect(sys.argv[1])
def value(table, key):
    row=c.execute(f"SELECT value FROM {table} WHERE key=?", (key,)).fetchone()
    return None if row is None else row[0]
print(json.dumps({'user_version':c.execute('PRAGMA user_version').fetchone()[0], 'core':value('meta','schema_version'), 'app':value('app_meta','schema_version')}))
c.close()`;
  const result = spawnSync(PYTHON, ['-c', code, db], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

async function seedLegacy(root, db, appVersion) {
  const { bridge, ready } = await openBridge(root, db);
  let snapshot;
  let receipt;
  try {
    await bridge.call('create_matter', {
      matter_id: 'legacy-matter', title: 'Legacy memo', source,
      contract_version: 'memo-v1', draft: '',
    });
    await bridge.call('create_run', {
      run_id: 'legacy-run', matter_id: 'legacy-matter', base_version: 0,
      source_version: 1, contract_version: 'memo-v1', preset_version: 'preset-legacy',
      session_ref: 'legacy-session', instruction: 'Prepare a memo', provider: null,
      model: null, provider_config: {},
    });
    await bridge.call('save_candidate', {
      payload: candidate,
      context: { matter_id: 'legacy-matter', run_id: 'legacy-run' },
    });
    receipt = await bridge.call('trusted_decide', { request: decision });
    snapshot = await bridge.call('snapshot', { matter_id: 'legacy-matter' });
  } finally {
    await bridge.close();
  }

  if (appVersion === 1) {
    // The fixed old bridge creates app2.  Removing only the app1 additions
    // gives a synthetic Core1/app1 file while retaining real Matter/Run data.
    mutateDatabase(db, `import sqlite3, sys
c=sqlite3.connect(sys.argv[1])
c.executescript("DROP TRIGGER IF EXISTS retain_source_membership; DROP TABLE IF EXISTS source_history; DROP TABLE IF EXISTS app_work_scope; UPDATE app_meta SET value='1' WHERE key='schema_version'; UPDATE meta SET value='1' WHERE key='schema_version'; PRAGMA user_version=1;")
c.commit(); c.close()`);
  }
  return { ready, digest: snapshot.core_state_digest, receipt };
}

async function inspect(root, db) {
  const { bridge, ready } = await openBridge(root, db);
  try {
    const snapshot = await bridge.call('snapshot', { matter_id: 'legacy-matter' });
    const replay = await bridge.call('query_request', { request_id: decision.request_id });
    return { ready, snapshot, replay, digest: snapshot.core_state_digest };
  } finally {
    await bridge.close();
  }
}

async function inspectAttentionRegistry(root, db) {
  const { bridge } = await openBridge(root, db);
  try {
    return await bridge.call('attention_query', {
      context: localAttentionContext,
      query: { schema_version: 1, kind: 'registry', offset: 0, limit: 20 },
    });
  } finally {
    await bridge.close();
  }
}

async function copyDb(sourceDb, targetDb) {
  await mkdir(path.dirname(targetDb), { recursive: true });
  await copyFile(sourceDb, targetDb);
}

async function assertRefusal(root, db, expectedCode) {
  const before = await fileSha(db);
  const refusal = await expectStartupFailure(root, db);
  const after = await fileSha(db);
  assert.equal(refusal.code, expectedCode, `${db}: ${refusal.detail}`);
  assert.equal(after, before, `${db}: failed startup mutated the database`);
  return { ...refusal, dbShaBefore: before, dbShaAfter: after };
}

async function runMigrationCase(temp, roots, appVersion, seeded) {
  const caseRoot = path.join(temp, `core1-app${appVersion}`);
  const stage1Dir = path.join(caseRoot, 'stage1');
  const stage1Db = path.join(stage1Dir, 'state.db');
  await copyDb(seeded.db, stage1Db);

  const first = await inspect(roots.esRoot, stage1Db);
  assert.equal(first.ready.core_schema_version, 2);
  assert.equal(first.ready.app_schema_version, 3);
  assert.equal(first.digest, seeded.digest, 'Core digest changed in the Core1→Core2 migration');
  assert.deepEqual(first.replay, seeded.receipt, 'Decision receipt changed in the Core1→Core2 migration');
  const firstBackup = `${stage1Db}.pre-file-core-v2-app-v3.bak`;
  assert.deepEqual(metadata(firstBackup), { user_version: 1, core: '1', app: String(appVersion) });

  const firstRestoreDb = path.join(caseRoot, 'restore-core1', 'state.db');
  await copyDb(firstBackup, firstRestoreDb);
  const restoredFirst = await inspect(roots.oldRoot, firstRestoreDb);
  assert.equal(restoredFirst.digest, seeded.digest, 'Core1 backup does not restore the Core state');
  assert.deepEqual(restoredFirst.replay, seeded.receipt, 'Core1 backup does not restore the Decision receipt');

  // Carry the first recovery copy into the second directory so both versioned
  // backups remain independently inspectable after the Attention migration.
  const finalDir = path.join(caseRoot, 'final');
  const finalDb = path.join(finalDir, 'state.db');
  await copyDb(stage1Db, finalDb);
  await copyDb(firstBackup, `${finalDb}.pre-file-core-v2-app-v3.bak`);

  // Also exercise one current-host startup directly from each legitimate old
  // application version, rather than only the staged old-host path.
  const directDb=path.join(caseRoot,'direct-old-to-attention','state.db');
  await copyDb(seeded.db,directDb);
  const direct=await inspect(roots.currentRoot,directDb);
  assert.equal(direct.digest,seeded.digest);
  assert.deepEqual(direct.replay,seeded.receipt);
  assert.deepEqual(metadata(directDb),{user_version:3,core:'3',app:'4'});
  assert.deepEqual(metadata(directDb+'.pre-file-core-v2-app-v3.bak'),{user_version:1,core:'1',app:String(appVersion)});
  assert.deepEqual(metadata(directDb+'.pre-attention-core-v3-app-v4.bak'),{user_version:2,core:'2',app:'3'});

  const upgraded = await inspect(roots.currentRoot, finalDb);
  assert.equal(upgraded.ready.core_schema_version, 3);
  assert.equal(upgraded.ready.app_schema_version, 4);
  assert.equal(upgraded.digest, seeded.digest, 'Core digest changed in Core2/app3→Core3/app4 migration');
  assert.deepEqual(upgraded.replay, seeded.receipt, 'Decision receipt changed in Attention migration');
  assert.deepEqual(metadata(finalDb), { user_version: 3, core: '3', app: '4' });
  const secondBackup = `${finalDb}.pre-attention-core-v3-app-v4.bak`;
  assert.deepEqual(metadata(secondBackup), { user_version: 2, core: '2', app: '3' });
  assert.deepEqual(await inspectAttentionRegistry(roots.currentRoot, finalDb), {
    schema_version: 1, items: [], count: 0, offset: 0, next_offset: null,
    truncated: false,
    disclosure:{policy:"local-attention-v1",purpose:"human-attention",count_scope:"visible"},
  });

  const secondRestoreDb = path.join(caseRoot, 'restore-core2-app3', 'state.db');
  await copyDb(secondBackup, secondRestoreDb);
  const restoredSecond = await inspect(roots.esRoot, secondRestoreDb);
  assert.equal(restoredSecond.digest, seeded.digest, 'Core2/app3 backup does not restore Core state');
  assert.deepEqual(restoredSecond.replay, seeded.receipt, 'Core2/app3 backup does not restore Decision receipt');

  const finalBeforeReject = await fileSha(finalDb);
  const esReject = await expectStartupFailure(roots.esRoot, finalDb);
  assert.equal(esReject.code, 'SCHEMA_NEWER');
  assert.equal(await fileSha(finalDb), finalBeforeReject, 'Core2/app3 refusal mutated final DB');
  const oldReject = await expectStartupFailure(roots.oldRoot, finalDb);
  assert.equal(oldReject.code, 'SCHEMA_NEWER');
  assert.equal(await fileSha(finalDb), finalBeforeReject, 'Core1/app2 refusal mutated final DB');

  return {
    appVersion,
    first: { ready: first.ready, digest: first.digest, receipt: first.replay, backup: metadata(firstBackup) },
    second: { ready: upgraded.ready, digest: upgraded.digest, receipt: upgraded.replay, backup: metadata(secondBackup) },
    oldBackupRestore: { digest: restoredFirst.digest, receipt: restoredFirst.replay },
    attentionBackupRestore: { digest: restoredSecond.digest, receipt: restoredSecond.replay },
    oldHostReject: esReject,
    oldestHostReject: oldReject,
  };
}

async function runNegativeCases(temp, roots, sourceDb, finalDb, legacyDb) {
  const negative = {};

  const pair24 = path.join(temp, 'negative-pair-2-4', 'state.db');
  await copyDb(sourceDb, pair24);
  mutateDatabase(pair24, `import sqlite3, sys
c=sqlite3.connect(sys.argv[1]); c.execute("UPDATE app_meta SET value='4' WHERE key='schema_version'"); c.commit(); c.close()`);
  negative.pair24 = await assertRefusal(roots.currentRoot, pair24, 'SCHEMA_INVALID');

  const pair33 = path.join(temp, 'negative-pair-3-3', 'state.db');
  await copyDb(sourceDb, pair33);
  mutateDatabase(pair33, `import sqlite3, sys
c=sqlite3.connect(sys.argv[1]); c.execute("UPDATE app_meta SET value='3' WHERE key='schema_version'"); c.execute("UPDATE meta SET value='3' WHERE key='schema_version'"); c.execute("PRAGMA user_version=3"); c.commit(); c.close()`);
  negative.pair33 = await assertRefusal(roots.currentRoot, pair33, 'SCHEMA_INVALID');

  const malformedOld = path.join(temp, 'negative-malformed-old-attention', 'state.db');
  await copyDb(sourceDb, malformedOld);
  mutateDatabase(malformedOld, `import sqlite3, sys
c=sqlite3.connect(sys.argv[1]); c.execute("CREATE TABLE attention (id TEXT PRIMARY KEY)"); c.commit(); c.close()`);
  negative.malformedOldAttention = await assertRefusal(roots.currentRoot, malformedOld, 'SCHEMA_INVALID');

  const sentinelDb = path.join(temp, 'negative-attention-backup-sentinel', 'state.db');
  await copyDb(sourceDb, sentinelDb);
  const sentinelPath = `${sentinelDb}.pre-attention-core-v3-app-v4.bak`;
  const sentinel = Buffer.from('pre-existing-attention-backup-sentinel', 'utf8');
  await writeFile(sentinelPath, sentinel);
  const sentinelBefore = await fileSha(sentinelPath);
  negative.preexistingAttentionBackup = await assertRefusal(roots.currentRoot, sentinelDb, 'SCHEMA_INVALID');
  assert.equal(await fileSha(sentinelPath), sentinelBefore, 'Attention backup sentinel was overwritten');
  negative.preexistingAttentionBackup.sentinelShaBefore = sentinelBefore;
  negative.preexistingAttentionBackup.sentinelShaAfter = await fileSha(sentinelPath);

  const malformedCurrent = path.join(temp, 'negative-malformed-current-attention', 'state.db');
  await copyDb(finalDb, malformedCurrent);
  mutateDatabase(malformedCurrent, `import sqlite3, sys
c=sqlite3.connect(sys.argv[1]); c.execute("DROP TABLE attention_event"); c.execute("CREATE TABLE attention_event (id TEXT PRIMARY KEY)"); c.commit(); c.close()`);
  negative.malformedCurrentAttention = await assertRefusal(roots.currentRoot, malformedCurrent, 'SCHEMA_INVALID');

  const missingCurrent = path.join(temp, 'negative-missing-current-attention', 'state.db');
  await copyDb(finalDb, missingCurrent);
  mutateDatabase(missingCurrent, `import sqlite3, sys
c=sqlite3.connect(sys.argv[1]); c.execute("DROP TABLE attention_request"); c.commit(); c.close()`);
  negative.missingCurrentAttention = await assertRefusal(roots.currentRoot, missingCurrent, 'SCHEMA_MISSING');

  for (const [name,base,suffix] of [
    ['legacyFileBackup',legacyDb,'.pre-file-core-v2-app-v3.bak'],
    ['attentionBackup',sourceDb,'.pre-attention-core-v3-app-v4.bak'],
  ]) {
    const db=path.join(temp,'negative-dangling-'+name,'state.db');
    await copyDb(base,db);
    const target=path.join(temp,'must-not-create-'+name+'.db');
    await symlink(target,db+suffix);
    negative[name+'DanglingSymlink']=await assertRefusal(roots.currentRoot,db,'SCHEMA_INVALID');
    assert.equal(await readlink(db+suffix),target,'backup link must be preserved');
    await assert.rejects(readFile(target),{code:'ENOENT'});
    negative[name+'DanglingSymlink'].linkPreserved=true;
    negative[name+'DanglingSymlink'].targetCreated=false;
  }
  return negative;
}

async function main() {
  const temp = await mkdtemp(path.join(tmpdir(), 'cw-attention-migration-'));
  try {
    const roots = await materializeSources(temp);
    const cases = [];
    let app2Case = null;
    for (const appVersion of [1, 2]) {
      const legacyDb = path.join(temp, `legacy-app${appVersion}`, 'state.db');
      await mkdir(path.dirname(legacyDb), { recursive: true });
      const seeded = await seedLegacy(roots.oldRoot, legacyDb, appVersion);
      const result = await runMigrationCase(temp, roots, appVersion, { ...seeded, db: legacyDb });
      cases.push(result);
      if (appVersion === 2) app2Case = result;
    }

    // Repeat only the failure matrix against a clean Core2/app3 intermediate;
    // migration cases above retain each stage's semantic recovery evidence.
    const negativeRoot = path.join(temp, 'negative-source');
    const negativeDb = path.join(negativeRoot, 'state.db');
    await mkdir(negativeRoot, { recursive: true });
    const legacyNegativeDb = path.join(temp, 'legacy-negative', 'state.db');
    const seededNegative = await seedLegacy(roots.oldRoot, legacyNegativeDb, 2);
    await copyDb(legacyNegativeDb, negativeDb);
    await inspect(roots.esRoot, negativeDb);
    const finalNegativeDir = path.join(temp, 'negative-final');
    const finalNegativeDb = path.join(finalNegativeDir, 'state.db');
    await copyDb(negativeDb, finalNegativeDb);
    await copyDb(`${negativeDb}.pre-file-core-v2-app-v3.bak`, `${finalNegativeDb}.pre-file-core-v2-app-v3.bak`);
    await inspect(roots.currentRoot, finalNegativeDb);
    const negative = await runNegativeCases(temp, roots, negativeDb, finalNegativeDb, legacyNegativeDb);

    const result = {
      oldSha: OLD_SHA,
      esSha: ES_SHA,
      currentSource: ATTENTION_SHA ?? 'working-tree app/core/{core.py,bridge.py,file_candidates.py,attention.py}',
      sourceHashes:roots.sourceHashes,
      cases,
      negative,
      status: 'passed',
      tempDataOnly: true,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
}
