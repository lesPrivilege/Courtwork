import { el, action } from "./ui-controls.mjs";

/* 08 · the facts renderer. One instance, one identity, two placements: the
 * Chat row and the work-surface pane draw the same recorded spec and say the
 * same version. A kind or version this build cannot draw is shown as text,
 * and says so; it is never shown as a successful drawing. Every value is
 * model-derived and the card states that. */

export const DRAWABLE = Object.freeze({ facts: [1] });

export function canDraw(instance) {
  return Boolean(instance && DRAWABLE[instance.kind]?.includes(instance.version));
}

export function fallbackText(instance) {
  const spec = instance?.spec ?? {};
  const lines = [String(spec.title ?? "Presentation")];
  for (const item of Array.isArray(spec.items) ? spec.items : []) lines.push(`${item.label}: ${item.value}`);
  return lines.join("\n");
}

export function identityLine(instance) {
  const short = String(instance?.instanceId ?? "").replace(/^pres-/, "").slice(0, 8);
  return `Model-derived · ${instance?.kind ?? "unknown"} v${instance?.version ?? "?"} · revision ${instance?.revision ?? "?"} · ${short}`;
}

function factsBody(instance) {
  const dl = el("dl", { className: "data-list presentation-facts" });
  for (const item of instance.spec.items) dl.append(el("dt", { text: item.label }), el("dd", { text: item.value }));
  return dl;
}

function fallbackBody(instance) {
  return el("div", { className: "presentation-fallback" },
    el("p", { className: "context-meta", attrs: { role: "status" }, text: `Shown as text: this build cannot draw ${instance.kind} v${instance.version}.` }),
    el("pre", { className: "presentation-fallback-text", text: fallbackText(instance) }));
}

function body(instance) {
  if (!canDraw(instance)) return fallbackBody(instance);
  try { return factsBody(instance); }
  catch { return fallbackBody(instance); }
}

/** The Chat placement: title, the reading, its identity, one way to the pane. */
export function renderPresentationInline(instance, { onOpen } = {}) {
  const card = el("section", { className: "presentation-inline", attrs: { "data-presentation-id": instance.instanceId, "aria-label": `Presentation · ${instance.spec?.title ?? instance.kind}` } });
  card.append(el("h4", { className: "presentation-title", text: instance.spec?.title ?? "Presentation" }));
  card.append(body(instance));
  const foot = el("p", { className: "context-meta presentation-identity", text: identityLine(instance) });
  card.append(foot);
  if (onOpen) card.append(action("panel-right", "Open in work surface", () => onOpen(instance), { visible: true, className: "context-row presentation-open" }));
  return card;
}

/** The work-surface placement of the same instance. */
export function renderPresentationPane(container, instance) {
  container.replaceChildren(
    el("h3", { className: "presentation-title", text: instance.spec?.title ?? "Presentation" }),
    body(instance),
    el("p", { className: "context-meta presentation-identity", text: identityLine(instance) }),
  );
  return container;
}
