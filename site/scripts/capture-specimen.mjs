#!/usr/bin/env node
// Capture the interactive specimen (PS-18).
//
// One synthetic session, two runs, recorded through the product's own HTTP
// surface — the same startServer / fake loopback provider / Core path that
// app/tests/helpers.mjs boot() and app/scripts/work-core-fixture.mjs use. The
// result is a single JSON file the published page replays offline. No provider
// key beyond the fake loopback constant is read, and no request leaves the
// machine.
//
//   node site/scripts/capture-specimen.mjs [--data-dir <dir>]
//
import { writeFile, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { startServer } from "../../app/server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../../app/runtime/pi-session-runtime.mjs";
import { NORMAL_FACTS, SYNTHETIC_SOURCES } from "../../app/domains/inbound-nda/fixtures.mjs";
import { buildReview } from "../../app/domains/inbound-nda/index.mjs";
import { release, ROOT, SITE } from "./release.mjs";

const TERMINAL = new Set(["completed", "failed", "cancelled", "unknown"]);

const args = process.argv.slice(2);
const dataDirFlag = args.indexOf("--data-dir");
const DATA_DIR = dataDirFlag === -1 ? "/private/tmp/se-agent-ps01-data" : args[dataDirFlag + 1];

const { source_sha: sourceSha, sha7 } = await release();

// The capture is repeatable, so the data directory is emptied rather than
// reused: leftover state would put facts in the specimen that this capture
// never recorded.
await rm(DATA_DIR, { recursive: true, force: true });
await mkdir(DATA_DIR, { recursive: true });

const runtime = await startServer({ dataDir: DATA_DIR, port: 0 });
const headers = { "content-type": "application/json", "x-work-token": runtime.token };

async function api(method, p, body) {
  const res = await fetch(runtime.url + "/api/v5" + p, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

function expect(result, what) {
  if (result.status !== 200) throw new Error(`${what} failed: ${result.status} ${JSON.stringify(result.json)}`);
  return result.json;
}

async function pollRun(runId, { timeoutMs = 20000, until = (status) => TERMINAL.has(status) } = {}) {
  const start = Date.now();
  let run = expect(await api("GET", `/runs/${runId}`), "read run").run;
  while (!until(run.status)) {
    if (Date.now() - start > timeoutMs) throw new Error(`run ${runId} stuck at ${run.status}`);
    await new Promise((r) => setTimeout(r, 25));
    run = expect(await api("GET", `/runs/${runId}`), "read run").run;
  }
  return run;
}

const scriptInput = (calls) => `/fixture script ${JSON.stringify(calls)}`;

// The one file this synthetic session writes. Its bytes are the file's
// identity on the page, so the text is fixed here rather than generated.
const SPECIMEN_FILE_TEXT = [
  "# Inbound NDA — review summary",
  "",
  "Synthetic material. Confidentiality term and governing law are carried from",
  "the bound source revision; the counterparty entity is still open.",
  "",
  "- Confidentiality term: 3 years from disclosure",
  "- Governing law: England and Wales",
  "- Counterparty entity: open",
  "",
].join("\n");

/** Wait for the run to park on a question or permission card and return it. */
async function waitForOpen(sessionId, runId, type) {
  const start = Date.now();
  for (;;) {
    const { events } = expect(await api("GET", `/sessions/${sessionId}/events?afterSeq=0`), "read events");
    const open = events.find((e) => e.runId === runId && e.type === type);
    if (open) return open;
    if (Date.now() - start > 20000) throw new Error(`no ${type} for run ${runId}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

const specimen = {};

try {
  await api("PUT", "/provider-credential", { provider: "fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
  const project = expect(await api("POST", "/projects", { name: "Inbound NDA" }), "create project").project;

  // ---- one session, permissionMode "ask" so a write is actually asked for --
  const session = expect(
    await api("POST", "/sessions", {
      projectId: project.id,
      title: "Synthetic inbound NDA",
      permissionMode: "ask",
    }),
    "create session",
  ).session;
  specimen.session = session;

  // ---- Run A · a write that must be approved, then a question -------------
  const runA = expect(
    await api("POST", `/sessions/${session.id}/runs`, {
      commandId: "specimen-run-a",
      input: scriptInput([
        { name: "ws_write", arguments: { path: "out/nda-summary.md", text: SPECIMEN_FILE_TEXT } },
        { name: "ask_user", arguments: { prompt: "Which counterparty entity should the summary name?" } },
      ]),
    }),
    "create run A",
  ).run;

  const permission = await waitForOpen(session.id, runA.id, "permission.open");
  specimen.permission = permission;
  expect(await api("POST", `/runs/${runA.id}/questions/${permission.data.id}`, { decision: "allow" }), "allow the write");

  const question = await waitForOpen(session.id, runA.id, "question.open");
  specimen.question = question;
  expect(
    await api("POST", `/runs/${runA.id}/questions/${question.data.id}`, { answer: "Northwind Logistics Ltd." }),
    "answer the question",
  );

  const runAFinal = await pollRun(runA.id);
  specimen.runs = { [runA.id]: runAFinal };
  // afterSeq walks forward, so each run's slice is captured once and the two
  // slices concatenate back into the session's whole history.
  let afterSeq = 0;
  specimen.events = { [runA.id]: expect(await api("GET", `/sessions/${session.id}/events?afterSeq=${afterSeq}`), "events after run A") };
  afterSeq = specimen.events[runA.id].nextSeq;
  specimen.context = { [runA.id]: expect(await api("GET", `/runtime-context?sessionId=${session.id}&runId=${runA.id}`), "context of run A") };

  // ---- the file the run left behind --------------------------------------
  specimen.workspace = expect(await api("GET", `/sessions/${session.id}/workspace`), "workspace tree");
  specimen.workspaceFiles = {};
  for (const entry of specimen.workspace.tree ?? []) {
    specimen.workspaceFiles[entry.path] = expect(
      await api("GET", `/sessions/${session.id}/workspace/file?path=${encodeURIComponent(entry.path)}`),
      `workspace file ${entry.path}`,
    );
  }

  // ---- Run B · bind the matter, then submit a candidate -------------------
  expect(await api("POST", "/extensions/inbound-nda/lifecycle", { action: "load" }), "load inbound-nda");
  expect(
    await api("POST", `/sessions/${session.id}/extension`, {
      extensionId: "inbound-nda",
      input: { title: "Synthetic inbound NDA", sourceText: SYNTHETIC_SOURCES[0].text, facts: NORMAL_FACTS },
    }),
    "bind inbound-nda",
  );
  const bound = expect(await api("GET", `/sessions/${session.id}/surface`), "surface after binding");
  specimen.surface = { bound };

  const domain = buildReview({ sources: bound.projection.sources, facts: bound.projection.domain.facts });
  const runB = expect(
    await api("POST", `/sessions/${session.id}/runs`, {
      commandId: "specimen-run-b",
      input: scriptInput([{ name: "se_submit_candidate", arguments: { domain } }]),
    }),
    "create run B",
  ).run;
  const runBFinal = await pollRun(runB.id);
  specimen.runs[runB.id] = runBFinal;
  specimen.events[runB.id] = expect(await api("GET", `/sessions/${session.id}/events?afterSeq=${afterSeq}`), "events after run B");
  specimen.context[runB.id] = expect(
    await api("GET", `/runtime-context?sessionId=${session.id}&runId=${runB.id}`),
    "context of run B",
  );
  specimen.surface.pending = expect(await api("GET", `/sessions/${session.id}/surface`), "surface pending");

  // ---- the human decisions ------------------------------------------------
  const decision = {
    extensionId: "inbound-nda",
    generation: specimen.surface.pending.extension.generation,
    action: "decide",
    payload: {
      request_id: "specimen-human-accept",
      candidate_id: specimen.surface.pending.projection.candidates[0].id,
      base_version: 0,
      action: "accept",
      reason: "Synthetic human fixture decision",
    },
  };
  specimen.decision = decision;
  expect(await api("POST", `/sessions/${session.id}/actions`, decision), "accept the candidate");
  specimen.surface.accepted = expect(await api("GET", `/sessions/${session.id}/surface`), "surface accepted");

  const revisionAction = specimen.surface.accepted.projection.humanActions.find((a) => a.action === "revise_candidate");
  if (revisionAction?.schemaVersion !== 1) throw new Error("versioned revision action missing");
  const properties = revisionAction.payloadSchema.properties;
  const revision = {
    extensionId: "inbound-nda",
    generation: specimen.surface.accepted.extension.generation,
    action: revisionAction.action,
    payload: {
      candidate_id: properties.candidate_id.const,
      new_candidate_id: "specimen-human-revision",
      base_version: properties.base_version.const,
      proposal: { domain },
    },
  };
  specimen.revision = revision;
  expect(await api("POST", `/sessions/${session.id}/actions`, revision), "revise the candidate");
  specimen.surface.revised = expect(await api("GET", `/sessions/${session.id}/surface`), "surface revised");

  // ---- the producer leaves; the history stays readable --------------------
  expect(await api("POST", "/extensions/inbound-nda/lifecycle", { action: "unload" }), "unload inbound-nda");
  specimen.surface.history = expect(await api("GET", `/sessions/${session.id}/surface`), "surface history");
  if (runtime.registry.instances.has("inbound-nda")) throw new Error("producer retained after unload");
} finally {
  await runtime.close();
}

// ---- write ----------------------------------------------------------------
const record = {
  schemaVersion: 1,
  specimenVersion: 1,
  dataClass: "synthetic; actual HTTP/Pi loopback/Core; no real provider",
  source_sha: sourceSha,
  capture_command: "node site/scripts/capture-specimen.mjs",
  runOrder: Object.keys(specimen.runs),
  ...specimen,
};

const bytes = JSON.stringify(record, null, 2) + "\n";
const target = path.join(SITE, "specimen", `${sha7}.json`);
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, bytes);

// The evidence-contract fields live beside the recording, not inside it: the
// recording has to stay byte-comparable between two captures, and a capture
// date is by definition not.
const receipt = {
  id: "specimen",
  kind: "interactive-fixture",
  file: path.relative(ROOT, target),
  sha256: createHash("sha256").update(bytes).digest("hex"),
  bytes: Buffer.byteLength(bytes),
  source_sha: sourceSha,
  capture_date: new Date().toISOString().slice(0, 10),
  capture_command: "node site/scripts/capture-specimen.mjs",
  dataClass: record.dataClass,
  data_kind: "synthetic",
  provider_mode: "local deterministic fake (fake-openai-loopback)",
  data_dir: DATA_DIR,
};
await writeFile(path.join(SITE, "specimen", "capture.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
