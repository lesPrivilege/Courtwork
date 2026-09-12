import assert from "node:assert/strict";
import test from "node:test";
import { createMaterialsView } from "../web/materials-view.mjs";
import { createFileView, validateFilePayload } from "../web/inspector.mjs";
import { projectMarkdown, sha256Text } from "../web/markdown-source.mjs";
import { deferred, flush, waitFor, withTinyDom } from "./tiny-dom.mjs";

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

const retainedVersion = (revision, sha256) => ({
  revision, sha256, bytes: revision * 8, createdAt: "2026-09-13T00:00:00.000Z",
});

const retainedIdentity = (revision, sha256) => ({
  kind: "retained-source", sessionId: "session-1", sourceId: "source-1", revision,
  path: "materials/brief.md", sha256, bytes: revision * 8, representation: "original-utf8-v1",
});

async function openRetainedVersions(dom, view) {
  view.open();
  await waitFor(() => dom.list.querySelector("details.retained-source-entry"));
  const disclosure = dom.list.querySelector("details.retained-source-entry");
  disclosure.open = true;
  disclosure.dispatchEvent({ type: "toggle" });
  await waitFor(() => dom.list.querySelector("select.retained-compare-from"));
  return dom.list;
}

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

test("comparison requires two explicit retained revisions and renders the exact server diff", async () =>
  withTinyDom(async () => {
    const dom = makeMaterialsDom();
    const calls = [];
    const comparison = deferred();
    let workspaceCalls = 0;
    const versions = [retainedVersion(2, "b".repeat(64)), retainedVersion(1, "a".repeat(64))];
    const request = async (url, options = {}) => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) { workspaceCalls++; return { tree: [] }; }
      if (parsed.pathname.endsWith("/materials/compare")) {
        calls.push({ parsed, options });
        return comparison.promise;
      }
      if (parsed.pathname.endsWith("/materials") && parsed.searchParams.has("sourceId")) {
        return { sourceId: "source-1", name: "brief.md", path: "materials/brief.md", latestRevision: 2, coverage: "complete", limit: 200, versions };
      }
      if (parsed.pathname.endsWith("/materials")) return { sources: [source()], coverage: "complete", limit: 200 };
      throw new Error(`Unexpected request ${url}`);
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1" }), onOpenFile() {}, notify() {} });
    await openRetainedVersions(dom, view);
    const from = dom.list.querySelector("select.retained-compare-from");
    const to = dom.list.querySelector("select.retained-compare-to");
    let compare = dom.list.querySelector("button.retained-compare-button");
    assert.equal(from.value, "", "neither side is selected automatically");
    assert.equal(to.value, "", "neither side is selected automatically");
    assert.equal(compare.disabled, true);
    from.value = "1";
    from.dispatchEvent({ type: "change" });
    to.value = "2";
    to.dispatchEvent({ type: "change" });
    assert.equal(compare.disabled, false);
    dom.list.querySelector('button[aria-label="Refresh workspace files"]').click();
    await waitFor(() => workspaceCalls === 2);
    await flush();
    assert.equal(dom.list.querySelector("select.retained-compare-from").value, "1", "an unrelated workspace refresh preserves From");
    assert.equal(dom.list.querySelector("select.retained-compare-to").value, "2", "an unrelated workspace refresh preserves To");
    compare = dom.list.querySelector("button.retained-compare-button");
    compare.focus();
    compare.click();
    await waitFor(() => calls.length === 1);
    assert.equal(compare.disabled, false, "the pending action stays keyboard-focusable");
    assert.equal(compare.getAttribute("aria-disabled"), "true", "the pending action announces its busy state");
    const fromAfterRefresh = dom.list.querySelector("select.retained-compare-from");
    fromAfterRefresh.focus();
    comparison.resolve({
      sourceId: "source-1", path: "materials/brief.md",
      from: retainedIdentity(1, "a".repeat(64)), to: retainedIdentity(2, "b".repeat(64)),
      latestRetainedRevision: 3, status: "complete", identical: false,
      rows: [
        { kind: "del", text: "Old line", oldNo: 1, noNewline: true },
        { kind: "add", text: "New line", newNo: 1, noNewline: true },
      ],
      limits: { bytesPerVersion: 65536, linesPerVersion: 2000 },
    });
    await waitFor(() => dom.list.querySelector(".diff-view"));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].parsed.pathname, "/sessions/session-1/materials/compare");
    assert.deepEqual(Object.fromEntries(calls[0].parsed.searchParams.entries()), {
      sourceId: "source-1", fromRevision: "1", fromSha256: "a".repeat(64),
      toRevision: "2", toSha256: "b".repeat(64),
    });
    assert.match(dom.list.textContent, /revision 1 → revision 2/);
    assert.match(dom.list.textContent, /latest retained at comparison: revision 3/);
    assert.match(dom.list.textContent, /formal adoption is handled separately in Work Review/);
    assert.equal(compare.textContent, "Compare", "success clears the pending label");
    assert.equal(compare.getAttribute("aria-disabled"), null);
    assert.equal(document.activeElement, fromAfterRefresh, "completion does not steal focus after the user moves on");
    assert.equal(dom.list.querySelector(".diff-view").querySelectorAll("[data-diff]").length > 0, true);
    assert.equal(dom.list.textContent.includes("Accept"), false);
    assert.equal(dom.list.querySelectorAll("button.retained-version-open").length, 2);
    view.reset();
  })
);

