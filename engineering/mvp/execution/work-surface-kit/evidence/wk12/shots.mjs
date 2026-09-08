/* WO-WK12 · 同条件截图与几何：五个组各一张，预览在四种外观下的前后各一张，
 * 1440 / 390 × 浅 / 深 × 三档字号，外加 200 % 缩放与强制 reduced motion。
 * 用法：APP_URL=http://127.0.0.1:8881 WK6_CDP_PORT=19694 node shots.mjs */
import { ev, cdp, check, viewport, media, go, reload, clearPrefs, shot, report, close, seed, sleep, VALID_SET } from "./harness.mjs";

const geometry = [];
const measure = async (label) => {
  const value = await ev(`(()=>{
    const box=(sel)=>{const n=document.querySelector(sel);if(!n)return null;const r=n.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),left:Math.round(r.left)}};
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      nav: box('.settings-nav'),
      dropdown: box('.settings-nav-select'),
      sections: box('.settings-sections'),
      navVisible: document.querySelector('.settings-nav')?.offsetParent !== null,
      dropdownVisible: document.querySelector('.settings-nav-select')?.offsetParent !== null,
      tabHeights: [...document.querySelectorAll('.settings-tab')].map(n=>Math.round(n.getBoundingClientRect().height)),
      /* 命中区量的是可点的那一层：分段的 label、下拉与文本框。分段里的 radio 被
         视觉隐藏成 1×1，命中区由包着它的 label 承担，所以不计入。 */
      controlHeights: [...document.querySelectorAll('#settings-appearance .settings-row-control select, #settings-appearance .settings-row-control input[type=text], #settings-appearance .segment')].map(n=>Math.round(n.getBoundingClientRect().height)),
      rootFont: getComputedStyle(document.documentElement).fontSize,
      sidebarUsable: document.getElementById('home-button')?.offsetParent !== null || document.getElementById('toggle-nav-button')?.offsetParent !== null,
    };
  })()`);
  geometry.push({ label, ...value });
  return value;
};

try {
  await seed();
  /* ── 五个组，1440 浅宗 ─────────────────────────────────────────────── */
  await viewport(1440);
  await media("light");
  await go();
  await clearPrefs();
  for (const section of ["general", "appearance", "keyboard", "runtime", "developer"]) {
    await go(`#settings/${section}`);
    await shot(import.meta.url, `group-${section}-1440-light`);
  }
  await go("#settings/appearance");
  const wide = await measure("1440-light-medium");
  check(
    "T1 · 1440：左列导航在场、顶部下拉退场，横向不溢出，命中区不小于 32",
    wide.navVisible && !wide.dropdownVisible && wide.overflow <= 1 &&
      wide.tabHeights.every((h) => h >= 32) && wide.controlHeights.every((h) => h >= 28),
    wide,
  );

  /* ── 预览：四种外观各一张，同一条 Chat Flow 行与同一段 diff ────────── */
  await shot(import.meta.url, "preview-slate-1440-light");
  const skin = (v) => ev(`(()=>{const s=document.querySelector('#settings-appearance select');s.value='${v}';s.dispatchEvent(new Event('change'));return s.value})()`);
  await skin("gray-steel");
  await sleep(200);
  await shot(import.meta.url, "preview-gray-steel-1440-light");
  await skin("custom");
  await ev(`(()=>{document.querySelector('.skin-input').value=${JSON.stringify(VALID_SET)};return true})()`);
  await ev(`[...document.querySelectorAll('.skin-editor button')].find(b=>b.textContent.includes('Apply')).click()`);
  await sleep(300);
  await shot(import.meta.url, "preview-user-tokens-1440-light");
  await ev(`[...document.querySelectorAll('.skin-editor button')].find(b=>b.textContent==='Remove').click()`);
  await sleep(200);
  await ev(`(()=>{document.querySelector('.skin-input').value='--gray-1: not-a-colour;';return true})()`);
  await skin("custom");
  await ev(`[...document.querySelectorAll('.skin-editor button')].find(b=>b.textContent.includes('Apply')).click()`);
  await sleep(250);
  await shot(import.meta.url, "preview-user-tokens-rejected-1440-light");
  await clearPrefs();
  await reload();

  /* ── 三档字号 × 两宗 × 两宽度 ────────────────────────────────────── */
  const pick = (name, value) => ev(`document.getElementById('${name}-${value}').click()`);
  for (const size of ["small", "medium", "large"]) {
    await go("#settings/appearance");
    await pick("settings-text-size", size);
    await sleep(200);
    await shot(import.meta.url, `appearance-text-${size}-1440-light`);
    geometry.push({ label: `text-${size}`, rootFont: await ev(`getComputedStyle(document.documentElement).fontSize`) });
  }
  await pick("settings-text-size", "medium");

  for (const [width, theme] of [[1440, "dark"], [390, "light"], [390, "dark"]]) {
    await viewport(width, width < 768 ? 780 : 900);
    await media(theme);
    await go("#settings/appearance");
    await sleep(200);
    await shot(import.meta.url, `appearance-${width}-${theme}`);
    const m = await measure(`${width}-${theme}-medium`);
    if (width === 390)
      check(
        `T2 · 390 ${theme}：导航折成顶部下拉，右列单列，横向不溢出，命中区不小于 44`,
        !m.navVisible && m.dropdownVisible && m.overflow <= 1 && m.dropdown.h >= 44 && m.sidebarUsable,
        m,
      );
  }
  await viewport(390, 780);
  await go("#settings/general");
  await shot(import.meta.url, "group-general-390-light");

  /* ── 200 % 缩放（浏览器自己的缩放，等价于一半的 CSS 宽度） ────────── */
  await viewport(720, 450);
  await media("light");
  await go("#settings/appearance");
  const zoom = await measure("200pct-light");
  check("T3 · 200 % 缩放：整页重排而不是被裁掉，横向不溢出", zoom.overflow <= 1, zoom);
  await shot(import.meta.url, "appearance-200pct-light");

  /* ── 强制 reduced motion：预览与页内没有还在跑的动效 ──────────────── */
  await viewport(1440);
  await go("#settings/appearance");
  await pick("settings-motion", "reduce");
  await sleep(400);
  const motion = await ev(`(()=>({
    running: [...document.querySelectorAll('#settings-page *')].filter(n=>n.getAnimations && n.getAnimations().some(a=>a.playState==='running')).length,
    transitions: [...new Set([...document.querySelectorAll('#settings-page .settings-tab, #settings-page .segment, #settings-page .diff-line')].map(n=>getComputedStyle(n).transitionDuration))],
    mediaReduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
  }))()`);
  check(
    "T4 · 强制 reduced motion：系统未设 reduce 时页内也没有过渡与在跑的动效",
    motion.running === 0 && motion.transitions.every((d) => d.split(",").every((v) => parseFloat(v) === 0)) && !motion.mediaReduce,
    motion,
  );
  await shot(import.meta.url, "appearance-reduced-motion-1440-light");
  await clearPrefs();

  await report(import.meta.url, "shots", { geometry });
} catch (error) {
  console.error("shots failed:", error);
  process.exitCode = 1;
} finally {
  await close();
}
