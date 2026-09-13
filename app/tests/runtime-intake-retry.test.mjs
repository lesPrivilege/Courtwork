import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVE_RUN_SENTENCE, createRuntimeView } from "../web/runtime-view.mjs";
import { createSettingsPage, SETTINGS_GROUPS } from "../web/settings-view.mjs";
import { ServiceError } from "../server/service.mjs";
import { boot } from "./helpers.mjs";
import { deferred, waitFor, withTinyDom } from "./tiny-dom.mjs";

const mountGroups = {
  overview: "developer",
  composition: "developer",
  instructions: "skills",
  capabilities: "tools",
  plugins: "plugins",
  permissions: "permissions",
  environment: "models",
};

async function fixture(body) {
  document.body = body;
  document.activeElement = body;
  const create = document.createElement.bind(document);
  document.createElement = tag => {
    const node = create(tag);
    node.scrollTop = 0;
    node.scrollLeft = 0;
    node.scrollIntoView = () => {};
    node.style = { setProperty() {}, removeProperty() {} };
    Object.defineProperty(node, "parentElement", { get: () => node.parentNode });
    Object.defineProperty(node, "childNodes", { get: () => node.children });
    const replace = node.replaceChildren.bind(node);
    node.replaceChildren = (...children) => {
      if (node.contains(document.activeElement)) document.activeElement = document.body;
      replace(...children);
    };
    return node;
  };
  document.querySelector = selector => body.querySelector(selector);
  const elements = new Map();
  document.getElementById = id => elements.get(id) || null;
  const register = (id, tag = "div", className = "") => {
    const node = document.createElement(tag);
    node.setAttribute("id", id);
    node.id = id;
    node.className = className;
    elements.set(id, node);
    return node;
  };
  const pageRoot = document.createElement("main");
  const navColumn = document.createElement("div");
  const search = register("settings-search", "input");
  const nav = register("settings-nav", "div");
  const dropdown = register("settings-nav-select", "select");
  const searchEmpty = register("settings-search-empty", "p");
  const sections = register("settings-sections", "div", "settings-sections");
  navColumn.append(search, nav, dropdown);
  pageRoot.append(navColumn, sections);
  body.append(pageRoot);
  document.querySelectorAll = selector => {
    if (selector === "#settings-new-sessions input[type=radio]")
      return elements.get("settings-new-sessions")?.querySelectorAll("input") || [];
    return body.querySelectorAll(selector);
  };
  for (const group of SETTINGS_GROUPS) {
    const panel = register(group.panel, "section", "settings-section");
    panel.hidden = true;
    sections.append(panel);
  }
  const panelFor = group => elements.get(SETTINGS_GROUPS.find(item => item.id === group).panel);
  for (const [id, group] of Object.entries(mountGroups)) {
    const mount = register("settings-runtime-" + id, "div", "settings-block");
    mount.setAttribute("data-wk11-mount", id);
    panelFor(group).append(mount);
  }
  for (const [id, group] of [
    ["settings-new-sessions", "general"], ["session-settings", "general"], ["settings-data", "general"],
    ["settings-appearance-rows", "appearance"], ["settings-memory-rows", "memory"],
    ["settings-keyboard-rows", "keyboard"],
  ]) panelFor(group).append(register(id));

  const settingsPage = createSettingsPage({ home: { get: () => "ask", set() {} } });

  const host = await boot();
  const session = await host.createSession();
  const mounts = Object.fromEntries(Object.keys(mountGroups).map(name => [name, elements.get("settings-runtime-" + name)]));
  const plane = sections;
  let sessionId = session.id;
  let nextHold = null;
  const heldRequests = new Set();
  const notices = [];
  const request = async (path, options = {}) => {
    const method = options.method || "GET";
    const result = await host.api(method, path, options.body);
    if (result.status < 200 || result.status >= 300) {
      const error = new Error(result.json?.error?.message || "HTTP " + result.status);
      error.status = result.status;
      error.body = result.json;
      throw error;
    }
    if (nextHold && method === "PUT" && path.startsWith("/runtime-control")) {
      const hold = nextHold;
      nextHold = null;
      hold.receipt.resolve(result.json);
      await hold.release.promise;
      heldRequests.delete(hold);
    }
    return result.json;
  };
  const view = createRuntimeView(mounts, {
    request,
    getSessionId: () => sessionId,
    notify: message => notices.push(message),
    onRendered: () => settingsPage.refilter(),
  });
  await view.load();

  const node = (key, mount = mounts.instructions) =>
    [...mount.querySelectorAll("button,input,textarea,select")].find(candidate => candidate.getAttribute("data-focus-key") === key);
  const mountForGroup = group => ({ skills: mounts.instructions, tools: mounts.capabilities, plugins: mounts.plugins, developer: mounts.overview })[group];
  const scopeTab = (type, group = "skills") =>
    [...mountForGroup(group).querySelectorAll("button")].find(candidate => candidate.getAttribute("data-scope") === type);
  const fill = (kind, key, value) => {
    const input = node("intake:" + kind + ":" + key);
    assert.ok(input, "missing intake field " + key);
    input.value = value;
    input.dispatchEvent({ type: "input" });
    return input;
  };
  const openInstruction = () => {
    const selector = node("intake:context:type");
    if (selector) {
      if (selector.value !== "instruction") {
        selector.value = "instruction";
        selector.dispatchEvent({ type: "change" });
      }
      return;
    }
    const skillToggle = node("intake:skill:toggle");
    if (skillToggle) {
      skillToggle.click();
      const type = node("intake:context:type");
      assert.ok(type, "opening the context editor exposes its type selector");
      type.value = "instruction";
      type.dispatchEvent({ type: "change" });
      return;
    }
    node("intake:instruction:toggle")?.click();
  };
  const setInstruction = async ({ id, title, content }) => {
    openInstruction();
    fill("instruction", "id", id);
    fill("instruction", "title", title);
    fill("instruction", "content", content);
    node("intake:instruction:review").click();
    await waitFor(() => node("intake:instruction:save") && !node("intake:instruction:save").disabled);
  };
  const bannerButton = (group = "skills") =>
    [...mountForGroup(group).querySelectorAll("button")].find(button => button.textContent === "Submit this change");
  const selectGroup = group => {
    const button = [...nav.querySelectorAll("button")].find(candidate => candidate.getAttribute("id") === "settings-tab-" + group);
    assert.ok(button, "missing Settings group tab " + group);
    button.click();
    return button;
  };
  const armHold = () => {
    const hold = { receipt: deferred(), release: deferred() };
    nextHold = hold;
    heldRequests.add(hold);
    return { receipt: hold.receipt.promise, release: () => hold.release.resolve() };
  };
  const close = async () => {
    if (nextHold) nextHold.release.resolve();
    for (const hold of heldRequests) hold.release.resolve();
    await host.runtime.close();
  };
  return {
    host, session, plane, mounts, view, notices, node, scopeTab, fill, openInstruction,
    setInstruction, bannerButton, armHold, close, selectGroup, panelFor, mountForGroup,
    setSession(id) { sessionId = id; },
  };
}

