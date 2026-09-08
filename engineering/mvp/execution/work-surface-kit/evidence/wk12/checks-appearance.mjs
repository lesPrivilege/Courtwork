/* WO-WK12 · Appearance 五行、用户 token 集与本设备持久化。用法：
 * APP_URL=http://127.0.0.1:8881 WK6_CDP_PORT=19692 node checks-appearance.mjs */
import { cdp, ev, check, viewport, media, go, reload, clearPrefs, report, close, seed, VALID_SET, BAD_SET, sleep } from "./harness.mjs";

try {
  /* 首帧探针：在任何页面脚本之前装上，第一帧回调里记下根元素的外观属性。
     属性在第一帧就已在场 = 偏好在首次绘制前应用，没有先默认后跳变。 */
  /* 无闪跳的判据要确定，不能靠帧的时序：<body> 出现严格晚于 <head> 解析完，
     所以只要 body 一进文档，根元素上就已经带着外观属性，就没有任何东西能先按默认值
     画一遍。用 MutationObserver 抓 body 插入的那一刻，document 一定已经存在。 */
  await cdp("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.__atBody=null;const read=()=>({readyState:document.readyState,boot:typeof window.__cwPrefs,bootValue:(window.__cwPrefs?JSON.stringify(window.__cwPrefs.value):'none'),stored:(()=>{try{return window.__cwPrefs?(localStorage.getItem(window.__cwPrefs.key)||'empty'):'nokey'}catch(e){return 'err'}})(),theme:document.documentElement.getAttribute('data-theme'),size:document.documentElement.getAttribute('data-text-size'),skin:document.documentElement.getAttribute('data-skin'),mono:getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim().slice(0,16)});const obs=new MutationObserver(()=>{if(document.body&&!window.__atBody){window.__atBody=read();obs.disconnect();}});obs.observe(document,{childList:true,subtree:true});`,
  });
  const { api, session } = await seed();
  await viewport(1440);
  await media("light");
  await go();
  await clearPrefs();
  await go("#settings/appearance");

  const pick = (name, value) =>
    ev(`(()=>{const i=document.getElementById('${name}-${value}');i.click();return i.checked})()`);
  const skin = (value) =>
    ev(`(()=>{const s=document.querySelector('#settings-appearance select');s.value='${value}';s.dispatchEvent(new Event('change'));return s.value})()`);
  const roots = () =>
    ev(`(()=>{const s=getComputedStyle(document.documentElement);return{
      theme: document.documentElement.getAttribute('data-theme'),
      skin: document.documentElement.getAttribute('data-skin'),
      size: document.documentElement.getAttribute('data-text-size'),
      motion: document.documentElement.getAttribute('data-motion'),
      fontSize: s.fontSize,
      paper: s.getPropertyValue('--paper').trim(),
      accent: s.getPropertyValue('--accent-9').trim(),
      mono: s.getPropertyValue('--font-mono').trim(),
      previewBg: getComputedStyle(document.querySelector('.settings-preview-surface')).backgroundColor,
      tabTransition: getComputedStyle(document.querySelector('.settings-tab')).transitionDuration,
      rowTitles: [...document.querySelectorAll('#settings-appearance .settings-row-title')].map(n=>n.textContent),
      previews: document.querySelectorAll('#settings-appearance .settings-preview').length,
      previewRow: document.querySelector('.settings-preview .flow-row .flow-title')?.textContent,
      previewMeta: document.querySelector('.settings-preview .flow-row .flow-meta')?.textContent,
      diffLines: [...document.querySelectorAll('.settings-preview .diff-line')].map(n=>n.dataset.diff),
    }})()`);

  const base = await roots();
  check(
    "A0 · Appearance 五行，四行下方各一块真实产品片段预览（Chat Flow 行 + 带 diff 的代码块）",
    base.rowTitles.join() === "Scheme,Skin,Text size,Code font,Reduced motion" &&
      base.previews === 4 && base.previewRow.startsWith("ws_write") &&
      base.previewMeta === "Completed" && base.diffLines.slice(0, 4).join() === "same,del,add,same" &&
      base.diffLines.length === 16,
    { rowTitles: base.rowTitles, previews: base.previews, diff: base.diffLines },
  );

  await pick("settings-scheme", "dark");
  const dark = await roots();
  check(
    "A1 · Scheme 写 data-theme，预览随之即时重画",
    dark.theme === "dark" && dark.previewBg !== base.previewBg,
    { light: base.previewBg, dark: dark.previewBg },
  );
  await pick("settings-scheme", "light");

  await pick("settings-text-size", "large");
  const large = await roots();
  await pick("settings-text-size", "small");
  const small = await roots();
  await pick("settings-text-size", "medium");
  check(
    "A2 · Text size 一个根变量带动整条字号阶梯",
    parseFloat(large.fontSize) > parseFloat(base.fontSize) && parseFloat(small.fontSize) < parseFloat(base.fontSize),
    { small: small.fontSize, medium: base.fontSize, large: large.fontSize },
  );

  const font = (value) =>
    ev(`(()=>{const i=[...document.querySelectorAll('#settings-appearance input[type=text]')][0];i.value=${JSON.stringify(value)};i.dispatchEvent(new Event('change'));return true})()`);
  await font("Courier New");
  const withFont = await roots();
  await font("oops; }");
  const badFont = await ev(`(()=>({
    error: [...document.querySelectorAll('#settings-appearance .inline-error')].filter(n=>!n.hidden).map(n=>n.textContent)[0] || '',
    mono: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim(),
  }))()`);
  check(
    "A3 · Code font 写进 --font-mono 前缀；不是字体名的输入被拒绝，旧值不动",
    withFont.mono.startsWith("Courier New") && badFont.mono.startsWith("Courier New") && badFont.error.length > 0,
    { applied: withFont.mono.slice(0, 40), afterBad: badFont.mono.slice(0, 40), error: badFont.error },
  );
  await font("");

  await pick("settings-motion", "reduce");
  const reduced = await roots();
  check(
    "A4 · Reduced motion 强制档把过渡停到 0s（系统未设 reduce 时）",
    reduced.motion === "reduce" && reduced.tabTransition.split(",").every((d) => parseFloat(d) === 0) &&
      base.tabTransition.split(",").some((d) => parseFloat(d) > 0),
    { forced: reduced.tabTransition, default: base.tabTransition },
  );
  await pick("settings-motion", "system");

  await skin("gray-steel");
  const steel = await roots();
  check(
    "A5 · Skin 只换 Tier S：token 的值变了，行、状态词与控件一字不变",
    steel.skin === "gray-steel" && steel.accent !== base.accent && steel.paper !== base.paper &&
      steel.rowTitles.join() === base.rowTitles.join() && steel.previewMeta === base.previewMeta,
    { base: { accent: base.accent, paper: base.paper }, steel: { accent: steel.accent, paper: steel.paper } },
  );
  await skin("slate");
  await skin("custom");
  const requested = await ev(`(()=>({
    editor: !document.querySelector('.skin-editor').hidden,
    skin: document.documentElement.getAttribute('data-skin'),
    state: document.querySelector('.skin-editor .settings-row-help:last-of-type')?.textContent || '',
  }))()`);
  check(
    "A6 · 选中「你的 token」只露出编辑框；校验通过之前不改变生效的 skin（请求值 ≠ 有效值）",
    requested.editor && requested.skin === null,
    requested,
  );

  await ev(`(()=>{document.querySelector('.skin-input').value=${JSON.stringify(BAD_SET)};return true})()`);
  await ev(`[...document.querySelectorAll('.skin-editor button')].find(b=>b.textContent.includes('Apply')).click()`);
  await sleep(200);
  const rejected = await ev(`(()=>({
    problems: [...document.querySelectorAll('.skin-error-list li')].map(n=>n.textContent),
    skin: document.documentElement.getAttribute('data-skin'),
    paper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
  }))()`);
  check(
    "A7 · 用户 token 集不通过时逐行指出并整体拒绝，一个字节都不落地",
    rejected.problems.length === 3 &&
      rejected.problems.some((p) => p.includes("Line 2") && p.includes("--nope")) &&
      rejected.problems.some((p) => p.includes("Line 3")) &&
      rejected.problems.some((p) => p.includes("Line 4")) &&
      rejected.skin === null && rejected.paper === base.paper,
    rejected,
  );

  await ev(`(()=>{document.querySelector('.skin-input').value=${JSON.stringify(VALID_SET)};return true})()`);
  await ev(`[...document.querySelectorAll('.skin-editor button')].find(b=>b.textContent.includes('Apply')).click()`);
  await sleep(250);
  const accepted = await roots();
  check(
    "A8 · 通过时应用并持久化：一组 Tier S token 就是一个 skin",
    accepted.skin === "custom" && accepted.paper === "#fffdf7" &&
      accepted.rowTitles.join() === base.rowTitles.join(),
    { skin: accepted.skin, paper: accepted.paper },
  );

  await pick("settings-text-size", "large");
  await pick("settings-scheme", "dark");
  await go("#settings/appearance");
  /* 「首帧之前」的判据：任何一帧只要已经有 body 内容可画，属性就必须已经在场。
     headless 的第一帧可能早在 head 还没解析完时就发生，那一帧 body 还不存在，
     什么也没画，所以它不构成闪跳。 */
  /* 一次求值里取齐：帧记录、当前属性与存储，避免跨文档读到两份状态。 */
  const boot = await ev(`(()=>({
    atBody: window.__atBody,
    theme: document.documentElement.getAttribute('data-theme'),
    skin: document.documentElement.getAttribute('data-skin'),
    size: document.documentElement.getAttribute('data-text-size'),
    key: window.__cwPrefs.key,
    stored: JSON.parse(localStorage.getItem(window.__cwPrefs.key) || 'null'),
    headScripts: [...document.head.querySelectorAll('script')].map(n=>({inline:!n.getAttribute('src'),defer:n.hasAttribute('defer'),async:n.hasAttribute('async')})),
  }))()`);
  const painted = boot.atBody;
  check(
    "A9 · 偏好由 head 里的同步脚本应用，重载后原样生效；键按工作区区分，值只在本设备",
    boot.theme === "dark" && boot.skin === "custom" && boot.size === "large" &&
      boot.headScripts.some((n) => n.inline && !n.defer && !n.async) &&
      boot.stored?.skin === "custom" && boot.key.startsWith("cw:prefs:"),
    /* atBodyInsertion 是观察项不是断言：本机 headless 的浏览器进程偶尔让新文档在
       document-start 时读到空的 localStorage（见 harness 抬头），首帧断言另放在
       checks-noflash.mjs 的最短序列里跑。 */
    { current: { theme: boot.theme, skin: boot.skin, size: boot.size }, key: boot.key, atBodyInsertion: painted },
  );
  const serverSession = JSON.stringify(await api(`/sessions/${session.id}`));
  const serverInfo = JSON.stringify(await api("/runtime-info"));
  check(
    "A10 · 服务器一侧没有多出任何外观字段：偏好不进 runtime-state，也没有新后端",
    !/customSkin|textSize|codeFont|"skin"/.test(serverSession + serverInfo),
    { sessionHasAppearance: /customSkin|textSize/.test(serverSession) },
  );

  /* 复位，后面的脚本从默认外观开始。 */
  await clearPrefs();
  await report(import.meta.url, "checks-appearance");
} catch (error) {
  console.error("checks-appearance failed:", error);
  process.exitCode = 1;
} finally {
  await close();
}
