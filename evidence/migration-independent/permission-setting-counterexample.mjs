import assert from "node:assert/strict";
import { test } from "node:test";

/*
 * Independent regression probe for the merged settings segmented control.
 * It uses a tiny DOM stub so no browser or package is needed. The probe keeps
 * focus on the selected radio while the authoritative session update arrives,
 * then makes the next request fail. A stale settings panel must not restore an
 * older permission mode.
 */

class EventTargetStub {
  #listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.#listeners.get(type) ?? [];
    listeners.push(listener);
    this.#listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    event.target ??= this;
    for (const listener of this.#listeners.get(event.type) ?? []) listener.call(this, event);
  }
}

class NodeStub extends EventTargetStub {
  constructor(tagName, ownerDocument) {
    super();
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.parentNode = null;
    this.isConnected = false;
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.value = "";
    this.className = "";
    this.dataset = {};
    this.textContent = "";
  }

  append(...children) {
    for (const child of children.flat()) {
      if (!child || typeof child !== "object") continue;
      child.parentNode = this;
      child.isConnected = this.isConnected;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === "id") this.id = stringValue;
    if (name === "value") this.value = stringValue;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  contains(candidate) {
    return candidate === this || this.children.some((child) => child.contains(candidate));
  }

  #matches(selector) {
    const tag = selector.match(/^([a-z-]+)/i)?.[1];
    if (tag && this.tagName !== tag.toLowerCase()) return false;
    const value = selector.match(/\[value="([^"]+)"\]/)?.[1];
    if (value !== undefined && this.value !== value) return false;
    return true;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(",").map((item) => item.trim());
    const found = [];
    const visit = (node) => {
      if (selectors.some((item) => node.#matches(item))) found.push(node);
      for (const child of node.children) visit(child);
    };
    for (const child of this.children) visit(child);
    return found;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

const documentStub = {
  activeElement: null,
  createElement(tagName) {
    return new NodeStub(tagName, documentStub);
  },
  createElementNS(_namespace, tagName) {
    return new NodeStub(tagName, documentStub);
  },
  createTextNode(text) {
    const node = new NodeStub("#text", documentStub);
    node.textContent = String(text);
    return node;
  },
  getElementById(id) {
    return id === "session-settings" ? panel : null;
  },
};
globalThis.document = documentStub;
globalThis.window = { matchMedia: () => ({ matches: false }) };

const panel = new NodeStub("section", documentStub);
panel.id = "session-settings";
panel.isConnected = true;
const container = new NodeStub("section", documentStub);
container.isConnected = true;

const { createSettingsView } = await import("../../app/web/settings-view.mjs");

test("permission update while focused leaves a stale panel that resets the next failed change", async () => {
  let authoritative = { id: "session-1", projectId: "project-1", permissionMode: "draft" };
  let requestCount = 0;
  let view;
  const request = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      authoritative = { ...authoritative, permissionMode: "ask" };
      return { session: authoritative };
    }
    throw new Error("synthetic conflict");
  };
  const settings = createSettingsView(container, {
    request,
    onConfig() {},
    getSession: () => ({ session: authoritative, active: false }),
    onSession: (session) => {
      authoritative = session;
      view.update({
        config: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" },
        credentialStatus: "not_configured",
      });
    },
    notify() {},
  });
  view = settings;
  settings.update({
    config: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" },
    credentialStatus: "not_configured",
  });

  const first = panel.querySelector('input[value="ask"]');
  assert.ok(first, "first permission option must exist");
  first.checked = true;
  first.focus();
  first.dispatchEvent({ type: "change" });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(authoritative.permissionMode, "ask");
  assert.equal(documentStub.activeElement, first, "the focused radio keeps the panel from rebuilding");

  const second = panel.querySelector('input[value="read_only"]');
  assert.ok(second, "second permission option must exist");
  second.checked = true;
  second.dispatchEvent({ type: "change" });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(requestCount, 2);
  assert.equal(authoritative.permissionMode, "ask");
  assert.equal(
    panel.querySelector('input[value="ask"]').checked,
    true,
    "a failed second update should restore the authoritative ask mode",
  );
  assert.equal(
    panel.querySelector('input[value="draft"]').checked,
    false,
    "the old draft mode must not be restored after the first update succeeded",
  );
});

test("focused permission control keeps its pending choice and stays locked when a run starts", async () => {
  let authoritative = { id: "session-2", projectId: "project-1", permissionMode: "draft" };
  let active = false;
  let release;
  let view;
  const request = async () =>
    new Promise((resolve) => {
      release = () => {
        authoritative = { ...authoritative, permissionMode: "ask" };
        resolve({ session: authoritative });
      };
    });
  const settings = createSettingsView(container, {
    request,
    onConfig() {},
    getSession: () => ({ session: authoritative, active }),
    onSession: (session) => {
      authoritative = session;
      view.update({
        config: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" },
        credentialStatus: "not_configured",
      });
    },
    notify() {},
  });
  view = settings;
  settings.update({
    config: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" },
    credentialStatus: "not_configured",
  });

  const ask = panel.querySelector('input[value="ask"]');
  const draft = panel.querySelector('input[value="draft"]');
  const fieldset = panel.querySelector("fieldset");
  assert.ok(ask && draft && fieldset, "permission control must render");
  ask.checked = true;
  draft.checked = false;
  ask.focus();
  ask.dispatchEvent({ type: "change" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fieldset.dataset.pending, "true");
  assert.equal(ask.checked, true, "the optimistic choice remains visible while the request is pending");
  assert.equal(draft.checked, false);

  settings.update({
    config: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" },
    credentialStatus: "not_configured",
  });
  assert.equal(ask.checked, true, "a focused refresh must not flash the old authoritative choice");
  assert.equal(draft.checked, false);

  active = true;
  settings.update({
    config: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" },
    credentialStatus: "not_configured",
  });
  assert.equal(fieldset.disabled, true, "a run starting during the request must keep the control disabled");
  assert.equal(ask.checked, true);

  assert.equal(typeof release, "function");
  release();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(authoritative.permissionMode, "ask");
  assert.equal(fieldset.disabled, true, "completion must not unlock a control while a run is active");
  assert.equal(ask.checked, true);

  active = false;
  settings.update({
    config: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" },
    credentialStatus: "not_configured",
  });
  assert.equal(fieldset.disabled, false);
  assert.equal(ask.checked, true);
});
