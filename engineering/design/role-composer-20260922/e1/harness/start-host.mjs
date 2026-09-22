/* Evidence harness only — not product code. Starts a real Host from the tree
 * named by --app (a scratch copy; see run.sh) on a spare loopback port with a
 * throwaway data directory and the built-in Local test provider (no key, no
 * paid call), then prepares one ordinary Chat and two imported agent_profile
 * sources through the Host's own authenticated Runtime Control API.
 *   node start-host.mjs --app <scratch>/app --data <dir> --port 8967
 * Prints one JSON line with the URL, token-bearing app URL and ids. */
import { parseArgs } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { values } = parseArgs({ options: { app: { type: "string" }, data: { type: "string" }, port: { type: "string" } } });
const app = path.resolve(values.app);
const { startServer } = await import(pathToFileURL(path.join(app, "server/index.mjs")).href);
const { FAKE_CREDENTIAL_KEY } = await import(pathToFileURL(path.join(app, "runtime/pi-session-runtime.mjs")).href);
const runtime = await startServer({ dataDir: path.resolve(values.data), port: Number(values.port), logger: () => {} });
const api = async (method, p, body) => {
  const res = await fetch(`${runtime.url}/api/v5${p}`, { method, headers: { "content-type": "application/json", "x-work-token": runtime.token }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${JSON.stringify(json)}`);
  return json;
};
await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
const { session } = await api("POST", "/sessions", { title: "Agent choice check" });
const q = `?sessionId=${encodeURIComponent(session.id)}`;
let snap = await api("GET", `/runtime-control${q}`);
const scope = snap.scopes.find((s) => s.type === "user") || snap.scopes[0];
const put = async (resource) => { snap = await api("PUT", `/runtime-control${q}`, { revision: snap.revision, operation: "put", resource }); };
await put({ id: "local:e1-review-notes", kind: "instruction", title: "Review notes style", scope, content: "Write review notes as short numbered findings. (synthetic)" });
await put({ id: "local:e1-reviewer", kind: "agent_profile", title: "Reviewer", scope, content: JSON.stringify({ schemaVersion: 1, version: "1.0.0", resourceIds: ["local:e1-review-notes"], rules: [], uiSlots: [] }) });
await put({ id: "local:e1-drafter", kind: "agent_profile", title: "Drafter", scope, content: JSON.stringify({ schemaVersion: 1, version: "1.0.0", resourceIds: [], rules: [], uiSlots: [] }) });
console.log(JSON.stringify({ url: runtime.url, sessionId: session.id, revision: snap.revision, profiles: snap.resources.filter((r) => r.kind === "agent_profile").map((r) => r.id), capability: snap.compatibility?.runtimeSelection ?? null }));
