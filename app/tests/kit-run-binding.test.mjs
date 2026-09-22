import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { boot, reopen, spawnWorker } from './helpers.mjs';
import { seal, sha256, pin } from './fixtures/kit-context.mjs';
import { compileControlContext } from '../runtime/control-plane.mjs';
import { PI_RUNTIME_ADAPTER_REVISION } from '../runtime/pi-runtime-port.mjs';

const CORE = 'K3_EXACT_CORE: use retained evidence. 😀\r\n';
const DEFERRED = 'K3_DEFERRED_REFERENCE_BODY_DO_NOT_INLINE';
const SKILL = '---\nname: k3-check\ndescription: Load exact check guidance\nallowed-tools: Bash\n---\nK3_DEFERRED_SKILL_BODY_DO_NOT_INLINE';
const EXPECTED = `[Instruction local:k3-core]\n${CORE}\n\nAvailable context (use runtime_load by id; content does not grant permissions):\nlocal:k3-ref (reference): K3 reference\nlocal:k3-skill (skill): Load exact check guidance`;
const textOf = message => typeof message.content === 'string' ? message.content : (message.content ?? []).map(item => item.text ?? '').join('');
const wireText = h => h.runtime.fakeProvider.requests.map(item => item.body.messages.map(textOf).join('\n'));

async function setup(h, { core = CORE, deferred = true, schemaVersion = 2, mutateProfile, mutateKit, scopeType = 'session' } = {}) {
  const session = await h.createSession();
  const scope = scopeType === 'session' ? { type: 'session', id: session.id } : { type: 'user', id: 'local' };
  const snapshot = async () => (await h.api('GET', `/runtime-control?sessionId=${session.id}`)).json;
  const change = async input => h.api('PUT', `/runtime-control?sessionId=${session.id}`, { revision: (await snapshot()).revision, ...input });
  const sources = [
    { id: 'local:k3-core', kind: 'instruction', title: 'K3 core', content: core },
    ...(deferred ? [{ id: 'local:k3-ref', kind: 'reference', title: 'K3 reference', content: DEFERRED },
      { id: 'local:k3-skill', kind: 'skill', title: 'K3 skill', content: SKILL }] : []),
  ];
  for (const source of sources) assert.equal((await change({ operation: 'put', resource: { ...source, scope } })).status, 200);
  const ref = source => ({ resourceId: source.id, contentSha256: sha256(source.content), artifactSha256: sha256(JSON.stringify({ kind: source.kind, title: source.title, content: source.content })) });
  const kit = seal({ schemaVersion: 1, id: 'kit:k3', version: '1', core: [ref(sources[0])],
    deferred: sources.slice(1).map(source => ({ ...ref(source), required: true })), requirements: [], conflicts: [] });
  mutateKit?.(kit);
  const profile = { schemaVersion, version: 'k3-profile-v1', resourceIds: [...sources.map(item => item.id), 'tool:runtime_load', 'tool:ask_user'], rules: [], uiSlots: [], ...(schemaVersion === 2 ? { kits: [kit] } : {}) };
  mutateProfile?.(profile);
  const putProfile = async () => change({ operation: 'put', resource: { id: 'local:k3-profile', kind: 'agent_profile', title: 'K3 profile', content: JSON.stringify(profile), scope } });
  assert.equal((await putProfile()).status, 200);
  assert.equal((await change({ operation: 'profile', scope, id: 'local:k3-profile' })).status, 200);
  const start = (input = 'K3 ordinary Chat', commandId = 'k3-first') => h.api('POST', `/sessions/${session.id}/runs`, { input, commandId });
  return { session, scope, sources, profile, kit, start, change, snapshot, putProfile };
}

