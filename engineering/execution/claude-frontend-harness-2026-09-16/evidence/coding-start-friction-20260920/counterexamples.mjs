/* Counterexamples against an unmodified app tree.
 *   node ce2.mjs /absolute/path/to/app
 * Nothing is written into that tree; every module is loaded by absolute URL. */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const APP = path.resolve(process.argv[2]);
const load = (rel) => import(pathToFileURL(path.join(APP, rel)).href);
const { createWorkspaceCard, REPOSITORY_HELP } = await load("web/workspace-card.mjs");
const { createAgentProfilesController } = await load("web/agent-profiles.mjs");
const { createAgentProfilesView } = await load("web/agent-profiles-view.mjs");
const { withTinyDom, flush, deferred } = await load("tests/tiny-dom.mjs");

const field = (body, key) => [...body.querySelectorAll("button,input")].find(n => n.getAttribute("data-repository-field") === key);
const settle = async () => { await flush(); await flush(); await flush(); };
const say = (id, held, observed) => console.log(`\n[${id}]\n  claim the product holds : ${held}\n  observed at this tree   : ${observed}`);

console.log(`app tree: ${APP}`);

const BINDING = { id: "b1", rootPath: "/synthetic/parcel", device: "1", inode: "2", revision: 1, status: "active" };
const CANDIDATE = { id: "cand-1", status: "active", revision: 1, sourceBindingId: "b1", sourceBindingRevision: 1,
  baseCommit: "c8310f06ef6022f0b1dbe6f2b6b1bbbf0f3c5a11", objectFormat: "sha1", writeRevision: 0, createdAt: "2026-09-20T00:00:00.000Z" };
const bound = { id: "s1", permissionMode: "ask", repositoryBindingRevision: 1, repositoryCandidateRevision: 0, repositoryCandidate: null, repositoryBinding: BINDING };
const withCandidate = { ...bound, repositoryCandidateRevision: 1, repositoryCandidate: CANDIDATE };
const CONFIRMED_WRITE = { seq: 41, sessionId: "s1", runId: "run-1", type: "repository.write.confirmed",
  data: { effectId: "e1", requestId: "r1", candidateId: "cand-1", path: "src/parcel.mjs", contentSha256: "a".repeat(64), bytes: 445, writeRevision: 1 } };

/* CE-1 · the Host has confirmed write revision 1; the card and the dialog
 * heading both read the cached Session field and still say 0. */
