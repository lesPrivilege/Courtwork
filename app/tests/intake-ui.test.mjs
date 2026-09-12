import assert from "node:assert/strict";
import test from "node:test";
import { createMaterialsView } from "../web/materials-view.mjs";
import { createFileView, validateFilePayload } from "../web/inspector.mjs";
import { projectMarkdown, sha256Text } from "../web/markdown-source.mjs";
import { flush, waitFor, withTinyDom } from "./tiny-dom.mjs";

function makeMaterialsDom() {
  const nodes = new Map();
  document.getElementById = id => nodes.get(id) ?? null;
  const make = (id, tag = "div") => {
    const node = document.createElement(tag);
    nodes.set(id, node);
    return node;
  };
  const dialog = make("materials-dialog", "dialog");
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; };
  return {
    dialog,
    list: make("workspace-files"),
    form: make("material-form", "form"),
    error: make("material-error", "p"),
    name: make("material-name", "input"),
    text: make("material-text", "textarea"),
    submit: make("material-submit", "button"),
    upload: make("material-upload", "input"),
    add: make("material-add", "details"),
    title: make("materials-session-title", "p"),
  };
}

const source = (latestRevision = 2) => ({
  sourceId: "source-1", name: "brief.md", path: "materials/brief.md",
  createdAt: "2026-09-13T00:00:00.000Z", latestRevision,
});

test("retained uploads stay separate, fetch versions on disclosure, and return focus to the exact row", async () =>
  withTinyDom(async () => {
    const dom = makeMaterialsDom();
    let detailCalls = 0;
    const opened = [];
    const request = async url => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) return { tree: [{ path: "materials/brief.md", bytes: 5 }] };
      if (parsed.pathname.endsWith("/materials") && parsed.searchParams.has("sourceId")) {
        detailCalls++;
        return {
          sourceId: "source-1", name: "brief.md", path: "materials/brief.md", latestRevision: 2,
          coverage: "complete", limit: 200,
          versions: [
            { revision: 2, sha256: "b".repeat(64), bytes: 12, createdAt: "2026-09-13T00:00:00.000Z" },
            { revision: 1, sha256: "a".repeat(64), bytes: 8, createdAt: "2026-09-12T00:00:00.000Z" },
          ],
        };
      }
      if (parsed.pathname.endsWith("/materials")) return { sources: [source()], coverage: "complete", limit: 200 };
      throw new Error(`Unexpected request ${url}`);
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1", title: "Chat" }), onOpenFile: (...args) => opened.push(args), notify() {} });
    view.open();
    await waitFor(() => dom.list.textContent.includes("Workspace files · 1") && dom.list.textContent.includes("Retained uploads · 1"));
    assert.equal(detailCalls, 0, "versions stay unloaded until disclosure");
    assert.match(dom.list.textContent, /brief\.md/);
    assert.match(dom.list.textContent, /Latest retained revision 2/);
    const disclosure = dom.list.querySelector("details.retained-source-entry");
    disclosure.open = true;
    disclosure.dispatchEvent({ type: "toggle" });
    await waitFor(() => dom.list.querySelector("button.retained-version-open"));
    assert.equal(detailCalls, 1);
    assert.deepEqual([...dom.list.querySelectorAll("button.retained-version-open")].map(button => button.textContent.includes("Revision 2")), [true, false]);

    dom.list.scrollTop = 64;
    const latest = dom.list.querySelector("button.retained-version-open");
    latest.click();
    assert.equal(opened.length, 1);
    assert.equal(opened[0][0].kind, "retained-source");
    assert.equal(opened[0][0].sourceId, "source-1");
    assert.equal(opened[0][0].revision, 2);
    assert.equal(opened[0][0].sha256, "b".repeat(64));
    assert.equal(opened[0][1], latest, "the exact row is passed as the Inspector opener");
    assert.equal(dom.dialog.open, false);
    assert.equal(view.returnFromFile(), true);
    assert.equal(dom.dialog.open, true);
    assert.equal(dom.list.scrollTop, 64);
    assert.equal(document.activeElement, latest);
    assert.equal(view.discardFileReturn(), false, "a consumed return target is cleared");
    view.reset();
  })
);

