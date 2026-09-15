import { el, action } from "./ui-controls.mjs";
import { connectionLabel, connectionPathOfKind } from "./settings-view.mjs";

/* Models 05 · the composer's model control opens this card instead of the full
 * dialog. Everything on it is read from one Host snapshot (`GET /provider-config`):
 * the in-force model, its connection, the credential fact and the reasoning
 * capability the Host computed for exactly that connection/model/API/endpoint.
 * The card never derives a ladder of its own: a capability of kind `enum` draws
 * one segment per value plus Provider default; `unknown` and `unsupported` draw
 * no segments at all. Saving is the caller's business (scope, version, receipts). */

export const PROVIDER_DEFAULT = "__provider_default__";

/** What the effort control may offer for this snapshot. Pure. */
export function effortChoices(capability, savedEffort) {
  const values = capability?.kind === "enum" && Array.isArray(capability.values)
    ? capability.values.filter((value) => typeof value === "string" && value)
    : [];
  const saved = typeof savedEffort === "string" && savedEffort ? savedEffort : null;
  const invalidSaved = saved && !values.includes(saved) ? saved : null;
  return {
    selectable: values.length > 0,
    values,
    checked: invalidSaved ? null : saved ?? PROVIDER_DEFAULT,
    invalidSaved,
    kind: capability?.kind === "enum" || capability?.kind === "unsupported" ? capability.kind : "unknown",
    source: typeof capability?.source === "string" ? capability.source : "unknown",
    notice: typeof capability?.notice === "string" ? capability.notice : "",
  };
}

export function visibleModelName(config) {
  if (!config?.model) return "Not selected";
  return config.provider === "fake-openai-loopback" ? "Local test" : config.model;
}

/* One segment per legal value. Native radios: keyboard, touch and the saved
 * state come from the platform, the thumb from the shared `.segmented` track. */
function segmentedEffort({ choices, name, disabled, onChange }) {
  const options = [[PROVIDER_DEFAULT, "Provider default"], ...choices.values.map((value) => [value, value])];
  const fieldset = el("fieldset", {
    className: "segmented model-effort-segmented",
    attrs: { "aria-label": "Reasoning effort", style: `--segments: ${options.length}` },
  });
  fieldset.disabled = disabled;
  for (const [option, text] of options) {
    const id = `${name}-${option}`;
    const input = el("input", { attrs: { type: "radio", name, id, value: option } });
    input.checked = option === choices.checked;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      void onChange(option === PROVIDER_DEFAULT ? undefined : option);
    });
    fieldset.append(el("label", { className: "segment", attrs: { for: id } }, input, el("span", { text })));
  }
  return fieldset;
}

/**
 * Draw the card into `container`.
 * `snapshot` is the Host's `/provider-config` response; `active` says a Run is in
 * flight (the Host is still the authority and answers 409 on its own); `feedback`
 * is the caller's line for the effort section (saving, saved, an error), or null.
 */
export function renderModelEffortCard(
  container,
  { snapshot, active = false, busy = false, feedback = null, onClose, onChangeModel, onConnections, onEffort },
) {
  const config = snapshot?.config || null;
  const connection = snapshot?.connection || null;
  const header = el(
    "div",
    { className: "section-heading" },
    el("h3", { text: "Model & effort" }),
    action("x", "Close model card", onClose),
  );
  const path = connectionPathOfKind(connection);
  const name = visibleModelName(config);
  const label = connectionLabel(connection);
  const connectionLine = connection
    ? [label !== name ? label : null, config?.api || connection.api || "unknown"].filter(Boolean).join(" · ")
    : "No connection";
  const model = el(
    "section",
    { className: "context-card" },
    el("h4", { text: "Model" }),
    el("p", { className: "model-effort-name", text: name }),
    el("p", { className: "context-meta", text: connectionLine }),
    action("settings-2", "Change model", onChangeModel, { visible: true, className: "context-row" }),
  );
  if (connection && path !== "local" && snapshot?.credentialStatus !== "configured")
    model.append(el("p", { className: "context-meta", text: "No API key on this connection." }));
  model.append(
    action("settings-2", connection ? "Connections" : "Add provider", () => onConnections(connection?.id ?? null), {
      visible: true,
      className: "context-row",
    }),
  );

  const choices = effortChoices(snapshot?.reasoningCapability, config?.reasoningEffort);
  const effort = el("section", { className: "context-card" }, el("h4", { text: "Reasoning effort" }));
  if (choices.selectable) {
    effort.append(segmentedEffort({ choices, name: "model-effort", disabled: active || busy, onChange: onEffort }));
  } else {
    effort.append(el("p", { className: "model-effort-fixed", text: "Provider default" }));
  }
  const lines = [];
  if (choices.invalidSaved) lines.push(`Saved value ${choices.invalidSaved} is no longer offered by this model. Choose Provider default or a listed value.`);
  if (!choices.selectable) lines.push(choices.notice || (choices.kind === "unsupported"
    ? "Selectable reasoning effort is unsupported; the parameter is omitted."
    : "Supported reasoning settings are unknown. Provider default omits the parameter."));
  else if (choices.source === "user-declared") lines.push("Values declared on this connection; provider behavior has not been verified.");
  if (active) lines.push("Available after this run ends.");
  else if (feedback) lines.push(feedback);
  else lines.push("All chats · future runs");
  for (const text of lines) effort.append(el("p", { className: "context-meta", attrs: { role: "status" }, text }));

  container.replaceChildren(header, model, effort);
  return header;
}
