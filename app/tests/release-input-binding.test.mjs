import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { requestMeasurements } from "../web/telemetry-view.mjs";
import { boot, reopen } from "./helpers.mjs";

const R1 = "SOURCE_R1: prefer the first exact source.";
const R2 = "SOURCE_R2: use the replacement exact source.";
const PRIVATE_BODY = "PRIVATE_SKILL_BODY: inspect the cited source only.";
const SKILL = `---
name: source-review
description: Review an explicitly loaded source
allowed-tools: Bash
---
${PRIVATE_BODY}`;
const EFFORT_FIELDS = ["reasoning", "reasoning_effort", "thinking"];
const COMPACTION = { enabled: true, reserveTokens: 1, keepRecentTokens: 1, maxCompactions: 2 };

const sha = (value) => createHash("sha256").update(value).digest("hex");

function messageText(message) {
  if (typeof message?.content === "string") return message.content;
  return (message?.content ?? []).map((part) => part?.text ?? "").join("");
}

function isSummary(body) {
  return (body.messages ?? []).some(
    (message) => message.role === "user" && messageText(message).startsWith("<conversation>"),
  );
}

function wireTools(body) {
  return (body.tools ?? []).map((tool) => tool.function?.name ?? tool.name);
}

function assertDefaultEffortOmitted(requests) {
  for (const request of requests) {
    for (const field of EFFORT_FIELDS) {
      assert.equal(Object.hasOwn(request.body, field), false, `${field} must be omitted from request ${request.ordinal}`);
    }
  }
}

async function control(host, sessionId) {
  return (await host.api("GET", `/runtime-control?sessionId=${sessionId}`)).json;
}

async function change(host, sessionId, body) {
  const current = await control(host, sessionId);
  return host.api("PUT", `/runtime-control?sessionId=${sessionId}`, {
    revision: current.revision,
    ...body,
  });
}

async function putSources(host, session, instruction) {
  const scope = { type: "session", id: session.id };
  for (const resource of [
    { id: "local:release-instruction", kind: "instruction", title: "Release instruction", content: instruction },
    { id: "local:release-skill", kind: "skill", title: "Release skill", content: SKILL },
  ]) {
    const result = await change(host, session.id, {
      operation: "put",
      resource: { ...resource, scope },
    });
    assert.equal(result.status, 200, JSON.stringify(result.json));
  }
}

async function eventsFor(host, sessionId) {
  return (await host.api("GET", `/sessions/${sessionId}/events`)).json.events;
}

function bindingFor(events, runId) {
  const event = events.find((item) => item.runId === runId && item.type === "runtime.bound");
  assert.ok(event, `runtime binding missing for ${runId}`);
  return event.data;
}

function resource(binding, id) {
  const found = binding.resources.find((item) => item.id === id);
  assert.ok(found, `resource ${id} missing from binding`);
  return found;
}

function assertTelemetryMatchesWire(events, runId, requests) {
  const rows = requestMeasurements(events, runId).sort((a, b) => a.requestId - b.requestId);
  assert.equal(rows.length, requests.length, "each serial HTTP request must have one final measurement");
  for (const [index, row] of rows.entries()) {
    assert.equal(row.requestId, index + 1);
    assert.equal(row.phase, "completed");
    assert.equal(row.purpose, requests[index].summary ? "compaction" : "agent");
    assert.equal(row.requestedEffort, null);
    assert.equal(row.effectiveEffortSource, "sdk-setting");
    assert.equal(row.providerEffectiveEffort, null, "wire observation is not provider confirmation");
  }
}