async function addExternalRevision(host, session, suffix) {
  const path = "/runtime-control?sessionId=" + encodeURIComponent(session.id);
  const snapshot = (await host.api("GET", path)).json;
  const result = await host.api("PUT", path, {
    revision: snapshot.revision,
    operation: "put",
    resource: {
      id: "local:external-" + suffix,
      kind: "reference",
      title: "External revision " + suffix,
      scope: { type: "session", id: session.id },
      content: "A concurrent host-side edit.",
    },
    exposed: false,
  });
  assert.equal(result.status, 200, JSON.stringify(result.json));
  return result.json;
}

async function startConflict(h, suffix = "first") {
  h.selectGroup("skills");
  h.scopeTab("session").click();
  await h.setInstruction({
    id: "local:intake-" + suffix,
    title: "Instruction " + suffix,
    content: "Original reviewed instruction " + suffix,
  });
  await addExternalRevision(h.host, h.session, suffix);
  h.node("intake:instruction:save").click();
  await waitFor(() => h.bannerButton("skills"));
  await waitFor(() => h.mounts.instructions.textContent.includes("Not saved. Your draft is kept here."));
}

function resourceRow(h, id) {
  return [...h.mounts.instructions.querySelectorAll(".runtime-row")].find(row => row.getAttribute("data-resource") === id);
}

test("normal Save completes the intake only after the Host snapshot accepts the resource", () => withTinyDom(async body => {
  const h = await fixture(body);
  try {
    h.selectGroup("skills");
    h.scopeTab("session").click();
    await h.setInstruction({ id: "local:intake-normal", title: "Normal instruction", content: "Saved by the Host." });
    const before = h.view.summary().revision;
    h.node("intake:instruction:save").click();
    await waitFor(() => resourceRow(h, "local:intake-normal"));
    assert.ok(h.view.summary().revision > before);
    assert.equal(h.node("intake:instruction:content"), undefined, "the saved editor has closed");
    assert.ok(h.notices.includes("Normal instruction saved. Exposure stays under its own control."));
    const stored = await h.host.api("GET", "/runtime-resources/local%3Aintake-normal?sessionId=" + encodeURIComponent(h.session.id));
    assert.equal(stored.status, 200);
    assert.equal(stored.json.content, "Saved by the Host.");
    assert.equal(resourceRow(h, "local:intake-normal")?.textContent.includes("Not exposed"), true);
  } finally {
    await h.close();
  }
}));

