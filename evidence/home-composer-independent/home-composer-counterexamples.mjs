import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = (
  await readFile(new URL("../../app/web/app.mjs", import.meta.url), "utf8")
)
  .replace(/^import[\s\S]*?from ["'][^"']+["'];\n/gm, "")
  .replace("void init();", "");

class NodeStub {
  constructor(id = "") {
    this.id = id;
    this.value = "";
    this.textContent = "";
    this.hidden = false;
    this.disabled = false;
    this.readOnly = false;
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.classList = {
      values: new Set(),
      toggle: (name, force) => {
        const next = force === undefined ? !this.classList.values.has(name) : Boolean(force);
        if (next) this.classList.values.add(name);
        else this.classList.values.delete(name);
        return next;
      },
      contains: (name) => this.classList.values.has(name),
    };
    this.isConnected = true;
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  dispatchEvent(event) {
    event.target ||= this;
    event.currentTarget ||= this;
    for (const listener of this.listeners.get(event.type) || []) listener.call(this, event);
  }

  append(...children) {
    this.children.push(...children.filter(Boolean));
  }

  prepend(...children) {
    this.children.unshift(...children.filter(Boolean));
  }

  replaceChildren(...children) {
    this.children = children.filter(Boolean);
  }

  contains(candidate) {
    return candidate === this || this.children.some((child) => child?.contains?.(candidate));
  }

  focus() {
    this.ownerDocument && (this.ownerDocument.activeElement = this);
  }

  getClientRects() {
    return this.hidden ? [] : [{}];
  }

  closest() {
    return null;
  }

  querySelectorAll() {
    return [];
  }

  querySelector() {
    return null;
  }

  requestSubmit() {
    this.requestSubmitCount = (this.requestSubmitCount || 0) + 1;
  }

  setAttribute(name, value) {
    this[name] = String(value);
  }

  removeAttribute(name) {
    delete this[name];
  }
}

function fixture({ projects = [{ id: "p1", name: "Alpha" }], responder = () => ({}) } = {}) {
  const calls = [];
  const draftWrites = [];
  const runCalls = [];
  const dialogs = [];
  const storage = new Map();
  const nodes = new Map();
  const documentStub = {
    body: new NodeStub("body"),
    activeElement: null,
    addEventListener() {},
    getElementById(id) {
      if (!nodes.has(id)) {
        const node = new NodeStub(id);
        node.ownerDocument = documentStub;
        nodes.set(id, node);
      }
      return nodes.get(id);
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      const node = new NodeStub();
      node.ownerDocument = documentStub;
      return node;
    },
    createTextNode(text) {
      const node = new NodeStub();
      node.textContent = text;
      node.ownerDocument = documentStub;
      return node;
    },
  };
  documentStub.activeElement = documentStub.body;
  const sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const windowStub = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    sessionStorage,
    localStorage: sessionStorage,
    addEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval: () => ({ timer: true }),
    clearInterval() {},
  };
  const sandbox = {
    AbortController,
    console,
    crypto: { randomUUID: () => "command-1" },
    document: documentStub,
    window: windowStub,
    setTimeout,
    clearTimeout,
    setInterval: () => ({ timer: true }),
    clearInterval() {},
    requestStub: async (path, options) => {
      calls.push({ path, options });
      return responder(path, options);
    },
    draftWrites,
    runCalls,
    dialogs,
  };
vm.runInNewContext(
    source +
      `
const realRenderComposer = renderComposer;
request = requestStub;
setAction = () => {};
icon = () => document.createElement("span");
installTooltips = () => {};
anchorPopover = () => () => {};
renderComposer = () => {};
renderProjectList = () => {};
loadHome = async () => {};
storeHomeDraft = () => {};
persistDraftForSession = async (sessionId, options = {}) => {
  draftWrites.push({ sessionId, ...options });
};
guardHandoffFocus = () => true;
selectSession = async (sessionId) => {
  if (state.__failSelect) {
    state.__failSelect = false;
    state.navigationEpoch += 1;
    state.activeSessionId = sessionId;
    state.view = "session";
    state.session = null;
    throw new Error("session detail unavailable");
  }
  state.navigationEpoch += 1;
  state.activeSessionId = sessionId;
  state.view = "session";
  state.session = { id: sessionId, projectId: state.homeStart.projectId };
};
submitSessionRun = async ({ commandId } = {}) => {
  runCalls.push({ commandId, sessionId: state.activeSessionId });
};
openDialog = (id) => dialogs.push(id);
state.projects = ${JSON.stringify(projects)};
state.activeProjectId = ${JSON.stringify(projects[0]?.id || null)};
state.view = "home";
state.activeSessionId = null;
state.session = null;
state.connectionLost = false;
window.api = { state, submitHomeRun, submitRun, renderComposer: realRenderComposer, wireEvents };
`,
    sandbox,
  );
  return {
    ...sandbox.window.api,
    calls,
    draftWrites,
    runCalls,
    dialogs,
    node: (id) => documentStub.getElementById(id),
    storage,
  };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

test("Home sends one create and one run despite duplicate submit events", async () => {
  let release;
  const f = fixture({
    responder: (path) => {
      if (path === "/sessions")
        return new Promise((resolve) => {
          release = () => resolve({ session: { id: "s1", projectId: "p1" } });
        });
      throw new Error(`unexpected request: ${path}`);
    },
  });
  f.node("composer-input").value = "Build the first task";
  const first = f.submitRun({ preventDefault() {} });
  const second = f.submitRun({ preventDefault() {} });
  await flush();
  assert.equal(f.calls.filter(({ path }) => path === "/sessions").length, 1);
  assert.equal(f.runCalls.length, 0);
  release();
  await Promise.all([first, second]);
  assert.equal(f.calls.filter(({ path }) => path === "/sessions").length, 1);
  assert.equal(f.runCalls.length, 1);
  assert.equal(f.runCalls[0].commandId, "command-1");
});

test("a late create after leaving Home saves the instruction but never navigates or sends", async () => {
  let release;
  const f = fixture({
    responder: () =>
      new Promise((resolve) => {
        release = () => resolve({ session: { id: "late", projectId: "p1" } });
      }),
  });
  f.node("composer-input").value = "Keep this instruction";
  const pending = f.submitHomeRun();
  await flush();
  f.state.navigationEpoch += 1;
  f.state.view = "session";
  f.state.activeSessionId = "other";
  f.state.session = { id: "other", projectId: "p1" };
  release();
  await pending;
  assert.equal(f.state.activeSessionId, "other");
  assert.equal(f.runCalls.length, 0);
  assert.equal(f.state.homeDraft, "Keep this instruction");
  assert.match(f.state.homeStart.error, /not been sent/);
});

test("a received session reused after detail failure never creates a second session", async () => {
  let createCount = 0;
  const f = fixture({
    responder: (path) => {
      if (path === "/sessions") {
        createCount++;
        return { session: { id: "known", projectId: "p1" } };
      }
      throw new Error(`unexpected request: ${path}`);
    },
  });
  f.state.__failSelect = true;
  f.node("composer-input").value = "Resume the known session";
  await f.submitHomeRun();
  assert.equal(createCount, 1);
  assert.equal(f.runCalls.length, 0);
  assert.equal(f.state.homeStart.session.id, "known");
  f.state.view = "home";
  f.state.activeSessionId = null;
  f.state.session = null;
  await f.submitHomeRun();
  assert.equal(createCount, 1, "a known session receipt must be reused");
  assert.equal(f.runCalls.length, 1);
});

test("a failed first create retries with the latest permission mode", async () => {
  const permissionModes = [];
  const f = fixture({
    responder: (_path, options) => {
      permissionModes.push(options.body.permissionMode);
      const error = new Error("validation failed");
      error.status = 400;
      throw error;
    },
  });
  f.state.homePermissionMode = "ask";
  f.node("composer-input").value = "Retry with read only";
  await f.submitHomeRun();
  f.state.homePermissionMode = "read_only";
  await f.submitHomeRun();
  assert.deepEqual(permissionModes, ["ask", "read_only"]);
});

test("creation failure is retryable only by an explicit submit and an uncertain receipt is blocked", async () => {
  let mode = "normal";
  let createCount = 0;
  const f = fixture({
    responder: () => {
      createCount++;
      if (mode === "normal") {
        const error = new Error("validation failed");
        error.status = 400;
        throw error;
      }
      throw new Error("network offline");
    },
  });
  f.node("composer-input").value = "Do not lose this";
  await f.submitHomeRun();
  assert.equal(createCount, 1);
  assert.equal(f.state.homeDraft, "Do not lose this");
  assert.equal(f.state.homeStart.unconfirmed, false);
  assert.equal(f.runCalls.length, 0);

  mode = "uncertain";
  await f.submitHomeRun();
  assert.equal(createCount, 2);
  assert.equal(f.state.homeStart.unconfirmed, true);
  assert.equal(f.state.homeStart.error.includes("unconfirmed"), true);
  await f.submitHomeRun();
  assert.equal(createCount, 2, "an uncertain create must not auto-retry on another submit");
  assert.equal(f.state.homeDraft, "Do not lose this");
});

test("an empty project list opens project creation and retains the draft", async () => {
  const f = fixture({ projects: [] });
  f.node("composer-input").value = "Create a project first";
  await f.submitHomeRun();
  assert.deepEqual(f.dialogs, ["project-dialog"]);
  assert.equal(f.state.homeProjectRequest, true);
  assert.equal(f.state.homeDraft, "Create a project first");
  assert.equal(f.runCalls.length, 0);
});

test("normal creation failure does not keep a stale project when the user changes the project", async () => {
  const createdFor = [];
  const f = fixture({
    projects: [
      { id: "p1", name: "Alpha" },
      { id: "p2", name: "Beta" },
    ],
    responder: (_path, options) => {
      createdFor.push(options.body.projectId);
      const error = new Error("try another project");
      error.status = 400;
      throw error;
    },
  });
  f.state.homeProjectId = "p1";
  f.node("composer-input").value = "Retry in the selected project";
  await f.submitHomeRun();
  f.state.homeProjectId = "p2";
  await f.submitHomeRun();
  assert.deepEqual(
    createdFor,
    ["p1", "p2"],
    "a retry must honor the newly selected project",
  );
});

test("Home draft and session draft stay isolated, and Home blocks Send only while disconnected", () => {
  const f = fixture();
  f.state.homeDraft = "home-only";
  f.state.draftCache.set("session-1", "session-only");
  f.state.activeSessionId = null;
  f.state.session = null;
  f.state.connectionLost = false;
  f.node("composer-input").value = f.state.homeDraft;
  assert.equal(f.state.draftCache.get("session-1"), "session-only");
  f.state.connectionLost = true;
  f.renderComposer();
  assert.equal(f.node("composer-input").value, "home-only");
  assert.equal(f.node("send-button").disabled, true);
});

test("session composer preserves drafts across active, waiting, stopping, failed, and disconnected states", () => {
  const f = fixture();
  f.state.view = "session";
  f.state.activeSessionId = "s1";
  f.state.session = { id: "s1", projectId: "p1", draft: "kept" };
  f.state.draftCache.set("s1", "kept");
  const textarea = f.node("composer-input");
  const send = f.node("send-button");
  const cancel = f.node("cancel-run-button");
  const hint = f.node("composer-run-hint");
  textarea.value = "kept";
  for (const status of ["created", "running", "waiting_user", "stopping"]) {
    f.state.runs = [{ id: `run-${status}`, sessionId: "s1", status, startedAt: new Date().toISOString() }];
    f.state.connectionLost = false;
    f.renderComposer();
    assert.equal(send.disabled, true, `${status}: Send must be disabled`);
    assert.equal(cancel.hidden, false, `${status}: Cancel must be visible`);
    assert.equal(textarea.value, "kept", `${status}: draft must remain`);
    assert.equal(hint.hidden, false, `${status}: run hint must be visible`);
  }
  f.state.runs = [{ id: "failed", sessionId: "s1", status: "failed" }];
  f.renderComposer();
  assert.equal(send.disabled, false, "failed runs must release Send");
  assert.equal(cancel.hidden, true);
  assert.equal(textarea.value, "kept");
  f.state.connectionLost = true;
  f.renderComposer();
  assert.equal(send.disabled, true, "disconnect must block Send");
  assert.equal(textarea.value, "kept", "disconnect must preserve the draft");
});

test("IME composition keeps Enter from submitting while ordinary Enter still submits", () => {
  const f = fixture();
  f.wireEvents();
  const input = f.node("composer-input");
  const form = f.node("composer-form");
  const composing = { type: "keydown", key: "Enter", shiftKey: false, isComposing: true, preventDefault() { this.prevented = true; } };
  input.dispatchEvent(composing);
  assert.equal(composing.prevented, undefined);
  assert.equal(form.requestSubmitCount, undefined);
  input.dispatchEvent({ type: "compositionstart" });
  const flagged = { type: "keydown", key: "Enter", shiftKey: false, isComposing: false, preventDefault() { this.prevented = true; } };
  input.dispatchEvent(flagged);
  assert.equal(flagged.prevented, undefined);
  assert.equal(form.requestSubmitCount, undefined);
  input.dispatchEvent({ type: "compositionend" });
  const ordinary = { type: "keydown", key: "Enter", shiftKey: false, isComposing: false, preventDefault() { this.prevented = true; } };
  input.dispatchEvent(ordinary);
  assert.equal(ordinary.prevented, true);
  assert.equal(form.requestSubmitCount, 1);
});
