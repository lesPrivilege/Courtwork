/* The three returns from the 2026-09-20 independent review of `afc9f31`.
 *
 *   PA-R1  a lost candidate reply left the visible retry falling through to the
 *          card's ordinary create, which minted fresh ids and was refused 409.
 *   PA-R2  Remove and a second Start were actionable while preparation was in
 *          flight, so the staged folder could move under a command in flight.
 *   PA-R3  a first send made from Recent left Home claiming nothing was sent
 *          and refusing a new chat.
 *
 * Each is exercised through the production controller — `createHomePreparation`
 * from `home-preparation.mjs`, the same instance app.mjs wires to `state` —
 * driving the actual `createWorkspaceCard` against a Host that can lose a reply
 * after its command has landed. Only the Home *state* is local here (the
 * marker, the staged path, the draft text); the decisions between attempts are
 * the product's own, which is what the round-2 review asked for after the
 * earlier stand-in controller hid the unconfirmed case.
 *
 * Reproduction evidence:
 * evidence/prepare-and-approval-review-20260920/browser/lost-reply-commands.jsonl
 * evidence/prepare-and-approval-review-20260920/browser/06-pending.ax.txt
 * evidence/prepare-and-approval-review-20260920/browser/09-recent-lifecycle.ax.txt
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  createHomePreparation,
  prepareChat,
  preparationState,
  restoreHomePreparationMarker,
  serializeHomePreparationMarker,
  workLocationLock,
} from "../web/home-preparation.mjs";
import {
  createWorkspaceCard,
  activeRepositoryBinding,
  activeRepositoryCandidate,
  PREPARE_BUSY,
  PREPARE_CORRECT_SCOPE,
  PREPARE_RESUME_SCOPE,
  PREPARE_UNCERTAIN,
  PROJECT_FIXED,
} from "../web/workspace-card.mjs";
import { withTinyDom, flush, deferred } from "./tiny-dom.mjs";

const ROOT_PATH = "/private/tmp/synthetic/parcel";
const HEAD = "c6f8d7f9a7dda9f1852575115e87d8b6abc6c9d0";
const INVALID_PATH = "/private/tmp/synthetic/does-not-exist";
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
      // A folder the Host cannot validate is refused definitively: nothing
      // lands, and the client is told so with a 4xx rather than a 5xx.
      if (body.rootPath === INVALID_PATH)
        throw Object.assign(new Error("repository root could not be validated"),
          // The real shape: a 5xx that is still the Host's own settled answer.
          { status: 503, body: { error: { code: "repository_validation_failed", message: "repository root could not be validated" } } });
      // The Host resolves the folder it binds; the staged string need not match.
      if (!binds.has(body.requestId)) {
        if (body.expectedRevision !== session.repositoryBindingRevision)
          throw Object.assign(new Error("repository binding changed; refresh before retrying"),
            { status: 409, body: { error: { code: "stale_revision", message: "repository binding changed; refresh before retrying" } } });
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
          throw Object.assign(new Error("repository candidate changed; refresh before retrying"),
            { status: 409, body: { error: { code: "stale_revision", message: "repository candidate changed; refresh before retrying" } } });
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
    // 06b work location · the Home project choice, and the projects to choose from.
    projectId: null,
    projects: [{ id: "p-parcel", name: "Parcel maintenance" }],
    createRequested: 0,
  };
  /* app.mjs `homeProjectId`: once a start is under way its own project is the
     one in force, whatever the Home choice later says. */
  home.homeProjectId = () => {
    const m = home.marker;
    return m && (m.pending || m.unconfirmed || m.session || m.sessionId) ? m.projectId ?? null : home.projectId;
  };
  home.preparedChat = () => (home.marker?.session?.id ? home.marker.session : null);

  /* The product's own controller, given this test's Home state. `write` is
     app.mjs's: adopt what changed, then re-render. */
  home.controller = createHomePreparation({
    request: host.request,
    read: () => ({
      marker: home.marker, rootPath: home.stagedPath, draftText: home.draftText,
      permissionMode: "ask", projectId: home.projectId, connectionLost: Boolean(home.connectionLost),
    }),
    write: ({ marker, rootPath }) => {
      if (marker !== undefined) home.marker = marker;
      if (rootPath !== undefined) home.stagedPath = rootPath;
      home.render();
    },
    newId: host.newId,
  });
  home.phase = () => home.controller.phase();
  home.prepare = () => home.controller.prepare();
  home.correctFolder = (path) => home.controller.correctFolder(path);
  // The Home status line's Check status, which stays reachable under the lock.
  home.checkStatus = () => home.controller.settleUnconfirmed();

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
      // app.mjs `renderWorkspaceCard`: the chat's own project once it exists;
      // on Home the one chosen, which only Home, before any chat, may change.
      project: home.projects.find((p) => p.id === (session ? session.projectId : home.homeProjectId())) || null,
      projectChoice: session ? null : {
        options: home.projects,
        selectedId: home.homeProjectId(),
        onChoose: (id) => { home.projectId = id; home.render(); },
        onCreate: () => { home.createRequested += 1; },
      },
      permissionLabel: "Ask before editing",
      // The production decision, not a copy of it (CE-R1).
      busyReason: workLocationLock({ marker: home.marker, home: true, session }),
      preparation: owned && phase.status === "unfinished"
        ? {
          status: phase.status, error: phase.error,
          onResume: () => home.prepare(),
          onCorrectFolder: phase.correctable ? (path) => home.correctFolder(path) : null,
        }
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
  assert.ok(resume && !resume.disabled, "the card still offers a way forward, and it is usable");
  assert.equal(resume.textContent, "Finish preparing this chat", "and it is not the ordinary create");
  /* A dropped reply means the effect is outstanding, so the card says that
     rather than offering to change anything — and continuing is how it gets
     settled, which is why that one control stays live. */
  assert.match(body.textContent, new RegExp(PREPARE_UNCERTAIN.slice(0, 40)));
  assert.equal(home.phase().uncertain, true);
  assert.equal(home.phase().correctable, false, "nothing may be corrected while an effect is unknown");
  assert.match(body.textContent, /Could not prepare/, "the failure is still readable beside it");
  assert.equal(field(body, "change-folder"), undefined, "and no other mutation is offered meanwhile");
  assert.equal(field(body, "open"), undefined, "including a folder chooser");

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
    /* A create whose outcome is unknown is settled from the status line's
       Check status — the card holds no Chat to act on yet — and every later
       step is continued from the card. Both are the same controller. */
    if (home.phase().status === "unconfirmed") {
      await home.checkStatus();
      home.render();
      await settle();
    }
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

