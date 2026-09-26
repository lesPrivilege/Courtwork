#!/usr/bin/env node
// Order 3 · backend streaming audit (Host side). Boots real Hosts on
// throwaway data with the local fake provider and checks the assistant segment
// contract over the public HTTP API: C1 slow reply, C2 text + tool in one
// message, C4 cancel, C5a provider failure with the Host alive, C5b process
// crash and recovery, C10 durable size at a fixed length and timing.
// No external model, credential or user data.
//
//   node app/scripts/stream-audit.mjs [--out <file.json>]
//
// The `--serve <dataDir> <port>` form is this script's own child Host for C5b.
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";
import { SNAPSHOT_INTERVAL_MS } from "../server/assistant-stream.mjs";

const here = fileURLToPath(import.meta.url);
const arg = (name) => { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1]; };
const LONG = "Streaming audit paragraph with steady content. ".repeat(213).slice(0, 10000); // C10: fixed 10,000 characters
// C10 bound: about 1.5x the measured 2026-09-26 baseline (deltaEvents 177,120;
// stateFileGrowth 253,584), far below uncoalesced (2,091,664 snapshot text bytes).
const C10_BOUND = { deltaEvents: 266_000, stateFileGrowth: 380_000 };
const SLOW = Array.from({ length: 30 }, (_, i) => `Synthetic slow paragraph ${i + 1}.`).join("\n\n");
const toolCount = (body) => { const m = body?.messages ?? []; let start = 0; for (let i = m.length - 1; i >= 0; i--) if (m[i]?.role === "user") { start = i + 1; break; } return m.slice(start).filter((x) => x?.role === "tool").length; };
function fakeResponder({ body, mode }) {
  const id = `audit-${Math.random().toString(36).slice(2)}`, created = Math.floor(Date.now() / 1000);
  if (mode.startsWith("C2") && toolCount(body) === 0) return { kind: "mixed", id, created, chunkMs: 40, text: "I will list the workspace first, then summarize.", toolCallId: `c2-${id}`, name: "ws_list", arguments: {} };
  if (mode.startsWith("C2")) return { kind: "text", id, created, chunkMs: 40, text: "The workspace is empty; nothing else to report." };
  if (mode.startsWith("C5a")) return { kind: "text", id, created, chunkMs: 60, failAfterChunks: 8, text: SLOW };
  if (mode.startsWith("C10")) return { kind: "text", id, created, chunkMs: 20, text: LONG };
  return { kind: "text", id, created, chunkMs: 100, text: SLOW };
}

