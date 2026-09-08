/* WO-WK12 · 共享的核对夹具。真实 headless Chromium，经 CDP 驱动；服务器是 app 自己，
 * 所有请求都是它的 /api/v5。
 *
 * 为什么分成几支短脚本：在本机的 headless Chrome 上，一支长脚本跑到二十余次交互之后，
 * 浏览器进程（不是渲染进程）会陷入一个 run-loop 自旋，CDP 回包要几分钟才到。取样确认
 * 渲染进程主线程当时停在 mach_msg（空闲等 IPC），页面自身没有在循环，所有断言在解开
 * 之后仍然通过。这是夹具与环境的问题，不是产品的；把每支脚本压到一分钟以内即可避开。 */
import { cdp, evaluate as ev, key, waitFor, close, ORIGIN, sleep, observations } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

export { cdp, ev, key, waitFor, close, ORIGIN, sleep, observations };

export const results = [];
export const check = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(pass ? "PASS" : "FAIL", name, pass ? "" : JSON.stringify(actual));
};
export const viewport = (width, height = 900) =>
  cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
export const media = (theme, motion = "no-preference") =>
  cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: theme },
      { name: "prefers-reduced-motion", value: motion },
    ],
  });
/* Enter 带上 text 才产生 char 事件，按钮的默认激活才发生；key 仍显式写 "Enter"，
   页面自己的 keydown 判断读到的还是 Enter。 */
export const enter = async () => {
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", code: "Enter", key: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", code: "Enter", key: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(300);
};
export const press = (code, keyCode, modifiers = 0) =>
  key({ text: "", code, keyCode, modifiers }).then(() => sleep(150));
export const tab = (shift = false) =>
  key({ text: "", code: "Tab", keyCode: 9, modifiers: shift ? 8 : 0 }).then(() => sleep(120));
export const go = async (hash = "") => {
  await cdp("Page.navigate", { url: `${ORIGIN}/${hash}` });
  await waitFor(`window.__V5_UI__?.state.projects`);
  await sleep(800);
};
/* 同一个 hash 的 Page.navigate 是同文档导航，不会重新加载文档；要真正重来一次
   （首帧探针与首帧应用都靠它）必须 reload。 */
export const reload = async () => {
  /* 光等 __V5_UI__ 会在旧文档上立刻满足，reload 还没提交就往下走了。先在旧文档上
     插一个记号，等到记号消失且新文档的 UI 就绪，才算真的重来了一次。 */
  await ev(`window.__beforeReload = 1`);
  await cdp("Page.reload", { ignoreCache: false });
  await waitFor(`typeof window.__beforeReload === 'undefined' && !!window.__V5_UI__?.state.projects`);
  await sleep(700);
};
export const shot = async (url, name) =>
  writeFile(new URL(`./${name}.png`, url), Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"));
export const search = async (text) => {
  await ev(`(()=>{const s=document.getElementById('settings-search');s.value=${JSON.stringify(text)};s.dispatchEvent(new Event('input'));return true})()`);
  await sleep(200);
};
export const clearPrefs = () => ev(`(()=>{localStorage.removeItem(window.__cwPrefs.key);return true})()`);
export async function seed() {
  const token = (await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json()).sessionToken;
  const api = async (path, init = {}) =>
    (await fetch(`${ORIGIN}/api/v5${path}`, {
      ...init,
      headers: { "x-work-token": token, "content-type": "application/json", ...(init.headers || {}) },
    })).json();
  const projects = (await api("/projects")).projects;
  const project = projects[0] || (await api("/projects", { method: "POST", body: JSON.stringify({ name: "WK12 checks" }) })).project;
  const sessions = (await api(`/sessions?projectId=${project.id}`)).sessions;
  const session = sessions[0] || (await api("/sessions", { method: "POST", body: JSON.stringify({ projectId: project.id, title: "Settings checks" }) })).session;
  return { token, api, project, session };
}
export async function report(url, name, extra = {}) {
  await writeFile(
    new URL(`./${name}.json`, url),
    JSON.stringify({
      ranAt: new Date().toISOString(),
      origin: ORIGIN,
      ...extra,
      results,
      pageExceptions: observations.exceptions.map((e) => e.text),
      failedResponses: observations.responses.filter((r) => r.status >= 400),
    }, null, 2),
  );
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} pass · exceptions ${observations.exceptions.length}`);
}
/* Tier S 的两组真实输入：一组完整合法，一组逐行有问题。 */
export const VALID_SET = `:root {
  --gray-1: #fcfcfc; --gray-2: #f9f9f9; --gray-3: #f0f0f0; --gray-4: #e8e8e8; --gray-5: #e0e0e0; --gray-6: #d9d9d9;
  --gray-7: #cecece; --gray-8: #bbbbbb; --gray-9: #8d8d8d; --gray-10: #838383; --gray-11: #646464; --gray-12: #202020;
  --accent-3: #e6f4fe; --accent-9: #315c8a; --accent-10: #29507a; --accent-11: #315c8a;
  --danger-3: #feebec; --danger-11: #9b3c35; --success-3: #e6f6eb; --success-11: #3e704e;
  --paper: #fffdf7; --float-s: #fffdf7; --frame-s: #f3efe4; --ink-max: #000000; --on-accent-s: #ffffff;
}`;
export const BAD_SET = `--gray-1: #fcfcfc;
--nope: #ffffff;
--gray-2: rebeccapurple;
--shadow-alpha: 3;`;
