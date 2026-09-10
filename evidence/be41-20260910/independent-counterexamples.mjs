import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CoreClient } from '../../app/core/client.mjs';

const source = (id, version = 1) => ({ id, version, text: `${id}-${version}`, digest: createHash('sha256').update(`${id}-${version}`).digest('hex') });
const query = (core, opts = {}) => core.call('work_derivations', { project_id: 'p', limit: 25, offset: 0, snapshot_ref: null, ...opts });
async function base(core, id, project = 'p', contractVersion = 'contract-1') {
  await core.createMatter({ matterId: id, title: id, source: source(`${id}-s`), contractVersion });
  await core.call('claim_work', { matter_id: id, project_id: project, extension_id: 'evidence-memo' });
}
function sql(db, code, ...args) {
  const r = spawnSync('python3', ['-c', code, db, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
async function fixture(name, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), `cw-be41-review-${name}-`));
  const core = new CoreClient({ dataDir: dir });
  try { return await fn(core, dir); } finally { await core.close(); await rm(dir, { recursive: true, force: true }); }
}
const out = {};

out.revisionJumpAndRollback = await fixture('revision', async (core) => {
  await base(core, 'jump');
  await core.call('replace_sources', { matter_id: 'jump', sources: [source('jump-s', 2)], revision: 9 });
  await base(core, 'rollback');
  await core.call('replace_sources', { matter_id: 'rollback', sources: [source('rollback-s', 2)], revision: 2 });
  await core.call('replace_sources', { matter_id: 'rollback', sources: [source('rollback-s', 1)], revision: 3 });
  const rows = (await query(core)).matters;
  const jump = rows.find((x) => x.matterId === 'jump');
  const rollback = rows.find((x) => x.matterId === 'rollback');
  assert.deepEqual(jump.sourceSetChange, { fromRevision: 1, toRevision: 9, added: [], removed: [], replaced: [{ sourceId: 'jump-s', fromVersion: 1, toVersion: 2 }] });
  assert.deepEqual(rollback.sourceSetChange.replaced, [{ sourceId: 'rollback-s', fromVersion: 2, toVersion: 1 }]);
  return { jump: jump.sourceSetChange, rollback: rollback.sourceSetChange };
});

out.missingCurrentHistory = await fixture('missing-history', async (core, dir) => {
  await base(core, 'm');
  await core.call('replace_sources', { matter_id: 'm', sources: [source('m-s', 2)], revision: 3 });
  await core.close();
  sql(path.join(dir, 'state.db'), "import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]); c.execute(\"DELETE FROM source_history WHERE matter_id='m' AND revision=3\"); c.commit(); c.close()\n");
  const row = (await query(core)).matters[0];
  assert.equal(row.availability, 'partial');
  assert.equal(row.reason, 'source_history_unavailable');
  assert.deepEqual(row.derivations, { total: null, current: null, stale: null, byStatus: [] });
  return { availability: row.availability, reason: row.reason, derivations: row.derivations };
});

out.emptyCurrentSourceSet = await fixture('empty-source-set', async (core, dir) => {
  await base(core, 'm');
  await core.close();
  sql(path.join(dir, 'state.db'), "import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]); c.execute(\"DELETE FROM source_set WHERE matter_id='m'\"); c.commit(); c.close()\n");
  const row = (await query(core)).matters[0];
  assert.equal(row.availability, 'partial');
  assert.equal(row.reason, 'source_history_unavailable');
  return { availability: row.availability, reason: row.reason };
});

out.emptyRevisionGapLimitation = await fixture('empty-gap', async (core, dir) => {
  await base(core, 'gap');
  await core.call('replace_sources', { matter_id: 'gap', sources: [source('gap-s', 2)], revision: 3 });
  const history = sql(path.join(dir, 'state.db'), "import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]); print(','.join(str(r[0]) for r in c.execute(\"SELECT revision FROM source_history WHERE matter_id='gap' ORDER BY revision\"))); c.close()\n");
  const row = (await query(core)).matters[0];
  assert.equal(history, '1,3');
  assert.equal(row.availability, 'observed');
  assert.equal(row.sourceSetChange.fromRevision, 1);
  assert.equal(row.sourceSetChange.toRevision, 3);
  return { retainedHistoryRevisions: history.split(',').map(Number), reportedChange: row.sourceSetChange, limitation: 'no empty revision marker exists' };
});

