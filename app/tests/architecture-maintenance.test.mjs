import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startServer } from "../server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";
import baseline from "./fixtures/architecture-maintenance/request-baseline.json" with { type: "json" };

const INPUT = "AM-C request baseline fixture";

/**
 * The provider capture belongs to the fake provider's real loopback HTTP
 * server. These helpers only remove values that are expected to differ
 * between independent temporary workspaces; they do not reconstruct a
 * request from host-side prompt or tool objects.
 */
function canonicalRequest(body) {
  const result = structuredClone(body);
  result.messages = result.messages.map((message) => {
    if (message.role !== "system" || typeof message.content !== "string") return message;
    return {
      ...message,
      content: message.content.replace(/Current working directory: .*$/m, "Current working directory: <temporary-workspace>"),
    };
  });
  return result;
}

function requestShape(body) {
  return Object.keys(body).sort();
}

function toolsByName(body) {
  return new Map((body.tools ?? []).map((tool) => [tool.function?.name ?? tool.name, tool]));
}

function toolDefinitions(body) {
  return (body.tools ?? []).map((tool) => tool.function ?? tool);
}

async function harness({ extensionCatalog = {} } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "am-c-request-"));
  const runtime = await startServer({ dataDir, port: 0, extensionCatalog });
  const headers = { "content-type": "application/json", "x-work-token": runtime.token };
  async function api(method, route, value) {
    const response = await fetch(runtime.url + "/api/v5" + route, {
      method,
      headers,
      body: value === undefined ? undefined : JSON.stringify(value),
    });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null };
  }
  const project = await api("POST", "/projects", { name: "AM-C request fixture" });
  const projectId = project.json.project.id;
  async function createSession(options = {}) {
    const response = await api("POST", "/sessions", { projectId, title: "AM-C request fixture", ...options });
    assert.equal(response.status, 200);
    return response.json.session;
  }
  async function run(session, commandId) {
    const started = await api("POST", `/sessions/${session.id}/runs`, { input: INPUT, commandId });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const deadline = Date.now() + 5_000;
    for (;;) {
      const current = (await api("GET", `/runs/${started.json.run.id}`)).json.run;
      if (["completed", "failed", "cancelled", "unknown"].includes(current.status)) {
        assert.equal(current.status, "completed", JSON.stringify(current.error));
        return current;
      }
      if (Date.now() > deadline) throw new Error("AM-C request fixture run timed out");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
  return {
    runtime,
    api,
    createSession,
    run,
    requests: runtime.fakeProvider.requests,
    async close() {
      await runtime.close();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

const variants = {
  baseline: {
    description: "Synthetic maintenance probe.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["value"],
      properties: { value: { type: "string", minLength: 1 } },
    },
  },
  description: {
    description: "Synthetic maintenance probe with a changed description.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["value"],
      properties: { value: { type: "string", minLength: 1 } },
    },
  },
  schema: {
    description: "Synthetic maintenance probe.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["value", "mode"],
      properties: { value: { type: "string", minLength: 1 }, mode: { type: "string", enum: ["fast", "safe"] } },
    },
  },
};

function maintenanceExtension(variantState) {
  const manifest = {
    schemaVersion: 1,
    id: "am-contract",
    version: "0.1.0",
    title: "AM-C Contract Fixture",
    kind: "development-extension",
    releaseStatus: "development",
    owner: "architecture-maintenance-tests",
    applicability: "Request contract fixture only.",
    exclusions: ["No product state or external effects."],
    declaredTools: ["se_maintenance_probe"],
    surface: null,
    bindingFields: [],
    stateCompatibility: "am-c-request-v1",
    rollback: "Test fixture only.",
    deprecation: null,
    evalObligations: ["Must remain local and deterministic."],
  };
  return async () => ({
    manifest,
    async start() {},
    async createBinding(input) {
      assert.deepEqual(input, {});
      return { fixture: true };
    },
    async begin() {
      const selected = variants[variantState.current];
      return {
        context: "AM-C synthetic extension context.",
        tools: [{
          name: "se_maintenance_probe",
          description: selected.description,
          parameters: selected.parameters,
          async execute() { return { content: [{ type: "text", text: "fixture" }] }; },
        }],
        close: async () => {},
        finish: async () => {},
      };
    },
    async projection() { return { fixture: true }; },
    async dispose() {},
  });
}

test("AM-C final wire golden and no-op are stable after temporary path canonicalization", async () => {
  const h = await harness();
  try {
    const first = await h.run(await h.createSession(), "am-c-golden-one");
    const firstBody = canonicalRequest(h.requests.at(-1).body);
    assert.deepEqual(firstBody, baseline, "captured final request must match the checked-in golden");

    const second = await h.run(await h.createSession(), "am-c-golden-two");
    const secondBody = canonicalRequest(h.requests.at(-1).body);
    assert.equal(first.id === second.id, false, "independent no-op runs have distinct Run identities");
    assert.deepEqual(secondBody, firstBody, "an effective no-op must not perturb the canonical request");
  } finally {
    await h.close();
  }
});

test("AM-C separates request shape, old prefix, and semantic tool diffs", async () => {
  const h = await harness();
  try {
    const session = await h.createSession();
    await h.run(session, "am-c-prefix-one");
    const first = canonicalRequest(h.requests.at(-1).body);
    await h.run(session, "am-c-prefix-two");
    const second = canonicalRequest(h.requests.at(-1).body);

    assert.deepEqual(requestShape(second), requestShape(first), "request shape is asserted independently");
    assert.deepEqual(second.messages.slice(0, first.messages.length), first.messages, "old encoded history remains an exact prefix");
    assert.deepEqual(second.tools, first.tools, "unchanged tool definitions remain stable");
    assert.deepEqual(second.messages.slice(first.messages.length), [
      { role: "assistant", content: "SIMULATED fake response: " + INPUT },
      { role: "user", content: [{ type: "text", text: INPUT }] },
    ], "only the prior assistant result and new user turn are outside the old prefix");
  } finally {
    await h.close();
  }
});

test("AM-C records description, schema, and permission changes as expected diffs", async () => {
  const variantState = { current: "baseline" };
  const h = await harness({ extensionCatalog: { "am-contract": maintenanceExtension(variantState) } });
  try {
    assert.equal((await h.api("POST", "/extensions/am-contract/lifecycle", { action: "load" })).status, 200);
    const capture = async (name, options = {}) => {
      const session = await h.createSession(options);
      assert.equal((await h.api("POST", `/sessions/${session.id}/extension`, { extensionId: "am-contract", input: {} })).status, 200);
      await h.run(session, `am-c-${name}`);
      return canonicalRequest(h.requests.at(-1).body);
    };

    const base = await capture("tool-base");
    variantState.current = "description";
    const described = await capture("tool-description");
    variantState.current = "schema";
    const schema = await capture("tool-schema");
    const baseTool = toolsByName(base).get("se_maintenance_probe").function;
    const describedTool = toolsByName(described).get("se_maintenance_probe").function;
    const schemaTool = toolsByName(schema).get("se_maintenance_probe").function;
    assert.notDeepEqual(describedTool.description, baseTool.description, "description change is visible in the final wire body");
    assert.deepEqual(describedTool.parameters, baseTool.parameters, "description-only change does not alter the schema");
    assert.notDeepEqual(schemaTool.parameters, baseTool.parameters, "schema change is visible in the final wire body");
    assert.equal(schemaTool.description, baseTool.description, "schema-only change does not alter the description");

    const draft = await capture("permission-draft");
    const readOnly = await capture("permission-read-only", { permissionMode: "read_only" });
    const draftTools = toolsByName(draft);
    const readOnlyTools = toolsByName(readOnly);
    assert.ok(draftTools.has("ws_write"), "draft exposes the write tool");
    assert.equal(readOnlyTools.has("ws_write"), false, "read_only removes the write tool from the final request");
    assert.deepEqual([...readOnlyTools.keys()], [...draftTools.keys()].filter((name) => name !== "ws_write"), "permission change has the expected tool-set diff");

    // Shape is an independent contract: a semantic tool diff may change one
    // nested definition while preserving the transport envelope.
    assert.deepEqual(requestShape(readOnly), requestShape(draft), "permission change preserves the request envelope shape");
    assert.deepEqual(toolDefinitions(readOnly).map((tool) => tool.name), [...readOnlyTools.keys()]);
  } finally {
    await h.close();
  }
});
