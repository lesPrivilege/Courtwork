import { boot } from "../../../../app/tests/helpers.mjs";
const h = await boot();
try {
  const svc = h.runtime.service;
  const client = Object.values(svc).find(v => v?.constructor?.name === "CoreClient");
  await h.api("GET", `/attention/registry?projectId=${h.projectId}`); // start worker
  client.requestTimeoutMs = 300;
  process.kill(client.transport.child.pid, "SIGSTOP");           // real stall of the real Core worker
  try { await client.call("snapshot"); } catch (e) { console.log("client-level error:", e.code, "| outcome:", e.outcome, "| operation:", e.operation); }
  await h.api("GET", `/attention/registry?projectId=${h.projectId}`).catch(()=>{});
  // second worker generation may have started; stall it too
  client.requestTimeoutMs = 300;
  const pid = client.transport?.child?.pid; if (pid) process.kill(pid, "SIGSTOP");
  const res = await h.api("POST", `/governance/query`, { projectId: h.projectId, query: { schema_version: 1, kind: "registry" } });
  console.log("HTTP:", res.status, JSON.stringify(res.json));
} finally { try { const p = client?.transport?.child?.pid; } catch {} await h.runtime.close(); }
