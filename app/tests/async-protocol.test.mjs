import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { createProvider } from "@earendil-works/pi-ai";
import * as openaiCompletions from "@earendil-works/pi-ai/api/openai-completions";
import { MCPManager } from "../runtime/mcp-manager.mjs";
import { createIsolatedModelRuntime, createSessionRun } from "../runtime/pi-session-runtime.mjs";
import syncResult from "./fixtures/async-protocol/sync-call-result.json" with { type: "json" };
import modernTaskAccepted from "./fixtures/async-protocol/modern-task-accepted.json" with { type: "json" };
import legacyTaskCreated from "./fixtures/async-protocol/legacy-task-created.json" with { type: "json" };
import cancelReceipt from "./fixtures/async-protocol/cancel-receipt.json" with { type: "json" };
import malformedAsyncFields from "./fixtures/async-protocol/malformed-async-fields.json" with { type: "json" };
import partialArguments from "./fixtures/async-protocol/partial-arguments.json" with { type: "json" };

const TASK_EXTENSION = { extensions: { "io.modelcontextprotocol/tasks": {} } };

async function loopback() {
  const requests = [];
  const responses = new Map([
    ["sync", syncResult],
    ["modern-task", modernTaskAccepted],
    ["legacy-task", legacyTaskCreated],
    ["cancel-receipt", cancelReceipt],
    ["malformed-async", malformedAsyncFields],
    ["partial", legacyTaskCreated],
  ]);
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    requests.push(body);
    if (body.id === undefined) { response.writeHead(202); response.end(); return; }
    let result;
    if (body.method === "server/discover") {
      result = { supportedVersions: ["2026-07-28"], capabilities: { tools: {}, ...TASK_EXTENSION } };
    } else if (body.method === "tools/list") {
      result = {
        tools: [...responses.keys()].map((name) => ({
          name,
          description: `${name} fixture`,
          inputSchema: { type: "object", properties: { document: { type: "string" } }, required: ["document"] },
        })),
        ttlMs: 0,
        cacheScope: "private",
      };
    } else if (body.method === "tools/call") {
      result = responses.get(body.params.name);
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(result
      ? { jsonrpc: "2.0", id: body.id, result: { resultType: "complete", ...result } }
      : { jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "unsupported" } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    requests,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }),
  };
}

async function connected() {
  const fixture = await loopback();
  const manager = new MCPManager();
  const resource = {
    id: "async-protocol-loopback",
    content: JSON.stringify({ transport: "streamable-http", protocol: "2026-07-28", url: fixture.url }),
  };
  await manager.connect(resource);
  const binding = {
    resources: ["sync", "modern-task", "legacy-task", "cancel-receipt", "malformed-async", "partial"].map((name) => ({
      kind: "tool", exposed: true, executionName: name, title: name, description: `${name} fixture`,
      inputSchema: { type: "object", properties: { document: { type: "string" } }, required: ["document"] },
      mcp: { serverId: resource.id, configHash: manager.connections.get(resource.id).hash, name },
    })),
  };
  return {
    fixture, manager, tools: new Map(manager.toolsFor(binding, async () => {} ).map((tool) => [tool.name, tool])),
    async close() { await manager.close(); await fixture.close(); },
  };
}

test("AM-B-T1 captures the final MCP payload and preserves the synchronous loop", async () => {
  const h = await connected();
  try {
    const result = await h.tools.get("sync").execute("call-sync", { document: "A" }, new AbortController().signal);
    assert.deepEqual(result, {
      content: [{ type: "text", text: "synchronous result" }],
      details: { serverId: "async-protocol-loopback", tool: "sync" },
    });
    const final = h.fixture.requests.at(-1);
    assert.equal(final.method, "tools/call");
    assert.deepEqual(final.params, {
      name: "sync",
      arguments: { document: "A" },
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": { name: "se-runtime", version: "0.1.0" },
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    });
  } finally { await h.close(); }
});

test("AM-B-T1 records task-shaped responses as unsupported and shows the current continuation gap", async () => {
  const h = await connected();
  try {
    for (const name of ["modern-task", "legacy-task"]) {
      await assert.rejects(
        h.tools.get(name).execute(`call-${name}`, { document: "A" }, new AbortController().signal),
        /MCP result is unknown/i,
      );
    }
    assert.equal(typeof h.manager.connections.get("async-protocol-loopback").client.getTask, "undefined");
    assert.equal(typeof h.manager.connections.get("async-protocol-loopback").client.cancelTask, "undefined");
    assert.equal(h.fixture.requests.filter((request) => request.method === "tasks/get" || request.method === "tasks/cancel").length, 0);
  } finally { await h.close(); }
});

