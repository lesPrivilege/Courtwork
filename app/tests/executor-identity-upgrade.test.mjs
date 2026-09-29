import assert from 'node:assert/strict';
import test, {describe, before, after} from 'node:test';
import {cp, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {boot, reopen} from './helpers.mjs';
import {RuntimeStore} from '../server/store.mjs';
import {PI_EXECUTOR_ID, executorConfigurationRef} from '../server/executor-choice-state.mjs';

// Hazard: the persisted executor id embeds the Pi package version
// ("pi-coding-agent@<version>/agent-session"). Architecture M14 and "Data
// ownership": upgrading the pinned runtime must not make an existing data
// directory unopenable, and a recorded Run keeps the identity it actually ran
// with. A Host built against Pi 0.84.0 would have written 0.84.0 into every
// place below; this file reproduces what an upgrade to the current pin finds
// on disk, without touching production code.
//
// Variant "literal": only the exact id string is rewritten (the brief).
// Variant "faithful": additionally the two configurationRef hashes, which are
// sha256 over [adapterId, revision, protocol, endpointIdentity] and therefore
// would also have differed on a 0.84.0 Host, are recomputed for the old id.

const OLD_ID = 'pi-coding-agent@0.84.0/agent-session';

const jsonPaths = (value, needle) => {
  const out = [];
  (function walk(v, p) {
    if (typeof v === 'string') { if (v.includes(needle)) out.push(p); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
  })(value, '$');
  return out;
};
const shape = paths => {
  const counts = new Map();
  for (const p of paths) { const k = p.replace(/\[\d+\]/g, '[]'); counts.set(k, (counts.get(k) ?? 0) + 1); }
  return [...counts].map(([k, n]) => `${k} x${n}`);
};
const fileContains = async (dir, needle) => {
  const hits = [];
  for (const entry of await readdir(dir, {withFileTypes: true, recursive: true})) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath ?? entry.path, entry.name);
    try { if ((await readFile(file, 'utf8')).includes(needle)) hits.push(path.relative(dir, file)); } catch { /* unreadable or binary */ }
  }
  return hits;
};
const errorText = error => `${error?.code ?? ''} ${error?.message ?? error}\n${(error?.stack ?? '').split('\n').filter(l => l.includes('/app/') && !l.includes('/tests/')).slice(0, 4).join('\n')}`;

let template;
async function buildTemplate() {
  // 1. A valid persisted state, written by a real Host: one Session, one
  // completed Run against the deterministic provider.
  const h = await boot();
  const session = await h.createSession();
  const run = await h.api('POST', `/sessions/${session.id}/runs`, {commandId: 'first', input: 'hello before the upgrade'});
  assert.equal(run.status, 200, JSON.stringify(run.json));
  assert.equal((await h.pollRun(run.json.run.id)).status, 'completed');
  await h.runtime.close();
  const stateFile = path.join(h.dataDir, 'runtime-state.json');
  const text = await readFile(stateFile, 'utf8');
  const state = JSON.parse(text);
  return {dataDir: h.dataDir, projectId: h.projectId, sessionId: session.id, runId: run.json.run.id, text, state,
    otherFiles: await fileContains(h.dataDir, PI_EXECUTOR_ID)};
}

async function prepare(variant) {
  template ??= await buildTemplate();
  const dir = await mkdtemp(path.join(tmpdir(), `se-exec-upgrade-${variant}-`));
  await cp(template.dataDir, dir, {recursive: true});
  const paths = jsonPaths(template.state, PI_EXECUTOR_ID);
  let text = template.text.replaceAll(PI_EXECUTOR_ID, OLD_ID);
  const refs = [];
  if (variant === 'faithful') {
    const binding = template.state.runs[0].executorBinding;
    const current = template.state.sessions[0].executorChoice.configurationRef;
    assert.equal(current, binding.configurationRef);
    const rewritten = executorConfigurationRef({adapterId: OLD_ID, revision: binding.revision, protocol: 'pi-session-manager', endpointIdentity: null});
    assert.equal(executorConfigurationRef({adapterId: PI_EXECUTOR_ID, revision: binding.revision, protocol: 'pi-session-manager', endpointIdentity: null}), current,
      'the test must reproduce the current configurationRef before it can rewrite it');
    refs.push(...jsonPaths(template.state, current));
    text = text.replaceAll(current, rewritten);
  }
  await writeFile(path.join(dir, 'runtime-state.json'), text);
  return {dir, paths, refs};
}

after(async () => { if (template) await rm(template.dataDir, {recursive: true, force: true}); });

