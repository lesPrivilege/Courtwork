/* Two consumers of contracts the Host already has.
 *
 *  1. Preparing a Chat, a folder binding and a private candidate before any
 *     inference: the sequence, its exactly-once identities across lost replies,
 *     what it refuses, and the fact that it admits no Run. Exercised twice —
 *     against a scripted transport for the identity and recovery cases, and
 *     against a real Host process for the part only the Host can answer.
 *  2. A write or check approval saying which private candidate it was asked
 *     about and the revision it was bound to, read from the recorded payload
 *     and from nothing else.
 *
 * Scope: engineering/execution/claude-frontend-harness-2026-09-16/
 * 06b-dogfood-friction-20260920.md#astra-exploration-disposition--2026-09-20.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  prepareChat,
  PREPARE_NO_FOLDER,
  PREPARE_NO_GIT,
  PREPARE_NO_RECEIPT,
} from "../web/home-preparation.mjs";
import { approvalCandidate, permissionPresentation } from "../web/thread-projection.mjs";
import { createWorkspaceCard, PREPARE_SCOPE } from "../web/workspace-card.mjs";
import { withTinyDom, flush } from "./tiny-dom.mjs";
import { boot } from "./helpers.mjs";
import { createSyntheticRepository } from "./fixtures/synthetic-repo/create-synthetic-repo.mjs";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const field = (body, key) =>
  [...body.querySelectorAll("button,input,summary,details")].find(
    (node) => node.getAttribute("data-repository-field") === key,
  );
async function settle() { await flush(); await flush(); await flush(); }

/* ── a scripted Host, so a reply can be lost on purpose ─────────────────── */

const ROOT_PATH = "/synthetic/parcel";
const HEAD = "58503f3df3af56163e02d98461aaa8b305481fef";

function scriptedHost({ projectId = null } = {}) {
  const calls = [];
  const state = { session: null, bindRequests: new Map(), candidateRequests: new Map() };
  let drop = null;
  const snapshot = () => structuredClone(state.session);
  async function request(path, options = {}) {
    const body = options.body ?? null;
    calls.push({ path, method: options.method || "GET", body: body ? structuredClone(body) : null });
    const lose = () => {
      if (drop && drop(path, body)) throw Object.assign(new Error("connection lost"), { name: "TypeError" });
    };
    if (path === "/sessions" && options.method === "POST") {
      // The Host is idempotent on the client-chosen id.
      if (!state.session || state.session.id !== body.sessionId) {
        state.session = {
          id: body.sessionId, projectId: body.projectId ?? null, title: body.title,
          permissionMode: body.permissionMode,
          repositoryBinding: null, repositoryBindingRevision: 0,
          repositoryCandidate: null, repositoryCandidateRevision: 0,
        };
      }
      lose();
      return { session: snapshot() };
    }
    if (path.endsWith("/repository-binding") && options.method === "PUT") {
      if (!state.bindRequests.has(body.requestId)) {
        state.bindRequests.set(body.requestId, true);
        state.session.repositoryBindingRevision += 1;
        state.session.repositoryBinding = { id: "b1", rootPath: body.rootPath, revision: state.session.repositoryBindingRevision, status: "active" };
      }
      lose();
      return { receipt: { operation: "bind" } };
    }
    if (path.startsWith("/repositories/inspect")) {
      lose();
      return { rootPath: ROOT_PATH, available: true, git: { branch: "main", head: HEAD, detached: false } };
    }
    if (path.endsWith("/repository-candidate") && options.method === "PUT") {
      if (!state.candidateRequests.has(body.requestId)) {
        state.candidateRequests.set(body.requestId, true);
        state.session.repositoryCandidateRevision += 1;
        state.session.repositoryCandidate = {
          id: body.candidateId, status: "active", revision: state.session.repositoryCandidateRevision,
          sourceBindingId: "b1", sourceBindingRevision: state.session.repositoryBinding.revision,
          baseCommit: body.baseCommit, objectFormat: "sha1", writeRevision: 0, createdAt: "2026-09-20T00:00:00.000Z",
        };
      }
      lose();
      return { receipt: { operation: "create" } };
    }
    if (/^\/sessions\/[^/]+$/.test(path)) { lose(); return { session: snapshot() }; }
    throw new Error(`the prepared journey asked for ${options.method || "GET"} ${path}`);
  }
  let seq = 0;
  return {
    request, calls, state,
    projectId,
    newId: () => `id-${++seq}`,
    loseRepliesTo(match) { drop = match; },
    keepReplies() { drop = null; },
    commandsFor: (needle) => calls.filter((call) => call.path.includes(needle) && call.method !== "GET"),
  };
}