test("a successful banner retry keeps a new scoped draft and focus after a late Host receipt", () => withTinyDom(async body => {
  const h = await fixture(body);
  let hold;
  try {
    await startConflict(h, "scope");
    h.scopeTab("user").click();
    h.node("intake:instruction:toggle").click();
    h.fill("instruction", "id", "local:user-draft");
    h.fill("instruction", "title", "User-scope draft");
    h.fill("instruction", "content", "Keep this newer user-scope draft.");
    h.scopeTab("session").click();

    hold = h.armHold();
    h.bannerButton().click();
    const accepted = await hold.receipt;
    h.scopeTab("user").click();
    assert.equal(h.node("intake:instruction:content").value, "Keep this newer user-scope draft.");
    assert.equal(document.activeElement?.getAttribute("data-focus-key"), "scope:instructions:user");
    hold.release();
    await waitFor(() => h.view.summary().revision === accepted.revision);

    assert.equal(h.scopeTab("user").getAttribute("aria-selected"), "true", "the late Session receipt does not change the selected User scope");
    assert.equal(h.node("intake:instruction:title").value, "User-scope draft");
    assert.equal(h.node("intake:instruction:content").value, "Keep this newer user-scope draft.");
    assert.equal(document.activeElement?.getAttribute("data-focus-key"), "scope:instructions:user");
    assert.equal(h.notices.includes("Instruction scope saved. Exposure stays under its own control."), false, "an inactive scope receipt does not move focus or announce against the active draft");
  } finally {
    hold?.release();
    await h.close();
  }
}));

test("if a draft changes after conflict, the explicit retry saves the old reviewed value without clearing the newer edit", () => withTinyDom(async body => {
  const h = await fixture(body);
  try {
    await startConflict(h, "edited");
    h.fill("instruction", "content", "Newer, not-yet-reviewed instruction.");
    h.node("intake:instruction:content").focus();
    h.bannerButton().click();
    await waitFor(() => h.view.summary().revision > 1 && !h.bannerButton());

    const stored = await h.host.api("GET", "/runtime-resources/local%3Aintake-edited?sessionId=" + encodeURIComponent(h.session.id));
    assert.equal(stored.status, 200);
    assert.equal(stored.json.content, "Original reviewed instruction edited", "the explicitly submitted banner keeps its original reviewed body");
    assert.equal(h.node("intake:instruction:content").value, "Newer, not-yet-reviewed instruction.");
    assert.equal(h.node("intake:instruction:save"), undefined, "the later edit requires its own review");
    assert.equal(h.notices.includes("Instruction edited saved. Exposure stays under its own control."), false, "the stale receipt does not run the newer draft's save focus callback");
  } finally {
    await h.close();
  }
}));

test("a second CAS conflict retains the receipt callback for the next explicit retry", () => withTinyDom(async body => {
  const h = await fixture(body);
  try {
    await startConflict(h, "repeat");
    await addExternalRevision(h.host, h.session, "again");
    h.bannerButton().click();
    await waitFor(() => h.bannerButton() && !h.bannerButton().disabled && h.view.summary().revision >= 2);
    assert.ok(h.mounts.instructions.textContent.includes("Not saved. Your draft is kept here."));

    h.bannerButton().click();
    await waitFor(() => resourceRow(h, "local:intake-repeat"));
    assert.equal(h.node("intake:instruction:content"), undefined);
    assert.ok(h.notices.includes("Instruction repeat saved. Exposure stays under its own control."));
  } finally {
    await h.close();
  }
}));

test("a late retry receipt from a prior Session cannot replace or finalize the new Session intake", () => withTinyDom(async body => {
  const h = await fixture(body);
  let hold;
  try {
    await startConflict(h, "session");
    const nextSession = await h.host.createSession();
    hold = h.armHold();
    h.bannerButton().click();
    const accepted = await hold.receipt;
    assert.ok(accepted.resources.some(resource => resource.id === "local:intake-session"));

    h.setSession(nextSession.id);
    await h.view.load();
    assert.equal(h.view.summary().sessionId, nextSession.id);
    assert.equal(resourceRow(h, "local:intake-session"), undefined);
    hold.release();
    await waitFor(() => !h.view.summary().loaded || h.view.summary().sessionId === nextSession.id);
    await waitFor(() => !h.node("intake:skill:toggle")?.disabled);
    assert.equal(h.view.summary().sessionId, nextSession.id);
    assert.equal(resourceRow(h, "local:intake-session"), undefined);
    assert.equal(h.notices.includes("Instruction session saved. Exposure stays under its own control."), false);

    await h.setInstruction({ id: "local:new-session-draft", title: "New Session draft", content: "Belongs to the new Session." });
    assert.equal(h.node("intake:instruction:content").value, "Belongs to the new Session.");
    assert.ok(!h.view.summary().sessionId || h.view.summary().sessionId === nextSession.id);
  } finally {
    hold?.release();
    await h.close();
  }
}));

