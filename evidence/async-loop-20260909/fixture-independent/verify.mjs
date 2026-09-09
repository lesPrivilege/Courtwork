import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceRoot = path.resolve(process.argv[2] ?? '/private/tmp/cw-terra-async-fixture');
const expectFixed = process.argv.includes('--expect-fixed');
const fixtureRoot = path.join(sourceRoot, 'app/tests/fixtures/async-loop');
const { createAsyncLoopFixture, fixtureInput } = await import(pathToFileURL(path.join(fixtureRoot, 'index.mjs')).href);
const { sha256Utf8 } = await import(pathToFileURL(path.join(fixtureRoot, 'contract.mjs')).href);

function sourceCommit() {
  return execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

const rawDigest = (content) => 'sha256:' + createHash('sha256').update(Buffer.from(content, 'utf8')).digest('hex');

async function waitPersisted(statePath, jobId, status) {
  const deadline = Date.now() + 5_000;
  for (;;) {
    try {
      const state = JSON.parse(await readFile(statePath, 'utf8'));
      const job = state.jobs?.find((item) => item.jobId === jobId);
      if (job?.status === status) return job;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (Date.now() > deadline) throw new Error('persisted status was not observed: ' + status);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

const observations = {};

// Independent UTF-8 and normalization check. The two strings look equivalent
// to a reader but intentionally have different Unicode code-point sequences and
// therefore different exact UTF-8 bytes and SHA-256 values.
const nfc = 'Cafe\u00e9\n';
const nfd = 'Cafe\u0301\n';
assert.notEqual(nfc, nfd);
assert.notEqual(sha256Utf8(nfc), sha256Utf8(nfd));
assert.equal(sha256Utf8(nfc), rawDigest(nfc));
assert.equal(sha256Utf8(nfd), rawDigest(nfd));
{
  const fixture = await createAsyncLoopFixture();
  try {
    const mismatch = await fixture.launch('unicode-normalization-mismatch', fixture.documents.A.id, {
      input: { version: '1', content: nfd, digest: sha256Utf8(nfc) },
    });
    assert.deepEqual(mismatch, {
      status: 400,
      json: { error: 'jobId, exact document bytes, and immutable lowercase SHA-256 input are required' },
    });
    const accepted = await fixture.launch('unicode-nfd', fixture.documents.A.id, {
      input: { version: '1', content: nfd, digest: sha256Utf8(nfd) },
    });
    assert.equal(accepted.status, 202);
    await fixture.release('unicode-nfd', 'startExecution');
    await fixture.barrier('unicode-nfd', 'startExecution');
    await fixture.release('unicode-nfd', 'resultGenerated');
    await fixture.barrier('unicode-nfd', 'resultGenerated');
    const stored = await fixture.query('unicode-nfd');
    assert.equal(stored.json.input.content, nfd);
    assert.equal(stored.json.input.digest, sha256Utf8(nfd));
    observations.utf8 = {
      nfcDigest: sha256Utf8(nfc),
      nfdDigest: sha256Utf8(nfd),
      mismatchRejected: mismatch.json.error,
      acceptedCodePoints: [...nfd].map((character) => character.codePointAt(0).toString(16)),
    };
  } finally {
    await fixture.close();
  }
}

// Counterexample for unqualified launch idempotency on the historical SHA, or
// regression check for the explicit conflict response on the fixed SHA.
{
  const fixture = await createAsyncLoopFixture();
  try {
    const firstInput = fixtureInput('conflicting-retry');
    const secondInput = { version: '1', content: 'different payload\n', digest: sha256Utf8('different payload\n') };
    const first = await fixture.launch('conflicting-retry', fixture.documents.A.id, { input: firstInput });
    const conflicting = await fixture.launch('conflicting-retry', fixture.documents.B.id, { input: secondInput });
    const stored = await fixture.query('conflicting-retry');
    assert.equal(first.status, 202);
    if (expectFixed) {
      assert.deepEqual(conflicting, { status: 409, json: { error: 'job identity conflicts with the retained immutable request', code: 'job_identity_conflict' } });
      assert.equal(stored.json.document.id, fixture.documents.A.id);
      assert.equal(stored.json.input.content, firstInput.content);
      assert.equal(stored.json.launchCount, 1);
      observations.conflictingRetry = {
        first: { status: first.status, document: first.json.document.id, input: first.json.input.content },
        conflicting: { status: conflicting.status, error: conflicting.json.error, code: conflicting.json.code },
        stored: { document: stored.json.document.id, input: stored.json.input.content, launchCount: stored.json.launchCount },
        finding: 'fixed SHA returns 409 job_identity_conflict and preserves one launch attempt',
      };
    } else {
      assert.equal(conflicting.status, 202);
      assert.equal(stored.json.document.id, fixture.documents.A.id);
      assert.equal(stored.json.input.content, firstInput.content);
      assert.equal(stored.json.launchCount, 2);
      observations.conflictingRetry = {
        first: { status: first.status, document: first.json.document.id, input: first.json.input.content },
        conflicting: { status: conflicting.status, document: conflicting.json.document.id, input: conflicting.json.input.content },
        stored: { document: stored.json.document.id, input: stored.json.input.content, launchCount: stored.json.launchCount },
        finding: 'historical SHA accepts a valid same-jobId retry with different document/input without a conflict response',
      };
    }
  } finally {
    await fixture.close();
  }
}

// Independent execution-window kill: persist the executing state before
// killing the real provider child, then query it through a fresh provider.
{
  const fixture = await createAsyncLoopFixture();
  try {
    const jobId = 'independent-kill-during-execution';
    const launch = await fixture.launch(jobId, fixture.documents.A.id);
    assert.equal(launch.status, 202);
    await fixture.release(jobId, 'startExecution');
    const persisted = await waitPersisted(fixture.statePath, jobId, 'executing');
    const killedPid = fixture.providerProcess.pid;
    await fixture.killProvider('SIGKILL');
    await fixture.restartProvider();
    const afterRestart = await fixture.query(jobId);
    assert.equal(afterRestart.json.status, 'executing');
    assert.equal(afterRestart.json.result, null);
    assert.equal(afterRestart.json.launchCount, 1);
    observations.executionKill = {
      killedPid,
      restartedPid: fixture.providerProcess.pid,
      persistedBeforeKill: { status: persisted.status, result: persisted.result ?? null, launchCount: persisted.launchCount },
      afterRestart: { status: afterRestart.json.status, result: afterRestart.json.result, launchCount: afterRestart.json.launchCount },
    };
  } finally {
    await fixture.close();
  }
}

console.log(JSON.stringify({ sourceRoot, sourceCommit: sourceCommit(), observations }, null, 2));
