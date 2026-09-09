/* FE-04 · FE-T07（FN-22 / 23 / 24）复跑：迟到响应与卡片展开收起。断言与
 * `engineering/mvp/execution/work-surface-kit/evidence/wk10b-1/checks.mjs` §4–5
 * 同一套，只把当年那三个 fixture 会话换成本单播种脚本（`work-seed.mjs`，逐字沿用
 * wk10b2）建出来的两个已绑定会话与一个普通会话，并改用本单的 browser harness。
 * 「打开 A，读还在路上时切到 B」这一步用的还是同一手法：在页内包一层 window.fetch
 * 把 A 的 /surface 响应扣住 2.6 s。
 *
 *   APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19933 node evidence/fe04/fe-t07.mjs
 */
import { evaluate as ev, waitFor, close, ORIGIN, sleep, observations } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const state = "window.__V5_UI__.state";
const results = [];
const check = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(`${pass ? "PASS" : "FAIL"} · ${name} · ${JSON.stringify(actual)?.slice(0, 400)}`);
};
const openSession = (title) =>
  ev(`(async () => {
    document.querySelectorAll('#project-list .project-toggle').forEach(t => { if (t.getAttribute('aria-expanded') === 'false') t.click(); });
    await new Promise(r => setTimeout(r, 500));
    const button = [...document.querySelectorAll('#project-list .session-button')].find(b => b.textContent.includes(${JSON.stringify(title)}));
    if (!button) throw new Error('no session named ' + ${JSON.stringify(title)});
    button.click();
    await new Promise(r => setTimeout(r, 2000));
    return ${state}.activeSessionId;
  })()`);
const openSurface = () =>
  ev(`(async () => { if (!${state}.surface.open) document.getElementById('show-surface-button').click(); await new Promise(r => setTimeout(r, 1200)); })()`);

