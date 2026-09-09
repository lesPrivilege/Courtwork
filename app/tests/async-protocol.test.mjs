import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { MCPManager } from "../runtime/mcp-manager.mjs";
import syncResult from "./fixtures/async-protocol/sync-call-result.json" with { type: "json" };
import modernTaskAccepted from "./fixtures/async-protocol/modern-task-accepted.json" with { type: "json" };
import legacyTaskCreated from "./fixtures/async-protocol/legacy-task-created.json" with { type: "json" };
import cancelReceipt from "./fixtures/async-protocol/cancel-receipt.json" with { type: "json" };
import unknownAsyncFields from "./fixtures/async-protocol/unknown-async-fields.json" with { type: "json" };
import partialArguments from "./fixtures/async-protocol/partial-arguments.json" with { type: "json" };

const TASK_CAPABILITIES = { tasks: { cancel: {}, requests: { tools: { call: {} } } } };

async function loopback() {
  const requests = [];
  const responses = new Map([
    ["sync", syncResult],
    ["modern-task", modernTaskAccepted],
    ["legacy-task", legacyTaskCreated],
    ["cancel-receipt", cancelReceipt],
    ["unknown-async", unknownAsyncFields],
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
      result = { supportedVersions: ["2026-07-28"], capabilities: { tools: {}, ...TASK_CAPABILITIES } };
    } else if (body.method === "tools/list") {
      result = {
        tools: [...responses.keys()].map((name) => ({
          name,
          description: `${name} fixture`,
          inputSchema: { type: "object", properties: { document: { type: "string" } }, required: ["document"] },
          execution: { taskSupport: name === "sync" ? "forbidden" : "optional" },
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
    resources: ["sync", "modern-task", "legacy-task", "cancel-receipt", "unknown-async", "partial"].map((name) => ({
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

    const cancel = await h.tools.get("cancel-receipt").execute("call-cancel", { document: "A" }, new AbortController().signal);
    assert.deepEqual(cancel.content, [{ type: "text", text: "cancel receipt" }]);
    assert.deepEqual(cancel.details, { serverId: "async-protocol-loopback", tool: "cancel-receipt" });
    assert.equal("task" in cancel, false, "the manager drops a task cancellation receipt from its Pi tool result");

    const unknown = await h.tools.get("unknown-async").execute("call-unknown", { document: "A" }, new AbortController().signal);
    assert.deepEqual(unknown.content, [{ type: "text", text: "ordinary result with async fields" }]);
    assert.equal("async" in unknown, false, "unknown async fields are silently discarded by the current manager mapping");
    assert.equal("deliveryState" in unknown, false);
  } finally { await h.close(); }
});
