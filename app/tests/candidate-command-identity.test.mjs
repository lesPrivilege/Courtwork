/* Review N7 · a Work location command keeps its identity until the Host settles
 * it. A lost reply is not a failure and not a success: the card reads the
 * Session back, shows what the Host holds, and a second press re-sends the SAME
 * request (ids, base commit, expected revisions) instead of a different one.
 * Only a definite refusal lets the next press mint a new intent. The production
 * card (app/web/workspace-card.mjs) is driven through its own buttons. */
import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceCard } from "../web/workspace-card.mjs";
import { withTinyDom, flush } from "./tiny-dom.mjs";

const HEAD = "7c8dd3fc8709d0927f2f6c0fa29352ddae8dab02";
const field = (body, key) => [...body.querySelectorAll("button,input")].find(e => e.getAttribute("data-repository-field") === key);
const notice = body => body.querySelector(".inline-error")?.textContent ?? null;
async function settle() { for (let i = 0; i < 6; i++) await flush(); }
const network = () => new Error("The local runtime could not be reached.");
const refusal = (status, code, message) => Object.assign(new Error(message), { status, body: { error: { code, message } } });

const binding = { id: "b1", rootPath: "/synthetic/parcel", device: "1", inode: "2", revision: 1, status: "active" };
const bound = { id: "s1", repositoryBindingRevision: 1, repositoryCandidateRevision: 0, repositoryCandidate: null, repositoryBinding: binding };
const candidateOf = (id, status = "active", revision = 1) => ({ id, status, revision, sourceBindingId: "b1", sourceBindingRevision: 1, baseCommit: HEAD, objectFormat: "sha1", writeRevision: 0, createdAt: "2026-10-01T00:00:00.000Z" });
const withCandidate = { ...bound, repositoryCandidateRevision: 1, repositoryCandidate: candidateOf("cand-1") };
const unbound = { id: "s1", repositoryBindingRevision: 2, repositoryCandidateRevision: 0, repositoryCandidate: null, repositoryBinding: { ...binding, revision: 2, status: "revoked" } };

/* A scripted Host: `host.session` is what a Session read returns; `answers`
 * are the replies to each mutating PUT, in order. */
function drive(body, session, answers) {
  const host = { session, readFails: false };
  const seen = { puts: [], inspects: 0, reads: 0 };
  const request = async (path, options = {}) => {
    if (path.startsWith("/repositories/inspect")) { seen.inspects++; return { rootPath: binding.rootPath, available: true, git: { branch: "main", head: HEAD, detached: false } }; }
    if (path === "/repositories/recent") return { entries: [] };
    assert.equal(options.method, "PUT", path);
    seen.puts.push({ path, body: structuredClone(options.body) });
    const answer = answers.shift();
    assert.ok(answer, `an unexpected PUT ${path}`);
    return answer(options.body, host);
  };
  const card = createWorkspaceCard({ request, onClose: () => {}, onReviewChanges: () => {},
    onSession: async () => { seen.reads++; if (host.readFails) throw network(); card.render(body, { session: host.session, active: false }); } });
  card.render(body, { session, active: false });
  return { card, host, seen, press: async key => { field(body, key).click(); await settle(); } };
}

test("N7 · a lost create reply: the Session is read back, and a candidate the Host did create is shown without a second request", () => withTinyDom(async body => {
  const h = drive(body, bound, [(sent, host) => { host.session = { ...bound, repositoryCandidateRevision: 1, repositoryCandidate: candidateOf(sent.candidateId) }; throw network(); }]);
  await h.press("start-edits");
  assert.equal(h.seen.puts.length, 1);
  assert.equal(h.seen.reads, 1, "the card asked the Host what it holds");
  assert.ok(field(body, "stop-edits") && field(body, "review"), "the committed state is shown");
  assert.equal(field(body, "start-edits"), undefined);
  assert.equal(notice(body), null, "a lost reply to a committed command is not an error");
  assert.equal(field(body, "stop-edits").disabled, false);
  assert.equal(h.card.pending, false);
}));

