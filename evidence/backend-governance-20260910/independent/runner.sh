#!/bin/zsh
set -u

FIXED_SHA="caa448ee784d1a360e81904ca535f691d2a41ea4"
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
SOURCE_TREE="${SOURCE_TREE:-$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)}"
RESULT="${SCRIPT_DIR}/result.log"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/cw-governance-independent.XXXXXX")"
cleanup() { rm -rf -- "$TMP_ROOT"; }
trap cleanup EXIT

{
  printf 'independent governance probe\n'
  printf 'fixed_sha=%s\n' "$FIXED_SHA"
  printf 'source_tree=git-root-derived-from-runner\n'
  printf 'node='; node --version
  printf 'python='; python3 --version
  git -C "$SOURCE_TREE" show -s --format='commit=%H%nsubject=%s' "$FIXED_SHA"
  git -C "$SOURCE_TREE" archive "$FIXED_SHA" | tar -x -C "$TMP_ROOT"

  cat > "$TMP_ROOT/probe.mjs" <<'PROBE'
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { CoreClient } from './app/core/client.mjs';
import { createGovernanceAdapter } from './app/extensions/governance-adapter.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const human = (project = 'p') => ({ actor: 'local-user', project_id: project, purpose: 'human-governance', execution: null });
const runtime = (project = 'p', adapter = 'adapter') => ({ actor: 'runtime', project_id: project, purpose: 'attention-runtime', execution: { adapter_id: adapter, session_id: 'independent-session', run_id: 'independent-run' } });
const matterRef = (project = 'p') => ({ project_id: project, kind: 'matter', id: 'm' });
const callQuery = (core, context, query) => core.call('governance_query', { context, query: { schema_version: 1, ...query } });
const callAction = (core, context, request) => core.call('governance_action', { context, request });
const expectCode = async (promise, code) => {
  await assert.rejects(promise, error => error?.code === code, `expected ${code}`);
};

const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-governance-independent-data-'));
const core = new CoreClient({ dataDir });
try {
  await core.createMatter({
    matterId: 'm', title: 'Independent oversized source fixture',
    source: { id: 'initial', version: 1, text: 'initial bytes', digest: sha256('initial bytes') },
    contractVersion: 'se-contract-v5.0',
  });
  await core.call('claim_work', { matter_id: 'm', project_id: 'p', extension_id: 'evidence-memo' });

  const initialView = await callQuery(core, human(), { kind: 'inspect', object_ref: matterRef() });
  const grant = {
    adapter_id: 'adapter', purpose: 'attention-runtime',
    fields: ['registry', 'details', 'sources', 'artifacts'],
    expires_at: '2099-01-01T00:00:00Z', content_scope: 'current',
  };
  const grantRequest = {
    schema_version: 1, request_id: 'independent-grant', matter_id: 'm',
    expected_policy_revision: initialView.policy.revision,
    expected_object_version: initialView.object_version, grant,
  };
  const grantReceipt = await callAction(core, human(), grantRequest);
  assert.equal(grantReceipt.policy_revision, 1);

  const oversizedSources = Array.from({ length: 129 }, (_, index) => {
    const text = `independent source ${index}`;
    return { id: `oversized-${index}`, version: 1, text, digest: sha256(text) };
  });
  await core.call('replace_sources', { matter_id: 'm', sources: oversizedSources, revision: 2 });

  await expectCode(callQuery(core, human(), { kind: 'inspect', object_ref: matterRef() }), 'GOVERNANCE_LIMIT');
  const policyOnly = await callQuery(core, human(), { kind: 'policy', object_ref: matterRef() });
  assert.equal(policyOnly.policy.revision, 1);
  assert.equal(Object.hasOwn(policyOnly, 'sources'), false);
  assert.equal(Object.hasOwn(policyOnly, 'details'), false);
  assert.equal(Object.hasOwn(policyOnly, 'artifact'), false);

  await expectCode(callQuery(core, runtime(), { kind: 'policy', object_ref: matterRef() }), 'NOT_FOUND');
  await expectCode(callQuery(core, runtime(), { kind: 'registry' }), 'GOVERNANCE_LIMIT');

  const revokeRequest = {
    schema_version: 1, request_id: 'independent-revoke', matter_id: 'm',
    expected_policy_revision: policyOnly.policy.revision,
    expected_object_version: null, grant: null,
  };
  const revokeReceipt = await callAction(core, human(), revokeRequest);
  assert.equal(revokeReceipt.policy_revision, 2);

  const replayedGrant = await callAction(core, human(), grantRequest);
  assert.deepEqual(replayedGrant, grantReceipt, 'exact grant replay must return its historical receipt');
  const afterReplayPolicy = await callQuery(core, human(), { kind: 'policy', object_ref: matterRef() });
  assert.equal(afterReplayPolicy.policy.revision, 2);
  assert.equal(afterReplayPolicy.policy.grant, null, 'replaying old grant must not restore policy');
  const runtimeAfterRevoke = await callQuery(core, runtime(), { kind: 'registry' });
  assert.equal(runtimeAfterRevoke.count, 0, 'runtime remains denied after old receipt replay');
  await expectCode(callQuery(core, runtime(), { kind: 'inspect', object_ref: matterRef() }), 'NOT_FOUND');

  let execution = { projectId: 'p', sessionId: 's', runId: 'r', adapterId: 'adapter', admissionOpen: true };
  const adapter = createGovernanceAdapter({
    core,
    getExecution: async () => execution,
  });
  assert.equal((await adapter.query({ schema_version: 1, kind: 'registry' })).count, 0);
  execution = { ...execution, admissionOpen: false };
  await expectCode(adapter.query({ schema_version: 1, kind: 'registry' }), 'CANDIDATE_CLOSED');

  let release;
  let started;
  const began = new Promise(resolve => { started = resolve; });
  const delayedAdapter = createGovernanceAdapter({
    core: { call: async () => { started(); return new Promise(resolve => { release = resolve; }); } },
    getExecution: async () => execution,
  });
  execution = { projectId: 'p', sessionId: 's', runId: 'r', adapterId: 'adapter', admissionOpen: true };
  const pending = delayedAdapter.query({ schema_version: 1, kind: 'registry' });
  await began;
  execution = { ...execution, projectId: 'q' };
  release({ count: 0 });
  await expectCode(pending, 'CANDIDATE_CLOSED');

  console.log(JSON.stringify({
    status: 'PASS', fixed_sha: 'caa448ee784d1a360e81904ca535f691d2a41ea4',
    independent_data_dir: 'temporary directory; removed after probe',
    source_count: oversizedSources.length,
    full_inspect: 'GOVERNANCE_LIMIT',
    policy_only_revision: policyOnly.policy.revision,
    revoke_revision: revokeReceipt.policy_revision,
    exact_grant_replay: 'same historical receipt; policy remains revoked',
    runtime_policy_query: 'NOT_FOUND', runtime_registry_after_revoke: runtimeAfterRevoke.count,
    closed_adapter: 'CANDIDATE_CLOSED', switched_project_adapter: 'CANDIDATE_CLOSED',
  }, null, 2));
} finally {
  await core.close();
  await rm(dataDir, { recursive: true, force: true });
}
PROBE
  node "$TMP_ROOT/probe.mjs"
} > "$RESULT" 2>&1
exit_code=$?
printf 'exit_status=%s\n' "$exit_code" >> "$RESULT"
cat "$RESULT"
exit "$exit_code"
