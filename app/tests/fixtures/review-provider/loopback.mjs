import http from "node:http";

function writeSse(res, value) {
  res.write(`data: ${JSON.stringify(value)}\n\n`);
}

function writeDone(res) {
  res.end("data: [DONE]\n\n");
}

/**
 * A deterministic OpenAI-compatible directory and completions endpoint.
 *
 * The fixture deliberately accepts arbitrary path prefixes.  Tests can then
 * make the complete baseUrl exactly N characters long without changing the
 * network origin, while the SDK still exercises its real `/models` and
 * `/chat/completions` suffix handling.
 */
export async function createReviewProviderFixture({ host = "127.0.0.1", models = [] } = {}) {
  let offeredModels = structuredClone(models);
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (req.method === "GET" && url.pathname.endsWith("/models")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ object: "list", data: offeredModels.map((id) => ({ id })) }));
      return;
    }
    if (req.method !== "POST" || !url.pathname.endsWith("/chat/completions")) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "review fixture route not found" } }));
      return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("error", () => {});
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const authorization = req.headers.authorization ?? null;
        requests.push({ body, authorization });
        const model = typeof body.model === "string" ? body.model : "review-fixture-model";
        const id = `review-response-${requests.length}`;
        const created = Math.floor(Date.now() / 1000);
        res.writeHead(200, {
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "text/event-stream",
        });
        writeSse(res, {
          id,
          object: "chat.completion.chunk",
          created,
          model,
          choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
        });
        writeSse(res, {
          id,
          object: "chat.completion.chunk",
          created,
          model,
          choices: [{ index: 0, delta: { content: "REVIEW FIXTURE RESPONSE" }, finish_reason: null }],
        });
        writeSse(res, {
          id,
          object: "chat.completion.chunk",
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });
        writeDone(res);
      } catch (error) {
        if (!res.headersSent) res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: error instanceof Error ? error.message : "invalid request" } }));
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const origin = `http://${host}:${port}`;
  const baseUrl = (length, prefix = "/v1") => {
    const root = origin + prefix;
    const paddingLength = length - root.length - 1;
    if (paddingLength < 0) throw new RangeError(`fixture URL length ${length} is shorter than its loopback origin`);
    return `${root}/${"p".repeat(paddingLength)}`;
  };

  return {
    origin,
    baseUrl,
    requests,
    setModels(next) { offeredModels = structuredClone(next); },
    async close() {
      if (!server.listening) return;
      server.closeIdleConnections?.();
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}
