import http from "node:http";

import { createModels, createProvider } from "@earendil-works/pi-ai";
import * as openaiCompletions from "@earendil-works/pi-ai/api/openai-completions";

const PROVIDER_ID = "fake-openai-loopback";
const MODEL_ID = "fake-model";
const API_ID = "openai-completions";

const zeroCost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
// Scripted step name that makes the route answer with a provider HTTP error.
const ERROR_DIRECTIVE = "fixture_error";
// Scripted step name that fails ONCE and then answers normally, so a test can
// observe the SDK's own retry: the first attempt is a 5xx, the retry succeeds,
// and only the successful attempt reports usage.
const ERROR_ONCE_DIRECTIVE = "fixture_error_once";
// Milliseconds a "/fixture slow" response waits before its FIRST token, so a
// test can cancel while the run is genuinely waiting on the model.
const SLOW_FIRST_TOKEN_MS = 600;

function textFromMessage(message) {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  return (message.content ?? [])
    .filter((part) => part?.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function writeSse(res, value) {
  res.write(`data: ${JSON.stringify(value)}\n\n`);
}

function writeDone(res) {
  res.end("data: [DONE]\n\n");
}

function assistantChunk({ id, created, model, delta, finishReason = null, usage }) {
  return {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
    ...(usage ? { usage } : {}),
  };
}

function requestMode(messages) {
  const user = [...(messages ?? [])].reverse().find((message) => message?.role === "user");
  return textFromMessage(user).trim();
}

/**
 * Messages belonging to the CURRENT turn: everything after the last user
 * message. A host session continues across runs, so the conversation handed to
 * the provider carries earlier runs' tool results too. A `/fixture script` is a
 * script for THIS run, so its step index must be counted within this turn —
 * otherwise a second run in a continued session indexes past the end of its own
 * script and silently answers with text instead of calling its tools.
 */
function currentTurn(messages) {
  const list = messages ?? [];
  let start = 0;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.role === "user") { start = i + 1; break; }
  }
  return list.slice(start);
}

function hasToolResult(messages) {
  return [...currentTurn(messages)].reverse().find((message) => message?.role === "tool");
}

function scriptForMode(mode) {
  const prefix = "/fixture script ";
  if (!mode.startsWith(prefix)) return null;
  try {
    const script = JSON.parse(mode.slice(prefix.length));
    if (!Array.isArray(script) || script.length > 32) return null;
    if (script.some((call) => !call || typeof call.name !== "string" || !call.arguments || typeof call.arguments !== "object" || Array.isArray(call.arguments))) return null;
    return script;
  } catch {
    return null;
  }
}

function makeResponse({ body, requestNumber, responder, spentErrorOnce }) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const mode = requestMode(messages);
  const toolResult = hasToolResult(messages);
  const id = `fake-response-${requestNumber}`;
  const created = Math.floor(Date.now() / 1000);

  if (typeof responder === "function") {
    const custom = responder({ body: structuredClone(body), requestNumber, mode });
    if (custom && typeof custom === "object") return custom;
  }

  const script = scriptForMode(mode);
  if (script) {
    const toolResults = currentTurn(messages).filter((message) => message?.role === "tool").length;
    const call = script[toolResults];
    if (call?.name === ERROR_DIRECTIVE) return { kind: "http-error", status: 502, message: "fake provider error" };
    if (call?.name === ERROR_ONCE_DIRECTIVE) {
      if (!spentErrorOnce.has(toolResults)) {
        spentErrorOnce.add(toolResults);
        return { kind: "http-error", status: 502, message: "fake provider error (first attempt)" };
      }
      return { kind: "text", id, created, text: "SIMULATED recovered response" };
    }
    if (call) return { kind: "tool", id, created, toolCallId: `fake-script-${requestNumber}-${toolResults}`, name: call.name, arguments: call.arguments };
    return { kind: "text", id, created, text: "SIMULATED scripted response" };
  }

  if (mode.startsWith("/fixture error")) {
    return { kind: "http-error", status: 502, message: "fake provider error" };
  }

  if (mode.startsWith("/fixture question") && !toolResult) {
    return {
      kind: "tool",
      id,
      created,
      toolCallId: `fake-question-${requestNumber}`,
      prompt: "What should the fake run use as its answer?",
    };
  }

  if (toolResult) {
    return { kind: "text", id, created, text: `SIMULATED answer received: ${textFromMessage(toolResult)}` };
  }

  return {
    kind: "text",
    id,
    created,
    text: `SIMULATED fake response: ${mode || "(empty input)"}`,
  };
}

