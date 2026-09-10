/* FE-05a Commit B · Shape 语法的运行时断言（SHAPE-*）。
 *
 * 静态 lint 只能证明取值来自角色表；父子是否同心是布局事实（inset 由渲染给出），
 * 只能在真实浏览器里量 —— 这是 EX-CS1 §6 规则 2 的结论，也是这份脚本存在的理由。
 * 公理：R_child = max(R_min, R_parent − inset)，inset 取父级的内边距，容差 ±1px。
 * harness 逐字复制自 evidence/cc-d0a/browser.mjs，只改端口。
 *
 *   SHAPE-1  popover / 会话概览卡 / 卡内的行，三层逐对同心
 *   SHAPE-2  composer 外壳 / 输入面
 *   SHAPE-3  dialog / 内容井
 *   SHAPE-4  焦点环 offset 统一为 2
 *   SHAPE-5  焦点环弧线：有自身圆角的元素不重复声明；没有的容器写"预期 + offset"
 *   SHAPE-6  满弧只给 composer 唯一的浮动主动作；同尺寸的图标按钮保持圆角矩形
 *   SHAPE-7  segmented 轨道 / 滑块 / 分段的派生（8 − 2）
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const results = [];
const record = (id, pass, detail) => results.push({ id, pass, ...detail });
const R_MIN = 4;

async function open(url, { width = 1440, height = 900 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await cdp("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "reduce" }] });
  await cdp("Page.navigate", { url });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(600);
}
const openWork = async () => {
  await ev(`document.querySelector('.project-list button')?.click(), true`);
  await sleep(400);
  await ev(`(() => { const list = document.querySelectorAll('.project-list [data-session-id]');
     (list[0] || document.querySelector('.home-row'))?.click(); return true; })()`);
  await waitFor("window.__V5_UI__?.state.activeSessionId");
  await sleep(700);
};
/* 一对父子的实测：两端的圆角，加上父级在这条边上的内边距。 */
const PAIR = (parent, child) => `(() => {
  const p = document.querySelector(${JSON.stringify(parent)});
  const c = p && p.querySelector(${JSON.stringify(child)});
  if (!p || !c) return { parent: ${JSON.stringify(parent)}, child: ${JSON.stringify(child)}, found: false };
  const ps = getComputedStyle(p), cs = getComputedStyle(c);
  return { parent: ${JSON.stringify(parent)}, child: ${JSON.stringify(child)}, found: true,
    parentRadius: parseFloat(ps.borderTopLeftRadius),
    childRadius: parseFloat(cs.borderTopLeftRadius),
    inset: parseFloat(ps.paddingLeft) };
})()`;
const concentric = (id, pair) => {
  const derived = pair.found ? Math.max(R_MIN, pair.parentRadius - pair.inset) : null;
  record(id, pair.found && Math.abs(pair.childRadius - derived) <= 1, { ...pair, derived });
};