async function configure(url, token) {
  const headers = { "content-type": "application/json", "x-work-token": token };
  const { version } = await (await fetch(`${url}/api/v5/provider-config`, { headers })).json();
  for (const [route, body] of [["/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY }], ["/provider-config", { expectedVersion: version, provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" }]]) {
    const r = await fetch(`${url}/api/v5${route}`, { method: "PUT", headers, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${route} ${r.status}`);
  }
}

if (arg("--serve")) {
  const [dataDir, port] = [arg("--serve"), Number(process.argv[process.argv.indexOf("--serve") + 2])];
  const runtime = await startServer({ dataDir, port, fakeResponder, logger: () => {} });
  if (process.argv.includes("--configure")) await configure(runtime.url, runtime.token);
  console.log(JSON.stringify({ url: runtime.url, token: runtime.token }));
} else {
  const results = [];
  const record = (id, pass, detail) => { results.push({ id, pass: Boolean(pass), ...detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${JSON.stringify(detail).slice(0, 260)}`); };
  const client = (url, token) => {
    const api = async (method, p, body) => { const r = await fetch(`${url}/api/v5${p}`, { method, headers: { "content-type": "application/json", "x-work-token": token }, body: body === undefined ? undefined : JSON.stringify(body) }); return r.json(); };
    return {
      api,
      async start(input) { const { session } = await api("POST", "/sessions", { title: input.slice(0, 40) }); const { run } = await api("POST", `/sessions/${session.id}/runs`, { input, commandId: crypto.randomUUID() }); return { session, run }; },
      async follow(sessionId, { until = (s) => !["running", "stopping"].includes(s), onEvent = () => {}, timeoutMs = 60000 } = {}) {
        const t0 = Date.now(); let after = 0; const seen = []; let firstTextAt = null, terminalAt = null;
        while (Date.now() - t0 < timeoutMs) {
          const page = await api("GET", `/sessions/${sessionId}/events?afterSeq=${after}`);
          for (const e of page.events ?? []) { after = Math.max(after, e.seq); seen.push(e); if (e.type === "assistant.delta" && firstTextAt === null) firstTextAt = Date.now() - t0; await onEvent(e, seen); if (e.type === "run.status" && until(e.data.status)) terminalAt = Date.now() - t0; }
          if (terminalAt !== null) break;
          await new Promise((r) => setTimeout(r, 120));
        }
        return { events: seen, firstTextAt, terminalAt };
      },
    };
  };
  const assistants = (events) => events.filter((e) => e.type === "assistant.delta" || e.type === "assistant.message");
  const dirs = [];
  const tempDir = async () => { const d = await mkdtemp(path.join(tmpdir(), "cw-stream-audit-")); dirs.push(d); return d; };
  try {
    const hostDir = await tempDir();
    const host = await startServer({ dataDir: hostDir, port: 0, fakeResponder, logger: () => {} });
    await configure(host.url, host.token);
    const c = client(host.url, host.token);

    // C1 · slow single reply
    { const { session } = await c.start("C1 slow reply");
      const { events, firstTextAt, terminalAt } = await c.follow(session.id);
      const deltas = events.filter((e) => e.type === "assistant.delta"); const finals = events.filter((e) => e.type === "assistant.message");
      const growing = deltas.every((d, i) => i === 0 || d.data.text.length >= deltas[i - 1].data.text.length);
      record("C1-text-before-terminal-and-final-authoritative", firstTextAt !== null && firstTextAt < terminalAt && growing && finals.length === 1 && finals[0].data.text === SLOW && assistants(events).every((e) => e.data.segment === 0),
        { firstTextAt, terminalAt, deltas: deltas.length, finalEqualsSource: finals[0]?.data.text === SLOW }); }

    // C2 · text + tool in one assistant message, then more text
    { const { session } = await c.start("C2 mixed message");
      const { events } = await c.follow(session.id);
      const order = events.map((e) => e.type === "assistant.delta" ? `Δ${e.data.segment}` : e.type === "assistant.message" ? `M${e.data.segment}${e.data.partial ? "p" : ""}(${e.data.stopReason})` : e.type.startsWith("tool.") ? e.type : null).filter(Boolean).join(" ").replace(/(Δ(\d) )+/g, (m, _x, s) => `Δ${s}… `);
      const m0 = events.find((e) => e.type === "assistant.message" && e.data.segment === 0); const m1 = events.find((e) => e.type === "assistant.message" && e.data.segment === 1);
      record("C2-mixed-message-keeps-segment-0-text-and-opens-segment-1", m0?.data.text === "I will list the workspace first, then summarize." && m0?.data.stopReason === "toolUse" && m1?.data.text === "The workspace is empty; nothing else to report." && !events.some((e) => e.data?.partial), { order }); }

    // C4 · cancel mid-reply
    { const { session, run } = await c.start("C4 cancel me");
      let cancelled = false;
      const { events } = await c.follow(session.id, { onEvent: async (e, seen) => { if (!cancelled && seen.filter((x) => x.type === "assistant.delta").length >= 3) { cancelled = true; await c.api("POST", `/runs/${run.id}/cancel`, {}); } } });
      const finals = events.filter((e) => e.type === "assistant.message"); const lastDelta = events.filter((e) => e.type === "assistant.delta").at(-1);
      const terminal = events.find((e) => e.type === "run.status" && e.data.status === "cancelled");
      const partialBeforeTerminal = finals.length === 1 && finals[0].seq < terminal?.seq;
      record("C4-cancel-settles-one-partial-with-the-terminal-status", finals.length === 1 && finals[0].data.partial === true && finals[0].data.stopReason === "cancelled" && finals[0].data.text.startsWith(lastDelta?.data.text ?? "\u0000") && partialBeforeTerminal && terminal.seq === finals[0].seq + 1,
        { finals: finals.map((f) => ({ seq: f.seq, partial: f.data.partial, stopReason: f.data.stopReason, len: f.data.text.length })), terminalSeq: terminal?.seq, lastPersistedDeltaLen: lastDelta?.data.text.length }); }

    // C5a · provider failure mid-reply, Host alive
    { const { session } = await c.start("C5a provider drops");
      const { events } = await c.follow(session.id);
      const status = events.findLast((e) => e.type === "run.status")?.data.status;
      const finals = events.filter((e) => e.type === "assistant.message");
      // Pi retries a dropped provider stream: every attempt is its own assistant
      // message (segment) with its own error final. Each segment is settled
      // exactly once, none is invented, and the Run never reads completed.
      const segments = finals.map((f) => f.data.segment);
      const onePerSegment = new Set(segments).size === segments.length && segments.every((s, i) => s === i);
      record("C5a-failure-after-text-is-settled-once-per-segment-and-never-completed", status === "failed" && finals.length >= 1 && onePerSegment && finals.every((f) => f.data.stopReason === "error" && !f.data.partial && f.data.text.length > 0),
        { status, attempts: finals.length, segments, finals: finals.map((f) => ({ stopReason: f.data.stopReason, partial: f.data.partial ?? false, len: f.data.text.length, error: f.data.errorMessage ?? null })) }); }

    // C10 · durable size at a fixed 10,000 characters, 24-character chunks every 20 ms.
    // Scope: (1) on-disk growth of the Host's data directory, of which
    // runtime-state.json (the RuntimeStore journal, written pretty-printed)
    // is the event log; (2) this Run's events as compact UTF-8 JSON, split into
    // assistant.delta events, their snapshot text alone, and everything else.
    // At-rest bytes only: every Store mutation rewrites the whole state file,
    // and that write amplification is not measured here.
    { const stateFile = path.join(hostDir, "runtime-state.json");
      const dirBytes = async (dir) => { let total = 0; for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) if (entry.isFile()) total += (await stat(path.join(entry.parentPath, entry.name))).size; return total; };
      const before = { state: (await stat(stateFile)).size, dir: await dirBytes(hostDir) };
      const { session, run } = await c.start("C10 fixed length");
      const { events } = await c.follow(session.id, { timeoutMs: 120000 });
      const after = { state: (await stat(stateFile)).size, dir: await dirBytes(hostDir) };
      const stored = JSON.parse(await readFile(stateFile, "utf8")).events.filter((e) => e.runId === run.id);
      const utf8 = (value) => Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value));
      const storedDeltas = stored.filter((e) => e.type === "assistant.delta");
      const bytes = {
        stateFileGrowth: after.state - before.state,
        dataDirGrowth: after.dir - before.dir,
        deltaEvents: storedDeltas.reduce((a, e) => a + utf8(e), 0),
        deltaSnapshotText: storedDeltas.reduce((a, e) => a + utf8(e.data.text), 0),
        otherRunEvents: stored.filter((e) => e.type !== "assistant.delta").reduce((a, e) => a + utf8(e), 0),
      };
      const final = events.find((e) => e.type === "assistant.message");
      const chunks = Math.ceil(LONG.length / 24);
      const uncoalescedSnapshotText = Array.from({ length: chunks }, (_, i) => Math.min(LONG.length, (i + 1) * 24)).reduce((a, b) => a + b, 0);
      const withinBound = bytes.deltaEvents <= C10_BOUND.deltaEvents && bytes.stateFileGrowth <= C10_BOUND.stateFileGrowth;
      record("C10-durable-bytes-within-bound", final?.data.text === LONG && withinBound,
        { textChars: LONG.length, chunks, chunkMs: 20, intervalMs: SNAPSHOT_INTERVAL_MS, deltaEvents: storedDeltas.length, bytes, bound: C10_BOUND, uncoalescedSnapshotText, snapshotTextToOutput: +(bytes.deltaSnapshotText / LONG.length).toFixed(1) }); }
    await host.close?.();

    // C5b · the Host process dies mid-reply; the restarted Host settles from persisted text only
    { const dataDir = await tempDir();
      const serve = (configureFirst) => new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [here, "--serve", dataDir, "0", ...(configureFirst ? ["--configure"] : [])], { stdio: ["ignore", "pipe", "inherit"] });
        let buffer = ""; child.stdout.on("data", (d) => { buffer += d; const line = buffer.split("\n")[0]; if (line.startsWith("{")) resolve({ child, ...JSON.parse(line) }); });
        child.on("error", reject);
      });
      const first = await serve(true);
      const c1 = client(first.url, first.token);
      const { session, run } = await c1.start("C5b crash mid reply");
      let killedAfter = null;
      await c1.follow(session.id, { until: () => false, timeoutMs: 20000, onEvent: async (e, seen) => { if (killedAfter === null && seen.filter((x) => x.type === "assistant.delta").length >= 3) { killedAfter = seen.filter((x) => x.type === "assistant.delta").at(-1).data.text; first.child.kill("SIGKILL"); throw Object.assign(new Error("killed"), { killed: true }); } } }).catch((error) => { if (!error.killed && killedAfter === null) throw error; });
      await new Promise((r) => first.child.once("exit", r));
      const second = await serve(false);
      const c2 = client(second.url, second.token);
      const all = (await c2.api("GET", `/sessions/${session.id}/events?afterSeq=0`)).events;
      const runEvents = all.filter((e) => e.runId === run.id);
      const lastPersisted = runEvents.filter((e) => e.type === "assistant.delta").at(-1);
      const finals = runEvents.filter((e) => e.type === "assistant.message");
      const status = runEvents.findLast((e) => e.type === "run.status")?.data.status;
      record("C5b-crash-recovery-settles-from-persisted-text-and-stays-unknown", status === "unknown" && finals.length === 1 && finals[0].data.partial === true && finals[0].data.stopReason === "unknown" && finals[0].data.text === lastPersisted?.data.text,
        { status, persistedDeltas: runEvents.filter((e) => e.type === "assistant.delta").length, partialLen: finals[0]?.data.text.length, lastPersistedLen: lastPersisted?.data.text.length });
      second.child.kill("SIGINT"); await new Promise((r) => second.child.once("exit", r));
    }
  } finally {
    for (const d of dirs) await rm(d, { recursive: true, force: true }).catch(() => {});
  }
  const out = arg("--out");
  if (out) await writeFile(out, JSON.stringify(results, null, 2) + "\n");
  const failed = results.filter((r) => !r.pass).length;
  console.log(`${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
}
