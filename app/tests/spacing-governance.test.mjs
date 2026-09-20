/* G3 · token discipline（gui-grammar-convergence-20260919）· lint 进 npm test。
 *
 * 一条正向：产品样式表通过。三条反向：把违规写进临时文件再跑一次 —— 一个只会说 ok
 * 的 lint 与没有 lint 是一回事，所以这里同时证明它会拒绝什么：游离的间距 px、游离的
 * font-size px。一条登记表命中：登记过的 selector + 值组合放行。与 lint-shapes 的
 * shape-governance.test.mjs 同一个做法。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const lint = `${root}tools/lint-spacing.mjs`;

function run(...files) {
  try {
    return { ok: true, out: execFileSync("node", [lint, ...files], { encoding: "utf8" }) };
  } catch (error) {
    return { ok: false, out: `${error.stdout || ""}${error.stderr || ""}` };
  }
}
function withCss(body) {
  const dir = mkdtempSync(join(tmpdir(), "g3-spacing-"));
  const file = join(dir, "case.css");
  writeFileSync(file, body);
  return run(file);
}

test("产品样式表通过间距 / 字号 lint", () => {
  const result = run();
  assert.equal(result.ok, true, result.out);
  assert.match(result.out, /lint-spacing: ok/);
});

test("游离的间距 px（不在刻度上、未登记）会被拒绝", () => {
  const result = withCss(`.card {\n  padding: 7px;\n}\n`);
  assert.equal(result.ok, false, result.out);
  assert.match(result.out, /游离值 7px/);
  assert.match(result.out, /case\.css:2/);
});

test("token 引用、发丝级偏移与 0/auto 都不算违规", () => {
  const result = withCss(
    `.row {\n  padding: var(--space-2) var(--space-4);\n  margin: -1px auto 0;\n  gap: 0;\n}\n`,
  );
  assert.equal(result.ok, true, result.out);
});

test("游离的 font-size px 会被拒绝，登记表命中的 selector + 值放行", () => {
  const bad = withCss(`.title {\n  font-size: 19px;\n}\n`);
  assert.equal(bad.ok, false, bad.out);
  assert.match(bad.out, /font-size 是游离值 19px/);

  const good = withCss(`.model-picker-header h2 {\n  font-size: 20px;\n}\n`);
  assert.equal(good.ok, true, good.out);
});

test("登记表内的间距按 selector + 值放行，换一个值仍拒绝", () => {
  const registered = withCss(`.project-toggle {\n  padding: 6px;\n}\n`);
  assert.equal(registered.ok, true, registered.out);

  const notRegistered = withCss(`.project-toggle {\n  padding: 7px;\n}\n`);
  assert.equal(notRegistered.ok, false, notRegistered.out);
});

/* Luna 4（2026-09-20 独立复核）· 三条绕过路径，各配一条反向测试：
   块内最后一条声明可以省分号；var() 里可以写一个没人定义的 token 名；
   登记表若只按 selector + 值匹配，为 padding 写的理由会替 margin 背书。 */
test("块内最后一条声明没有分号时同样被检查", () => {
  const result = withCss(`.card {\n  padding: 7px\n}\n`);
  assert.equal(result.ok, false, result.out);
  assert.match(result.out, /游离值 7px/);
});

test("引用未定义的 token 名会被拒绝，带兜底的 var() 放行", () => {
  const unknown = withCss(`.card {\n  padding: var(--space-7);\n}\n`);
  assert.equal(unknown.ok, false, unknown.out);
  assert.match(unknown.out, /未定义的 token --space-7/);
  const fallback = withCss(`.card {\n  padding: var(--space-7, 8px);\n}\n`);
  assert.equal(fallback.ok, true, fallback.out);
});

test("登记表按属性生效：为 padding 登记的值不替同一选择器的 margin 背书", () => {
  const registeredProperty = withCss(`.project-toggle {\n  padding: 6px var(--space-2);\n}\n`);
  assert.equal(registeredProperty.ok, true, registeredProperty.out);
  const otherProperty = withCss(`.project-toggle {\n  margin: 6px;\n}\n`);
  assert.equal(otherProperty.ok, false, otherProperty.out);
  assert.match(otherProperty.out, /游离值 6px/);
});
