import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntimeIntake } from '../web/runtime-intake.mjs';
import { deferred, waitFor, withTinyDom } from './tiny-dom.mjs';
import { boot, reopen } from './helpers.mjs';

function fixture(body, { resolve, save = async () => true, contextEditor = false } = {}) {
  let context = { sessionId: 'a', scope: { type: 'session', id: 'a' }, disabled: false, resources: [] };
  const sent = [], checked = [];
  let intake;
  const render = () => body.replaceChildren(intake.view('mcp_server'), contextEditor ? intake.viewContext() : intake.view('skill'));
  intake = createRuntimeIntake({
    request: async (path, options) => { checked.push({ path, ...options }); return resolve ? resolve(options.body) : { status: 'resolved', disposition: 'inspect-only', capabilities: { declared: {} } }; },
    getContext: () => context,
    submit: async body => { sent.push(body); return save(body); }, render,
  });
  render();
  const node = key => [...body.querySelectorAll('button,input,textarea,select')].find(e => e.getAttribute('data-focus-key') === key);
  const fill = (kind, key, value) => { const e = node(`intake:${kind}:${key}`); e.value = value; e.dispatchEvent({ type: key === 'protocol' ? 'change' : 'input' }); };
  return { intake, sent, checked, node, fill, render, context: next => { context = { ...context, ...next }; render(); } };
}

test('MCP intake validates without connecting and saves an unexposed resource in the selected scope', () => withTinyDom(async body => {
  const h = fixture(body);
  h.node('intake:mcp_server:toggle').click();
  h.fill('mcp_server', 'title', 'Local tools'); h.fill('mcp_server', 'url', 'http://127.0.0.1:9090/mcp');
  h.node('intake:mcp_server:review').click();
  await waitFor(() => h.node('intake:mcp_server:save'));
  assert.equal(h.sent.length, 0);
  assert.equal(h.checked[0].path, '/runtime-sources/resolve');
  h.node('intake:mcp_server:save').click();
  await waitFor(() => h.sent.length === 1);
  assert.equal(h.sent[0].operation, 'put');
  assert.equal(h.sent[0].exposed, false);
  assert.deepEqual(h.sent[0].resource.scope, { type: 'session', id: 'a' });
  assert.deepEqual(JSON.parse(h.sent[0].resource.content), { transport: 'streamable-http', url: 'http://127.0.0.1:9090/mcp', protocol: '2026-07-28' });
}));

test('Changed source cannot use stale validation and failed save retains its draft', () => withTinyDom(async body => {
  const h = fixture(body, { save: async () => false });
  h.node('intake:mcp_server:toggle').click(); h.fill('mcp_server', 'title', 'A'); h.fill('mcp_server', 'url', 'https://example.invalid/mcp');
  h.node('intake:mcp_server:review').click(); await waitFor(() => h.node('intake:mcp_server:save'));
  h.fill('mcp_server', 'url', 'https://changed.invalid/mcp');
  h.node('intake:mcp_server:save').click();
  assert.equal(h.sent.length, 0);
  h.node('intake:mcp_server:review').click(); await waitFor(() => h.node('intake:mcp_server:save') && !h.node('intake:mcp_server:save').disabled);
  h.node('intake:mcp_server:save').click(); await waitFor(() => body.textContent.includes('Not saved.'));
  assert.equal(h.node('intake:mcp_server:url').value, 'https://changed.invalid/mcp');
}));

test('Late validation cannot populate a new Session draft; active runs disable saves', () => withTinyDom(async body => {
  const pending = deferred(); const h = fixture(body, { resolve: () => pending.promise });
  h.node('intake:mcp_server:toggle').click(); h.fill('mcp_server', 'title', 'A'); h.fill('mcp_server', 'url', 'https://example.invalid');
  h.node('intake:mcp_server:review').click();
  h.intake.reset(); h.context({ sessionId: 'b', scope: { type: 'session', id: 'b' } });
  pending.resolve({ status: 'resolved', disposition: 'inspect-only' }); await new Promise(resolve => setTimeout(resolve, 0));
  h.node('intake:mcp_server:toggle').click();
  assert.equal(h.node('intake:mcp_server:title').value, ''); assert.equal(h.node('intake:mcp_server:save'), undefined);
  h.context({ disabled: true }); assert.equal(h.node('intake:mcp_server:review').disabled, true);
}));

test('New Skill exposure is atomic, survives restart, and can be enabled independently', async () => {
  const h = await boot();
  const session = await h.createSession();
  const suffix = '?sessionId=' + session.id;
  const resource = { id: 'local:intake-skill', kind: 'skill', title: 'Intake skill', scope: { type: 'session', id: session.id }, content: '---\nname: intake-skill\ndescription: Synthetic intake test\n---\nUse the recorded source.' };
  try {
    const saved = await h.api('PUT', '/runtime-control' + suffix, { revision: 0, operation: 'put', resource, exposed: false });
    assert.equal(saved.status, 200);
    assert.equal(saved.json.revision, 1);
    assert.equal(saved.json.resources.find(r => r.id === resource.id).exposed, false);
    assert.equal((await h.api('GET', '/runtime-context' + suffix)).json.context.some(r => r.id === resource.id), false);
  } finally { await h.runtime.close(); }
  const resumed = await reopen(h.dataDir);
  try {
    const snapshot = (await resumed.api('GET', '/runtime-control' + suffix)).json;
    assert.equal(snapshot.resources.find(r => r.id === resource.id).exposed, false);
    const enabled = await resumed.api('PUT', '/runtime-control' + suffix, { revision: snapshot.revision, operation: 'exposure', id: resource.id, scope: resource.scope, exposed: true });
    assert.equal(enabled.status, 200);
    assert.ok((await resumed.api('GET', '/runtime-context' + suffix)).json.context.some(r => r.id === resource.id));
  } finally { await resumed.runtime.close(); }
});