test('K3 authenticated import/select → actual Pi request consumes exact retained bytes once; loader stays deferred', async t => {
  const h = await boot();
  try {
    const f = await setup(h);
    const createRun = h.runtime.service.createRun.bind(h.runtime.service);
    h.runtime.service.createRun = (...args) => createRun(...args).catch(error => { h.logs.push(error.stack); throw error; });
    const admitted = await f.start();
    assert.equal(admitted.status, 200, JSON.stringify({ response: admitted.json, logs: h.logs }));
    const run = await h.pollRun(admitted.json.run.id);
    assert.equal(run.status, 'completed', JSON.stringify(run.error));
    assert.equal(h.runtime.fakeProvider.requests.length, 1);
    const text = wireText(h)[0];
    assert.equal(text.split(EXPECTED).length - 1, 1);
    assert.ok(!text.includes(DEFERRED) && !text.includes('K3_DEFERRED_SKILL_BODY'));
    const summary = run.kitBinding;
    assert.equal(summary.contextPayload.sha256, sha256(EXPECTED));
    assert.equal(summary.contextPayload.bytes, Buffer.byteLength(EXPECTED));
    assert.equal(summary.contextPayload.characters, EXPECTED.length);
    assert.equal(summary.adapter.revision, PI_RUNTIME_ADAPTER_REVISION);
    assert.equal(summary.compatibility.status, 'unchecked');
    assert.equal(summary.policy, 'reference-only-pi-unchecked-v1');
    assert.equal(run.artifacts.length, 0, 'binding bytes are not Work artifacts');
    const recorded = await h.api('GET', `/runtime-context?sessionId=${f.session.id}&runId=${run.id}`);
    assert.equal(recorded.status, 200);
    assert.equal(recorded.json.kitContext.text, EXPECTED);
    assert.deepEqual(recorded.json.binding.kitBinding, summary);
    assert.equal(recorded.json.kitContext.plan.candidate.sha256, summary.contextPayload.sha256);
    const input = h.scriptInput([{ name: 'runtime_load', arguments: { id: 'local:k3-ref' } }]);
    const loaded = await f.start(input, 'k3-load');
    assert.equal((await h.pollRun(loaded.json.run.id)).status, 'completed');
    assert.ok(wireText(h).at(-1).includes(DEFERRED));
    const events = (await h.api('GET', `/sessions/${f.session.id}/events`)).json.events;
    assert.ok(events.some(event => event.runId === loaded.json.run.id && event.type === 'runtime.context.loaded' && event.data.id === 'local:k3-ref'));
    t.diagnostic(JSON.stringify({ requestCount: h.runtime.fakeProvider.requests.length, firstRequestCount: 1, context: summary.contextPayload, planSha256: summary.planSha256, planPayload: summary.planPayload, resultStatus: run.status, compatibility: summary.compatibility.status }));
  } finally { await h.runtime.close(); }
});

test('K3 old context and lost-reply replay survive changed invalid Kit configuration and restart', async () => {
  const h = await boot(); let resumed;
  try {
    const f = await setup(h);
    const first = await f.start(); const run = await h.pollRun(first.json.run.id);
    f.profile.kits[0].descriptorSha256 = '0'.repeat(64);
    assert.equal((await f.putProfile()).status, 200);
    h.runtime.service.getRuntimeControl = () => { throw new Error('current configuration must not be consulted'); };
    assert.equal((await f.start()).json.run.id, run.id);
    const recorded = await h.api('GET', `/runtime-context?sessionId=${f.session.id}&runId=${run.id}`);
    assert.equal(recorded.json.kitContext.text, EXPECTED);
    assert.equal(h.runtime.fakeProvider.requests.length, 1);
    await h.runtime.close();
    resumed = await reopen(h.dataDir);
    const old = await resumed.api('GET', `/runtime-context?sessionId=${f.session.id}&runId=${run.id}`);
    assert.deepEqual(old.json.kitBinding, run.kitBinding);
    assert.equal(old.json.kitContext.text, EXPECTED);
    assert.equal((await resumed.api('POST', `/sessions/${f.session.id}/runs`, { input: 'K3 ordinary Chat', commandId: 'k3-first' })).json.run.id, run.id);
    const next = await resumed.api('POST', `/sessions/${f.session.id}/runs`, { input: 'new', commandId: 'new' });
    assert.equal(next.status, 400);
    assert.equal(resumed.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await resumed?.runtime.close(); }
});

test('K3 active Run blocks edits and concurrent receipt replay creates one request', async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const input = h.scriptInput([{ name: 'ask_user', arguments: { prompt: 'wait' } }]);
    const responses = await Promise.all([f.start(input), f.start(input)]);
    assert.equal(responses[0].json.run.id, responses[1].json.run.id);
    const run = await h.pollRun(responses[0].json.run.id, { until: status => status === 'waiting_user' });
    assert.equal((await f.putProfile()).status, 409);
    assert.equal(h.runtime.fakeProvider.requests.length, 1);
    await h.api('POST', `/runs/${run.id}/cancel`, {});
    assert.deepEqual((await h.pollRun(run.id)).kitBinding, run.kitBinding);
  } finally { await h.runtime.close(); }
});