test("N7 · a lost create reply the Host never acted on: pressing again re-sends the identical request, without re-reading HEAD", () => withTinyDom(async body => {
  const h = drive(body, bound, [
    () => { throw network(); },
    () => { throw Object.assign(new Error("bad gateway"), { status: 502, body: null }); },
    (sent, host) => { host.session = { ...bound, repositoryCandidateRevision: 1, repositoryCandidate: candidateOf(sent.candidateId) }; return { receipt: { status: "active" } }; },
  ]);
  await h.press("start-edits");
  assert.equal(h.seen.reads, 1);
  assert.equal(notice(body), "Not created. Start private candidate again to use the same request.");
  assert.equal(field(body, "start-edits").disabled, false);
  assert.equal(field(body, "start-edits").textContent, "Start private candidate", "the same command, not a new control");
  const first = h.seen.puts[0].body;
  assert.deepEqual(Object.keys(first).sort(), ["baseCommit", "candidateId", "expectedBindingRevision", "expectedRevision", "operation", "requestId"]);

  await h.press("start-edits"); // a 5xx without a Host code settles nothing either
  assert.deepEqual(h.seen.puts[1].body, first, "the same requestId, candidateId, base commit and revisions");
  assert.equal(h.seen.inspects, 1, "the base commit is part of the kept payload");
  assert.equal(notice(body), "Not created. Start private candidate again to use the same request.");

  await h.press("start-edits");
  assert.deepEqual(h.seen.puts[2].body, first);
  assert.equal(h.seen.puts.length, 3);
  assert.ok(field(body, "stop-edits"));
  assert.equal(notice(body), null);
}));

test("N7 · an unknown outcome is checked before it is re-sent: a read that now shows the candidate ends it; a read that fails keeps it", () => withTinyDom(async body => {
  const h = drive(body, bound, [() => { throw network(); }]);
  h.host.readFails = true;
  await h.press("start-edits");
  assert.equal(notice(body), "The result is not known: The local runtime could not be reached. Start private candidate again to check this chat and reuse the same request.");
  assert.equal(h.seen.puts.length, 1);
  await h.press("start-edits"); // still unreachable: nothing is sent blind
  assert.equal(h.seen.puts.length, 1);
  assert.match(notice(body), /^The result is not known: /);
  h.host.readFails = false;
  h.host.session = { ...bound, repositoryCandidateRevision: 1, repositoryCandidate: candidateOf(h.seen.puts[0].body.candidateId) };
  await h.press("start-edits");
  assert.equal(h.seen.puts.length, 1, "the read showed it committed; no second request");
  assert.ok(field(body, "stop-edits"));
  assert.equal(notice(body), null);
}));

test("N7 · a definite refusal settles the intent: the refusal is shown, the Session is read, and the next press is a new intent from a fresh read", () => withTinyDom(async body => {
  const h = drive(body, bound, [
    () => { throw refusal(409, "stale_revision", "repository candidate changed; refresh before retrying"); },
    () => { throw refusal(409, "repository_candidate_failed", "private repository candidate could not be created; the source repository is unchanged"); },
    () => ({ receipt: { status: "active" } }),
  ]);
  await h.press("start-edits");
  assert.equal(notice(body), "repository candidate changed; refresh before retrying");
  assert.equal(h.seen.reads, 1, "a stale picture is replaced by a read, not by a guess");
  await h.press("start-edits");
  const [first, second] = h.seen.puts.map(put => put.body);
  assert.notEqual(second.requestId, first.requestId);
  assert.notEqual(second.candidateId, first.candidateId);
  assert.equal(h.seen.inspects, 2, "a new intent reads HEAD again");
  assert.equal(h.seen.reads, 2, "nothing was read before sending a new intent; the refusal was read back");
  await h.press("start-edits");
  assert.notEqual(h.seen.puts[2].body.requestId, second.requestId);
}));

