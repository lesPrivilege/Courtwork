/* Evidence harness only — not product code. A loopback proxy in front of the
 * synthetic Host that holds the first request at each of three points of a
 * plain Home Send, so the Work location panel can be opened while that Send is
 * still in flight (CE-R1):
 *   bind   PUT  /sessions/:id/repository-binding   (the Chat exists, no binding yet)
 *   draft  PUT  /sessions/:id/draft                (bound and read back; not yet admitted)
 *   run    POST /sessions/:id/runs                 (Run admission in flight)
 * Nothing is changed or dropped: a held request is forwarded unmodified when
 * released. Control: GET /__gate (state), POST /__gate/release/<name>.
 *   node gate-proxy.mjs --listen 8953 --target 8951 --log <file.jsonl> */
import http from "node:http";
import { appendFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { listen: { type: "string" }, target: { type: "string" }, log: { type: "string" } } });
const TARGET = `http://127.0.0.1:${values.target}`;
const rules = [
  { name: "bind", match: (m, u) => m === "PUT" && /\/sessions\/[^/]+\/repository-binding$/.test(u) },
  { name: "draft", match: (m, u) => m === "PUT" && /\/sessions\/[^/]+\/draft$/.test(u) },
  { name: "run", match: (m, u) => m === "POST" && /\/sessions\/[^/]+\/runs$/.test(u) },
];
const gates = Object.fromEntries(rules.map((r) => [r.name, { used: false, waiting: false, release: null }]));
const t0 = Date.now();
const record = (entry) => values.log && appendFile(values.log, JSON.stringify({ t: Date.now() - t0, ...entry }) + "\n");

http.createServer(async (req, res) => {
  const url = req.url;
  if (url === "/__gate") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(Object.fromEntries(Object.entries(gates).map(([k, g]) => [k, { used: g.used, waiting: g.waiting }])))); return; }
  const release = url.match(/^\/__gate\/release\/(\w+)$/);
  if (release && req.method === "POST") { const g = gates[release[1]]; g?.release?.(); res.writeHead(200); res.end("{}"); return; }
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const path = url.split("?")[0].replace(/^\/api\/v5/, "");
  const rule = rules.find((r) => r.match(req.method, path));
  const gate = rule && !gates[rule.name].used ? gates[rule.name] : null;
  if (gate) {
    gate.used = true; gate.waiting = true;
    await record({ held: rule.name, method: req.method, path });
    await new Promise((resolve) => { gate.release = resolve; });
    gate.waiting = false;
    await record({ released: rule.name });
  }
  const headers = { ...req.headers, host: `127.0.0.1:${values.target}` };
  if (headers.origin) headers.origin = TARGET;
  delete headers["content-length"];
  const r = await fetch(TARGET + url, { method: req.method, headers, body: body.length ? body : undefined });
  const bytes = Buffer.from(await r.arrayBuffer());
  if (req.method !== "GET") await record({ method: req.method, path: path.replace(/[0-9a-f-]{36}/g, ":id"), status: r.status });
  const out = {}; r.headers.forEach((v, k) => { if (!["content-length", "content-encoding", "transfer-encoding"].includes(k)) out[k] = v; });
  res.writeHead(r.status, out); res.end(bytes);
}).listen(Number(values.listen), "127.0.0.1", () => console.log(`gate proxy ${values.listen} → ${values.target}`));
