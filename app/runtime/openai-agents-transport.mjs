import { AsyncLocalStorage } from "node:async_hooks";
import OpenAI, { APIConnectionTimeoutError, APIError, APIUserAbortError } from "openai";
import { VERSION as SDK_VERSION } from "openai/version";
import { AGENTS_API_PROTOCOL } from "./agents-api-adapter.mjs";

/**
 * P03-C · production `AgentsApiTransport` over the official SDK.
 *
 * The transport owns the wire and nothing else: it forms the SDK calls, keeps
 * the caller's request identity on the one wire slot the pinned artifact has,
 * never retries on its own, hands the SDK's event iterator to the existing
 * adapter, and releases the connection when told to. Normalization, dedup,
 * settlement and capability exposure stay in agents-api-adapter.mjs.
 *
 * Verified against openai@7.15.0 (AGENTS_API_PROTOCOL.sdkPin):
 * - `sessions.create` has no request-identity slot on the wire. A lost reply
 *   is an unresolved creation that only the caller can look up.
 * - `sessions.events.create` sends the caller's key as `Idempotency-Key`. The
 *   SDK documents that key for submitted messages only; it is carried for
 *   tool results and cancel too, with no guarantee claimed for them.
 * - The SDK retries POSTs by default (HTTP 408/409/429/5xx and connection
 *   failures). Every call here is made with `maxRetries: 0`.
 * - `sessions.create` carries application function tools as `agent.tools`
 *   entries of `{type:"function",name,description,parameters}`. Only the
 *   names in AGENTS_TRANSPORT_FUNCTION_TOOLS are forwarded, and only those
 *   four keys; `defer_loading`, `tool_search` and every other tool type stay
 *   off the wire.
 */
// P03-C forwards the governed reader; P03-E adds the existing candidate write
// and fixed-check tools. Their approval, scope and revision guards live in the
// Host's tool closures, not in the declaration.
export const AGENTS_TRANSPORT_FUNCTION_TOOLS = Object.freeze(["repo_read", "repo_write", "check_run"]);
export const AGENTS_TRANSPORT_REQUEST_IDENTITY = Object.freeze({
  create: Object.freeze({ wire: null, guarantee: "none" }),
  message: Object.freeze({ wire: "Idempotency-Key", guarantee: "documented by the SDK for submitted messages" }),
  tool_result: Object.freeze({ wire: "Idempotency-Key", guarantee: "undocumented" }),
  cancel: Object.freeze({ wire: "Idempotency-Key", guarantee: "undocumented" }),
});

const EVENT_KINDS = Object.freeze({
  "agent.session.input.message": "message",
  "agent.session.input.tool_result": "tool_result",
  "agent.session.input.cancel": "cancel",
});

// Nothing ambient reaches the wire. The SDK merges OPENAI_CUSTOM_HEADERS from
// the environment into every request and no client option turns that off, so
// filtering header names is not enough: an ambient Idempotency-Key or
// User-Agent has an allowed name. Every header value sent is written here,
// from the connection the caller supplied and the call being made; none is
// copied from what the SDK assembled.
const USER_AGENT = `OpenAI/JS ${SDK_VERSION}`;
const ACCEPT = Object.freeze({ createSession: "application/json", getSession: "application/json", getTurn: "application/json", listItems: "application/json", sendEvents: "*/*", streamEvents: "text/event-stream" });
const SAFE_TOKEN = /^[\w.:-]{1,64}$/;
const REQUEST_ID = /^[\x21-\x7e]{1,255}$/;

/**
 * `delivery` is set on a failed mutation: `not_sent` (refused locally, or
 * aborted before the call), `rejected` (the service answered and refused) or
 * `unresolved` (it may have executed; never evidence that it did not).
 * Messages are built here; response bodies, headers and SDK error text are
 * never copied.
 */
export class AgentsTransportError extends Error {
  constructor(code, operation, message, { status = null, delivery = null, nativeRequestId = null, nativeCode = null } = {}) {
    super(`${operation}: ${message}`);
    this.name = "AgentsTransportError";
    this.code = code;
    this.operation = operation;
    this.status = status;
    if (delivery) this.delivery = delivery;
    if (nativeRequestId) this.nativeRequestId = nativeRequestId;
    if (nativeCode) this.nativeCode = nativeCode;
  }
}

const safeToken = (value) => (typeof value === "string" && SAFE_TOKEN.test(value) ? value : null);