await withTinyDom(async body => {
  const card = createWorkspaceCard({ request: async p => (p === "/repositories/recent" ? { entries: [] } : {}), onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  card.render(body, { session: withCandidate, active: false, events: [CONFIRMED_WRITE] });
  const writes = /Writes\s*(\d+)/.exec(body.textContent)?.[1];
  const app = readFileSync(path.join(APP, "web/app.mjs"), "utf8");
  const heading = /\$\("candidate-base"\)\.textContent = ([^;]*);/.exec(app)?.[1];
  say("CE-1 stale write count",
    `Host repository.write.confirmed carries writeRevision ${CONFIRMED_WRITE.data.writeRevision}; GET /repository-candidate/diff returns writeRevision in the same reply that draws the patch`,
    `Workspace card reads "Writes ${writes}" with that event in hand; app.mjs heading is ${heading}`);
  console.log(`  does any app/web module consume repository.write.confirmed? ${app.includes("repository.write.confirmed") || readFileSync(path.join(APP, "web/workspace-card.mjs"), "utf8").includes("repository.write.confirmed") ? "yes" : "no"}`);
  console.log(`  is the heading refreshed from the diff reply?                ${/candidate-base"\)\.textContent = [\s\S]{0,200}result\.writeRevision/.test(app) ? "yes" : "no"}`);
});

/* CE-2 · Start private candidate disables the control under the keyboard; the
 * card only restores focus it can still see, so the page keeps it. */
await withTinyDom(async body => {
  const request = async p => {
    if (p.startsWith("/repositories/inspect")) return { rootPath: BINDING.rootPath, available: true, git: { branch: "main", head: CANDIDATE.baseCommit, detached: false } };
    if (p === "/repositories/recent") return { entries: [] };
    return {};
  };
  const card = createWorkspaceCard({ request, onSession: async () => { card.render(body, { session: withCandidate, active: false, events: [] }); }, onClose: () => {}, onReviewChanges: () => {} });
  card.render(body, { session: bound, active: false, events: [] });
  const start = field(body, "start-edits");
  start.focus();
  start.click();
  document.activeElement.blur(); // what the platform does when a focused control is disabled
  await settle();
  say("CE-2 focus after Start private candidate",
    "after a command the card keeps focus inside itself (workspace-card.mjs render(), focus capture)",
    `document.activeElement once the candidate exists: ${document.activeElement === null ? "null — the page" : document.activeElement.getAttribute("data-repository-field")}`);
});

/* CE-3 · two sentences measured against what the Host actually does. */
{
  const card = readFileSync(path.join(APP, "web/workspace-card.mjs"), "utf8");
  const service = readFileSync(path.join(APP, "server/service.mjs"), "utf8");
  const inspects = /async getRepositoryInspection[\s\S]{0,400}?statDirectoryWithin[\s\S]{0,200}?inspectRepositoryGitStatus/.test(service);
  say("CE-3 boundary copy",
    `${JSON.stringify(REPOSITORY_HELP)}; draft sentence ${JSON.stringify(/text: "(Connected when you send[^"]*)"/.exec(card)?.[1] ?? null)}`,
    `a staged folder is stat'd and its Git status read before any send (getRepositoryInspection does stat+git: ${inspects}); renderContextStrip calls it from Home to draw the Branch chip. Repository text a run reads goes on to the configured model.`);
}

/* CE-4 · the profile list keeps the previous reading with nothing said. */
await withTinyDom(async mount => {
  globalThis.document.body = mount.ownerDocument.createElement("body");
  const state = { name: "Before", pending: null };
  const rows = name => [{ id: "agent-1", name, responsibility: "Reads and drafts.", roleName: "General work", kitNames: ["Praxis"], runtimeName: "Pi", runtimeAvailability: "available", revision: 1, activeRun: null, nextAction: { label: "Open", targetId: "agent-1" } }];
  const runtime = { id: "rt-pi", name: "Pi", location: "This computer", availability: "available", unavailableReason: "", modelOwner: "courtwork", model: { effective: "Synthetic model", source: "Models", requested: null, note: "Synthetic." }, supportedActions: [], grants: {} };
  const adapter = {
    capabilities: () => ({ canSave: true, reason: "" }),
    async list() { const gate = deferred(); state.pending = { gate }; await gate.promise; return { rows: rows(state.name) }; },
    async open() { return { profile: { id: "agent-1", name: state.name, revision: 1, savedAt: "2026-09-20T12:00:00.000Z", roleId: "role-work", kitIds: [], runtimeId: "rt-pi", activeRun: null }, roles: [{ id: "role-work", name: "General work", purpose: "Drafts." }], kits: [], runtimes: [runtime] }; },
    async save() {}, async runtimeDetail() {},
  };
  const controller = createAgentProfilesController({ adapter });
  createAgentProfilesView(mount, controller);
  void controller.openList(); await settle();
  state.pending.gate.resolve(); await settle();
  state.name = "After";
  void controller.openList(); await settle();
  say("CE-4a stale rows while the read is out",
    "leaving a surface invalidates the reads it started (agent-profiles.mjs openList comment)",
    `list.status=${controller.getState().list.status}; the rendered rows still read ${JSON.stringify(mount.textContent.match(/Before|After/)?.[0])}; the pending read is marked in the DOM: ${mount.querySelector("[aria-busy]") ? "yes" : "no"}`);
  state.pending.gate.resolve(); await settle();

  void controller.openList(); await settle();
  const first = state.pending;
  void controller.openProfile("agent-1"); await settle();
  state.name = "Stale";
  first.gate.resolve(); await settle();
  say("CE-4b late list reply behind a newer navigation",
    "openList retires profileEpoch/saveEpoch/detailEpoch when it navigates; openProfile does not apply the symmetric rule",
    `after navigating into the profile, the older list read resolved and the list state is: status=${controller.getState().list.status}, rows=${JSON.stringify(controller.getState().list.rows.map(r => r.name))} (landed as the confirmed list: ${controller.getState().list.status === "ready" ? "yes" : "no"})`);
});
