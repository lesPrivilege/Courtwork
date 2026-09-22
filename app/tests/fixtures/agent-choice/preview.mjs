/* Preview wiring only: the synthetic owner, the product's Agent choice
 * controller and chooser view, and the switches the journey is reviewed under.
 * It contains no product behaviour. Send records the request it would make;
 * it never pretends a run started. */
import { el, installTooltips } from "/web/ui-controls.mjs";
import { createAgentChoiceController } from "/web/agent-choice.mjs";
import { createAgentChooser } from "/web/agent-chooser-view.mjs";
import { createAgentChoiceFixture, SCENARIOS } from "./adapter.mjs";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const scenario = SCENARIOS.includes(params.get("scenario")) ? params.get("scenario") : "normal";
const slow = params.get("slow") === "1";
document.documentElement.dataset.theme = params.get("theme") === "dark" ? "dark" : "light";
const reload = (changes) => { const next = new URLSearchParams(location.search); for (const [k, v] of Object.entries(changes)) v == null ? next.delete(k) : next.set(k, v); location.search = next.toString(); };
for (const id of SCENARIOS) $("scenario-select").append(el("option", { text: id, attrs: { value: id } }));
$("scenario-select").value = scenario;
$("slow-toggle").checked = slow;
$("theme-select").value = document.documentElement.dataset.theme;
$("scenario-select").addEventListener("change", (e) => reload({ scenario: e.target.value }));
$("slow-toggle").addEventListener("change", (e) => reload({ slow: e.target.checked ? "1" : null }));
$("theme-select").addEventListener("change", (e) => reload({ theme: e.target.value }));
$("reset-preview").addEventListener("click", () => reload({ scenario: null, slow: null }));

const trace = (text) => $("trace").append(el("li", { text }));
const fixture = createAgentChoiceFixture({ pause: (ms) => new Promise((r) => setTimeout(r, slow ? ms * 6 : ms)) });
fixture.configure(scenario);
const traced = {
  read: (id) => { trace(`GET /runtime-control?sessionId=${id}`); return fixture.adapter.read(id); },
  source: (id, rid) => { trace(`GET /runtime-resources/${rid}`); return fixture.adapter.source(id, rid); },
  select: async (id, body) => {
    trace(`PUT /runtime-control ${JSON.stringify({ revision: body.revision, operation: "profile", id: body.id })}`);
    try { const r = await fixture.adapter.select(id, body); trace(`→ 200 · revision ${r.revision}`); return r; }
    catch (error) { trace(`→ ${error.body?.error?.code ?? "no reply"} · ${error.message}`); throw error; }
  },
};
const controller = createAgentChoiceController({ adapter: traced, getSessionId: () => "session-synthetic" });
const chooser = createAgentChooser({
  controller,
  mount: document.querySelector(".composer-context"),
  noticeAfter: $("composer-notice"),
  modelReading: () => "Synthetic model",
  openSettings: async (id, trigger) => {
    const { content } = await fixture.adapter.source("session-synthetic", id);
    $("source-body").textContent = content ?? "(no source)";
    const dialog = $("source-dialog");
    dialog.addEventListener("close", () => trigger.focus(), { once: true });
    dialog.showModal();
    $("source-close").focus();
  },
});
$("source-close").addEventListener("click", () => $("source-dialog").close());
chooser.setVisible(true);
const input = $("composer-input");
input.value = "Remove the duplicate retry and add a test that fails before the fix.";
input.setSelectionRange(11, 11);
controller.subscribe((state) => {
  const send = $("send-button");
  send.disabled = !state.next?.send.enabled;
  const by = chooser.describedBy();
  by ? send.setAttribute("aria-describedby", by) : send.removeAttribute("aria-describedby");
});
$("composer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const next = controller.getState().next;
  if (!next?.send.enabled) return;
  trace(`POST /sessions/session-synthetic/runs ${JSON.stringify({ input: input.value, commandId: "synthetic", ...(next.send.runtimeSelection ? { runtimeSelection: next.send.runtimeSelection } : {}) })} · not sent (preview)`);
});
globalThis.__agentChoicePreview = { controller, fixture };
installTooltips();
void controller.load();
