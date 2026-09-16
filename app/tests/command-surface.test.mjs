import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { withTinyDom } from "./tiny-dom.mjs";

const root = new URL("../../", import.meta.url).pathname;

test("CMD-01 · the status card states Host facts only, in the shared card anatomy", async () => {
  await withTinyDom(async () => {
    const { renderCommandResult, statusRows } = await import("../web/command-result.mjs");
    const facts = {
      model: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", reasoningEffort: null, configVersion: 3, localTest: true },
      fileAccess: "ask", workspace: { rootPath: "/w/parcel", revision: 2 }, privateCandidate: { baseCommit: "abcdef0123456789", writeRevision: 1 },
      runtime: { revision: 4, exposedTools: 9, context: 2 }, runs: { count: 3, last: { id: "r", status: "completed", endedAt: "t" } },
      activeRun: false, compaction: { available: false, reason: "Compaction needs a known context window on the configured model." },
    };
    const rows = statusRows(facts);
    assert.deepEqual(rows.map(([k]) => k), ["Model", "Reasoning effort", "File access", "Workspace", "Private candidate", "Runtime", "Runs", "Compaction"]);
    assert.equal(rows[0][1], "Local test");
    assert.equal(rows[1][1], "Provider default");
    assert.equal(rows[4][1], "from abcdef012345 · 1 write");
    assert.equal(rows[5][1], "revision 4 · 9 exposed tools · 2 context items");
    assert.equal(rows[7][1], "Compaction needs a known context window on the configured model.");
    const container = document.createElement("div");
    let closed = 0;
    const header = renderCommandResult(container, { kind: "read", command: "status", facts }, { onClose: () => { closed++; } });
    assert.equal(container.querySelector("h3")?.textContent, "/status");
    assert.equal(container.querySelectorAll("dt").length, 8);
    assert.ok(container.textContent.includes("Read from the Host. No model request."));
    const close = header.querySelector("button");
    await close.dispatchEvent({ type: "click", target: close });
    assert.equal(closed, 1);

    renderCommandResult(container, { kind: "read", command: "tools", facts: { revision: 4, tools: [{ id: "tool:ws_read", name: "ws_read", exposed: true, permission: "allow" }, { id: "tool:repo_write", name: "repo_write", exposed: false, permission: null }] } }, { onClose() {} });
    assert.equal(container.querySelector("h4")?.textContent, "Tools · 1 of 2 exposed");
    assert.equal(container.querySelectorAll(".command-tool").length, 2);
    assert.equal(container.querySelectorAll(".command-tool.is-unavailable").length, 1);
  });
});

test("CMD-01 · composer wiring: a leading slash goes to the Host first; refusals keep the draft; handled commands clear it; nothing keeps a second command list", () => {
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  const server = readFileSync(`${root}app/server/index.mjs`, "utf8");
  assert.match(app, /if \(input\.startsWith\("\/"\)\) \{\s*const read = await readComposerCommand\(session, input\);\s*if \(read\.handled\) return;/, "the Host reads the slash before any Run");
  assert.match(app, /request\(`\/sessions\/\$\{encodeURIComponent\(sessionId\)\}\/commands`, \{\s*method: "POST", body: \{ text,/, "the whole message is sent, not a client-side parse");
  assert.match(app, /code === "unknown_command" \? `Unknown command \/\$\{name\}\. To send it as text, start with \/\/\$\{name\}\.`/, "an unknown command names the escape and keeps the draft");
  assert.match(app, /if \(result\.kind === "literal"\) return \{ handled: false, text: result\.text \};/, "a literal continues as an ordinary message with the unescaped text");
  assert.match(app, /if \(result\.kind === "client_ui"\) \{ if \(result\.target === "model-picker"\) void modelPicker\.open\(\);/, "/model reuses the picker");
  assert.match(app, /if \(result\.kind === "control" && result\.operation\) \{ void followCompaction\(sessionId, opId, result\.operation\);/, "/compact follows the Host operation");
  assert.match(app, /const FEEDBACK_CATEGORY_ORDER = \["run", "cancel", "draft", "command"\];/);
  assert.match(app, /commandMenu = createCommandMenu\(\{\s*textarea: \$\("composer-input"\), container: \$\("command-menu"\), request,/, "the menu is the Host catalog's projection");
  assert.doesNotMatch(app, /const COMMANDS = \[|SLASH_COMMANDS|commandList = \[/, "no client-side command array");
  assert.match(html, /id="command-menu" class="command-menu" hidden/);
  assert.match(html, /id="command-popover"\s+class="context-popover connection-popover command-popover"\s+popover="auto"/);
  assert.match(server, /"command-result\.mjs"/);
});
