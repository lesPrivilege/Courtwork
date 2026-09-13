import assert from 'node:assert/strict';
import http from 'node:http';
import { rm } from 'node:fs/promises';
import { test } from 'node:test';
import { boot, reopen } from './helpers.mjs';

const SERVER_ID = 'local:release-mcp-failures';
const REMOTE_TOOL = 'record_effect';

async function effectFixture() {
  const requests = [];
  const effects = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const request = JSON.parse(raw);
    requests.push(request);
    if (request.id === undefined) { res.writeHead(202).end(); return; }
    let result;
    if (request.method === 'server/discover') {
      result = { supportedVersions: ['2026-07-28'], capabilities: { tools: {} } };
    } else if (request.method === 'tools/list') {
      result = {
        tools: [{
          name: REMOTE_TOOL,
          inputSchema: {
            type: 'object',
            properties: { value: { type: 'string' } },
            required: ['value'],
          },
        }],
        ttlMs: 0,
        cacheScope: 'private',
      };
    } else if (request.method === 'tools/call') {
      effects.push(request.params.arguments.value);
      result = { content: [{ type: 'text', text: `recorded:${request.params.arguments.value}` }] };
    } else {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'unsupported' } }));
      return;
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { resultType: 'complete', ...result } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    effects,
    requests,
    resource: {
      id: SERVER_ID,
      kind: 'mcp_server',
      title: 'Release MCP failure fixture',
      content: JSON.stringify({
        transport: 'streamable-http',
        protocol: '2026-07-28',
        url: `http://127.0.0.1:${server.address().port}`,
      }),
    },
    close: () => new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    }),
  };
}

async function runtimeControl(host, sessionId) {
  return (await host.api('GET', `/runtime-control?sessionId=${sessionId}`)).json;
}

async function configure(host, session, fixture) {
  const scope = { type: 'session', id: session.id };
  let control = await runtimeControl(host, session.id);
  let response = await host.api('PUT', `/runtime-control?sessionId=${session.id}`, {
    revision: control.revision,
    operation: 'put',
    resource: { ...fixture.resource, scope },
  });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  control = await runtimeControl(host, session.id);
  response = await host.api('POST', `/mcp/${encodeURIComponent(SERVER_ID)}/lifecycle?sessionId=${session.id}`, {
    revision: control.revision,
    action: 'connect',
  });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  control = await runtimeControl(host, session.id);
  response = await host.api('PUT', `/runtime-control?sessionId=${session.id}`, {
    revision: control.revision,
    operation: 'exposure',
    id: SERVER_ID,
    scope,
    exposed: true,
  });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  const tool = (await runtimeControl(host, session.id)).resources.find(resource => resource.mcp?.serverId === SERVER_ID);
  assert.ok(tool?.executionName);
  return tool;
}

async function eventsFor(host, sessionId) {
  return (await host.api('GET', `/sessions/${sessionId}/events`)).json.events;
}

function remoteCounts(fixture) {
  return {
    calls: fixture.requests.filter(request => request.method === 'tools/call').length,
    effects: fixture.effects.length,
  };
}

async function pendingPermission(host, sessionId, runId) {
  const run = await host.pollRun(runId, {
    until: status => status === 'waiting_user' || ['completed', 'failed', 'cancelled', 'unknown'].includes(status),
  });
  assert.equal(run.status, 'waiting_user');
  const permission = (await eventsFor(host, sessionId)).find(event =>
    event.runId === runId && event.type === 'permission.open');
  assert.ok(permission, 'MCP dispatch must wait for an explicit permission');
  return permission;
}

async function answerPermission(host, runId, permission, decision) {
  return host.api('POST', `/runs/${runId}/questions/${permission.data.id}`, {
    decision,
    expectedToolCallId: permission.data.toolCallId,
    expectedContentSha256: permission.data.contentSha256,
  });
}

test('DF06 MCP permission denial records no dispatch intent and reaches no remote effect', async () => {
  const fixture = await effectFixture();
  const host = await boot();
  try {
    const session = await host.createSession();
    const tool = await configure(host, session, fixture);
    const made = await host.api('POST', `/sessions/${session.id}/runs`, {
      commandId: 'df06-mcp-deny',
      input: host.scriptInput([{ name: tool.executionName, arguments: { value: 'denied' } }]),
    });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const permission = await pendingPermission(host, session.id, made.json.run.id);
    assert.deepEqual(remoteCounts(fixture), { calls: 0, effects: 0 });
    assert.equal((await answerPermission(host, made.json.run.id, permission, 'deny')).status, 200);
    assert.equal((await host.pollRun(made.json.run.id)).status, 'completed');

    const events = (await eventsFor(host, session.id)).filter(event => event.runId === made.json.run.id);
    assert.equal(events.find(event => event.type === 'permission.resolved')?.data.decision, 'deny');
    assert.equal(events.find(event => event.type === 'tool.result' && event.data.name === tool.executionName)?.data.isError, true);
    assert.equal(events.filter(event => event.type === 'runtime.mcp.dispatch').length, 0);
    assert.equal(events.filter(event => event.type === 'runtime.mcp.result').length, 0);
    assert.deepEqual(remoteCounts(fixture), { calls: 0, effects: 0 });
  } finally {
    await host.runtime.close();
    await fixture.close();
    await rm(host.dataDir, { recursive: true, force: true });
  }
});

