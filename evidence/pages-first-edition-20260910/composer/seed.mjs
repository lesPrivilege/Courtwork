const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:8938";
const boot = await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json();
const token = boot.sessionToken;
const headers = {"content-type":"application/json","x-work-token":token};
const api = async (path, method="GET", body) => {
  const response = await fetch(`${ORIGIN}/api/v5${path}`, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
  const raw = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${raw}`);
  return raw ? JSON.parse(raw) : null;
};
await api("/provider-credential", "PUT", {provider:"fake-openai-loopback", apiKey:"fake-local-loopback-key"});
await api("/extensions/evidence-memo/lifecycle", "POST", {action:"load"});
const project = (await api("/projects", "POST", {name:"Verification project"})).project;
const makeSession = async (title) => (await api("/sessions", "POST", {projectId:project.id,title})).session;
const chat = await makeSession("Chat verification");
const work = await makeSession("Work verification");
const failure = await makeSession("Failure verification");
const bound = await api(`/sessions/${encodeURIComponent(work.id)}/extension`, "POST", {
  extensionId:"evidence-memo",
  input:{title:"Synthetic work",sourceText:"Synthetic source for UI verification."}
});
console.log(JSON.stringify({origin:ORIGIN,project,chat,work:bound.session ?? work,failure}, null, 2));
