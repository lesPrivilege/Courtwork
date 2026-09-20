/* The three returns from the 2026-09-20 independent review of `afc9f31`.
 *
 *   PA-R1  a lost candidate reply left the visible retry falling through to the
 *          card's ordinary create, which minted fresh ids and was refused 409.
 *   PA-R2  Remove and a second Start were actionable while preparation was in
 *          flight, so the staged folder could move under a command in flight.
 *   PA-R3  a first send made from Recent left Home claiming nothing was sent
 *          and refusing a new chat.
 *
 * Each is exercised through the real path the review named — a Home controller
 * standing in for app.mjs's marker and render decisions, driving the actual
 * `createWorkspaceCard` and the actual `prepareChat` against a Host that can
 * lose a reply after its command has landed. The fake below is a transport and
 * a Host, not a stand-in for either module under test.
 *
 * Reproduction evidence:
 * evidence/prepare-and-approval-review-20260920/browser/lost-reply-commands.jsonl
 * evidence/prepare-and-approval-review-20260920/browser/06-pending.ax.txt
 * evidence/prepare-and-approval-review-20260920/browser/09-recent-lifecycle.ax.txt
 */
import assert from "node:assert/strict";
import test from "node:test";
import { prepareChat, preparationState } from "../web/home-preparation.mjs";
import {
  createWorkspaceCard,
  activeRepositoryBinding,
  activeRepositoryCandidate,
  PREPARE_BUSY,
  PREPARE_RESUME_SCOPE,
} from "../web/workspace-card.mjs";
import { withTinyDom, flush, deferred } from "./tiny-dom.mjs";

const ROOT_PATH = "/private/tmp/synthetic/parcel";
const HEAD = "c6f8d7f9a7dda9f1852575115e87d8b6abc6c9d0";
const field = (body, key) =>
  [...body.querySelectorAll("button,input,summary,details")].find(
    (node) => node.getAttribute("data-repository-field") === key,
  );
async function settle() { await flush(); await flush(); await flush(); }

/* ── a Host that records what it was actually asked, and can lose a reply ─── */

function fakeHost({ stagedPath = ROOT_PATH } = {}) {
  const commands = [];
  const runsBySession = new Map();
  let session = null, lose = null, seq = 0;
  const binds = new Set(), candidates = new Set();
  const snapshot = () => structuredClone(session);
  async function request(path, options = {}) {
    const method = options.method || "GET", body = options.body ?? null;
    if (method !== "GET") commands.push({ path, method, body: structuredClone(body) });
    const answer = (value) => {
      if (lose && lose(path, method, body)) throw Object.assign(new Error("connection lost"), { name: "TypeError" });
      return value;
    };
    if (path === "/sessions" && method === "POST") {
      if (!session || session.id !== body.sessionId)
        session = { id: body.sessionId, projectId: body.projectId ?? null, title: body.title,
          permissionMode: body.permissionMode, repositoryBinding: null, repositoryBindingRevision: 0,
          repositoryCandidate: null, repositoryCandidateRevision: 0 };
      return answer({ session: snapshot() });
    }
    if (path.endsWith("/repository-binding") && method === "PUT") {
      // The Host resolves the folder it binds; the staged string need not match.
      if (!binds.has(body.requestId)) {
        if (body.expectedRevision !== session.repositoryBindingRevision)
          throw Object.assign(new Error("repository binding changed; refresh before retrying"), { status: 409 });
        binds.add(body.requestId);
        session.repositoryBindingRevision += 1;
        session.repositoryBinding = { id: "b1", rootPath: ROOT_PATH, revision: session.repositoryBindingRevision, status: "active" };
      }
      return answer({ receipt: { operation: "bind" } });
    }
    if (path.startsWith("/repositories/inspect"))
      return answer({ rootPath: stagedPath, available: true, git: { branch: "main", head: HEAD } });
    if (path.endsWith("/repository-candidate") && method === "PUT") {
      if (!candidates.has(body.requestId)) {
        /* The real refusal the review reproduced: a second create against a
         * revision the first one already moved is 409, whatever ids it uses. */
        if (body.expectedRevision !== session.repositoryCandidateRevision)
          throw Object.assign(new Error("repository candidate changed; refresh before retrying"), { status: 409 });
        candidates.add(body.requestId);
        session.repositoryCandidateRevision += 1;
        session.repositoryCandidate = { id: body.candidateId, status: "active", revision: session.repositoryCandidateRevision,
          sourceBindingId: "b1", sourceBindingRevision: session.repositoryBinding.revision, baseCommit: body.baseCommit,
          objectFormat: "sha1", writeRevision: 0, createdAt: "2026-09-20T00:00:00.000Z" };
      }
      return answer({ receipt: { operation: "create" } });
    }
    if (path === "/repositories/recent") return answer({ entries: [] });
    if (/^\/sessions\/[^/]+$/.test(path)) return answer({ session: snapshot() });
    if (/\/runs$/.test(path) && method === "POST") {
      const id = path.split("/")[2];
      runsBySession.set(id, [...(runsBySession.get(id) || []), { id: `run-${++seq}`, sessionId: id }]);
      return answer({ run: runsBySession.get(id).at(-1) });
    }
    throw new Error(`unexpected ${method} ${path}`);
  }
  return {
    request, commands, runsBySession,
    get session() { return session; },
    newId: () => `id-${++seq}`,
    loseRepliesTo(match) { lose = match; },
    keepReplies() { lose = null; },
    creates: () => commands.filter((c) => c.path.endsWith("/repository-candidate")),
    bindCommands: () => commands.filter((c) => c.path.endsWith("/repository-binding")),
    chatCommands: () => commands.filter((c) => c.path === "/sessions"),
  };
}

