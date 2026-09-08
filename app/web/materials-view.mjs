import { el, icon, action } from "./ui-controls.mjs";
import { formatBytes } from "./inspector.mjs";
export function createMaterialsView({
  request,
  getSession,
  onOpenFile,
  notify,
}) {
  const list = document.getElementById("workspace-files");
  const form = document.getElementById("material-form");
  const error = document.getElementById("material-error"),
    name = document.getElementById("material-name"),
    text = document.getElementById("material-text"),
    submit = document.getElementById("material-submit"),
    upload = document.getElementById("material-upload");
  let sessionId = null,
    generation = 0,
    controller = null,
    busy = false,
    files = [];
  const fail = (message) => {
    error.textContent = message;
    error.hidden = false;
  };
  async function refresh() {
    if (!sessionId) return;
    const own = ++generation;
    const id = sessionId;
    controller?.abort();
    controller = new AbortController();
    list.replaceChildren(
      el("p", { className: "form-help", text: "Loading session files…" }),
    );
    try {
      const result = await request(
        `/sessions/${encodeURIComponent(id)}/workspace`,
        { signal: controller.signal },
      );
      if (own !== generation || id !== sessionId) return;
      files = Array.isArray(result.tree) ? result.tree : [];
      list.replaceChildren();
      const heading = el(
        "div",
        { className: "section-heading" },
        el("h3", { text: `Workspace files · ${files.length}` }),
        action("refresh-cw", "Refresh session files", refresh),
      );
      list.append(heading);
      if (!files.length)
        list.append(
          el("p", {
            className: "form-help",
            text: "Files written by the agent also appear here.",
          }),
        );
      for (const file of files) {
        const row = el(
          "button",
          { className: "workspace-file-row", attrs: { type: "button" } },
          icon("file-text"),
          el("span", { className: "file-name", text: file.path }),
          el("span", { className: "file-size", text: formatBytes(file.bytes) }),
        );
        row.addEventListener("click", () => {
          if (sessionId !== getSession()?.id) return;
          document.getElementById("materials-dialog").close();
          onOpenFile({ kind: "current", sessionId: id, path: file.path });
        });
        list.append(row);
      }
      replacementLabel();
    } catch (err) {
      if (own !== generation || err.name === "AbortError") return;
      const retry = el("button", {
        className: "secondary-button",
        attrs: { type: "button", "aria-label": "Retry loading session files" },
        text: "Retry",
      });
      retry.addEventListener("click", refresh);
      list.replaceChildren(
        el("p", { className: "inline-error", text: err.message }),
        retry,
      );
    }
  }
  function replacementLabel() {
    submit.textContent = files.some((f) => f.path === `materials/${name.value}`)
      ? "Replace material"
      : "Add material";
  }
  name.addEventListener("input", replacementLabel);
  upload.addEventListener("change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    const own = generation;
    try {
      if (file.size > 1048576)
        throw new Error("Choose a UTF-8 text file smaller than 1 MB.");
      const bytes = await file.arrayBuffer();
      const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (value.includes("\0"))
        throw new Error(
          "This file contains binary data. Choose a UTF-8 text file.",
        );
      if (own !== generation) return;
      name.value = file.name;
      text.value = value;
      error.hidden = true;
      replacementLabel();
    } catch (err) {
      fail(err.message || "The file could not be read as UTF-8 text.");
    } finally {
      upload.value = "";
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !sessionId || getSession()?.id !== sessionId) return;
    const id = sessionId;
    const nameValue = name.value.trim(),
      textValue = text.value;
    const body = { name: nameValue, text: textValue };
    if (new TextEncoder().encode(JSON.stringify(body)).length > 1048576) {
      fail(
        "This material exceeds the 1 MB request limit. Reduce its size and try again.",
      );
      return;
    }
    busy = true;
    submit.disabled = true;
    error.hidden = true;
    try {
      const result = await request(
        `/sessions/${encodeURIComponent(id)}/materials`,
        { method: "POST", body },
      );
      if (id !== sessionId || id !== getSession()?.id) return;
      if (name.value.trim() === nameValue && text.value === textValue) {
        name.value = "";
        text.value = "";
        document.getElementById("material-add").open = false;
      }
      notify(`Added ${result.path}.`);
      await refresh();
    } catch (err) {
      if (id === sessionId) fail(err.message);
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
  return {
    open() {
      const session = getSession();
      if (!session) return;
      sessionId = session.id;
      document.getElementById("materials-session-title").textContent =
        session.title || "Session";
      refresh();
    },
    close() {
      generation++;
      controller?.abort();
    },
    reset() {
      generation++;
      controller?.abort();
      sessionId = null;
      files = [];
      name.value = "";
      text.value = "";
      error.hidden = true;
      list.replaceChildren();
    },
  };
}
