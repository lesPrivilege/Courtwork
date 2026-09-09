import { renderRequestMeasurements } from "./telemetry-view.mjs";
import { projectMarkdown, readCoreFile, MAX_MARKDOWN_BYTES } from "./markdown-source.mjs";
import { createMarkdownReader } from "./markdown-reader.mjs";
import { el, icon, action, copyAction, markdown } from "./ui-controls.mjs";
import { renderRecordedContext } from "./runtime-view.mjs";
export const runLabels = {
  created: "Starting",
  running: "Running",
  waiting_user: "Waiting for you",
  stopping: "Stopping",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
  unknown: "Unknown",
};
export function formatBytes(bytes) {
  return Number.isFinite(bytes)
    ? bytes < 1024
      ? `${bytes} B`
      : `${(bytes / 1024).toFixed(1)} KB`
    : "Size unavailable";
}
function datum(dl, label, value, { copy = false, key = "" } = {}) {
  dl.append(
    el("dt", { text: label }),
    el(
      "dd",
      {},
      el("span", { text: value ?? "Not recorded" }),
      copy && value
        ? copyAction(value, `Copy ${label.toLowerCase()}`, key)
        : null,
    ),
  );
}
export function renderRun(
  container,
  { sessionId, sessionTitle, run, events, onFile, onRefresh, runtimeContext },
) {
  const opened = new Set(
    [...container.querySelectorAll("details[open]")].map(
      (n) => n.dataset.section,
    ),
  );
  const previousFocus = document.activeElement?.dataset?.focusKey;
  const scroll = container.scrollTop;
  container.replaceChildren();
  if (!run || run.sessionId !== sessionId) {
    container.append(
      el("p", { className: "empty-list", text: "Select a run to inspect." }),
    );
    return;
  }
  const records = events.filter(
    (e) => e.runId === run.id && (!e.sessionId || e.sessionId === sessionId),
  );
  container.append(
    el(
      "div",
      { className: "inspector-status" },
      el("span", {
        className: `run-badge ${run.status}`,
        text: runLabels[run.status] || run.status,
      }),
      action("refresh-cw", "Refresh run details", onRefresh),
    ),
  );
  const inputRecord = records.find((event) =>
    ["user.message", "message/user"].includes(event.type),
  );
  const identity = el("div", { className: "run-identity" });
  if (sessionTitle)
    identity.append(el("p", { className: "eyebrow", text: sessionTitle }));
  const started = new Date(run.startedAt || "");
  if (Number.isFinite(started.valueOf()))
    identity.append(
      el("time", {
        text: `Started ${started.toLocaleString()}`,
        attrs: { datetime: started.toISOString() },
      }),
    );
  if (inputRecord?.data?.text)
    identity.append(
      el("p", { className: "run-input-summary", text: inputRecord.data.text }),
    );
  container.append(identity);
  if (run.error)
    container.append(
      el("p", {
        className: "inline-error",
        text: run.error.message || run.error.code,
      }),
    );
  const artifacts = Array.isArray(run.artifacts) ? run.artifacts : [];
  const section = el(
    "section",
    { className: "inspector-section" },
    el("h3", { text: "Results" }),
  );
  if (!artifacts.length)
    section.append(
      el("p", {
        className: "form-help",
        text: ["created", "running", "waiting_user", "stopping"].includes(
          run.status,
        )
          ? "Recorded files will appear here as this run writes them."
          : "No files were recorded for this run.",
      }),
    );
  for (const [index, file] of artifacts.entries()) {
    if (
      file.kind !== "content-version" ||
      typeof file.path !== "string" ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    )
      continue;
    const target = {
      kind: "content-version",
      sessionId,
      runId: run.id,
      path: file.path,
      sha256: file.sha256,
    };
    const open = el(
      "button",
      {
        className: "artifact-open",
        attrs: {
          type: "button",
          "data-focus-key": `artifact:${run.id}:${index}`,
        },
      },
      icon("file-text"),
      el("span", { className: "file-name", text: file.path }),
    );
    open.addEventListener("click", () => onFile(target));
    const current = el("button", {
      className: "text-button",
      attrs: { type: "button" },
      text: "Current file",
    });
    current.addEventListener("click", () =>
      onFile({ ...target, kind: "current", expectedSha256: file.sha256 }),
    );
    section.append(
      el(
        "div",
        { className: "artifact-row" },
        open,
        el(
          "div",
          { className: "artifact-meta" },
          el("span", { text: `Recorded version · ${formatBytes(file.bytes)}` }),
          current,
        ),
        el(
          "div",
          { className: "version-line" },
          el("code", { text: file.sha256.slice(0, 12) }),
          copyAction(
            file.sha256,
            "Copy recorded version hash",
            `artifact-hash:${run.id}:${index}`,
          ),
        ),
      ),
    );
  }
  if (artifacts.length)
    section.append(
      el("p", {
        className: "form-help",
        text: "Recorded files have not been accepted by a review.",
      }),
    );
  container.append(section);
  const usage = run.usage;
  if (usage) {
    const dl = el("dl", { className: "data-list usage-list" });
    const prefix = usage.missing ? "At least " : "";
    for (const [key, label] of [
      ["input", "Input tokens"],
      ["output", "Output tokens"],
      ["cacheRead", "Cached input"],
      ["cacheWrite", "Cache writes"],
      ["turns", "Model turns"],
    ])
      datum(
        dl,
        label,
        Number.isFinite(usage[key])
          ? `${prefix}${usage[key].toLocaleString()}`
          : "Not reported",
      );
    container.append(
      el(
        "section",
        { className: "inspector-section" },
        el("h3", { text: "Usage" }),
        dl,
        usage.missing
          ? el("p", {
              className: "form-help",
              text: "Usage is incomplete. Reported values are lower bounds.",
            })
          : null,
      ),
    );
  }
  container.append(renderRequestMeasurements(records, run.id));
  const notices = records.filter((e) => e.type === "run.notice");
  if (notices.length) {
    const list = el("div", { className: "notice-list" });
    for (const event of notices)
      list.append(
        el("p", { className: "notice-row", text: noticeText(event.data) }),
      );
    container.append(
      el(
        "section",
        { className: "inspector-section" },
        el("h3", { text: "Run notes" }),
        list,
      ),
    );
  }
  const recorded = renderRecordedContext(runtimeContext);
  if (recorded) {
    recorded.open = opened.has("runtime-context");
    container.append(recorded);
  }
  const details = el(
    "details",
    { className: "inspector-section", attrs: { "data-section": "run-info" } },
    el("summary", { text: "Run information" }),
  );
  details.open = opened.has("run-info");
  const metadata = el("dl", { className: "data-list" });
  for (const [name, value] of [
    ["Run ID", run.id],
    ["Command ID", run.commandId],
    [
      "Provider",
      typeof run.provider === "string" ? run.provider : run.provider?.provider,
    ],
    ["Model", run.provider?.model],
    ["API format", run.provider?.api],
    ["Adapter", run.adapterId],
    ["Started", run.startedAt],
    ["Ended", run.endedAt],
    ["Native session", run.hostSession?.id],
    ["Credential generation", run.credentialGeneration],
  ])
    datum(metadata, name, value, {
      copy: name.endsWith("ID") || name === "Native session",
      key: `${run.id}:${name}`,
    });
  details.append(metadata);
  container.append(details);
  const trace = el(
    "details",
    { className: "inspector-section", attrs: { "data-section": "events" } },
    el("summary", { text: `Activity · ${records.length} events` }),
  );
  trace.open = opened.has("events");
  if (records.length > 100)
    trace.append(
      el("p", {
        className: "form-help",
        text: `Showing the latest 100 of ${records.length} recorded events.`,
      }),
    );
  const table = el("div", { className: "event-list" });
  for (const event of records.slice(-100))
    table.append(
      el(
        "details",
        { className: "event-row" },
        el(
          "summary",
          {},
          el("code", { text: `#${event.seq}` }),
          el("span", { text: event.type }),
        ),
        el("pre", {
          className: "diagnostic-text",
          text: JSON.stringify(event.data, null, 2),
        }),
      ),
    );
  trace.append(table);
  container.append(trace);
  container.scrollTop = scroll;
  if (previousFocus && document.activeElement === document.body)
    container
      .querySelector(`[data-focus-key="${CSS.escape(previousFocus)}"]`)
      ?.focus();
}
export function noticeText(data = {}) {
  const labels = {
    compaction_start: "Summarizing conversation history.",
    compaction_end: `Conversation summary ${data.outcome || "finished"}.`,
    auto_retry_start: "Retrying the provider request.",
    auto_retry_end: "Provider retry finished.",
    compaction_limit_reached: "Conversation summary limit reached.",
    summarization_retry: "Retrying the conversation summary.",
  };
  if (data.kind === "unrecorded_files")
    return `Files found without a recorded write: ${(data.files || []).map((f) => f.path).join(", ") || "details unavailable"}. Inspect the current files before relying on them.`;
  return labels[data.kind] || data.kind || "Runtime notice";
}
export function validateFilePayload(ref, payload) {
  if (
    !payload ||
    payload.path !== ref.path ||
    payload.kind !== ref.kind ||
    typeof payload.text !== "string" ||
    !/^[a-f0-9]{64}$/.test(payload.sha256)
  )
    throw new Error("The file response does not match this target.");
  if (
    ref.kind === "content-version" &&
    (payload.runId !== ref.runId || payload.sha256 !== ref.sha256)
  )
    throw new Error("The recorded version does not match this target.");
  return payload;
}
export function createFileView(container, { request }) {
  let controller = null,
    generation = 0,
    ref = null,
    reader = null,
    loadedKey = null,
    loadedView = null;
  async function load(next) {
    const key = JSON.stringify(next);
    if (next.kind !== "current" && loadedKey === key && loadedView?.parentNode === container) return;
    reader?.destroy(); reader = null; loadedKey = null; loadedView = null;
    ref = next;
    const own = ++generation;
    controller?.abort();
    controller = new AbortController();
    container.replaceChildren(
      el("p", { className: "form-help", text: "Loading file…" }),
    );
    const query = new URLSearchParams({ path: next.path });
    if (next.kind === "content-version") {
      query.set("runId", next.runId);
      query.set("sha256", next.sha256);
    }
    const endpoint =
      next.kind === "content-version" ? "artifacts/file" : "workspace/file";
    try {
      const payload = next.kind === "core-file" ? {
        path: next.path, kind: next.kind, sha256: next.sha256, bytes: next.bytes,
        text: await readCoreFile(next, {signal: controller.signal, query: (input, signal) => request(`/sessions/${encodeURIComponent(next.sessionId)}/work-query?${new URLSearchParams(input)}`, {signal})}),
        truncated: false,
      } : validateFilePayload(
        next,
        await request(
          `/sessions/${encodeURIComponent(next.sessionId)}/${endpoint}?${query}`,
          { signal: controller.signal },
        ),
      );
      if (own !== generation) return;
      const heading = el(
        "div",
        { className: "file-heading" },
        el("p", {
          className: "file-kind",
          text:
            payload.kind === "current" ? "Current file" : payload.kind === "core-file" ? (next.artifactId ? "Accepted artifact file" : "Candidate file") : "Recorded version",
        }),
        el("h3", { text: payload.path }),
        el(
          "div",
          { className: "file-heading-actions" },
          el("span", {
            className: "form-help",
            text: formatBytes(payload.bytes),
          }),
          copyAction(payload.text, "Copy displayed file text"),
        ),
      );
      const version = el(
        "details",
        { className: "version-details" },
        el("summary", { text: "Version details" }),
        el(
          "div",
          { className: "version-line" },
          el("code", { text: payload.sha256 }),
          copyAction(payload.sha256, "Copy file version hash"),
        ),
      );
      if (next.kind === "core-file") version.append(el("p", {text:next.artifactId ? `Artifact ${next.artifactId}` : `Candidate ${next.candidateId}`}), el("code", {text:`Bundle ${next.bundleDigest}`}));
      const view = el("div", { className: "file-document" });
      let projection = null;
      if (/\.md$/i.test(next.path) && next.kind !== "current" && !payload.truncated && new TextEncoder().encode(payload.text).length <= MAX_MARKDOWN_BYTES) {
        try { projection = await projectMarkdown(payload.text, next); }
        catch (error) { if (error.code !== "too_complex") throw error; }
        if (own !== generation) return;
      }
      if (projection) {
        reader = createMarkdownReader(view);
        reader.render(projection);
      } else if (/\.md$/i.test(next.path) && payload.text.length < 200000) {
        view.append(el("p", {className:"form-help", text:"Preview only. Block source positions are unavailable for this reading."}), markdown(payload.text, { key: "file" }));
      } else view.append(el("pre", { className: "file-text", text: payload.text }));
      container.replaceChildren(heading, version);
      if (payload.truncated)
        container.append(
          el("p", {
            className: "inline-notice",
            text: "This view is truncated. The version hash covers the complete file.",
          }),
        );
      const readingNote = el("aside", {
        className: "reading-note",
        attrs: { "aria-label": "File provenance" },
      });
      readingNote.append(
        el("p", {
          text:
            next.kind === "core-file"
              ? (next.artifactId ? "Fixed file from the accepted artifact." : "Fixed file from this candidate. Review acceptance is not recorded here.")
              : next.kind === "content-version"
                ? "Saved by this run. Review acceptance is not recorded here."
                : "Workspace file at the time of loading.",
        }),
      );
      if (next.kind === "current" && next.expectedSha256) {
        const matches = payload.sha256 === next.expectedSha256;
        readingNote.append(
          el("p", {
            className: "reading-relation",
            text: matches
              ? "Matches the recorded version."
              : "Differs from the recorded version; both versions remain available from the run.",
          }),
        );
        const comparison = el("dl", { className: "reading-versions" });
        for (const [label, hash] of [
          ["Recorded", next.expectedSha256],
          ["Current", payload.sha256],
        ]) {
          comparison.append(
            el("dt", { text: label }),
            el("dd", {}, el("code", { text: hash.slice(0, 12) })),
          );
        }
        readingNote.append(comparison);
        version.append(
          el("p", { text: "Recorded version" }),
          el(
            "div",
            { className: "version-line" },
            el("code", { text: next.expectedSha256 }),
            copyAction(next.expectedSha256, "Copy recorded version hash"),
          ),
        );
      }
      container.append(readingNote);
      container.append(view);
      loadedKey = key; loadedView = view;
    } catch (error) {
      if (own !== generation || error.name === "AbortError") return;
      const retry = el("button", {
        className: "secondary-button",
        attrs: { type: "button", "aria-label": "Retry loading this file" },
        text: "Retry",
      });
      retry.addEventListener("click", () => load(next));
      container.replaceChildren(
        el(
          "div",
          { className: "empty-state compact" },
          el("h3", { text: "File could not be loaded" }),
          el("p", { text: error.message }),
          retry,
        ),
      );
    }
  }
  return {
    load,
    dispose() {
      generation++;
      controller?.abort();
      controller = null;
      ref = null;
      reader?.destroy(); reader = null; loadedKey = null; loadedView = null;
      container.replaceChildren();
    },
    pause() {
      generation++;
      controller?.abort();
      controller = null;
    },
  };
}