test('E1 submitted selection expectation refuses stale chooser intent but original command replay remains authoritative', async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const snapshot = await f.snapshot();
    const runtimeSelection = { revision: snapshot.revision, profileId: snapshot.composition.id, sourceHash: snapshot.composition.hash };
    const send = commandId => h.api('POST', `/sessions/${f.session.id}/runs`, { input: 'guarded intent', commandId, runtimeSelection });
    const admitted = await send('guarded');
    assert.equal((await h.pollRun(admitted.json.run.id)).status, 'completed');
    f.profile.version = 'k3-profile-v2';
    await f.putProfile();
    const stale = await send('stale');
    assert.equal(stale.status, 409); assert.equal(stale.json.error.code, 'runtime_selection_conflict');
    const replay = await send('guarded');
    assert.equal(replay.json.run.id, admitted.json.run.id);
    assert.equal(h.runtime.fakeProvider.requests.length, 1);
    assert.equal(h.runtime.store.listRuns().length, 1);
  } finally { await h.runtime.close(); }
});

test('K3 config queue orders a racing edit after payload retention and frozen admission', async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const history = h.runtime.service.artifactHistory;
    const save = history.save.bind(history);
    let enter, release;
    const entered = new Promise(resolve => { enter = resolve; });
    const held = new Promise(resolve => { release = resolve; });
    history.save = async (...args) => { enter(); await held; return save(...args); };
    const start = f.start(h.scriptInput([{ name: 'ask_user', arguments: { prompt: 'wait' } }]));
    await entered;
    const before = await f.snapshot();
    const change = f.putProfile();
    release();
    const admitted = await start;
    assert.equal(admitted.json.run.kitBinding.controlRevision, before.revision);
    assert.equal((await change).status, 409);
    await h.api('POST', `/runs/${admitted.json.run.id}/cancel`, {});
    assert.equal(h.runtime.fakeProvider.requests.length <= 1, true);
  } finally { await h.runtime.close(); }
});

for (const [name, options, prepare, expectedCode] of [
  ['outside profile allowlist', { mutateProfile: profile => { profile.resourceIds = profile.resourceIds.filter(id => id !== 'local:k3-core'); } }, null, 'kit_context_refused'],
  ['required unavailable Extension tool', { mutateProfile: profile => { profile.resourceIds.push('tool:se_read_source'); } }, null, 'profile_incompatible'],
  ['mismatched descriptor', { mutateKit: kit => { kit.descriptorSha256 = '0'.repeat(64); } }, null, 'kit_context_refused'],
  ['body changed', {}, async f => f.change({ operation: 'put', resource: { ...f.sources[0], scope: f.scope, content: 'CHANGED' } }), 'kit_context_refused'],
  ['unsupported selection scope', { scopeType: 'user' }, null, 'kit_scope_unsupported'],
  ['runtime missing revision', {}, async (f, h) => { const port = h.runtime.service.runtimePort; h.runtime.service.runtimePort = { ...port, describe: () => ({ ...port.describe(), revision: undefined }) }; }, 'kit_runtime_unsupported'],
  ['malformed descriptor', { mutateKit: kit => { kit.descriptor.extra = true; } }, null, 'invalid_kit_input'],
  ['matching unsupported evidence', {}, async (f, h) => setEvidence(h, f, ['unsupported']), 'kit_context_refused'],
  ['conflicting owner evidence', {}, async (f, h) => setEvidence(h, f, ['supported', 'unsupported']), 'kit_context_refused'],
]) test(`K3 ${name} refuses before inference with zero calls`, async () => {
  const h = await boot();
  try {
    const f = await setup(h, options); await prepare?.(f, h);
    const result = await f.start();
    assert.ok([400, 409].includes(result.status), JSON.stringify(result.json));
    assert.equal(result.json.error.code, expectedCode);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
    assert.equal(h.runtime.store.listRuns().length, 0);
  } finally { await h.runtime.close(); }
});

async function setEvidence(h, f, results) {
  const port = h.runtime.service.runtimePort;
  const snapshot = await f.snapshot();
  const binding = h.runtime.service.control.bind(snapshot);
  h.runtime.service.runtimePort = { ...port, describe: () => ({ ...port.describe(), kitContext: { ...port.describe().kitContext,
    compatibilityEvidence: results.map((result, index) => ({ kit: pin(f.kit), bindingHash: binding.hash,
      runtime: { adapterId: port.id, revision: PI_RUNTIME_ADAPTER_REVISION }, result,
      evidence: { ref: `synthetic-owner-evidence:${index}`, sha256: sha256(result) } })) } }) };
}