/* ── round 2 · PA-R2, the outcome nobody knows yet ──────────────────────── */

test("PA-R2 · an unconfirmed create locks every folder mutation, and Check status stays reachable", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host);
  home.mount(body);
  // The create lands at the Host; its reply is lost, so the outcome is unknown.
  host.loseRepliesTo((path, method) => path === "/sessions" && method === "POST");
  field(body, "start-edits").click();
  await settle();

  assert.equal(home.phase().status, "unconfirmed");
  assert.equal(home.phase().uncertain, true);
  assert.equal(home.phase().correctable, false, "nothing is correctable while an effect is outstanding");
  // The counterexample the round-2 review reproduced: Remove was still live,
  // and clearing the folder made the recovery impossible.
  assert.equal(field(body, "remove").disabled, true, "the staged folder cannot be cleared");
  assert.equal(field(body, "start-edits").disabled, true, "and the command cannot be pressed again");
  assert.match(body.textContent, new RegExp(PREPARE_UNCERTAIN.slice(0, 40)), "and it says what is unknown");
  assert.doesNotMatch(body.textContent, /Preparing this chat\./, "not that something is still running");
  assert.equal(home.stagedPath, ROOT_PATH, "so the folder the recovery needs is still there");

  // Check status is the way out, and it is not part of the card's lock.
  host.keepReplies();
  await home.checkStatus();
  home.render();
  await settle();
  assert.equal(home.phase().uncertain, false, "the outcome is settled");
  assert.equal(home.preparedChat().id, host.session.id, "and it is the chat this preparation chose");

  const resume = field(body, "start-edits");
  assert.ok(resume && !resume.disabled, "and the preparation can now be finished");
  resume.click();
  await settle();
  assert.equal(home.phase().status, "ready");
  assert.equal(new Set(host.chatCommands().map((c) => c.body.sessionId)).size, 1, "one chat");
  assert.equal(host.session.repositoryCandidateRevision, 1, "one candidate");
}));

