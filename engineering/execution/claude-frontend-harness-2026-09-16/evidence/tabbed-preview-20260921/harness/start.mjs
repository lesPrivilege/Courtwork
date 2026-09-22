/* Evidence harness only — not product code. Starts a real Host from the tree
 * named by --app on a spare loopback port with a throwaway data directory and
 * the built-in Local test provider (no key, no paid call, no real site), then
 * makes real objects through the Host's own tools with `/fixture script` runs:
 *
 *   Work A "Parcel brief review"
 *     run 1  ws_write out/brief.md (long, for reading position)
 *            ws_write out/…long file name….md
 *            cw_present facts "Parcel facts"
 *     run 2  ws_write out/brief.md again (a second recorded version, same path)
 *   Work B "Quarterly ledger check"
 *     run 1  ws_write out/ledger.md
 *   Chat "Bound location check"    bound to a synthetic Git folder, no run
 *   Chat "Unbound location check"  no folder, no run
 * The synthetic folder (one commit, long name) is made under --folder-root;
 * Home can stage and prepare it too (CE-F2 states).
 *
 *   node start.mjs --app <tree>/app --data <dir> --folder-root <dir> --port 8963
 * Prints one JSON line with the URL and the ids, then keeps serving. */
import { parseArgs } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const { values } = parseArgs({ options: { app: { type: "string" }, data: { type: "string" }, "folder-root": { type: "string" }, port: { type: "string" } } });
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
const script = (calls) => `/fixture script ${JSON.stringify(calls)}`;
async function run(sessionId, calls, commandId) {
  const { run } = await api("POST", `/sessions/${sessionId}/runs`, { input: script(calls), commandId });
  for (let i = 0; i < 400; i++) {
    const { run: now } = await api("GET", `/runs/${run.id}`);
    if (["completed", "failed", "cancelled", "unknown"].includes(now.status)) {
      if (now.status !== "completed") throw new Error(`run ${run.id} ended ${now.status}`);
      return now;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`run ${run.id} did not finish`);
}

const section = (n) => [
  `## Section ${n} · parcel boundary reading`,
  "",
  ...Array.from({ length: 6 }, (_, i) => `Paragraph ${n}.${i + 1}. The synthetic parcel record lists a boundary, a survey date and an owner of record. Nothing here describes a real place or person; it exists so a reading position can be kept and measured.`),
  "",
].join("\n");
const brief = (version) => [`# Parcel brief · version ${version}`, "", ...Array.from({ length: 12 }, (_, i) => section(i + 1))].join("\n");

await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
const { project } = await api("POST", "/projects", { name: "Parcel review" });
const { session: a } = await api("POST", "/sessions", { projectId: project.id, title: "Parcel brief review" });
const { session: b } = await api("POST", "/sessions", { projectId: project.id, title: "Quarterly ledger check" });
const longName = "out/a-deliberately-long-file-name-that-has-to-be-truncated-in-its-preview-tab.md";
const a1 = await run(a.id, [
  { name: "ws_write", arguments: { path: "out/brief.md", text: brief(1) } },
  { name: "ws_write", arguments: { path: longName, text: "# Notes\n\nA short synthetic note whose only purpose is a long file name.\n" } },
  { name: "cw_present", arguments: { spec: { kind: "facts", version: 1, title: "Parcel facts", items: [
    { label: "Boundary", value: "Synthetic north line" }, { label: "Survey", value: "2026-09-01 (synthetic)" }, { label: "Owner of record", value: "Synthetic Holdings" },
  ] } } },
], "cmd-a1");
const a2 = await run(a.id, [{ name: "ws_write", arguments: { path: "out/brief.md", text: brief(2) } }], "cmd-a2");
const b1 = await run(b.id, [{ name: "ws_write", arguments: { path: "out/ledger.md", text: "# Ledger\n\n" + Array.from({ length: 80 }, (_, i) => `- Synthetic line ${i + 1}: 100.00`).join("\n") + "\n" } }], "cmd-b1");

const folder = path.join(path.resolve(values["folder-root"]), "synthetic-parcel-repository-with-a-deliberately-long-folder-name-for-the-work-location-panel");
mkdirSync(folder, { recursive: true });
writeFileSync(path.join(folder, "README.md"), "# Synthetic parcel repository\n\nNo real data.\n");
const git = (...args) => execFileSync("git", ["-C", folder, ...args], { env: { ...process.env, GIT_AUTHOR_NAME: "Synthetic", GIT_AUTHOR_EMAIL: "synthetic@example.invalid", GIT_COMMITTER_NAME: "Synthetic", GIT_COMMITTER_EMAIL: "synthetic@example.invalid" }, stdio: "ignore" });
git("init", "-q"); git("add", "."); git("commit", "-q", "-m", "synthetic");
const { session: c } = await api("POST", "/sessions", { projectId: project.id, title: "Bound location check" });
await api("PUT", `/sessions/${c.id}/repository-binding`, { operation: "bind", requestId: "fixture-bind-c", expectedRevision: 0, rootPath: folder });
const { session: d } = await api("POST", "/sessions", { projectId: project.id, title: "Unbound location check" });

console.log(JSON.stringify({ url: runtime.url, projectId: project.id, folder, sessions: { a: a.id, b: b.id, bound: c.id, unbound: d.id }, runs: { a1: a1.id, a2: a2.id, b1: b1.id } }));
const stop = async () => { await runtime.close().catch(() => {}); process.exit(0); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