test("503 preserves the exact draft and command for retry; editing the draft gets a new command", async () => {
  await withTinyDom(async () => {
    const dom = makeMaterialsDom();
    let latestRevision = 2;
    const posts = [];
    const request = async (url, options = {}) => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) return { tree: [] };
      if (parsed.pathname.endsWith("/materials") && options.method === "POST") {
        posts.push(options.body);
        if (posts.length === 1) {
          latestRevision = 3;
          const error = new Error("link failed");
          error.status = 503;
          error.body = { error: { code: "material_link_failed", details: { commandId: options.body.commandId } } };
          throw error;
        }
        return { path: "materials/brief.md", retained: { revision: 4 }, workspaceState: "written" };
      }
      if (parsed.pathname.endsWith("/materials")) return { sources: [source(latestRevision)], coverage: "complete", limit: 200 };
      throw new Error(`Unexpected request ${url}`);
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1" }), onOpenFile() {}, notify() {} });
    view.open();
    await waitFor(() => dom.submit.disabled === false);
    dom.name.value = "brief.md";
    dom.text.value = "Exact draft";
    dom.name.dispatchEvent({ type: "input" });
    dom.text.dispatchEvent({ type: "input" });
    dom.form.dispatchEvent({ type: "submit" });
    await waitFor(() => posts.length === 1);
    await waitFor(() => dom.error.textContent.includes("same-command retry"));
    assert.equal(dom.name.value, "brief.md");
    assert.equal(dom.text.value, "Exact draft");
    await waitFor(() => dom.submit.disabled === false);
    assert.equal(dom.submit.textContent, "Retry retained upload");

    dom.form.dispatchEvent({ type: "submit" });
    await waitFor(() => posts.length === 2);
    assert.equal(posts[1].commandId, posts[0].commandId);
    assert.equal(posts[1].expectedRevision, posts[0].expectedRevision);
    await waitFor(() => dom.name.value === "");
    assert.equal(dom.text.value, "");
    view.reset();
  });

  await withTinyDom(async () => {
    const dom = makeMaterialsDom();
    let latestRevision = 2;
    const posts = [];
    const request = async (url, options = {}) => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) return { tree: [] };
      if (parsed.pathname.endsWith("/materials") && options.method === "POST") {
        posts.push(options.body);
        if (posts.length === 1) {
          latestRevision = 3;
          const error = new Error("link failed");
          error.status = 503;
          error.body = { error: { code: "material_link_failed" } };
          throw error;
        }
        return { path: "materials/brief.md", retained: { revision: 4 }, workspaceState: "written" };
      }
      if (parsed.pathname.endsWith("/materials")) return { sources: [source(latestRevision)], coverage: "complete", limit: 200 };
      throw new Error(`Unexpected request ${url}`);
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1" }), onOpenFile() {}, notify() {} });
    view.open();
    await waitFor(() => dom.submit.disabled === false);
    dom.name.value = "brief.md";
    dom.text.value = "Original draft";
    dom.name.dispatchEvent({ type: "input" });
    dom.text.dispatchEvent({ type: "input" });
    dom.form.dispatchEvent({ type: "submit" });
    await waitFor(() => posts.length === 1 && dom.error.textContent.includes("same-command retry"));
    dom.text.value = "Edited draft";
    dom.text.dispatchEvent({ type: "input" });
    await waitFor(() => dom.submit.disabled === false);
    dom.form.dispatchEvent({ type: "submit" });
    await waitFor(() => posts.length === 2);
    assert.notEqual(posts[1].commandId, posts[0].commandId);
    assert.equal(posts[1].expectedRevision, 3);
    assert.equal(posts[1].text, "Edited draft");
    view.reset();
  });
});