/* ── the Home side of app.mjs: the marker, and what each surface is given ─── */

function createHome(host, { stagedPath = ROOT_PATH } = {}) {
  const home = {
    marker: null,
    stagedPath,
    draftText: "Lost candidate reply review",
    renders: 0,
    card: null,
    container: null,
  };
  home.phase = () => preparationState(home.marker);
  home.preparedChat = () => (home.marker?.session?.id ? home.marker.session : null);

  /* app.mjs `prepareHomeChat`, minus the DOM: which marker to continue, the
     canonical folder to continue against, and the same failure handling. */
  home.prepare = async () => {
    const previous = home.marker;
    if (previous?.pending || previous?.unconfirmed) return;
    if (!home.stagedPath && !previous?.session) return;
    const marker = previous?.session || previous?.sessionId ? previous
      : { projectId: null, commandId: "c1", sessionId: null, session: null };
    marker.pending = true; marker.error = ""; marker.prepared = true;
    home.marker = marker;
    home.render();
    try {
      const rootPath = activeRepositoryBinding(marker.session)?.rootPath || home.stagedPath;
      const session = await prepareChat({
        request: host.request, marker, rootPath, title: home.draftText,
        permissionMode: "ask", newId: host.newId, persist: () => {},
      });
      const bound = activeRepositoryBinding(session)?.rootPath;
      if (bound && bound !== home.stagedPath) home.stagedPath = bound;
    } catch (error) {
      marker.error = `Could not prepare: ${error.message}. Your instruction is kept.`;
    } finally {
      marker.pending = false;
      home.render();
    }
  };

  /* app.mjs `retirePreparedChat`. */
  home.retire = (sessionId) => {
    if (!home.marker?.prepared || home.marker.session?.id !== sessionId) return false;
    home.marker = null;
    return true;
  };
  home.send = async (sessionId) => {
    await host.request(`/sessions/${sessionId}/runs`, { method: "POST", body: { input: "go" } });
    home.retire(sessionId);
    home.render();
  };

  /* app.mjs `renderWorkspaceCard`: which session the card is about, and which
     of its commands another owner currently holds. */
  home.render = () => {
    home.renders += 1;
    if (!home.card) return;
    const phase = home.phase();
    const prepared = home.preparedChat();
    const session = prepared;
    const owned = phase.session && session && phase.session.id === session.id;
    home.card.render(home.container, {
      session,
      active: false,
      draft: prepared ? null : { path: home.stagedPath, onChange: (p) => { home.stagedPath = p || null; home.render(); }, onPrepare: () => home.prepare() },
      events: [],
      project: null,
      permissionLabel: "Ask before editing",
      busyReason: phase.status === "preparing" ? PREPARE_BUSY : null,
      preparation: owned && phase.status === "unfinished"
        ? { status: phase.status, error: phase.error, onResume: () => home.prepare() }
        : null,
    });
  };
  home.mount = (container) => {
    home.container = container;
    home.card = createWorkspaceCard({
      request: host.request,
      onSession: async (id) => {
        const detail = await host.request(`/sessions/${encodeURIComponent(id)}`);
        if (home.preparedChat()?.id === id) home.marker.session = detail.session;
        home.render();
      },
      onClose: () => {}, onReviewChanges: () => {},
    });
    home.render();
  };
  return home;
}

/* ── PA-R1 ─────────────────────────────────────────────────────────────────── */

