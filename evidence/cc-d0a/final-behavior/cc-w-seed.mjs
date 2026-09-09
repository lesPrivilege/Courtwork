/* CC-W · fixture seeding through the app's own /api/v5 traffic, same shape as
 * evidence/cc-s/primitive-seed.mjs: no store writes, no data-directory edits.
 * It only creates the containers `cc-w-checks.mjs` needs; the run that records
 * the file (and therefore the document tab) is started by the checks through the
 * product's own composer.
 *
 * `draft` (Allow edits) is the mode in which a ws_write lands without an
 * approval card, so the recorded output row — the control a person opens a
 * document from — is reached the way a person reaches it.
 *
 *   APP_URL=http://127.0.0.1:8905 node evidence/cc-w/cc-w-seed.mjs
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
const project = await call("/projects", { method: "POST", body: JSON.stringify({ name: "Work surface tabs" }) });
const projectId = project.project?.id ?? project.id;
const session = async (title, permissionMode) => {
  const created = await call("/sessions", {
    method: "POST",
    body: JSON.stringify({ projectId, title, ...(permissionMode ? { permissionMode } : {}) }),
  });
  return (created.session ?? created).id;
};
const document_ = await session("Document tab", "draft");
const approval = await session("Width under way", "ask");
console.log(JSON.stringify({ projectId, document: document_, approval }, null, 1));