test('K3 exact Host character ceiling admitted; one over refuses without truncation', async () => {
  for (const extra of [0, 1]) {
    const h = await boot();
    try {
      const core = 'x'.repeat(100000 - '[Instruction local:k3-core]\n'.length + extra);
      const f = await setup(h, { core, deferred: false });
      const result = await f.start();
      if (extra) {
        assert.equal(result.status, 400); assert.equal(h.runtime.fakeProvider.requests.length, 0);
      } else {
        const run = await h.pollRun(result.json.run.id);
        assert.equal(run.status, 'completed'); assert.equal(run.kitBinding.contextPayload.characters, 100000);
        assert.ok(wireText(h)[0].includes('[Instruction local:k3-core]\n' + core));
      }
    } finally { await h.runtime.close(); }
  }
});

test('Kit projection preserves the bound available Extension tool; v1 keeps its prior catalog', async () => {
  const h = await boot();
  try {
    const f = await setup(h, { mutateProfile: profile => { profile.resourceIds.push('tool:shared_extension_tool'); } });
    const inspect = session => h.runtime.service.control.inspect({ session, extensions: ['a', 'b'].map(id => ({ id, title: id, version: '1', status: 'loaded', tools: ['shared_extension_tool'] })),
      provider: h.runtime.service.getProviderConfig(), adapterId: h.runtime.service.runtimePort.id, mcp: h.runtime.service.mcp });
    const session = h.runtime.store.getSession(f.session.id);
    const bound = inspect({ ...session, extensionBinding: { extensionId: 'a' } });
    const kept = bound.resources.filter(resource => resource.id === 'tool:shared_extension_tool');
    assert.equal(kept.length, 1); assert.equal(kept[0].parent, 'plugin:a'); assert.equal(kept[0].exposed, true);
    assert.equal(bound.composition.status, 'compatible');
    f.profile.schemaVersion = 1; delete f.profile.kits;
    await f.putProfile();
    assert.equal(inspect(session).resources.filter(resource => resource.id === 'tool:shared_extension_tool').length, 2);
  } finally { await h.runtime.close(); }
});

test('K3 multiple declarations preserve K1 sorted and deduplicated pins at real admission', async () => {
  const h = await boot();
  try {
    const f = await setup(h, { mutateProfile: profile => {
      const a = seal({ ...profile.kits[0].descriptor, id: 'kit:a' });
      const z = seal({ ...profile.kits[0].descriptor, id: 'kit:z' });
      profile.kits = [z, a, z];
    } });
    const made = await f.start();
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const run = await h.pollRun(made.json.run.id);
    assert.equal(run.status, 'completed'); assert.deepEqual(run.kitBinding.kits.map(item => item.id), ['kit:a', 'kit:z']);
    assert.equal(h.runtime.fakeProvider.requests.length, 1);
  } finally { await h.runtime.close(); }
});

test('K3 persistence failure leaves no Run; retained read failure produces zero calls and no fallback', async () => {
  for (const stage of ['save', 'read']) {
    const h = await boot();
    try {
      const f = await setup(h);
      h.runtime.service.artifactHistory[stage] = async () => { throw Object.assign(new Error('synthetic payload failure'), { code: 'artifact_store_unavailable' }); };
      const result = await f.start();
      if (stage === 'save') { assert.equal(result.status, 500); assert.equal(h.runtime.store.listRuns().length, 0); }
      else { const run = await h.pollRun(result.json.run.id); assert.equal(run.status, 'failed'); assert.equal(run.error.code, 'artifact_store_unavailable'); assert.ok(run.kitBinding); }
      assert.equal(h.runtime.fakeProvider.requests.length, 0);
    } finally { await h.runtime.close(); }
  }
});

test('K3 actual corrupted retained object refuses historical read; no re-execution', async () => {
  const h = await boot();
  try {
    const f = await setup(h); const created = await f.start(); const run = await h.pollRun(created.json.run.id);
    const repo = h.runtime.service.artifactHistory.repository(f.session.id);
    const ref = path.join(repo, 'refs/content-sha256', run.kitBinding.contextPayload.sha256);
    await writeFile(ref, '0'.repeat(64) + '\n');
    const read = await h.api('GET', `/runtime-context?sessionId=${f.session.id}&runId=${run.id}`);
    assert.notEqual(read.status, 200);
    assert.equal((await f.start()).json.run.id, run.id);
    assert.equal(h.runtime.fakeProvider.requests.length, 1);
  } finally { await h.runtime.close(); }
});

