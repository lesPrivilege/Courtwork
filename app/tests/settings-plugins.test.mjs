import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntimeView } from '../web/runtime-view.mjs';
import { waitFor, withTinyDom } from './tiny-dom.mjs';

const scope = { type: 'user', id: 'local' };
const plugin = { id: 'plugin:fixture', kind: 'plugin', title: 'Fixture plugin', scope,
  source: { type: 'builtin', version: '1' }, installed: true, running: false,
  exposed: false, configurable: false, health: 'healthy', trust: 'host-trusted',
  capabilities: ['tool:fixture'], provenance: [] };
async function fixture(body, request) {
  document.body = body;
  document.activeElement = body;
  const mount = document.createElement('div'); body.append(mount);
  const view = createRuntimeView({ plugins: mount }, { request, getSessionId: () => null });
  await view.load();
  return { mount, view };
}
test('Plugins shows owner states without inventing a host lifecycle switch or duplicate tool row', () => withTinyDom(async body => {
  const calls = [];
  const { mount } = await fixture(body, async (path, options) => {
    calls.push({ path, method: options?.method });
    return { revision: 1, activeRuns: 0, scopes: [scope], resources: [plugin,
      { id: 'tool:fixture', kind: 'tool', title: 'Fixture tool', parent: plugin.id }] };
  });
  assert.equal(mount.querySelectorAll('.runtime-row').length, 1);
  assert.equal(mount.querySelectorAll('input').length, 0);
  assert.match(mount.textContent, /InstalledYesRunningNoExposedNot exposed/);
  assert.match(mount.textContent, /Fixture tool/);
  const links = [...mount.querySelectorAll('a')].map(x => x.getAttribute('href'));
  assert.ok(links.includes('#settings/tools'));
  assert.ok(links.includes('#settings/permissions'));
  assert.ok(links.includes('#settings/developer'));
  assert.ok(calls.every(call => !call.method));
}));
test('Plugins preserves active-run restrictions and reports empty and failed reads', () => withTinyDom(async body => {
  let fail = true;
  const { mount, view } = await fixture(body, async () => {
    if (fail) throw new Error('fixture unavailable');
    return { revision: 1, activeRuns: 1, scopes: [scope], resources: [] };
  });
  assert.match(mount.textContent, /fixture unavailable/);
  assert.match(mount.textContent, /Retry loading plugins/);
  fail = false;
  [...mount.querySelectorAll("button")].find(button => button.textContent.includes("Retry loading plugins")).click();
  await waitFor(() => mount.textContent.includes("No plugin is installed"));
  assert.match(mount.textContent, /No plugin is installed/);
  assert.match(mount.textContent, /A run is active/);
  assert.equal(mount.getAttribute('data-frozen'), 'true');
}));