/* ── 1 · preparing before any inference ─────────────────────────────────── */

test("preparing makes a chat, a binding and a candidate, and asks for no run", async () => {
  const host = scriptedHost();
  const marker = { projectId: null, commandId: "c1", sessionId: null, session: null };
  const persisted = [];
  const session = await prepareChat({
    request: host.request, marker, rootPath: ROOT_PATH, title: "parcel",
    permissionMode: "ask", newId: host.newId,
    persist: () => persisted.push(structuredClone(marker)),
  });
  assert.deepEqual(
    host.calls.map((call) => `${call.method} ${call.path.split("?")[0]}`),
    [
      "POST /sessions",
      // Reconcile: what does the Host hold before anything else is decided?
      `GET /sessions/${marker.sessionId}`,
      `PUT /sessions/${marker.sessionId}/repository-binding`,
      `GET /sessions/${marker.sessionId}`,
      "GET /repositories/inspect",
      `PUT /sessions/${marker.sessionId}/repository-candidate`,
      `GET /sessions/${marker.sessionId}`,
    ],
    "three commands, a reconcile, and the read-backs between them, in that order",
  );
  assert.equal(host.calls.some((call) => call.path.includes("/runs")), false, "no run is admitted");
  assert.equal(session.repositoryBinding.rootPath, ROOT_PATH);
  assert.equal(session.repositoryCandidate.status, "active");
  assert.equal(session.repositoryCandidate.baseCommit, HEAD, "the base commit is the folder's live HEAD");
  assert.equal(session.repositoryCandidate.writeRevision, 0);
  // Every identity reached the marker before the command that used it went out.
  const before = (key) => persisted.findIndex((snap) => snap[key]);
  assert.ok(before("sessionId") >= 0 && before("bindRequestId") >= 0 && before("candidateRequestId") >= 0 && before("candidateId") >= 0);
  assert.ok(before("sessionId") < before("bindRequestId"));
  assert.ok(before("bindRequestId") < before("candidateRequestId"));
});

test("a reply lost at any step is replayed against the same identities, never repeated", async () => {
  for (const step of ["/sessions", "/repository-binding", "/repository-candidate"]) {
    const host = scriptedHost();
    const marker = { projectId: null, commandId: "c1", sessionId: null, session: null };
    const options = {
      request: host.request, marker, rootPath: ROOT_PATH, title: "parcel",
      permissionMode: "ask", newId: host.newId, persist: () => {},
    };
    // The command reaches the Host and its effect lands; only the answer is lost.
    host.loseRepliesTo((path, body) => path.endsWith(step) && Boolean(body));
    await assert.rejects(prepareChat(options), /connection lost/, `${step} should surface the lost reply`);
    const identities = {
      sessionId: marker.sessionId, bindRequestId: marker.bindRequestId,
      candidateRequestId: marker.candidateRequestId, candidateId: marker.candidateId,
    };
    // What a refresh does: the same persisted marker, retried.
    host.keepReplies();
    const session = await prepareChat(options);
    for (const [key, value] of Object.entries(identities))
      if (value) assert.equal(marker[key], value, `${key} is reused after the lost reply at ${step}`);
    assert.equal(host.commandsFor("/sessions").filter((call) => call.path === "/sessions").length <= 2, true);
    assert.equal(host.state.session.id, marker.sessionId, "one chat");
    assert.equal(host.state.bindRequests.size, 1, `one binding after a lost reply at ${step}`);
    assert.equal(host.state.candidateRequests.size, 1, `one candidate after a lost reply at ${step}`);
    assert.equal(session.repositoryBindingRevision, 1, "the folder was bound exactly once");
    assert.equal(session.repositoryCandidateRevision, 1, "the candidate was created exactly once");
  }
});

