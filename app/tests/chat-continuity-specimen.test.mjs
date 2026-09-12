import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpecimenAdapter } from './fixtures/chat-continuity/adapter.mjs';
import { createSpecimenController } from './fixtures/chat-continuity/controller.mjs';
import { startChatContinuityPreview } from '../scripts/chat-continuity-preview.mjs';
const fast = () => createSpecimenAdapter({ pause: async () => {} });
const ref = revision => ({ id: 'release-brief', revision, label: `Release brief · ${revision}` });
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };

test('unavailable and native channels preserve draft and do not acquire a Run', async () => {
  const adapter = fast(), c = createSpecimenController({ adapter });
  c.setDraft('Keep this exact draft'); c.setVariant('missing'); assert.equal(await c.send(), false);
  assert.equal(c.getState().draft, 'Keep this exact draft'); assert.equal(c.getState().run.status, 'idle');
  c.setVariant('denied'); assert.equal(await c.send(), false); assert.equal(c.getState().scope.session, 'session-a');
  c.choose({ channel: 'native' }); c.setDraft('Native draft'); assert.equal(await c.send(), false);
  assert.equal(c.getState().channel.canChooseModel, false); assert.equal(c.getState().run.status, 'idle');
  c.choose({ channel: 'retained' }); assert.equal(await c.send(), false); assert.equal(c.getState().channel.canStop, false);
  assert.equal(adapter.operations().length, 0);
});

test('draft and reading recovery are isolated by account, session and channel', () => {
  const c = createSpecimenController({ adapter: fast() });
  c.setDraft('A draft'); c.setReading({ scrollTop: 240, expandedIds: ['retained-user'] });
  c.choose({ session: 'session-b' }); assert.equal(c.getState().draft, ''); c.setDraft('B draft');
  c.choose({ account: 'account-b', session: 'session-a' }); assert.equal(c.getState().reading.scrollTop, 0);
  c.choose({ account: 'account-a', session: 'session-a' }); assert.equal(c.getState().draft, 'A draft');
  assert.deepEqual(c.getState().reading, { scrollTop: 240, expandedIds: ['retained-user'] });
  c.choose({ channel: 'native' }); assert.equal(c.getState().draft, '');
});

test('closing a detail cannot stop a run or change a work/permission fact', async () => {
  const gate = deferred(), adapter = createSpecimenAdapter({ pause: () => gate.promise }), c = createSpecimenController({ adapter });
  c.choose({ scene: 'sources' }); c.setDraft('Continue discussing'); const send = c.send();
  c.openSource(ref('r1')); c.closeSource();
  assert.equal(c.getState().run.status, 'running'); assert.equal(c.getState().variant, 'normal');
  gate.resolve(); await send; assert.equal(c.getState().run.status, 'completed'); assert.equal(c.getState().source.status, 'closed');
});

test('revocation after search rejects exact read and drops cached contents', async () => {
  const c = createSpecimenController({ adapter: fast() }); c.choose({ scene: 'sources' });
  await c.search('期限'); assert.equal(c.getState().search.hits.length, 1);
  await c.openSource(ref('r1')); assert.match(c.getState().source.record.text, /18 September/);
  c.setVariant('denied'); assert.equal(c.getState().source.record, undefined); assert.deepEqual(c.getState().search.hits, []);
  await c.openSource(ref('r1')); assert.equal(c.getState().source.code, 'ACCESS_REVOKED'); assert.equal(c.getState().source.record, undefined);
});

test('late account, session and source reads cannot overwrite the current detail', async () => {
  const requests = [], adapter = createSpecimenAdapter({ pause: () => { const g=deferred(); requests.push(g); return g.promise; } });
  const c = createSpecimenController({ adapter }); c.choose({ scene: 'changes' });
  const old = c.openSource(ref('r1')); c.choose({ account: 'account-b', session: 'session-b' });
  const newer = c.openSource(ref('r2')); requests[1].resolve(); await newer;
  assert.equal(c.getState().source.record.account, 'account-b'); assert.equal(c.getState().source.record.revision, 'r2');
  requests[0].resolve(); await old; assert.equal(c.getState().source.record.revision, 'r2');
  const r1=c.openSource(ref('r1')), r2=c.openSource(ref('r2')); requests[3].resolve(); await r2; requests[2].resolve(); await r1;
  assert.equal(c.getState().source.record.revision, 'r2');
});

test('old references remain exact; stale judgment refresh cannot accept or resolve', async () => {
  const adapter=fast(), c=createSpecimenController({ adapter }); c.choose({ scene:'changes' });
  await c.openSource(ref('r2')); await c.openSource(ref('r1')); assert.match(c.getState().source.record.text,/18 September/);
  c.setVariant('denied'); await c.openJudgment(); assert.equal(c.getState().judgment.code,'STALE_VERSION');
  await c.refreshJudgment(); assert.equal(c.getState().judgment.record.basedOn,'r1'); assert.equal(c.getState().judgment.record.status,'Needs human judgment');
  assert.ok(adapter.operations().every(x=>x.kind==='read'));
  c.setVariant('missing'); await c.openJudgment(); assert.equal(c.getState().judgment.code,'EVIDENCE_MISSING');
});

test('cancel and session changes cannot apply an old response to the current conversation', async () => {
  const gate=deferred(), c=createSpecimenController({adapter:createSpecimenAdapter({pause:()=>gate.promise})});
  c.setDraft('First request'); const send=c.send(); c.stop(); c.choose({session:'session-b'}); c.setDraft('New draft');
  gate.resolve(); await send; assert.equal(c.getState().messages.length,0); assert.equal(c.getState().draft,'New draft');
  c.choose({session:'session-a'}); assert.equal(c.getState().run.status,'cancelled'); assert.equal(c.getState().messages.length,1);
});

test('model picker mock rejects unknown operations and stale picker scope', async () => {
  const c=createSpecimenController({adapter:fast()}); await c.modelRequest('/provider-models');
  await assert.rejects(c.modelRequest('/provider-connections/x/verify',{method:'POST'}),/not part/);
  c.choose({account:'account-b'}); await assert.rejects(c.modelRequest('/provider-config',{method:'PUT',body:{}}),/scope changed/);
  await c.modelRequest('/provider-models'); await c.modelRequest('/provider-config',{method:'PUT',body:{provider:'synthetic',model:'comparison',api:'fixture',expectedVersion:0}});
  assert.match(c.getState().modelLabel,/Comparison/);
});

test('preview server has no API or mutation route and cannot traverse mounts', async () => {
  const host=await startChatContinuityPreview();
  try {
    assert.equal((await fetch(host.url+'api/v5/sessions')).status,404);
    assert.equal((await fetch(host.url,{method:'POST',body:'ignored'})).status,405);
    assert.equal((await fetch(host.url+'web/%2e%2e%2fserver%2findex.mjs')).status,404);
    assert.equal((await fetch(host.url+'web/ui-controls.mjs')).status,200);
  } finally {await host.close();}
});
