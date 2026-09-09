import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createAsyncLoopFixture, FIXTURE_IDENTITY, fixtureInput } from './fixtures/async-loop/index.mjs';

async function withFixture(run) {
  const fixture = await createAsyncLoopFixture();
  try { await run(fixture); } finally { await fixture.close(); }
}

async function complete(fixture, jobId, documentId, options) {
  await fixture.launch(jobId, documentId, options);
  await fixture.barrier(jobId, 'launchAccepted');
  await fixture.release(jobId, 'startExecution');
  await fixture.barrier(jobId, 'startExecution');
  await fixture.release(jobId, 'resultGenerated');
  await fixture.barrier(jobId, 'resultGenerated');
}

test('fixture independently releases two documents without timing assertions', async () => withFixture(async (fixture) => {
  const invalidInput = fixtureInput('bad-digest');
  const rejected = await fixture.launch('bad-digest', fixture.documents.A.id, { input: { ...invalidInput, digest: invalidInput.digest.toUpperCase() } });
  assert.deepEqual(rejected, { status: 400, json: { error: 'jobId, exact document bytes, and immutable lowercase SHA-256 input are required' } });
  await Promise.all([fixture.launch('job-A', fixture.documents.A.id), fixture.launch('job-B', fixture.documents.B.id)]);
  await Promise.all([fixture.barrier('job-A', 'launchAccepted'), fixture.barrier('job-B', 'launchAccepted')]);
  await fixture.release('job-A', 'startExecution'); await fixture.barrier('job-A', 'startExecution');
  await fixture.release('job-A', 'resultGenerated'); await fixture.barrier('job-A', 'resultGenerated');
  assert.equal((await fixture.query('job-A')).json.status, 'succeeded');
  assert.equal((await fixture.query('job-B')).json.status, 'accepted', 'B remains blocked until its own barrier opens');
  await fixture.release('job-B', 'startExecution'); await fixture.barrier('job-B', 'startExecution');
  await fixture.release('job-B', 'resultGenerated'); await fixture.barrier('job-B', 'resultGenerated');
  const b = await fixture.query('job-B');
  assert.deepEqual(b.json.fixture, FIXTURE_IDENTITY);
  assert.deepEqual(b.json.document, fixture.documents.B);
  assert.deepEqual(b.json.input, fixtureInput('job-B'));
  assert.equal(b.json.result.content, fixture.documents.B.content, 'result is the exact immutable document bytes');
}));

test('fixture makes delivery identity idempotent and exposes launch/result acknowledgement loss', async () => withFixture(async (fixture) => {
  await assert.rejects(fixture.launch('lost-launch', fixture.documents.A.id, { dropLaunchAck: true }), TypeError);
  const retried = await fixture.launch('lost-launch', fixture.documents.A.id);
  assert.equal(retried.status, 202); assert.deepEqual(await fixture.launchCounts(), { 'lost-launch': 2 });
  await fixture.release('lost-launch', 'startExecution'); await fixture.barrier('lost-launch', 'startExecution');
  await fixture.release('lost-launch', 'resultGenerated'); await fixture.barrier('lost-launch', 'resultGenerated');
  await fixture.release('lost-launch', 'sendReceipt');
  const first = await fixture.receipt('lost-launch', 'receipt-first'); await fixture.barrier('lost-launch', 'sendReceipt');
  const duplicate = await fixture.receipt('lost-launch', 'receipt-second');
  assert.deepEqual(duplicate.json, first.json, 'duplicate delivery reply preserves the first stable identity');
  await complete(fixture, 'lost-result', fixture.documents.B.id, { dropResultAck: true });
  await assert.rejects(fixture.query('lost-result'), TypeError);
  assert.equal((await fixture.query('lost-result')).json.result.resultId, 'result-lost-result');
  await complete(fixture, 'disconnect', fixture.documents.A.id, { disconnectAfterResult: true });
  await assert.rejects(fixture.query('disconnect'), TypeError);
  assert.equal((await fixture.query('disconnect')).json.status, 'succeeded');
}));