test("preparing again over a finished preparation is a no-op, and a half-done one finishes", async () => {
  const host = scriptedHost();
  const marker = { projectId: null, commandId: "c1", sessionId: null, session: null };
  const options = { request: host.request, marker, rootPath: ROOT_PATH, title: "parcel", permissionMode: "ask", newId: host.newId };
  await prepareChat(options);
  const commandsAfter = () => host.calls.filter((call) => call.method !== "GET").length;
  const before = commandsAfter();
  await prepareChat(options);
  assert.equal(commandsAfter(), before, "no command is sent when all three already exist");
  assert.equal(host.calls.at(-1).method, "GET", "it only asks the Host what it holds, and finds nothing owed");

  // A preparation that stopped after the chat resumes at the folder.
  const resumed = scriptedHost();
  const half = { projectId: null, commandId: "c2", sessionId: null, session: null };
  resumed.loseRepliesTo((path) => path.endsWith("/repository-binding"));
  await assert.rejects(prepareChat({ ...options, request: resumed.request, marker: half, newId: resumed.newId }));
  resumed.keepReplies();
  const session = await prepareChat({ ...options, request: resumed.request, marker: half, newId: resumed.newId });
  assert.equal(resumed.calls.filter((call) => call.path === "/sessions").length, 1, "the chat is not created twice");
  assert.equal(session.repositoryCandidate.status, "active");
});

test("preparing refuses without a folder, without a commit, and without a matching receipt", async () => {
  const host = scriptedHost();
  await assert.rejects(
    prepareChat({ request: host.request, marker: { projectId: null }, rootPath: "", title: "t", permissionMode: "ask" }),
    new RegExp(PREPARE_NO_FOLDER.slice(0, 20)),
  );
  assert.equal(host.calls.length, 0, "nothing is sent");

  const noGit = scriptedHost();
  const original = noGit.request;
  const marker = { projectId: null, commandId: "c1", sessionId: null, session: null };
  await assert.rejects(
    prepareChat({
      request: (path, options) => (path.startsWith("/repositories/inspect")
        ? Promise.resolve({ available: true, git: null })
        : original(path, options)),
      marker, rootPath: ROOT_PATH, title: "t", permissionMode: "ask", newId: noGit.newId,
    }),
    new RegExp(PREPARE_NO_GIT.slice(0, 20)),
  );
  assert.equal(noGit.commandsFor("/repository-candidate").length, 0, "no candidate is asked for");
  assert.ok(marker.session, "the chat and its folder stay; only the candidate is missing");
  assert.equal(marker.candidateId, undefined, "and no candidate identity was minted");

  const wrong = scriptedHost();
  await assert.rejects(
    prepareChat({
      request: async (path, options) => {
        const answer = await wrong.request(path, options);
        return path === "/sessions" ? { session: { ...answer.session, id: "someone-else" } } : answer;
      },
      marker: { projectId: null, commandId: "c1", sessionId: null, session: null },
      rootPath: ROOT_PATH, title: "t", permissionMode: "ask", newId: wrong.newId,
    }),
    new RegExp(PREPARE_NO_RECEIPT.slice(0, 20)),
  );
});

test("the Home card offers preparation only with a folder and an owner, and says what it makes", () => withTinyDom(async (body) => {
  const request = async (path) => (path === "/repositories/recent" ? { entries: [] } : {});
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  let prepared = 0;
  const draft = { path: ROOT_PATH, onChange: () => {}, onPrepare: () => { prepared++; }, preparing: false, locked: false };
  card.render(body, { session: null, active: false, draft, events: [] });
  assert.ok(body.textContent.includes(PREPARE_SCOPE), "pressing it creates the chat, and says so");
  assert.match(PREPARE_SCOPE, /Nothing is sent and no model is called/, "and says what it does not do");
  field(body, "start-edits").click();
  assert.equal(prepared, 1);
  // Locked (an unconfirmed create, or no connection) offers no command.
  card.render(body, { session: null, active: false, draft: { ...draft, locked: true }, events: [] });
  assert.equal(field(body, "start-edits").disabled, true);
  // No owner to call: the section is not drawn rather than drawn dead.
  card.render(body, { session: null, active: false, draft: { path: ROOT_PATH, onChange: () => {} }, events: [] });
  assert.equal(field(body, "start-edits"), undefined);
  // No folder staged: there is nothing to prepare for.
  card.render(body, { session: null, active: false, draft: { ...draft, path: null }, events: [] });
  assert.equal(field(body, "start-edits"), undefined);
}));

