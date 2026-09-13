import assert from "node:assert/strict";
import http from "node:http";
import { rm } from "node:fs/promises";
import { test } from "node:test";
import { boot, reopen } from "./helpers.mjs";

const SERVER_ID = "local:release-capability";
const REMOTE_TOOL = "record_effect";
const TERMINAL = new Set(["completed", "failed", "cancelled", "unknown"]);

async function mcpFixture() {
  const requests = [];
  const effects = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }

    let raw = "";
    for await (const chunk of req) raw += chunk;
    const request = JSON.parse(raw);
    requests.push(request);
    if (request.id === undefined) {
      res.writeHead(202).end();
      return;
    }

    let result;
    if (request.method === "server/discover") {
      result = {
        supportedVersions: ["2026-07-28"],
        capabilities: { tools: {} },
      };
    } else if (request.method === "tools/list") {
      result = {
        tools: [{
          name: REMOTE_TOOL,
          description: "Record one synthetic remote effect",
          inputSchema: {
            type: "object",
            properties: { value: { type: "string" } },
            required: ["value"],
          },
        }],
        ttlMs: 0,
        cacheScope: "private",
      };
    } else if (request.method === "tools/call") {
      // Receipt of tools/call is the dispatch observation. The separate ledger
      // is mutated before the response and represents the fixture's effect.
      effects.push({ value: request.params.arguments.value });
      result = {
        content: [{ type: "text", text: `recorded:${request.params.arguments.value}` }],
      };
    } else {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: "unsupported" },
      }));
      return;
    }

    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: { resultType: "complete", ...result },
    }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    effects,
    requests,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    }),
  };
}

function toolNames(body) {
  return (body.tools ?? []).map((tool) => tool.function?.name ?? tool.name);
}

function wireForValue(wire, value) {
  const requests = wire.filter((request) => request.mode.includes(JSON.stringify({ value })));
  assert.ok(requests.length > 0, `Pi wire was not observed for ${value}`);
  return requests;
}

function requestCounts(fixture) {
  return {
    all: fixture.requests.length,
    directory: fixture.requests.filter((request) => request.method === "tools/list").length,
    dispatch: fixture.requests.filter((request) => request.method === "tools/call").length,
    effect: fixture.effects.length,
  };
}

async function runtimeControl(host, sessionId) {
  return (await host.api("GET", `/runtime-control?sessionId=${sessionId}`)).json;
}

async function changeControl(host, sessionId, body) {
  const current = await runtimeControl(host, sessionId);
  return host.api("PUT", `/runtime-control?sessionId=${sessionId}`, {
    revision: current.revision,
    ...body,
  });
}

async function lifecycle(host, sessionId, action) {
  const current = await runtimeControl(host, sessionId);
  return host.api(
    "POST",
    `/mcp/${encodeURIComponent(SERVER_ID)}/lifecycle?sessionId=${sessionId}`,
    { revision: current.revision, action },
  );
}

async function eventsFor(host, sessionId) {
  return (await host.api("GET", `/sessions/${sessionId}/events`)).json.events;
}

async function approvePending(host, sessionId, runId) {
  const question = (await eventsFor(host, sessionId)).find(
    (event) => event.runId === runId && event.type === "permission.open",
  );
  assert.ok(question, "the MCP call must wait for an exact permission");
  const answered = await host.api(
    "POST",
    `/runs/${runId}/questions/${question.data.id}`,
    {
      decision: "allow",
      expectedToolCallId: question.data.toolCallId,
      expectedContentSha256: question.data.contentSha256,
    },
  );
  assert.equal(answered.status, 200, JSON.stringify(answered.json));
}