out.unknownContractGenericCounts = await fixture('unknown-contract', async (core) => {
  await base(core, 'u', 'p', 'future-contract-v99');
  await core.createRun({ runId: 'u-run', matterId: 'u', baseVersion: 0, sourceVersion: 1, contractVersion: 'future-contract-v99', instruction: 'synthetic' });
  await core.saveCandidate({ matterId: 'u', runId: 'u-run', payload: { id: 'u-candidate', matter_id: 'u', run_id: 'u-run', base_version: 0, source_version: 1, contract_version: 'future-contract-v99', artifact_text: 'draft', evidence: [], obligations: [] } });
  const row = (await query(core)).matters[0];
  assert.equal(row.availability, 'observed');
  assert.deepEqual(row.derivations, { total: 1, current: 1, stale: 0, byStatus: [{ status: 'pending', current: 1, stale: 0 }] });
  return { contract: 'future-contract-v99', availability: row.availability, derivations: row.derivations };
});

out.sourceVersionInconsistent = await fixture('source-inconsistent', async (core, dir) => {
  await base(core, 'm');
  await core.createRun({ runId: 'm-run', matterId: 'm', baseVersion: 0, sourceVersion: 1, contractVersion: 'contract-1', instruction: 'synthetic' });
  await core.saveCandidate({ matterId: 'm', runId: 'm-run', payload: { id: 'ahead', matter_id: 'm', run_id: 'm-run', base_version: 0, source_version: 1, contract_version: 'contract-1', artifact_text: 'draft', evidence: [], obligations: [] } });
  await core.close();
  sql(path.join(dir, 'state.db'), "import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]); c.execute(\"UPDATE candidate SET source_version=2 WHERE id='ahead'\"); c.commit(); c.close()\n");
  const row = (await query(core)).matters[0];
  assert.equal(row.availability, 'partial');
  assert.equal(row.reason, 'source_version_inconsistent');
  return { availability: row.availability, reason: row.reason };
});

out.unrelatedRunAndDraftDoNotInvalidate = await fixture('unrelated', async (core) => {
  await base(core, 'm');
  const before = await query(core);
  await core.saveDraft('m', 'draft mutation outside derivation digest');
  await core.createRun({ runId: 'run', matterId: 'm', baseVersion: 0, sourceVersion: 1, contractVersion: 'contract-1', instruction: 'run mutation outside derivation digest' });
  const after = await query(core, { snapshot_ref: before.snapshotRef });
  assert.equal(after.snapshotRef, before.snapshotRef);
  return { snapshotUnchanged: true, snapshotRef: before.snapshotRef };
});

out.offPageAndPolicyInvalidate = await fixture('snapshot', async (core, dir) => {
  await base(core, 'a');
  await base(core, 'b');
  const first = await query(core, { limit: 1 });
  await core.call('replace_sources', { matter_id: 'b', sources: [source('b-s', 2)], revision: 2 });
  let code = null;
  try { await query(core, { limit: 1, snapshot_ref: first.snapshotRef }); } catch (e) { code = e.code; }
  assert.equal(code, 'DERIVATIONS_SNAPSHOT_CHANGED');
  const fresh = await query(core, { limit: 1 });
  await core.close();
  sql(path.join(dir, 'state.db'), "import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]); c.execute(\"INSERT INTO matter_disclosure VALUES('p','a',1,1,'{}','synthetic')\"); c.commit(); c.close()\n");
  let policyCode = null;
  try { await query(core, { limit: 1, snapshot_ref: fresh.snapshotRef }); } catch (e) { policyCode = e.code; }
  assert.equal(policyCode, 'DERIVATIONS_SNAPSHOT_CHANGED');
  return { offPageSourceCode: code, policyCode };
});

console.log(JSON.stringify(out, null, 2));
