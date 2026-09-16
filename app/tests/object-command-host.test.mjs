import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { test } from "node:test";
import { boot } from "./helpers.mjs";

test("09 · the two real Chat commands: rename through PATCH and delete through DELETE, each with its refusals", async () => {
  const h = await boot();
  try {
    const project = (await h.api("POST", "/projects", { name: "Commands" })).json.project;
    const created = await h.api("POST", "/sessions", { projectId: project.id, title: "Before" });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const id = created.json.session.id;
    const renamed = await h.api("PATCH", `/sessions/${id}`, { title: "After" });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.json));
    assert.equal(renamed.json.session.title, "After");
    assert.equal((await h.api("GET", `/sessions/${id}`)).json.session.title, "After", "the rename is the record, not a label");
    assert.equal((await h.api("PATCH", `/sessions/${id}`, { title: "   " })).status, 400);
    assert.equal((await h.api("PATCH", `/sessions/${id}`, { title: "x", extra: 1 })).status, 400, "unknown fields are refused");
    assert.equal((await h.api("PATCH", "/sessions/00000000-0000-4000-8000-000000000000", { title: "x" })).status, 404);
    const deleted = await h.api("DELETE", `/sessions/${id}`);
    assert.equal(deleted.status, 200, JSON.stringify(deleted.json));
    assert.equal(deleted.json.deleted, true);
    assert.equal(deleted.json.workspaceRetained, true, "the Host says what it keeps");
    assert.equal((await h.api("GET", `/sessions/${id}`)).status, 404);
    assert.equal((await h.api("DELETE", `/sessions/${id}`)).status, 404, "a second delete is not idempotent success");
    assert.ok(!(await h.api("GET", `/sessions?projectId=${project.id}`)).json.sessions.some((s) => s.id === id));
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