test('fixture keeps cancel-before-success and cancel-after-success distinct', async () => withFixture(async (fixture) => {
  await fixture.launch('cancel-first', fixture.documents.A.id); await fixture.release('cancel-first', 'startExecution'); await fixture.barrier('cancel-first', 'startExecution');
  assert.equal((await fixture.cancel('cancel-first', 'synthetic-stop')).json.status, 'cancelled');
  await fixture.release('cancel-first', 'resultGenerated'); await fixture.barrier('cancel-first', 'resultGenerated');
  const cancelled = await fixture.query('cancel-first');
  assert.equal(cancelled.json.status, 'cancelled'); assert.equal(cancelled.json.result.resultId, 'result-cancel-first');
  await complete(fixture, 'success-first', fixture.documents.B.id);
  const afterSuccess = await fixture.cancel('success-first', 'too-late');
  assert.equal(afterSuccess.json.status, 'succeeded'); assert.equal(afterSuccess.json.cancellation.outcome, 'ignored_after_success');
}));

test('SIGKILLs the state-owning provider and queries persisted synthetic settlement after restart', async () => withFixture(async (fixture) => {
  await complete(fixture, 'restart-query', fixture.documents.A.id);
  const killedPid = fixture.providerProcess.pid;
  await fixture.killProvider('SIGKILL');
  await fixture.restartProvider();
  assert.notEqual(fixture.providerProcess.pid, killedPid);
  const child = fixture.startQueryChild('restart-query');
  const [chunk] = await once(child.stdout, 'data');
  const observed = JSON.parse(chunk.toString());
  assert.equal(observed.kind, 'query'); assert.equal(observed.job.status, 'succeeded');
  child.kill('SIGKILL'); await once(child, 'exit');
  assert.deepEqual((await fixture.query('missing-job')).json, { error: 'missing_job' });
}));

test('in-flight provider SIGKILL retains the accepted synthetic record without implicit resume or relaunch', async () => withFixture(async (fixture) => {
  await fixture.launch('restart-in-flight', fixture.documents.B.id);
  await fixture.barrier('restart-in-flight', 'launchAccepted');
  await fixture.killProvider('SIGKILL');
  await fixture.restartProvider();
  const retained = await fixture.query('restart-in-flight');
  assert.equal(retained.json.status, 'accepted');
  assert.equal(retained.json.result, null);
  assert.deepEqual(await fixture.launchCounts(), { 'restart-in-flight': 1 });
}));

test('concurrent launches publish complete synthetic state before their barriers open', async () => withFixture(async (fixture) => {
  await Promise.all([fixture.launch('atomic-A', fixture.documents.A.id), fixture.launch('atomic-B', fixture.documents.B.id)]);
  await Promise.all([fixture.barrier('atomic-A', 'launchAccepted'), fixture.barrier('atomic-B', 'launchAccepted')]);
  await fixture.killProvider('SIGKILL'); await fixture.restartProvider();
  assert.equal((await fixture.query('atomic-A')).json.status, 'accepted');
  assert.equal((await fixture.query('atomic-B')).json.status, 'accepted');
  assert.deepEqual(await fixture.launchCounts(), { 'atomic-A': 1, 'atomic-B': 1 });
}));

test('reused job IDs reject a changed immutable request without incrementing the launch attempt', async () => withFixture(async (fixture) => {
  await fixture.launch('identity', fixture.documents.A.id);
  const changedDocument = await fixture.launch('identity', fixture.documents.B.id);
  assert.deepEqual(changedDocument, { status: 409, json: { error: 'job identity conflicts with the retained immutable request', code: 'job_identity_conflict' } });
  const unchangedInput = fixtureInput('identity');
  const changedInput = await fixture.launch('identity', fixture.documents.A.id, { input: { ...unchangedInput, version: '2' } });
  assert.equal(changedInput.status, 409);
  assert.deepEqual(await fixture.launchCounts(), { identity: 1 });
  assert.equal((await fixture.launch('identity', fixture.documents.A.id)).status, 202);
  assert.deepEqual(await fixture.launchCounts(), { identity: 2 });
}));