async function writeTextResponse(res, response, { slow = false } = {}) {
  const { id, created, text } = response;
  const chunks = text.match(/.{1,24}/gu) ?? [text];
  // The wait goes BEFORE the first token: "cancel while waiting on the model"
  // has to mean no token has arrived yet.
  if (slow) await new Promise((resolve) => setTimeout(resolve, SLOW_FIRST_TOKEN_MS));
  writeSse(res, assistantChunk({ id, created, model: MODEL_ID, delta: { role: "assistant" } }));
  for (const chunk of chunks) {
    if (slow) await new Promise((resolve) => setTimeout(resolve, 100));
    writeSse(res, assistantChunk({ id, created, model: MODEL_ID, delta: { content: chunk } }));
  }
  writeSse(
    res,
    assistantChunk({
      id,
      created,
      model: MODEL_ID,
      delta: {},
      finishReason: "stop",
      usage: { prompt_tokens: 1, completion_tokens: chunks.length, total_tokens: chunks.length + 1 },
    }),
  );
  writeDone(res);
}

async function writeToolResponse(res, response) {
  const { id, created, toolCallId, prompt, name = "ask_user", arguments: toolArguments = { prompt } } = response;
  writeSse(
    res,
    assistantChunk({
      id,
      created,
      model: MODEL_ID,
      delta: { role: "assistant", tool_calls: [{ index: 0, id: toolCallId, type: "function" }] },
    }),
  );
  writeSse(
    res,
    assistantChunk({
      id,
      created,
      model: MODEL_ID,
      delta: {
        tool_calls: [
          {
            index: 0,
            function: { name, arguments: JSON.stringify(toolArguments) },
          },
        ],
      },
      finishReason: "tool_calls",
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  );
  writeDone(res);
}

/**
 * Start the only provider used by this slice. It is deliberately an explicit
 * loopback HTTP route, with a static test auth marker and no env/config lookup.
 */
export async function createFakeOpenAiProvider({ host = "127.0.0.1", port = 0, responder = null, fakeResponder = null } = {}) {
  const responseHook = responder ?? fakeResponder;
  const requests = [];
  const spentErrorOnce = new Set();
  let requestNumber = 0;
  const server = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "fake route not found" } }));
      return;
    }

    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) req.destroy(new Error("fake request too large"));
      else chunks.push(chunk);
    });
    req.on("error", () => {});
    req.on("end", async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const current = ++requestNumber;
        requests.push({ body, authorization: req.headers.authorization ?? null });
        const response = makeResponse({ body, requestNumber: current, responder: responseHook, spentErrorOnce });
        if (response.kind === "http-error") {
          res.writeHead(response.status, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: response.message } }));
          return;
        }

        res.writeHead(200, {
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "text/event-stream",
        });
        if (response.kind === "tool") {
          await writeToolResponse(res, response);
          return;
        }
        await writeTextResponse(res, response, { slow: response.slow === true || requestMode(body.messages).startsWith("/fixture slow") });
      } catch (error) {
        if (!res.headersSent) res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: error instanceof Error ? error.message : "invalid fake request" } }));
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const baseUrl = `http://${host}:${actualPort}/v1`;
  const model = {
    id: MODEL_ID,
    name: "Fake local model",
    api: API_ID,
    provider: PROVIDER_ID,
    baseUrl,
    reasoning: false,
    input: ["text"],
    cost: zeroCost,
    contextWindow: 4096,
    maxTokens: 256,
  };
  const provider = createProvider({
    id: PROVIDER_ID,
    name: "Fake OpenAI loopback",
    baseUrl,
    auth: {
      apiKey: {
        name: "fake-local",
        resolve: async () => ({ auth: { apiKey: "fake-local" } }),
      },
    },
    models: [model],
    api: { stream: openaiCompletions.stream, streamSimple: openaiCompletions.streamSimple },
  });
  const models = createModels();
  models.setProvider(provider);

  return {
    provider,
    models,
    model,
    baseUrl,
    requests,
    async close() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}

export const fakeProviderDescriptor = Object.freeze({
  provider: PROVIDER_ID,
  model: MODEL_ID,
  api: API_ID,
  realProvider: false,
});

export const FIXTURE_ERROR_DIRECTIVE = ERROR_DIRECTIVE;
export const FIXTURE_ERROR_ONCE_DIRECTIVE = ERROR_ONCE_DIRECTIVE;
export const FIXTURE_SLOW_FIRST_TOKEN_MS = SLOW_FIRST_TOKEN_MS;
export const FAKE_PROVIDER_ID = PROVIDER_ID;
export const FAKE_MODEL_ID = MODEL_ID;
export const FAKE_API_ID = API_ID;
