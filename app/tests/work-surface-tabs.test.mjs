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
    children: null,
    replaceChildren(...nodes) {
      this.children = nodes;
    },
  };
  try {
    const returned = setRequestLabel(button, "Approve this write", true);
    assert.equal(returned, button, "按钮元素被替换了，焦点会丢");
    assert.equal(button.children.length, 2);
    assert.equal(button.children[0].textContent, SENDING_LABEL);
    // 影子标签量的是静止态的词，并且不进无障碍树。
    assert.equal(button.children[1].textContent, "Approve this write");
    assert.equal(button.children[1].attrs["aria-hidden"], "true");
    assert.equal(button.dataset.restingLabel, "Approve this write");
    assert.ok(calls.some((c) => c.tag === "class" && c.name === "request-width"));
  } finally {
    delete globalThis.document;
  }
  // 静止态仍然是原词，在途词仍然只有一个。
  assert.equal(requestLabel("Approve this write", false), "Approve this write");
  // 宽度由样式承担：影子占同一个 grid 格子。
  assert.match(styles, /\.request-width \{[\s\S]{0,120}display: inline-grid;/);
  assert.match(styles, /\.request-label-ghost \{[\s\S]{0,80}visibility: hidden;/);
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
