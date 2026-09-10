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
  validateLegacySkinTokens,
  readPreferences,
  writePreferences,
  SKIN_COLOR_TOKENS,
  SKIN_NUMERIC_TOKENS,
  CODE_FONT_PATTERN,
  SETTINGS_GROUPS,
  isSettingsSection,
  PREFERENCE_DEFAULTS,
  PROVENANCE_WORDS,
  preferenceProvenance,
  createPreferenceGovernance,
  settingsRow,
} from "../web/settings-view.mjs";
import { homeModules, homeBandModules } from "../web/home-view.mjs";

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

test("旧 gray-steel 全量块仍可读取，但新外观格式不接受其固定语义键", () => {
  for (const selector of [':root[data-skin="gray-steel"]', ':root[data-skin="gray-steel"][data-theme="dark"]']) {
    const tokens = block(styles, selector);
    const text = Object.entries(tokens).map(([name, value]) => `${name}: ${value};`).join("\n");
    const result = validateLegacySkinTokens(text);
    assert.equal(result.ok, true, `${selector}: ${JSON.stringify(result.errors)}`);
    assert.equal(validateSkinTokens(text).ok, false);
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

test("legacy 数值可读，但新外观许可域拒绝材质参数", () => {
  const legacySet = () => fullSet().replace("}", "--danger-3: #fff; --danger-11: #fff; --success-3: #fff; --success-11: #fff; }");
  assert.equal(Object.keys(SKIN_NUMERIC_TOKENS).length, 5);
  assert.equal(validateSkinTokens(fullSet().replace("}", "--glass-alpha: 0.1; }")).ok, false);
  const ok = validateLegacySkinTokens(legacySet().replace("}", "--alpha-ink: 28, 32, 36;\n--shadow-alpha: 0.08;\n}"));
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  const badTriple = validateLegacySkinTokens(legacySet().replace("}", "--alpha-ink: 300, 0, 0;\n}"));
  assert.equal(badTriple.ok, false);
  assert.match(badTriple.errors[0].reason, /r, g, b triple/);
  const badUnit = validateLegacySkinTokens(legacySet().replace("}", "--rim-alpha: 3;\n}"));
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
    homeLayout: "modules", homeModuleBand: "expanded",
  });
  globalThis.__cwPrefs = original;
});

/* CC-D0-a · 版面偏好走的是同一条窄闸。它决定 Home 上有没有一条带，所以一个被手改的
   localStorage 不能把它读成第三种版面：闭集外的值一律读回 Modules。 */
test("Home 版面偏好是闭集：默认 Modules，坏值读回 Modules 而不是读成第三种版面", () => {
  const original = globalThis.__cwPrefs;
  globalThis.__cwPrefs = { value: { homeLayout: "modules", homeModuleBand: "collapsed" } };
  assert.deepEqual(
    (({ homeLayout, homeModuleBand }) => ({ homeLayout, homeModuleBand }))(readPreferences()),
    { homeLayout: "modules", homeModuleBand: "collapsed" },
  );
  for (const value of ["dashboard", "", 1, null, {}, "Modules"]) {
    globalThis.__cwPrefs = { value: { homeLayout: value, homeModuleBand: value } };
    const read = readPreferences();
    assert.equal(read.homeLayout, "modules", String(value));
    assert.equal(read.homeModuleBand, "expanded", String(value));
  }
  globalThis.__cwPrefs = original;
});

/* WO-CC-D0-a 第 2 项 · 注册表是合同：只有六态逐态指得出事实来源（或写明
   not_applicable）的模块才允许安装。没有接缝的模块不在代码里，只在
   contracts/home-modules.md 里声明——所以这条测的是"没有多出来的模块"。 */
test("Home 模块只安装有既定读取接缝的 Activity 与 Attention", () => {
  assert.deepEqual(homeModules.map((module) => module.id), ["today", "activity", "attention", "models"]);
  assert.deepEqual(
    homeModules.map((module) => [module.id, module.place, module.installed]),
    [["today", "band", true], ["activity", "modules", true], ["attention", "modules", true], ["models", "modules", true]],
  );
  assert.deepEqual(homeBandModules().map((module) => module.id), ["activity", "attention", "models"]);
  for (const absent of ["usage", "mail", "calendar"])
    assert.equal(
      homeModules.some((module) => module.id === absent),
      false,
      `${absent} 没有接缝，不该出现在注册表里`,
    );
});

/* WK-114 ⑤ · Models 不做第二处展示：带上那一行不说模型名、不说连接状态，
   只说去哪里管它。这条盯的是"这一行没有变成第二个信息模块"。 */
test("Models 模块不复述 composer chip 的事实：它没有自己的读取", () => {
  const models = homeModules.find((module) => module.id === "models");
  assert.equal(models.source, null);
  assert.equal(models.place, "modules");
  const today = homeModules.find((module) => module.id === "today");
  assert.equal(today.source, "work-summary");
  assert.equal(today.row, undefined);
});

/* WK-90 · 九个组按用户任务命名。`runtime` 不再是一个组：它是架构词，落在
   Developer 里，旧深链因此落回 General（不保留向后兼容）。 */
test("页面的九个组是闭集，未知的节名落回 General", () => {
  assert.deepEqual(SETTINGS_GROUPS.map((group) => group.id), [
    "general", "appearance", "models", "tools", "skills",
    "memory", "permissions", "keyboard", "developer",
  ]);
  assert.equal(isSettingsSection("appearance"), true);
  assert.equal(isSettingsSection("runtime"), false);
  assert.equal(isSettingsSection("billing"), false);
});

/* ── CC-I 第一片（WO-CCI-01 / WK-150）· PropertyRow ─────────────────────
 * 这一段测的是"一行偏好比一行设置多出来的那三件事"，以及它们各自的边界：
 * provenance 的词表是闭集、判定读生效值不读草稿、复位走既有保存通道且不丢焦点、
 * 没有 owner 默认值的行一个字都不多。DOM 用本文件自带的最小节点，与
 * home-presentation.test.mjs 的 TinyDom 同一路子：这里没有浏览器，量的是结构。 */

class RowNode {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this._text = "";
    this.className = "";
    this.value = "";
    this.hidden = false;
    this.checked = false;
  }
  set textContent(value) {
    this._text = value === null || value === undefined ? "" : String(value);
    this.children = [];
  }
  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join("");
  }
  append(...children) {
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      const node = typeof child === "string" ? this.ownerDocument.createTextNode(child) : child;
      node.parentNode = this;
      this.children.push(node);
    }
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "id") this.id = String(value);
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }
  dispatchEvent(event = {}) {
    for (const callback of this.listeners.get(event.type) ?? []) callback(event);
  }
  click() {
    this.dispatchEvent({ type: "click", target: this });
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  matches(selector) {
    return this.tagName === selector;
  }
  closest(selector) {
    let node = this;
    while (node) {
      if (node.tagName === selector) return node;
      node = node.parentNode;
    }
    return null;
  }
  /* 只支持本段用到的三种：类名、`input:checked`、`input`。 */
  querySelector(selector) {
    const test = (node) =>
      selector.startsWith(".")
        ? String(node.className).split(/\s+/).includes(selector.slice(1))
        : selector === "input:checked"
          ? node.tagName === "input" && node.checked
          : node.tagName === selector;
    const visit = (node) => {
      for (const child of node.children) {
        if (test(child)) return child;
        const found = visit(child);
        if (found) return found;
      }
      return null;
    };
    return visit(this);
  }
}
class RowDocument {
  constructor() {
    this.activeElement = null;
  }
  createElement(tagName) {
    return new RowNode(tagName, this);
  }
  createTextNode(text) {
    const node = new RowNode("#text", this);
    node.textContent = text;
    return node;
  }
}
function withRowDom(fn) {
  const previous = globalThis.document;
  globalThis.document = new RowDocument();
  try {
    return fn(globalThis.document);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
}
/** 一个最小的页面：一份 prefs、一个 status 行、一份按 property 重画的行表。 */
function appearanceHarness(document, properties, initial = {}) {
  let prefs = { ...PREFERENCE_DEFAULTS, ...initial };
  const status = document.createElement("p");
  const host = document.createElement("div");
  const saved = [];
  const governance = createPreferenceGovernance({
    read: () => prefs,
    apply(property, value) {
      saved.push([property, value]);
      prefs = { ...prefs, [property]: value };
      governance.sync();
    },
    rerender: () => render(),
    status,
  });
  const controls = new Map();
  function render() {
    governance.begin();
    host.replaceChildren?.();
    host.children = [];
    for (const [property, title] of properties) {
      const control = document.createElement("select");
      control.value = prefs[property];
      controls.set(property, control);
      const row = settingsRow(title, "help", control, { property, prefs, governance });
      row.parentNode = host;
      host.append(row);
    }
  }
  render();
  const foot = (property) =>
    host.children
      .find((row) => row.getAttribute("data-property") === property)
      .querySelector(".property-foot");
  return {
    get prefs() {
      return prefs;
    },
    saved,
    status,
    host,
    controls,
    foot,
    provenance: (property) => foot(property).querySelector(".property-provenance").textContent,
    reset: (property) => foot(property).querySelector(".property-reset"),
    change(property, value) {
      prefs = { ...prefs, [property]: value };
      governance.sync();
    },
  };
}

test("CC-I · provenance 的词表今日是闭集的两个词，判定是与 owner 默认值的字面比较", () => {
  assert.deepEqual(PROVENANCE_WORDS, ["Default", "Changed on this device"]);
  for (const property of Object.keys(PREFERENCE_DEFAULTS))
    assert.equal(preferenceProvenance(PREFERENCE_DEFAULTS, property), "Default", property);
  assert.equal(preferenceProvenance({ ...PREFERENCE_DEFAULTS, textSize: "large" }, "textSize"), "Changed on this device");
  // 没有 owner 默认值的键没有 provenance —— 不造第三个词，也不造一个空字符串。
  assert.equal(preferenceProvenance(PREFERENCE_DEFAULTS, "adapterId"), null);
  assert.equal(preferenceProvenance(null, "textSize"), null);
});

test("CC-I · 默认态：provenance 是 Default，复位不呈现", () => {
  withRowDom((document) => {
    const page = appearanceHarness(document, [["textSize", "Text size"]]);
    assert.equal(page.provenance("textSize"), "Default");
    assert.equal(page.reset("textSize").hidden, true);
    assert.equal(page.foot("textSize").getAttribute("data-modified"), "false");
  });
});

test("CC-I · 改一项之后翻为 Changed on this device，复位可用且可达名字带属性名", () => {
  withRowDom((document) => {
    const page = appearanceHarness(document, [["textSize", "Text size"]]);
    page.change("textSize", "large");
    assert.equal(page.provenance("textSize"), "Changed on this device");
    assert.equal(page.reset("textSize").hidden, false);
    assert.equal(page.foot("textSize").getAttribute("data-modified"), "true");
    assert.equal(page.reset("textSize").getAttribute("aria-label"), "Reset Text size to default");
    // 可见文字仍是 Reset，且是可达名字的前缀（label-in-name）。
    assert.equal(page.reset("textSize").textContent, "Reset");
  });
});

test("CC-I · 复位：值回默认、provenance 回 Default、焦点落在本行控件上、有一条可播报的回执", () => {
  withRowDom((document) => {
    const page = appearanceHarness(document, [["textSize", "Text size"], ["motion", "Reduced motion"]], { textSize: "large" });
    assert.equal(page.provenance("textSize"), "Changed on this device");
    page.reset("textSize").click();
    assert.equal(page.prefs.textSize, PREFERENCE_DEFAULTS.textSize);
    assert.deepEqual(page.saved, [["textSize", "medium"]]);
    assert.equal(page.provenance("textSize"), "Default");
    assert.equal(page.reset("textSize").hidden, true);
    // 焦点不许掉回 body：它落在重画之后那一行的控件上。
    assert.equal(document.activeElement, page.controls.get("textSize"));
    assert.equal(page.status.textContent, "Text size reset to default.");
    // 邻行没有被这次复位改动。
    assert.equal(page.provenance("motion"), "Default");
  });
});

test("CC-I · 复位之后的下一次改值作废那条回执，回执不是一条会留在页面上的旧话", () => {
  withRowDom((document) => {
    const page = appearanceHarness(document, [["textSize", "Text size"]], { textSize: "large" });
    page.reset("textSize").click();
    assert.equal(page.status.textContent, "Text size reset to default.");
    page.change("textSize", "small");
    assert.equal(page.status.textContent, "");
  });
});

test("CC-I · 没有 owner 默认值的行一个字都不多：同一个函数，不长出这三样", () => {
  withRowDom((document) => {
    const control = document.createElement("span");
    const plain = settingsRow("Data directory", "help", control, {});
    assert.equal(plain.getAttribute("data-property"), null);
    assert.equal(plain.querySelector(".property-foot"), null);
    assert.equal(plain.querySelector(".property-reset"), null);
    assert.equal(control.getAttribute("aria-describedby"), null);
    // 表外的 property 名同样不长出来：provenance 只能来自 PREFERENCE_DEFAULTS。
    const invented = settingsRow("Host state", "help", document.createElement("span"), {
      property: "adapterId",
      prefs: PREFERENCE_DEFAULTS,
    });
    assert.equal(invented.querySelector(".property-foot"), null);
  });
});

test("CC-I · provenance 挂在控件上，读屏听得到它而不是一段孤立的文字", () => {
  withRowDom((document) => {
    const page = appearanceHarness(document, [["scheme", "Theme"]]);
    const control = page.controls.get("scheme");
    const described = control.getAttribute("aria-describedby");
    assert.ok(described, "控件没有指向 provenance");
    assert.equal(
      page.foot("scheme").querySelector(".property-provenance").getAttribute("id"),
      described,
    );
  });
});

/* WK-149 (c) · Code font 是两阶段 commit：输入框里的编辑不是事实，`commitFont()`
   通过校验写进 prefs 之后才是。provenance 读的是写进去的那一份。 */
test("CC-I · Code font：未提交的编辑不是 modified，提交后才是，校验失败不改 provenance", () => {
  const source = readFileSync(`${root}app/web/settings-view.mjs`, "utf8");
  // 未提交：prefs 里仍是空串，也就是默认值。
  assert.equal(preferenceProvenance({ ...PREFERENCE_DEFAULTS, codeFont: "" }, "codeFont"), "Default");
  assert.equal(
    preferenceProvenance({ ...PREFERENCE_DEFAULTS, codeFont: "JetBrains Mono" }, "codeFont"),
    "Changed on this device",
  );
  // 校验失败的那一支在写 prefs 之前就 return，所以 provenance 无从改变。
  const commit = source.slice(source.indexOf("const commitFont ="), source.indexOf("codeFont.addEventListener(\"change\""));
  assert.match(commit, /if \(value && !CODE_FONT_PATTERN\.test\(value\)\)[\s\S]*?return;/);
  assert.ok(
    commit.indexOf("return;") < commit.indexOf("savePrefs({ codeFont: value })"),
    "savePrefs 跑在了校验失败的前面",
  );
});

/* FN-14 请求值 ≠ 有效值 · Palette 的 select 是草稿，生效值是 prefs.skin。 */
test("CC-I · Palette 选了 Custom tokens 但没 Apply 不算 changed：provenance 读生效值不读草稿", () => {
  assert.equal(preferenceProvenance({ ...PREFERENCE_DEFAULTS, skin: "slate" }, "skin"), "Default");
  assert.equal(preferenceProvenance({ ...PREFERENCE_DEFAULTS, skin: "custom" }, "skin"), "Changed on this device");
  const source = readFileSync(`${root}app/web/settings-view.mjs`, "utf8");
  // provenance 的唯一入参是 prefs，`skinDraft` 不进这条判定。
  assert.doesNotMatch(
    source.slice(source.indexOf("export function preferenceProvenance"), source.indexOf("export function writePreferences")),
    /skinDraft/,
  );
  // 存着一套 token 但没应用，Palette 仍是 Default：customSkin 不是 Palette 这一行的生效值。
  assert.equal(
    preferenceProvenance({ ...PREFERENCE_DEFAULTS, customSkin: ":root{--paper:#fff;}" }, "skin"),
    "Default",
  );
});

/* WK-146 / WK-150 applies to appearance preferences. PV-FE01 separately owns
   the optional integer context window in compatible model connections. */
test("CC-I · appearance keeps no value controls; only the provider context window is numeric", () => {
  const source = readFileSync(`${root}app/web/settings-view.mjs`, "utf8");
  const styles = readFileSync(`${root}app/web/styles.css`, "utf8");
  for (const text of [source, styles])
    for (const forbidden of [/type: "range"/, /type="range"/, /<progress/, /<meter/, /role="meter"/, /aria-valuenow/])
      assert.doesNotMatch(text, forbidden, String(forbidden));
  assert.equal((source.match(/type: "number"/g) || []).length, 1);
  assert.match(source, /type: "number", name: "contextWindow", min: "4", step: "1"/);
  assert.match(source, /Number\.isSafeInteger\(parsed\) && parsed >= 4/);
  // 复位是可逆的低风险操作，不加确认对话框（WK-122 / WK-140）。
  assert.doesNotMatch(source, /\bconfirm\(/);
});


test("failed browser storage keeps the active projection but exposes session-only persistence", () => {
  const previousStore = globalThis.__cwPrefs;
  const previousStorage = globalThis.localStorage;
  let applied;
  const store = { key: "synthetic", value: {}, apply: value => { applied = value; } };
  try {
    globalThis.__cwPrefs = store;
    globalThis.localStorage = { setItem() { throw new Error("quota"); } };
    const value = { ...PREFERENCE_DEFAULTS, scheme: "dark", customSkin: "retained raw" };
    assert.equal(writePreferences(value), value);
    assert.equal(applied, value);
    assert.equal(store.value.customSkin, "retained raw");
    assert.equal(store.storageError, true);
    globalThis.localStorage = { setItem() {} };
    writePreferences(value);
    assert.equal(store.storageError, false);
  } finally {
    if (previousStore === undefined) delete globalThis.__cwPrefs; else globalThis.__cwPrefs = previousStore;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  }
});
