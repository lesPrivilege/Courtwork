/* WO-WK12 · 只测本单新增的判断，不重测已经在别处被断言过的东西：
 * (1) 用户 skin 的校验规则 —— 它是「更开放的自定义」与「任意 CSS 注入」之间那道线，
 *     规则与 tools/lint-colors.mjs 同源：只认既有 Tier S token 名，颜色只认 hex；
 * (2) 本设备偏好的读取只接受闭集里的值，坏掉的存储不至于让页面带着垃圾开机；
 * (3) 产品内的 gray-steel 与 app/web/skins/gray-steel.css 逐字相同，防止两处漂移。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  validateSkinTokens,
  readPreferences,
  SKIN_COLOR_TOKENS,
  SKIN_NUMERIC_TOKENS,
  CODE_FONT_PATTERN,
  SETTINGS_GROUPS,
  isSettingsSection,
} from "../web/settings-view.mjs";

const root = new URL("../../", import.meta.url).pathname;
const styles = readFileSync(`${root}app/web/styles.css`, "utf8");
const skinFile = readFileSync(`${root}app/web/skins/gray-steel.css`, "utf8");

/** 取一个选择器的声明块，返回 token → 值。 */
function block(css, selector) {
  const index = css.indexOf(selector);
  assert.notEqual(index, -1, `selector not found: ${selector}`);
  const open = css.indexOf("{", index);
  const close = css.indexOf("}", open);
  const out = {};
  for (const match of css.slice(open + 1, close).matchAll(/(--[\w-]+):\s*([^;]+);/g))
    out[match[1]] = match[2].trim();
  return out;
}
const fullSet = (over = {}) => {
  const lines = SKIN_COLOR_TOKENS.map((name) => `${name}: #101010;`);
  return `:root {\n${lines.join("\n")}\n}`.replace(/\n/g, "\n") && Object.entries(over).reduce(
    (text, [name, value]) => text.replace(new RegExp(`${name}: #101010;`), `${name}: ${value};`),
    `:root {\n${lines.join("\n")}\n}`,
  );
};

test("一组完整的 Tier S token 通过，并被规范成可以直接落进样式表的声明", () => {
  const result = validateSkinTokens(fullSet());
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.errors.length, 0);
  for (const name of SKIN_COLOR_TOKENS) assert.match(result.css, new RegExp(`${name}: #101010;`));
  assert.doesNotMatch(result.css, /[{}]/);
});

test("styles.css 与 skins/gray-steel.css 的两个 skin 块都能通过同一套校验", () => {
  for (const selector of [':root[data-skin="gray-steel"]', ':root[data-skin="gray-steel"][data-theme="dark"]']) {
    const tokens = block(styles, selector);
    const text = Object.entries(tokens).map(([name, value]) => `${name}: ${value};`).join("\n");
    const result = validateSkinTokens(text);
    assert.equal(result.ok, true, `${selector}: ${JSON.stringify(result.errors)}`);
  }
});

test("产品内的 gray-steel 与 skins/gray-steel.css 逐字相同：两处不许漂移", () => {
  const pairs = [
    [':root[data-skin="gray-steel"]', "/* tier:S · light */\n:root"],
    [':root[data-skin="gray-steel"][data-theme="dark"]', '/* tier:S · dark */\n:root[data-theme="dark"]'],
  ];
  const normalise = (value) => value.replace(/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i, "#$1$2$3").toLowerCase();
  const expand = (value) =>
    /^#[0-9a-f]{3}$/i.test(value) ? `#${[...value.slice(1)].map((c) => c + c).join("")}` : value;
  for (const [inProduct, inFile] of pairs) {
    const a = block(styles, inProduct);
    const b = block(skinFile, inFile);
    assert.deepEqual(
      Object.fromEntries(Object.entries(a).map(([k, v]) => [k, expand(normalise(v))])),
      Object.fromEntries(Object.entries(b).map(([k, v]) => [k, expand(normalise(v))])),
      `${inProduct} drifted from ${inFile}`,
    );
  }
});

test("不是既有 token 名的声明被逐行拒绝，整组不落地", () => {
  const result = validateSkinTokens(fullSet().replace("--gray-1: #101010;", "--gray-1: #101010;\n--brand: #ff0000;"));
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].reason, /--brand is not a Tier S token name/);
  assert.equal(result.css, "");
});

