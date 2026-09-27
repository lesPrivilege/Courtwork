import http from "node:http";

/**
 * Hermes API-server `/v1/runs` · bounded HTTP/SSE transport (first slice).
 *
 * The transport owns the wire and nothing else: it forms the four pinned
 * requests, frames the event stream, enforces byte/time limits, never retries,
 * and closes only the connections it opened. Validation of what the native
 * side said, settlement and capability exposure stay in
 * hermes-api-runs-adapter.mjs.
 *
 * Wire source: NousResearch/hermes-agent `d7b836ab1c0cddaafc109ed24c9a83b6191cdc88`
 * (v0.21.3), `gateway/platforms/api_server_runs.py` and `api_server.py`; see
 * app/docs/hermes-api-runs.md.
 *
 * First-slice boundary: the endpoint is an explicitly supplied loopback URL
 * (a synthetic fixture). Nothing is read from the environment, no endpoint is
 * discovered, and the bearer value is the caller's and never echoed.
 *
 * `delivery` on a failed mutation (the vocabulary of the accepted Agents
 * transport): `not_sent` (refused locally, or the connection never opened),
 * `rejected` (the server answered and refused), `unresolved` (it may have
 * taken effect; never evidence that it did not).
 */

export const HERMES_TRANSPORT_LIMITS = Object.freeze({
  requestTimeoutMs: 10_000,
  maxJsonBytes: 256 * 1024,
  maxFrameBytes: 256 * 1024,
  maxStreamBytes: 8 * 1024 * 1024,
  // The pinned server sends `: keepalive` every 10 s, so a silent minute is loss.
  streamIdleMs: 60_000,
});

/* HPR-R2 · the largest value each limit may be configured to in this
   bounded slice. A limit is a positive safe integer no larger than this;
   smaller values are allowed, and nothing else is accepted. */
export const HERMES_TRANSPORT_CEILINGS = Object.freeze({
  requestTimeoutMs: 120_000,
  maxJsonBytes: 1024 * 1024,
  maxFrameBytes: 1024 * 1024,
  maxStreamBytes: 64 * 1024 * 1024,
  streamIdleMs: 300_000,
});

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;
const SAFE_TOKEN = /^[\w.:-]{1,64}$/;

export class HermesTransportError extends Error {
  constructor(code, operation, message, { status = null, delivery = null, nativeCode = null } = {}) {
    super(`${operation}: ${message}`);
    this.name = "HermesTransportError";
    this.code = code;
    this.operation = operation;
    this.status = status;
    if (delivery) this.delivery = delivery;
    if (nativeCode) this.nativeCode = nativeCode;
  }
}

function loopbackOrigin(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { url = null; }
  if (!url || url.protocol !== "http:" || !LOOPBACK.has(url.hostname) || url.username || url.password
    || (url.pathname !== "/" && url.pathname !== "") || url.search || url.hash || !url.port) {
    throw new HermesTransportError("invalid_endpoint", "configure", "the first slice accepts only an explicit http loopback origin with a port", { delivery: "not_sent" });
  }
  return { hostname: url.hostname.replace(/^\[|\]$/g, ""), port: Number(url.port), origin: url.origin };
}

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const configError = (message) => new HermesTransportError("invalid_configuration", "configure", message, { delivery: "not_sent" });

/** Validate caller limits against HERMES_TRANSPORT_CEILINGS; returns the
 * effective limits (defaults for anything not given). */
export function transportLimits(limits = {}) {
  if (!isPlainObject(limits)) throw configError("limits must be a plain object");
  for (const [name, value] of Object.entries(limits)) {
    if (!Object.hasOwn(HERMES_TRANSPORT_CEILINGS, name)) throw configError(`unknown limit: ${String(name).slice(0, 40)}`);
    if (!Number.isSafeInteger(value) || value < 1 || value > HERMES_TRANSPORT_CEILINGS[name])
      throw configError(`${name} must be an integer from 1 to ${HERMES_TRANSPORT_CEILINGS[name]}`);
  }
  const effective = { ...HERMES_TRANSPORT_LIMITS, ...limits };
  if (effective.maxFrameBytes > effective.maxStreamBytes) throw configError("maxFrameBytes cannot exceed maxStreamBytes");
  return Object.freeze(effective);
}

const runPath = (runId, suffix = "") => `/v1/runs/${encodeURIComponent(runId)}${suffix}`;

/**
 * @param {{ endpoint: string, bearer?: string|null, limits?: Partial<typeof HERMES_TRANSPORT_LIMITS> }} options
 */