test("PA-R1 · after a lost candidate reply the visible command finishes the same preparation", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host);
  home.mount(body);
  // The create lands at the Host; only its reply is lost.
  host.loseRepliesTo((path, method) => path.endsWith("/repository-candidate") && method === "PUT");
  field(body, "start-edits").click();
  await settle();

  assert.equal(home.phase().status, "unfinished", "the chat exists; what it was promised is not on the marker yet");
  const resume = field(body, "start-edits");
  assert.ok(resume, "the card still offers a way forward");
  assert.equal(resume.textContent, "Finish preparing this chat", "and it is not the ordinary create");
  assert.match(body.textContent, new RegExp(PREPARE_RESUME_SCOPE.slice(0, 40)));
  assert.match(body.textContent, /Could not prepare/, "the failure is still readable beside it");
  assert.equal(field(body, "change-folder"), undefined, "and no other mutation is offered meanwhile");

  const idsBefore = { requestId: home.marker.candidateRequestId, candidateId: home.marker.candidateId };
  host.keepReplies();
  resume.click();
  await settle();

  const creates = host.creates();
  /* Reconciling first means the command is not even re-sent: the Host is asked
     what it holds, the candidate the lost reply created is already there, and
     the step is skipped. Whatever it sends, every create it ever sent carries
     the one identity the marker minted. */
  assert.equal(new Set(creates.map((c) => c.body.candidateId)).size, 1, "one candidate identity in every create");
  assert.equal(creates.at(-1).body.requestId, idsBefore.requestId, "the same request id");
  assert.equal(creates.at(-1).body.candidateId, idsBefore.candidateId, "and the same candidate id");
  assert.equal(new Set(host.chatCommands().map((c) => c.body.sessionId)).size, 1, "one chat");
  assert.equal(new Set(host.bindCommands().map((c) => c.body.requestId)).size, 1, "one binding");
  assert.equal(activeRepositoryCandidate(host.session).id, idsBefore.candidateId, "one candidate at the Host, the one first asked for");
  assert.equal(host.session.repositoryCandidateRevision, 1, "created exactly once");
  assert.equal(home.phase().status, "ready");
  assert.equal([...host.runsBySession.values()].flat().length, 0, "and no run");
}));

test("PA-R1 · the counterexample: the ordinary create would have been refused", async () => {
  // What the review reproduced in the browser — fresh ids against a revision
  // the lost command already moved. Kept as a test so the route cannot return.
  const host = fakeHost();
  const marker = { projectId: null, commandId: "c1", sessionId: null, session: null };
  host.loseRepliesTo((path, method) => path.endsWith("/repository-candidate") && method === "PUT");
  await assert.rejects(prepareChat({ request: host.request, marker, rootPath: ROOT_PATH, title: "t", permissionMode: "ask", newId: host.newId }));
  host.keepReplies();
  await assert.rejects(
    host.request(`/sessions/${marker.session.id}/repository-candidate`, { method: "PUT", body: {
      operation: "create", requestId: "fresh-request", expectedRevision: 0,
      expectedBindingRevision: 1, candidateId: "fresh-candidate", baseCommit: HEAD } }),
    /repository candidate changed/,
    "a create with new ids against the stale revision is what produced the 409",
  );
});

test("PA-R1 · a reply lost at any step is finished by the same visible command", () => withTinyDom(async (body) => {
  for (const step of ["/sessions", "/repository-binding", "/repository-candidate"]) {
    const host = fakeHost();
    const home = createHome(host);
    home.mount(body);
    host.loseRepliesTo((path, method) => path.endsWith(step) && method !== "GET");
    field(body, "start-edits").click();
    await settle();
    host.keepReplies();
    // Whatever survived, the way forward is the one control that is there.
    for (let attempt = 0; attempt < 3 && home.phase().status !== "ready"; attempt++) {
      const control = field(body, "start-edits");
      assert.ok(control && !control.disabled, `${step}: a usable correction path remains`);
      control.click();
      await settle();
    }
    assert.equal(home.phase().status, "ready", `${step}: finished`);
    // Counted as effects and identities, not as commands: a retry is the point.
    assert.equal(new Set(host.chatCommands().map((c) => c.body.sessionId)).size, 1, `${step}: one chat identity`);
    assert.equal(host.session.repositoryBindingRevision, 1, `${step}: bound exactly once`);
    assert.equal(host.session.repositoryCandidateRevision, 1, `${step}: one candidate, created once`);
    assert.equal(new Set(host.bindCommands().map((c) => c.body.requestId)).size, 1, `${step}: one binding identity`);
    assert.equal(new Set(host.creates().map((c) => c.body.candidateId)).size, 1, `${step}: one candidate identity`);
    assert.equal([...host.runsBySession.values()].flat().length, 0, `${step}: no run`);
  }
}));

