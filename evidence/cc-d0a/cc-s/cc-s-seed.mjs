/* CC-S · fixture seeding through the app's own /api/v5 traffic (same shape as
 * evidence/fe04/primitive-seed.mjs): no store writes, no data-directory edits.
 *
 * Two things are seeded that the checks cannot reach on their own:
 *
 *  - three chats with a recorded run, so Home's lower band has more than one
 *    row and `Home` / `End` have somewhere to travel;
 *  - one chat left with a run **in flight** — a `ws_write` waiting on approval,
 *    so there is a `tool.start` with no `tool.result`. The run is turned into a
 *    terminal `unknown` afterwards, by the host's own restart recovery
 *    (`app/server/service.mjs:175`): stop this server with SIGKILL and start it
 *    again on the same data directory. A graceful stop cancels the run instead
 *    and produces `Interrupted`, which is the other half of the same pair.
 */
const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:8905";
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
const project = await call("/projects", { method: "POST", body: JSON.stringify({ name: "CC-S settings" }) });
const projectId = project.project?.id ?? project.id;
const session = async (title, permissionMode) => {
  const created = await call("/sessions", {
    method: "POST",
    body: JSON.stringify({ projectId, title, ...(permissionMode ? { permissionMode } : {}) }),
  });
  return (created.session ?? created).id;
};
const run = async (sessionId, input) =>
  call(`/sessions/${sessionId}/runs`, {
    method: "POST",
    body: JSON.stringify({ commandId: crypto.randomUUID(), input }),
  });
const settled = async (sessionId) => {
  for (let i = 0; i < 120; i++) {
    const { events } = await call(`/sessions/${sessionId}/events?since=0`);
    const last = [...events].reverse().find((e) => e.type === "run.status");
    if (["completed", "failed", "cancelled", "unknown"].includes(last?.data?.status)) return last.data.status;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("run did not settle");
};

const recorded = [];
// Only one run may be active at a time, so the recorded chats are seeded first.
for (const title of ["Recorded one", "Recorded two", "Recorded three"]) {
  const id = await session(title);
  await run(id, "/fixture script []");
  await settled(id);
  recorded.push({ title, id });
}
const unknownRun = await session("Unknown run", "ask");
await run(unknownRun, '/fixture script [{"name":"ws_write","arguments":{"path":"out/a.txt","text":"x"}}]');
// wait until the approval is actually open, so the kill lands on a live run
for (let i = 0; i < 60; i++) {
  const { events } = await call(`/sessions/${unknownRun}/events?since=0`);
  if (events.some((e) => e.type === "permission.open")) break;
  await new Promise((r) => setTimeout(r, 300));
}
const approval = await session("Approval card", "ask");
console.log(JSON.stringify({ projectId, recorded, unknownRun, approval }, null, 1));
