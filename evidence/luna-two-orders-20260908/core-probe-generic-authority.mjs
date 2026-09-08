import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CoreClient } from '../../app/core/client.mjs';

const digest = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

async function expectCode(action, code) {
  await assert.rejects(action, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-core-generic-authority-'));
const core = new CoreClient({ dataDir });
try {
  const sourceText = 'Generic Core source 😀';
  const source = { id: 'generic-source', version: 1, text: sourceText, digest: digest(sourceText) };
  await core.createMatter({
    matterId: 'generic-matter',
    title: 'Generic Core only',
    source,
    contractVersion: 'generic-v1',
    draft: '',
  });
  await core.createRun({
    runId: 'generic-run',
    matterId: 'generic-matter',
    baseVersion: 0,
    sourceVersion: 1,
    contractVersion: 'generic-v1',
    presetVersion: 'synthetic',
    sessionRef: 'synthetic-session',
    instruction: 'generic Core probe',
    provider: null,
    model: null,
    providerConfig: {},
  });

  const evidence = {
    source_id: source.id,
    source_version: source.version,
    start: 0,
    end: Array.from(sourceText).length,
    quote: sourceText,
    digest: source.digest,
  };
  const candidate = {
    id: 'generic-candidate',
    matter_id: 'generic-matter',
    run_id: 'generic-run',
    base_version: 0,
    source_version: 1,
    contract_version: 'generic-v1',
    artifact_text: 'Generic proposed artifact',
    evidence: [evidence],
    obligations: [],
  };
  const saved = await core.saveCandidate({ matterId: 'generic-matter', runId: 'generic-run', payload: candidate });
  assert.deepEqual(saved, { candidate_id: 'generic-candidate', status: 'pending' });

  // Model-shaped candidate input cannot add an actor/status/action field.
  await expectCode(
    () => core.saveCandidate({
      matterId: 'generic-matter',
      runId: 'generic-run',
      payload: { ...candidate, id: 'forged-candidate', actor: 'model', status: 'accepted' },
    }),
    'INVALID',
  );

  // The bridge's trusted decision operation rejects a caller-supplied actor.
  await expectCode(
    () => core.call('trusted_decide', {
      request: {
        request_id: 'forged-decision',
        matter_id: 'generic-matter',
        candidate_id: 'generic-candidate',
        base_version: 0,
        action: 'accept',
        reason: 'model attempted direct acceptance',
        actor: 'model',
      },
    }),
    'INVALID',
  );

  const state = await core.snapshot('generic-matter');
  assert.equal(state.matter.version, 0);
  assert.equal(state.artifact, null);
  assert.deepEqual(state.decisions, []);
  assert.deepEqual(state.audits, []);
  assert.deepEqual(state.candidates.map(({ id, status }) => ({ id, status })), [
    { id: 'generic-candidate', status: 'pending' },
  ]);
  console.log(JSON.stringify({
    probe: 'generic-core-authority',
    status: 'pass',
    contractVersion: 'generic-v1',
    provider: null,
    extension: null,
    gui: false,
    forgedCandidate: 'INVALID',
    forgedDecision: 'INVALID',
    committedDecisions: state.decisions.length,
    committedArtifact: state.artifact,
  }));
} finally {
  await core.close();
  await rm(dataDir, { recursive: true, force: true });
}
