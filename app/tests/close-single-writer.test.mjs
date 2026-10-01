import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { once } from "node:events";
import { chmod, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { startServer } from "../server/index.mjs";
import { createRuntime } from "../server/runtime.mjs";
import { RuntimeStore, StoreClosingError } from "../server/store.mjs";

/* Review N1 (6692b91): the data-directory lock was given up while writers of
 * the closing Host could still publish. Three windows, one test group each:
 * a Store mutation issued during close (the holder unlocks before its receipt
 * arrives), an HTTP handler that outlives runtime.close(), and service commands
 * that had no closing check. Every interleaving below is placed with a gate on
 * an awaited event; none depends on a delay. Each test opens its gates and
 * closes its Hosts in an after hook, so a failure reports instead of hanging. */

const dataDirectory = () => mkdtemp(path.join(tmpdir(), "se-close-writer-"));
const persisted = async (dataDir) => JSON.parse(await readFile(path.join(dataDir, "runtime-state.json"), "utf8"));
const projectNames = (state) => state.projects.map((project) => project.name);
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

/** Hold the Store's release open at the point the old window was: the holder
 * has really unlocked (another Host can acquire), the receipt has not yet
 * reached the Store. `unlocked` resolves there; `deliver()` lets the receipt in. */
function holdReleaseReceipt(store) {
  const unlocked = deferred(), receipt = deferred();
  const handle = store.lockHandle, release = handle.release;
  handle.release = async () => { await release(); unlocked.resolve(); await receipt.promise; };
  return { unlocked: unlocked.promise, deliver: receipt.resolve };
}

/** Keep the Store's write queue busy until `release()`. */
function busyQueue(store) {
  const gate = deferred();
  const settled = store._mutate(async () => { await gate.promise; });
  return { release: gate.resolve, settled };
}

const closingRefusal = (error) => error?.status === 503 && error?.code === "runtime_closing";

test("Store: a mutation admitted before close is persisted before release; one issued after close began is refused and never renamed", async (t) => {
  const dataDir = await dataDirectory();
  const store = await new RuntimeStore({ dataDir }).open();
  const window = holdReleaseReceipt(store);
  const busy = busyQueue(store);
  t.after(async () => { busy.release(); window.deliver(); await store.close(); });
  const admitted = store.createProject("admitted before close");
  const closing = store.close();
  // Issued behind a busy queue as close starts: on 6692b91 it joined the queue
  // after close() had captured it and passed _persist's lock check during the
  // release round trip.
  const late = store.createProject("issued after close began");
  const lateOutcome = late.then(() => "persisted", (error) => error);
  busy.release();
  await busy.settled;
  assert.equal((await admitted).name, "admitted before close");
  await window.unlocked;
  assert.deepEqual(projectNames(await persisted(dataDir)), ["admitted before close"], "the admitted mutation was on disk when the lock was given up");
  const outcome = await lateOutcome;
  assert.ok(outcome instanceof StoreClosingError, `the late mutation must be refused with the typed error, got: ${outcome}`);
  assert.ok(closingRefusal(outcome));
  window.deliver();
  await closing;
  assert.deepEqual(projectNames(await persisted(dataDir)), ["admitted before close"], "nothing was renamed after the lock was given up");
  await assert.rejects(store.createProject("after close"), StoreClosingError);
  assert.deepEqual((await readdir(dataDir)).filter((name) => name.endsWith(".tmp")), []);
});

test("Store: _persist cannot rename once close has taken the lock away, even for a write already in flight", async (t) => {
  const dataDir = await dataDirectory();
  const store = await new RuntimeStore({ dataDir }).open();
  await store.createProject("published under the lock");
  const window = holdReleaseReceipt(store);
  t.after(async () => { window.deliver(); await store.close(); });
  const stale = { ...store.snapshot(), projects: [] };
  // A caller that bypasses admission: its tmp write is in flight when close
  // takes the lock away, and a second one starts after the holder unlocked.
  const inFlight = store._persist(stale).then(() => "renamed", (error) => error);
  const closing = store.close();
  await window.unlocked;
  const afterUnlock = await store._persist(stale).then(() => "renamed", (error) => error);
  assert.match(String(afterUnlock?.message), /lock is unavailable/);
  assert.match(String((await inFlight)?.message), /lock is unavailable/);
  window.deliver();
  await closing;
  assert.deepEqual(projectNames(await persisted(dataDir)), ["published under the lock"]);
  assert.deepEqual((await readdir(dataDir)).filter((name) => name.endsWith(".tmp")), [], "a refused write leaves no tmp behind");
});

test("two Hosts: once Host A gives up the lock it cannot publish over Host B", async (t) => {
  const dataDir = await dataDirectory();
  const hostA = await createRuntime({ dataDir });
  const window = holdReleaseReceipt(hostA.store);
  // A write in flight when A closes: admitted, so it lands before the handoff.
  const busy = busyQueue(hostA.store);
  t.after(async () => { busy.release(); window.deliver(); await hostA.close().catch(() => {}); });
  const inFlight = hostA.service.createProject({ name: "A, in flight at close" });
  const closingA = hostA.close();
  busy.release();
  assert.equal((await inFlight).project.name, "A, in flight at close");
  await window.unlocked;

  // B takes over inside the old window: A's holder has unlocked, A has no receipt yet.
  const hostB = await createRuntime({ dataDir });
  t.after(() => hostB.close());
  assert.deepEqual(projectNames(hostB.store.snapshot()), ["A, in flight at close"], "B opened the state A finished before the handoff");
  await hostB.service.createProject({ name: "published by B" });

  // On 6692b91 each of these renamed A's whole stale snapshot over B's state.
  const late = [];
  for (const write of [() => hostA.service.createProject({ name: "A, late through the service" }), () => hostA.store.createProject("A, late through the Store")]) {
    late.push(await write().then(() => "published", (error) => closingRefusal(error) ? "503 runtime_closing" : String(error)));
  }
  assert.deepEqual(projectNames(await persisted(dataDir)), ["A, in flight at close", "published by B"], "the file holds B's state");
  assert.deepEqual(late, ["503 runtime_closing", "503 runtime_closing"]);

  window.deliver();
  await closingA;
  await hostB.service.createProject({ name: "B again" });
  assert.deepEqual(projectNames(await persisted(dataDir)), ["A, in flight at close", "published by B", "B again"]);
});

test("runtime.close: service settles, then the entry owner drains, then the other owners close, then the Store", async (t) => {
  const runtime = await createRuntime({ dataDir: await dataDirectory() });
  t.after(() => runtime.close());
  const order = [];
  for (const [owner, method, label] of [[runtime.service, "close", "service settled"], [runtime.registry, "dispose", "extensions closing"], [runtime.store, "close", "store closing"]]) {
    const original = owner[method].bind(owner);
    owner[method] = async (...args) => { if (label !== "service settled") order.push(label); const result = await original(...args); if (label === "service settled") order.push(label); return result; };
  }
  const first = runtime.close({ drain: async () => { order.push("entry drained"); } });
  // Idempotent: the first call decides, a later one returns the same close.
  assert.equal(runtime.close({ drain: async () => { order.push("second drain"); } }), first);
  await first;
  assert.deepEqual(order, ["service settled", "entry drained", "extensions closing", "store closing"]);
});

test("in-process write commands refuse 503 runtime_closing once close has begun", async (t) => {
  const runtime = await createRuntime({ dataDir: await dataDirectory() });
  t.after(() => runtime.close());
  const { service } = runtime;
  const { project } = await service.createProject({ name: "before close" });
  const { session } = await service.createSession({ projectId: project.id, title: "before close" });
  const thread = await service.coordination.create({ threadId: "thread-a", sessionId: session.id, title: "t" });
  const before = runtime.store.snapshot();
  const closing = runtime.close();
  const commands = {
    createProject: () => service.createProject({ name: "late" }),
    createSession: () => service.createSession({ projectId: project.id, title: "late" }),
    createAttentionConversation: () => service.createAttentionConversation({ conversationId: randomUUID() }),
    updateDraft: () => service.updateDraft(session.id, { text: "late" }),
    actOnAsyncTask: async () => service.actOnAsyncTask("task", "cancel", { projectId: project.id, expectedRevision: 1 }),
    "subagents.create": () => service.subagents.create({ id: randomUUID(), parentSessionId: session.id, brief: "late", sources: [] }),
    "subagents.action": () => service.subagents.action("assignment", { action: "cancel", expectedRevision: 1, commandId: "c", reason: "late", expandedSources: [] }),
    "subagents.configure": () => service.subagents.configure({ status: "disabled" }),
    "coordination.create": async () => service.coordination.create({ threadId: "thread-b", sessionId: session.id, title: "late" }),
    "coordination.attach": async () => service.coordination.attach(thread.id, { sessionId: session.id, expectedRevision: thread.revision }),
    "coordination.close": async () => service.coordination.close(thread.id, { expectedRevision: thread.revision }),
    "coordination.send": async () => service.coordination.send({ messageId: "m", sourceThreadId: thread.id, targetThreadId: "thread-b", sourceSessionId: session.id, kind: "signal", text: "late", replyTo: null, expectedTargetRevision: 1 }),
  };
  const outcomes = {};
  for (const [name, command] of Object.entries(commands)) outcomes[name] = await command().then(() => "accepted", (error) => closingRefusal(error) ? "503 runtime_closing" : `${error?.status ?? "error"} ${error?.code ?? error?.message}`);
  await closing;
  assert.deepEqual(outcomes, Object.fromEntries(Object.keys(commands).map((name) => [name, "503 runtime_closing"])));
  const after = await persisted(runtime.dataDir);
  for (const key of ["projects", "sessions", "coordination", "subagents", "asyncTasks"]) assert.deepEqual(after[key], before[key], `${key} did not change after close began`);
});

test("HTTP: a handler still waiting for its body when close begins is refused without it, and close does not wait for the body", async (t) => {
  const dataDir = await dataDirectory();
  const host = await startServer({ dataDir, port: 0, logger: () => {} });
  t.after(async () => { request.destroy(); letStoreClose.resolve(); await host.close(); });
  // Hold the Store open so a body that arrives late meets a Host whose lock is still held.
  const storeClosing = deferred(), letStoreClose = deferred();
  const closeStore = host.store.close.bind(host.store);
  host.store.close = async () => { storeClosing.resolve(); await letStoreClose.promise; return closeStore(); };

  const payload = JSON.stringify({ name: "late body" });
  const request = http.request(host.url + "/api/v5/projects", { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload), "x-work-token": host.token } });
  request.on("error", () => {}); // a refused connection closes under the late body
  const responded = new Promise((resolve, reject) => request.on("response", (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk)); res.on("error", reject);
    res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(Buffer.concat(chunks).toString("utf8")) }));
  }));
  // The Host's own listener ran first: by this event the request has passed
  // the entry check and its handler is waiting for the body.
  const admitted = once(host.server, "request");
  request.flushHeaders();
  const [, serverResponse] = await admitted;
  assert.equal(serverResponse.writableEnded, false);

  const closed = host.close();
  await storeClosing.promise;
  const answeredWithoutBody = serverResponse.writableEnded;
  let response;
  if (answeredWithoutBody) {
    // The body is still withheld: the refusal has been sent and close completes.
    response = await responded;
    letStoreClose.resolve();
    await closed;
    request.end(payload); // the body then arrives, at a Host that is gone
  } else {
    // 6692b91: only the body lets the handler go on, into a service that is closing.
    request.end(payload);
    response = await responded;
    letStoreClose.resolve();
    await closed;
  }
  assert.equal(answeredWithoutBody, true, "the handler must be refused when close begins, not when its body arrives");
  assert.equal(response.status, 503);
  assert.equal(response.json.error.code, "runtime_closing");
  assert.deepEqual(projectNames(await persisted(dataDir)), [], "no project was created by the late body");
});

