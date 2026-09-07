import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
const source = (
  await readFile(new URL("../../app/web/app.mjs", import.meta.url), "utf8")
)
  .replace(/^import[\s\S]*?from ["'][^"']+["'];\n/gm, "")
  .replace("void init();", "");
function fixture(responder) {
  const calls = [],
    stored = [];
  const sandbox = {
    AbortController,
    console,
    window: {
      matchMedia: () => ({ matches: false }),
      sessionStorage: {
        setItem: (key, value) => stored.push(JSON.parse(value)),
      },
    },
    requestStub: async (path, options) => {
      calls.push({ path, options });
      return responder(path, options);
    },
  };
  vm.runInNewContext(
    source +
      `
 request=requestStub;renderComposer=()=>{};renderFeedback=()=>{};renderInspector=()=>{};refreshActiveSession=async()=>{};schedulePolling=()=>{};
 state.activeSessionId='s';state.session={id:'s'};
 state.draftCache.set('s','a newer unsent draft');
 state.unconfirmedRuns.set('s',{operationId:'op',sessionId:'s',commandId:'original-command',input:'original instruction'});
 window.api={state,recoverRunReceipt,submitRun};`,
    sandbox,
  );
  return { ...sandbox.window.api, calls, stored };
}
const receipt = {
  run: {
    id: "r",
    sessionId: "s",
    commandId: "original-command",
    status: "completed",
  },
};
test("an unresolved command blocks fresh Send; recovery reuses exact input and command ID", async () => {
  const f = fixture(() => receipt);
  await f.submitRun({ preventDefault() {} });
  assert.equal(f.calls.length, 0);
  await f.recoverRunReceipt();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].options.body.commandId, "original-command");
  assert.equal(f.calls[0].options.body.input, "original instruction");
  assert.equal(f.state.unconfirmedRuns.size, 0);
  assert.equal(f.state.draftCache.get("s"), "a newer unsent draft");
  assert.equal(f.state.runs[0].id, "r");
});
test("two recovery clicks admit only one request and late receipt cannot replace another session", async () => {
  let finish;
  const f = fixture(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = f.recoverRunReceipt();
  await f.recoverRunReceipt();
  assert.equal(f.calls.length, 1);
  f.state.activeSessionId = "other";
  f.state.session = { id: "other" };
  f.state.runs = [{ id: "other-run", sessionId: "other" }];
  finish(receipt);
  await pending;
  assert.equal(f.state.activeSessionId, "other");
  assert.equal(f.state.runs[0].id, "other-run");
  assert.equal(f.state.unconfirmedRuns.size, 0);
});
test("a failed or mismatched receipt preserves recovery obligation and newer draft", async () => {
  for (const responder of [
    () => {
      throw new Error("offline");
    },
    () => ({ run: { ...receipt.run, sessionId: "wrong" } }),
  ]) {
    const f = fixture(responder);
    await f.recoverRunReceipt();
    assert.equal(
      f.state.unconfirmedRuns.get("s").commandId,
      "original-command",
    );
    assert.equal(f.state.pendingRuns.size, 0);
    assert.equal(f.state.draftCache.get("s"), "a newer unsent draft");
    assert.equal(
      f.state.feedback.get("s").persistent.run.nextAction,
      "retry-run",
    );
  }
});

test("expired runtime token retries only a router-rejected request, once", async () => {
  const calls = [];
  let attempt = 0;
  const sandbox = {
    AbortController,
    window: { matchMedia: () => ({ matches: false }) },
    fetch: async (url, init) => {
      calls.push({ url, body: init.body, token: init.headers["X-Work-Token"] });
      if (url.endsWith("/bootstrap"))
        return {
          ok: true,
          status: 200,
          json: async () => ({ sessionToken: "new-token" }),
        };
      if (attempt++ === 0)
        return {
          ok: false,
          status: 401,
          json: async () => ({
            error: { code: "unauthorized", message: "work token is required" },
          }),
        };
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    },
  };
  vm.runInNewContext(
    source + `state.token='old-token';window.request=request;`,
    sandbox,
  );
  await sandbox.window.request("/projects", {
    method: "POST",
    body: { name: "test" },
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].body, calls[2].body);
  assert.equal(calls[2].token, "new-token");
});
test("transport uncertainty and server errors are never automatically replayed", async () => {
  for (const failure of ["network", "server"]) {
    let count = 0;
    const sandbox = {
      AbortController,
      window: { matchMedia: () => ({ matches: false }) },
      fetch: async () => {
        count++;
        if (failure === "network") throw new Error("offline");
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: { message: "unavailable" } }),
        };
      },
    };
    vm.runInNewContext(source + `window.request=request;`, sandbox);
    await assert.rejects(
      sandbox.window.request("/projects", {
        method: "POST",
        body: { name: "test" },
      }),
    );
    assert.equal(count, 1);
  }
});
