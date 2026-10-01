/* Review N6 · when a Run command is refused after the receipt lookup missed, the
 * Host says so: `error.commandAdmitted: false`. A client replaying a command
 * whose first reply it never saw can then release it. The marker is a claim
 * that this commandId has no Run; it must never appear on an answer that does
 * not prove that. Real HTTP server, fake provider. */
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { test } from "node:test";
import { boot } from "./helpers.mjs";
import { ServiceError } from "../server/service.mjs";

async function withHost(run) {
  const h = await boot();
  try { await run(h); }
  finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}
const send = (h, sessionId, body) => h.api("POST", `/sessions/${sessionId}/runs`, body);
const marked = (response) => Object.hasOwn(response.json?.error ?? {}, "commandAdmitted");

test("N6 · a command that never arrived, replayed after the Agent configuration moved, is refused with the marker and makes no Run", () => withHost(async (h) => {
  const session = await h.createSession();
  const snapshot = async () => (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
  const before = await snapshot();
  // What the client stored before its POST, which the Host never received.
  const lost = { input: "Summarise the renewal window.", commandId: "lost-command",
    runtimeSelection: { revision: before.revision, profileId: before.composition.id, sourceHash: before.composition.hash ?? null } };
  const moved = await h.api("PUT", `/runtime-control?sessionId=${session.id}`, { revision: before.revision, operation: "put",
    resource: { id: "local:n6-note", kind: "instruction", title: "N6 note", content: "Be brief.", scope: { type: "session", id: session.id } } });
  assert.equal(moved.status, 200, JSON.stringify(moved.json));
  assert.notEqual((await snapshot()).revision, before.revision);

  const replay = await send(h, session.id, lost);
  assert.deepEqual([replay.status, replay.json.error.code, replay.json.error.commandAdmitted], [409, "runtime_selection_conflict", false]);
  assert.equal(h.runtime.store.listRuns().length, 0);
  assert.equal(h.runtime.fakeProvider.requests.length, 0);
  // The same answer every time: nothing was recorded for the refused command.
  assert.equal((await send(h, session.id, lost)).json.error.commandAdmitted, false);

  // The text sent again as a new command, on the current reading, is admitted.
  const now = await snapshot();
  const fresh = await send(h, session.id, { input: lost.input, commandId: "fresh-command",
    runtimeSelection: { revision: now.revision, profileId: now.composition.id, sourceHash: now.composition.hash ?? null } });
  assert.equal(fresh.status, 200, JSON.stringify(fresh.json));
  assert.equal(h.runtime.store.listRuns().length, 1);
  await h.pollRun(fresh.json.run.id);
}));

test("N6 · a replay of an admitted command returns its receipt even after the configuration moved; a conflicting reuse of the id is not marked", () => withHost(async (h) => {
  const session = await h.createSession();
  const snapshot = async () => (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
  const before = await snapshot();
  const command = { input: "Summarise the renewal window.", commandId: "admitted-command",
    runtimeSelection: { revision: before.revision, profileId: before.composition.id, sourceHash: before.composition.hash ?? null } };
  const admitted = await send(h, session.id, command);
  assert.equal(admitted.status, 200, JSON.stringify(admitted.json));
  await h.pollRun(admitted.json.run.id);
  const moved = await h.api("PUT", `/runtime-control?sessionId=${session.id}`, { revision: before.revision, operation: "put",
    resource: { id: "local:n6-note", kind: "instruction", title: "N6 note", content: "Be brief.", scope: { type: "session", id: session.id } } });
  assert.equal(moved.status, 200, JSON.stringify(moved.json));

  const replay = await send(h, session.id, command);
  assert.deepEqual([replay.status, replay.json.run.id, marked(replay)], [200, admitted.json.run.id, false]);

  const conflict = await send(h, session.id, { ...command, input: "A different instruction." });
  assert.deepEqual([conflict.status, conflict.json.error.code, marked(conflict)], [409, "command_conflict", false]);
  assert.equal(h.runtime.store.listRuns().length, 1);
}));

test("N6 · the marker is on admission refusals only: not before the lookup, not on an error whose outcome is unknown, not once the Run exists", () => withHost(async (h) => {
  const session = await h.createSession();
  // Before the lookup: the request itself, and a Session that does not exist.
  const invalid = await send(h, session.id, { input: "", commandId: "c-invalid" });
  assert.deepEqual([invalid.status, marked(invalid)], [400, false]);
  const missing = await send(h, "no-such-session", { input: "hello", commandId: "c-missing" });
  assert.deepEqual([missing.status, missing.json.error.code, marked(missing)], [404, "not_found", false]);

  // A new command refused at admission is marked like a replayed one: the fact is the same.
  const waiting = await send(h, session.id, { input: h.scriptInput([{ name: "ask_user", arguments: { prompt: "Proceed?" } }]), commandId: "c-waiting" });
  assert.equal(waiting.status, 200, JSON.stringify(waiting.json));
  await h.pollRun(waiting.json.run.id, { until: (status) => status === "waiting_user" });
  const second = await send(h, session.id, { input: "while the first is active", commandId: "c-second" });
  assert.deepEqual([second.status, second.json.error.code, second.json.error.commandAdmitted], [409, "active_run", false]);
  await h.api("POST", `/runs/${waiting.json.run.id}/cancel`, {});
  await h.pollRun(waiting.json.run.id);

  // The Store failing during admission is not a refusal: its outcome is not known.
  const store = h.runtime.store, createRun = store.createRun.bind(store);
  store.createRun = async () => { throw new Error("runtime state could not be written"); };
  const unknown = await send(h, session.id, { input: "store fails", commandId: "c-store" });
  assert.deepEqual([unknown.status, unknown.json.error.code, marked(unknown)], [500, "internal_error", false]);
  // The Store reporting that the id already has a Run with another input is a conflict, not "no receipt".
  store.createRun = async () => { throw Object.assign(new Error("command conflict"), { code: "COMMAND_CONFLICT" }); };
  const raced = await send(h, session.id, { input: "raced", commandId: "c-raced" });
  assert.deepEqual([raced.status, raced.json.error.code, marked(raced)], [409, "command_conflict", false]);
  store.createRun = createRun;

  // Once the Store holds the Run, a failure in what follows is not a refusal either.
  const service = h.runtime.service, active = service.active, set = active.set.bind(active);
  active.set = () => { throw new Error("after admission"); };
  const after = await send(h, session.id, { input: "created, then a failure", commandId: "c-after" });
  active.set = set;
  assert.deepEqual([after.status, marked(after)], [500, false]);
  const created = store.listRuns().find((run) => run.commandId === "c-after");
  assert.ok(created, "the Run exists, so the command is admitted");
  await h.api("POST", `/runs/${created.id}/cancel`, {});
}));

/* Each exclusion in #createRun's marker has a case that fails without it. No
 * production path raises these three today (no admission check carries
 * `outcome: "unknown"` or a `*_unknown` code, and nothing after creation throws
 * a ServiceError), so they are injected at the two points the test above
 * already replaces: the Store's createRun and the service's active-Run map. A
 * coded 409 is used each time, so only the clause under test keeps the marker off. */
test("N6 · a coded refusal is still unmarked when its outcome is unknown, when its code says unknown, or when the Run already exists", () => withHost(async (h) => {
  const session = await h.createSession();
  const store = h.runtime.store, createRun = store.createRun.bind(store);

  // Control: the same injection point, an ordinary coded refusal — marked.
  store.createRun = async () => { throw new ServiceError(409, "synthetic_refusal", "refused at admission"); };
  const refused = await send(h, session.id, { input: "refused", commandId: "c-refused" });
  assert.deepEqual([refused.status, refused.json.error.code, refused.json.error.commandAdmitted], [409, "synthetic_refusal", false]);

  // `outcome: "unknown"` in the details: the Host itself says it cannot tell.
  store.createRun = async () => { throw new ServiceError(409, "synthetic_refusal", "could not tell", { outcome: "unknown", operation: "run_admission" }); };
  const outcome = await send(h, session.id, { input: "outcome unknown", commandId: "c-outcome" });
  assert.deepEqual([outcome.status, outcome.json.error.outcome, marked(outcome)], [409, "unknown", false]);

  // A code ending `_unknown`: the client reads such a code as an unknown outcome too.
  store.createRun = async () => { throw new ServiceError(409, "admission_unknown", "could not tell"); };
  const coded = await send(h, session.id, { input: "code unknown", commandId: "c-coded" });
  assert.deepEqual([coded.status, coded.json.error.code, marked(coded)], [409, "admission_unknown", false]);
  store.createRun = createRun;
  assert.equal(store.listRuns().length, 0);

  // A ServiceError raised once the Store holds the Run: coded, and still not a refusal to admit.
  const active = h.runtime.service.active, set = active.set.bind(active);
  active.set = () => { throw new ServiceError(409, "synthetic_refusal", "after admission"); };
  const after = await send(h, session.id, { input: "created, then a coded failure", commandId: "c-after-coded" });
  active.set = set;
  assert.deepEqual([after.status, after.json.error.code, marked(after)], [409, "synthetic_refusal", false]);
  const created = store.listRuns().find((run) => run.commandId === "c-after-coded");
  assert.ok(created, "the Run exists, so the command is admitted");
  await h.api("POST", `/runs/${created.id}/cancel`, {});
}));