test("limited source comparisons show the reason without partial diff, and failed comparisons can retry", async () =>
  withTinyDom(async () => {
    const dom = makeMaterialsDom();
    const versions = [retainedVersion(2, "b".repeat(64)), retainedVersion(1, "a".repeat(64))];
    const calls = [];
    const request = async url => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) return { tree: [] };
      if (parsed.pathname.endsWith("/materials/compare")) {
        calls.push(parsed);
        if (calls.length === 1) throw new Error("Temporary comparison failure");
        return {
          sourceId: "source-1", path: "materials/brief.md",
          from: retainedIdentity(1, "a".repeat(64)), to: retainedIdentity(2, "b".repeat(64)),
          latestRetainedRevision: 2, status: "limited", identical: false,
          reason: "These versions exceed the line comparison limit. Read either exact version separately.",
          rows: [], limits: { bytesPerVersion: 65536, linesPerVersion: 2000 },
        };
      }
      if (parsed.pathname.endsWith("/materials") && parsed.searchParams.has("sourceId"))
        return { sourceId: "source-1", name: "brief.md", path: "materials/brief.md", latestRevision: 2, coverage: "complete", limit: 200, versions };
      if (parsed.pathname.endsWith("/materials")) return { sources: [source()], coverage: "complete", limit: 200 };
      throw new Error(`Unexpected request ${url}`);
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1" }), onOpenFile() {}, notify() {} });
    await openRetainedVersions(dom, view);
    const from = dom.list.querySelector("select.retained-compare-from");
    const to = dom.list.querySelector("select.retained-compare-to");
    from.value = "1";
    from.dispatchEvent({ type: "change" });
    to.value = "2";
    to.dispatchEvent({ type: "change" });
    let compare = dom.list.querySelector("button.retained-compare-button");
    compare.click();
    await waitFor(() => dom.list.textContent.includes("Temporary comparison failure"));
    compare = dom.list.querySelector("button.retained-compare-button");
    assert.equal(compare.textContent, "Retry comparison");
    compare.click();
    await waitFor(() => dom.list.textContent.includes("These versions exceed the line comparison limit."));
    assert.equal(calls.length, 2);
    assert.equal(calls[0].search, calls[1].search, "retry keeps the selected exact identities");
    assert.equal(dom.list.querySelector(".diff-view"), null, "limited output never presents partial rows");
    assert.equal(dom.list.querySelectorAll("button.retained-version-open").length, 2, "exact version reading remains available");
    view.reset();
  })
);