test('K3 requirements retain denied tool readings and cannot grant the actual write', async () => {
  const h = await boot();
  try {
    const f = await setup(h, { mutateProfile: profile => {
      profile.resourceIds.push('tool:ws_write');
      profile.rules.push({ action: 'ws_write', resource: '*', effect: 'deny' });
      const descriptor = profile.kits[0].descriptor;
      descriptor.requirements = [{ resourceId: 'tool:ws_write', required: true }];
      profile.kits[0] = seal(descriptor);
    } });
    const created = await f.start(h.scriptInput([{ name: 'ws_write', arguments: { path: 'out/forbidden.md', text: 'not permitted' } }]));
    const run = await h.pollRun(created.json.run.id);
    assert.equal(run.status, 'completed');
    const context = await h.api('GET', `/runtime-context?sessionId=${f.session.id}&runId=${run.id}`);
    assert.equal(context.json.kitContext.plan.requirements[0].reading.permission.effect, 'deny');
    await assert.rejects(readFile(path.join(f.session.workspaceDir, 'out/forbidden.md')), { code: 'ENOENT' });
    const events = (await h.api('GET', `/sessions/${f.session.id}/events`)).json.events;
    assert.ok(events.some(event => event.type === 'tool.result' && event.data.isError));
  } finally { await h.runtime.close(); }
});

test('K3 payload read returning mismatched bytes fails before provider dispatch with precise failure identity', async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const history = h.runtime.service.artifactHistory;
    const read = history.read.bind(history);
    history.read = async (...args) => {
      const bytes = await read(...args);
      return bytes[0] === 123 ? bytes : Buffer.from('corrupt retained context');
    };
    const created = await f.start();
    const run = await h.pollRun(created.json.run.id);
    assert.equal(run.status, 'failed'); assert.equal(run.error.code, 'kit_payload_invalid');
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); }
});

test('v1 and v2 empty Kit profiles use unchanged compiler bytes with null Kit authority', async () => {
  for (const schemaVersion of [1, 2]) {
    const h = await boot();
    try {
      const f = await setup(h, { schemaVersion, mutateProfile: profile => { if (schemaVersion === 2) profile.kits = []; } });
      const expected = compileControlContext(h.runtime.service.control.bind(await f.snapshot()));
      const created = await f.start(); const run = await h.pollRun(created.json.run.id);
      assert.equal(run.status, 'completed'); assert.equal(run.kitBinding, null);
      assert.equal(wireText(h)[0].split(expected).length - 1, 1);
    } finally { await h.runtime.close(); }
  }
});

test('K3 crash/reopen preserves frozen facts and changes unresolved Run to unknown without inference', async () => {
  const h = await boot(); let worker, resumed;
  try {
    const f = await setup(h);
    await h.runtime.close();
    const input = h.scriptInput([{ name: 'ask_user', arguments: { prompt: 'crash boundary' } }]);
    worker = spawnWorker({ dataDir: h.dataDir, body: `
      const created = await api('POST', '/sessions/${f.session.id}/runs', ${JSON.stringify({ input, commandId: 'crash-kit' })});
      if (!created.json.run) throw new Error(JSON.stringify(created));
      const run = await waitRun(created.json.run.id, run => run.status === 'waiting_user');
      emit({ run, requests: runtime.fakeProvider.requests.length });
    ` });
    const before = await worker.waitForLine(value => value.run);
    assert.ok(before, worker.stderr); assert.equal(before.requests, 1);
    await worker.kill();
    resumed = await reopen(h.dataDir);
    const run = (await resumed.api('GET', `/runs/${before.run.id}`)).json.run;
    assert.equal(run.status, 'unknown'); assert.deepEqual(run.kitBinding, before.run.kitBinding);
    const record = await resumed.api('GET', `/runtime-context?sessionId=${f.session.id}&runId=${run.id}`);
    assert.equal(record.json.kitContext.text, EXPECTED);
    const replay = await resumed.api('POST', `/sessions/${f.session.id}/runs`, { input, commandId: 'crash-kit' });
    assert.equal(replay.json.run.id, run.id);
    assert.equal(resumed.runtime.fakeProvider.requests.length, 0);
  } finally { await worker?.kill(); await h.runtime.close(); await resumed?.runtime.close(); }
});
