/* ATT-FE-01 fixture · five Attention objects in five recorded states, created
 * through the app's own /api/v5 traffic. No store writes, no data-directory
 * edits, no runs: seeding Attention never starts a model. */
const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:8899";
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
const project = await call("/projects", { method: "POST", body: JSON.stringify({ name: "Northside Housing" }) });
const projectId = project.project?.id ?? project.id;

const nextAction = (kind, label) => ({ kind, label, trigger: "manual", due_at: null });
async function create(id, title, reason, next) {
  await call("/attention", { method: "POST", body: JSON.stringify({ projectId, request: {
    schema_version: 1, request_id: crypto.randomUUID(), attention_id: id, expected_revision: 0, action: "create",
    payload: { descriptor: { title, summary: null }, reason, next_action: next, source_refs: [], relation_refs: [] },
  } }) });
  return id;
}
async function act(id, action, payload) {
  const current = await call(`/attention/${id}?projectId=${projectId}`);
  await call(`/attention/${id}/actions`, { method: "POST", body: JSON.stringify({ projectId, request: {
    schema_version: 1, request_id: crypto.randomUUID(), attention_id: id, expected_revision: current.revision, action, payload,
  } }) });
}

await create("renewal", "Contract renewal reply", "The other party asked for a decision before the option lapses.", nextAction("decide", "Decide whether to renew"));
await act("renewal", "resume", { reason: "This is the decision that is waiting on a person.", status: "needs_you" });
await create("indexing", "Exhibit index rebuild", "Two exhibit lists disagree about the same document set.", nextAction("inspect", "Compare the two lists"));
await create("counsel", "Counsel review of the draft", "The draft is with counsel and nothing moves until it comes back.", nextAction("wait", "Wait for counsel"));
await act("counsel", "set_waiting", { reason: "Counsel has it.", next_action: nextAction("wait", "Wait for counsel to reply") });
await create("filing", "Filing window check", "The filing window opens later and there is nothing to do before then.", nextAction("follow_up", "Check the window"));
await act("filing", "snooze", { reason: "Nothing to do until the window opens.",
  next_action: { kind: "follow_up", label: "Check the filing window", trigger: "at", due_at: "2026-09-20T09:30:00.000Z" } });
await create("served", "Service confirmation", "Service was recorded and the question it raised has been answered.", nextAction("inspect", "Read the confirmation"));
await act("served", "resolve", { reason: "Recorded as handled; nothing further is waiting." });

const registry = await call("/attention/query", { method: "POST", body: JSON.stringify({ projectId,
  query: { schema_version: 1, kind: "registry" } }) });
console.log(JSON.stringify({ projectId, count: registry.count,
  items: registry.items.map(item => ({ id: item.attention_id, status: item.status })) }, null, 2));