test("active-run guidance is visible in the real Tools and Skills Settings groups", () => withTinyDom(async body => {
  const h = await fixture(body);
  let runId = null;
  try {
    const started = await h.host.api("POST", "/sessions/" + encodeURIComponent(h.session.id) + "/runs", {
      commandId: "settings-active-run",
      input: h.host.scriptInput([{ name: "ask_user", arguments: { prompt: "Wait for review." } }]),
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    runId = started.json.run.id;
    await h.host.pollRun(runId, { until: status => status === "waiting_user" });
    await h.view.refresh();

    h.selectGroup("tools");
    assert.equal(h.panelFor("tools").hidden, false);
    assert.ok(h.mounts.capabilities.textContent.includes(ACTIVE_RUN_SENTENCE));
    assert.equal(h.node("intake:mcp_server:toggle", h.mounts.capabilities).disabled, true);
    assert.equal(h.node("switch:tool:ws_read", h.mounts.capabilities).disabled, true);

    h.selectGroup("skills");
    assert.equal(h.panelFor("skills").hidden, false);
    assert.ok(h.mounts.instructions.textContent.includes(ACTIVE_RUN_SENTENCE));
    assert.equal(h.node("intake:skill:toggle").disabled, true);
  } finally {
    if (runId) await h.host.api("POST", "/runs/" + encodeURIComponent(runId) + "/cancel", {});
    await h.close();
  }
}));

test("Tools and Skills keep the HTTP read cause and last confirmed revision visible", () => withTinyDom(async body => {
  const h = await fixture(body);
  const service = h.host.runtime.service;
  const originalGetRuntimeControl = service.getRuntimeControl;
  let failNextRead = true;
  service.getRuntimeControl = function (sessionId) {
    if (failNextRead && sessionId === h.session.id) {
      failNextRead = false;
      throw new ServiceError(503, "runtime_unavailable", "Settings fixture Runtime read is unavailable.");
    }
    return originalGetRuntimeControl.call(this, sessionId);
  };
  try {
    const confirmedRevision = h.view.summary().revision;
    h.selectGroup("tools");
    await h.view.refresh();

    for (const group of ["tools", "skills"]) {
      h.selectGroup(group);
      const mount = h.mountForGroup(group === "tools" ? "tools" : "skills");
      assert.equal(h.panelFor(group).hidden, false);
      assert.match(mount.textContent, /Settings fixture Runtime read is unavailable\./);
      assert.match(mount.textContent, new RegExp(`last snapshot the host confirmed, at revision ${confirmedRevision}`));
      assert.equal(mount.querySelectorAll("[data-stale]").length, 1, "the group has one copy of the retained-snapshot notice");
      assert.equal(h.view.summary().revision, confirmedRevision, "a failed read keeps the last accepted Host snapshot");
    }
  } finally {
    service.getRuntimeControl = originalGetRuntimeControl;
    await h.close();
  }
}));

test("the real Tools Settings group exposes its filtered CAS retry and applies it explicitly", () => withTinyDom(async body => {
  const h = await fixture(body);
  try {
    h.selectGroup("tools");
    h.scopeTab("session", "tools").click();
    const resourcePath = "/runtime-control?sessionId=" + encodeURIComponent(h.session.id);
    const before = (await h.host.api("GET", resourcePath)).json.resources.find(resource => resource.id === "tool:ws_read");
    const wantedExposure = !before.exposed;
    await addExternalRevision(h.host, h.session, "tools");

    const toggle = h.node("switch:tool:ws_read", h.mounts.capabilities);
    assert.ok(toggle && !toggle.disabled);
    toggle.checked = wantedExposure;
    toggle.dispatchEvent({ type: "change" });
    await waitFor(() => h.bannerButton("tools") && !h.bannerButton("tools").disabled);
    assert.equal(h.panelFor("tools").hidden, false);
    assert.ok(h.mounts.capabilities.textContent.includes("The runtime changed while you were editing."));
    assert.equal(h.bannerButton("skills"), undefined, "a Tools conflict is routed to Tools, not repeated per resource in Skills");

    const beforeRetry = h.view.summary().revision;
    h.bannerButton("tools").click();
    await waitFor(() => !h.bannerButton("tools") && h.view.summary().revision > beforeRetry);
    const after = (await h.host.api("GET", resourcePath)).json.resources.find(resource => resource.id === "tool:ws_read");
    assert.equal(after.exposed, wantedExposure);
  } finally {
    await h.close();
  }
}));
