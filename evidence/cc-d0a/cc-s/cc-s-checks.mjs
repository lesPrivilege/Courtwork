/* CC-S · 第 0 项的运行断言（WK-115 ① ②）。全部状态经产品自己的控件与 /api/v5
 * 到达，没有向 store 直写，没有 stub。`unknown` 终态由宿主自己的重启恢复给出
 * （见 cc-s-seed.mjs 的说明），不是被写进去的。
 *
 *   APP_URL=http://127.0.0.1:8905 WK6_CDP_PORT=20041 node evidence/cc-s/cc-s-checks.mjs
 */
import { evaluate as ev, key, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { cdp } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const state = "window.__V5_UI__.state";
const results = [];
const check = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(`${pass ? "PASS" : "FAIL"} · ${name} · ${JSON.stringify(actual)?.slice(0, 600)}`);
};
const openSession = (title) =>
  ev(`(async () => {
    document.querySelectorAll('#project-list .project-toggle').forEach(t => { if (t.getAttribute('aria-expanded') === 'false') t.click(); });
    await new Promise(r => setTimeout(r, 600));
    const button = [...document.querySelectorAll('#project-list .session-button')].find(b => b.textContent.includes(${JSON.stringify(title)}));
    if (!button) throw new Error('no chat named ' + ${JSON.stringify(title)});
    button.click();
    await new Promise(r => setTimeout(r, 1600));
  })()`);

try {
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(700);

  /* ------------------------------------------------------------------ 1
   * Home 下带是一条 role=list，行是它的 listitem。 */
  const homeLists = await ev(`(() => {
    const lists = [...document.querySelectorAll('#message-stream [role="list"]')];
    return {
      lists: lists.length,
      items: lists.map(l => l.querySelectorAll(':scope > [role="listitem"]').length),
      navItemsOutsideAList: [...document.querySelectorAll('#message-stream [data-nav-item]')]
        .filter(n => !n.closest('[role="listitem"]')).length,
      rowsAreButtonsOrArticles: [...document.querySelectorAll('#message-stream [role="listitem"] > *')]
        .every(n => ['BUTTON','ARTICLE'].includes(n.tagName)),
    };
  })()`);
  check(
    "Home 下带是一条列表：role=list 在包着行的那一层，行本身仍是按钮 / article",
    homeLists.lists >= 1 &&
      homeLists.items.every(n => n > 0) &&
      homeLists.navItemsOutsideAList === 0 &&
      homeLists.rowsAreButtonsOrArticles === true,
    homeLists,
  );

  /* ------------------------------------------------------------------ 2
   * Home / End 走到这条列表的两端，且只在焦点已经在列表里时接管。 */
  const before = await ev(`(() => {
    const items = [...document.querySelectorAll('#message-stream [data-nav-item]')];
    document.body.focus();
    return { count: items.length, active: document.activeElement?.tagName };
  })()`);
  await key({ code: "End", keyCode: 35 });
  await sleep(200);
  const outside = await ev(`document.activeElement?.hasAttribute('data-nav-item') === true`);
  await ev(`document.querySelector('#message-stream [data-nav-item]').focus(), true`);
  await key({ code: "End", keyCode: 35 });
  await sleep(250);
  const atEnd = await ev(`(() => {
    const items = [...document.querySelectorAll('#message-stream [data-nav-item]')];
    return { index: items.indexOf(document.activeElement.closest('[data-nav-item]')), last: items.length - 1 };
  })()`);
  await key({ code: "Home", keyCode: 36 });
  await sleep(250);
  const atHome = await ev(`(() => {
    const items = [...document.querySelectorAll('#message-stream [data-nav-item]')];
    return { index: items.indexOf(document.activeElement.closest('[data-nav-item]')) };
  })()`);
  check(
    "Home / End 到列表两端；焦点不在列表里时不接管",
    before.count >= 2 && outside === false && atEnd.index === atEnd.last && atHome.index === 0,
    { rows: before.count, tookOverFromOutside: outside, atEnd, atHome },
  );

  /* ------------------------------------------------------------------ 3
   * 没有 result 的工具行：Run 终态 unknown → Unknown，不是 Interrupted。 */
  await openSession("Unknown run");
  await sleep(600);
  const unknown = await ev(`(() => {
    const rows = [...document.querySelectorAll('#message-stream .tool-card')].map(d => ({
      text: d.querySelector('summary').textContent.replace(/\\s+/g,' ').trim(),
      meta: (d.querySelector('summary .flow-meta')||{}).textContent || '',
    }));
    return {
      runStatuses: ${state}.runs.map(r => r.status),
      rows,
      group: [...document.querySelectorAll('.activity-group > summary')].map(n => n.textContent.replace(/\\s+/g,' ').trim()),
    };
  })()`);
  check(
    "Run 终态 unknown 且工具无 result → 状态词是 Unknown",
    unknown.runStatuses.includes("unknown") &&
      unknown.rows.some(r => r.meta === "Unknown") &&
      unknown.rows.every(r => r.meta !== "Interrupted") &&
      unknown.group.every(g => !g.includes("Interrupted")),
    unknown,
  );

  /* ------------------------------------------------------------------ 4
   * Chat Flow 的未决卡是另一条 role=list，与 Home 那条不是同一条。 */
  await openSession("Approval card");
  await ev(`(async () => {
    const composer = document.getElementById('composer-input');
    composer.value = '/fixture script [{"name":"ws_write","arguments":{"path":"out/b.txt","text":"y"}}]';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    document.getElementById('send-button').click();
  })()`);
  await waitFor(`document.querySelector('#message-stream .permission-card') !== null`, 30000);
  await sleep(400);
  const pending = await ev(`(() => {
    const list = document.querySelector('#message-stream .pending-list');
    return {
      role: list?.getAttribute('role') ?? null,
      items: list ? [...list.children].map(n => n.getAttribute('role')) : [],
      cardInsideItem: Boolean(document.querySelector('#message-stream [role="listitem"] > .permission-card')),
      homeListPresent: Boolean(document.querySelector('#message-stream .home-list')),
      nonCardRowsOutside: [...document.querySelectorAll('#message-stream .message-list > *')]
        .filter(n => n.classList.contains('pending-list')).length,
    };
  })()`);
  check(
    "Chat Flow 未决卡是自己的一条 role=list，Home 那条不在场（两条列表不合并）",
    pending.role === "list" &&
      pending.items.length > 0 &&
      pending.items.every(r => r === "listitem") &&
      pending.cardInsideItem === true &&
      pending.homeListPresent === false,
    pending,
  );
} finally {
  await writeFile(new URL("./cc-s-checks.json", import.meta.url), JSON.stringify(results, null, 2));
  await close();
}
console.log(`${results.filter(r => r.pass).length} / ${results.length}`);
if (results.some(r => !r.pass)) process.exitCode = 1;
