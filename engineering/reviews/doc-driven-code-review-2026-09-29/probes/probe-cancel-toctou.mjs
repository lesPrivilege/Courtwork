import { boot } from "../../../../app/tests/helpers.mjs";
const h = await boot();
try {
  const store = h.runtime.store, service = h.runtime.service;
  const s = await h.createSession();
  let hit = false, resolveHit; const hitP = new Promise(r => resolveHit = r);
  const orig = store._persist.bind(store);
  store._persist = async (state) => {
    const r = state.runs.find(x => x.status === "completed");
    if (r && !hit) { hit = true; resolveHit(r.id); await new Promise(res => setTimeout(res, 400)); }
    return orig(state);
  };
  const created = await h.api("POST", `/sessions/${s.id}/runs`, { input: "hello", commandId: "c1" });
  const runId = created.json.run.id;
  await hitP;                                   // the "completed" write is in flight, not yet published
  console.log("visible status while completion write is in flight:", store.getRun(runId).status);
  const res = await service.cancelRun(runId, {});
  const final = store.getRun(runId);
  const statuses = store.listEvents({ sessionId: s.id, runId }).filter(e => e.type === "run.status").map(e => e.data.status);
  console.log("cancelRun returned:", res.run.status, "| final:", final.status, "| status events:", JSON.stringify(statuses));
} finally { await h.runtime.close(); }
