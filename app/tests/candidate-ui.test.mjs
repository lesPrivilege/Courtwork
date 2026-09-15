import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseUnifiedPatch, diffSummary } from "../web/diff-view.mjs";
import { permissionPresentation } from "../web/thread-projection.mjs";
import { createWorkspaceCard, CANDIDATE_NO_GIT } from "../web/workspace-card.mjs";
import { withTinyDom, flush } from "./tiny-dom.mjs";

const root = new URL("../../", import.meta.url).pathname;
const field = (body, key) => [...body.querySelectorAll("button,input")].find(e => e.getAttribute("data-repository-field") === key);
async function settle() { await flush(); await flush(); await flush(); }

const PATCH = [
  "diff --git a/src/parcel.mjs b/src/parcel.mjs",
  "index 1111111..2222222 100644",
  "--- a/src/parcel.mjs",
  "+++ b/src/parcel.mjs",
  "@@ -3,4 +3,4 @@ export function pageCount(count, perPage) {",
  "   if (!Number.isInteger(count) || count < 0) throw new RangeError(\"count\");",
  "-  return Math.floor(count / perPage);",
  "+  return Math.ceil(count / perPage);",
  " }",
  "diff --git a/NOTES.md b/NOTES.md",
  "new file mode 100644",
  "index 0000000..3333333",
  "--- /dev/null",
  "+++ b/NOTES.md",
  "@@ -0,0 +1,2 @@",
  "+fixed",
  "+pagination",
  "\\ No newline at end of file",
].join("\n");

test("parseUnifiedPatch splits a git patch into files with numbered rows the diff view understands", () => {
  const files = parseUnifiedPatch(PATCH);
  assert.deepEqual(files.map(f => [f.path, f.status]), [["src/parcel.mjs", "modified"], ["NOTES.md", "added"]]);
  const rows = files[0].lines;
  assert.deepEqual(rows.map(r => r.kind), ["context", "del", "add", "context"]);
  assert.equal(rows[1].oldNo, 4); assert.equal(rows[2].newNo, 4); assert.equal(rows[3].oldNo, 5); assert.equal(rows[3].newNo, 5);
  assert.equal(files[1].lines.at(-1).noNewline, true);
  assert.deepEqual(diffSummary(files[0].lines), { added: 1, removed: 1, total: 4 });
  assert.deepEqual(parseUnifiedPatch(""), []);
});

test("A repo_write approval names the private candidate and the exact prior state", () => {
  const base = { toolCallId: "c1", path: "src/parcel.mjs", bytes: 120, contentSha256: "a".repeat(64), preview: "…" };
  const replace = permissionPresentation({ ...base, tool: "repo_write", expectedSha256: "b".repeat(64) }, null);
  assert.equal(replace.title, "Approve this file write?");
  assert.equal(replace.target, "src/parcel.mjs");
  assert.match(replace.scope, /^Private candidate · replaces the file whose hash starts bbbbbbbbbbbb/);
  const create = permissionPresentation({ ...base, tool: "repo_write", expectedSha256: null }, null);
  assert.equal(create.scope, "Private candidate · new file");
  assert.equal(permissionPresentation({ ...base, tool: "ws_write" }, null).scope, null, "managed workspace writes keep their card");
});

const bound = { id: "s1", repositoryBindingRevision: 1, repositoryCandidateRevision: 0, repositoryCandidate: null,
  repositoryBinding: { id: "b1", rootPath: "/synthetic/parcel", device: "1", inode: "2", revision: 1, status: "active" } };
const withCandidate = { ...bound, repositoryCandidateRevision: 1,
  repositoryCandidate: { id: "cand-1", status: "active", revision: 1, sourceBindingId: "b1", sourceBindingRevision: 1, baseCommit: "7c8dd3fc8709d0927f2f6c0fa29352ddae8dab02", objectFormat: "sha1", writeRevision: 2, createdAt: "2026-09-16T00:00:00.000Z" } };