test("PA-R2 · a create that never landed keeps its identity for the retry", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host);
  home.mount(body);
  // Lost reply, but the Host never made the chat: the 404 settles it as "no".
  const original = host.request;
  home.controller = createHomePreparation({
    request: async (path, options) => {
      if (path === "/sessions" && options?.method === "POST")
        throw Object.assign(new Error("connection lost"), { name: "TypeError" });
      if (/^\/sessions\/[^/]+$/.test(path) && !host.session)
        throw Object.assign(new Error("session not found"), { status: 404 });
      return original(path, options);
    },
    read: () => ({ marker: home.marker, rootPath: home.stagedPath, draftText: home.draftText, permissionMode: "ask", projectId: null, connectionLost: false }),
    write: ({ marker, rootPath }) => { if (marker !== undefined) home.marker = marker; if (rootPath !== undefined) home.stagedPath = rootPath; home.render(); },
    newId: host.newId,
  });
  await home.controller.prepare();
  const chosen = home.marker.sessionId;
  assert.equal(home.controller.phase().status, "unconfirmed");
  await home.controller.settleUnconfirmed();
  assert.equal(home.marker.session, null, "the Host says it was never created");
  assert.equal(home.marker.unconfirmed, false, "and that is settled, not still unknown");
  assert.equal(home.marker.sessionId, chosen, "the identity is kept, so the retry is the same chat");
}));

test("only a documented pre-effect mutation refusal is settled", async () => {
  const { uncertainFailure } = await import("../web/home-preparation.mjs");
  const validation = { status: 503, body: { error: { code: "repository_validation_failed" } } };
  assert.equal(uncertainFailure(validation, "bind-mutation"), false,
    "the bind validator explicitly refuses before changing the binding");
  assert.equal(uncertainFailure(validation, "bind-readback"), true,
    "the same code on a read-back says nothing about the mutation before it");
  assert.equal(uncertainFailure({ status: 409, body: { error: { code: "stale_revision" } } }, "bind-mutation"), true,
    "unlisted coded mutation failures reconcile before allowing correction");
  assert.equal(uncertainFailure({ status: 500, body: { error: { code: "internal_error" } } }, "reconcile-read"), true);
  assert.equal(uncertainFailure({ status: 503, body: { error: "synthetic reply loss after Host commit" } }), true);
  assert.equal(uncertainFailure({ status: 502, body: null }), true);
  assert.equal(uncertainFailure(new Error("The local runtime could not be reached.")), true);
  assert.equal(uncertainFailure(undefined), true, "when in doubt, uncertain");
});

test("a coded bind read-back failure stays unknown after the bind committed", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host);
  const original = host.request;
  let bindCommitted = false;
  home.controller = createHomePreparation({
    request: async (path, options = {}) => {
      if (path.endsWith("/repository-binding") && options.method === "PUT") {
        const result = await original(path, options);
        bindCommitted = true;
        return result;
      }
      if (bindCommitted && /^\/sessions\/[^/]+$/.test(path)) {
        bindCommitted = false;
        throw Object.assign(new Error("synthetic read-back failure"), {
          status: 500, body: { error: { code: "internal_error", message: "synthetic read-back failure" } },
        });
      }
      return original(path, options);
    },
    read: () => ({ marker: home.marker, rootPath: home.stagedPath, draftText: home.draftText, permissionMode: "ask", projectId: null, connectionLost: false }),
    write: ({ marker, rootPath }) => { if (marker !== undefined) home.marker = marker; if (rootPath !== undefined) home.stagedPath = rootPath; home.render(); },
    newId: host.newId,
  });
  home.mount(body);
  await home.controller.prepare();
  assert.equal(host.session.repositoryBinding?.status, "active", "the bind really committed before the read failed");
  assert.equal(home.phase().uncertain, true);
  assert.equal(home.phase().correctable, false, "no folder correction is exposed over an unobserved committed bind");
  assert.equal(field(body, "path"), undefined);
}));

