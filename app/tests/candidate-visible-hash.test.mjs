import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { createProvider } from "@earendil-works/pi-ai";
import * as openaiCompletions from "@earendil-works/pi-ai/api/openai-completions";
import { createRepositoryCandidateTools } from "../runtime/repository-candidate-tools.mjs";
import { createIsolatedModelRuntime, createSessionRun } from "../runtime/pi-session-runtime.mjs";

const digest = value => createHash("sha256").update(value).digest("hex");

function candidateTools(fileBytes, { writeCandidate = async () => { throw new Error("unexpected write"); } } = {}) {
  const candidate = {
    status: "active", id: "candidate-visible-hash", revision: 1, writeRevision: 0,
    sourceBindingId: "binding-visible-hash", sourceBindingRevision: 1,
    candidateDirectory: "/fixture/candidate", candidatePath: "/fixture/candidate/worktree",
    containerDevice: "1", containerInode: "2", device: "1", inode: "3",
    stagingDevice: "1", stagingInode: "4",
  };
  return createRepositoryCandidateTools({
    candidate,
    runCandidateFs: async () => ({ verified: true }),
    runRepositoryFs: async request => ({
      path: request.path,
      bytes: fileBytes.length,
      sha256: digest(fileBytes),
      dataBase64: fileBytes.toString("base64"),
    }),
    recordRead: async () => {},
    writeCandidate,
    assertActive: () => true,
  });
}

async function providerCapture() {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    requests.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const number = requests.length;
    const send = value => response.write(`data: ${JSON.stringify(value)}\n\n`);
    const chunk = (delta, finishReason = null) => ({
      id: `candidate-visible-${number}`, object: "chat.completion.chunk", created: 1,
      model: "candidate-visible-model", choices: [{ index: 0, delta, finish_reason: finishReason }],
    });
    response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    if (number === 1) {
      send(chunk({ role: "assistant", tool_calls: [{ index: 0, id: "read-call", type: "function", function: {
        name: "candidate_read", arguments: "{\"path\":\"src/emoji.txt\",\"startLine\":2,\"endLine\":2}",
      } }] }, "tool_calls"));
    } else {
      send(chunk({ role: "assistant", content: "captured" }, "stop"));
    }
    response.end("data: [DONE]\n\n");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {
    requests,
    baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }),
  };
}

test("candidate_read sends Pi the full-file CAS hash while preserving ranged Unicode text", async () => {
  const original = Buffer.from("first\n雪だるま ☃\nlast\n", "utf8");
  const tools = candidateTools(original);
  const readTool = tools.find(tool => tool.name === "candidate_read");
  const direct = await readTool.execute("direct-read", { path: "src/emoji.txt", startLine: 2, endLine: 2 });
  assert.equal(direct.content[0].text, "雪だるま ☃", "the returned file text is not normalized or decorated");
  const directMetadata = JSON.parse(direct.content[1].text.split("\n").slice(1).join("\n"));
  assert.deepEqual(directMetadata.returnedLines, { startLine: 2, endLine: 2 });
  assert.equal(directMetadata.fullFileLines, 4, "the trailing newline remains part of full-file line accounting");
  assert.equal(directMetadata.sha256, digest(original));
  assert.equal(directMetadata.bytes, original.length);
  assert.equal(directMetadata.hashScope, "full-file");
  assert.deepEqual(direct.details, {
    path: "src/emoji.txt", bytes: original.length, sha256: digest(original), candidateId: "candidate-visible-hash",
  }, "existing details consumers retain their compatible metadata");

  const wire = await providerCapture();
  const workDir = await mkdtemp(path.join(tmpdir(), "cw-candidate-visible-hash-"));
  const modelRuntime = await createIsolatedModelRuntime();
  const model = {
    id: "candidate-visible-model", name: "Candidate visible model", provider: "candidate-visible-provider",
    api: "openai-completions", baseUrl: wire.baseUrl, reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 4096, maxTokens: 128,
  };
  modelRuntime.registerNativeProvider(createProvider({
    id: model.provider, name: "Candidate visible provider", baseUrl: wire.baseUrl, models: [model],
    auth: { apiKey: { name: "loopback", resolve: async () => ({ auth: { apiKey: "loopback" } }) } },
    api: { stream: openaiCompletions.stream, streamSimple: openaiCompletions.streamSimple },
  }));
  try {
    const run = await createSessionRun({
      cwd: workDir, agentDir: path.join(workDir, "agent"), modelRuntime, model,
      sessionManager: SessionManager.create(workDir, path.join(workDir, "sessions")),
      systemPrompt: "Read the requested candidate range.", input: "read line two",
      compaction: { enabled: false }, customTools: tools, onEvent: () => {},
    });
    assert.equal((await run.run()).status, "completed");
    assert.equal(wire.requests.length, 2);
    const serialized = wire.requests[1].messages.find(message => message.role === "tool" && message.tool_call_id === "read-call");
    assert.ok(serialized, "the synthetic endpoint captured Pi's serialized tool result");
    assert.match(serialized.content, /雪だるま ☃/);
    assert.match(serialized.content, new RegExp(digest(original)));
    assert.match(serialized.content, /"hashScope": "full-file"/);
    assert.match(serialized.content, /"startLine": 2/);
    assert.match(serialized.content, /repo_write\.expectedSha256/);
    assert.equal("details" in serialized, false, "the assertion observes model-visible content rather than local details");
  } finally {
    await wire.close();
    await rm(workDir, { recursive: true, force: true });
  }
});

test("repo_write still forwards a stale expected hash to the Host CAS boundary", async () => {
  const original = Buffer.from("current\n", "utf8");
  let calls = 0;
  const tools = candidateTools(original, {
    writeCandidate: async request => {
      calls += 1;
      assert.equal(request.expectedSha256, "0".repeat(64));
      const error = new Error("candidate path changed since it was read");
      error.code = "write_conflict";
      throw error;
    },
  });
  const writeTool = tools.find(tool => tool.name === "repo_write");
  await assert.rejects(
    writeTool.execute("stale-write", { path: "src/emoji.txt", text: "replacement\n", expectedSha256: "0".repeat(64) }),
    error => error.code === "write_conflict",
  );
  assert.equal(calls, 1, "the tool does not weaken or replace Host compare-and-swap enforcement");
});
