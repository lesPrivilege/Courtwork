/* K5 · the source editor panel over `profile-editor.mjs`, mounted by the
 * Settings resource row of the profile this Chat selects.
 *
 * One persistent panel per (Session, profile): the Workbench rebuilds its rows
 * on every render, and re-inserting the same node keeps the field's value,
 * caret and scroll. Only the readings around the field are redrawn here, in
 * place, when the controller or the page's owner facts change.
 *
 * Roles (engineering/design/visual-spatial-grammar.md): the field and the
 * preview are reading/review (monospace source, data lists); Preview/Save and
 * the scope, freeze, conflict and unknown lines beside them are the decision
 * area; hashes and the candidate text sit behind one disclosure.
 */

import { el } from "./ui-controls.mjs";

const short = (hash) => (typeof hash === "string" ? hash.slice(0, 12) : "—");
const count = (value) => Number(value).toLocaleString("en-US");
const KIT_STATUS = {
  passthrough: "No Kits. The profile's context passes through unchanged.",
  compiled: "Compiled. If this text is saved, a new run would carry the candidate context shown under Candidate context and hashes; that run checks again.",
  refused: "Refused. No candidate context; a run with this text would be refused.",
};
const COMPATIBILITY = {
  "not-applicable": "Not applicable (no Kits)",
  unchecked: "Not checked for this runtime",
  supported: "Supported by recorded evidence",
  unsupported: "Unsupported",
};

function scopeSentence(scope, sessionId) {
  if (scope?.type === "session" && scope.id === sessionId) return "Saves the source for this chat only.";
  const where = scope?.type === "workspace" ? "workspace" : scope?.type === "user" ? "user" : scope?.type ?? "unknown";
  return `Saves the ${where}-scope source (${scope?.id ?? "unknown"}). Other chats that select this profile use the saved text in their next runs.`;
}

export function describeDiagnostic(row) {
  const parts = [row.code];
  if (row.kitId) parts.push(row.kitId);
  if (row.resourceId) parts.push(row.resourceId);
  if (row.targetKitId) parts.push(`conflicts with ${row.targetKitId}`);
  if (row.required === true) parts.push("required");
  else if (row.required === false) parts.push("optional");
  if (Number.isFinite(row.actual) && Number.isFinite(row.limit)) parts.push(`${count(row.actual)} of ${count(row.limit)}`);
  if (Array.isArray(row.missing) && row.missing.length) parts.push(`missing ${row.missing.join(", ")}`);
  return parts.join(" · ");
}