test("file upload preserves BOM and CRLF bytes through a same-command retry", async () => {
  await withTinyDom(async () => {
    const dom = makeMaterialsDom();
    let displayedText = "";
    Object.defineProperty(dom.text, "value", {
      configurable: true,
      get: () => displayedText,
      set: value => { displayedText = String(value).replace(/\r\n?/g, "\n"); },
    });
    const originalText = "\uFEFFfirst line\r\nsecond line\r\n";
    const bytes = new TextEncoder().encode(originalText);
    let saved = false;
    const posts = [];
    const request = async (url, options = {}) => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) return { tree: [] };
      if (parsed.pathname.endsWith("/materials") && options.method === "POST") {
        posts.push(options.body);
        if (posts.length === 1) {
          const failure = new Error("link failed");
          failure.status = 503;
          failure.body = { error: { code: "material_link_failed" } };
          throw failure;
        }
        saved = true;
        return { path: "materials/notes.txt", retained: { revision: 1 }, workspaceState: "written" };
      }
      if (parsed.pathname.endsWith("/materials")) return {
        sources: saved ? [{ ...source(1), sourceId: "notes-source", name: "notes.txt", path: "materials/notes.txt" }] : [],
        coverage: "complete", limit: 200,
      };
      throw new Error(`Unexpected request ${url}`);
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1" }), onOpenFile() {}, notify() {} });
    view.open();
    await waitFor(() => dom.submit.disabled === false);
    dom.upload.files = [{ name: "notes.txt", size: bytes.byteLength, arrayBuffer: async () => bytes.buffer }];
    dom.upload.dispatchEvent({ type: "change" });
    await waitFor(() => dom.name.value === "notes.txt" && dom.text.value.includes("second line"));
    assert.equal(dom.text.value, "\uFEFFfirst line\nsecond line\n", "the textarea display may normalize line endings");
    dom.form.dispatchEvent({ type: "submit" });
    await waitFor(() => dom.error.textContent.includes("same-command retry"));
    dom.form.dispatchEvent({ type: "submit" });
    await waitFor(() => posts.length === 2 && saved && dom.list.textContent.includes("notes.txt"));
    assert.equal(posts[0].text, originalText);
    assert.equal(posts[1].text, originalText);
    assert.equal(posts[0].commandId, posts[1].commandId);
    assert.equal(document.activeElement, dom.list.querySelector("details.retained-source-entry").querySelector("summary"), "successful save returns focus to the new source summary");
    view.reset();
  });
});

test("a rejected file read from an old session cannot write an error into the new session", async () => {
  await withTinyDom(async () => {
    const dom = makeMaterialsDom();
    const read = deferred();
    let session = { id: "session-1", title: "First" };
    const request = async url => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) return { tree: [] };
      if (parsed.pathname.endsWith("/materials")) return { sources: [], coverage: "complete", limit: 200 };
      throw new Error(`Unexpected request ${url}`);
    };
    const view = createMaterialsView({ request, getSession: () => session, onOpenFile() {}, notify() {} });
    view.open();
    await waitFor(() => dom.submit.disabled === false);
    dom.upload.files = [{ name: "stale.txt", size: 4, arrayBuffer: () => read.promise }];
    dom.upload.dispatchEvent({ type: "change" });
    session = { id: "session-2", title: "Second" };
    view.open();
    await waitFor(() => dom.list.textContent.includes("Retained uploads · 0"));
    read.reject(new Error("old file read failed"));
    await flush();
    assert.equal(dom.error.hidden, true);
    assert.equal(dom.error.textContent, "");
    assert.equal(dom.name.value, "");
    assert.equal(dom.text.value, "");
    view.reset();
  });
});

test("explicit retained refresh restores only its own focused button", async () => {
  await withTinyDom(async () => {
    const dom = makeMaterialsDom();
    dom.dialog.open = true;
    let sourceCalls = 0;
    const request = async url => {
      const parsed = new URL(url, "http://courtwork.test");
      if (parsed.pathname.endsWith("/workspace")) return { tree: [] };
      if (parsed.pathname.endsWith("/materials")) {
        sourceCalls++;
        return { sources: [], coverage: "complete", limit: 200 };
      }
      throw new Error(`Unexpected request ${url}`);
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1" }), onOpenFile() {}, notify() {} });
    view.open();
    await waitFor(() => dom.submit.disabled === false);
    let refresh = dom.list.querySelector('button[aria-label="Refresh retained uploads"]');
    refresh.focus();
    refresh.click();
    await waitFor(() => sourceCalls === 2);
    await flush();
    refresh = dom.list.querySelector('button[aria-label="Refresh retained uploads"]');
    assert.equal(document.activeElement, refresh, "the replacement refresh control regains focus after its own request");

    refresh.focus();
    refresh.click();
    dom.submit.focus();
    await waitFor(() => sourceCalls === 3);
    await flush();
    assert.equal(document.activeElement, dom.submit, "refresh completion leaves a later user focus move alone");
    view.reset();
  });
});

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