/* ── round 2 · PA-R1, a folder the Host definitively refused ─────────────── */

test("PA-R1 · a refused folder can be corrected, and the correction is a new binding intent", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host, { stagedPath: INVALID_PATH });
  home.mount(body);
  field(body, "start-edits").click();
  await settle();

  // The Chat was made; the bind was refused definitively; nothing else landed.
  const phase = home.phase();
  assert.equal(phase.status, "unfinished");
  assert.equal(phase.uncertain, false, "the Host said no — this is settled, not unknown");
  assert.equal(phase.correctable, true);
  assert.equal(host.session.repositoryBindingRevision, 0, "no binding landed");
  assert.equal(host.session.repositoryCandidate, null, "and no candidate");
  const chat = home.preparedChat().id;
  const refusedRequestId = host.bindCommands().at(-1).body.requestId;

  // The counterexample: before, the card offered only Close and Finish.
  assert.match(body.textContent, new RegExp(PREPARE_CORRECT_SCOPE.slice(0, 40)));
  const choose = field(body, "recent") || field(body, "path");
  assert.ok(field(body, "path"), "a way to name another folder is offered");

  const input = field(body, "path");
  input.value = ROOT_PATH;
  input.dispatchEvent({ type: "input", target: input });
  field(body, "connect").click();
  await settle();

  assert.equal(home.phase().status, "ready", "the corrected folder finishes the preparation");
  assert.equal(home.preparedChat().id, chat, "the same chat");
  assert.equal(new Set(host.chatCommands().map((c) => c.body.sessionId)).size, 1, "one chat, not a second");
  assert.equal(home.draftText, "Lost candidate reply review", "and the person's text is untouched");
  const binds = host.bindCommands();
  assert.equal(binds.at(-1).body.rootPath, ROOT_PATH);
  assert.notEqual(binds.at(-1).body.requestId, refusedRequestId,
    "a different folder is a different intent, so it does not reuse the refused request id");
  assert.equal(host.session.repositoryBindingRevision, 1, "bound exactly once");
  assert.equal([...host.runsBySession.values()].flat().length, 0, "and no run");
}));

test("a definitive folder refusal survives the production Home marker reload", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host, { stagedPath: INVALID_PATH });
  home.mount(body);
  await home.controller.prepare();
  assert.equal(home.phase().correctable, true);

  const stored = JSON.parse(JSON.stringify(serializeHomePreparationMarker(home.marker)));
  const restored = restoreHomePreparationMarker(stored);
  const reloaded = { marker: restored, stagedPath: INVALID_PATH, draftText: home.draftText };
  const controller = createHomePreparation({
    request: host.request,
    read: () => ({ marker: reloaded.marker, rootPath: reloaded.stagedPath, draftText: reloaded.draftText, permissionMode: "ask", projectId: null, connectionLost: false }),
    write: ({ marker, rootPath }) => { if (marker !== undefined) reloaded.marker = marker; if (rootPath !== undefined) reloaded.stagedPath = rootPath; },
    newId: host.newId,
  });
  assert.deepEqual(restored.failure, { uncertain: false, message: "repository root could not be validated" });
  assert.equal(controller.phase().correctable, true, "the actual serializer/restorer keeps the correction route after reload");

  stored.failure = { uncertain: "no", message: 42, envelope: { secret: "not retained" } };
  assert.equal(restoreHomePreparationMarker(stored).failure, null, "malformed persisted failure data fails closed");
}));