test("颜色 token 只接受 hex：命名色、函数与变量都不行", () => {
  for (const value of ["rebeccapurple", "rgb(1, 2, 3)", "var(--gray-2)", "hsl(0 0% 0%)"]) {
    const result = validateSkinTokens(fullSet({ "--paper": value }));
    assert.equal(result.ok, false, value);
    assert.ok(result.errors.some((problem) => /Only a hex colour/.test(problem.reason)), value);
  }
});

test("url( · expression · @import · 转义 · 标记这些形状先于逐行解析被拒绝", () => {
  for (const [text, needle] of [
    ["--paper: url(https://example.test/x.png);", "url("],
    ["--paper: expression(alert(1));", "expression"],
    ["@import \"other.css\";", "@"],
    ["--paper: #fff; </style><script>x()</script>", "</"],
    ["--paper: \\000023fff;", "\\"],
  ]) {
    const result = validateSkinTokens(text);
    assert.equal(result.ok, false, text);
    assert.equal(result.errors[0].text, needle, text);
  }
});

test("半套色阶被拒绝，并把缺的名字说出来", () => {
  const result = validateSkinTokens("--gray-1: #101010; --gray-2: #202020;");
  assert.equal(result.ok, false);
  assert.match(result.errors[0].reason, /A skin is a whole scale\. Missing: /);
  assert.match(result.errors[0].reason, /--paper/);
});

test("行号指回原文，一次报完所有问题", () => {
  const result = validateSkinTokens(":root {\n  --gray-1: #101010;\n  --nope: #ffffff;\n  --gray-2: nope;\n}");
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map((problem) => problem.line), [3, 4]);
});

test("两个 rgb 基底与三个 alpha 是数值不是颜色，各按自己的形状校验", () => {
  assert.equal(Object.keys(SKIN_NUMERIC_TOKENS).length, 5);
  const ok = validateSkinTokens(fullSet().replace("}", "--alpha-ink: 28, 32, 36;\n--shadow-alpha: 0.08;\n}"));
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  const badTriple = validateSkinTokens(fullSet().replace("}", "--alpha-ink: 300, 0, 0;\n}"));
  assert.equal(badTriple.ok, false);
  assert.match(badTriple.errors[0].reason, /r, g, b triple/);
  const badUnit = validateSkinTokens(fullSet().replace("}", "--rim-alpha: 3;\n}"));
  assert.equal(badUnit.ok, false);
  assert.match(badUnit.errors[0].reason, /between 0 and 1/);
});

test("一次只收一个块：粘贴整份 skin 文件被拒绝而不是只应用第一段", () => {
  const result = validateSkinTokens(skinFile);
  assert.equal(result.ok, false);
  assert.match(result.errors[0].reason, /one block at a time|at-rules/);
});

test("空输入与超长输入各有自己的话，不是同一句错误", () => {
  assert.match(validateSkinTokens("").errors[0].reason, /Paste a Tier S token set/);
  assert.match(validateSkinTokens("x".repeat(9000)).errors[0].reason, /at most 8000 characters/);
});

test("代码字体只收字体族名，收不下分号与括号", () => {
  for (const value of ["JetBrains Mono", "SF Mono, Menlo", "'Fira Code'"])
    assert.ok(CODE_FONT_PATTERN.test(value), value);
  for (const value of ["oops; }", "url(x)", "a{b:c}", "expression(1)"])
    assert.equal(CODE_FONT_PATTERN.test(value), false, value);
});

test("读偏好只认闭集里的值：坏掉的存储读成默认，不是读成垃圾", () => {
  const original = globalThis.__cwPrefs;
  globalThis.__cwPrefs = { value: { scheme: "neon", textSize: 99, motion: "reduce", codeFont: "a; }", skin: "custom" } };
  const prefs = readPreferences();
  assert.equal(prefs.scheme, "system");
  assert.equal(prefs.textSize, "medium");
  assert.equal(prefs.motion, "reduce");
  assert.equal(prefs.codeFont, "");
  assert.equal(prefs.skin, "custom");
  globalThis.__cwPrefs = undefined;
  assert.deepEqual(readPreferences(), {
    scheme: "system", skin: "slate", customSkin: "", textSize: "medium", codeFont: "", motion: "system",
  });
  globalThis.__cwPrefs = original;
});

test("页面的五个组是闭集，未知的节名落回 General", () => {
  assert.deepEqual(SETTINGS_GROUPS.map((group) => group.id), [
    "general", "appearance", "keyboard", "runtime", "developer",
  ]);
  assert.equal(isSettingsSection("appearance"), true);
  assert.equal(isSettingsSection("billing"), false);
});