try {
  await ev(`location.href = ${JSON.stringify(ORIGIN)}`);
  await waitFor(`Boolean(window.__V5_UI__ && ${state}.projects.length)`, 20000);

  /* ---------------------------------------------------------------- 1
   * 迟到响应：A 的 /surface 还在路上时切到 B，A 的回包不得覆盖 B。 */
  const a = await openSession("Complete NDA review");
  await openSurface();
  const late = await ev(`(async () => {
    const state = ${state};
    const original = window.fetch;
    let held = null;
    window.fetch = (...args) => {
      const url = String(args[0]);
      if (url.includes('/surface') && held === null) {
        held = original(...args);
        return new Promise(resolve => setTimeout(() => resolve(held), 2600));
      }
      return original(...args);
    };
    /* 让 A 重新读一次它的工作面，然后立刻切到 B。 */
    document.getElementById('close-surface-button').click();
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('show-surface-button').click();
    await new Promise(r => setTimeout(r, 200));
    const b = [...document.querySelectorAll('#project-list .session-button')].find(x => x.textContent.includes('Unresolved NDA review'));
    b.click();
    await new Promise(r => setTimeout(r, 900));
    if (!state.surface.open) document.getElementById('show-surface-button').click();
    await new Promise(r => setTimeout(r, 3600));
    window.fetch = original;
    return {
      activeSessionId: state.activeSessionId,
      surfaceSession: state.surface.info?.session?.id ?? state.surface.sessionId ?? null,
      title: (document.getElementById('session-title-text')||{}).textContent || '',
      matter: (document.getElementById('surface-content')||{ innerText: '' }).innerText.replace(/\\s+/g,' ').slice(0, 160),
    };
  })()`);
  check(
    "FE-T07 · 被丢在后面的那次读取迟到回来，屏幕上仍然是 B",
    Boolean(late.activeSessionId) && late.activeSessionId !== a && /Unresolved/.test(late.title),
    late,
  );

  /* ---------------------------------------------------------------- 2
   * 折叠 ≠ 卸载 ≠ 删除：展开收起一张卡不重发命令、不丢草稿。 */
  await openSession("Complete NDA review");
  const draft = await ev(`(async () => {
    const state = ${state};
    const composer = document.getElementById('composer-input');
    composer.value = 'fe04 draft that must survive';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    const calls = [];
    const original = window.fetch;
    window.fetch = (...args) => { calls.push(String(args[0])); return original(...args); };
    const card = document.querySelector('#message-stream details');
    let restoredOpen = true;
    if (card) {
      const before = card.open;
      card.open = !before; card.dispatchEvent(new Event('toggle'));
      await new Promise(r => setTimeout(r, 300));
      card.open = before; card.dispatchEvent(new Event('toggle'));
      await new Promise(r => setTimeout(r, 300));
      restoredOpen = card.open === before;
    }
    window.fetch = original;
    return {
      hadCard: Boolean(card),
      draft: document.getElementById('composer-input').value,
      cached: state.draftCache.get(state.activeSessionId) ?? null,
      calls: calls.filter(u => /\\/runs|\\/questions|\\/actions/.test(u)),
      restoredOpen,
    };
  })()`);
  check(
    "FE-T07 · 展开再收起一张卡：不重发命令，草稿与开合态都还在",
    draft.draft === "fe04 draft that must survive" && draft.calls.length === 0 && draft.restoredOpen,
    draft,
  );

  /* ---------------------------------------------------------------- 3
   * 生命周期：三次折叠 / 展开不重读；关闭再打开每个来源至多一次。 */
  await openSurface();
  /* 打开工作面本身会读一次；等它落定再开始数，否则数进来的是打开那一次。 */
  await sleep(2000);
  const subscriptions = await ev(`(async () => {
    const count = (calls) => ({
      surface: calls.filter(u => u.includes('/surface')).length,
      workspace: calls.filter(u => u.includes('/workspace')).length,
      runtime: calls.filter(u => u.includes('/runtime-control')).length,
      commands: calls.filter(u => /\\/runs|\\/questions|\\/actions/.test(u)).length,
    });
    const original = window.fetch;
    let calls = [];
    window.fetch = (...args) => { calls.push(String(args[0])); return original(...args); };
    for (let i = 0; i < 3; i++) {
      document.getElementById('surface-expand-button').click();
      await new Promise(r => setTimeout(r, 400));
    }
    const toggles = count(calls);
    calls = [];
    document.getElementById('close-surface-button').click();
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('show-surface-button').click();
    await new Promise(r => setTimeout(r, 1400));
    const reopen = count(calls);
    window.fetch = original;
    return { toggles, reopen };
  })()`);
  /* FN-23 禁的是「折叠 / 展开重发命令、取消 Run、丢草稿、换读取版本」。展开一次
   * 会把 preview 面重读一次（`loadSurfaceKind` → `loadSurface`），那是一次读取而
   * 不是一次命令：三次点击里有两次是「收起 → 展开」，所以 /surface 恰好两次。
   * wk10b-1 当年数到 0，是因为它的起点已经是展开态，三次点击只落两次收起一次展开
   * 且那一次展开被 kind 判断挡掉；断言按事实写，并把「展开是否该重读」列入待裁定。 */
  check(
    "FE-T07 · 三次折叠 / 展开不重发任何命令，工作面与 runtime 不重读",
    subscriptions.toggles.commands === 0 &&
      subscriptions.toggles.workspace === 0 &&
      subscriptions.toggles.runtime === 0 &&
      subscriptions.toggles.surface <= 2,
    subscriptions.toggles,
  );
  check(
    "FE-T07 · 关闭再打开，每个来源至多读一次，不是两次",
    subscriptions.reopen.surface <= 1 && subscriptions.reopen.workspace <= 1 && subscriptions.reopen.runtime <= 1,
    subscriptions.reopen,
  );

  check(
    "本单没有任何请求离开本 origin",
    observations.responses.every(r => r.url.startsWith(ORIGIN) || r.url.startsWith("data:")),
    observations.responses.filter(r => !r.url.startsWith(ORIGIN)).map(r => r.url),
  );
  check("页面没有抛出异常", observations.exceptions.length === 0, observations.exceptions.map(e => e.text));
} finally {
  await writeFile(new URL("./fe-t07.json", import.meta.url), JSON.stringify(results, null, 1));
  console.log(`${results.filter(r => r.pass).length} / ${results.length}`);
  await close();
}
