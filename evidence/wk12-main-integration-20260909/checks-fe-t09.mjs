/* WO-WK12 · 反例 FE-T09（frontend-layering-spec §7；条款 FN-09 / 10 / 27 / 29）
 * 换获准 skin、换字号、窄屏、缩放、强制 reduced motion —— 状态词与合法动作必须一模一样，
 * 焦点与命中区仍然可用。用法：
 * APP_URL=http://127.0.0.1:8881 WK6_CDP_PORT=19696 node checks-fe-t09.mjs */
import { ev, check, viewport, media, go, clearPrefs, report, close, seed, sleep, VALID_SET } from "./harness.mjs";

/* 签名只取「事实与合法动作」：行的标题与说明、控件的种类与可用性、按钮的可及名与
 * 可用性、Planned 行、Home 的三个计数与状态词。刻意不取任何被选中的值 —— 换 skin 的
 * 目的就是让它变，变的是外观不是事实。 */
const SIGNATURE = `(()=>{
  const clean = (t) => (t||'').replace(/\\s+/g,' ').trim();
  const page = document.getElementById('settings-page');
  const rows = [...page.querySelectorAll('.settings-row')].map(r => {
    const control = r.querySelector('.settings-row-control *');
    return [
      clean(r.querySelector('.settings-row-title')?.textContent),
      clean(r.querySelector('.settings-row-help')?.textContent),
      control ? control.tagName + (control.type ? ':' + control.type : '') : 'none',
      String(control?.disabled ?? false),
    ].join('|');
  });
  const buttons = [...page.querySelectorAll('button')].map(b =>
    clean(b.getAttribute('aria-label') || b.textContent) + ':' + b.disabled);
  const planned = [...page.querySelectorAll('.planned-row')].map(n => clean(n.textContent));
  const keys = [...page.querySelectorAll('.settings-key-row')].map(n => clean(n.textContent));
  return JSON.stringify({ rows, buttons, planned, keys });
})()`;
const HOME = `(()=>{
  const clean = (t) => (t||'').replace(/\\s+/g,' ').trim();
  return JSON.stringify({
    tiles: [...document.querySelectorAll('.home-stat')].map(n => clean(n.getAttribute('aria-label')) + '=' + clean(n.querySelector('.stat-value')?.textContent)),
    planned: [...document.querySelectorAll('.home-planned')].map(n => clean(n.textContent)),
    rows: [...document.querySelectorAll('#message-stream .flow-row')].map(n => clean(n.textContent)),
    composer: [...document.querySelectorAll('#composer-area button')].map(b => clean(b.getAttribute('aria-label') || b.textContent) + ':' + b.disabled),
  });
})()`;
const FOCUS = `(()=>{
  /* 焦点环可见，且焦点控件的中心点没有被任何悬浮层完全盖住（2.4.11 的本地更严目标）。 */
  const active = document.activeElement;
  const r = active.getBoundingClientRect();
  const hit = document.elementFromPoint(Math.round(r.left + r.width/2), Math.round(r.top + r.height/2));
  /* 「焦点可见」按体例是环、边框色或外发光任一项与失焦时不同：输入类控件的焦点样式
     不是 outline，而是 border-color 加一圈 box-shadow（styles.css :focus-visible）。 */
  const read = (n) => { const s = getComputedStyle(n); return s.outlineStyle + '|' + s.outlineWidth + '|' + s.boxShadow + '|' + s.borderColor; };
  const focused = read(active);
  active.blur();
  const blurred = read(active);
  active.focus();
  return {
    id: active.id, w: Math.round(r.width), h: Math.round(r.height),
    covered: !(hit === active || active.contains(hit) || hit?.contains(active)),
    outline: focused !== blurred,
    focused, blurred,
  };
})()`;

