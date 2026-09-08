/* WO-WK11 · the two pure functions this order added, plus one drift guard.
 * Everything else the Workbench does is a statement about rendered DOM and is
 * asserted in the browser suites under
 * engineering/mvp/execution/work-surface-kit/evidence/wk11/rc. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { attentionItems } from '../web/runtime-view.mjs';
import { CONTRAST_PAIRS, contrastRatio } from '../web/settings-view.mjs';

const root = path.join(import.meta.dirname, '..', '..');
const scope = { type: 'user', id: 'local' };
const healthy = (over = {}) => ({
  id: 'tool:ws_read', kind: 'tool', title: 'ws_read', scope,
  source: { type: 'builtin' }, activation: 'always', installed: true, running: null,
  exposed: true, health: 'healthy', configurable: true, defaultExposed: true,
  provenance: [{ scope, value: true, reason: 'source default' }], ...over,
});

test('attention: a healthy snapshot produces an empty list, not a hidden one', () => {
  const snapshot = {
    resources: [healthy()],
    composition: { id: 'agent:general', status: 'compatible', missing: [], uiSlots: [] },
  };
  assert.deepEqual(attentionItems(snapshot), []);
  assert.deepEqual(attentionItems(null), []);
});

test('attention: health, diagnostics, ask permissions, trust and missing ids each raise one entry', () => {
  const snapshot = {
    resources: [
      healthy({ id: 'local:mcp', kind: 'mcp_server', title: 'Docs server', health: 'degraded' }),
      healthy({ id: 'tool:x', title: 'x', diagnostics: ['handshake timed out'] }),
      healthy({ id: 'tool:ws_write', title: 'ws_write', permission: { effect: 'ask', trace: [] } }),
      healthy({ id: 'plugin:outside', kind: 'plugin', title: 'Outside', trust: 'unverified', capabilities: ['tool:absent'] }),
    ],
    composition: { id: 'local:reader', status: 'incompatible', missing: ['local:gone'], uiSlots: [] },
  };
  const ids = attentionItems(snapshot).map((item) => item.id);
  assert.deepEqual(ids, [
    'health:local:mcp',
    'diag:tool:x',
    'permission:ask',
    'trust:plugin:outside',
    'missing:plugin:outside',
    'composition:status',
  ]);
  // An exposed ask is named by object, never counted as a pending approval.
  const ask = attentionItems(snapshot).find((item) => item.id === 'permission:ask');
  assert.match(ask.text, /asks you before each call: ws_write\.$/);
  // A resource that is not exposed cannot be waiting to ask.
  const quiet = attentionItems({
    resources: [healthy({ exposed: false, permission: { effect: 'ask', trace: [] } })],
    composition: null,
  });
  assert.deepEqual(quiet, []);
});

test('contrast: the ratio is WCAG 2.x and the extremes are exact', () => {
  assert.equal(contrastRatio([255, 255, 255], [0, 0, 0]).toFixed(2), '21.00');
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(2), '21.00');
  assert.equal(contrastRatio([18, 18, 18], [18, 18, 18]).toFixed(2), '1.00');
});

/* WK-87 (b) · the warning shown before a user skin is accepted must measure the
 * same pairs the build-time report measures. The table is written twice — once
 * in a node tool, once in a browser module — so this test is what keeps the two
 * from drifting apart. If tools/contrast-report.mjs gains or loses a pair, this
 * fails until settings-view.mjs is brought along. */
test('contrast: the browser warning checks exactly the build report pairs', () => {
  const source = readFileSync(path.join(root, 'tools', 'contrast-report.mjs'), 'utf8');
  const block = source.slice(source.indexOf('const pairs = ['), source.indexOf('];', source.indexOf('const pairs = [')) + 2);
  const fromTool = [...block.matchAll(/\["([\w-]+)",\s*"([\w-]+)",\s*([\d.]+)\]/g)]
    .map(([, fg, bg, min]) => `${fg}|${bg}|${min}`);
  const fromPage = CONTRAST_PAIRS.map(([fg, bg, min]) => `${fg}|${bg}|${min}`);
  assert.ok(fromTool.length > 10, 'the tool table was parsed');
  assert.deepEqual(fromPage, fromTool);
});
