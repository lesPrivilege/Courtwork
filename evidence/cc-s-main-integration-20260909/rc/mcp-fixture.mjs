// A loopback Streamable HTTP MCP server used only to exercise the runtime UI's
// lifecycle buttons and remote-tool rows. It is a wire fixture, not a service.
import http from "node:http";
const port = Number(process.env.MCP_PORT || 8851);
const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") { res.writeHead(405); res.end(); return; }
  let raw = ""; for await (const chunk of req) raw += chunk;
  const request = JSON.parse(raw);
  if (request.id === undefined) { res.writeHead(202); res.end(); return; }
  let result;
  if (request.method === "server/discover")
    result = { supportedVersions: ["2026-07-28"], capabilities: { tools: {}, resources: {}, prompts: {} } };
  else if (request.method === "tools/list")
    result = { tools: [
      { name: "search_docs", description: "Search the fixture document set.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
      { name: "fetch_doc", description: "Fetch one fixture document by id.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
    ] };
  else if (request.method === "resources/list") result = { resources: [{ uri: "fixture://handbook", name: "fixture handbook" }] };
  else if (request.method === "prompts/list") result = { prompts: [{ name: "summarise", description: "Summarise a fixture document" }] };
  else if (request.method === "tools/call") result = { content: [{ type: "text", text: "fixture result" }] };
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(result
    ? { jsonrpc: "2.0", id: request.id, result: { resultType: "complete", ...(request.method.endsWith("/list") ? { ttlMs: 0, cacheScope: "private" } : {}), ...result } }
    : { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "unsupported" } }));
});
server.listen(port, "127.0.0.1", () => console.log(`mcp fixture http://127.0.0.1:${port}`));