test('Skill file reads invalidate previews even when a later directory selection is invalid', () => withTinyDom(async body => {
  const h = fixture(body);
  h.node('intake:skill:toggle').click();
  const file = h.node('intake:skill:file');
  file.files = [{ name: 'SKILL.md', size: 80, text: async () => '---\r\nname: sample\r\ndescription: Example\r\n---\r\nInstruction' }];
  file.dispatchEvent({ type: 'change' });
  await waitFor(() => h.node('intake:skill:content').value.includes('Instruction'));
  h.node('intake:skill:review').click();
  await waitFor(() => h.node('intake:skill:save'));
  const folder = h.node('intake:skill:folder');
  folder.files = [{ name: 'other.md', webkitRelativePath: 'sample/other.md', size: 1 }];
  folder.dispatchEvent({ type: 'change' });
  assert.equal(h.node('intake:skill:save'), undefined);
  assert.ok(body.textContent.includes('SKILL.md at its root'));
  assert.equal(h.sent.length, 0);
}));

for (const kind of ['instruction', 'reference', 'prompt_template']) {
  test(`${kind} shares the reviewed, unexposed intake path without Skill-only fields`, () => withTinyDom(async body => {
    const h = fixture(body, { contextEditor: true });
    h.node('intake:skill:toggle').click();
    const selector = h.node('intake:context:type');
    selector.value = kind; selector.dispatchEvent({ type: 'change' });
    assert.equal(h.node('intake:skill:file'), undefined);
    h.fill(kind, 'title', `Fixture ${kind}`);
    h.fill(kind, 'content', `Synthetic ${kind} content.`);
    h.node(`intake:${kind}:review`).click();
    await waitFor(() => h.node(`intake:${kind}:save`));
    assert.equal(h.checked[0].body.kind, kind);
    h.node(`intake:${kind}:save`).click();
    await waitFor(() => h.sent.length === 1);
    assert.equal(h.sent[0].resource.kind, kind);
    assert.equal(h.sent[0].resource.content, `Synthetic ${kind} content.`);
    assert.equal(h.sent[0].exposed, false);
    assert.deepEqual(h.sent[0].resource.scope, { type: 'session', id: 'a' });
  }));
}

test('Switching resource types keeps independent drafts and cannot reuse another type preview', () => withTinyDom(async body => {
  const h = fixture(body, { contextEditor: true });
  h.node('intake:skill:toggle').click();
  const select = kind => { const selector = h.node('intake:context:type'); selector.value = kind; selector.dispatchEvent({ type: 'change' }); };
  select('instruction'); h.fill('instruction', 'content', 'Keep this draft'); h.fill('instruction', 'title', 'Instruction');
  h.node('intake:instruction:review').click(); await waitFor(() => h.node('intake:instruction:save'));
  select('reference');
  assert.equal(h.node('intake:reference:save'), undefined);
  assert.equal(h.node('intake:reference:content').value, '');
  select('instruction'); assert.equal(h.node('intake:instruction:content').value, 'Keep this draft');
  h.intake.reset(); h.render(); h.node('intake:skill:toggle').click(); select('instruction');
  assert.equal(h.node('intake:instruction:content').value, '');
  assert.equal(h.node('intake:instruction:save'), undefined);
}));

test('Text resource intake resolves and persists all three kinds without model admission', async () => {
  const h = await boot();
  try {
    let revision = (await h.api('GET', '/runtime-control')).json.revision;
    for (const kind of ['instruction', 'reference', 'prompt_template']) {
      const source = { kind, title: `Synthetic ${kind}`, content: `Recorded ${kind} source` };
      const checked = await h.api('POST', '/runtime-sources/resolve', { type: 'inline', ...source });
      assert.equal(checked.status, 200);
      assert.equal(checked.json.status, 'resolved');
      const id = `local:context-${kind.replaceAll('_', '-')}`;
      const saved = await h.api('PUT', '/runtime-control', { revision, operation: 'put', resource: { id, ...source, scope: { type: 'user', id: 'local' } }, exposed: false });
      assert.equal(saved.status, 200);
      revision = saved.json.revision;
      const descriptor = saved.json.resources.find(resource => resource.id === id);
      assert.equal(descriptor.kind, kind);
      assert.equal(descriptor.exposed, false);
      assert.equal((await h.api('GET', `/runtime-resources/${encodeURIComponent(id)}`)).json.content, source.content);
    }
  } finally { await h.runtime.close(); }
});
