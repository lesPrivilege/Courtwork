/* FE-03 · Chat / Work / Memory shell（WK-92）。只测本单新增的判断：
 * (1) Chat 与 Work 是同一个会话的两种模式，判断只读既有的 `extensionBinding`；
 * (2) Continue in Work 走既有的 `POST /sessions/:id/extension`，没有新端点、
 *     没有复制、没有迁移；
 * (3) Matter header 的 scope 位在 BE-19 前只是一句陈述：无 popover、无控件；
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

test("WK-92 · Matter header 的 scope 位是陈述，不是控件", () => {
  assert.equal(MEMORY_SCOPE_OFF, "Memory · Off");
  // 只在 Work 上出现，且只画一个 span。
  assert.match(
    appSource,
    /sessionMode\(session\) === "work"\s*\)?\s*[\s\S]{0,160}className: "session-scope", text: MEMORY_SCOPE_OFF/,
  );
  // 没有 popover、没有按钮、没有 caret 挂在它身上。
  /* CC-S · 取的是画这条 meta 行的那一段，而不是整个 renderChatHeader：WK-116 之后
   * 这个函数还负责隐藏侧栏与它的开合按钮，函数级的字符串扫描会把那些 id 里的
   * "button" 当成挂在 scope 位上的控件。 */
  const header = appSource.slice(
    appSource.indexOf("const meta = $(\"session-meta\")"),
    appSource.indexOf("$(\"show-surface-button\")"),
  );
  assert(header.includes("session-scope"), "scope 位在这段里");
  for (const affordance of ["popover", "aria-haspopup", "chevron", "addEventListener", "button"])
    assert(!header.includes(affordance), affordance);
  assert.doesNotMatch(styles, /\.session-scope[^{]*\{[^}]*cursor:\s*pointer/);
  // 模式词与 scope 位没有独立的背景 / 边框：它们是句子，不是徽章。
  const scopeRule = styles.match(/\.session-mode,\s*\n\.session-scope \{[^}]*\}/);
  assert(scopeRule, "两者共用一条规则");
  assert.doesNotMatch(scopeRule[0], /background|border/);
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