test("HTTP: a handler already inside the service is awaited after the service settled and before the other owners close", async (t) => {
  const dataDir = await dataDirectory();
  const host = await startServer({ dataDir, port: 0, logger: () => {} });
  t.after(async () => { busy.release(); await host.close(); });
  const order = [], inService = deferred();
  const createProject = host.service.createProject.bind(host.service);
  host.service.createProject = async (input) => { inService.resolve(); try { return await createProject(input); } finally { order.push("handler left the service"); } };
  const busy = busyQueue(host.store);
  const settle = host.service.close.bind(host.service);
  // The handler is held inside the service until the service has settled.
  host.service.close = async () => { await settle(); order.push("service settled"); busy.release(); };
  const dispose = host.registry.dispose.bind(host.registry);
  host.registry.dispose = async () => { order.push("owners closing"); return dispose(); };

  const answered = fetch(host.url + "/api/v5/projects", { method: "POST", headers: { "content-type": "application/json", "x-work-token": host.token }, body: JSON.stringify({ name: "admitted over HTTP" }) });
  await inService.promise;
  await host.close();
  const response = await answered;
  assert.equal(response.status, 200);
  assert.equal((await response.json()).project.name, "admitted over HTTP");
  assert.deepEqual(order, ["service settled", "handler left the service", "owners closing"]);
  assert.deepEqual(projectNames(await persisted(dataDir)), ["admitted over HTTP"], "an admitted command is finished before the lock is released");
});

