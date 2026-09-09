/* WO-PV-FE01 · 一个 loopback 的 OpenAI 兼容端点，让"兼容连接"这条路径能在不联网、
 * 无任何真实凭据的前提下走完 discover → save → 选中 → 真跑一次 run。
 *
 * 它自己只做两件事：报一个**两条模型、且不报告任何 contextWindow** 的目录（这正是
 * PV-27 / PV-30 要在界面上如实呈现的那种目录），以及对一把约定的坏 key 回 401（让
 * "认证失败"那一类也有真实的信封可观察）。对话本身原样转交给 `app/runtime/
 * fake-provider.mjs` —— 那是本仓既有的 fixture，SSE 与用量都是真的，本文件不另写
 * 一份 provider 实现。 */
import { createServer } from "node:http";
import { createFakeOpenAiProvider } from "../../app/runtime/fake-provider.mjs";

const PORT = Number(process.env.PV_FIXTURE_PORT ?? 8912);
const MODELS = ["loopback-alpha", "loopback-beta"];

const upstream = await createFakeOpenAiProvider({ host: "127.0.0.1", port: 0 });
const target = new URL(upstream.baseUrl);

const server = createServer((req, res) => {
  const send = (status, body) => {
    const text = JSON.stringify(body);
    res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
    res.end(text);
  };
  if ((req.headers.authorization || "").includes("reject-me"))
    return send(401, { error: { message: "invalid api key", type: "invalid_request_error" } });
  if (req.method === "GET" && req.url.startsWith("/v1/models"))
    return send(200, { object: "list", data: MODELS.map((id) => ({ id, object: "model" })) });
  if (req.method === "POST" && req.url.startsWith("/v1/chat/completions")) {
    const proxied = new Request(`http://${target.host}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}) },
      body: req,
      duplex: "half",
    });
    return fetch(proxied)
      .then(async (upstreamRes) => {
        res.writeHead(upstreamRes.status, { "content-type": upstreamRes.headers.get("content-type") ?? "application/json" });
        for await (const chunk of upstreamRes.body) res.write(chunk);
        res.end();
      })
      .catch((error) => send(502, { error: { message: String(error) } }));
  }
  send(404, { error: { message: "not found" } });
});
server.listen(PORT, "127.0.0.1", () => console.log(`directory fixture on 127.0.0.1:${PORT} → ${upstream.baseUrl}`));
