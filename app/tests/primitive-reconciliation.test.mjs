/* FE-04 · Primitive reconciliation（WK-93）。台账 [ex-wk8-primitive-ledger] 的
 * 十一个 primitive 里，本单只改了一条不变量的落实情况，所以这里只测那一条，外加
 * 两条被台账点名为「待核实」而审计后判定为「已对齐」的粒度：
 *
 * (1) **在途请求是第三类事实**（FN-19，review-projection §6）。授权卡、问题卡与
 *     composer 的 Send / Cancel run 共用同一个在途词，并且在途词只换请求控件的
 *     标签，不换 Run 的状态词 —— cancel requested ≠ stopped。
 * (2) **Tool row 的 error 与 cancelled 是两个词**（台账 §3 Tool row 行）：
 *     `Failed` 只由 `isError` 给出，`Interrupted` 只由「没有 result 且 Run 已终态」
 *     给出，两者不可能同时成立，也不由同一个布尔派生。
 * (3) **授权卡上没有 always-allow**（台账 §3 第一行，review-projection §6 明文
 *     不采纳）：源码里不存在这一档，本测试把它钉住，防止以后被「补全」进来。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { requestLabel, SENDING_LABEL } from "../web/ui-controls.mjs";
import { projectThread } from "../web/thread-projection.mjs";

const root = new URL("../../", import.meta.url).pathname;
const appSource = readFileSync(`${root}app/web/app.mjs`, "utf8");

test("FE-04 · 在途词只有一个，且只在在途时出现", () => {
  assert.equal(requestLabel("Approve this write", false), "Approve this write");
  assert.equal(requestLabel("Approve this write", true), SENDING_LABEL);
  assert.equal(requestLabel("Cancel run", true), SENDING_LABEL);
  // 词本身不是状态词：它说的是请求，不是 Run（FN-19）。
  assert.notEqual(SENDING_LABEL, "Stopping");
  assert.notEqual(SENDING_LABEL, "Cancelled");
});

test("FE-04 · 四个送出一次决定的控件都经过同一个在途词", () => {
  // 授权卡的两个按钮、问题卡的 Answer、composer 的 Send 与 Cancel run。
  const uses = appSource.match(/requestLabel\(/g) || [];
  assert.ok(uses.length >= 5, `requestLabel 只在 ${uses.length} 处使用`);
  assert.match(appSource, /text: requestLabel\("Answer", submitting\)/);
  assert.match(appSource, /text: requestLabel\(label, inFlight\)/);
  assert.match(
    appSource,
    /send\.textContent = requestLabel\(\s*COMPOSER_SEND_LABEL,\s*Boolean\(pendingRun\),?\s*\)/,
  );
  assert.match(
    appSource,
    /cancel\.textContent = requestLabel\(\s*COMPOSER_CANCEL_LABEL,\s*Boolean\(pendingCancel\),?\s*\)/,
  );
});

test("FE-04 · cancel requested 不把 Run 说成 stopped", () => {
  // run hint 的状态词只从 run.status 来；取消请求在途不参与这个判断。
  const hint = appSource.slice(
    appSource.indexOf("function paintWorkingClock"),
    appSource.indexOf("function startWorkingClock"),
  );
  assert.ok(hint.includes('run.status === "stopping"'));
  assert.ok(!hint.includes("pendingCancel"));
  assert.ok(!hint.includes(SENDING_LABEL));
});

test("FE-04 · 在途的是哪一个决定也是事实，回执到达时一并撤掉", () => {
  assert.match(appSource, /state\.questionSubmitting\.add\(`\$\{key\}:\$\{decision\}`\)/);
  assert.match(appSource, /state\.questionSubmitting\.delete\(`\$\{key\}:allow`\)/);
  assert.match(appSource, /state\.questionSubmitting\.delete\(`\$\{key\}:deny`\)/);
});

test("FE-04 · 重试之前撤掉上一次的失败，两卡一致", () => {
  const permission = appSource.slice(appSource.indexOf("function renderPermission"));
  assert.match(permission, /state\.questionErrors\.delete\(key\)/);
});

test("FE-04 · 问题卡的提交失败会被读出来", () => {
  assert.match(
    appSource,
    /className: "question-error",\s*attrs: \{ role: "alert" \}/,
  );
});

test("FE-04 · Failed 与 Interrupted 由两个不同的事实给出", () => {
  const events = [
    { seq: 1, sessionId: "s1", runId: "r1", type: "tool.start", data: { callId: "c1", name: "ws_write" } },
    { seq: 2, sessionId: "s1", runId: "r1", type: "tool.result", data: { callId: "c1", name: "ws_write", isError: true, text: "denied" } },
    { seq: 3, sessionId: "s1", runId: "r1", type: "tool.start", data: { callId: "c2", name: "ws_read" } },
  ];
  const runs = [{ id: "r1", sessionId: "s1", status: "cancelled" }];
  const { rows } = projectThread(events, runs, "s1");
  const tools = rows.filter((row) => row.kind === "tool");
  assert.equal(tools.length, 2);
  // 失败的那一次有 result，并且带着 isError。
  assert.equal(tools[0].phase, "result");
  assert.equal(tools[0].isError, true);
  // 因取消而未完成的那一次没有 result，也没有 isError —— 两者不共用一个布尔。
  assert.equal(tools[1].phase, "started");
  assert.equal(tools[1].isError, false);
});

test("FE-04 · 授权卡上不存在 always-allow 这一档", () => {
  const permission = appSource.slice(appSource.indexOf("function renderPermission"));
  for (const forbidden of ["allow-always", "Always allow", "allowAlways", "approveAll"])
    assert.ok(!permission.includes(forbidden), `renderPermission 里出现了 ${forbidden}`);
  // 决定值的闭集仍然是两个。
  assert.match(permission, /\["deny", `Deny this \$\{display\.noun\}`\],\s*\["allow", `Approve this \$\{display\.noun\}`\],/);
});

test("FE-04 · inbox 键盘没有批量键与数字键", () => {
  assert.match(appSource, /const LIST_KEYS = new Set\(\["j", "k", "o", "ArrowDown", "ArrowUp", "Enter"\]\)/);
});