test("HTTP: a mutation the Store refuses for closing answers 503 runtime_closing, not a 500", async (t) => {
  const host = await startServer({ dataDir: await dataDirectory(), port: 0, logger: () => {} });
  t.after(() => host.close());
  const post = (name) => fetch(host.url + "/api/v5/projects", { method: "POST", headers: { "content-type": "application/json", "x-work-token": host.token }, body: JSON.stringify({ name }) });
  // The Store closed underneath a service that is not closing.
  await host.store.close();
  const refused = await post("store closed");
  assert.deepEqual([refused.status, (await refused.json()).error.code], [503, "runtime_closing"]);
});

/* Follow-up A: with the drain ahead of the lock release, a handler that waits
 * on a person would hold the lock for as long as the person takes. close()
 * ends an open folder picker; the request is answered 503 runtime_closing. */
test("HTTP: close ends an open folder picker instead of waiting for the person", async (t) => {
  const scratch = await mkdtemp(path.join(tmpdir(), "se-close-picker-"));
  const pidFile = path.join(scratch, "picker.pid"), script = path.join(scratch, "picker-never-exits.sh");
  // One process that never answers (exec: no orphan keeps the pipes open).
  await writeFile(script, `#!/bin/sh\necho $$ > "${pidFile}.tmp" && mv "${pidFile}.tmp" "${pidFile}"\nexec sleep 86400\n`);
  await chmod(script, 0o755);
  const host = await startServer({ dataDir: await dataDirectory(), port: 0, logger: () => {} });
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  let pid = null, bound;
  t.after(async () => { clearTimeout(bound); if (pid && alive(pid)) process.kill(pid, "SIGKILL"); await host.close(); });

  process.env.SE_TEST_MODE = "1"; process.env.SE_TEST_DIRECTORY_PICKER = script;
  let answered;
  try {
    answered = fetch(host.url + "/api/v5/host/choose-directory", { method: "POST", headers: { "content-type": "application/json", "x-work-token": host.token }, body: "{}" });
    // The dialog is open once its process has written its pid.
    while (pid === null) {
      pid = await readFile(pidFile, "utf8").then((text) => Number(text.trim()), () => null);
      if (pid === null) await new Promise((resolve) => setTimeout(resolve, 10));
    }
  } finally { delete process.env.SE_TEST_MODE; delete process.env.SE_TEST_DIRECTORY_PICKER; }
  assert.equal(alive(pid), true);

  // The bound only reports a close that is still waiting; a close that ends the picker never reaches it.
  const outcome = await Promise.race([host.close().then(() => "closed"), new Promise((resolve) => { bound = setTimeout(() => resolve("still waiting for the picker"), 5000); })]);
  assert.equal(outcome, "closed");
  assert.equal(alive(pid), false, "the picker's process is gone when close resolves");
  const response = await answered;
  assert.deepEqual([response.status, (await response.json()).error.code], [503, "runtime_closing"]);
  await assert.rejects(host.service.chooseHostDirectory({}), closingRefusal, "a picker request during or after close is refused");
});

/* Follow-up B: the Host's Work Core owner is final. On 965685e a late call
 * reopened the closed client and started a worker of the old Host on a
 * database whose lock had been given up. */
test("after runtime.close a Core-reaching call is refused CORE_UNAVAILABLE and no bridge process is started", async (t) => {
  const runtime = await createRuntime({ dataDir: await dataDirectory() });
  const client = runtime.service.workCore;
  t.after(async () => { await runtime.close(); await client.close(); });
  const { project } = await runtime.service.createProject({ name: "before close" });
  assert.deepEqual((await runtime.service.listWork(project.id)).matters, [], "the bridge served this Host while it was open");
  const served = client.transport.child;
  await runtime.close();
  assert.notEqual(served.exitCode ?? served.signalCode, null, "the Host's bridge process was reaped by close");

  const late = await runtime.service.listWork(project.id).then(() => "answered", (error) => error.code);
  const started = await client.start().then(() => "started", (error) => error.code);
  const child = client.transport?.child;
  const running = Boolean(child && child !== served && child.exitCode === null && child.signalCode === null);
  assert.deepEqual({ late, started, closed: client.closed, running }, { late: "CORE_UNAVAILABLE", started: "CORE_UNAVAILABLE", closed: true, running: false });
});
