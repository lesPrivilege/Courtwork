/* WO-WK12 · 页壳、路由、键盘与搜索。用法：
 * APP_URL=http://127.0.0.1:8881 WK6_CDP_PORT=19691 node checks-shell.mjs */
import { cdp, ev, key, check, viewport, media, enter, press, go, search, clearPrefs, report, close } from "./harness.mjs";

try {
  await viewport(1440);
  await media("light");
  await go();
  await clearPrefs();
  await go();

  await ev(`document.getElementById('runtime-setup-button').focus()`);
  await enter();
  const opened = await ev(`(()=>({
    page: !document.getElementById('settings-page').hidden,
    body: document.getElementById('conversation-body').hidden,
    hash: location.hash,
    title: document.getElementById('session-title-text').textContent,
    sidebarUsable: !document.getElementById('navigation-panel').hasAttribute('inert')
      && document.getElementById('home-button').offsetParent !== null
      && !document.getElementById('new-session-button').disabled,
    dialogs: document.querySelectorAll('dialog[open]').length,
    scrim: !!document.querySelector('.layer-backdrop:not([hidden])'),
  }))()`);
  check(
    "S1 · Settings 是主区的一页，不是模态：无 dialog、无遮罩，侧栏留在原处可操作",
    opened.page && opened.body && opened.dialogs === 0 && !opened.scrim && opened.sidebarUsable && opened.title === "Settings",
    opened,
  );
  check("S2 · 打开即写入可深链的 hash", opened.hash === "#settings/general", opened.hash);

  await press("Escape", 27);
  const closed = await ev(`(()=>({
    page: document.getElementById('settings-page').hidden,
    body: !document.getElementById('conversation-body').hidden,
    hash: location.hash,
    focus: document.activeElement.id,
  }))()`);
  check(
    "S3 · Escape 回到进入前的画面，焦点回到打开它的控件",
    closed.page && closed.body && closed.focus === "runtime-setup-button" && !closed.hash.startsWith("#settings"),
    closed,
  );

  await go("#settings/appearance");
  const deep = await ev(`(()=>({
    hidden: document.getElementById('settings-page').hidden,
    current: document.querySelector('.settings-tab.is-current')?.textContent,
    panel: !document.getElementById('settings-appearance').hidden,
  }))()`);
  check("S4 · 深链直接落在那一组", !deep.hidden && deep.current === "Appearance" && deep.panel, deep);

  await ev(`document.getElementById('settings-back-button').click()`);
  const backOut = await ev(`document.getElementById('settings-page').hidden + ':' + location.hash`);
  check("S5 · Back 与 Escape 是同一条路", backOut === "true:", backOut);

  /* ── 键盘 ─────────────────────────────────────────────────────────── */
  await go("#settings/general");
  await ev(`document.getElementById('settings-tab-general').focus()`);
  await press("ArrowDown", 40);
  await press("ArrowDown", 40);
  const roving = await ev(`(()=>({
    focus: document.activeElement.textContent,
    stillCurrent: document.querySelector('.settings-tab.is-current')?.textContent,
    keyboardHidden: document.getElementById('settings-keyboard').hidden,
    tabindex: [...document.querySelectorAll('.settings-tab')].map(t=>t.tabIndex).join(','),
  }))()`);
  check(
    "K1 · 导航列 ↑/↓ 只移动焦点，右列不跟着换；只有当前项在 Tab 序里",
    roving.focus === "Keyboard" && roving.stillCurrent === "General" && roving.keyboardHidden && roving.tabindex === "0,-1,-1,-1,-1",
    roving,
  );
  await enter();
  const entered = await ev(`(()=>({
    current: document.querySelector('.settings-tab.is-current')?.textContent,
    focus: document.activeElement.id,
    hash: location.hash,
    rows: document.querySelectorAll('#settings-keyboard .settings-key-row').length,
    planned: document.querySelectorAll('#settings-keyboard .planned-row').length,
  }))()`);
  check(
    "K2 · Enter 进节，焦点交给右列，hash 跟上；快捷键只读表六行 + 一行 Planned",
    entered.current === "Keyboard" && entered.focus === "settings-keyboard" &&
      entered.hash === "#settings/keyboard" && entered.rows === 6 && entered.planned === 1,
    entered,
  );

  /* IME：组合中的按键（keyCode 229 / isComposing）不得触发命令，组合中的中间态
     不得被当作查询词；组合结束才过滤。用 composition 与 keydown 事件驱动，因为
     CDP 的 IME 通道会把本机的 headless 浏览器进程拖进自旋（见 harness 抬头）。 */
  await ev(`document.getElementById('settings-search').focus()`);
  const during = await ev(`(()=>{
    const box = document.getElementById('settings-search');
    box.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    for (const target of [box, document])
      target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Process', keyCode: 229, isComposing: true }));
    for (const target of [box, document])
      target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'j', keyCode: 74, isComposing: true }));
    box.value = 'she';
    box.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: 'she' }));
    return {
      focus: document.activeElement.id,
      panels: [...document.querySelectorAll('.settings-section')].filter(p=>!p.hidden).map(p=>p.id),
      dialogs: document.querySelectorAll('dialog[open]').length,
    };
  })()`);
  const afterCompose = await ev(`(()=>{
    const box = document.getElementById('settings-search');
    box.value = '设置';
    box.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '设置' }));
    return [...document.querySelectorAll('.settings-section')].filter(p=>!p.hidden).map(p=>p.id);
  })()`);
  check(
    "K3 · 搜索框不抢占 IME：组合中不触发命令、不换焦点、不改过滤；组合结束才过滤",
    during.focus === "settings-search" && during.dialogs === 0 &&
      during.panels.join() === "settings-keyboard" && afterCompose.length === 0,
    { during, afterCompose },
  );
  await search("");

  await ev(`document.getElementById('settings-tab-general').focus()`);
  await key({ text: "j", code: "KeyJ", keyCode: 74 });
  await key({ text: "o", code: "KeyO", keyCode: 79 });
  const listKeys = await ev(`document.activeElement.id`);
  check("K4 · 列表键属于被盖住的那条列表，这一页在场时静默", listKeys === "settings-tab-general", listKeys);

  /* ── 搜索 ─────────────────────────────────────────────────────────── */
  await search("code font");
  const filtered = await ev(`(()=>{
    const visible = (sel) => [...document.querySelectorAll(sel)].filter(n => n.offsetParent !== null);
    return {
      rows: visible('.settings-row').map(n => n.querySelector('.settings-row-title')?.textContent),
      panels: [...document.querySelectorAll('.settings-section')].filter(p => !p.hidden).map(p => p.id),
    };
  })()`);
  check(
    "Q1 · 搜索只过滤本页的行：命中的组留下，其余组整组退场",
    filtered.rows.length === 1 && filtered.rows[0] === "Code font" && filtered.panels.join() === "settings-appearance",
    filtered,
  );
  await search("device");
  const byHelp = await ev(`[...document.querySelectorAll('.settings-row')].filter(n=>n.offsetParent!==null).map(n=>n.querySelector('.settings-row-title')?.textContent)`);
  check("Q2 · 说明句也参与匹配，不只是标题", byHelp.length >= 2 && byHelp.includes("Scheme"), byHelp);
  await search("zzzz");
  const none = await ev(`(()=>({
    empty: !document.getElementById('settings-search-empty').hidden,
    text: document.getElementById('settings-search-empty').textContent,
    panels: [...document.querySelectorAll('.settings-section')].filter(p => !p.hidden).length,
  }))()`);
  check("Q3 · 无命中时说出来，而不是留一页空白", none.empty && none.panels === 0 && none.text.includes("zzzz"), none);

  await report(import.meta.url, "checks-shell");
} catch (error) {
  console.error("checks-shell failed:", error);
  process.exitCode = 1;
} finally {
  await close();
}
