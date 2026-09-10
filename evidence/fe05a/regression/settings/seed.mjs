// FE-03 · copied verbatim from evidence/fe02-main-integration-20260909/, port only.
// WO-WK13 · fixture seeding through the app's own /api/v5 traffic. No store
// writes, no data-directory edits: every row below exists because a run really
// produced it. `STAGE` picks which of the four Home states this server holds.
const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:8909";
const STAGE = process.env.WK13_STAGE ?? "rows";
// FE-02 · copied verbatim from evidence/fe01/, port only.
// FE-01 · copied from evidence/wk13-main-integration-20260908/seed.mjs, port only.
const boot = await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json();
const token = boot.sessionToken;
const call = async (path, init = {}) => {
  const res = await fetch(`${ORIGIN}/api/v5${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-work-token": token, ...(init.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, timeout = 30000) {
  const start = Date.now();
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error("timed out");
    await sleep(250);
  }
}
async function run(sessionId, input) {
  const created = await call(`/sessions/${sessionId}/runs`, { method: "POST", body: JSON.stringify({ input, commandId: crypto.randomUUID() }) });
  return created.run ?? created;
}
const runStatus = async (id) => (await call(`/runs/${id}`)).run?.status ?? (await call(`/runs/${id}`)).status;
async function settle(id, statuses) {
  return until(async () => {
    const status = await runStatus(id);
    return statuses.includes(status) ? status : null;
  });
}

if (STAGE === "empty") {
  console.log(JSON.stringify({ stage: STAGE, note: "no project, no session" }));
  process.exit(0);
}

const project = await call("/projects", { method: "POST", body: JSON.stringify({ name: "Northside Housing" }) });
const projectId = project.project?.id ?? project.id;
const second = await call("/projects", { method: "POST", body: JSON.stringify({ name: "Coastal Freight" }) });
const secondId = second.project?.id ?? second.id;
const made = [];
const session = async (id, title) => {
  const created = await call("/sessions", { method: "POST", body: JSON.stringify({ projectId: id, title }) });
  const s = created.session ?? created;
  made.push({ id: s.id, title });
  return s.id;
};

// one completed run, so "In progress" holds a session with a recorded run range
const done = await session(projectId, "Exhibit index rebuild");
await settle((await run(done, "hello fixture")).id, ["completed", "failed", "cancelled"]);
// one session with no run at all: the missing-run label, not "Completed"
await session(secondId, "Settlement terms draft");

// The store allows one active run at a time, so the terminal run is seeded
// first and the run that stays waiting on a person is seeded last.
if (STAGE === "rows" || STAGE === "failed") {
  const failed = await session(secondId, "Rent ledger reconciliation");
  const f = await run(failed, "/fixture error");
  await settle(f.id, ["failed", "unknown", "completed", "cancelled"]);
}
if (STAGE === "rows" || STAGE === "pending") {
  const waiting = await session(projectId, "Retainer letter — Okafor");
  const q = await run(waiting, "/fixture question");
  await settle(q.id, ["waiting_user"]);
}
if (STAGE === "truncate")
  for (let i = 0; i < 31; i++) await session(projectId, `Filing ${String(i + 1).padStart(2, "0")}`);

const summary = await call("/work-summary?limit=30");
console.log(JSON.stringify({
  stage: STAGE,
  sessions: made.length,
  totals: {
    pendingItems: summary.pendingItems.total,
    sessionCandidates: summary.sessionCandidates.total,
    inspectionCandidates: summary.inspectionCandidates.total,
  },
}, null, 1));
