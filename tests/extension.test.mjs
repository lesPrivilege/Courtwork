import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { catalog } from '../app/extensions/catalog.mjs';
import { createEvidenceMemo, CONTRACT_VERSION } from '../app/extensions/evidence-memo/index.mjs';
import { manifest as evidenceManifest } from '../app/extensions/evidence-memo/manifest.mjs';
import { createProbe } from '../app/extensions/probe/index.mjs';

async function withExtension(callback) {
  const dataDir = await mkdtemp(join(tmpdir(), 'se-v5-extension-'));
  const extension = createEvidenceMemo({ dataDir });
  try {
    return await callback(extension, dataDir);
  } finally {
    await extension.dispose().catch(() => undefined);
    await rm(dataDir, { recursive: true, force: true });
  }
}

test('catalog exposes development evidence-memo and business-free probe factories', async () => {
  assert.deepEqual(Object.keys(catalog).sort(), ['evidence-memo', 'inbound-nda', 'probe']);
  const probe = await catalog.probe({ dataDir: '/private/tmp/se-v5-probe-fixture' });
  assert.equal(probe.manifest.id, 'probe');
  assert.deepEqual(probe.manifest.bindingFields, []);
  assert.deepEqual(await probe.createBinding({}), {});
  await assert.rejects(() => probe.createBinding({ title: 'business' }), { code: 'INVALID_INPUT' });
  await probe.dispose();
});

test('manifest is machine-marked development and advertises generic binding fields', () => {
  assert.equal(evidenceManifest.kind, 'development-extension');
  assert.equal(evidenceManifest.releaseStatus, 'development');
  assert.deepEqual(evidenceManifest.bindingFields, [
    { name: 'title', label: 'Title', multiline: false, required: true, maxLength: 120 },
    { name: 'sourceText', label: 'Source text', multiline: true, required: true, maxLength: 100_000 },
  ]);
  assert.deepEqual(evidenceManifest.declaredTools, ['se_read_source', 'se_submit_candidate', 'se_read_artifact']);
});

test('legacy transport import resolves the single shared Core owner', async () => {
  const legacy = await import('../app/extensions/evidence-memo/server/core-client.mjs');
  const shared = await import('../app/core/client.mjs');
  assert.equal(legacy.CoreClient, shared.CoreClient);
  assert.match(shared.BRIDGE_PATH, /app.core.bridge.py$/);
});

test('createBinding owns Matter creation and projection exposes source, evidence, candidate, artifact and draft', async () => {
  await withExtension(async (extension) => {
    const sourceText = 'Alpha 😀\nBeta: evidence-backed memo.';
    const binding = await extension.createBinding({ title: 'Memo title', sourceText });
    assert.deepEqual(Object.keys(binding), ['matterId']);
    const initial = await extension.projection(binding);
    assert.equal(initial.matter.id, binding.matterId);
    assert.equal(initial.title, 'Memo title');
    assert.equal(initial.draft, '');
    assert.equal(initial.sources.length, 1);
    assert.equal(initial.evidence.length, 0);
    assert.equal(initial.candidates.length, 0);
    assert.equal(initial.artifact, null);
    assert.equal(initial.sources[0].text, sourceText);
    assert.equal(initial.matter.contract_version, CONTRACT_VERSION);
  });
});

test('begin exposes only namespaced source/propose tools and Core rejects late candidate calls after close', async () => {
  await withExtension(async (extension) => {
    const binding = await extension.createBinding({ title: 'Run title', sourceText: 'One 😀 two.' });
    const before = await extension.projection(binding);
    const runId = 'run-extension-tools';
    const run = await extension.begin({
      runId,
      sessionId: 'session-1',
      binding,
      provider: { provider: 'fake-openai-loopback', model: 'fake-1', api: 'openai-completions', baseUrl: 'http://127.0.0.1:43123/v1' },
      instruction: 'Draft a memo from the source.',
    });
    assert.deepEqual(run.tools.map((tool) => tool.name), ['se_read_source', 'se_submit_candidate', 'se_read_artifact']);
    assert.deepEqual(run.tools.map((tool) => tool.parameters.additionalProperties), [false, false, false]);
    const source = before.sources[0];
    const read = await run.tools[0].execute({ sourceId: source.id });
    assert.equal(read.text, source.text);
    const quote = Array.from(source.text).slice(0, 6).join('');
    const candidateResult = await run.tools[1].execute({
      artifact_text: quote,
      evidence: [{ source_id: source.id, source_version: source.version, start: 0, end: 6, quote, digest: source.digest }],
      obligations: [],
    });
    assert.equal(candidateResult.status, 'pending');
    await run.finish({ status: 'succeeded' });
    await assert.rejects(() => run.tools[1].execute({ artifact_text: quote, evidence: [], obligations: [] }), { code: 'CANDIDATE_CLOSED' });
    const projected = await extension.projection(binding);
    assert.equal(projected.candidates.length, 1);
    assert.equal(projected.candidates[0].status, 'pending');
    assert.equal(projected.evidence.length, 1);
    assert.equal(projected.artifact, null);
  });
});

test('humanAction accepts only host-derived local-user and uses the same Review route for formal Artifact', async () => {
  await withExtension(async (extension) => {
    const binding = await extension.createBinding({ title: 'Review title', sourceText: 'Reviewable source.' });
    const before = await extension.projection(binding);
    const source = before.sources[0];
    const run = await extension.begin({
      runId: 'run-review',
      sessionId: 'session-review',
      binding,
      provider: { provider: 'fake-openai-loopback', model: 'fake-1', api: 'openai-completions' },
      instruction: 'Propose the source.',
    });
    const quote = source.text;
    await run.tools[1].execute({
      artifact_text: quote,
      evidence: [{ source_id: source.id, source_version: 1, start: 0, end: Array.from(quote).length, quote, digest: source.digest }],
      obligations: [],
    });
    await run.finish({ status: 'succeeded' });
    const pending = await extension.projection(binding);
    const candidate = pending.candidates[0];
    await assert.rejects(() => extension.humanAction({
      binding,
      actor: 'model',
      action: 'decide',
      payload: { request_id: 'deny-actor', candidate_id: candidate.id, base_version: candidate.base_version, action: 'accept', reason: 'x' },
    }), { code: 'ACTOR_DENIED' });
    const result = await extension.humanAction({
      binding,
      actor: 'local-user',
      action: 'decide',
      payload: { request_id: 'accept-review', candidate_id: candidate.id, base_version: candidate.base_version, action: 'accept', reason: 'Checked against the source.' },
    });
    assert.equal(result.action, 'accept');
    const after = await extension.projection(binding);
    assert.equal(after.candidates[0].status, 'accepted');
    assert.equal(after.artifact.content, quote);
  });
});

test('close gates admission before cleanup and finish maps cancellation without acceptance', async () => {
  await withExtension(async (extension) => {
    const binding = await extension.createBinding({ title: 'Cancel title', sourceText: 'Cancel source.' });
    const run = await extension.begin({
      runId: 'run-cancel',
      sessionId: 'session-cancel',
      binding,
      provider: { provider: 'fake-openai-loopback', model: 'fake-1', api: 'openai-completions' },
      instruction: 'Cancel this run.',
    });
    await run.close('cancel');
    await assert.rejects(() => run.tools[0].execute({ sourceId: 'missing' }), { code: 'CANDIDATE_CLOSED' });
    const result = await run.finish({ status: 'canceled' });
    assert.equal(result.status, 'canceled');
    const projected = await extension.projection(binding);
    assert.equal(projected.candidates.length, 0);
    assert.equal(projected.artifact, null);
  });
});