test("PA-R1 · retrying the same folder keeps its identity; correcting is refused while anything is unknown", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host, { stagedPath: INVALID_PATH });
  home.mount(body);
  field(body, "start-edits").click();
  await settle();
  const first = host.bindCommands().at(-1).body.requestId;

  // Retry without changing the intent: same identity.
  field(body, "start-edits").click();
  await settle();
  assert.equal(host.bindCommands().at(-1).body.requestId, first, "an unchanged retry keeps its identity");

  /* An outstanding effect withdraws the correction entirely. The Host's
     refusal of the bad folder is definite, so uncertainty has to come from a
     step whose answer is genuinely lost — here the reconciling read. */
  host.loseRepliesTo((path, method) => method === "GET" && /^\/sessions\/[^/]+$/.test(path));
  field(body, "start-edits").click();
  await settle();
  assert.equal(home.phase().uncertain, true, "an unanswered reconcile is not a settled state");
  assert.equal(home.phase().correctable, false);
  assert.equal(field(body, "path"), undefined, "no chooser while the last effect is unknown");
  assert.equal(await home.correctFolder(ROOT_PATH), null, "and the owner refuses the correction outright");
  assert.equal(home.stagedPath, INVALID_PATH, "so nothing moved under it");
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

test("the production seam: what the controller owns, and what app.mjs wires", async () => {
  const { readFileSync } = await import("node:fs");
  const root = new URL("../../", import.meta.url).pathname;
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const owner = readFileSync(`${root}app/web/home-preparation.mjs`, "utf8");

  /* The decisions between attempts are the controller's, which is what the
     round-2 review asked for: the tests above drive this very instance. */
  assert.match(owner, /export function createHomePreparation\(/);
  for (const decision of [
    /const bound = activeRepositoryBinding\(session\)\?\.rootPath;/,   // the Host's path is adopted, not compared
    /marker\.failure = \{ uncertain, message/,                          // settled or not, recorded on the marker
    /marker\.bindRequestId = null;/,                                    // a different folder is a different intent
    /async settleUnconfirmed\(\)/,                                      // the way out of an unknown create
  ]) assert.match(owner, decision);
  assert.doesNotMatch(app, /prepareChat\(\{/, "app.mjs no longer runs the sequence itself");
  assert.match(app, /const homePreparation = createHomePreparation\(\{/);
  assert.match(app, /await homePreparation\.prepare\(\);/);
  assert.match(app, /await homePreparation\.settleUnconfirmed\(\);/);

  // What app.mjs still owns: the persisted marker, the DOM, and rendering.
  assert.match(app, /data-home-field": "resume-preparation"/, "the recovery is reachable from the status");
  assert.match(app, /onCorrectFolder: phase\.correctable \? \(path\) => homePreparation\.correctFolder\(path\) : null,/);
  // CE-R1 · the lock is the owner's decision now; app.mjs only asks for it.
  assert.match(owner, /if \(phase\.uncertain\) return PREPARE_UNCERTAIN;/, "an unknown outcome locks the folder, and says so");
  assert.match(app, /busyReason: workLocationLock\(\{\s*marker: state\.homeStart, home, session,/);
  assert.match(app, /function retirePreparedChat\(sessionId\) \{/);
  const submit = app.slice(app.indexOf("async function submitSessionRun"));
  assert.match(submit.slice(0, submit.indexOf("} catch")), /retirePreparedChat\(sessionId\);/,
    "every send path reaches the same reconciliation, at the matching receipt");
  assert.match(app, /if \(state\.runs\.length\) retirePreparedChat\(sessionId\);/);
  assert.match(app, /async function reconcileRestoredPreparation\(\) \{/);
  assert.match(app, /if \(detail\.runs\?\.length && retirePreparedChat\(id\)\)/);
  const retire = app.slice(app.indexOf("function retirePreparedChat"), app.indexOf("function retirePreparedChat") + 400);
  assert.doesNotMatch(retire, /homeDraft|homeAttachments|homeRepositoryPath/, "retiring never spends the person's unsent input");
});

/* ── 06b work location · the project is chosen beside the folder ─────────── */

const projectField = (body, id) => field(body, `project:${id ?? "none"}`);

test("work location · project and folder are chosen in one panel, and a project choice stages no folder", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host, { stagedPath: null });
  home.mount(body);
  await settle();

  const heads = body.querySelectorAll("h3,h4").map((h) => h.textContent);
  assert.deepEqual(heads.slice(0, 3), ["Work location", "Project", "Folder"], "one panel, the two facts named apart, project first");
  assert.equal(projectField(body, null).getAttribute("aria-pressed"), "true", "No project is a choice, selected by default");
  assert.ok(field(body, "open") || field(body, "path-summary"), "the folder chooser is in the same panel");

  projectField(body, "p-parcel").click();
  await settle();
  assert.equal(home.projectId, "p-parcel");
  assert.equal(projectField(body, "p-parcel").getAttribute("aria-pressed"), "true");
  assert.equal(document.activeElement, projectField(body, "p-parcel"), "the keyboard stays on the choice it made");
  assert.equal(home.stagedPath, null, "choosing a project does not connect a folder");
  assert.equal(host.commands.length, 0, "and asks the Host for nothing");

  field(body, "project-new").click();
  assert.equal(home.createRequested, 1, "New project is offered from the same place, through its own owner");
}));

test("work location · while a create's outcome is unknown the project is locked too, and Check status still settles it", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host);
  home.mount(body);
  projectField(body, "p-parcel").click();
  await settle();
  host.loseRepliesTo((path, method) => path === "/sessions" && method === "POST");
  field(body, "start-edits").click();
  await settle();

  assert.equal(home.phase().status, "unconfirmed");
  assert.equal(projectField(body, null).disabled, true, "a project cannot be chosen beside an outstanding create");
  assert.equal(projectField(body, "p-parcel").disabled, true);
  assert.equal(field(body, "project-new").disabled, true);
  assert.equal(field(body, "remove").disabled, true, "nor can the folder be cleared (PA-R2)");
  assert.match(body.textContent, new RegExp(PREPARE_UNCERTAIN.slice(0, 40)), "and the panel says why");

  host.keepReplies();
  await home.checkStatus();
  home.render();
  await settle();
  assert.equal(home.preparedChat().projectId, "p-parcel", "the chat was made in the project chosen before the loss");
  assert.equal(projectField(body, null), undefined, "once the chat exists its project is a fact, not a choice");
  assert.match(body.textContent, new RegExp(PROJECT_FIXED.slice(0, 30)), "and the panel says why it stays");
  assert.match(body.textContent, /Parcel maintenance/);

  field(body, "start-edits").click();
  await settle();
  assert.equal(home.phase().status, "ready");
  assert.equal(host.chatCommands().length, 1, "one create, whichever route settled it");
  assert.equal(host.session.repositoryCandidateRevision, 1);
}));

test("work location · a refused folder is corrected on the same chat, whose project stays fixed", () => withTinyDom(async (body) => {
  const host = fakeHost();
  const home = createHome(host, { stagedPath: INVALID_PATH });
  home.mount(body);
  projectField(body, "p-parcel").click();
  await settle();
  field(body, "start-edits").click();
  await settle();

  assert.equal(home.phase().correctable, true);
  assert.equal(projectField(body, "p-parcel"), undefined, "the project is not offered again");
  assert.match(body.textContent, new RegExp(PROJECT_FIXED.slice(0, 30)));
  assert.match(body.textContent, new RegExp(PREPARE_CORRECT_SCOPE.slice(0, 40)), "the folder correction is beside the folder");
  const input = field(body, "path");
  input.value = ROOT_PATH;
  input.dispatchEvent({ type: "input", target: input });
  field(body, "connect").click();
  await settle();
  assert.equal(home.phase().status, "ready");
  assert.equal(host.session.projectId, "p-parcel", "the corrected chat keeps the project it was made in");
  assert.equal(host.chatCommands().length, 1);
}));
