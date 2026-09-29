// F1 with NO artificial delay: observe the moment the Host issues its own "completed" write and call cancelRun in the same tick.
// (This is what an HTTP cancel arriving in the ~persist window does.) Real persist duration only.
import { boot } from "../../../../app/tests/helpers.mjs";
const h = await boot();
try {
  const st = h.runtime.store, svc = h.runtime.service;
  const s = await h.createSession();
  const orig = st.updateRunWithEvent.bind(st);
  let cancelPromise;
  st.updateRunWithEvent = (id, patch, ev) => {
    const p = orig(id, patch, ev);
    if (patch.status === "completed" && !cancelPromise) cancelPromise = svc.cancelRun(id, {});   // sync, after the write is queued, before it is published
    return p;
  };
  const created = await h.api("POST", `/sessions/${s.id}/runs`, { input: "hello", commandId: "x1" });
  const runId = created.json.run.id;
  await h.pollRun(runId);
  const res = await cancelPromise;
  await new Promise(r => setTimeout(r, 100));
  console.log(JSON.stringify({ cancelReturned: res.run.status, final: st.getRun(runId).status,
    statuses: st.listEvents({ sessionId: s.id, runId }).filter(e => e.type === "run.status").map(e => e.data.status) }));
} finally { await h.runtime.close(); }