export function createProfileEditorView({ controller }) {
  const panels = new Map(); // key → { root, field, dynamic, preview, previewSig, sessionId, profileId, title, disclosureOpen, scroll }
  let facts = { sessionId: null, activeRuns: 0, revision: null };

  const factsFor = (sessionId) => (facts.sessionId === sessionId ? facts : {});

  function button(className, text, focusKey, run, disabled = false) {
    const node = el("button", { className, text, attrs: { type: "button", "data-focus-key": focusKey } });
    node.disabled = disabled;
    node.addEventListener("click", run);
    return node;
  }

  function build(sessionId, resource) {
    const id = resource.id;
    const fieldId = `profile-editor-field-${encodeURIComponent(id)}`;
    const measureId = `${fieldId}-measure`;
    const field = el("textarea", {
      attrs: {
        id: fieldId, rows: "14", spellcheck: "false", autocomplete: "off", "aria-describedby": measureId,
        "data-focus-key": `profile-editor:text:${id}`, "data-testid": "profile-editor-text",
      },
    });
    field.readOnly = true;
    const panel = { sessionId, profileId: id, title: resource.title, field, measureId, disclosureOpen: false, scroll: 0, previewSig: null };
    field.addEventListener("input", () => controller.setText(sessionId, id, field.value));
    field.addEventListener("scroll", () => { panel.scroll = field.scrollTop; });
    panel.heading = el("h5", { text: `Edit ${resource.title} source` });
    panel.measure = el("p", { className: "form-help", attrs: { id: measureId, "data-testid": "profile-editor-measure" } });
    panel.sourceStatus = el("div", { className: "profile-editor-status" });
    panel.decision = el("div", { className: "profile-editor-decision" });
    panel.previewArea = el("div", { className: "profile-editor-preview", attrs: { "aria-live": "polite", "data-testid": "profile-editor-preview" } });
    panel.root = el(
      "section",
      { className: "runtime-intake profile-editor", attrs: { "data-profile-editor": id, "aria-label": `Edit ${resource.title} source`, "data-testid": "profile-editor" } },
      panel.heading,
      el("label", { className: "runtime-intake-field", attrs: { for: fieldId } }, el("span", { text: "Profile source (JSON)" })),
      field,
      panel.measure,
      panel.sourceStatus,
      panel.decision,
      panel.previewArea,
    );
    return panel;
  }

  function update(panel) {
    const { sessionId, profileId } = panel;
    const reading = controller.reading(sessionId, profileId, factsFor(sessionId));
    if (!reading) return;
    const active = document.activeElement;
    const keep = panel.root.contains(active) && active !== panel.field ? active.dataset.focusKey : null;

    /* The field: only an explicit replacement (a read, Use current source,
       Revert) writes into it; typing already lives there. */
    if (reading.base && panel.field.value !== reading.text) panel.field.value = reading.text;
    panel.field.readOnly = !reading.base;

    const base = reading.base;
    panel.measure.textContent = base
      ? `${count(reading.measure.characters)} characters (UTF-16) · ${count(reading.measure.bytes)} bytes (UTF-8) · ${reading.dirty ? "unsaved changes" : "same as the saved source"} · saved source ${short(base.sourceHash)}, configuration revision ${base.revision}`
      : reading.read.status === "error" ? "The saved source could not be read." : "Reading the saved source…";

    /* Source-level facts: read failure, preview refusal, a changed saved
       source. They stay next to the field they are about. */
    const status = [];
    /* After an unknown save, a failed read-back is said once, by the save
       line and its Check again, not by a second read error here. */
    if (reading.read.status === "error" && !(base && reading.save.status === "unknown"))
      status.push(el("p", { className: "inline-error", text: `Could not read the source: ${reading.read.error}`, attrs: { role: "alert" } }),
        button("text-button", "Read again", `profile-editor:read:${profileId}`, () => void controller.check(sessionId, profileId)));
    if (reading.preview.status === "error" && reading.preview.current)
      status.push(el("p", { className: "inline-error", attrs: { role: "alert", "data-testid": "profile-editor-preview-error" },
        text: `Preview refused${reading.preview.error.code ? ` (${reading.preview.error.code})` : ""}: ${reading.preview.error.message}` }));
    if (reading.fresh) {
      const sameSource = reading.fresh.sourceHash === base?.sourceHash;
      status.push(
        el("p", { className: "runtime-note", attrs: { role: "status", "data-testid": "profile-editor-fresh" }, text: sameSource
          ? `The configuration changed (revision ${base.revision} → ${reading.fresh.revision}), but the saved source is still the one you started from.`
          : `The saved source changed since you started (now ${short(reading.fresh.sourceHash)}, revision ${reading.fresh.revision}). Your text is kept and was not saved.` }),
        el("span", { className: "runtime-row-actions" },
          button("text-button", sameSource ? "Continue with my text" : "Keep my text over the current source", `profile-editor:keep:${profileId}`, () => controller.keepMine(sessionId, profileId)),
          sameSource ? null : button("text-button", "Use the current source (discard my text)", `profile-editor:use-current:${profileId}`, () => controller.useCurrent(sessionId, profileId))),
      );
    } else if (reading.configMoved && factsFor(sessionId).revision > base.revision)
      status.push(
        el("p", { className: "runtime-note", attrs: { role: "status" }, text: `The configuration changed after this source was read (revision ${base.revision}, now ${factsFor(sessionId).revision}). Preview and Save check the revision you read; read the source again to continue.` }),
        button("text-button", "Read the current source", `profile-editor:read:${profileId}`, () => void controller.check(sessionId, profileId)),
      );
    panel.sourceStatus.replaceChildren(...status);

    /* Decision area: the two actions, the scope, and what Save means now. */
    /* A preview in flight for this exact text holds the action; changed text
       can be previewed again at once, and the earlier reply is then dropped. */
    const checking = reading.preview.status === "loading" && reading.preview.current;
    const previewButton = button("quiet-button", checking ? "Previewing…" : "Preview", `profile-editor:preview:${profileId}`,
      () => void controller.preview(sessionId, profileId), !base || checking);
    const saveButton = button("primary-button", reading.save.status === "saving" ? "Saving…" : "Save source", `profile-editor:save:${profileId}`,
      () => void controller.save(sessionId, profileId), !reading.save.gate.enabled);
    saveButton.setAttribute("data-testid", "profile-editor-save");
    previewButton.setAttribute("data-testid", "profile-editor-preview-button");
    const actions = el("div", { className: "runtime-row-actions" }, previewButton, saveButton);
    if (reading.dirty && reading.save.status !== "saving")
      actions.append(button("text-button", "Revert to saved", `profile-editor:revert:${profileId}`, () => controller.revert(sessionId, profileId)));
    const lines = [actions];
    if (base) lines.push(el("p", { className: "form-help", attrs: { "data-testid": "profile-editor-scope" }, text: scopeSentence(base.resource.scope, sessionId) }));
    const previewed = reading.preview.current && reading.preview.status === "ready" ? reading.preview.result : null;
    if (reading.dirty && reading.save.status !== "saving" && reading.save.gate.enabled)
      lines.push(el("p", { className: "form-help", attrs: { "data-testid": "profile-editor-consequence" }, text: previewed?.kit.status === "refused"
        ? "The preview refused this text. The Host can still save valid JSON, but runs in chats that select this profile will be refused until the source is fixed."
        : previewed ? "Previewed as shown below. Saving does not start a run; the next run checks the source again."
          : reading.preview.current && reading.preview.status === "error" ? "The preview refused this text (above). Save checks the source again and may refuse it for the same reason."
            : "Not previewed. Save checks the source format; the context and Kit requirements are checked when a run starts." }));
    if (!reading.save.gate.enabled && reading.dirty && reading.save.status !== "saving")
      lines.push(el("p", { className: "form-help", attrs: { "data-testid": "profile-editor-gate" }, text: reading.save.gate.reason }));
    if (reading.save.message) {
      const tone = ["failed", "conflict", "frozen"].includes(reading.save.status) ? "inline-error" : "runtime-note";
      lines.push(el("p", { className: tone, attrs: { role: "status", "data-save-status": reading.save.status, "data-testid": "profile-editor-save-status" }, text: reading.save.message }));
      if (reading.save.status === "unknown")
        lines.push(button("text-button", "Check again", `profile-editor:check:${profileId}`, () => void controller.check(sessionId, profileId)));
      if (reading.save.status === "frozen")
        lines.push(button("text-button", "Check again", `profile-editor:check-freeze:${profileId}`, () => void controller.checkFreeze(sessionId)));
      if (reading.save.status === "saved" && reading.dirty)
        lines.push(el("p", { className: "form-help", text: "You changed the text after that save. The new changes are not saved." }));
    }
    panel.decision.replaceChildren(...lines);

    renderPreview(panel, reading);

    if (keep && !panel.root.contains(document.activeElement)) panel.root.querySelector(`[data-focus-key="${CSS.escape(keep)}"]`)?.focus();
  }

  function renderPreview(panel, reading) {
    const { preview } = reading;
    const sig = `${preview.status}|${preview.current}|${preview.result?.profile?.draftSha256 ?? ""}|${preview.result?.revision ?? ""}`;
    if (panel.previewSig === sig && preview.status !== "loading") return;
    panel.previewSig = sig;
    if (preview.status === "loading") { panel.previewArea.replaceChildren(el("p", { className: "form-help", text: "Previewing the text above…" })); return; }
    if (preview.status === "error" && !preview.current) {
      panel.previewArea.replaceChildren(el("p", { className: "form-help", text: "An earlier preview was refused. Preview again to check the text above." }));
      return;
    }
    if (preview.status !== "ready") { panel.previewArea.replaceChildren(); return; }
    const result = preview.result;
    const kit = result.kit;
    const box = [];
    box.push(el("h5", { text: "Preview · not saved, not run" }));
    if (!preview.current)
      box.push(el("p", { className: "runtime-note", attrs: { "data-testid": "profile-editor-outdated" }, text: "Outdated: this preview checked an earlier text or revision, not the text above. Preview again to check it." }));
    const dl = el("dl", { className: "data-list" });
    const add = (term, value, key) => dl.append(el("dt", { text: term }), el("dd", { attrs: { "data-preview": key } }, el("span", { text: value })));
    add("Result", KIT_STATUS[kit.status] ?? kit.status, "status");
    add("Composition", `${result.composition.status}${result.composition.missing?.length ? ` · missing ${result.composition.missing.join(", ")}` : ""}`, "composition");
    add("Kits", kit.pins.length ? kit.pins.map((pin) => `${pin.id} ${pin.version}`).join("; ") : "None", "kits");
    add("Runtime", `${result.executor.id} ${result.executor.revision} · Kit compatibility: ${COMPATIBILITY[kit.compatibility?.status] ?? kit.compatibility?.status}`, "runtime");
    add("Context", kit.candidate
      ? `${count(kit.candidate.bytes)} bytes (UTF-8) · ${count(kit.candidate.characters)} characters (UTF-16)${kit.budget ? ` · limits ${count(kit.budget.maxContextBytes)} bytes, ${count(kit.budget.maxContextCharacters)} characters` : ""}`
      : "No candidate context.", "context");
    add("Save now", result.save.available ? "Not frozen now. Save is checked again when you press it." : result.save.reason, "save");
    box.push(dl);
    if (kit.diagnostics.length)
      box.push(el("h5", { text: `Diagnostics · ${kit.diagnostics.length}` }),
        ...kit.diagnostics.map((row) => el("p", { className: "inline-error", attrs: { "data-testid": "profile-editor-diagnostic" }, text: describeDiagnostic(row) })));
    if (kit.requirements.length)
      box.push(el("h5", { text: "Requirements" }), el("ul", { className: "profile-editor-list" },
        ...kit.requirements.map((row) => el("li", { text: `${row.resourceId} · ${row.status}${row.required ? " · required" : " · optional"} (${row.kitId})` }))));
    if (kit.references.length)
      box.push(el("h5", { text: "Referenced sources" }), el("ul", { className: "profile-editor-list" },
        ...kit.references.map((row) => el("li", { text: `${row.resourceId} · ${row.status}${row.required ? " · required" : ""}` }))));
    if (result.permissions.length)
      box.push(el("h5", { text: "Tool permissions · advisory" }),
        el("p", { className: "form-help", text: "The current Host policy for the tools this text lists. Nothing was run or approved; every call is checked again." }),
        el("ul", { className: "profile-editor-list" }, ...result.permissions.map((row) => el("li", { text: `${row.action} · ${row.effect} · ${row.exposed ? "exposed" : "not exposed"}` }))));
    const details = el("details", { className: "profile-editor-details" }, el("summary", { text: "Candidate context and hashes" }));
    details.open = panel.disclosureOpen;
    details.addEventListener("toggle", () => { panel.disclosureOpen = details.open; });
    const hashes = el("dl", { className: "data-list" });
    for (const [term, value] of [["Text checked", result.profile.draftSha256], ["Configuration revision", String(result.revision)], ["Plan", kit.planSha256], ["Candidate", kit.candidate?.sha256 ?? "none"]])
      hashes.append(el("dt", { text: term }), el("dd", {}, el("code", { text: value })));
    details.append(hashes);
    if (kit.candidate) details.append(el("pre", { className: "profile-editor-candidate", attrs: { "data-testid": "profile-editor-candidate" }, text: kit.candidate.text }));
    box.push(details);
    panel.previewArea.replaceChildren(...box);
  }

  controller.subscribe(() => { for (const panel of panels.values()) if (panel.root.isConnected) update(panel); });

  return {
    /** The persistent panel for this Chat's profile, refreshed for this render. */
    panel(sessionId, resource) {
      const key = `${sessionId}\u0000${resource.id}`;
      controller.open(sessionId, resource.id);
      let panel = panels.get(key);
      if (!panel) { panel = build(sessionId, resource); panels.set(key, panel); }
      update(panel);
      /* The row is rebuilt around this node; put the field's reading position
         back once the synchronous render has re-attached it. */
      queueMicrotask(() => { if (panel.field.isConnected) panel.field.scrollTop = panel.scroll; });
      return panel.root;
    },
    /** Whether a draft differs from its saved source (the row keeps it open). */
    dirty(sessionId, profileId) {
      return Boolean(controller.reading(sessionId, profileId)?.dirty);
    },
    /** Latest owner facts from the Workbench snapshot (freeze, revision). */
    setFacts(next) {
      facts = { sessionId: next.sessionId ?? null, activeRuns: next.activeRuns ?? 0, revision: next.revision ?? null };
      if (facts.sessionId) controller.observe(facts.sessionId, { activeRuns: facts.activeRuns });
      for (const panel of panels.values()) if (panel.root.isConnected) update(panel);
    },
  };
}