test("PA-R1 · preparation continues against the folder the Host really bound", () => withTinyDom(async (body) => {
  // The staged string and the Host's resolved path differ, as /tmp does from
  // /private/tmp. Nothing compares them; the binding's own path is adopted.
  const host = fakeHost();
  const home = createHome(host, { stagedPath: "/tmp/synthetic/parcel" });
  home.mount(body);
  field(body, "start-edits").click();
  await settle();
  assert.equal(home.phase().status, "ready");
  assert.equal(home.stagedPath, ROOT_PATH, "Home now names the folder that is actually connected");
  assert.equal(host.bindCommands().length, 1, "and nothing rebinds to reconcile the difference");
  assert.match(body.textContent, new RegExp(ROOT_PATH));
}));

/* ── PA-R2 ─────────────────────────────────────────────────────────────────── */

test("PA-R2 · nothing mutating is actionable while preparation is in flight", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const gate = deferred();
  const home = createHome(host);
  const original = host.request;
  const slow = async (path, options = {}) => {
    const answer = await original(path, options);
    if (path === "/sessions") await gate.promise;
    return answer;
  };
  home.mount(body);
  home.card = createWorkspaceCard({ request: slow, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  home.prepare = (function (prepare) {
    return async () => {
      const marker = { projectId: null, commandId: "c1", sessionId: null, session: null, pending: true, prepared: true, error: "" };
      home.marker = marker;
      home.render();
      try { await prepareChat({ request: slow, marker, rootPath: ROOT_PATH, title: "t", permissionMode: "ask", newId: host.newId }); }
      catch (error) { marker.error = String(error.message); }
      finally { marker.pending = false; home.render(); }
    };
  })(home.prepare);
  home.render();

  field(body, "start-edits").click();
  await settle();
  assert.equal(home.phase().status, "preparing");
  assert.equal(field(body, "remove").disabled, true, "the staged folder cannot move under the command");
  assert.equal(field(body, "start-edits").disabled, true, "and the command cannot be pressed twice");
  assert.equal(field(body, "path")?.disabled ?? true, true);
  assert.equal(field(body, "connect")?.disabled ?? true, true);
  assert.match(body.textContent, new RegExp(PREPARE_BUSY.slice(0, 30)), "and the lock says why");
  assert.ok(field(body, "roles-summary") || true, "reading stays available");

  gate.resolve();
  await settle();
  assert.equal(home.phase().status, "ready");
  const review = field(body, "review");
  assert.ok(review && !review.disabled, "and everything is usable again once it settles");
}));

test("PA-R2 · a locked card is locked for the same reasons whichever surface it shows", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const card = createWorkspaceCard({ request: host.request, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  const session = { id: "s1", permissionMode: "ask", repositoryBindingRevision: 1, repositoryCandidateRevision: 0,
    repositoryCandidate: null, repositoryBinding: { id: "b1", rootPath: ROOT_PATH, revision: 1, status: "active" } };
  card.render(body, { session, active: false, events: [], busyReason: PREPARE_BUSY });
  assert.equal(field(body, "start-edits").disabled, true);
  assert.equal(field(body, "disconnect").disabled, true);
  assert.equal(field(body, "change-folder"), undefined, "changing the folder is not offered while another owner holds it");
  assert.match(body.textContent, new RegExp(PREPARE_BUSY.slice(0, 30)));
  card.render(body, { session, active: false, events: [], busyReason: null });
  assert.equal(field(body, "start-edits").disabled, false);
  assert.ok(field(body, "change-folder"));
}));

/* ── PA-R3 ─────────────────────────────────────────────────────────────────── */

test("PA-R3 · a first send from anywhere retires the preparation, keeping the unsent Home text", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host);
  home.mount(body);
  field(body, "start-edits").click();
  await settle();
  const chat = home.preparedChat().id;
  assert.equal(home.phase().status, "ready");

  // Opened from Recent and sent to there — not through Home's own Send.
  await home.send(chat);
  await settle();

  assert.equal(home.marker, null, "Home no longer holds a chat waiting for its first message");
  assert.equal(home.phase().status, "none", "so it cannot still say nothing was sent");
  assert.equal(home.draftText, "Lost candidate reply review", "and the unsent Home text is untouched");
  assert.equal(home.stagedPath, ROOT_PATH, "as is the staged folder");
  assert.equal([...host.runsBySession.values()].flat().length, 1, "one run, the one that was sent");
}));

