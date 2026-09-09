/* FE-03 · Chat / Work / Memory shell（WK-92）。只测本单新增的判断：
 * (1) Chat 与 Work 是同一个会话的两种模式，判断只读既有的 `extensionBinding`；
 * (2) Continue in Work 走既有的 `POST /sessions/:id/extension`，没有新端点、
 *     没有复制、没有迁移；
 * (3) scope 位在 BE-19 前只是一句陈述：无 popover、无控件（CC-W / M-2 之后它在
 *     工作面的标题带上，不在会话 meta 行上）；
 * (4) Settings › Memory 不用 `Session Memory` 一词，Sources ≠ Memory，
 *     Temporary chat（BE-20）只有一行说明。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  sessionMode,
  sessionModeLabel,
  SESSION_MODE_LABELS,
  MEMORY_SCOPE_OFF,
} from "../web/ui-controls.mjs";

const root = new URL("../../", import.meta.url).pathname;
const appSource = readFileSync(`${root}app/web/app.mjs`, "utf8");
const settingsSource = readFileSync(`${root}app/web/settings-view.mjs`, "utf8");
const styles = readFileSync(`${root}app/web/styles.css`, "utf8");

test("WK-92 · Chat 与 Work 由既有的 extensionBinding 分开，不由新状态分开", () => {
  assert.equal(sessionMode({ extensionBinding: null }), "chat");
  assert.equal(sessionMode({ extensionBinding: { extensionId: "inbound-nda", binding: { matterId: "m" } } }), "work");
  // 没有 workspace、没有项目文件夹的会话仍然是 Chat：绑定才是那条界线。
  assert.equal(sessionMode({ extensionBinding: null, workspaceDir: null, projectId: null }), "chat");
  assert.equal(sessionMode(null), "chat");
  assert.equal(sessionMode(undefined), "chat");
  assert.equal(sessionModeLabel({ extensionBinding: null }), "Chat");
  assert.equal(sessionModeLabel({ extensionBinding: {} }), "Work");
  assert.deepEqual(SESSION_MODE_LABELS, { chat: "Chat", work: "Work" });
});

test("WK-92 · Continue in Work 只走既有的 extension 路由；不新增端点、不复制、不迁移", () => {
  // 界面上这个动作的名字是产品词，不是"绑定"。
  assert.match(appSource, /text: "Continue in Work"/);
  assert.doesNotMatch(appSource, /text: "Bind to chat"/);
  assert.doesNotMatch(appSource, /text: "Create binding"/);
  // 唯一的写入路径仍是 POST /sessions/:id/extension，且既有 / 新建两条都用它。
  const extensionPosts = appSource.match(/\/sessions\/\$\{encodeURIComponent\((?:session|sessionId)\.id\)\}\/extension/g) || [];
  assert.equal(extensionPosts.length, 3, "新建、续用既有 Matter、Release 三处，没有第四条路径");
  assert.match(appSource, /body: \{ extensionId: extension\.id, input: \{ existingMatterId: matterId \} \}/);
  // 没有任何复制 / 迁移端点被发明出来。
  for (const invented of ["/sessions/copy", "/matters/migrate", "convertToWork", "/chat-to-work"])
    assert.doesNotMatch(appSource, new RegExp(invented.replace(/[/]/g, "\\/")), invented);
});

/* CC-W（M-2 / WK-113 ③）· scope 位从会话 meta 行搬到工作面的标题带。断言随位置
 * 改写：它仍然只在 Work 上出现、仍然只有一个值、仍然零控件，检查的条目一条没减，
 * 只是换了它现在所在的那一段。 */
test("WK-92 / M-2 · scope 位在工作面标题带上，仍是陈述而不是控件", () => {
  assert.equal(MEMORY_SCOPE_OFF, "Memory · Off");
  // 会话 meta 行上不再画它。
  const meta = appSource.slice(
    appSource.indexOf('const meta = $("session-meta")'),
    appSource.indexOf('$("show-surface-button")'),
  );
  assert(!meta.includes("session-scope"), "scope 位还留在会话 meta 行上");
  assert(!meta.includes("MEMORY_SCOPE_OFF"), "scope 位还留在会话 meta 行上");
  // 它现在由工作面标题带画，只在 Work 会话、只在这条带真的在屏幕上时。
  const scopeFn = appSource.slice(
    appSource.indexOf("function renderSurfaceScope"),
    appSource.indexOf("function surfaceKindTitle"),
  );
  assert(scopeFn.includes('sessionMode(session) === "work"'), "只在 Work 上");
  assert(scopeFn.includes("MEMORY_SCOPE_OFF"), "仍然只有一个值");
  assert(scopeFn.includes("expanded"), "带不在屏幕上时不画");
  // 没有 popover、没有按钮、没有 caret 挂在它身上。
  for (const affordance of [
    "popover",
    "aria-haspopup",
    "chevron",
    "addEventListener",
    "button",
  ])
    assert(!scopeFn.includes(affordance), affordance);
  assert.doesNotMatch(styles, /\.session-scope[^{]*\{[^}]*cursor:\s*pointer/);
  // 模式词与 scope 位没有独立的背景 / 边框：它们是句子，不是徽章。
  const scopeRule = styles.match(/\.session-mode,\s*\n\.session-scope \{[^}]*\}/);
  assert(scopeRule, "两者共用一条规则");
  assert.doesNotMatch(scopeRule[0], /background|border/);
  const surfaceRule = styles.match(/\.surface-scope \{[^}]*\}/);
  assert(surfaceRule, "工作面上的那一份也有自己的规则");
  assert.doesNotMatch(surfaceRule[0], /background|border/);
});

test("WK-92 / §4 · Memory 组：不用 Session Memory，Sources ≠ Memory，Temporary chat 零控件", () => {
  assert.doesNotMatch(settingsSource, /Session Memory/i);
  const memory = settingsSource.slice(settingsSource.indexOf("function renderMemory"));
  const block = memory.slice(0, memory.indexOf("/* ── Keyboard"));
  assert.match(block, /Matter memory and global memory have no adapter/);
  assert.match(block, /Sources are files, not memory/);
  assert.match(block, /Temporary chat/);
  // 一行说明，不是一个开关：这一段里没有任何可聚焦的东西。
  for (const control of ['el("button"', 'el("input"', 'el("select"', "segmented("])
    assert(!block.includes(control), control);
});

test("WK-92 · 导航只对 Work 加一个标记，Chat 是默认的那一种", () => {
  assert.match(appSource, /sessionMode\(session\) === "work"\s*\?\s*element\("span", \{ className: "session-mode-tag", text: "Work" \}\)\s*:\s*null/);
  assert.match(styles, /\.session-line \{/);
});
