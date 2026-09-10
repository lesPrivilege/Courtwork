import { semanticAction } from "./semantic-controls.mjs";
import { el, action, icon } from "./ui-controls.mjs";
import { runLabels } from "./inspector.mjs";

export function renderWorkspaceFilesView(
  container,
  { files, onFile, onMaterials, onRefresh },
) {
  const heading = el(
    "div",
    { className: "section-heading" },
    el("h3", { text: "Workspace files" }),
    action("refresh-cw", "Refresh workspace files", onRefresh),
  );
  /* WK-44 · the heading and the folder groups below already say what this list
   * is; a sentence repeating it carried no definition, condition or
   * consequence. */
  container.replaceChildren(heading);
  const groups = new Map();
  for (const file of files) {
    const slash = file.path.lastIndexOf("/");
    const directory = slash < 0 ? "Workspace root" : file.path.slice(0, slash);
    if (!groups.has(directory)) groups.set(directory, []);
    groups.get(directory).push(file);
  }
  for (const [directory, entries] of groups) {
    const section = el(
      "section",
      { className: "workspace-card" },
      el(
        "div",
        { className: "section-heading" },
        el("h4", { text: directory }),
        el("span", { className: "count-badge", text: entries.length }),
      ),
    );
    for (const file of entries) {
      const button = action("file-text", file.path, () => onFile(file.path), {
        visible: true,
        className: "workspace-file-row",
      });
      button.querySelector(".button-label").textContent = file.path
        .split("/")
        .at(-1);
      section.append(button);
    }
    container.append(section);
  }
  if (!files.length)
    container.append(
      el("p", {
        className: "empty-list",
        text: "No files yet. Add material or ask the agent to create a file.",
      }),
    );
  container.append(
    semanticAction("material.add", onMaterials, {
      visible: true,
      className: "secondary-button workspace-add",
    }),
  );
}

export function renderSessionOverview(
  container,
  {
    session,
    run,
    permissionLabel,
    onClose,
    onMaterials,
    onWorkspace,
    onRun,
    onHistory,
    onPermissions,
  },
) {
  const header = el(
    "div",
    { className: "section-heading" },
    el("h3", { text: "This chat" }),
    semanticAction("surface.close", onClose, { values: { target: "chat overview" } }),
  );
  const group = (title, ...children) =>
    el(
      "section",
      { className: "context-card" },
      el("h4", { text: title }),
      ...children,
    );
  const row = (glyph, title, fn) =>
    action(glyph, title, fn, { visible: true, className: "context-row" });
  container.replaceChildren(
    header,
    group(
      "Workspace",
      row("paperclip", "Chat files", onMaterials),
      row(
        "panel-right",
        session.extensionBinding?.extensionId
          ? "Open work preview"
          : "Browse workspace",
        onWorkspace,
      ),
    ),
    group(
      "Work history",
      ...(run
        ? [
            row(
              "chevron-right",
              `Latest · ${runLabels[run.status] || run.status}`,
              () => onRun(run.id),
            ),
            el("p", {
              className: "context-meta",
              text: `${run.artifacts?.length || 0} recorded files${run.usage ? ` · ${run.usage.turns || 0} model turns` : ""}`,
            }),
          ]
        : []),
      row("chevron-right", "Work history", onHistory),
    ),
    group(
      "Chat settings",
      row("settings-2", permissionLabel, onPermissions),
    ),
  );
  return header;
}

export function renderRunHistory(container, { runs, events, onRun }) {
  container.replaceChildren();
  if (!runs.length) {
    container.append(
      el("p", {
        className: "empty-list",
        text: "No runs recorded in this chat.",
      }),
    );
    return;
  }
  for (const run of [...runs].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
  )) {
    const event = events.find(
      (e) =>
        e.runId === run.id && ["user.message", "message/user"].includes(e.type),
    );
    const text = event?.data?.text || "Work without recorded input";
    const row = el(
      "button",
      { className: "run-history-row", attrs: { type: "button" } },
      el("span", { className: "run-history-title", text: text.slice(0, 180) }),
      el("span", {
        className: "run-history-meta",
        text: `${runLabels[run.status] || run.status} · ${new Date(run.startedAt).toLocaleString()}`,
      }),
      icon("chevron-right"),
    );
    row.addEventListener("click", () => onRun(run.id));
    container.append(row);
  }
}
