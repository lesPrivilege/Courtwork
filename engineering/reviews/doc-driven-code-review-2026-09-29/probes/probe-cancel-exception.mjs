import { boot } from "../../../../app/tests/helpers.mjs";
import { createPiRuntimePort } from "../../../../app/runtime/pi-runtime-port.mjs";
const runtimePort = (o) => {
  const real = createPiRuntimePort(o);
  return { ...real, openSession(args) { const s = real.openSession(args); return { ...s, async start(opts) {
    const st = await s.start(opts);
    // the native runtime neither confirms termination nor reports "aborted": it throws while a cancel is pending
    return { ...st, abort: async () => {}, run: async () => { await new Promise(r => setTimeout(r, 300)); throw Object.assign(new Error("native runtime lost the session"), { code: "native_lost" }); } };
  } }; } };
};
const h = await boot({ runtimePort });
try {
  const s = await h.createSession();
  const created = await h.api("POST", `/sessions/${s.id}/runs`, { input: "hello", commandId: "c1" });
  const runId = created.json.run.id;
  await new Promise(r => setTimeout(r, 50));
  const res = await h.api("POST", `/runs/${runId}/cancel`, {});
  const ev = h.runtime.store.listEvents({ sessionId: s.id, runId }).filter(e => e.type === "run.error").map(e => e.data);
  console.log("cancel ->", res.json.run.status, "run.error:", JSON.stringify(res.json.run.error), "| run.error events:", JSON.stringify(ev));
  // contrast: same exception with NO cancel requested
  const s2 = await h.createSession();
  const c2 = await h.api("POST", `/sessions/${s2.id}/runs`, { input: "hello", commandId: "c2" });
  const r2 = await h.pollRun(c2.json.run.id);
  console.log("same exception without cancel ->", r2.status, JSON.stringify(r2.error));
} finally { await h.runtime.close(); }
