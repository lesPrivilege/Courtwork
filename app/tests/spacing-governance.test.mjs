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