describe('control: the untouched state the Host wrote reopens', () => {
  test('unmodified data directory boots and lists the Session and Run', async t => {
    template ??= await buildTemplate();
    const dir = await mkdtemp(path.join(tmpdir(), 'se-exec-upgrade-control-'));
    await cp(template.dataDir, dir, {recursive: true});
    const resumed = await reopen(dir);
    try {
      const run = (await resumed.api('GET', `/runs/${template.runId}`)).json.run;
      assert.equal(run.adapterId, PI_EXECUTOR_ID);
      t.diagnostic(`JSON paths holding the current id in a freshly written state: ${JSON.stringify(shape(jsonPaths(template.state, PI_EXECUTOR_ID)))}`);
      t.diagnostic(`other files under the data directory containing the id: ${JSON.stringify(template.otherFiles)}`);
    } finally { await resumed.runtime.close(); await rm(dir, {recursive: true, force: true}); }
  });
});

for (const variant of ['literal', 'faithful']) {
  describe(`upgrade from Pi 0.84.0 state, ${variant} rewrite`, () => {
    let fx;
    before(async () => { fx = await prepare(variant); });
    after(async () => { await rm(fx.dir, {recursive: true, force: true}); });

    test('(a) the RuntimeStore loads the data directory', async t => {
      t.diagnostic(`rewritten JSON paths (shape x count): ${JSON.stringify(shape(fx.paths))}`);
      if (fx.refs.length) t.diagnostic(`configurationRef paths recomputed: ${JSON.stringify(fx.refs)}`);
      const store = new RuntimeStore({dataDir: fx.dir, logger: () => {}});
      try { await store.open(); }
      catch (error) { assert.fail(`RuntimeStore.open refused the directory: ${errorText(error)}`); }
      finally { await store.close().catch(() => {}); }
    });

    test('(b) the Session is listed and its history is readable over HTTP', async () => {
      let resumed;
      try { resumed = await reopen(fx.dir); }
      catch (error) { assert.fail(`Host boot refused the directory: ${errorText(error)}`); }
      try {
        const list = (await resumed.api('GET', `/sessions?projectId=${template.projectId}`)).json;
        const sessions = list.sessions ?? list;
        assert.ok(sessions.some(s => s.id === template.sessionId), 'Session absent from the list');
        const detail = await resumed.api('GET', `/sessions/${template.sessionId}`);
        assert.equal(detail.status, 200, JSON.stringify(detail.json));
        assert.equal(detail.json.runs.length, 1);
        const events = await resumed.api('GET', `/sessions/${template.sessionId}/events`);
        assert.equal(events.status, 200, JSON.stringify(events.json));
        assert.ok(events.json.events.some(e => e.type === 'assistant.message'), 'the recorded assistant reply is not readable');
      } finally { await resumed.runtime.close(); }
    });

    test('(c) the recorded Run still reports the adapter id it ran with', async () => {
      let resumed;
      try { resumed = await reopen(fx.dir); }
      catch (error) { assert.fail(`Host boot refused the directory: ${errorText(error)}`); }
      try {
        const run = (await resumed.api('GET', `/runs/${template.runId}`)).json.run;
        assert.equal(run.adapterId, OLD_ID);
        const viaSession = (await resumed.api('GET', `/sessions/${template.sessionId}`)).json.runs.find(r => r.id === template.runId);
        assert.equal(viaSession.adapterId, OLD_ID);
      } finally { await resumed.runtime.close(); }
    });

    test('(d) a new Run in that Session is refused: its lineage is no longer configured on this Host', async () => {
      let resumed;
      try { resumed = await reopen(fx.dir); }
      catch (error) { assert.fail(`Host boot refused the directory: ${errorText(error)}`); }
      try {
        const res = await resumed.api('POST', `/sessions/${template.sessionId}/runs`, {commandId: 'after-upgrade', input: 'hello after the upgrade'});
        assert.equal(res.status, 409, JSON.stringify(res.json));
        assert.equal(res.json.error.code, 'executor_unavailable', JSON.stringify(res.json));
      } finally { await resumed.runtime.close(); }
    });

    test('(e) a new Session in the same data directory can run', async () => {
      let resumed;
      try { resumed = await reopen(fx.dir); }
      catch (error) { assert.fail(`Host boot refused the directory: ${errorText(error)}`); }
      try {
        const created = await resumed.api('POST', '/sessions', {projectId: template.projectId, title: 'after-upgrade'});
        assert.equal(created.status, 200, JSON.stringify(created.json));
        const res = await resumed.api('POST', `/sessions/${created.json.session.id}/runs`, {commandId: 'fresh', input: 'hello from a new session'});
        assert.equal(res.status, 200, JSON.stringify(res.json));
        let run;
        for (;;) { run = (await resumed.api('GET', `/runs/${res.json.run.id}`)).json.run; if (['completed', 'failed', 'cancelled', 'unknown'].includes(run.status)) break; await new Promise(x => setTimeout(x, 25)); }
        assert.equal(run.status, 'completed', JSON.stringify(run));
        assert.equal(run.adapterId, PI_EXECUTOR_ID, 'a new Run records the identity it actually ran with');
      } finally { await resumed.runtime.close(); }
    });
  });
}
