// host F2: native root turn COMPLETED, then user cancel lands before the Host writes the terminal status.
// Only widening: the Host's own recordUsage (called after runtime.run() returned) is delayed 400ms.
import { remoteHost, waitFor, closeAll } from "../../../../app/tests/fixtures/agents-host-harness.mjs";
try {
  const t = await remoteHost({ cancel: "ignore", port: { cancelConfirmMs: 5000 }, plan: () => [{ text: "finished normally" }] });
  const store = t.store, svc = t.h.runtime.service;
  let inWindow; const hit = new Promise(r => inWindow = r);
  const orig = store.recordUsage.bind(store);
  store.recordUsage = async (...a) => { inWindow(a[0]); await new Promise(r => setTimeout(r, 400)); return orig(...a); };
  const runId = (await t.start("go", "f2-1")).json.run.id;
  await hit;
  const rb = store.getRun(runId).remoteBinding?.rootTurn?.terminal;
  console.log("before cancel: run.status =", store.getRun(runId).status, "| native root terminal =", JSON.stringify(rb?.status));
  const res = await svc.cancelRun(runId, {});
  const run = store.getRun(runId);
  console.log(JSON.stringify({ cancelReturned: res.run.status, final: run.status, error: run.error, nativeRootTerminal: run.remoteBinding.rootTurn.terminal?.status,
    statuses: store.listEvents({ sessionId: t.session.id, runId }).filter(e => e.type === "run.status").map(e => e.data.status) }));
} finally { await closeAll(); }