test("AM-B-T1 does not treat partial args as a completed tool result, and exposes current wire gaps", async () => {
  const h = await connected();
  try {
    await assert.rejects(
      h.tools.get("partial").execute("call-partial", partialArguments.arguments, new AbortController().signal),
      /MCP result is unknown/i,
    );
    const partial = h.fixture.requests.at(-1);
    assert.deepEqual(partial.params.arguments, {}, "the installed client does not validate a tool input schema before writing the request");

    assert.deepEqual(cancelReceipt, { resultType: "complete" }, "the modern Tasks cancel acknowledgement is retained as a packet fixture only");
    assert.equal(h.fixture.requests.some((request) => request.method === "tasks/cancel"), false, "the current host never sends the modern cancellation request");

    const unknown = await h.tools.get("malformed-async").execute("call-unknown", { document: "A" }, new AbortController().signal);
    assert.deepEqual(unknown.content, [{ type: "text", text: "ordinary result with malformed async fields" }]);
    assert.equal("async" in unknown, false, "unknown async fields are silently discarded by the current manager mapping");
    assert.equal("deliveryState" in unknown, false);
  } finally { await h.close(); }
});

async function piProviderLoopback() {
  const requests = [];
  let requestNumber = 0;
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    requests.push(body);
    requestNumber += 1;
    const id = `pi-loopback-${requestNumber}`;
    const send = (value) => response.write(`data: ${JSON.stringify(value)}\n\n`);
    const chunk = (delta, finish_reason = null) => ({
      id, object: "chat.completion.chunk", created: 1, model: "pi-async-probe",
      choices: [{ index: 0, delta, finish_reason }],
    });
    response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    if (requestNumber === 1) {
      send(chunk({ role: "assistant", tool_calls: [{ index: 0, id: "pi-call-1", type: "function", function: { name: "async_probe" } }] }));
      send(chunk({ tool_calls: [{ index: 0, function: { arguments: "{\"document\":" } }] }));
      send(chunk({ tool_calls: [{ index: 0, function: { arguments: "\"A\"}" } }] }, "tool_calls"));
    } else {
      send(chunk({ role: "assistant", content: "provider loop completed" }, "stop"));
    }
    response.end("data: [DONE]\n\n");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    requests,
    baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }),
  };
}

test("AM-B-T1 observes Pi 0.85.1 final HTTP encoding and waits for complete streamed tool arguments", async () => {
  const wire = await piProviderLoopback();
  const workDir = await mkdtemp(path.join(tmpdir(), "pi-async-protocol-"));
  const modelRuntime = await createIsolatedModelRuntime();
  const model = {
    id: "pi-async-probe", name: "Pi async probe", provider: "pi-async-probe", api: "openai-completions",
    baseUrl: wire.baseUrl, reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 4096, maxTokens: 128,
  };
  const provider = createProvider({
    id: model.provider, name: "Pi async loopback", baseUrl: wire.baseUrl, models: [model],
    auth: { apiKey: { name: "loopback", resolve: async () => ({ auth: { apiKey: "loopback" } }) } },
    api: { stream: openaiCompletions.stream, streamSimple: openaiCompletions.streamSimple },
  });
  modelRuntime.registerNativeProvider(provider);
  const events = [];
  const executed = [];
  try {
    const sessionManager = SessionManager.create(workDir, path.join(workDir, "sessions"));
    const run = await createSessionRun({
      cwd: workDir,
      agentDir: path.join(workDir, "agent"),
      modelRuntime,
      model,
      sessionManager,
      systemPrompt: "Pi async protocol loopback.",
      input: "call the probe",
      compaction: { enabled: false },
      customTools: [{
        name: "async_probe",
        description: "Declared async marker probe.",
        parameters: { type: "object", required: ["document"], properties: { document: { type: "string" } } },
        async: true,
        async execute(callId, arguments_) {
          executed.push({ callId, arguments_ });
          return { content: [{ type: "text", text: "tool complete" }] };
        },
      }],
      onEvent: (event) => events.push(event.type),
    });
    const outcome = await run.run();
    assert.equal(outcome.status, "completed");
    assert.deepEqual(executed, [{ callId: "pi-call-1", arguments_: { document: "A" } }]);
    assert.equal(events.indexOf("tool_execution_start") > events.indexOf("message_update"), true);
    assert.equal(wire.requests.length, 2, "Pi made the second provider request only after the fully parsed tool call completed");
    const encoded = wire.requests[0].tools.find((tool) => tool.function.name === "async_probe").function;
    assert.equal(encoded.async, undefined, "Pi's OpenAI-completions encoder omits the declared async marker from the final HTTP tool schema");
    assert.deepEqual(encoded.parameters.required, ["document"]);
  } finally {
    await wire.close();
    await rm(workDir, { recursive: true, force: true });
  }
});