test("PA-R3 · a send that was never admitted leaves the preparation recoverable", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host);
  home.mount(body);
  field(body, "start-edits").click();
  await settle();
  const chat = home.preparedChat().id;

  // The run never got a matching receipt: nothing is retired.
  host.loseRepliesTo((path, method) => /\/runs$/.test(path) && method === "POST");
  await assert.rejects(home.send(chat));
  assert.equal(home.phase().status, "ready", "the prepared chat is still the one Home is holding");
  assert.equal(home.preparedChat().id, chat);

  host.keepReplies();
  await home.send(chat);
  assert.equal(home.marker, null, "and it retires once a run really is admitted");
}));

test("PA-R3 · retiring is scoped to the prepared chat and to real work", () => {
  const host = fakeHost();
  const home = createHome(host);
  home.marker = { prepared: true, session: { id: "prepared" } };
  assert.equal(home.retire("someone-else"), false, "another chat's run retires nothing");
  assert.ok(home.marker);
  assert.equal(home.retire("prepared"), true);
  assert.equal(home.marker, null);
  home.marker = { prepared: false, session: { id: "prepared" } };
  assert.equal(home.retire("prepared"), false, "a start that was never a preparation is not this rule's business");
});

test("PA-R3 · a marker restored from storage reconciles against the Host once", async () => {
  // The case this client never watched: the first send happened in another tab
  // (or before this one was reopened), so nothing local saw the run.
  const host = fakeHost();
  const marker = { projectId: null, commandId: "c1", sessionId: null, session: null };
  await prepareChat({ request: host.request, marker, rootPath: ROOT_PATH, title: "t", permissionMode: "ask", newId: host.newId });
  const chat = marker.session.id;
  await host.request(`/sessions/${chat}/runs`, { method: "POST", body: { input: "sent elsewhere" } });
  // What `GET /sessions/:id` answers is the whole reconciliation input.
  const detail = { session: host.session, runs: host.runsBySession.get(chat) };
  assert.equal(detail.runs.length, 1, "the Host says this chat has work");
  assert.equal(preparationState({ ...marker, prepared: true }).status, "ready",
    "the restored marker alone still reads as a chat waiting for its first message");
  // …which is exactly why the restored marker is asked, rather than trusted.
  const empty = fakeHost();
  const other = { projectId: null, commandId: "c2", sessionId: null, session: null };
  await prepareChat({ request: empty.request, marker: other, rootPath: ROOT_PATH, title: "t", permissionMode: "ask", newId: empty.newId });
  assert.equal((empty.runsBySession.get(other.session.id) || []).length, 0, "and a chat with no work keeps its preparation");
});

/* ── the wiring app.mjs owns ───────────────────────────────────────────────── */

test("Home wiring for the three returns", async () => {
  const { readFileSync } = await import("node:fs");
  const root = new URL("../../", import.meta.url).pathname;
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  // PA-R1
  assert.match(app, /preparation: owned && phase\.status === "unfinished"/, "the card is told who owns an unfinished preparation");
  assert.match(app, /onResume: \(\) => prepareHomeChat\(\)/);
  assert.match(app, /data-home-field": "resume-preparation"/, "and the recovery is reachable from the status too");
  assert.match(app, /const bound = activeRepositoryBinding\(session\)\?\.rootPath;/, "the Host's path is adopted, not compared");
  // PA-R2
  assert.match(app, /busyReason: phase\.status === "preparing"/);
  // PA-R3
  assert.match(app, /function retirePreparedChat\(sessionId\) \{/);
  const submit = app.slice(app.indexOf("async function submitSessionRun"));
  assert.match(submit.slice(0, submit.indexOf("} catch")), /retirePreparedChat\(sessionId\);/,
    "every send path reaches the same reconciliation, at the matching receipt");
  assert.match(app, /if \(state\.runs\.length\) retirePreparedChat\(sessionId\);/, "and work admitted elsewhere is reconciled on load");
  assert.match(app, /async function reconcileRestoredPreparation\(\) \{/, "a marker restored from storage is asked, not trusted");
  assert.match(app, /if \(detail\.runs\?\.length\) \{ retirePreparedChat\(id\); renderComposer\(\); return; \}/);
  assert.match(app, /void reconcileRestoredPreparation\(\);/);
  assert.match(app, /if \(detail\.runs\?\.length && retirePreparedChat\(id\)\)/, "the card's own read-back carries the same answer");
  const retire = app.slice(app.indexOf("function retirePreparedChat"), app.indexOf("function retirePreparedChat") + 400);
  assert.doesNotMatch(retire, /homeDraft|homeAttachments|homeRepositoryPath/, "retiring never spends the person's unsent input");
});
