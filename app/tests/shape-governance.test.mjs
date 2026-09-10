/* WK-128 ④（静态那一层）· 形状治理的 lint 进 npm test。
 *
 * 一条正向：产品样式表通过。三条反向：把违规写进临时文件再跑一次 —— 一个只会说 ok
 * 的 lint 与没有 lint 是一回事，所以这里同时证明它会拒绝什么：满弧写 50%、组件私有
 * 的游离数值、以及不建立在任何形状角色上的表达式。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const lint = `${root}tools/lint-shapes.mjs`;

function run(...files) {
  try {
    return { ok: true, out: execFileSync("node", [lint, ...files], { encoding: "utf8" }) };
  } catch (error) {
    return { ok: false, out: `${error.stdout || ""}${error.stderr || ""}` };
  }
}
function withCss(body) {
  const dir = mkdtempSync(join(tmpdir(), "fe05a-shape-"));
  const file = join(dir, "case.css");
  writeFileSync(file, body);
  return run(file);
}

test("产品样式表通过形状 lint", () => {
  const result = run();
  assert.equal(result.ok, true, result.out);
  assert.match(result.out, /lint-shapes: ok/);
});

test("满弧写成 50% 会被拒绝，并指回 --radius-pill", () => {
  const result = withCss(`.dot {\n  border-radius: 50%;\n}\n`);
  assert.equal(result.ok, false, result.out);
  assert.match(result.out, /--radius-pill/);
  assert.match(result.out, /case\.css:2/);
});

test("组件私有的游离圆角会被拒绝", () => {
  const result = withCss(`.card {\n  border-radius: 7px;\n}\n`);
  assert.equal(result.ok, false, result.out);
  assert.match(result.out, /游离值 7px/);
});

test("不建立在形状角色上的表达式会被拒绝，派生式与多角声明通过", () => {
  const bad = withCss(`.well {\n  border-radius: calc(var(--space-3) - 2px);\n}\n`);
  assert.equal(bad.ok, false, bad.out);
  const good = withCss(
    `.well {\n  border-radius: max(var(--radius-small), calc(var(--radius-container) - var(--panel-padding)));\n}\n` +
      `.strip {\n  border-radius: var(--radius-card) var(--radius-card) 0 0;\n}\n`,
  );
  assert.equal(good.ok, true, good.out);
});

test("登记表内的形状按登记放行", () => {
  const result = withCss(`.user-message-content { border-radius: 18px 18px 6px 18px; }\n`);
  assert.equal(result.ok, true, result.out);
});
