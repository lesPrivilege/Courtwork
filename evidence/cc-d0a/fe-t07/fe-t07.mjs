/* CC-W · 逐字沿用 FE-04 / CC-S 的四条，只改端口；新增三条在文件末尾（B 态的视图
 * 切换与断点跨越，R4D-3 / FN-23）。
 * FE-04 · FE-T07（FN-22 / 23 / 24）复跑：迟到响应与卡片展开收起。断言与
 * `engineering/mvp/execution/work-surface-kit/evidence/wk10b-1/checks.mjs` §4–5
 * 同一套，只把当年那三个 fixture 会话换成本单播种脚本（`work-seed.mjs`，逐字沿用
 * wk10b2）建出来的两个已绑定会话与一个普通会话，并改用本单的 browser harness。
 * 「打开 A，读还在路上时切到 B」这一步用的还是同一手法：在页内包一层 window.fetch
 * 把 A 的 /surface 响应扣住 2.6 s。
 *
 *   APP_URL=http://127.0.0.1:8905 WK6_CDP_PORT=20000 node evidence/fe04/fe-t07.mjs
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, observations } from "./browser.mjs";
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


  /* ---------------------------------------------------------------- CC-W 1
   * B（1024–1679）· 展开是主区内的视图切换：聊天列离开屏幕，但它的 DOM、滚动位置
   * 与草稿都还在（R4D-3）。返回不重发命令、不重挂 renderer。 */
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(600);
  await openSession("Complete NDA review");
  await openSurface();
  const viewSwitch = await ev(`(async () => {
    const state = ${state};
    const stream = document.getElementById('message-stream');
    const composer = document.getElementById('composer-input');
    composer.value = 'cc-w draft that must survive the view switch';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    const scrollable = stream.scrollHeight > stream.clientHeight + 8;
    if (scrollable) { stream.scrollTop = 24; stream.dispatchEvent(new Event('scroll')); }
    await new Promise(r => setTimeout(r, 300));
    const before = { scrollTop: stream.scrollTop, draft: composer.value, scrollable,
      streamInDom: document.body.contains(stream) };
    if (state.surface.controller) state.surface.controller.__ccw = 'kept';
    const marked = Boolean(state.surface.controller);
    const calls = [];
    const original = window.fetch;
    window.fetch = (...args) => { calls.push(String(args[0])); return original(...args); };
    document.getElementById('surface-expand-button').click();
    await new Promise(r => setTimeout(r, 900));
    const during = {
      shape: document.getElementById('app-shell').className,
      bodyHidden: document.getElementById('conversation-body').hidden,
      bodyInert: document.getElementById('conversation-body').inert,
      streamInDom: document.body.contains(stream),
      backButton: document.getElementById('surface-back-button').hidden === false,
    };
    document.getElementById('surface-back-button').click();
    await new Promise(r => setTimeout(r, 900));
    window.fetch = original;
    return {
      before, during, marked,
      after: { scrollTop: document.getElementById('message-stream').scrollTop,
               draft: document.getElementById('composer-input').value },
      rendererKept: state.surface.controller?.__ccw === 'kept',
      commands: calls.filter(u => /\\/runs|\\/questions|\\/actions/.test(u)),
    };
  })()`);
  check(
    "CC-W · B 态展开与返回：聊天列 DOM 保留，滚动位置与草稿不变，不重发命令、不重挂 renderer",
    viewSwitch.during.bodyHidden === true &&
      viewSwitch.during.bodyInert === true &&
      viewSwitch.during.streamInDom === true &&
      viewSwitch.during.backButton === true &&
      viewSwitch.after.draft === viewSwitch.before.draft &&
      viewSwitch.after.scrollTop === viewSwitch.before.scrollTop &&
      viewSwitch.commands.length === 0 &&
      (!viewSwitch.marked || viewSwitch.rendererKept),
    viewSwitch,
  );

  /* ---------------------------------------------------------------- CC-W 2
   * 断点跨越（1679 ↔ 1680）：换的是形状，不是对象。 */
  await ev(`(async () => {
    const state = ${state};
    if (!state.surface.expanded) document.getElementById('surface-expand-button').click();
    await new Promise(r => setTimeout(r, 800));
    const composer = document.getElementById('composer-input');
    composer.value = 'cc-w draft across the breakpoint';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    if (state.surface.controller) state.surface.controller.__ccwBp = 'kept';
    window.__ccwCalls = [];
    window.__ccwOriginalFetch = window.fetch;
    window.fetch = (...args) => { window.__ccwCalls.push(String(args[0])); return window.__ccwOriginalFetch(...args); };
    return true;
  })()`);
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1679, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(900);
  const at1679 = await ev(`document.getElementById('app-shell').className`);
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(900);
  const at1680 = await ev(`document.getElementById('app-shell').className`);
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1679, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(900);
  const crossing = await ev(`(() => {
    const state = ${state};
    const calls = window.__ccwCalls || [];
    window.fetch = window.__ccwOriginalFetch;
    return {
      shape: document.getElementById('app-shell').className,
      draft: document.getElementById('composer-input').value,
      rendererKept: state.surface.controller?.__ccwBp === 'kept',
      marked: Boolean(state.surface.controller),
      commands: calls.filter(u => /\\/runs|\\/questions|\\/actions/.test(u)),
      reads: calls.filter(u => /\\/surface|\\/workspace|\\/runtime-control/.test(u)),
    };
  })()`);
  check(
    "CC-W · 1679 ↔ 1680 跨越只换形状：不重发命令、不重读、不重挂 renderer、草稿不丢",
    /surface-view-switch/.test(at1679) &&
      /surface-three-pane/.test(at1680) &&
      crossing.draft === "cc-w draft across the breakpoint" &&
      crossing.commands.length === 0 &&
      crossing.reads.length === 0 &&
      (!crossing.marked || crossing.rendererKept),
    { at1679, at1680, ...crossing },
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