test("Home wiring: the prepared chat is the card's session, keeps its own events, and starts no run", async () => {
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  assert.match(app, /function preparedHomeChat\(\) \{\s*return state\.homeStart\?\.session\?\.id \? state\.homeStart\.session : null;/);
  assert.match(app, /draft: home && !prepared \? homeWorkspaceDraft\(\) : null,/, "a prepared chat is a Session, not a draft");
  assert.match(app, /events: session && session\.id === state\.activeSessionId \? state\.events : \[\],/,
    "a prepared chat must not borrow the loaded chat's write events");
  assert.match(app, /onPrepare: \(\) => prepareHomeChat\(\),/);
  /* The sequence and its decisions moved into home-preparation.mjs (round 2);
     what must stay true of them is asserted there. Here: preparing admits no
     Run and spends nothing of the person's input, wherever it lives. */
  const { readFileSync: read } = await import("node:fs");
  const owner = read(`${root}app/web/home-preparation.mjs`, "utf8");
  assert.doesNotMatch(owner, /submitSessionRun|\/runs/, "preparing never admits a Run");
  assert.doesNotMatch(owner, /draftText = ""|attachments/, "and never spends the draft or its materials");
  assert.match(owner, /marker\.prepared = true/);
  const prepare = app.slice(app.indexOf("async function prepareHomeChat"), app.indexOf("function paintWorkspaceCard"));
  assert.doesNotMatch(prepare, /submitSessionRun|\/runs/);
  // The marker's identities survive a refresh.
  assert.match(app, /candidateRequestId: start\.candidateRequestId \|\| null, candidateId: start\.candidateId \|\| null,/);
  assert.match(app, /prepared: Boolean\(start\.prepared\),/);
  // A deliberate preparation does not borrow the failed-send banner.
  assert.match(app, /const prepared = state\.homeStart\?\.prepared \? preparedHomeChat\(\) : null;/);
  assert.match(app, /Nothing was sent; send to start work in them/);
});

test("a real Host prepares a chat, a binding and a candidate with no run and no events", async (t) => {
  const dir = await mkdtemp(nodePath.join(tmpdir(), "prepare-source-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const repo = await createSyntheticRepository(dir);
  // The Host resolves the folder it binds; on macOS the temp dir is a symlink.
  repo.dir = await realpath(repo.dir);
  const host = await boot({ configureFakeCredential: false });
  t.after(() => host.runtime.close());
  /* The same transport shape app.mjs gives the sequence, over the real HTTP
   * surface: anything but 2xx is an error, exactly as the client's `request`
   * treats it. */
  const request = async (path, options = {}) => {
    const result = await host.api(options.method || "GET", path, options.body);
    if (result.status >= 300) throw Object.assign(new Error(result.json?.error?.message || `HTTP ${result.status}`), { status: result.status });
    return result.json;
  };
  const marker = { projectId: host.projectId, commandId: "c1", sessionId: null, session: null };
  const session = await prepareChat({
    request, marker, rootPath: repo.dir, title: "parcel", permissionMode: "ask",
  });
  assert.equal(session.repositoryBinding.status, "active");
  assert.equal(session.repositoryBinding.rootPath, repo.dir);
  assert.equal(session.repositoryCandidate.status, "active");
  assert.equal(session.repositoryCandidate.baseCommit, repo.head);
  assert.equal(session.repositoryCandidate.writeRevision, 0);
  // The part only the Host can answer: it took all three commands without a
  // Run ever existing, so nothing was inferred and nothing was charged.
  const events = await request(`/sessions/${session.id}/events?afterSeq=0`);
  assert.deepEqual(events.events, [], "a prepared chat has no events at all");
  // And preparing again over it is a no-op at the Host too.
  const again = await prepareChat({
    request, marker, rootPath: repo.dir, title: "parcel", permissionMode: "ask",
  });
  assert.equal(again.repositoryCandidate.id, session.repositoryCandidate.id);
  assert.equal(again.repositoryCandidateRevision, session.repositoryCandidateRevision);
});

/* ── 2 · what an approval says it was asked about ───────────────────────── */

const WRITE_PAYLOAD = {
  toolCallId: "call-1", tool: "repo_write", path: "src/parcel.mjs", bytes: 445,
  contentSha256: "a".repeat(64), preview: "…", expectedSha256: "b".repeat(64),
  candidateId: "94b0a209-9cea-4a20-a48e-c150db854861", candidateRevision: 1, candidateWriteRevision: 0,
  sourceBindingId: "b1", sourceBindingRevision: 1,
};
const CHECK_PAYLOAD = {
  toolCallId: "call-2", tool: "check_run", path: "*", bytes: 24,
  contentSha256: "c".repeat(64), preview: '{"recipeId":"node-test"}',
  recipeId: "node-test", recipeVersion: 1, command: "/usr/bin/node", argv: ["--test"],
  cwd: "private candidate", candidateId: "94b0a209-9cea-4a20-a48e-c150db854861",
  candidateWriteRevision: 1, timeoutMs: 120000, outputLimitBytes: 65536,
};

test("a write approval reports the candidate and the revision it was bound to", () => {
  const write = permissionPresentation(WRITE_PAYLOAD, null);
  assert.deepEqual(write.candidate, { id: WRITE_PAYLOAD.candidateId, revision: 1, writeRevision: 0 });
  // The existing readings are untouched.
  assert.equal(write.title, "Approve this file write?");
  assert.match(write.scope, /^Private candidate · replaces the file whose hash starts bbbbbbbbbbbb/);
});

test("a check approval reports the write revision it will run against, and no revision it was never given", () => {
  const check = permissionPresentation(CHECK_PAYLOAD, null);
  assert.deepEqual(check.candidate, { id: CHECK_PAYLOAD.candidateId, revision: null, writeRevision: 1 });
  assert.equal(check.candidate.revision, null, "check_run carries no candidateRevision and must not be shown one");
  assert.equal(check.title, "Approve this check?");
  assert.equal(check.scope, "node --test · in the private candidate · 120 s · 64 KiB per stream · minimal environment");
});

test("an approval with no recorded candidate has no candidate reading, and zero is not absent", () => {
  assert.equal(approvalCandidate({ tool: "ws_write", path: "notes.md" }), null);
  assert.equal(permissionPresentation({ ...WRITE_PAYLOAD, tool: "ws_write", candidateId: undefined }, null).candidate, null);
  assert.equal(approvalCandidate({ candidateId: "" }), null);
  // A recorded zero is a fact and stays one; a missing field stays missing.
  assert.deepEqual(approvalCandidate({ candidateId: "c", candidateWriteRevision: 0 }), { id: "c", revision: null, writeRevision: 0 });
  assert.deepEqual(approvalCandidate({ candidateId: "c", candidateWriteRevision: "1" }), { id: "c", revision: null, writeRevision: null });
});

test("the reading is the recorded payload's, never the candidate as it is now", () => {
  const recorded = permissionPresentation(WRITE_PAYLOAD, null).candidate;
  // The same payload read again with a different runtime catalogue in hand:
  // nothing outside the payload can reach this reading.
  const afterwards = permissionPresentation(WRITE_PAYLOAD, {
    resources: [{ id: "tool:repo_write" }],
  }).candidate;
  assert.deepEqual(afterwards, recorded);
  const projection = readFileSync(`${root}app/web/thread-projection.mjs`, "utf8");
  const fn = projection.slice(projection.indexOf("export function approvalCandidate"), projection.indexOf("// Names are display facts"));
  assert.doesNotMatch(fn, /session|binding|state\./, "it reads the payload and nothing else");
});

test("the recorded identity is drawn on the open request and on the record the transcript keeps", () => {
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  assert.match(app, /function recordedApprovalIdentity\(candidate\) \{/, "one reading, used in both places");
  assert.match(app, /line\("Private candidate", element\("code", \{ text: candidate\.id \}\)\);/);
  assert.match(app, /if \(candidate\.revision !== null\) line\("Candidate revision"/, "an absent revision is not drawn");
  assert.match(app, /As recorded when this approval was requested\./);
  const render = app.slice(app.indexOf("function renderPermission(row) {"));
  const resolvedBranch = render.slice(0, render.indexOf("const card = element(\"article\""));
  const openCard = render.slice(render.indexOf("const card = element(\"article\""));
  assert.match(resolvedBranch, /details\.append\(\.\.\.recordedApprovalIdentity\(display\.candidate\)\);/,
    "a decided request keeps saying what it was bound to");
  assert.match(openCard, /\.\.\.recordedApprovalIdentity\(display\.candidate\),/,
    "and so does the one still waiting for a decision");
});
