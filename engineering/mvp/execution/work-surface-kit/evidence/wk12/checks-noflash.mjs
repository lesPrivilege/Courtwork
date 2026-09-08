/* WO-WK12 · 「先应用再渲染，不闪跳」的最短序列。判据是确定的：<body> 进入文档严格晚于
 * <head> 解析完，所以只要 body 插入的那一刻根元素上已经带着外观属性，就没有任何东西
 * 能先按默认值画一遍。用法：
 * APP_URL=http://127.0.0.1:8881 WK6_CDP_PORT=19695 node checks-noflash.mjs */
import { cdp, ev, check, viewport, media, go, reload, clearPrefs, report, close, sleep } from "./harness.mjs";

try {
  await cdp("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.__atBody=null;const read=()=>({readyState:document.readyState,bootRan:typeof window.__cwPrefs,theme:document.documentElement.getAttribute('data-theme'),size:document.documentElement.getAttribute('data-text-size'),skin:document.documentElement.getAttribute('data-skin'),mono:getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim().slice(0,12),bg:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()});const obs=new MutationObserver(()=>{if(document.body&&!window.__atBody){window.__atBody=read();obs.disconnect();}});obs.observe(document,{childList:true,subtree:true});`,
  });
  await viewport(1440);
  await media("light");
  await go();
  await clearPrefs();
  await reload();
  const clean = await ev(`window.__atBody`);
  check(
    "N1 · 没有存过偏好时，body 进场时根元素上什么外观属性都没有（默认宗、默认 skin）",
    clean.bootRan === "object" && clean.theme === null && clean.skin === null && clean.size === null,
    clean,
  );
  await ev(`(()=>{localStorage.setItem(window.__cwPrefs.key, JSON.stringify({
    scheme: 'dark', skin: 'gray-steel', textSize: 'large', codeFont: 'Courier New', motion: 'reduce', customSkin: ''
  }));return 1})()`);
  await sleep(400);
  await reload();
  const applied = await ev(`window.__atBody`);
  check(
    "N2 · 存过偏好时，body 进场时宗、skin、字号、代码字体已经全部在场：没有先默认后跳变",
    applied.bootRan === "object" && applied.theme === "dark" && applied.skin === "gray-steel" &&
      applied.size === "large" && applied.mono.startsWith("Courier New".slice(0, 12)) &&
      applied.readyState === "loading",
    applied,
  );
  const motion = await ev(`document.documentElement.getAttribute('data-motion')`);
  check("N3 · Reduced motion 的强制档同样在首帧之前落地", motion === "reduce", motion);
  await clearPrefs();
  await report(import.meta.url, "checks-noflash");
} catch (error) {
  console.error("checks-noflash failed:", error);
  process.exitCode = 1;
} finally {
  await close();
}