test("Start private candidate reads the folder's HEAD from the Host and creates the candidate from that commit", () => withTinyDom(async body => {
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push({ path, body: options.body });
    if (path.startsWith("/repositories/inspect")) return { rootPath: "/synthetic/parcel", available: true, git: { branch: "main", head: "7c8dd3fc8709d0927f2f6c0fa29352ddae8dab02", detached: false } };
    if (path === "/repositories/recent") return { entries: [] };
    return {};
  };
  const seen = [];
  const card = createWorkspaceCard({ request, onSession: async id => { seen.push(id); card.render(body, { session: withCandidate, active: false }); }, onClose: () => {}, onReviewChanges: () => {} });
  card.render(body, { session: bound, active: false });
  assert.ok(field(body, "start-edits"));
  assert.equal(field(body, "stop-edits"), undefined);
  field(body, "start-edits").click(); await settle();
  const create = calls.find(c => c.path === "/sessions/s1/repository-candidate");
  assert.deepEqual(Object.keys(create.body).sort(), ["baseCommit", "candidateId", "expectedBindingRevision", "expectedRevision", "operation", "requestId"]);
  assert.equal(create.body.operation, "create");
  assert.equal(create.body.baseCommit, "7c8dd3fc8709d0927f2f6c0fa29352ddae8dab02");
  assert.equal(create.body.expectedBindingRevision, 1);
  assert.equal(create.body.expectedRevision, 0);
  assert.deepEqual(seen, ["s1"]);
  assert.ok(body.textContent.includes("from 7c8dd3fc8709") && body.textContent.includes("Writes"));
  assert.ok(field(body, "review") && field(body, "stop-edits"));
}));

test("A folder without a commit cannot start a candidate; nothing is sent", () => withTinyDom(async body => {
  const calls = [];
  const request = async (path, options = {}) => { calls.push({ path, body: options.body }); if (path.startsWith("/repositories/inspect")) return { available: true, git: null }; return { entries: [] }; };
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: bound, active: false });
  field(body, "start-edits").click(); await settle();
  assert.equal(calls.some(c => c.path.endsWith("/repository-candidate")), false);
  assert.equal(body.querySelector(".inline-error")?.textContent, CANDIDATE_NO_GIT);
}));

test("Stop edits revokes with both revisions; Review changes hands off to the dialog", () => withTinyDom(async body => {
  const calls = []; let reviewed = 0;
  const request = async (path, options = {}) => { calls.push({ path, body: options.body }); return path === "/repositories/recent" ? { entries: [] } : {}; };
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => { reviewed++; } });
  card.render(body, { session: withCandidate, active: false });
  field(body, "review").click();
  assert.equal(reviewed, 1);
  field(body, "stop-edits").click(); await settle();
  const revoke = calls.find(c => c.path === "/sessions/s1/repository-candidate");
  assert.deepEqual(Object.keys(revoke.body).sort(), ["candidateId", "expectedBindingRevision", "expectedRevision", "operation", "requestId"]);
  assert.equal(revoke.body.operation, "revoke");
  assert.equal(revoke.body.candidateId, "cand-1");
  assert.equal(revoke.body.expectedRevision, 1);
  card.render(body, { session: withCandidate, active: true });
  assert.equal(field(body, "stop-edits").disabled, true);
}));

test("Shell wiring for the candidate changes dialog", () => {
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const overview = readFileSync(`${root}app/web/workspace-view.mjs`, "utf8");
  assert.match(html, /<dialog id="candidate-dialog" class="runtime-dialog" aria-labelledby="candidate-title">/);
  assert.match(app, /request\(`\/sessions\/\$\{encodeURIComponent\(session\.id\)\}\/repository-candidate\/diff`\)/);
  assert.match(app, /"close-candidate-button": \["x", "Close changes"\]/);
  assert.match(app, /onReviewChanges: session\.repositoryCandidate\?\.status === "active" \? go\(\(\) => void openCandidateDiff\(\)\) : null/);
  assert.match(overview, /row\("chevron-right", "Review changes", onReviewChanges\)/);
});
