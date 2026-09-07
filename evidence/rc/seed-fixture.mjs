// Seeds the running server at --port with a project, a session and runtime
// resources of every locally supported kind, using only the app's HTTP API.
const port = Number(process.env.RC_PORT || 8850);
const base = `http://127.0.0.1:${port}/api/v5`;
let token = null;
async function api(method, path, body) {
  const headers = { Origin: `http://127.0.0.1:${port}` };
  if (token) headers["x-work-token"] = token;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
token = (await api("GET", "/bootstrap")).json.sessionToken;
const projects = (await api("GET", "/projects")).json;
let project = (projects.projects || [])[0];
if (!project) project = (await api("POST", "/projects", { name: "Runtime control fixture" })).json.project;
const sessions = (await api("GET", `/sessions?projectId=${project.id}`)).json;
let session = (sessions.sessions || [])[0];
if (!session) session = (await api("POST", "/sessions", { projectId: project.id, title: "Runtime control" })).json.session;
const suffix = `?sessionId=${session.id}`;
const snapshot = async () => (await api("GET", "/runtime-control" + suffix)).json;
async function change(body) {
  const revision = (await snapshot()).revision;
  const res = await api("PUT", "/runtime-control" + suffix, { revision, ...body });
  if (res.status !== 200) console.error("change failed", body.operation, body.resource?.id || body.id, res.status, JSON.stringify(res.json));
  return res;
}
const userScope = { type: "user", id: "local" };
const workspaceScope = { type: "workspace", id: project.id };
const have = new Set((await snapshot()).resources.map((r) => r.id));
const imports = [
  { id: "local:conventions", kind: "instruction", title: "Writing conventions", scope: userScope, content: "Use concise prose. Cite the source material for every claim." },
  { id: "local:citation", kind: "skill", title: "Citation check", scope: workspaceScope, content: "---\nname: citation-check\ndescription: Verify every quotation against the recorded source before answering.\n---\n\nRead the recorded version, compare each quotation and report mismatches by line." },
  { id: "local:brief", kind: "reference", title: "Case brief format", scope: workspaceScope, content: "A brief states the question, the holding and the reasoning, in that order." },
  { id: "local:review", kind: "prompt_template", title: "Review this draft", scope: userScope, content: "Review the current draft for unsupported claims and list them with line numbers." },
  { id: "local:reader", kind: "agent_profile", title: "Reader profile", scope: userScope, content: JSON.stringify({ schemaVersion: 1, version: "1.0.0", resourceIds: ["tool:ws_read", "tool:ws_list", "tool:runtime_load", "local:conventions"], rules: [{ action: "ws_write", resource: "*", effect: "deny" }], uiSlots: ["runtime.inspector"] }) },
  { id: "local:docs-mcp", kind: "mcp_server", title: "Docs server", scope: userScope, content: JSON.stringify({ transport: "streamable-http", protocol: "2026-07-28", url: "https://example.org/mcp" }) },
];
for (const resource of imports)
  if (!have.has(resource.id)) await change({ operation: "put", resource });
await change({ operation: "policy", scope: workspaceScope, rules: [{ action: "ws_write", resource: "materials/*", effect: "deny" }, { action: "ws_write", resource: "out/*", effect: "ask" }] });
const final = await snapshot();
console.log(JSON.stringify({ projectId: project.id, sessionId: session.id, revision: final.revision, resources: final.resources.map((r) => `${r.kind}:${r.id}`), scopes: final.scopes }, null, 2));
