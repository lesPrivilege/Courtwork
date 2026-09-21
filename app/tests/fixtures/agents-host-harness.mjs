/**
 * Shared harness for the Agents Host consumer tests (P03-C/D/E): the production
 * server booted with the Agents runtime port injected, against the loopback
 * service fixture, with a disposable synthetic repository bound.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAgentsRuntimePort } from "../../runtime/agents-host-gateway.mjs";
import { createOpenAiAgentsTransport } from "../../runtime/openai-agents-transport.mjs";
import { boot } from "../helpers.mjs";
import { createAgentsLoopback } from "./agents-api-loopback.mjs";
import { createSyntheticRepository } from "./synthetic-repo/create-synthetic-repo.mjs";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** Every resource a test opens is closed by `closeAll`, newest first. */
export const cleanup = [];
export async function closeAll() { for (const close of cleanup.splice(0).reverse()) await Promise.resolve().then(close).catch(() => {}); }

export const agentsPort = (loopback, port = {}) => () => createAgentsRuntimePort({
  transport: createOpenAiAgentsTransport({ apiKey: "synthetic-loopback-key", baseURL: loopback.baseURL, timeoutMs: 2000 }), ...port,
});

export async function remoteHost({ plan, replay, announceTurns, cancel, port, permissionMode = "draft", budget } = {}) {
  const loopback = await createAgentsLoopback({ plan, replay, announceTurns, cancel });
  const h = await boot({ runtimePort: agentsPort(loopback, port), budget });
  cleanup.push(() => h.runtime.close(), () => loopback.close());
  const session = await h.createSession({ permissionMode });
  const sourceDir = await mkdtemp(path.join(tmpdir(), "cw-agents-source-"));
  cleanup.push(() => rm(sourceDir, { recursive: true, force: true }));
  const repository = await createSyntheticRepository(sourceDir);
  const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, { operation: "bind", requestId: "agents-bind", expectedRevision: 0, rootPath: sourceDir });
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  const store = h.runtime.service.store;
  const start = (input, commandId) => h.api("POST", `/sessions/${session.id}/runs`, { input, commandId });
  const run = async (input, commandId) => {
    const created = await start(input, commandId);
    assert.equal(created.status, 200, JSON.stringify(created.json));
    return h.pollRun(created.json.run.id);
  };
  const events = async (runId) => (await h.api("GET", `/sessions/${session.id}/events`)).json.events.filter(event => event.runId === runId);
  const policy = async (rules) => {
    const control = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    const saved = await h.api("PUT", `/runtime-control?sessionId=${session.id}`, { revision: control.revision, operation: "policy", scope: { type: "session", id: session.id }, rules });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
  };
  const sent = (type) => loopback.posts("/events").map(attempt => attempt.body.events[0]).filter(event => event.type === `agent.session.input.${type}`);
  return { h, loopback, session, sourceDir, repository, store, run, start, policy, events, sent, results: () => sent("tool_result"),
    actions: (runId = null) => store.listRemoteActions(session.id, runId) };
}

export async function waitFor(probe, label, timeoutMs = 5000) {
  const started = Date.now();
  for (;;) {
    const value = await probe();
    if (value) return value;
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

/** What a Host killed at this instant leaves behind: the last complete state
 * file and the retained objects, in a directory no process holds a lock on. */
export async function crashCopy(h) {
  const copy = await mkdtemp(path.join(tmpdir(), "cw-agents-crash-"));
  cleanup.push(() => rm(copy, { recursive: true, force: true }));
  await cp(path.join(h.dataDir, "runtime-state.json"), path.join(copy, "runtime-state.json"));
  await cp(path.join(h.dataDir, "artifact-history"), path.join(copy, "artifact-history"), { recursive: true }).catch(() => mkdir(path.join(copy, "artifact-history")));
  return copy;
}

export const readCall = (args = { path: "README.md" }, extra = {}) => ({ call: { name: "repo_read", arguments: args, ...extra } });
