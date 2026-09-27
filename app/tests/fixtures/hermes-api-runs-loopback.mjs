/* A deterministic loopback stand-in for Hermes' API-server `/v1/runs`
 * surface, built from the pinned source (NousResearch/hermes-agent
 * d7b836ab1c0cddaafc109ed24c9a83b6191cdc88, gateway/platforms/api_server_runs.py
 * and api_server.py). No Hermes process, provider or credential: a synthetic
 * bearer, a disposable data file and an ephemeral 127.0.0.1 port.
 *
 * Reproduced wire facts: Bearer auth and its 401 envelope; the OpenAI-style
 * error envelope; Idempotency-Key validation, same-key/same-body replay
 * (202, `replayed: true`, `Idempotency-Replayed`) and changed-body conflict
 * (409 `idempotency_key_conflict`); 202 `{run_id, status:"started",
 * replayed:false}`; pollable status `{object:"hermes.run", ...}`; SSE
 * `data: <json>\n\n` with Python `ensure_ascii` escaping and `json.dumps`
 * separators, `: keepalive`, `: stream closed`, and one subscriber after
 * which the run's stream is gone (404); envelope `{event, run_id, timestamp}`;
 * `message.delta {delta}`; terminal `run.<status>` with the terminal fields;
 * stop → `{run_id, status:"stopping"}`, terminal → status body, inactive →
 * 409 `run_not_active`; a restart turns durable non-terminal records into
 * `interrupted` with the pinned error text.
 *
 * Each run follows a script chosen by its input. Steps:
 *   { delta }                    message.delta
 *   { event, fields }            any other envelope event (unknown, approval, tool…)
 *   { wrongRun, delta }          a delta stamped with another run id
 *   { raw }                      bytes written verbatim (malformed frames)
 *   { pause }                    wait ms
 *   { waitForStop }              wait for stop; then run.cancelled unless ignoreStop
 *   { terminal, fields }         run.<terminal> and the terminal status
 *   { statusOnly, fields }       set a terminal status without an event
 *   { drop }                     destroy the stream socket (the run stays as it is)
 *   { hang }                     send nothing further
 * Options per script: `chunkBytes` splits every write, `rawUtf8` skips the
 * ASCII escaping (a parser-robustness case, not the pinned wire).
 */
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const TERMINAL = new Set(["completed", "failed", "cancelled", "interrupted"]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* Python json.dumps(..., ensure_ascii=True) with default separators. */
export function pyDumps(value, { ascii = true } = {}) {
  const text = JSON.stringify(value, null, 0)
    .replace(/("(?:[^"\\]|\\.)*")|([,:])/g, (match, string, sep) => string ?? (sep === "," ? ", " : ": "));
  return ascii ? text.replace(/[\u007f-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`) : text;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
const errorBody = (message, code = null) => ({ error: { message, type: "invalid_request_error", param: null, code } });

export async function startHermesLoopback({ bearer = "synthetic-test-bearer", dataFile, scripts = {}, keepaliveMs = 0, port = 0 } = {}) {
  const trace = [];
  let server;
  let owner;
  let durable;
  const live = new Map(); // run_id → { stream: {res}|null, streamGone, stopRequested, ignoreStop, script }
  const sockets = new Set();
  let loseNextAdmission = false;

  function load() {
    durable = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, "utf8")) : { idempotency: {}, runs: {} };
    owner = randomUUID();
    for (const status of Object.values(durable.runs)) {
      if (!TERMINAL.has(status.status) && status._owner !== owner) {
        Object.assign(status, { status: "interrupted", error: "The gateway restarted before this run settled.", last_event: "run.interrupted", updated_at: Date.now() / 1000 });
      }
    }
    persist();
  }
  const persist = () => writeFileSync(dataFile, JSON.stringify(durable));
  const publicStatus = (status) => Object.fromEntries(Object.entries(status).filter(([key]) => !key.startsWith("_")));
  function setStatus(runId, status, fields = {}) {
    const current = durable.runs[runId];
    Object.assign(current, { status, updated_at: Date.now() / 1000, ...fields });
    persist();
    return current;
  }

  function json(res, status, body, headers = {}) {
    const text = pyDumps(body);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(text), ...headers });
    res.end(text);
  }
  function authorized(req, res) {
    if (req.headers.authorization === `Bearer ${bearer}`) return true;
    json(res, 401, { error: { message: "Invalid gateway API key (API_SERVER_KEY)", type: "gateway_auth_error", code: "gateway_auth_failed" } });
    return false;
  }
  async function readBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
  }

  async function createRun(req, res) {
    const key = String(req.headers["idempotency-key"] ?? "").trim();
    if (key.length > 255 || [...key].some((ch) => ch.charCodeAt(0) < 33 || ch.charCodeAt(0) > 126))
      return json(res, 400, errorBody("Idempotency-Key must be 1-255 visible ASCII characters", "invalid_idempotency_key"));
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, errorBody("Invalid JSON")); }
    const fingerprint = createHash("sha256").update(canonical({ body, gateway_session_key: "" })).digest("hex");
    if (!body?.input) return json(res, 400, errorBody("Missing 'input' field"));
    if (key) {
      const record = durable.idempotency[key];
      if (record && record.fingerprint !== fingerprint) return json(res, 409, errorBody("Idempotency-Key was already used with a different request payload", "idempotency_key_conflict"));
      if (record) {
        trace.push({ call: "createRun", key, replayed: true, runId: record.runId });
        return json(res, 202, { run_id: record.runId, status: durable.runs[record.runId].status, replayed: true }, { "Idempotency-Replayed": "true" });
      }
    }
    const runId = `run_${randomUUID().replaceAll("-", "")}`;
    const now = Date.now() / 1000;
    durable.runs[runId] = { object: "hermes.run", run_id: runId, status: "queued", updated_at: now, created_at: now, session_id: body.session_id || runId, model: body.model ?? "hermes-agent", _owner: owner };
    if (key) durable.idempotency[key] = { fingerprint, runId };
    persist();
    live.set(runId, { stream: null, streamGone: false, stopRequested: false, script: scripts[body.input] ?? { steps: [{ delta: "ok" }, { terminal: "completed", fields: { output: "ok" } }] } });
    trace.push({ call: "createRun", key, replayed: false, runId, input: body.input, sessionId: body.session_id ?? null });
    if (loseNextAdmission) {
      loseNextAdmission = false;
      req.socket.destroy(); // admitted, but the answer never arrives
      return;
    }
    json(res, 202, { run_id: runId, status: "started", replayed: false });
  }

  function writeFrame(runState, text) {
    const { res } = runState.stream;
    const size = runState.script.chunkBytes;
    const bytes = Buffer.from(text, "utf8");
    if (!size) { res.write(bytes); return; }
    for (let i = 0; i < bytes.length; i += size) res.write(bytes.subarray(i, i + size));
  }
  const envelope = (runId, name, fields = {}) => ({ event: name, run_id: runId, timestamp: Date.now() / 1000, ...fields });
  function emit(runId, runState, event) {
    writeFrame(runState, `data: ${pyDumps(event, { ascii: !runState.script.rawUtf8 })}\n\n`);
  }
  function terminalFields(status, extra) {
    if (status === "completed") return { completed: true, partial: false, interrupted: false, usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, ...extra };
    if (status === "cancelled") return { completed: false, partial: false, interrupted: true, ...extra };
    if (status === "failed") return { completed: false, partial: false, interrupted: false, error: "agent run failed", ...extra };
    return { ...extra };
  }

  async function execute(runId, runState) {
    setStatus(runId, "running");
    const stepsList = runState.script.steps;
    for (const step of stepsList) {
      if (!runState.stream) return;
      if (step.pause) await sleep(step.pause);
      else if (step.delta !== undefined && !step.wrongRun) emit(runId, runState, envelope(runId, "message.delta", { delta: step.delta }));
      else if (step.wrongRun) emit(runId, runState, envelope(`run_${"0".repeat(32)}`, "message.delta", { delta: step.delta }));
      else if (step.event) { setStatus(runId, durable.runs[runId].status, { last_event: step.event }); emit(runId, runState, envelope(runId, step.event, step.fields ?? {})); }
      else if (step.raw !== undefined) writeFrame(runState, step.raw);
      else if (step.waitForStop) {
        while (!runState.stopRequested && runState.stream) await sleep(10);
        if (runState.script.ignoreStop || !runState.stream) { await new Promise(() => {}); }
        const fields = terminalFields("cancelled");
        setStatus(runId, "cancelled", { ...fields, last_event: "run.cancelled" });
        emit(runId, runState, envelope(runId, "run.cancelled", fields));
        return closeStream(runState);
      } else if (step.terminal) {
        const fields = terminalFields(step.terminal, step.fields);
        setStatus(runId, step.terminal, { ...fields, last_event: `run.${step.terminal}` });
        emit(runId, runState, envelope(runId, `run.${step.terminal}`, fields));
        return closeStream(runState);
      } else if (step.statusOnly) {
        setStatus(runId, step.statusOnly, { ...terminalFields(step.statusOnly, step.fields), last_event: `run.${step.statusOnly}` });
      } else if (step.drop) { runState.stream.res.socket.destroy(); runState.stream = null; return; }
      else if (step.hang) { await new Promise(() => {}); }
    }
    closeStream(runState);
  }
  function closeStream(runState) {
    if (!runState.stream) return;
    runState.stream.res.end(": stream closed\n\n");
    runState.stream = null;
  }

  function streamEvents(req, res, runId) {
    const runState = live.get(runId);
    if (!durable.runs[runId] || !runState || runState.streamGone) return json(res, 404, errorBody(`Run not found: ${runId}`, "run_not_found"));
    runState.streamGone = true; // one subscriber: the queue is dropped when it ends
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
    runState.stream = { res };
    trace.push({ call: "events", runId });
    let timer = null;
    if (keepaliveMs) timer = setInterval(() => runState.stream && runState.stream.res.write(": keepalive\n\n"), keepaliveMs);
    res.on("close", () => { clearInterval(timer); runState.stream = null; });
    void execute(runId, runState);
  }

  function stopRun(req, res, runId) {
    const status = durable.runs[runId];
    trace.push({ call: "stopRun", runId });
    if (!status) return json(res, 404, errorBody(`Run not found: ${runId}`, "run_not_found"));
    if (TERMINAL.has(status.status)) return json(res, 200, publicStatus(status));
    const runState = live.get(runId);
    if (!runState) return json(res, 409, errorBody(`Run is not active in this gateway process: ${runId}`, "run_not_active"));
    setStatus(runId, "stopping", { last_event: "run.stopping" });
    runState.stopRequested = true;
    json(res, 200, { run_id: runId, status: "stopping" });
  }

  async function handle(req, res) {
    if (!authorized(req, res)) return;
    const url = new URL(req.url, "http://fixture");
    const match = /^\/v1\/runs(?:\/([^/]+)(\/events|\/stop|\/approval|\/steer)?)?$/.exec(url.pathname);
    if (!match) return json(res, 404, errorBody("Not found"));
    const runId = match[1] ? decodeURIComponent(match[1]) : null;
    if (req.method === "POST" && !runId) return createRun(req, res);
    if (req.method === "GET" && runId && !match[2]) {
      trace.push({ call: "getRun", runId });
      return durable.runs[runId] ? json(res, 200, publicStatus(durable.runs[runId])) : json(res, 404, errorBody(`Run not found: ${runId}`, "run_not_found"));
    }
    if (req.method === "GET" && match[2] === "/events") return streamEvents(req, res, runId);
    if (req.method === "POST" && match[2] === "/stop") return stopRun(req, res, runId);
    trace.push({ call: "other", method: req.method, path: url.pathname });
    return json(res, 404, errorBody("Not found"));
  }

  async function listen(atPort) {
    load();
    server = createServer((req, res) => { void handle(req, res); });
    server.on("connection", (socket) => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
    await new Promise((resolve) => server.listen(atPort, "127.0.0.1", resolve));
  }
  await listen(port);
  const url = () => `http://127.0.0.1:${server.address().port}`;

  return {
    get url() { return url(); },
    bearer,
    trace,
    status: (runId) => durable.runs[runId] ? publicStatus(durable.runs[runId]) : null,
    admissions: () => trace.filter((entry) => entry.call === "createRun" && !entry.replayed).length,
    openSockets: () => sockets.size,
    loseNextAdmissionResponse() { loseNextAdmission = true; },
    /** A non-terminal record this process no longer drives (pinned stop → 409 run_not_active). */
    forgetLive(runId) { live.delete(runId); },
    /** A new owner process over the same durable file and port. */
    async restart() {
      const atPort = server.address().port;
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
      live.clear();
      await listen(atPort);
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