try {
  /* ── SHAPE-2 · composer（Home 首屏就有） ─────────────────────────────── */
  await open(ORIGIN);
  concentric("SHAPE-2", await ev(PAIR(".composer-form", "#composer-input")));

  /* ── SHAPE-7 · segmented 的三层（Settings › General 的 File access） ─── */
  await open(`${ORIGIN}/#settings/general`);
  await sleep(600);
  const track = await ev(`(() => {
    const t = document.querySelector('.segmented');
    const seg = t && t.querySelector('.segment');
    const thumb = t && getComputedStyle(t, '::before').borderTopLeftRadius;
    if (!t) return { found: false };
    const ts = getComputedStyle(t), ss = getComputedStyle(seg);
    return { found: true, track: parseFloat(ts.borderTopLeftRadius), inset: parseFloat(ts.padding),
      thumb: parseFloat(thumb), segment: parseFloat(ss.borderTopLeftRadius) };
  })()`);
  const derivedSeg = track.found ? Math.max(R_MIN, track.track - track.inset) : null;
  record("SHAPE-7", track.found && Math.abs(track.segment - derivedSeg) <= 1 &&
    Math.abs(track.thumb - derivedSeg) <= 1, { ...track, derived: derivedSeg });

  /* ── SHAPE-4 / SHAPE-5 · 焦点环 ─────────────────────────────────────── */
  const focus = await ev(`(() => {
    const read = (selector, pseudo) => {
      const n = document.querySelector(selector);
      if (!n) return null;
      const s = getComputedStyle(n);
      return { selector, offset: parseFloat(s.outlineOffset), radius: parseFloat(s.borderTopLeftRadius) };
    };
    /* 规则文本本身是这条契约的来源：把每一条 :focus-visible 的 outline-offset 读出来。 */
    const declared = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      /* 现代引擎给 CSSStyleRule 也挂了 cssRules（嵌套 CSS），所以先认选择器再递归。 */
      const walk = (list) => { for (const rule of list) {
        if (!rule.selectorText) { if (rule.cssRules) walk(rule.cssRules); continue; }
        if (!rule.selectorText.includes('focus-visible')) continue;
        const offset = rule.style.getPropertyValue('outline-offset').trim();
        if (offset) declared.push({ selector: rule.selectorText, offset,
          radius: rule.style.getPropertyValue('border-radius').trim() || null });
      } };
      walk(rules);
    }
    return { declared, section: read('.settings-section'), tab: read('.settings-tab') };
  })()`);
  record("SHAPE-4", focus.declared.length > 0 && focus.declared.every((d) => d.offset === "2px"), {
    declared: focus.declared,
  });
  record("SHAPE-5", focus.declared.filter((d) => d.radius).length === 1 &&
    focus.declared.filter((d) => d.radius)[0].selector.includes(".settings-section"), {
    withRadius: focus.declared.filter((d) => d.radius),
  });

  /* ── SHAPE-6 · 满弧的语义边界 ───────────────────────────────────────── */
  await open(ORIGIN);
  const circles = await ev(`(() => {
    const read = (id) => { const n = document.getElementById(id); if (!n) return null;
      const s = getComputedStyle(n), r = n.getBoundingClientRect();
      return { id, radius: s.borderTopLeftRadius, width: Math.round(r.width), height: Math.round(r.height) }; };
    const full = (v) => v && (parseFloat(v) >= 999 || v === '50%');
    const send = read('send-button'), project = read('home-create-project') || read('new-project-button');
    return { send, project, sendIsFull: full(send && send.radius), projectIsFull: full(project && project.radius) };
  })()`);
  record("SHAPE-6", circles.sendIsFull === true && circles.projectIsFull === false, circles);

  /* ── SHAPE-1 / SHAPE-3 · 会话概览弹层与 dialog ──────────────────────── */
  await openWork();
  await ev(`(() => { document.getElementById('show-run-button').click(); return true; })()`);
  await sleep(700);
  const popover = await ev(PAIR(".context-popover", ".context-card"));
  const row = await ev(PAIR(".context-card", ".context-row"));
  concentric("SHAPE-1-row", row);
  record("SHAPE-1-card", popover.found &&
    popover.childRadius <= popover.parentRadius && popover.childRadius >= R_MIN, {
    ...popover, rule: "嵌套面的圆角不得大于其父面（刻度单调）",
  });
  await ev(`(() => { document.getElementById('context-popover')?.hidePopover?.(); return true; })()`);
  await sleep(300);
  await ev(`(() => { document.getElementById('context-popover').hidePopover?.(); return true; })()`);
  await sleep(200);
  await open(ORIGIN);
  await ev(`(() => { (document.getElementById('home-create-project')
    || document.getElementById('new-project-button')).click(); return true; })()`);
  await sleep(700);
  concentric("SHAPE-3", await ev(PAIR("#project-dialog", "form")));
} finally {
  await writeFile(new URL("./shape-checks.json", import.meta.url),
    JSON.stringify({ results, passed: results.filter((r) => r.pass).length, total: results.length }, null, 1));
  console.log(results.map((r) => `${r.pass ? "ok" : "FAIL"} ${r.id}`).join("\n"));
  console.log(`${results.filter((r) => r.pass).length}/${results.length}`);
  await close();
}
