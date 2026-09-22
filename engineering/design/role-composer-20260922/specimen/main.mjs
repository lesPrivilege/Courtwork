/* Specimen wiring. It builds the synthetic owners, one Composer controller, the
 * accepted Agent profiles controller/view for the Settings visit, and mounts
 * alternative A or B over the same state. Page state (alternative, scenario,
 * theme, slow) lives in the query string so each alternative starts from the
 * same data at the same viewport. */

import { el, icon, anchorPopover, installTooltips } from "../../../../app/web/ui-controls.mjs";
import { semanticIcon } from "../../../../app/web/semantic-controls.mjs";
import { workLocationEntry } from "../../../../app/web/workspace-card.mjs";
import { renderModelEffortCard } from "../../../../app/web/model-effort.mjs";
import { createAgentProfilesController } from "../../../../app/web/agent-profiles.mjs";
import { createAgentProfilesView } from "../../../../app/web/agent-profiles-view.mjs";
import { createComposerFixture, SCENARIOS } from "./composer-adapter.mjs";
import { createComposerAgentController } from "./composer-agent.mjs";
import { modelWords } from "./reading.mjs";
import { mountAlternativeA } from "./alt-a.mjs";
import { mountAlternativeB } from "./alt-b.mjs";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const alt = params.get("alt") === "b" ? "b" : "a";
const scenario = SCENARIOS.some(([id]) => id === params.get("scenario")) ? params.get("scenario") : "normal";
const theme = params.get("theme") === "dark" ? "dark" : "light";
const slow = params.get("slow") === "1";
document.documentElement.dataset.theme = theme;
document.body.dataset.alt = alt;

/* ── Specimen controls ─────────────────────────────────────────────── */
const reload = (changes) => {
  const next = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(changes)) value == null ? next.delete(key) : next.set(key, value);
  location.search = next.toString();
};
const scenarioSelect = $("scenario-select");
for (const [id, label] of SCENARIOS) scenarioSelect.append(el("option", { text: label, attrs: { value: id } }));
scenarioSelect.value = scenario;
$("alt-select").value = alt;
$("theme-select").value = theme;
$("slow-toggle").checked = slow;
scenarioSelect.addEventListener("change", () => reload({ scenario: scenarioSelect.value }));
$("alt-select").addEventListener("change", (event) => reload({ alt: event.target.value }));
$("theme-select").addEventListener("change", (event) => reload({ theme: event.target.value }));
$("slow-toggle").addEventListener("change", (event) => reload({ slow: event.target.checked ? "1" : null }));
$("reset-preview").addEventListener("click", () => reload({ scenario: null, slow: null }));
$("specimen-title").textContent = alt === "a" ? "Role-first Composer · A · Anchored chooser" : "Role-first Composer · B · Agent line";

/* ── Synthetic owners and the two controllers ───────────────────────── */
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, slow ? ms * 6 : ms));
const fixture = createComposerFixture({ pause });
fixture.configure(scenario);
const { adapter } = fixture;
const controller = createComposerAgentController({ adapter });
const profiles = createAgentProfilesController({ adapter });
createAgentProfilesView($("agent-profiles-mount"), profiles);
let modelSnapshot = adapter.modelSnapshot();
globalThis.__specimen = { controller, profiles, fixture, alt, scenario };

/* ── Chat scaffold: title, run row, Work location, draft materials ──── */
const chat = adapter.chat();
$("chat-title").textContent = chat.title;
const entry = workLocationEntry(chat.workLocation);
$("work-location").replaceChildren(
  el("span", { className: "context-chip context-chip-fact work-location-entry", attrs: { "aria-label": entry.ariaLabel } },
    semanticIcon("workspace.object", { size: 16 }), ...entry.parts.map((part) => el("span", { className: "button-label", text: part }))),
  el("span", { className: "context-chip context-chip-fact", text: "Local" }),
);
$("draft-materials").append(
  ...["retry-wrapper.ts", "gateway-timeout-test.log"].map((name) =>
    el("span", { className: "context-chip context-chip-fact specimen-material" }, icon("file-text", { size: 16 }), el("span", { className: "button-label", text: name }))),
);
const input = $("composer-input");
input.value = "Remove the duplicate retry so one gateway timeout causes one retry, and add a test that fails before the fix.";
input.setSelectionRange(35, 35);
$("composer-form").addEventListener("submit", (event) => event.preventDefault());

