/* WK-100 (机械化检查) / WK-101 / WK-102 · 材质治理的两条 lint 进 npm test。
 *
 * 一条正向：产品样式表通过。两条反向：把违规样式写进临时文件再跑一次 —— 一个只会说
 * ok 的 lint 与没有 lint 是一回事，所以这里同时证明它会拒绝什么。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const lint = `${root}tools/lint-materials.mjs`;

function run(...files) {
  try {
    return {
      ok: true,
      out: execFileSync("node", [lint, ...files], { encoding: "utf8" }),
    };
  } catch (error) {
    return { ok: false, out: `${error.stdout || ""}${error.stderr || ""}` };
  }
}

test("产品样式表通过材质 lint 两项", () => {
  const result = run();
  assert.equal(result.ok, true, result.out);
  assert.match(result.out, /lint-materials: ok/);
});

test("未登记的类名上出现 backdrop-filter 会被拒绝", () => {
  const dir = mkdtempSync(join(tmpdir(), "fe01-material-"));
  const file = join(dir, "bad-surface.css");
  writeFileSync(
    file,
    `.sidebar {\n  background: var(--glass);\n  backdrop-filter: blur(var(--blur-chrome));\n}\n`,
  );
  const result = run(file);
  assert.equal(result.ok, false, result.out);
  assert.match(result.out, /不在 WK-101 登记表内/);
});

test("半透明表面缺少 reduced-transparency 回退会被拒绝", () => {
  const dir = mkdtempSync(join(tmpdir(), "fe01-material-"));
  const file = join(dir, "no-fallback.css");
  writeFileSync(
    file,
    `.jump-latest-button {\n  background: var(--glass);\n  backdrop-filter: blur(var(--blur-chrome));\n}\n`,
  );
  const result = run(file);
  assert.equal(result.ok, false, result.out);
  assert.match(result.out, /没有 @media \(prefers-reduced-transparency: reduce\) 回退/);
});

test("私有 blur 取值会被拒绝", () => {
  const dir = mkdtempSync(join(tmpdir(), "fe01-material-"));
  const file = join(dir, "raw-blur.css");
  writeFileSync(
    file,
    `.context-popover {\n  background: var(--glass-muted);\n  backdrop-filter: blur(22px);\n}\n` +
      `@media (prefers-reduced-transparency: reduce) {\n  .context-popover {\n    background: var(--float);\n    backdrop-filter: none;\n  }\n}\n`,
  );
  const result = run(file);
  assert.equal(result.ok, false, result.out);
  assert.match(result.out, /不是 --blur-chrome \/ --blur-transient/);
});