async function pollReopened(host, runId) {
  const deadline = Date.now() + 5_000;
  for (;;) {
    const run = (await host.api("GET", `/runs/${runId}`)).json.run;
    if (TERMINAL.has(run.status)) return run;
    assert(Date.now() < deadline, `reopened Run timed out at ${run.status}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

test("release capability lifecycle: advertise, effect, suspend, restore, and restart stay bound", async () => {
  const fixture = await mcpFixture();
  const wire = [];
  const fakeResponder = ({ body, mode }) => {
    wire.push({ mode, tools: toolNames(body) });
    return null;
  };
  let initial = null;
  let current = null;

  try {
    initial = await boot({ fakeResponder });
    current = initial;
    const session = await initial.createSession();
    const scope = { type: "session", id: session.id };
    const configured = await changeControl(initial, session.id, {
      operation: "put",
      resource: {
        id: SERVER_ID,
        kind: "mcp_server",
        title: "Release capability fixture",
        scope,
        content: JSON.stringify({
          transport: "streamable-http",
          protocol: "2026-07-28",
          url: fixture.url,
        }),
      },
    });
    assert.equal(configured.status, 200, JSON.stringify(configured.json));
    assert.equal((await lifecycle(initial, session.id, "connect")).status, 200);
    assert.equal((await changeControl(initial, session.id, {
      operation: "exposure",
      id: SERVER_ID,
      scope,
      exposed: true,
    })).status, 200);

    const enabled = await runtimeControl(initial, session.id);
    const descriptor = enabled.resources.find((resource) => resource.mcp?.serverId === SERVER_ID);
    assert.ok(descriptor?.executionName, "connected fixture must publish one host tool name");
    const executionName = descriptor.executionName;

    const first = await initial.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "capability-enabled",
      input: initial.scriptInput([{ name: executionName, arguments: { value: "first" } }]),
    });
    assert.equal(first.status, 200, JSON.stringify(first.json));
    await initial.pollRun(first.json.run.id, { until: (status) => status === "waiting_user" });

    const activeChange = await changeControl(initial, session.id, {
      operation: "exposure",
      id: SERVER_ID,
      scope,
      exposed: false,
    });
    assert.equal(activeChange.status, 409);
    assert.equal(activeChange.json.error.code, "active_run");

    await approvePending(initial, session.id, first.json.run.id);
    assert.equal((await initial.pollRun(first.json.run.id)).status, "completed");
    const firstEvents = await eventsFor(initial, session.id);
    const firstBinding = structuredClone(firstEvents.find(
      (event) => event.runId === first.json.run.id && event.type === "runtime.bound",
    ).data);
    assert.ok(wireForValue(wire, "first").every(
      (request) => request.tools.includes(executionName),
    ));
    assert.deepEqual(
      (({ directory, dispatch, effect }) => ({ directory, dispatch, effect }))(requestCounts(fixture)),
      { directory: 1, dispatch: 1, effect: 1 },
    );
    assert.equal(firstEvents.filter((event) => event.runId === first.json.run.id && event.type === "runtime.mcp.dispatch").length, 1);
    assert.equal(firstEvents.filter((event) => event.runId === first.json.run.id && event.type === "runtime.mcp.result").length, 1);

    // Suspend exposure while the connection remains healthy. The scripted
    // provider can still request the old name, but Pi did not advertise it and
    // the Host never opens permission or reaches the remote server.
    assert.equal((await changeControl(initial, session.id, {
      operation: "exposure",
      id: SERVER_ID,
      scope,
      exposed: false,
    })).status, 200);
    const suspended = await initial.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "capability-suspended",
      input: initial.scriptInput([{ name: executionName, arguments: { value: "must-not-run" } }]),
    });
    assert.equal(suspended.status, 200, JSON.stringify(suspended.json));
    assert.equal((await initial.pollRun(suspended.json.run.id)).status, "completed");
    const suspendedEvents = (await eventsFor(initial, session.id)).filter(
      (event) => event.runId === suspended.json.run.id,
    );
    const suspendedBinding = suspendedEvents.find((event) => event.type === "runtime.bound").data;
    assert.notEqual(suspendedBinding.revision, firstBinding.revision);
    assert.notEqual(suspendedBinding.hash, firstBinding.hash);
    assert.equal(
      suspendedBinding.resources.find((resource) => resource.executionName === executionName).exposed,
      false,
    );
    assert.ok(wireForValue(wire, "must-not-run").every(
      (request) => !request.tools.includes(executionName),
    ));
    const absent = suspendedEvents.find(
      (event) => event.type === "tool.result" && event.data.name === executionName,
    );
    assert.equal(absent?.data.isError, true);
    assert.match(absent.data.text, /not found/i);
    assert.ok(!suspendedEvents.some((event) => event.type === "permission.open"));
    assert.deepEqual(
      (({ directory, dispatch, effect }) => ({ directory, dispatch, effect }))(requestCounts(fixture)),
      { directory: 1, dispatch: 1, effect: 1 },
    );

    // This direct manager call is a manager seam check, not another service
    // admission proof: its purpose is to show that an executor captured from
    // the old binding refuses before network dispatch once disconnected.
    const [oldBindingTool] = initial.runtime.service.mcp.toolsFor(firstBinding, async () => {
      assert.fail("a disconnected old binding must fail before an unknown effect");
    });
    assert.ok(oldBindingTool);
    assert.equal((await lifecycle(initial, session.id, "disconnect")).status, 200);
    const beforeOldCall = requestCounts(fixture);
    await assert.rejects(
      oldBindingTool.execute("late-old-binding", { value: "late" }),
      /no longer connected/,
    );
    assert.deepEqual(requestCounts(fixture), beforeOldCall);

    assert.equal((await lifecycle(initial, session.id, "connect")).status, 200);
    assert.equal((await changeControl(initial, session.id, {
      operation: "exposure",
      id: SERVER_ID,
      scope,
      exposed: true,
    })).status, 200);
    const restored = await runtimeControl(initial, session.id);
    const restoredTool = restored.resources.find((resource) => resource.mcp?.serverId === SERVER_ID);
    assert.equal(restoredTool.executionName, executionName);

    const third = await initial.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "capability-restored",
      input: initial.scriptInput([{ name: executionName, arguments: { value: "second" } }]),
    });
    assert.equal(third.status, 200, JSON.stringify(third.json));
    await initial.pollRun(third.json.run.id, { until: (status) => status === "waiting_user" });
    await approvePending(initial, session.id, third.json.run.id);
    assert.equal((await initial.pollRun(third.json.run.id)).status, "completed");
    const afterRestoreEvents = await eventsFor(initial, session.id);
    const thirdBinding = afterRestoreEvents.find(
      (event) => event.runId === third.json.run.id && event.type === "runtime.bound",
    ).data;
    assert.ok(thirdBinding.revision > firstBinding.revision);
    assert.notEqual(thirdBinding.hash, firstBinding.hash);
    assert.ok(wireForValue(wire, "second").every(
      (request) => request.tools.includes(executionName),
    ));
    assert.deepEqual(fixture.effects, [{ value: "first" }, { value: "second" }]);
    assert.equal(requestCounts(fixture).dispatch, 2);
    assert.deepEqual(
      afterRestoreEvents.find((event) => event.runId === first.json.run.id && event.type === "runtime.bound").data,
      firstBinding,
      "later lifecycle changes must not rewrite the first Run binding",
    );

    const beforeRestart = requestCounts(fixture);
    await current.runtime.close();
    current = null;
    current = await reopen(initial.dataDir, { fakeResponder });
    const fourth = await current.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "capability-after-restart",
      input: initial.scriptInput([{ name: executionName, arguments: { value: "must-not-replay" } }]),
    });
    assert.equal(fourth.status, 200, JSON.stringify(fourth.json));
    assert.equal((await pollReopened(current, fourth.json.run.id)).status, "completed");
    assert.ok(wireForValue(wire, "must-not-replay").every(
      (request) => !request.tools.includes(executionName),
    ));
    assert.deepEqual(requestCounts(fixture), beforeRestart, "restart must not rediscover or replay the remote tool");
  } finally {
    await current?.runtime.close();
    await fixture.close();
    if (initial) await rm(initial.dataDir, { recursive: true, force: true });
  }
});