/* ── Model control: the product card, reading the global model ──────── */
const modelButton = el("button", {
  className: "composer-model quiet-button",
  attrs: { type: "button", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-controls": "model-popover", "data-testid": "model-button" },
});
const send = el("button", { className: "primary-button", text: "Send", attrs: { type: "submit", id: "send-button", "data-testid": "send" } });
$("controls-right").append(modelButton, send);
const modelPopover = $("model-popover");
let modelFeedback = null, modelBusy = false, stopModel = null;
function renderModelCard() {
  const next = controller.getState().next;
  if (next?.model?.owner === "runtime-native") {
    const words = modelWords(next, modelSnapshot);
    const close = el("button", { className: "quiet-button", text: "Close", attrs: { type: "button" } });
    close.addEventListener("click", () => modelPopover.hidePopover());
    modelPopover.replaceChildren(
      el("div", { className: "section-heading" }, el("h3", { text: "Model" }), close),
      el("section", { className: "context-card" },
        el("p", { className: "model-effort-name", text: next.model.effective }),
        el("p", { className: "context-meta", text: words.long })),
    );
    return close;
  }
  const header = renderModelEffortCard(modelPopover, {
    snapshot: modelSnapshot,
    active: Boolean(controller.getState().activeRun),
    busy: modelBusy,
    feedback: modelFeedback,
    onClose: () => modelPopover.hidePopover(),
    onChangeModel: () => { modelFeedback = "Change model opens the product's model picker (All chats · future runs). It is not part of this specimen."; renderModelCard(); },
    onConnections: () => { modelFeedback = "Connections opens Settings › Models in the product. It is not part of this specimen."; renderModelCard(); },
    onEffort: async (effort) => {
      modelBusy = true; modelFeedback = "Saving…"; renderModelCard();
      try {
        modelSnapshot = await adapter.saveEffort(effort, modelSnapshot.version);
        modelFeedback = `Saved · ${modelSnapshot.config.reasoningEffort ?? "Provider default"} · all chats, future runs`;
      } catch (error) { modelFeedback = error.message; }
      finally { modelBusy = false; renderModelCard(); renderModelButton(controller.getState()); }
    },
  });
  return header.querySelector("button");
}
modelButton.addEventListener("click", () => {
  if (modelPopover.matches(":popover-open")) { modelPopover.hidePopover(); return; }
  modelFeedback = null;
  modelPopover.showPopover();
  renderModelCard()?.focus();
});
modelPopover.addEventListener("toggle", (event) => {
  const open = event.newState === "open";
  stopModel?.(); stopModel = null;
  if (open) stopModel = anchorPopover(modelButton, modelPopover, { placement: "top-end" });
  modelButton.setAttribute("aria-expanded", String(open));
  if (!open && (modelPopover.contains(document.activeElement) || document.activeElement === document.body)) modelButton.focus();
});
function renderModelButton(state) {
  const words = modelWords(state.next, modelSnapshot);
  /* Until the Agent is read, the model it would use is not known: the global
     value is not shown as its model. */
  modelButton.textContent = words ? words.short : "Model";
  modelButton.setAttribute("aria-label", words ? `Model: ${words.short}` : "Model: not read yet");
}

/* ── Send and the run row: facts shared by both alternatives ────────── */
function renderShared(state) {
  renderModelButton(state);
  const next = state.next;
  send.disabled = !next?.send.enabled;
  send.dataset.reason = next?.send.reason || "";
  const run = $("run-row");
  run.hidden = !state.activeRun;
  run.textContent = state.activeRun ? `Working · ${state.activeRun.profileName} · revision ${state.activeRun.profileRevision} (synthetic run in progress)` : "";
  if (modelPopover.matches(":popover-open")) renderModelCard();
}
controller.subscribe(renderShared);

/* ── Settings visit and return ──────────────────────────────────────── */
let returnFocus = null;
let settingsOpen = false;
function openSettings(profileId, { focusBack }) {
  returnFocus = focusBack;
  settingsOpen = true;
  document.querySelectorAll("[popover]").forEach((node) => { if (node.matches(":popover-open")) node.hidePopover(); });
  $("chat-view").hidden = true;
  $("settings-view").hidden = false;
  void profiles.openProfile(profileId);
  $("settings-back").focus();
}
function closeSettings() {
  if (!settingsOpen) return;
  settingsOpen = false;
  $("settings-view").hidden = true;
  $("chat-view").hidden = false;
  const target = returnFocus;
  returnFocus = null;
  void controller.refresh();
  (target?.() || input).focus();
}
$("settings-back").addEventListener("click", closeSettings);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !settingsOpen || event.defaultPrevented) return;
  if (document.querySelector("dialog[open]")) return;
  event.preventDefault();
  closeSettings();
});

/* ── The alternative ────────────────────────────────────────────────── */
const mount = alt === "a" ? mountAlternativeA : mountAlternativeB;
mount({ controller, openSettings, modelSnapshot: () => modelSnapshot, send });
installTooltips();
void controller.load();
