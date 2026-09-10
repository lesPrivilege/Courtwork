/* CC-W（WK-113 / WK-116 / WK-117 (b) / WK-118 ④⑤ / WK-119 补充）· 在源码层面钉住
 * 本单的判断，浏览器几何断言另在 `evidence/cc-w/composition-checks.mjs`。
 *
 * 第 0 项：
 *   (1) 工作面定性已按视口分档改约，"not a third column" 的旧定性不再留在文档里；
 *   (2) M-9 在途换词不换宽度；
 *   (3) M-10 tooltip 共享延迟，且 tooltip 仍是纯文本 hover。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  setRequestLabel,
  requestLabel,
  SENDING_LABEL,
  TOOLTIP_DELAY,
  TOOLTIP_GROUP_WINDOW,
} from "../web/ui-controls.mjs";

const root = new URL("../../", import.meta.url).pathname;
const read = (p) => readFileSync(`${root}${p}`, "utf8");
const components = read("docs/interface-components.md");
const standard = read("engineering/design/ui-composition-standard.md");
const controls = read("app/web/ui-controls.mjs");
const styles = read("app/web/styles.css");

test("CC-W 第 0 项 · 工作面定性按视口分档，旧的 not-a-third-column 已不在文档里", () => {
  // 旧定性不再作为一句独立的断言存在；只以"这一句被替换了"的形式被引用一次。
  assert.doesNotMatch(components, /The work surface is not a third column:/);
  assert.equal(
    (components.match(/not a third column/g) || []).length,
    1,
    "旧定性不止一处",
  );
  // 三档都写明，而不是只说"更宽视口可以三栏"。
  assert.match(components, /From \*\*1680\*\* up it is a real third column/);
  assert.match(components, /Between \*\*1024 and 1679\*\*/);
  assert.match(components, /Below \*\*1024\*\* the expanded surface is the whole area/);
  // 展开态不是遮罩加模态卡，而是主区内的视图切换，chat 列 DOM 保留。
  assert.match(components, /view switch inside the main area/);
  assert.match(components, /`hidden` \+ `inert`/);
  assert.match(components, /no scrim and no modal card frame/);
  // 面板宽 ≠ 正文行宽。
  assert.match(components, /--doc-measure` 740/);
  // 顶带左端槽位重裁：返回控件不进 tablist，也不占那个槽位。
  assert.match(components, /outside the tablist/);
});

test("CC-W 第 0 项 · 尺寸 token 表登记了 ≥1680 断点、--doc-min 与正文行宽上限", () => {
  assert.match(standard, /`--doc-min`/);
  assert.match(standard, /`--doc-measure`/);
  assert.match(standard, /三栏断点 \| ≥1680/);
  assert.ok(styles.includes("--doc-min: 688px"), "--doc-min 未在 :root 登记");
  assert.ok(styles.includes("--doc-measure: 740px"), "--doc-measure 未在 :root 登记");
});

test("CC-W 第 0 项 · M-9 在途换词不换宽度，按钮元素本身不被替换", () => {
  // 纯 DOM 断言：这里没有浏览器，量的是结构而不是像素；像素在
  // evidence/cc-w/fe-t07.mjs 的 M-9 一条上量。
  const calls = [];
  globalThis.document = {
    createElement: (tag) => {
      const node = {
        tag,
        className: "",
        textContent: "",
        attrs: {},
        setAttribute(name, value) {
          this.attrs[name] = value;
        },
      };
      calls.push(node);
      return node;
    },
  };
  const button = {
    classList: { add: (name) => calls.push({ tag: "class", name }) },
    dataset: {},
    attrs: {},
    children: null,
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    replaceChildren(...nodes) {
      this.children = nodes;
    },
  };
  try {
    const returned = setRequestLabel(button, "Approve this write", true);
    assert.equal(returned, button, "按钮元素被替换了，焦点会丢");
    // 只有一个真子节点：影子是生成内容，不进 textContent（既有反例脚本按它认按钮）。
    assert.equal(button.children.length, 1);
    assert.equal(button.children[0].textContent, SENDING_LABEL);
    assert.equal(button.dataset.restingLabel, "Approve this write");
    assert.equal(button.attrs["aria-label"], SENDING_LABEL);
    assert.ok(calls.some((c) => c.tag === "class" && c.name === "request-width"));
  } finally {
    delete globalThis.document;
  }
  // 静止态仍然是原词，在途词仍然只有一个。
  assert.equal(requestLabel("Approve this write", false), "Approve this write");
  // 宽度由样式承担：影子占同一个 grid 格子。
  assert.match(styles, /\.request-width \{[\s\S]{0,120}display: inline-grid;/);
  assert.match(styles, /\.request-width::after \{[\s\S]{0,120}visibility: hidden;/);
  assert.match(styles, /content: attr\(data-resting-label\);/);
});

test("CC-W 第 0 项 · M-10 tooltip 共享延迟：首个 400，窗口内相邻即时", () => {
  assert.equal(TOOLTIP_DELAY, 400);
  assert.equal(TOOLTIP_GROUP_WINDOW, 300);
  // 窗口的两个来源：浮层还开着（相邻迁移），或刚关掉不到 300ms。
  assert.match(
    controls,
    /const grouped =\s*\n?\s*Boolean\(anchor\) \|\| Date\.now\(\) - lastHidden <= TOOLTIP_GROUP_WINDOW;/,
  );
  assert.match(controls, /grouped \? 0 : TOOLTIP_DELAY/);
  // 语义不变：仍是纯文本、仍只在 pointerover / focusin 上出现，没有 hover 可交互浮层。
  assert.match(controls, /tip\.textContent = target\.dataset\.tooltip;/);
  assert.doesNotMatch(controls, /tip\.(innerHTML|append)\(/);
});

/* ── 正文 1–5 ──────────────────────────────────────────────────────── */

const appSource = read("app/web/app.mjs");
const markup = read("app/web/index.html");

test("CC-W 1 · 文档 tab 只有一个，身份由既有字段拼出，不新增 scope 字段", () => {
  // 至多一个文档 tab：没有数组、没有 map、没有位置表。
  assert.equal((markup.match(/id="surface-document-tab"/g) || []).length, 1);
  assert.doesNotMatch(appSource, /openDocuments|documentTabs\s*=|surfaceDocuments\s*=/);
  // 显示 key 由 sessionId / path / kind / sha256 / runId 拼出；没有 scope 字段。
  const key = appSource.slice(
    appSource.indexOf("function surfaceDocumentKey"),
    appSource.indexOf("function documentTabTitle"),
  );
  for (const field of ["sessionId", "path", "kind", "sha256", "runId"])
    assert.ok(key.includes(`ref.${field}`), field);
  assert.ok(!key.includes("scope"), "tab key 里不该有 scope 字段");
  // renderer 失效判定仍然是 sameSurfaceIdentity，含 status / modulePath（R4D-4）。
  const identity = appSource.slice(
    appSource.indexOf("function sameSurfaceIdentity"),
    appSource.indexOf("function surfaceIdentityFromExtension"),
  );
  for (const field of ["status", "modulePath", "generation", "extensionId", "sessionId"])
    assert.ok(identity.includes(field), field);
});

test("CC-W 1 · 选中区与关闭区分开；类型 tab 没有关闭区；关闭是明确动作", () => {
  assert.match(markup, /id="surface-document-select"[\s\S]{0,200}role="tab"/);
  assert.match(markup, /id="surface-document-close"/);
  // 类型 tab 是三个 role=tab 的按钮，它们里面没有关闭钮。
  assert.doesNotMatch(
    markup,
    /id="surface-(preview|run|file)-tab"[\s\S]{0,200}surface-tab-close/,
  );
  // 关闭：关闭钮，或焦点在文档 tab 上时的 Delete / Backspace。
  assert.match(appSource, /event\.key === "Delete" \|\| event\.key === "Backspace"/);
  assert.match(appSource, /\$\("surface-document-close"\)\.addEventListener\("click", closeDocumentTab\)/);
  // 关闭活跃文档 tab 回紧凑目录并归还焦点。
  const close = appSource.slice(
    appSource.indexOf("function closeDocumentTab"),
    appSource.indexOf("const TAB_ACTIVITY"),
  );
  assert.ok(close.includes("setSurfaceExpanded(false"), "回紧凑目录");
  assert.ok(close.includes("restoreLayerFocus"), "归还焦点");
  // 截断只发生在看的那一层：完整名字留在 title 与可访问名上。
  const tab = appSource.slice(
    appSource.indexOf("function renderDocumentTab"),
    appSource.indexOf("function renderSurfaceScope"),
  );
  assert.ok(tab.includes("select.title = full"));
  assert.ok(tab.includes('select.setAttribute("aria-label", full)'));
});

test("CC-W 2 · B 态是视图切换：聊天列 hidden + inert，没有遮罩，没有浮层材质", () => {
  const body = appSource.slice(
    appSource.indexOf("function renderConversationBodyVisibility"),
    appSource.indexOf("function surfaceIsModal"),
  );
  assert.ok(body.includes("body.hidden ="));
  assert.ok(body.includes("body.inert ="));
  // 遮罩只画给真正的模态（<1024 的 sheet）。
  assert.match(appSource, /\$\("surface-backdrop"\)\.hidden = !modal;/);
  // 展开态没有浮层材质。
  const expandedRule = styles.slice(
    styles.indexOf(".surface-panel.is-expanded {"),
    styles.indexOf(".surface-panel.is-expanded {") + 400,
  );
  assert.match(expandedRule, /box-shadow: none;/);
  assert.match(expandedRule, /border-radius: 0;/);
  assert.ok(!/var\(--float\)/.test(expandedRule), "展开态还在用 --float");
  // strip 40–44 高。
  assert.match(styles, /\.surface-panel\.is-view-switch \.surface-header \{[\s\S]{0,80}height: 44px;/);
});

test("CC-W 3 · C 态是三条真的列轨，各自滚动，chrome 同一基线", () => {
  assert.match(styles, /@media \(min-width: 1680px\)/);
  assert.match(
    styles,
    /\.app-shell\.surface-three-pane \{[\s\S]{0,200}var\(--nav\) minmax\(640px, 1fr\)[\s\S]{0,80}var\(--doc-min\)/,
  );
  assert.match(styles, /\.surface-panel\.is-three-pane \{[\s\S]{0,120}position: static;/);
  // 同一基线：文档面的带与 chat 的带同高。
  assert.match(
    styles,
    /\.surface-panel\.is-three-pane \.surface-header \{[\s\S]{0,80}height: var\(--band-top\);/,
  );
  // 断点判定在 JS 里只有一处。
  assert.equal((appSource.match(/min-width: 1680px/g) || []).length, 1);
});

test("CC-W 2 / 3 · 返回控件不在 tablist 里，也不占顶带那个槽位", () => {
  // ← Chat 是 surface-header 的直接子元素，不在 #surface-tabs 里。
  const header = markup.slice(
    markup.indexOf('<header class="surface-header">'),
    markup.indexOf('id="surface-tabs"'),
  );
  assert.ok(header.includes('id="surface-back-button"'), "返回控件在 strip 那一行上");
  const tablist = markup.slice(
    markup.indexOf('id="surface-tabs"'),
    markup.indexOf('id="surface-scope"'),
  );
  assert.ok(!tablist.includes("surface-back-button"), "返回控件进了 tablist");
  // 顶带左端槽位仍然只有侧栏开合钮与 Back to app 两种离开动作。
  assert.match(appSource, /\$\("toggle-nav-button"\)\.hidden = settingsOpen;/);
  assert.doesNotMatch(appSource, /chat-header[\s\S]{0,80}surface-back-button/);
  // Escape 两步序不变。
  assert.match(appSource, /if \(state\.surface\.expanded\) setSurfaceExpanded\(false\);/);
});

test("CC-W 4 / 5 · 面板宽 ≠ 正文行宽；滚动位置在没有布局盒时不被抹成 0", () => {
  assert.match(styles, /\.surface-expanded #file-content > \* \{[\s\S]{0,60}var\(--doc-measure\)/);
  assert.match(styles, /#file-content pre,[\s\S]{0,120}overflow-x: auto;/);
  // R4D-3：聊天列不在屏幕上时，记住的阅读位置不被 0 覆盖。
  assert.match(appSource, /if \(!stream\.clientHeight && !stream\.scrollHeight\)/);
  assert.match(appSource, /rememberMessageReading\(\$\("message-stream"\)\)/);
});

test("CC-W 1 · agent activity 是 tab 上的一个记号，不是 banner，不只靠颜色", () => {
  const activity = appSource.slice(
    appSource.indexOf("const TAB_ACTIVITY"),
    appSource.indexOf("function closeSurface"),
  );
  for (const status of ["running", "waiting_user", "failed"])
    assert.ok(activity.includes(status), status);
  // 每一档都带一句话，不是只有颜色。
  assert.match(activity, /className: "sr-only", text: word/);
  assert.ok(!activity.includes("banner"), "不造 banner");
  // 形状分档：实心 / 空心环 / 方块。
  // WK-128 ③（FE-05a）· 满弧改写 --radius-pill，`50%` 不再使用；断言跟着契约走，
  // 量的仍是"这一档是圆"，不是放宽（正方形上 999px 与 50% 渲染同值）。
  assert.match(styles, /\.tab-activity \{[\s\S]{0,200}border-radius: var\(--radius-pill\);/);
  assert.match(styles, /\.tab-activity\.failed,[\s\S]{0,120}border-radius: 0;/);
  // 颜色沿 run-badge 的三档，没有新色。
  assert.match(styles, /\.tab-activity\.waiting_user \{[\s\S]{0,60}color: var\(--accent-ink\);/);
});
