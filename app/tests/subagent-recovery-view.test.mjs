import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSubagentView } from '../web/subagent-view.mjs';
import { flush, withTinyDom } from './tiny-dom.mjs';

const assignment = ({ status = 'blocked', latestStatus = 'unknown', latestRun = 'run-2', resultRun = null } = {}) => ({
  id: 'assignment-1', revision: 4, brief: 'Inspect the retained source', available: true,
  status, reason: status === 'blocked' ? (latestStatus === 'unknown' ? 'run_unknown' : 'run_failed') : null, cancelRequested: false,
  parentSessionId: 'parent-1', agentId: 'spark', definition: { id: 'builtin:explore', revision: 1 },
  origin: { actor: 'human' }, scope: { projectId: null },
  providerSelection: { provider: 'local-test', model: 'fixture' },
  budget: { maxTurns: 8, maxToolCalls: 32, deadlineMs: 60000 }, consumption: [],
  attempts: [
    { number: 1, status: 'completed', sessionId: 'child-1', runId: 'run-1' },
    { number: 2, status: latestStatus, sessionId: 'child-2', runId: latestRun },
  ],
  result: resultRun ? { revision: 1, runId: resultRun } : null,
});

async function renderedDetail(state, inspect) {
  await withTinyDom(async body => {
    document.body = body;
    const create = document.createElement.bind(document);
    document.createElement = tag => {
      const node = create(tag);
      if (tag === 'dialog') {
        node.showModal = () => { node.open = true; };
        node.close = () => { node.open = false; node.dispatchEvent({ type: 'close' }); };
      }
      if (tag === 'select') Object.defineProperty(node, 'options', { get() { return node.children.filter(child => child.tagName === 'option'); } });
      return node;
    };
    const requests = [];
    const request = async (path, options) => {
      requests.push({ path, options });
      if (path === '/subagents') return { agents: [{ status: 'active' }], assignments: [state] };
      if (path === '/sessions') return { sessions: [] };
      if (path === '/projects') return { projects: [] };
      if (path === '/subagents/mounts') return { mounts: [] };
      if (path === `/subagents/${state.id}/result`) return { text: 'Retained before publication.', sources: [], sourceFreshness: [], notes: [] };
      if (path === `/subagents/${state.id}/actions`) return { assignment: state };
      throw Error(`Unexpected request: ${path}`);
    };
    const view = createSubagentView({ request, getSession: () => null, onMaintenance: () => {}, onOpenSession: () => {} });
    try {
      await view.open();
      const task = body.querySelectorAll('button').find(button => button.textContent.endsWith(` · ${state.brief}`));
      assert.ok(task, 'the production view lists the assignment');
      task.click();
      await flush();
      const buttons = () => body.querySelectorAll('button').map(button => button.textContent);
      await inspect({ body, buttons, requests });
    } finally {
      body.querySelector('dialog').close();
    }
  });
}

test('LP-R6-UI · unknown without findings keeps explicit Reconcile', () => renderedDetail(assignment(), ({ body, buttons }) => {
  assert.ok(buttons().includes('Reconcile interrupted read-only attempt'));
  assert.match(body.textContent, /without a confirmed outcome/);
  assert.doesNotMatch(body.textContent, /Findings from this attempt are available/);
}));

test('LP-R6-UI · recovered current-attempt findings remain readable and consume Reconcile while retry stays blocked', () => renderedDetail(assignment({ resultRun: 'run-2' }), ({ body, buttons, requests }) => {
  assert.ok(requests.some(request => request.path === '/subagents/assignment-1/result'));
  assert.match(body.textContent, /Retained before publication\./);
  assert.match(body.textContent, /Findings from this attempt are available\. Its execution outcome remains unknown, and retry remains blocked\./);
  assert.equal(buttons().includes('Reconcile interrupted read-only attempt'), false);
  assert.equal(buttons().includes('Retry in a new context'), false);
  assert.equal(buttons().includes('Archive task'), false);
}));

test('LP-R6-UI · older findings do not consume the latest unknown attempt’s Reconcile', () => renderedDetail(assignment({ resultRun: 'run-1' }), ({ body, buttons }) => {
  assert.ok(buttons().includes('Reconcile interrupted read-only attempt'));
  assert.match(body.textContent, /Retained before publication\./);
  assert.doesNotMatch(body.textContent, /Findings from this attempt are available/);
}));

test('LP-R6-UI · completed findings retain the ordinary reading and archive controls', () => renderedDetail(assignment({ status: 'resolved', latestStatus: 'completed', resultRun: 'run-2' }), ({ body, buttons }) => {
  assert.match(body.textContent, /Findings ready/);
  assert.match(body.textContent, /Retained before publication\./);
  assert.equal(buttons().includes('Reconcile interrupted read-only attempt'), false);
  assert.ok(buttons().includes('Archive task'));
  assert.doesNotMatch(body.textContent, /execution outcome remains unknown/);
}));

test('LP-R6-UI · a blocked non-local failed attempt retains Retry and no Reconcile', () => renderedDetail(assignment({ latestStatus: 'failed' }), ({ body, buttons }) => {
  assert.match(body.textContent, /The exploration failed/);
  assert.ok(buttons().includes('Retry in a new context'));
  assert.equal(buttons().includes('Reconcile interrupted read-only attempt'), false);
  assert.doesNotMatch(body.textContent, /Findings from this attempt are available/);
}));
