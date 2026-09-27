// HPR-R1/R2 counterexamples from the parent review (parent-identity-probe.mjs
// and Luna's limits probe), with a transport that has every operation the
// adapter uses. Deterministic injected transports; no network, no run.
//   CW_REVIEW_SOURCE=<checkout> node identity-probe.mjs
import { pathToFileURL } from "node:url";
import path from "node:path";
const root = process.env.CW_REVIEW_SOURCE;
if (!root) throw new Error("Set CW_REVIEW_SOURCE");
const { createHermesRunsAdapter } = await import(pathToFileURL(path.join(root, "app/runtime/hermes-api-runs-adapter.mjs")));
const { createHermesRunsTransport } = await import(pathToFileURL(path.join(root, "app/runtime/hermes-api-runs-transport.mjs")));
const requests = [];
const transport = (endpoint) => ({
  endpointIdentity: endpoint,
  async createRun(input) { requests.push({ endpoint, ...input }); return { status: 202, json: { run_id: "run-new", status: "started", replayed: false } }; },
  async getRun(id) { return { status: 200, json: { run_id: id, status: "completed", completed: true, session_id: "session-from-A", output: "ok" } }; },
  async stopRun() { return { status: 200, json: {} }; },
  async *events() {},
  close() { return 0; },
});
const outcome = async (fn) => { try { await fn(); return "accepted"; } catch (error) { return `refused:${error.code}`; } };
const a = createHermesRunsAdapter({ transport: transport("http://127.0.0.1:1111") });
const b = createHermesRunsAdapter({ transport: transport("http://127.0.0.1:2222") });
const from = await a.status("run-a");
const result = {
  crossContinuation: await outcome(async () => b.admit(b.continuationIntent({ input: "continue", idempotencyKey: "key-b", from }))),
  forgedAdmission: await outcome(() => b.admit(Object.freeze({ idempotencyKey: "forged", body: { input: "x", session_id: "arbitrary", toolsets: ["all"] } }))),
  legitimateContinuation: await outcome(async () => a.admit(a.continuationIntent({ input: "continue", idempotencyKey: "key-a", from }))),
  limits: {
    transportNaNFrame: await outcome(() => createHermesRunsTransport({ endpoint: "http://127.0.0.1:1", limits: { maxFrameBytes: NaN } })),
    transportInfinityStream: await outcome(() => createHermesRunsTransport({ endpoint: "http://127.0.0.1:1", limits: { maxStreamBytes: Infinity } })),
    transportNegativeIdle: await outcome(() => createHermesRunsTransport({ endpoint: "http://127.0.0.1:1", limits: { streamIdleMs: -1 } })),
    adapterNaNDiagnostics: await outcome(() => createHermesRunsAdapter({ transport: transport("http://127.0.0.1:3"), limits: { maxDiagnostics: NaN } })),
    adapterInfinityText: await outcome(() => createHermesRunsAdapter({ transport: transport("http://127.0.0.1:3"), limits: { maxTextChars: Infinity } })),
  },
  requests,
};
console.log(JSON.stringify(result, null, 2));
