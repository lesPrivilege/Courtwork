/* Evidence harness only. Starts a real Host from the tree named by --app on a
 * spare loopback port with a throwaway data directory, points it at the
 * scripted provider, and prints the URL. No real key, no real provider.
 *   node start.mjs --app <tree>/app --data <dir> --port 8941 --provider-port 8942 */
import { parseArgs } from "node:util";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { startScriptedProvider } from "./scripted-provider.mjs";

const { values } = parseArgs({ options: { app: { type: "string" }, data: { type: "string" }, port: { type: "string" }, "provider-port": { type: "string" } } });
const here = path.dirname(fileURLToPath(import.meta.url));
const eventsPath = path.resolve(here, "../../prepared-real-dogfood-20260921/events.json");
const { startServer } = await import(pathToFileURL(path.resolve(values.app, "server/index.mjs")).href);
const provider = await startScriptedProvider({ port: Number(values["provider-port"]), eventsPath });
const runtime = await startServer({ dataDir: path.resolve(values.data), port: Number(values.port), logger: () => {} });
const api = async (method, p, body) => {
  const res = await fetch(`${runtime.url}/api/v5${p}`, { method, headers: { "content-type": "application/json", "x-work-token": runtime.token }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${JSON.stringify(json)}`);
  return json;
};
const existing = (await api("GET", "/provider-connections")).connections?.find(c => c.baseUrl === provider.baseUrl);
const connection = existing ?? (await api("POST", "/provider-connections", { api: "openai-completions", baseUrl: provider.baseUrl, apiKey: "synthetic-harness-not-a-key", models: [{ id: provider.model }] })).connection;
const current = await api("GET", "/provider-config");
await api("PUT", "/provider-config", { provider: connection.providerIdentity, model: provider.model, api: connection.api, baseUrl: connection.baseUrl, expectedVersion: current.version });
if (!(await api("GET", "/projects")).projects?.length) await api("POST", "/projects", { name: "Footer harness" });
console.log(runtime.url);
const stop = async () => { await runtime.close().catch(() => {}); await provider.close(); process.exit(0); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