function translate(error, operation, mutation, signal) {
  if (error instanceof AgentsTransportError) return error;
  const delivery = (answer) => (mutation ? answer : null);
  if (error instanceof APIUserAbortError || signal?.aborted) {
    return new AgentsTransportError("aborted", operation, "the request was aborted", { delivery: delivery("unresolved") });
  }
  if (error instanceof APIConnectionTimeoutError) {
    return new AgentsTransportError("timeout", operation, "no response within the timeout", { delivery: delivery("unresolved") });
  }
  if (error instanceof APIError && Number.isInteger(error.status)) {
    const refused = error.status >= 400 && error.status < 500 && error.status !== 408;
    return new AgentsTransportError(refused ? "http_rejected" : "http_failed", operation, `HTTP ${error.status}`, {
      status: error.status, delivery: delivery(refused ? "rejected" : "unresolved"),
      nativeRequestId: safeToken(error.requestID), nativeCode: safeToken(error.code) ?? safeToken(error.type),
    });
  }
  if (error instanceof APIError) {
    return new AgentsTransportError("connection_failed", operation, "the connection failed", { delivery: delivery("unresolved") });
  }
  // A 2xx the SDK could not parse: the service answered, the answer is unusable.
  return new AgentsTransportError("malformed_response", operation, "the response could not be read", { delivery: delivery("unresolved") });
}

function invalid(operation, message) {
  return new AgentsTransportError("invalid_request", operation, message, { delivery: "not_sent" });
}

/** The allowlisted function declarations of a creation request, rebuilt key
 * by key so nothing the caller attached rides along. */
function functionTools(tools) {
  if (tools === undefined || tools === null) return null;
  if (!Array.isArray(tools) || !tools.length) throw invalid("createSession", "agent.tools must be a non-empty array when supplied");
  const names = new Set();
  return tools.map((tool) => {
    const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
    if (!isRecord(tool) || tool.type !== "function" || !AGENTS_TRANSPORT_FUNCTION_TOOLS.includes(tool.name) || names.has(tool.name)
      || typeof tool.description !== "string" || !tool.description || !isRecord(tool.parameters) || tool.parameters.type !== "object") {
      throw invalid("createSession", "agent.tools may only declare the allowlisted application functions");
    }
    names.add(tool.name);
    return { type: "function", name: tool.name, description: tool.description, parameters: structuredClone(tool.parameters) };
  });
}

function requireSessionId(operation, sessionId) {
  if (typeof sessionId !== "string" || !SAFE_TOKEN.test(sessionId)) throw invalid(operation, "a native session id is required");
}

function nativeSession(operation, value, mutation, expectedId = null) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.id !== "string" || !value.id
    || (expectedId !== null && value.id !== expectedId)) {
    throw new AgentsTransportError("malformed_response", operation, "the response is not the requested native session", { delivery: mutation ? "unresolved" : null });
  }
  return value;
}

/**
 * @param {{ apiKey: string, baseURL: string, fetch?: typeof fetch, timeoutMs?: number }} connection
 *   Supplied by the caller. Nothing is read from the environment, no key store
 *   is inspected, and the key is held only by the SDK client in this closure.
 */
