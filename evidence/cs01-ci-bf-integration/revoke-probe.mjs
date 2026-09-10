// Q3 probe: after a Session is deleted, do the reads a stale Open would issue still
// pass the server's existence checks? Scratch data dir only.
const base = "http://127.0.0.1:8934";
const H = { origin: base };
const { sessionToken } = await (await fetch(`${base}/api/v5/bootstrap`, { headers: H })).json();
const A = { ...H, "x-work-token": sessionToken };
const get = async (p) => { const r = await fetch(base + p, { headers: A }); let body = ""; try { body = JSON.stringify(await r.json()).slice(0, 120); } catch {} return { status: r.status, body }; };
const sessions = (await (await fetch(`${base}/api/v5/sessions`, { headers: A })).json()).sessions;
const s = sessions.find((x) => x.title === "Clause 14 indemnity");
const events = (await (await fetch(`${base}/api/v5/sessions/${s.id}/events?afterSeq=0`, { headers: A })).json());
const runId = JSON.stringify(events).match(/"runId":"([0-9a-f-]{36})"/)?.[1];
const reads = (sid, rid) => ({
  run: `/api/v5/runs/${rid}`,
  workspaceTree: `/api/v5/sessions/${sid}/workspace`,
  workspaceFile: `/api/v5/sessions/${sid}/workspace/file?path=README.md`,
  artifactFile: `/api/v5/sessions/${sid}/artifacts/file?runId=${rid}&path=out.md&sha256=${"0".repeat(64)}`,
  surface: `/api/v5/sessions/${sid}/surface`,
  events: `/api/v5/sessions/${sid}/events?afterSeq=0`,
});
const before = {}; for (const [k, p] of Object.entries(reads(s.id, runId))) before[k] = (await get(p)).status;
const del = await fetch(`${base}/api/v5/sessions/${s.id}`, { method: "DELETE", headers: A });
const after = {}; for (const [k, p] of Object.entries(reads(s.id, runId))) after[k] = await get(p);
console.log(JSON.stringify({ session: s.id, runId, before, deleteStatus: del.status, after }, null, 1));