export function createHermesRunsTransport(options = {}) {
  if (!isPlainObject(options)) throw configError("options must be a plain object");
  for (const name of Object.keys(options))
    if (!["endpoint", "bearer", "limits"].includes(name)) throw configError(`unknown option: ${String(name).slice(0, 40)}`);
  const { endpoint, bearer = null, limits = {} } = options;
  const bounds = transportLimits(limits);
  const target = loopbackOrigin(endpoint);
  if (bearer !== null && (typeof bearer !== "string" || bearer.length > 512 || !VISIBLE_ASCII.test(bearer))) {
    throw new HermesTransportError("invalid_credential", "configure", "the bearer value must be visible ASCII", { delivery: "not_sent" });
  }
  const owned = new Set();
  let closed = false;

  function headers(extra = {}) {
    return { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...extra };
  }

  /* One request. It resolves with the response only once the whole bounded
     body has arrived; any failure is mapped to a delivery for a mutation. */
  function exchange(operation, method, path, { body = null, extraHeaders = {}, mutation = false } = {}) {
    if (closed) return Promise.reject(new HermesTransportError("closed", operation, "the transport is closed", { delivery: mutation ? "not_sent" : null }));
    const payload = body === null ? null : Buffer.from(JSON.stringify(body), "utf8");
    return new Promise((resolve, reject) => {
      let connected = false;
      let settled = false;
      const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); owned.delete(request); fn(value); };
      const failed = (code, message, extra = {}) => finish(reject, new HermesTransportError(code, operation, message, extra));
      const request = http.request({
        host: target.hostname, port: target.port, method, path, agent: false,
        headers: headers({ Accept: "application/json", ...extraHeaders, ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}) }),
      });
      owned.add(request);
      const timer = setTimeout(() => {
        failed("timeout", "no complete response within the timeout", { delivery: mutation ? (connected ? "unresolved" : "not_sent") : null });
        request.destroy();
      }, bounds.requestTimeoutMs);
      request.on("socket", (socket) => {
        if (socket.connecting) socket.once("connect", () => { connected = true; });
        else connected = true;
      });
      request.on("error", () => {
        if (closed) failed("closed", "the transport was closed", { delivery: mutation ? (connected ? "unresolved" : "not_sent") : null });
        else failed("connection_failed", connected ? "the connection failed" : "the connection could not be opened", { delivery: mutation ? (connected ? "unresolved" : "not_sent") : null });
      });
      request.on("response", (response) => {
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > bounds.maxJsonBytes) {
            failed("response_too_large", "the response exceeded its byte limit", { status: response.statusCode, delivery: mutation ? "unresolved" : null });
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("aborted", () => failed("connection_failed", "the response was cut off", { status: response.statusCode, delivery: mutation ? "unresolved" : null }));
        response.on("error", () => failed("connection_failed", "the response was cut off", { status: response.statusCode, delivery: mutation ? "unresolved" : null }));
        response.on("end", () => {
          let json = null;
          try { json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); } catch { json = undefined; }
          const status = response.statusCode;
          const nativeCode = typeof json?.error?.code === "string" && SAFE_TOKEN.test(json.error.code) ? json.error.code : null;
          if (status >= 400) {
            const refused = status < 500 && status !== 408;
            failed(refused ? "http_rejected" : "http_failed", `HTTP ${status}`, { status, nativeCode, delivery: mutation ? (refused ? "rejected" : "unresolved") : null });
            return;
          }
          if (json === undefined) {
            failed("malformed_response", "the response could not be read", { status, delivery: mutation ? "unresolved" : null });
            return;
          }
          finish(resolve, { status, json, replayedHeader: response.headers["idempotency-replayed"] === "true" });
        });
      });
      if (payload) request.end(payload); else request.end();
    });
  }

  /**
   * The live event stream as SSE frames: `{ type: "data", data, event }` or
   * `{ type: "comment", text }`. It ends when the server ends it. Errors carry
   * `code`: `stream_unavailable` (HTTP refusal, e.g. 404 once the run's queue is
   * gone — there is no replay), `stream_idle`, `stream_too_large`,
   * `frame_too_large`, `invalid_utf8`, `connection_failed`, `closed`.
   * Leaving the loop early destroys the connection; nothing is sent.
   */
  async function* events(runId, { signal } = {}) {
    const operation = "events";
    if (closed) throw new HermesTransportError("closed", operation, "the transport is closed");
    const queue = [];
    let wake = null;
    let done = false;
    let failure = null;
    const push = (item) => { queue.push(item); wake?.(); };
    const fail = (code, message, extra = {}) => {
      if (done) return;
      failure = new HermesTransportError(code, operation, message, extra);
      done = true;
      wake?.();
      request.destroy();
    };
    const request = http.request({
      host: target.hostname, port: target.port, method: "GET", path: runPath(runId, "/events"), agent: false,
      headers: headers({ Accept: "text/event-stream" }),
    });
    owned.add(request);
    let idle = null;
    const touch = () => { clearTimeout(idle); idle = setTimeout(() => fail("stream_idle", "no bytes within the idle limit"), bounds.streamIdleMs); };
    touch();
    const abort = () => fail("aborted", "the caller stopped reading");
    signal?.addEventListener("abort", abort, { once: true });
    request.on("error", () => fail(closed ? "closed" : "connection_failed", closed ? "the transport was closed" : "the stream connection failed"));
    request.on("response", (response) => {
      if (response.statusCode !== 200 || !String(response.headers["content-type"] || "").startsWith("text/event-stream")) {
        fail("stream_unavailable", `HTTP ${response.statusCode}`, { status: response.statusCode });
        response.resume();
        return;
      }
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let total = 0;
      let pending = "";
      let data = null;
      let dataBytes = 0;
      let event = null;
      const dispatchLine = (line) => {
        if (line === "") {
          if (data !== null) push({ type: "data", data, event });
          data = null; dataBytes = 0; event = null;
          return;
        }
        if (line.startsWith(":")) { push({ type: "comment", text: line.slice(1).trim().slice(0, 64) }); return; }
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        let value = colon === -1 ? "" : line.slice(colon + 1);
        if (value.startsWith(" ")) value = value.slice(1);
        if (field === "data") {
          dataBytes += Buffer.byteLength(value) + 1;
          if (dataBytes > bounds.maxFrameBytes) { fail("frame_too_large", "one event exceeded the frame limit"); return; }
          data = data === null ? value : `${data}\n${value}`;
        } else if (field === "event") event = value.slice(0, 64);
        // `id` and `retry` are ignored: the pinned wire sends neither, and no replay is attempted.
      };
      response.on("data", (chunk) => {
        if (done) return;
        touch();
        total += chunk.length;
        if (total > bounds.maxStreamBytes) { fail("stream_too_large", "the stream exceeded its byte limit"); return; }
        let text;
        try { text = decoder.decode(chunk, { stream: true }); } catch { fail("invalid_utf8", "the stream was not valid UTF-8"); return; }
        pending += text;
        if (Buffer.byteLength(pending) > bounds.maxFrameBytes * 2) { fail("frame_too_large", "a line exceeded the frame limit"); return; }
        // A trailing "\r" may be the first half of "\r\n": hold it for the next chunk.
        const hold = pending.endsWith("\r") ? "\r" : "";
        const lines = (hold ? pending.slice(0, -1) : pending).split(/\r\n|\r|\n/);
        pending = lines.pop() + hold;
        for (const line of lines) { if (done) return; dispatchLine(line); }
      });
      response.on("end", () => {
        if (done) return;
        try { decoder.decode(); } catch { fail("invalid_utf8", "the stream ended inside a UTF-8 sequence"); return; }
        done = true;
        wake?.();
      });
      response.on("aborted", () => fail("connection_failed", "the stream was cut off"));
      response.on("error", () => fail("connection_failed", "the stream was cut off"));
    });
    request.end();
    try {
      for (;;) {
        if (queue.length) { yield queue.shift(); continue; }
        if (done) break;
        await new Promise((resolve) => { wake = resolve; });
        wake = null;
      }
      if (failure) throw failure;
    } finally {
      clearTimeout(idle);
      signal?.removeEventListener("abort", abort);
      if (!request.destroyed) request.destroy();
      owned.delete(request);
    }
  }

  return {
    endpointIdentity: target.origin,
    /** POST /v1/runs. `body` is sent exactly as given; the key is the caller's. */
    createRun({ body, idempotencyKey }) {
      return exchange("createRun", "POST", "/v1/runs", { body, extraHeaders: { "Idempotency-Key": idempotencyKey }, mutation: true });
    },
    getRun(runId) {
      return exchange("getRun", "GET", runPath(runId));
    },
    /** POST /v1/runs/{id}/stop. Its answer is an intent, not a result. */
    stopRun(runId) {
      return exchange("stopRun", "POST", runPath(runId, "/stop"), { mutation: true });
    },
    events,
    /** Connections this transport currently holds open. */
    openConnections() {
      return owned.size;
    },
    /** Close what this transport opened. Nothing is sent: no stop, no delete. */
    close() {
      closed = true;
      const count = owned.size;
      for (const request of [...owned]) request.destroy();
      owned.clear();
      return count;
    },
  };
}