export function createOpenAiAgentsTransport({ apiKey, baseURL, fetch: fetchImpl = globalThis.fetch, timeoutMs = 60_000 } = {}) {
  if (typeof apiKey !== "string" || !apiKey) throw new TypeError("apiKey is required");
  if (typeof baseURL !== "string" || !/^https?:\/\//.test(baseURL)) throw new TypeError("baseURL is required");
  if (typeof fetchImpl !== "function") throw new TypeError("fetch must be a function");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError("timeoutMs must be a positive integer");

  // The call in progress, visible to the fetch seam. Per call, so concurrent
  // operations each keep their own request identity.
  const calls = new AsyncLocalStorage();
  const client = new OpenAI({
    apiKey, baseURL, timeout: timeoutMs, maxRetries: 0, logLevel: "off",
    adminAPIKey: null, organization: null, project: null, webhookSecret: null,
    fetch: (url, init = {}) => {
      const current = calls.getStore();
      if (!current) throw new TypeError("request made outside a transport call");
      const headers = new Headers({
        accept: ACCEPT[current.operation], authorization: `Bearer ${apiKey}`,
        "openai-beta": AGENTS_API_PROTOCOL.betaHeader, "user-agent": USER_AGENT,
      });
      if (init.body != null) headers.set("content-type", "application/json");
      if (current.requestId) headers.set("idempotency-key", current.requestId);
      return fetchImpl(url, { ...init, headers });
    },
  });
  const sessions = client.beta.agents.sessions;
  const options = (signal) => ({ maxRetries: 0, ...(signal ? { signal } : {}) });

  async function call(operation, mutation, signal, run, requestId = null) {
    if (signal?.aborted) throw new AgentsTransportError("aborted", operation, "aborted before the request was made", { delivery: mutation ? "not_sent" : null });
    try { return await calls.run({ operation, requestId }, run); } catch (error) { throw translate(error, operation, mutation, signal); }
  }

  return Object.freeze({
    async createSession(request, { signal } = {}) {
      const { agent, environment, input } = request ?? {};
      if (environment?.type !== "none") throw invalid("createSession", "only environment:none is available");
      if (typeof input !== "string" || !input.trim()) throw invalid("createSession", "environment:none requires initial input");
      const hasModel = typeof agent?.model === "string" && agent.model;
      const hasAgentId = typeof agent?.id === "string" && agent.id;
      if (!hasModel && !hasAgentId) throw invalid("createSession", "agent.model or agent.id is required");
      const tools = functionTools(agent.tools);
      const inline = { ...(hasModel ? { model: agent.model } : {}), ...(typeof agent.instructions === "string" ? { instructions: agent.instructions } : {}), ...(tools ? { tools } : {}) };
      const body = {
        environment: { type: "none" }, input, stream: false,
        ...(hasAgentId ? { agent_id: agent.id } : {}),
        ...(Object.keys(inline).length ? { agent: inline } : {}),
      };
      const native = await call("createSession", true, signal, () => sessions.create(body, options(signal)));
      return nativeSession("createSession", native, true);
    },

    /** One request, one caller-owned key. The key is never generated here. */
    async sendEvents(sessionId, events, { requestId, signal } = {}) {
      requireSessionId("sendEvents", sessionId);
      if (!Array.isArray(events) || !events.length || events.some(event => !event || typeof event !== "object" || !EVENT_KINDS[event.type])) {
        throw invalid("sendEvents", "events must be agent.session.input message, tool_result or cancel events");
      }
      if (typeof requestId !== "string" || !REQUEST_ID.test(requestId)) throw invalid("sendEvents", "a caller-owned requestId is required");
      await call("sendEvents", true, signal, () => sessions.events.create(sessionId, { events, "Idempotency-Key": requestId }, options(signal)), requestId);
      return { accepted: true };
    },

    /**
     * The SDK's own event iterator. `abort()` releases the connection before
     * or during the response and is safe to repeat; it sends nothing to the
     * service and settles nothing. A stream that ends is only a stream that
     * ended. Reconnecting is the caller's decision, never made here.
     */
    streamEvents(sessionId) {
      requireSessionId("streamEvents", sessionId);
      const controller = new AbortController();
      async function* events() {
        let stream;
        try {
          stream = await calls.run({ operation: "streamEvents", requestId: null }, () => sessions.events.stream(sessionId, options(controller.signal)));
          yield* stream;
        } catch (error) {
          if (controller.signal.aborted) return;
          throw translate(error, "streamEvents", false, null);
        } finally {
          stream?.controller.abort();
          controller.abort();
        }
      }
      return { events: events(), abort: () => controller.abort() };
    },

    async getSession(sessionId, { signal } = {}) {
      requireSessionId("getSession", sessionId);
      const native = await call("getSession", false, signal, () => sessions.retrieve(sessionId, options(signal)));
      return nativeSession("getSession", native, false, sessionId);
    },

    /** One turn's current status, read from the service (P03-D). A read: it
     * changes nothing, and a turn that is not the one asked for is an error. */
    async getTurn(sessionId, turnId, { signal } = {}) {
      requireSessionId("getTurn", sessionId);
      if (typeof turnId !== "string" || !SAFE_TOKEN.test(turnId)) throw invalid("getTurn", "a native turn id is required");
      const turn = await call("getTurn", false, signal, () => sessions.turns.retrieve(turnId, { session_id: sessionId }, options(signal)));
      if (!turn || typeof turn !== "object" || turn.id !== turnId || turn.session_id !== sessionId || typeof turn.status !== "string") {
        throw new AgentsTransportError("malformed_response", "getTurn", "the response is not the requested native turn");
      }
      return turn;
    },

    /** Returns the service's page body itself, so `last_id` and `first_id`
     * survive; the SDK's page object keeps only `data` and `has_more`. */
    async listItems(sessionId, params = {}, { signal } = {}) {
      requireSessionId("listItems", sessionId);
      const { order, limit, after } = params ?? {};
      const query = { ...(order ? { order } : {}), ...(limit ? { limit } : {}), ...(after ? { after } : {}) };
      const page = await call("listItems", false, signal, () => sessions.items.list(sessionId, query, options(signal)));
      const body = page?.body;
      if (!body || typeof body !== "object" || !Array.isArray(body.data) || typeof body.has_more !== "boolean") {
        throw new AgentsTransportError("malformed_response", "listItems", "the response is not an items page");
      }
      // A page that says more exists must say where to continue: `last_id`, or
      // failing that the id of its last item. Otherwise a caller that stops
      // here would hold a partial history that looks complete.
      const usable = (id) => typeof id === "string" && id !== "";
      if (body.has_more && !usable(body.last_id) && !usable(body.data.at(-1)?.id)) {
        throw new AgentsTransportError("malformed_response", "listItems", "the page reports more items but gives no cursor to continue from");
      }
      return body;
    },
  });
}
