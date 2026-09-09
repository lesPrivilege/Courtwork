/* CC-S（WK-116 / WK-115 ① ②）· 三件事在源码层面被钉住：
 *
 * (1) settings-active 时全局侧栏**不渲染**。视觉上藏起来但 Tab 仍能走进去，会让
 *     「设置自身导航是唯一导航」变成一句假话，所以 `hidden` 与 `inert` 必须同时给，
 *     并且 CSS 里 `.sidebar` 的 `display: flex` 要被显式盖掉（`[hidden]` 的 UA 规则
 *     赢不了一条类选择器）。
 * (2) 没有 result 的工具行有两个词而不是一个：Run 明确 cancelled / failed 才是
 *     `Interrupted`，其余（含 `unknown` 终态与没有 Run 记录）是 `Unknown`（FN-28）。
 * (3) Home 下带与 Chat Flow 未决卡是两条列表，各自 `role="list"`，不合并。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url).pathname;
const read = (p) => readFileSync(`${root}${p}`, "utf8");
const appSource = read("app/web/app.mjs");
const homeSource = read("app/web/home-view.mjs");
const styles = read("app/web/styles.css");
const markup = read("app/web/index.html");
const components = read("docs/interface-components.md");
const layering = read("engineering/design/frontend-layering-spec.md");
const glyphs = read(
  "engineering/mvp/execution/work-surface-kit/contracts/glyph-semantics.md",
);

test("CC-S · settings-active 时侧栏不渲染，而不是只被藏起来", () => {
  assert.match(
    appSource,
    /navigationPanel\.hidden = settingsOpen;\s*\n\s*navigationPanel\.inert = settingsOpen;/,
  );
  // 藏起来的侧栏不该留下一个开合它的按钮。
  assert.match(appSource, /\$\("toggle-nav-button"\)\.hidden = settingsOpen;/);
  assert.match(styles, /\.app-shell\.settings-active \.sidebar,[\s\S]{0,140}display: none;/);
  // 抽屉不能停在开着的状态里，否则 Escape 的第一步指向一个不存在的层。
  assert.match(
    appSource,
    /if \(state\.navigationOpen\) closeNavigation\(\{ restoreFocus: false \}\);/,
  );
});

test("CC-S · Back to app 是唯一的离开动作，落在页标题行左端", () => {
  assert.match(
    markup,
    /id="settings-back-button"[\s\S]{0,120}Back to app/,
  );
  // 页标题只说一次：这一页自己的第二个 <h2> Settings 已经消融。
  assert.doesNotMatch(markup, /settings-page-title/);
  assert.match(markup, /id="settings-page"[\s\S]{0,120}aria-labelledby="session-title"/);
  assert.doesNotMatch(styles, /\.settings-page-head/);
});

test("CC-S · 设置的两列有自己的几何 token，不借 --nav 的列轨", () => {
  for (const token of [
    "--settings-nav: 240px",
    "--settings-gutter: 48px",
    "--settings-measure: 820px",
    "--settings-group-gap: 40px",
  ])
    assert.ok(styles.includes(token), token);
  assert.match(
    styles,
    /\.settings-page-body \{[\s\S]{0,240}grid-template-columns: var\(--settings-nav\) minmax\(0, 1fr\);/,
  );
  assert.match(
    styles,
    /\.settings-section \{\s*max-width: var\(--settings-measure\);/,
  );
  // 宽屏 56–80，窄屏 16–20。
  assert.match(styles, /@media \(min-width: 1680px\) \{\s*:root \{\s*--settings-gutter: 64px;/);
  assert.ok(styles.includes("--settings-gutter: 20px"));
  assert.ok(styles.includes("--settings-gutter: 16px"));
});

test("WK-115 ① · 第六个状态词是 Unknown，Interrupted 只在明确的终态上出现", () => {
  const helper = /const unfinishedToolWord = \(status\) =>\s*\n?\s*status === "cancelled" \|\| status === "failed" \? "Interrupted" : "Unknown";/;
  assert.match(appSource, helper);
  // 工具行与 Activity 组头走同一个判断，不各写一套。
  assert.match(appSource, /: unfinishedToolWord\(status\);/);
  assert.match(appSource, /unfinishedToolWord\(status\) === "Unknown"/);
  assert.match(appSource, /activityGroup\.unknown\s*\n?\s*\?\s*"Unknown"/);
  // 契约表已登记这个词。
  assert.ok(glyphs.includes("`Interrupted` / `Unknown`"));
});

test("WK-115 ② · Home / End 是纯导航键，且只在焦点已在列表里时接管", () => {
  assert.match(
    appSource,
    /if \(event\.key === "Home" \|\| event\.key === "End"\) \{\s*\n\s*if \(index < 0\) return;/,
  );
  assert.match(
    appSource,
    /items\[event\.key === "Home" \? 0 : items\.length - 1\]\.focus\(\);/,
  );
});

test("WK-115 ② · 两条列表各自 role=list，不合并", () => {
  // Chat Flow 的未决卡。
  assert.match(
    appSource,
    /className: "pending-list",\s*\n\s*attrs: \{ role: "list" \},/,
  );
  assert.match(
    appSource,
    /className: "pending-list-item", attrs: \{ role: "listitem" \}/,
  );
  // 只有带 data-nav-item 的卡进这条列表；别的流内容把它收口。
  assert.match(appSource, /if \(!node\?\.matches\?\.\("\[data-nav-item\]"\)\) \{/);
  // Home 下带。
  assert.match(
    homeSource,
    /className: "home-list",\s*\n\s*attrs: \{ role: "list" \},/,
  );
  assert.match(homeSource, /attrs: \{ role: "listitem" \}/);
  // 行本身仍然是按钮 / article：role 写在包着它的那一层。
  assert.doesNotMatch(homeSource, /className: "home-row",\s*\n\s*attrs: \{\s*\n?\s*role: "listitem"/);
});

test("WK-116 · 改约已落在文档里，不是一次 CSS 修复", () => {
  const settings = components.slice(components.indexOf("## Settings"));
  assert.doesNotMatch(
    settings.slice(0, settings.indexOf("| Block |")),
    /while the sidebar stays operable/,
  );
  assert.ok(settings.includes("the global sidebar is not rendered"));
  assert.ok(settings.includes("Back to app"));
  assert.ok(layering.includes("settings-active 时全局侧栏不渲染"));
});
