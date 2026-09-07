import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const root = new URL("..", import.meta.url).pathname;
test("颜色字面量只出现在 tier:S 块内", () => {
  const out = execFileSync("node", [`${root}tools/lint-colors.mjs`], { encoding: "utf8" });
  assert.match(out, /lint-colors: ok/);
});
test("两 skin × 两宗的角色对比度不低于门槛", () => {
  const out = execFileSync("node", [`${root}tools/contrast-report.mjs`], { encoding: "utf8" });
  assert.doesNotMatch(out, /低于门槛/);
});
