import { el, action } from "./ui-controls.mjs";

/* CMD-01 · what a read command shows. The Host answered with facts; this card
 * states them in the connection-card anatomy and nothing else: no model text,
 * no run, no claim beyond what the Host returned. */

const say = (value) => (value === null || value === undefined || value === "" ? "—" : String(value));
const row = (dl, term, value) => dl.append(el("dt", { text: term }), el("dd", { text: say(value) }));

export function statusRows(facts) {
  const model = facts.model ?? {};
  const rows = [
    ["Model", model.localTest ? "Local test" : model.model],
    ["Reasoning effort", model.reasoningEffort ?? "Provider default"],
    ["File access", facts.fileAccess],
    ["Workspace", facts.workspace ? `${facts.workspace.rootPath} · revision ${facts.workspace.revision}` : "Not connected"],
    ["Private candidate", facts.privateCandidate ? `from ${String(facts.privateCandidate.baseCommit).slice(0, 12)} · ${facts.privateCandidate.writeRevision} write${facts.privateCandidate.writeRevision === 1 ? "" : "s"}` : "None"],
    ["Runtime", facts.runtime ? `revision ${facts.runtime.revision} · ${facts.runtime.exposedTools} exposed tool${facts.runtime.exposedTools === 1 ? "" : "s"} · ${facts.runtime.context} context item${facts.runtime.context === 1 ? "" : "s"}` : "—"],
    ["Runs", facts.runs ? `${facts.runs.count}${facts.runs.last ? ` · last ${facts.runs.last.status}` : ""}` : "0"],
    ["Compaction", facts.compaction?.available ? "Available" : facts.compaction?.reason ?? "Unavailable"],
  ];
  if (facts.activeRun) rows.push(["Active run", "Yes"]);
  return rows;
}

export function renderCommandResult(container, result, { onClose }) {
  const header = el("div", { className: "section-heading" },
    el("h3", { text: `/${result.command}` }),
    action("x", "Close command result", onClose));
  const card = el("section", { className: "context-card" });
  if (result.command === "status") {
    const dl = el("dl", { className: "data-list" });
    for (const [term, value] of statusRows(result.facts ?? {})) row(dl, term, value);
    card.append(el("h4", { text: "This chat" }), dl);
  } else if (result.command === "tools") {
    const tools = result.facts?.tools ?? [];
    card.append(el("h4", { text: `Tools · ${tools.filter((t) => t.exposed).length} of ${tools.length} exposed` }));
    const list = el("ul", { className: "command-tools" });
    for (const tool of tools) {
      list.append(el("li", { className: tool.exposed ? "command-tool" : "command-tool is-unavailable" },
        el("span", { className: "command-tool-name", text: tool.name }),
        el("span", { className: "context-meta", text: tool.exposed ? (tool.permission ? `exposed · ${tool.permission}` : "exposed") : "not exposed" })));
    }
    card.append(list);
  } else {
    card.append(el("p", { className: "context-meta", text: JSON.stringify(result.facts ?? {}) }));
  }
  card.append(el("p", { className: "context-meta", text: "Read from the Host. No model request." }));
  container.replaceChildren(header, card);
  return header;
}
