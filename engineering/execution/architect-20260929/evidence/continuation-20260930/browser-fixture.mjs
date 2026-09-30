// Disposable browser evidence fixture. The parent owns browser actions;
// this process owns only its temporary Host/repository roots and output files.
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--checkout" || args[2] !== "--output-dir") {
  throw new Error("Usage: node browser-fixture.mjs --checkout ABSOLUTE_TREE --output-dir NEW_TMP_DIRECTORY");
}
const checkout = await realpath(path.resolve(args[1]));
const git = promisify(execFile);
const gitOptions = { cwd: checkout, env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0" } };
const { stdout: head } = await git("git", ["rev-parse", "HEAD"], gitOptions);
const { stdout: status } = await git("git", ["status", "--porcelain=v1", "--untracked-files=normal"], gitOptions);
const sourceHead = head.trim();
const sourceDirty = status.length > 0;
const output = path.resolve(args[3]);
const temporaryRoot = await realpath(tmpdir());
const outputParent = await realpath(path.dirname(output));
const inside = (root, value) => value.startsWith(root + path.sep);
if (!(outputParent === temporaryRoot || inside(temporaryRoot, outputParent))) {
  throw new Error("Output parent must be an existing directory under the system temporary directory");
}
// An exclusive directory prevents overwriting another evidence producer.
await mkdir(output);
const load = (relative) => import(pathToFileURL(path.join(checkout, relative)).href);
const { boot } = await load("app/tests/helpers.mjs");
const { createSyntheticRepository } = await load("app/tests/fixtures/synthetic-repo/create-synthetic-repo.mjs");
const sourceRoot = await mkdtemp(path.join(temporaryRoot, "cw-browser-source-"));
let host;
let metadata;
let closing;

async function cleanup() {
  closing ??= (async () => {
    try {
      if (host) {
        await host.runtime.close();
        if (metadata) {
          const runs = host.runtime.store.snapshot().runs.map(({ id, sessionId, status }) => ({ id, sessionId, status }));
          await writeFile(path.join(output, "fixture-results.json"), JSON.stringify({ runs, closed: true }, null, 2));
        }
      }
    } finally {
      if (host) await rm(host.dataDir, { recursive: true, force: true });
      await rm(sourceRoot, { recursive: true, force: true });
    }
  })();
  return closing;
}
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => cleanup().then(() => process.exit(0), () => process.exit(1)));
}

function requireOk(reply, operation) {
  if (reply.status !== 200) throw new Error(`${operation}: HTTP ${reply.status}, ${reply.json?.error?.code ?? "unexpected_response"}`);
  return reply.json;
}
async function run(session, commandId, input) {
  return requireOk(await host.api("POST", `/sessions/${session.id}/runs`, { commandId, input }), "create Run").run;
}
async function settledAndReleased(runId) {
  const settled = await host.pollRun(runId, { timeoutMs: 15000 });
  // Persisted terminal status precedes pending-question cleanup and release.
  const deadline = Date.now() + 15000;
  while (host.runtime.service.active.has(runId)) {
    if (Date.now() >= deadline) throw new Error("Terminal Run was not released by the service");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return settled;
}

try {
  const source = await createSyntheticRepository(path.join(sourceRoot, "repository"));
  host = await boot({ logger: () => {} });
  const ordinary = await host.createSession({ title: "Browser fixture: ordinary Local test chat" });
  const normal = await run(ordinary, "browser-normal", "Synthetic Local test greeting for browser inspection.");
  await settledAndReleased(normal.id);

  const uncertain = await host.createSession({ title: "Browser fixture: unknown outcome (synthetic RuntimePort)" });
  const pi = host.runtime.service.runtimePort;
  // Use the production admission/settlement path, not fabricated Store rows.
  // The override performs no model request or external effect; its sole fault
  // is an explicitly unknown runtime outcome with the ordinary run.error event.
  host.runtime.service.runtimePort = {
    ...pi,
    openSession(input) {
      const native = pi.openSession(input);
      return { ...native, async start() {
        return {
          abort() {},
          steer() {},
          getUsage: () => null,
          run: async () => ({ status: "unknown", errorCode: "browser_fixture_unknown", errorMessage: "Synthetic runtime outcome could not be confirmed; do not repeat an uncertain effect." }),
        };
      } };
    },
  };
  let unknown;
  try {
    unknown = await run(uncertain, "browser-unknown", "Inspect this synthetic unknown outcome.");
    const settled = await settledAndReleased(unknown.id);
    if (settled.status !== "unknown") throw new Error("Synthetic RuntimePort did not settle unknown");
  } finally {
    host.runtime.service.runtimePort = pi;
  }

  const cancelled = await host.createSession({ title: "Browser fixture: cancelled Local test run" });
  const slow = await run(cancelled, "browser-cancel", "/fixture slow synthetic cancellation");
  requireOk(await host.api("POST", `/runs/${slow.id}/cancel`, {}), "cancel Run");
  const cancelOutcome = await settledAndReleased(slow.id);

  const coding = await host.createSession({ title: "Browser fixture: approve private-candidate package check", permissionMode: "ask" });
  requireOk(await host.api("PUT", `/sessions/${coding.id}/repository-binding`, {
    operation: "bind", requestId: "browser-bind", expectedRevision: 0, rootPath: source.dir,
  }), "bind repository");
  const candidateId = "8611a4c2-3c91-4b6e-8a74-60870ec8bc24";
  requireOk(await host.api("PUT", `/sessions/${coding.id}/repository-candidate`, {
    operation: "create", requestId: "browser-candidate", expectedRevision: 0, expectedBindingRevision: 1,
    candidateId, baseCommit: source.head,
  }), "create candidate");
  const check = await run(coding, "browser-check", host.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test" } }]));
  await host.pollRun(check.id, { timeoutMs: 15000, until: (status) => status === "waiting_user" });
  const events = requireOk(await host.api("GET", `/sessions/${coding.id}/events`), "read events").events;
  const permission = events.find((event) => event.runId === check.id && event.type === "permission.open" && event.data.tool === "check_run");
  if (!permission) throw new Error("Check reached waiting_user without its approval event");

  metadata = {
    url: host.runtime.url,
    pid: process.pid,
    sourceHead,
    sourceDirty,
    synthetic: true,
    provider: "Local test fake provider only",
    sessions: { ordinary: ordinary.id, unknown: uncertain.id, cancelled: cancelled.id, coding: coding.id },
    runs: { normal: normal.id, unknown: unknown.id, cancelled: slow.id, approval: check.id },
    cancelStatus: cancelOutcome.status,
    candidateId,
    questionId: permission.data.id,
    sourceCommit: source.head,
    initialCheck: "Known synthetic pagination bug; approving node-test is expected to produce a failing check, not a failed Run",
    cleanup: "SIGTERM/SIGINT closes this Host and removes its private temporary data/repository roots. Only output evidence remains. No user Host or shared checkout is touched.",
  };
  await writeFile(path.join(output, "fixture-info.json"), JSON.stringify(metadata, null, 2));
  console.log("BROWSER FIXTURE READY " + host.runtime.url);
  console.log(JSON.stringify(metadata));
  // The real HTTP server keeps the process alive until the parent ends it.
} catch (error) {
  await cleanup();
  throw error;
}
