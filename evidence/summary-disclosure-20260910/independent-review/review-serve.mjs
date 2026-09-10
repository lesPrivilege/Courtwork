// Independent review server for R2-SD01 at eff0e41.
// Synthetic data only; local fake loopback provider (repo test constant); no
// personal credentials, no paid provider. The browser receives the exact
// production UI bytes through a raw proxy: nothing is injected.
//
//   REVIEW_PORT      (default 8885)
//   REVIEW_DATA_DIR  (default /private/tmp/se-agent-sdr-data) — boot() calls
//                    mkdtemp(os.tmpdir()), so TMPDIR is pointed here first.
//
// Scenario sessions are created up front; further runs can be started from the
// real composer with a leading mode tag: [note] [second] [long] [empty] [fail] [slow].
import http from "node:http";
import { mkdirSync } from "node:fs";

const port = Number(process.env.REVIEW_PORT || 8885);
const dataRoot = process.env.REVIEW_DATA_DIR || "/private/tmp/se-agent-sdr-data";
mkdirSync(dataRoot, { recursive: true });
process.env.TMPDIR = dataRoot;
const { boot } = await import("../../../app/tests/helpers.mjs");

const LONG = "out/" + "source-version-".repeat(12) + "note.txt";
const note = "Synthetic source note\n\nThe summary, disclosure and right panel refer to the same recorded run.\nReading this note does not accept a result.\n";
const text = (s) => (typeof s === "string" ? s : Array.isArray(s) ? s.map((p) => p.text || "").join("") : "");

const h = await boot({
  fakeResponder: ({ body, requestNumber }) => {
    const messages = body.messages || [];
    const lastUser = messages.findLastIndex((m) => m.role === "user");
    const input = text(messages[lastUser]?.content);
    const done = messages.slice(lastUser + 1).some((m) => m.role === "tool");
    const common = { id: `review-${requestNumber}`, created: Math.floor(Date.now() / 1000) };
    const mode = (input.match(/\[(note|second|long|empty|fail|slow)\]/) || [])[1] || "empty";
    if (mode === "fail") return { kind: "http-error", status: 500, message: "synthetic provider failure" };
    if (mode === "slow") return { ...common, kind: "text", slow: true, text: Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ") };
    const path = { note: "out/source-note.txt", second: "out/second-note.txt", long: LONG }[mode];
    if (path && !done) return { ...common, kind: "tool", toolCallId: `review-tool-${requestNumber}`, name: "ws_write", arguments: { path, text: `${note}\nmode=${mode} request=${requestNumber}\n` } };
    return { ...common, kind: "text", text: `Synthetic review reply (${mode}).` };
  },
});

async function runIn(session, input, { terminal = true } = {}) {
  const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: `review-${Math.random().toString(36).slice(2)}`, input });
  if (made.status !== 200) throw Error(JSON.stringify(made));
  return terminal ? h.pollRun(made.json.run.id, { timeoutMs: 30000 }) : made.json.run;
}

const sessions = {};
sessions.normal = await h.createSession({ title: "Review · normal", permissionMode: "draft" });
const normalRun = await runIn(sessions.normal, "[note] Record a synthetic source note.");
sessions.multi = await h.createSession({ title: "Review · two runs", permissionMode: "draft" });
const multiFirst = await runIn(sessions.multi, "[note] First synthetic run.");
const multiSecond = await runIn(sessions.multi, "[second] Second synthetic run.");
sessions.long = await h.createSession({ title: "Review · long file name", permissionMode: "draft" });
const longRun = await runIn(sessions.long, "[long] Record a long-named note.");
sessions.empty = await h.createSession({ title: "Review · no files", permissionMode: "draft" });
const emptyRun = await runIn(sessions.empty, "[empty] Reply without writing a file.");
sessions.failed = await h.createSession({ title: "Review · failed run", permissionMode: "draft" });
const failedRun = await runIn(sessions.failed, "[fail] Provider fails.");
sessions.none = await h.createSession({ title: "Review · no runs" });

const config = {
  schemaVersion: 1,
  head: process.env.REVIEW_HEAD || null,
  dataDir: h.dataDir,
  dataKind: "synthetic local HTTP/Pi loopback",
  provider: "local-fake; no paid provider",
  sessions: Object.fromEntries(Object.entries(sessions).map(([k, s]) => [k, s.id])),
  runs: { normal: normalRun.id, multiFirst: multiFirst.id, multiSecond: multiSecond.id, long: longRun.id, empty: emptyRun.id, failed: [failedRun.id, failedRun.status] },
};

const server = http.createServer((req, res) => {
  const origin = `http://127.0.0.1:${port}`;
  if (req.headers.host !== `127.0.0.1:${port}` || (req.headers.origin && req.headers.origin !== origin)) {
    res.statusCode = 403; res.end("Review origin denied"); return;
  }
  if (req.url === "/review-config.json") { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(config)); return; }
  const headers = { ...req.headers, host: new URL(h.runtime.url).host };
  if (headers.origin) headers.origin = h.runtime.url;
  const upstream = http.request(h.runtime.url + req.url, { method: req.method, headers }, (response) => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  upstream.on("error", (error) => { res.statusCode = 502; res.end(error.message); });
  req.pipe(upstream);
});
server.listen(port, "127.0.0.1", () => console.log(JSON.stringify({ url: `http://127.0.0.1:${port}`, upstream: h.runtime.url, config })));
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, async () => { server.close(); await h.runtime.close(); process.exit(0); });