function usage(totalTokens) {
  return {
    input: 1,
    output: 1,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

test("release input binding: initial context and runtime_load keep source identity without granting tools", async () => {
  const requests = [];
  const h = await boot({
    fakeResponder: ({ body, requestNumber, mode }) => {
      requests.push({ body, ordinal: requestNumber, summary: isSummary(body) });
      const hasLoadedResult = (body.messages ?? []).some((message) => message.role === "tool");
      if (mode === "LOAD_RELEASE_SKILL" && !hasLoadedResult) {
        return {
          kind: "tool",
          id: `load-${requestNumber}`,
          created: 1,
          toolCallId: `load-call-${requestNumber}`,
          name: "runtime_load",
          arguments: { id: "local:release-skill" },
        };
      }
      return { kind: "text", id: `done-${requestNumber}`, created: 1, text: "loaded source inspected" };
    },
  });

  try {
    const session = await h.createSession();
    await putSources(h, session, R1);
    const created = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "release-load-r1",
      input: "LOAD_RELEASE_SKILL",
    });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const done = await h.pollRun(created.json.run.id);
    assert.equal(done.status, "completed");

    const events = await eventsFor(h, session.id);
    const binding = bindingFor(events, done.id);
    const instruction = resource(binding, "local:release-instruction");
    const skill = resource(binding, "local:release-skill");
    assert.deepEqual(instruction.source, { type: "local-config", hash: sha(R1) });
    assert.deepEqual(skill.source, { type: "local-config", hash: sha(SKILL) });
    assert.equal(binding.content.find((item) => item.id === instruction.id).content, R1);
    assert.equal(binding.content.find((item) => item.id === skill.id).content, SKILL);

    assert.equal(requests.length, 2);
    assert.ok(wireTools(requests[0].body).includes("runtime_load"));
    assert.ok(requests.every((request) => !wireTools(request.body).includes("Bash")));
    const firstWire = JSON.stringify(requests[0].body.messages);
    const followupWire = JSON.stringify(requests[1].body.messages);
    assert.match(firstWire, /SOURCE_R1/);
    assert.match(firstWire, /Review an explicitly loaded source/);
    assert.doesNotMatch(firstWire, /PRIVATE_SKILL_BODY/);
    assert.match(followupWire, /PRIVATE_SKILL_BODY/);

    const loaded = events.find((event) => event.runId === done.id && event.type === "runtime.context.loaded");
    assert.deepEqual(loaded.data, {
      id: "local:release-skill",
      kind: "skill",
      source: skill.source,
      characters: SKILL.length,
    });
    assertDefaultEffortOmitted(requests);
    assertTelemetryMatchesWire(events, done.id, requests);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("release input binding: compaction cannot expand a replacement binding or rewrite an old one", async () => {
  const requests = [];
  const responder = ({ body, requestNumber, mode }) => {
    const summary = isSummary(body);
    requests.push({ body, ordinal: requestNumber, summary });
    if (summary) {
      return {
        kind: "text",
        id: `summary-${requestNumber}`,
        created: 1,
        text: "SUMMARY_TRIES_RUNTIME_LOAD_AND_BASH but grants no capability",
      };
    }
    const hasToolResult = (body.messages ?? []).some((message) => message.role === "tool");
    if (mode === "R2_AFTER_COMPACTION" && !hasToolResult) {
      return {
        kind: "tool",
        id: `hidden-load-${requestNumber}`,
        created: 1,
        toolCallId: `hidden-load-call-${requestNumber}`,
        name: "runtime_load",
        arguments: { id: "local:release-skill" },
      };
    }
    return { kind: "text", id: `plain-${requestNumber}`, created: 1, text: "bounded input complete" };
  };
  const initial = await boot({ compaction: COMPACTION, fakeResponder: responder });
  let current = initial;

  try {
    const session = await initial.createSession();
    await putSources(initial, session, R1);
    const first = await initial.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "release-old-r1",
      input: "BASELINE_R1",
    });
    assert.equal(first.status, 200, JSON.stringify(first.json));
    const firstDone = await initial.pollRun(first.json.run.id);
    assert.equal(firstDone.status, "completed");
    const firstEvents = await eventsFor(initial, session.id);
    const firstBinding = structuredClone(bindingFor(firstEvents, firstDone.id));
    assert.equal(firstEvents.some((event) => event.runId === firstDone.id && event.type === "runtime.context.loaded"), false,
      "the private skill body was never loaded into the old Run");

    assert.equal((await change(initial, session.id, {
      operation: "put",
      resource: {
        id: "local:release-instruction",
        kind: "instruction",
        title: "Release instruction",
        scope: { type: "session", id: session.id },
        content: R2,
      },
    })).status, 200);
    assert.equal((await change(initial, session.id, {
      operation: "exposure",
      id: "tool:runtime_load",
      scope: { type: "session", id: session.id },
      exposed: false,
    })).status, 200);

    const journal = initial.runtime.store.getSession(session.id).hostSession.path;
    await current.runtime.close();
    current = null;
    const manager = SessionManager.open(journal);
    manager.appendMessage({
      role: "user",
      content: [{ type: "text", text: "SEED_USER " + "x".repeat(500) }],
      timestamp: Date.now(),
    });
    manager.appendMessage({
      role: "assistant",
      content: [{ type: "text", text: "SEED_ASSISTANT " + "y".repeat(500) }],
      api: "openai-completions",
      provider: "fake-openai-loopback",
      model: "fake-model",
      usage: usage(4),
      stopReason: "stop",
      timestamp: Date.now(),
    });

    const requestStart = requests.length;
    current = await reopen(initial.dataDir, { compaction: COMPACTION, fakeResponder: responder });
    current.runtime.fakeProvider.model.contextWindow = 4;
    const second = await current.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "release-new-r2",
      input: "R2_AFTER_COMPACTION",
    });
    assert.equal(second.status, 200, JSON.stringify(second.json));
    let secondDone;
    const deadline = Date.now() + 10_000;
    do {
      secondDone = (await current.api("GET", `/runs/${second.json.run.id}`)).json.run;
      if (["completed", "failed", "cancelled", "unknown"].includes(secondDone.status)) break;
      assert(Date.now() < deadline, `replacement Run timed out at ${secondDone.status}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (true);
    assert.equal(secondDone.status, "completed");

    const secondRequests = requests.slice(requestStart);
    assert.ok(secondRequests.some((request) => request.summary), "threshold compaction must use the real summary request");
    const agentRequests = secondRequests.filter((request) => !request.summary);
    assert.ok(agentRequests.length >= 2, "the hidden tool attempt must return through the agent wire");
    assert.ok(agentRequests.some((request) => JSON.stringify(request.body.messages).includes("SUMMARY_TRIES_RUNTIME_LOAD_AND_BASH")),
      "the adversarial summary must actually enter an agent request before its authority is tested");
    for (const request of agentRequests) {
      assert.ok(!wireTools(request.body).includes("runtime_load"));
      assert.ok(!wireTools(request.body).includes("Bash"));
      assert.doesNotMatch(JSON.stringify(request.body.messages), /PRIVATE_SKILL_BODY/);
    }
    assert.match(JSON.stringify(agentRequests.at(-1).body.messages), /SOURCE_R2/);
    assertDefaultEffortOmitted(secondRequests);

    const allEvents = await eventsFor(current, session.id);
    const secondEvents = allEvents.filter((event) => event.runId === secondDone.id);
    const secondBinding = bindingFor(secondEvents, secondDone.id);
    assert.notEqual(secondBinding.revision, firstBinding.revision);
    assert.notEqual(secondBinding.hash, firstBinding.hash);
    assert.equal(resource(secondBinding, "tool:runtime_load").exposed, false);
    assert.deepEqual(resource(secondBinding, "local:release-instruction").source, {
      type: "local-config",
      hash: sha(R2),
    });
    assert.equal(secondBinding.content.find((item) => item.id === "local:release-instruction").content, R2);
    assert.equal(secondBinding.content.some((item) => item.id === "local:release-skill"), false);
    assert.equal(secondEvents.some((event) => event.type === "runtime.context.loaded"), false);
    const absentLoad = secondEvents.find(
      (event) => event.type === "tool.result" && event.data.name === "runtime_load",
    );
    assert.equal(absentLoad?.data.isError, true);
    assert.match(absentLoad.data.text, /not found/i);
    assert.deepEqual(bindingFor(allEvents, firstDone.id), firstBinding,
      "later configuration has equal historical binding content rather than a backfill");
    assertTelemetryMatchesWire(secondEvents, secondDone.id, secondRequests);
  } finally {
    await current?.runtime.close();
    await rm(initial.dataDir, { recursive: true, force: true });
  }
});

test("release input binding: aggregate compiled context is rejected before Run identity exists", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const scope = { type: "session", id: session.id };
    for (const [id, marker] of [["local:large-a", "A"], ["local:large-b", "B"]]) {
      const result = await change(h, session.id, {
        operation: "put",
        resource: {
          id,
          kind: "instruction",
          title: id,
          scope,
          content: marker.repeat(55_000),
        },
      });
      assert.equal(result.status, 200, `${id} is independently below the source limit`);
    }
    const before = h.runtime.store.listRuns().length;
    const rejected = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "aggregate-context-overflow",
      input: "must not be admitted",
    });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.json.error.code, "context_budget");
    assert.equal(h.runtime.store.listRuns().length, before, "rejection must not allocate a Run identity");
    assert.equal(h.runtime.fakeProvider.requests.length, 0, "rejection must occur before provider dispatch");
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
