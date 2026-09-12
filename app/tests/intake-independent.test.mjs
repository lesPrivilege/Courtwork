import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boot } from './helpers.mjs';

function deferred() {
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  return { promise, release };
}

async function waitForQueuedConfiguration(service, prior) {
  const deadline = Date.now() + 2000;
  while (service.configurationQueue === prior) {
    if (Date.now() > deadline) throw new Error('operation did not enter the configuration queue');
    await new Promise((resolve) => setImmediate(resolve));
  }
}

test('Session deletion serializes after a queued upload; delete-first rejects upload', async (t) => {
  const h = await boot();
  t.after(() => h.runtime.close());
  const service = h.runtime.service;

  const uploadSession = await h.createSession();
  const uploadGate = deferred();
  service.configurationQueue = uploadGate.promise;
  let uploadWritten = false;
  const originalMarkWritten = service.intake.markWritten.bind(service.intake);
  service.intake.markWritten = (...args) => {
    const receipt = originalMarkWritten(...args);
    uploadWritten = true;
    return receipt;
  };
  const originalDelete = service.store.deleteSession.bind(service.store);
  service.store.deleteSession = async (sessionId) => {
    assert.equal(uploadWritten, true, 'delete must wait for the accepted upload to finish');
    return originalDelete(sessionId);
  };

  const upload = service.addMaterial(uploadSession.id, {
    name: 'brief.txt', text: 'retained before delete', commandId: 'upload-before-delete', expectedRevision: 0,
  });
  await waitForQueuedConfiguration(service, uploadGate.promise);
  const deletion = service.deleteSession(uploadSession.id);
  uploadGate.release();
  const receipt = await upload;
  await deletion;
  assert.equal(receipt.workspaceState, 'written');
  assert.equal(service.intake.read(uploadSession.id, receipt.retained).text, 'retained before delete');
  assert.throws(() => service.getMaterialFile(uploadSession.id, new URLSearchParams({
    sourceId: receipt.retained.sourceId, revision: '1', sha256: receipt.sha256,
  })), { code: 'not_found' });

  const deleteSession = await h.createSession();
  const deleteGate = deferred();
  service.configurationQueue = deleteGate.promise;
  const secondDelete = service.deleteSession(deleteSession.id);
  const laterUpload = service.addMaterial(deleteSession.id, {
    name: 'brief.txt', text: 'must not survive deletion', commandId: 'upload-after-delete', expectedRevision: 0,
  });
  deleteGate.release();
  await secondDelete;
  await assert.rejects(laterUpload, { code: 'not_found', status: 404 });
  assert.equal(service.intake.list(deleteSession.id).sources.length, 0);
});

test('shutdown waits for accepted intake writes and rejects new material uploads', async (t) => {
  const h = await boot();
  t.after(() => h.runtime.close());
  const service = h.runtime.service;
  const session = await h.createSession();
  const gate = deferred();
  service.configurationQueue = gate.promise;

  const acceptedUpload = service.addMaterial(session.id, {
    name: 'brief.txt', text: 'finish before close', commandId: 'upload-before-close', expectedRevision: 0,
  });
  await waitForQueuedConfiguration(service, gate.promise);
  let closed = false;
  const closing = h.runtime.close().then(() => { closed = true; });
  await assert.rejects(service.addMaterial(session.id, {
    name: 'later.txt', text: 'reject during close', commandId: 'upload-after-close', expectedRevision: 0,
  }), { code: 'runtime_closing', status: 503 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(closed, false, 'shutdown must wait for the already accepted upload');

  gate.release();
  const receipt = await acceptedUpload;
  await closing;
  assert.equal(receipt.workspaceState, 'written');
  assert.equal(closed, true);
});
