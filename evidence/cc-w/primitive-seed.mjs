/* FE-04 · fixture seeding through the app's own /api/v5 traffic, same shape as
 * evidence/fe03/seed.mjs: no store writes, no data-directory edits. It only
 * creates the containers the checks need; every run below is started by
 * `primitive-checks.mjs` through the product's own controls, because the states
 * this单 is about (in-flight, waiting on a person, cancelled) only exist while
 * a run is live. */
const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:8901";
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
const project = await call("/projects", { method: "POST", body: JSON.stringify({ name: "Primitive audit" }) });
const projectId = project.project?.id ?? project.id;
const session = async (title, permissionMode) => {
  const created = await call("/sessions", {
    method: "POST",
    body: JSON.stringify({ projectId, title, ...(permissionMode ? { permissionMode } : {}) }),
  });
  return (created.session ?? created).id;
};
/* `ask` is the only mode in which a ws_write opens an Approval card, so the
 * card under audit is reached the way a person reaches it, not by injection. */
const approval = await session("Write approval", "ask");
const slow = await session("Slow run");
const failing = await session("Failing tool");
const question = await session("Question card");
console.log(JSON.stringify({ projectId, approval, slow, failing, question }, null, 1));