try {
  await seed();
  const conditions = [];
  const capture = async (label, prepare) => {
    await viewport(label.width ?? 1440, (label.width ?? 1440) < 768 ? 780 : 900);
    await media(label.theme ?? "light");
    await go();
    await clearPrefs();
    await go("#settings/appearance");
    if (prepare) await prepare();
    await go();
    await sleep(400);
    const home = await ev(HOME);
    await go("#settings/general");
    const signature = await ev(SIGNATURE);
    /* 窄屏与缩放下导航折成顶部下拉，那一档的键盘入口就是下拉本身。 */
    await ev(`(()=>{const nav=document.getElementById('settings-nav');
      const target = nav.offsetParent !== null ? document.getElementById('settings-tab-general') : document.getElementById('settings-nav-select');
      target.focus(); return target.id})()`);
    const focus = await ev(FOCUS);
    const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    conditions.push({ label: label.name, width: label.width ?? 1440, signature, home, focus, overflow });
    return { signature, home, focus, overflow };
  };
  const pick = (name, value) => ev(`document.getElementById('${name}-${value}').click()`);
  const skin = (v) => ev(`(()=>{const s=document.querySelector('#settings-appearance select');s.value='${v}';s.dispatchEvent(new Event('change'));return s.value})()`);

  const baseline = await capture({ name: "baseline · slate · medium · 1440 · light" });
  await capture({ name: "skin gray-steel" }, () => skin("gray-steel"));
  await capture({ name: "skin user tokens" }, async () => {
    await skin("custom");
    await ev(`(()=>{document.querySelector('.skin-input').value=${JSON.stringify(VALID_SET)};return true})()`);
    await ev(`[...document.querySelectorAll('.skin-editor button')].find(b=>b.textContent.includes('Apply')).click()`);
    await sleep(250);
  });
  await capture({ name: "text size large" }, () => pick("settings-text-size", "large"));
  await capture({ name: "text size small" }, () => pick("settings-text-size", "small"));
  await capture({ name: "reduced motion forced" }, () => pick("settings-motion", "reduce"));
  await capture({ name: "dark scheme", theme: "dark" });
  await capture({ name: "narrow 390" , width: 390 });
  await capture({ name: "zoom 200 %", width: 720 });

  const differing = conditions.filter((c) => c.signature !== baseline.signature).map((c) => c.label);
  check(
    "FE-T09 (a) · 换 skin、换字号、窄屏、缩放、强制 reduced motion：Settings 的行、说明、控件种类、可用性与 Planned 行一字不差",
    differing.length === 0,
    { differing, conditions: conditions.length },
  );
  const homeDiffering = conditions.filter((c) => c.home !== baseline.home).map((c) => c.label);
  check(
    "FE-T09 (b) · 同样九种条件下，Home 的三个计数、状态词与合法动作一字不差",
    homeDiffering.length === 0,
    { homeDiffering, baselineHome: JSON.parse(baseline.home) },
  );
  const floor = (c) => (c.width < 768 ? 44 : 32);
  const focusProblems = conditions.filter((c) => c.focus.covered || !c.focus.outline || c.focus.h < floor(c));
  check(
    "FE-T09 (c) · 每种条件下焦点仍可见、未被悬浮层遮住，命中区不低于本地下限（桌面 32 / 窄屏 44）",
    focusProblems.length === 0,
    { focusProblems: focusProblems.map((c) => ({ label: c.label, ...c.focus })) },
  );
  const overflowing = conditions.filter((c) => c.overflow > 1).map((c) => ({ label: c.label, overflow: c.overflow }));
  check("FE-T09 (d) · 每种条件下都不横向溢出", overflowing.length === 0, overflowing);

  await report(import.meta.url, "checks-fe-t09", {
    note: "密度与模块顺序两项自定义本轮未实现（frontend-layering-spec §3 列为「可以」，无消费者前不排单），因此本反例以 skin、字号、宗、窄屏、缩放、强制 reduced motion 六种变更代替。",
    conditions: conditions.map((c) => ({ label: c.label, focus: c.focus, overflow: c.overflow })),
  });
} catch (error) {
  console.error("checks-fe-t09 failed:", error);
  process.exitCode = 1;
} finally {
  await close();
}
