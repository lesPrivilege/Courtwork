/* Evidence harness only — not product code. A loopback OpenAI-compatible
 * chat-completions route whose replies are fixed scripts, so the browser can
 * watch one Run go narration → tool → answer without any real model.
 *
 * The script is chosen by the Run's user text (no leading slash: Chat
 * reads a slash as a command):
 *   replay dogfood     the five non-empty assistant texts and five empty
 *                       tool-only turns of the 2026-09-21 prepared real
 *                       dogfood Run, in their recorded order, with ws_list
 *                       standing in for each turn's tools
 *   replay controlled  slow narration → ask_user (waits for the person) →
 *                       slow narration → ws_list → slow final answer
 *   replay fail        narration → ws_list → provider 400 (Run fails)
 *   replay cancel      narration → ws_list → a very slow answer to Stop
 * Each step is picked by how many tool results the current turn holds. */
import http from "node:http";
import { readFileSync } from "node:fs";

const MODEL = "scripted-model";

function dogfoodSteps(eventsPath) {
  const { events } = JSON.parse(readFileSync(eventsPath, "utf8"));
  const turns = events.filter(e => e.type === "assistant.message").map(e => ({ text: e.data.text || "", stop: e.data.stopReason }));
  return turns.map(turn => turn.stop === "toolUse"
    ? { text: turn.text, tool: { name: "ws_list", arguments: {} } }
    : { text: turn.text });
}

const scripts = (eventsPath) => ({
  "replay dogfood": { pace: 0, steps: dogfoodSteps(eventsPath) },
  "replay controlled": { pace: 250, steps: [
    { text: "Planning: I will list the workspace first, then ask you one question before I answer.", tool: { name: "ask_user", arguments: { prompt: "Controlled sequence: reply with any word to continue." } } },
    { text: "Thanks. Listing the workspace now so the answer can cite it.", tool: { name: "ws_list", arguments: {} } },
    { text: "Final answer: the workspace listing came back and the controlled sequence is complete." },
  ] },
  "replay fail": { pace: 0, steps: [
    { text: "Narration before a tool in a Run that will fail.", tool: { name: "ws_list", arguments: {} } },
    { error: 400 },
  ] },
  "replay cancel": { pace: 0, steps: [
    { text: "Narration before a tool in a Run that will be cancelled.", tool: { name: "ws_list", arguments: {} } },
    { text: "A partial answer that streams slowly enough to be stopped while it is still arriving, word by word, for a long while yet, and then a little longer still so that Stop lands first.", pace: 3000 },
  ] },
});

const textOf = m => typeof m?.content === "string" ? m.content : (m?.content ?? []).filter(p => p?.type === "text").map(p => p.text).join("");
const chunk = (id, delta, finish = null, usage) => ({ id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: MODEL, choices: [{ index: 0, delta, finish_reason: finish }], ...(usage ? { usage } : {}) });
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function startScriptedProvider({ port, eventsPath }) {
  const table = scripts(eventsPath);
  let n = 0;
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/v1/models") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ object: "list", data: [{ id: MODEL }] })); return; }
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") { res.writeHead(404); res.end("{}"); return; }
    const parts = [];
    req.on("data", c => parts.push(c));
    req.on("end", async () => {
      const body = JSON.parse(Buffer.concat(parts).toString("utf8"));
      const messages = body.messages ?? [];
      let last = 0;
      for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === "user") { last = i; break; }
      const mode = textOf(messages[last]).trim();
      const toolResults = messages.slice(last + 1).filter(m => m?.role === "tool").length;
      const script = table[mode];
      const step = script?.steps[toolResults] ?? { text: `Unscripted reply to: ${mode}` };
      const id = `scripted-${++n}`;
      if (step.error) { res.writeHead(step.error, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "scripted provider refusal" } })); return; }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      let closed = false; res.on("close", () => { closed = true; });
      const send = obj => { if (!closed) res.write(`data: ${JSON.stringify(obj)}\n\n`); };
      send(chunk(id, { role: "assistant" }));
      const pace = step.pace ?? script?.pace ?? 0;
      for (const piece of (step.text || "").match(/.{1,24}/gsu) ?? []) { if (pace) await sleep(pace); send(chunk(id, { content: piece })); }
      if (step.tool) {
        const callId = `call-${n}`;
        send(chunk(id, { tool_calls: [{ index: 0, id: callId, type: "function" }] }));
        send(chunk(id, { tool_calls: [{ index: 0, function: { name: step.tool.name, arguments: JSON.stringify(step.tool.arguments) } }] }, "tool_calls", { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }));
      } else send(chunk(id, {}, "stop", { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }));
      if (!closed) { res.write("data: [DONE]\n\n"); res.end(); }
    });
  });
  await new Promise(r => server.listen(port, "127.0.0.1", r));
  return { baseUrl: `http://127.0.0.1:${port}/v1`, model: MODEL, close: () => new Promise(r => server.close(r)) };
}
