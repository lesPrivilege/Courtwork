/* The full reading of one Agent choice, drawn the same way for both
 * alternatives so they differ in *where* and *when* it is shown, never in what
 * it says. Every line is an owner fact from `projectNextRun`; a missing fact is
 * not written. */

import { el } from "../../../../app/web/ui-controls.mjs";

function list(items) {
  return items.map((item) => item.label).join("; ");
}

/** One-line model reading. `modelSnapshot` is the global Models value, which is
 * what a CourtWork-owned runtime actually uses today. */
export function modelWords(next, modelSnapshot) {
  if (!next?.model) return null;
  if (next.model.owner === "runtime-native")
    return { short: `Model · ${next.runtime.name}`, line: `model set in ${next.runtime.name}`, long: `Set in ${next.runtime.name}: ${next.model.effective}. CourtWork reads it and does not set it; Models does not change it.` };
  const name = modelSnapshot?.config?.model || next.model.effective;
  return { short: name, line: name, long: `${name}, from Models · All chats · future runs. This agent has no model of its own.` };
}

/** The attributed compatibility reading for one Kit, in words. Supported is
 * attributed; unsupported names its evidence; unchecked says why and what the
 * Kit itself declares. */
export function compatibilityWords(kit, runtimeName) {
  const c = kit.compatibility;
  if (!c || !runtimeName) return "";
  if (c.result === "supported") return ` (checked on ${runtimeName}: ${c.evidenceRef})`;
  if (c.result === "unsupported") return ` (not supported on ${runtimeName}: ${c.evidenceRef})`;
  const why = c.reason === "evidence-not-applicable" ? " for this version" : c.reason === "evidence-conflict" ? "; the records disagree" : "";
  return ` (compatibility with ${runtimeName} not checked${why}; ${c.declared ? "declared by the Kit" : "not declared by the Kit"})`;
}

export function permissionSummary(next) {
  if (!next || next.readingStatus !== "ready") return null;
  const p = next.permissions;
  const parts = [];
  if (p.asks.length) parts.push(`asks before ${p.asks.length}`);
  if (p.unsupported.length) parts.push(`${p.unsupported.length} unsupported`);
  if (p.unreported.length) parts.push(`${p.unreported.length} not reported`);
  if (p.denied.length) parts.push(`${p.denied.length} denied`);
  if (!parts.length && p.allowed.length) parts.push("no approval asked");
  if (!parts.length) parts.push("no Kit requests");
  return parts.join(" · ");
}

export function renderReading(next, { modelSnapshot, idPrefix }) {
  const box = el("div", { className: "agent-reading" });
  if (!next) return box;
  box.append(el("p", { className: "agent-reading-purpose", text: next.responsibility }));
  if (next.readingStatus === "loading" && !next.runtime) {
    box.append(el("p", { className: "context-meta", text: `Reading ${next.name}…` }));
    return box;
  }
  if (next.readingStatus === "error") {
    box.append(el("p", { className: "inline-error", text: `Could not read ${next.name}: ${next.readingError}` }));
    return box;
  }
  const facts = el("dl", { className: "agent-reading-facts" });
  const add = (term, value, key) => {
    if (!value) return;
    facts.append(el("dt", { text: term }), el("dd", { text: value, attrs: key ? { "data-reading": key } : {} }));
  };
  if (next.runtime)
    add("Runs on", next.runtime.available ? `${next.runtime.name} · ${next.runtime.location}` : `${next.runtime.name} · unavailable: ${next.runtime.unavailableReason}`, "runtime");
  add("Model", modelWords(next, modelSnapshot)?.long, "model");
  add("Kits", next.kits.length ? next.kits.map((kit) => `${kit.name} ${kit.version}${compatibilityWords(kit, next.runtime?.name)}`).join("; ") : "None", "kits");
  const p = next.permissions;
  add("Asks before", p.asks.length ? list(p.asks) : null, "asks");
  add("Allowed", p.allowed.length ? list(p.allowed) : null, "allowed");
  add("Denied", p.denied.length ? list(p.denied) : null, "denied");
  add(`Not supported by ${next.runtime?.name ?? "the runtime"}`, p.unsupported.length ? list(p.unsupported) : null, "unsupported");
  add("Effect not reported", p.unreported.length ? list(p.unreported) : null, "unreported");
  add("Works in", "This chat and its Work location. It does not open or change another inbox.", "scope");
  add("When", next.when, "when");
  box.append(facts);
  if (next.readingStatus === "loading") box.append(el("p", { className: "context-meta", text: "Re-reading…" }));
  if (next.blockers.length)
    box.append(el("p", { className: "agent-reading-blocker", attrs: { id: `${idPrefix}-blocker` }, text: `Cannot start a run: ${next.blockers.join(" ")}` }));
  return box;
}