test("N7 · a replayed create whose receipt says it failed is settled, not shown as created", () => withTinyDom(async body => {
  const h = drive(body, bound, [() => { throw network(); }, () => ({ receipt: { status: "failed", failureCode: "candidate_creation_failed" }, idempotent: true }), () => ({ receipt: { status: "active" } })]);
  await h.press("start-edits");
  await h.press("start-edits");
  assert.deepEqual(h.seen.puts[1].body, h.seen.puts[0].body);
  assert.equal(notice(body), "The private candidate could not be changed.");
  assert.ok(field(body, "start-edits"));
  await h.press("start-edits");
  assert.notEqual(h.seen.puts[2].body.requestId, h.seen.puts[0].body.requestId, "the Host settled the old identity");
}));

test("N7 · Stop edits keeps its identity across a lost reply, and stops asking once the Host shows the candidate stopped", () => withTinyDom(async body => {
  const h = drive(body, withCandidate, [
    () => { throw network(); },
    (sent, host) => { host.session = { ...bound, repositoryCandidateRevision: 2, repositoryCandidate: candidateOf("cand-1", "revoked", 2) }; throw network(); },
  ]);
  await h.press("stop-edits");
  assert.equal(notice(body), "Not stopped. Stop edits again to use the same request.");
  await h.press("stop-edits");
  assert.deepEqual(h.seen.puts[1].body, h.seen.puts[0].body);
  assert.deepEqual(Object.keys(h.seen.puts[0].body).sort(), ["candidateId", "expectedBindingRevision", "expectedRevision", "operation", "requestId"]);
  assert.equal(h.seen.puts.length, 2);
  assert.equal(field(body, "stop-edits"), undefined);
  assert.ok(field(body, "start-edits"), "the stopped state is the Host's");
  assert.equal(notice(body), null);
}));

test("N7 · Disconnect keeps its identity across a lost reply; a committed disconnect is shown from the read", () => withTinyDom(async body => {
  const h = drive(body, bound, [
    () => { throw network(); },
    (sent, host) => { host.session = unbound; throw network(); },
  ]);
  await h.press("disconnect");
  assert.equal(notice(body), "Not disconnected. Disconnect again to use the same request.");
  assert.equal(h.seen.puts[0].path, "/sessions/s1/repository-binding");
  assert.deepEqual(Object.keys(h.seen.puts[0].body).sort(), ["expectedRevision", "operation", "requestId"]);
  await h.press("disconnect");
  assert.deepEqual(h.seen.puts[1].body, h.seen.puts[0].body);
  assert.equal(field(body, "disconnect"), undefined);
  assert.ok(field(body, "open") || field(body, "path"), "the unbound card");
  assert.equal(notice(body), null);
  assert.equal(h.card.pending, false);
}));

test("N7 · a refused Disconnect is shown in the Host's words and the next press is a new request", () => withTinyDom(async body => {
  const h = drive(body, bound, [
    () => { throw refusal(409, "active_run", "repository binding cannot change during a Run"); },
    (sent, host) => { host.session = unbound; return { receipt: {} }; },
  ]);
  await h.press("disconnect");
  assert.equal(notice(body), "repository binding cannot change during a Run");
  await h.press("disconnect");
  assert.notEqual(h.seen.puts[1].body.requestId, h.seen.puts[0].body.requestId);
  assert.equal(field(body, "disconnect"), undefined);
}));

test("N7 · an identity belongs to its chat: another chat's command is its own, and coming back re-sends the first chat's", () => withTinyDom(async body => {
  const other = { ...bound, id: "s2", repositoryBinding: { ...binding, id: "b2" } };
  const h = drive(body, bound, [() => { throw network(); }, () => { throw network(); }, () => { throw network(); }]);
  await h.press("start-edits");
  h.host.session = other;
  h.card.render(body, { session: other, active: false });
  assert.equal(notice(body), null, "the first chat's notice is not shown on another chat");
  await h.press("start-edits");
  assert.equal(h.seen.puts[1].path, "/sessions/s2/repository-candidate");
  assert.notEqual(h.seen.puts[1].body.requestId, h.seen.puts[0].body.requestId);
  h.host.session = bound;
  h.card.render(body, { session: bound, active: false });
  await h.press("start-edits");
  assert.equal(h.seen.puts[2].path, "/sessions/s1/repository-candidate");
  assert.deepEqual(h.seen.puts[2].body, h.seen.puts[0].body);
}));
