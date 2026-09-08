import { el, icon } from "./ui-controls.mjs";
import { runLabels } from "./inspector.mjs";
export function renderHome(
  container,
  { summary, error, loading, projects, onSession, onRetry, onMore },
) {
  const home = el("div", { className: "home-view" });
  if (error) {
    const retry = el("button", {
      className: "secondary-button",
      attrs: { type: "button", "aria-label": "Retry loading your workspace" },
      text: "Retry",
    });
    retry.addEventListener("click", onRetry);
    home.append(
      el(
        "div",
        { className: "inline-notice" },
        el("p", { text: error }),
        retry,
      ),
    );
  } else if (loading && !summary)
    home.append(
      el("p", { className: "form-help", text: "Loading your workspace…" }),
    );
  if (summary) {
    const projectName = (id) =>
      projects.find((p) => p.id === id)?.name || "Project";
    const title = (id) =>
      summary.sessionCandidates?.items.find((s) => s.sessionId === id)?.title ||
      "Open session";
    const sets = [
      ["pendingItems", "Waiting for you", "waiting_user"],
      ["sessionCandidates", "Continue", ""],
      ["inspectionCandidates", "Needs a look", "inspection"],
    ];
    for (const [key, label, state] of sets) {
      const page = summary[key];
      if (
        !page ||
        (!page.items.length && page.total === 0 && key !== "sessionCandidates")
      )
        continue;
      const section = el(
        "section",
        { className: "home-section" },
        el(
          "div",
          { className: "section-heading" },
          el("h3", { text: label }),
          el("span", { className: "count-badge", text: page.total }),
        ),
      );
      if (!page.items.length)
        section.append(
          el("p", {
            className: "form-help",
            text: page.total
              ? "No items on this page. Refresh to reconcile this list."
              : "Your sessions will appear here.",
          }),
        );
      for (const item of page.items) {
        const button = el(
          "button",
          { className: `home-row ${state}`, attrs: { type: "button" } },
          icon(
            key === "pendingItems"
              ? "message-square"
              : key === "inspectionCandidates"
                ? "activity"
                : "message-square",
          ),
          el(
            "span",
            { className: "home-row-content" },
            el("span", {
              className: "home-row-title",
              text: item.title || title(item.sessionId),
            }),
            el("span", {
              className: "home-row-meta",
              text: projectName(item.projectId),
            }),
          ),
          el("span", {
            className: "home-row-status",
            text:
              key === "pendingItems"
                ? item.kind === "permission"
                  ? "Permission requested"
                  : "Answer requested"
                : runLabels[item.status || item.latestRun?.status] || "",
          }),
          icon("chevron-right"),
        );
        button.addEventListener("click", () =>
          onSession(item, {
            inspect: key === "inspectionCandidates",
            question: key === "pendingItems",
          }),
        );
        section.append(button);
      }
      if (page.truncated)
        section.append(
          el("p", {
            className: "form-help",
            text: `Showing ${page.items.length} of ${page.total}. Some items are outside this page.`,
          }),
        );
      if (page.hasMore) {
        const more = el("button", {
          className: "text-button",
          attrs: { type: "button" },
          text: "Load more",
        });
        more.addEventListener("click", () => onMore(key, page.nextOffset));
        section.append(more);
      }
      home.append(section);
    }
  }
  container.replaceChildren(home);
}