test('DF06 cancelling a pending MCP approval ends cancelled without dispatch or effect', async () => {
  const fixture = await effectFixture();
  const host = await boot();
  try {
    const session = await host.createSession();
    const tool = await configure(host, session, fixture);
    const made = await host.api('POST', `/sessions/${session.id}/runs`, {
      commandId: 'df06-mcp-cancel-before-dispatch',
      input: host.scriptInput([{ name: tool.executionName, arguments: { value: 'cancelled' } }]),
    });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const permission = await pendingPermission(host, session.id, made.json.run.id);
    const cancelled = await host.api('POST', `/runs/${made.json.run.id}/cancel`, {});
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
    assert.equal((await host.pollRun(made.json.run.id)).status, 'cancelled');
    assert.equal((await answerPermission(host, made.json.run.id, permission, 'allow')).status, 409);

    const events = (await eventsFor(host, session.id)).filter(event => event.runId === made.json.run.id);
    assert.equal(events.find(event => event.type === 'permission.resolved')?.data.status, 'cancelled');
    assert.equal(events.filter(event => event.type === 'runtime.mcp.dispatch').length, 0);
    assert.equal(events.filter(event => event.type === 'runtime.mcp.result').length, 0);
    assert.deepEqual(remoteCounts(fixture), { calls: 0, effects: 0 });
  } finally {
    await host.runtime.close();
    await fixture.close();
    await rm(host.dataDir, { recursive: true, force: true });
  }
});

test('DF06 failed MCP result-receipt persistence fences one remote effect and never replays after reopen', async () => {
  const fixture = await effectFixture();
  const initial = await boot();
  let current = initial;
  try {
    const session = await initial.createSession();
    const tool = await configure(initial, session, fixture);
    const originalAppend = initial.runtime.store.appendEvent.bind(initial.runtime.store);
    let receiptFailureObserved = false;
    initial.runtime.store.appendEvent = async event => {
      if (!receiptFailureObserved && event.type === 'runtime.mcp.result') {
        receiptFailureObserved = true;
        throw new Error('synthetic MCP result receipt failure');
      }
      return originalAppend(event);
    };
    const input = initial.scriptInput([{ name: tool.executionName, arguments: { value: 'once' } }]);
    const made = await initial.api('POST', `/sessions/${session.id}/runs`, {
      commandId: 'df06-result-receipt-failure',
      input,
    });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const permission = await pendingPermission(initial, session.id, made.json.run.id);
    assert.equal((await answerPermission(initial, made.json.run.id, permission, 'allow')).status, 200);
    const done = await initial.pollRun(made.json.run.id);
    assert.equal(receiptFailureObserved, true);
    assert.equal(done.status, 'unknown');
    assert.equal(done.admissionOpen, false);
    assert.equal(done.error.code, 'mcp_effect_unknown');
    assert.deepEqual(remoteCounts(fixture), { calls: 1, effects: 1 });

    const events = (await eventsFor(initial, session.id)).filter(event => event.runId === done.id);
    assert.equal(events.filter(event => event.type === 'runtime.mcp.dispatch').length, 1);
    assert.equal(events.filter(event => event.type === 'runtime.mcp.result').length, 0);
    const unknown = events.find(event => event.type === 'run.status' && event.data.externalUnknown)?.data.externalUnknown;
    assert.equal(unknown?.failureKind, 'result-evidence-unavailable');
    assert.ok(events.some(event => event.type === 'run.notice' && event.data.code === 'mcp_effect_unknown'));

    await initial.runtime.close();
    current = await reopen(initial.dataDir);
    const reopened = current.runtime.store.getRun(done.id);
    assert.equal(reopened.status, 'unknown');
    assert.equal(reopened.admissionOpen, false);
    assert.equal(reopened.error.code, 'mcp_effect_unknown');
    const replay = await current.api('POST', `/sessions/${session.id}/runs`, {
      commandId: 'df06-result-receipt-failure',
      input,
    });
    assert.equal(replay.status, 200, JSON.stringify(replay.json));
    assert.equal(replay.json.run.id, done.id);
    const continuation = await current.api('POST', `/sessions/${session.id}/runs`, {
      commandId: 'df06-unsafe-continuation',
      input: 'repeat the remote effect',
      supersedes: done.id,
    });
    assert.equal(continuation.status, 409);
    assert.equal(continuation.json.error.code, 'effect_unreconciled');
    assert.deepEqual(remoteCounts(fixture), { calls: 1, effects: 1 });
  } finally {
    await current.runtime.close();
    await fixture.close();
    await rm(initial.dataDir, { recursive: true, force: true });
  }
});