test("409 refresh requires opening the changed version before a new replacement is submitted", async () =>
  withTinyDom(async () => {
    const dom = makeMaterialsDom();
    let latestRevision = 2;
    const posts = [];
    const request = async (url, options = {}) => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) return { tree: [] };
      if (parsed.pathname.endsWith("/materials") && options.method === "POST") {
        posts.push(options.body);
        if (posts.length === 1) {
          latestRevision = 3;
          const error = new Error("source changed");
          error.status = 409;
          error.body = { error: { code: "source_revision_conflict" } };
          throw error;
        }
        return { path: "materials/brief.md", retained: { revision: 4 }, workspaceState: "written" };
      }
      if (parsed.pathname.endsWith("/materials") && parsed.searchParams.has("sourceId")) {
        return {
          sourceId: "source-1", name: "brief.md", path: "materials/brief.md", latestRevision,
          coverage: "complete", limit: 200,
          versions: [{ revision: latestRevision, sha256: "c".repeat(64), bytes: 12, createdAt: "2026-09-13T00:00:00.000Z" }],
        };
      }
      if (parsed.pathname.endsWith("/materials")) return { sources: [source(latestRevision)], coverage: "complete", limit: 200 };
      throw new Error(`Unexpected request ${url}`);
    };
    const opened = [];
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1" }), onOpenFile: (...args) => opened.push(args), notify() {} });
    view.open();
    await waitFor(() => dom.submit.disabled === false);
    dom.name.value = "brief.md";
    dom.text.value = "Updated text";
    dom.name.dispatchEvent({ type: "input" });
    dom.text.dispatchEvent({ type: "input" });
    dom.form.dispatchEvent({ type: "submit" });
    await waitFor(() => dom.error.querySelector("button")?.textContent === "Refresh uploads");
    assert.equal(dom.submit.disabled, true);
    assert.equal(dom.text.value, "Updated text");

    dom.error.querySelector("button").click();
    await waitFor(() => dom.list.querySelector("button.retained-version-open"));
    assert.equal(dom.submit.disabled, true, "refresh alone does not retry the write");
    assert.match(dom.list.textContent, /Open revision 3 in File Inspector/);
    const latest = [...dom.list.querySelectorAll("button.retained-version-open")]
      .find(button => button.dataset.focusKey === "retained-version:source-1:3");
    assert.ok(latest);
    latest.click();
    assert.equal(opened[0][0].revision, 3);
    assert.equal(dom.submit.disabled, false, "opening the latest exact revision enables explicit resubmission");
    assert.equal(view.returnFromFile(), true);
    assert.equal(document.activeElement, latest);
    dom.form.dispatchEvent({ type: "submit" });
    await waitFor(() => posts.length === 2);
    assert.equal(posts[0].expectedRevision, 2);
    assert.equal(posts[1].expectedRevision, 3);
    assert.notEqual(posts[0].commandId, posts[1].commandId);
    view.reset();
  })
);

test("Inspector opens retained UTF-8 at an exact revision and validates full text identity", async () =>
  withTinyDom(async container => {
    const body = "# Retained upload\n\nExact text 😀\n";
    const digest = await sha256Text(body);
    const ref = {
      kind: "retained-source", sessionId: "session-1", sourceId: "source-1",
      revision: 2, path: "materials/brief.txt", sha256: digest,
      bytes: new TextEncoder().encode(body).length,
    };
    const calls = [];
    const quotes = [];
    const request = async url => {
      calls.push(url);
      return { ...ref, text: body, truncated: false, createdAt: "2026-09-13T00:00:00.000Z", representation: "original-utf8-v1" };
    };
    const view = createFileView(container, { request, onQuote: quote => quotes.push(quote) });
    await view.load(ref);
    assert.match(calls[0], /\/sessions\/session-1\/materials\/file\?/);
    assert.match(calls[0], /sourceId=source-1/);
    assert.match(calls[0], /revision=2/);
    assert.match(container.textContent, /Retained upload · revision 2/);
    assert.match(container.textContent, /Workspace currency and Core adoption are not recorded here/);
    container.querySelector("button.text-button").click();
    assert.equal(quotes[0].ref.revision, 2);
    assert.equal(quotes[0].text, body);

    await assert.rejects(validateFilePayload(ref, { ...ref, text: body.replace("Exact", "Other"), truncated: false }), /exact version/);
    const markdown = await projectMarkdown(body, ref);
    assert.equal(markdown.identity.sourceId, "source-1");
    assert.equal(markdown.identity.revision, 2);
    await assert.rejects(projectMarkdown(body, { ...ref, sourceId: "", kind: "retained-source" }), error => error.code === "invalid_identity");
    view.dispose();
  })
);
