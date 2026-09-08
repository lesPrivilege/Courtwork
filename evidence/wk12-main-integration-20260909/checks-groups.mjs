/* WO-WK12 · General / Runtime / Developer 三组的内容，以及原 Settings 对话框里
 * 那几条路径的回归（provider 保存、key 保存与删除、extension 生命周期、绑定入口）。
 * 用法：APP_URL=http://127.0.0.1:8881 WK6_CDP_PORT=19693 node checks-groups.mjs */
import { ev, check, viewport, media, go, clearPrefs, report, close, seed, sleep, observations } from "./harness.mjs";

try {
  const { api, session } = await seed();
  await viewport(1440);
  await media("light");
  await go();
  await clearPrefs();
  await go("#settings/general");

  const general = await ev(`(()=>({
    rows: [...document.querySelectorAll('#settings-general .settings-row-title')].map(n=>n.textContent),
    providerForm: !!document.querySelector('#provider-panel .settings-form'),
    credentialForm: !!document.querySelector('#provider-panel .credential-form'),
    newSessions: document.getElementById('settings-new-sessions').textContent.includes('New sessions'),
    dataDir: [...document.querySelectorAll('#settings-data .settings-row')].map(n=>n.textContent).find(t=>t.includes('Data directory')),
    adapter: [...document.querySelectorAll('#settings-data .settings-readout')].map(n=>n.textContent),
    editable: document.querySelectorAll('#settings-data input, #settings-data select, #settings-data button').length,
  }))()`);
  check(
    "G1 · General 收 Connection（原表单原请求）、New sessions 默认与只读 Data",
    general.providerForm && general.credentialForm && general.newSessions &&
      general.rows.includes("Provider") && general.rows.includes("Model") &&
      general.rows.includes("Adapter") && general.editable === 0,
    general,
  );
  check(
    "G2 · 主机不报数据目录就说没报，不拿别的东西冒充一个路径",
    general.dataDir?.includes("Not reported") && general.adapter[0] === "Not reported" &&
      general.adapter[1].length > 0 && general.adapter[2] === "ready",
    { dataDir: general.dataDir, readouts: general.adapter },
  );
  const homeDefault = await ev(`(()=>{
    document.getElementById('settings-new-session-permission-read_only').click();
    return { home: document.getElementById('home-permission-input').value, state: window.__V5_UI__.state.homePermissionMode };
  })()`);
  check(
    "G3 · New sessions 写的是 Home 已有的那个默认值来源，不是第二份状态",
    homeDefault.home === "read_only" && homeDefault.state === "read_only",
    homeDefault,
  );
  await ev(`document.getElementById('settings-new-session-permission-ask').click()`);

  /* ── Runtime ─────────────────────────────────────────────────────── */
  await ev(`document.getElementById('settings-tab-runtime').click()`);
  await sleep(300);
  const runtime = await ev(`(()=>({
    mounts: [...document.querySelectorAll('#settings-runtime [data-wk11-mount]')].map(n=>n.dataset.wk11Mount),
    headings: [...document.querySelectorAll('#settings-runtime .settings-block-title')].map(n=>n.textContent.trim()),
    overviewPanel: !!document.getElementById('runtime-control-settings'),
    contextSummary: !!document.getElementById('runtime-context-summary'),
    controlEntry: !!document.getElementById('runtime-control-entry'),
    modelsEditable: document.querySelectorAll('#settings-runtime-permissions input, #settings-runtime-permissions select, #settings-runtime-permissions textarea').length,
    jump: [...document.querySelectorAll('#settings-runtime-permissions button')].map(b=>b.textContent.trim()),
    modelRows: [...document.querySelectorAll('#settings-runtime-permissions .settings-row-title')].map(n=>n.textContent),
  }))()`);
  check(
    "R1 · Runtime 按意图分组，五个节位就位；Overview 收现有 runtime 入口与上下文摘要",
    runtime.mounts.join() === "overview,composition,instructions-and-context,capabilities-and-connections,permissions-and-environment" &&
      runtime.headings.join() === "Overview,Composition,Instructions & context,Capabilities & connections,Permissions & environment" &&
      runtime.overviewPanel && runtime.contextSummary && runtime.controlEntry,
    runtime,
  );
  check(
    "R2 · Models 只读，编辑只在 General 一处",
    runtime.modelsEditable === 0 && runtime.jump.some((t) => t.includes("Edit in General")) &&
      runtime.modelRows.join() === "Provider,Model,API format,Base URL,API key",
    { editable: runtime.modelsEditable, jump: runtime.jump, rows: runtime.modelRows },
  );
  await ev(`[...document.querySelectorAll('#settings-runtime-permissions button')].find(b=>b.textContent.includes('Edit in General')).click()`);
  await sleep(300);
  const jumped = await ev(`(()=>({current:document.querySelector('.settings-tab.is-current')?.textContent, focus:document.activeElement.tagName+':'+(document.activeElement.name||'')}))()`);
  check("R3 · Edit in General 落到 General 的那一处表单上", jumped.current === "General" && jumped.focus.startsWith("SELECT"), jumped);

  /* ── Developer ───────────────────────────────────────────────────── */
  await ev(`document.getElementById('settings-tab-developer').click()`);
  await sleep(500);
  const developer = await ev(`(()=>({
    extensions: document.querySelectorAll('#extension-list .extension-row').length,
    planned: document.querySelectorAll('#planned-capabilities .planned-row').length,
    plannedControls: document.querySelectorAll('#planned-capabilities button, #planned-capabilities input, #planned-capabilities a, #planned-capabilities select').length,
    info: document.getElementById('runtime-info').textContent.includes('Adapter'),
  }))()`);
  check(
    "D1 · Developer 收 extension 生命周期、runtime-info 与 Planned；Planned 行没有任何控件",
    developer.extensions >= 1 && developer.planned === 8 && developer.plannedControls === 0 && developer.info,
    developer,
  );

  /* ── 回归：原 Settings 对话框的四条路径 ──────────────────────────── */
  const before = (await api("/provider-config")).config;
  await ev(`document.getElementById('settings-tab-general').click()`);
  await sleep(200);
  await ev(`document.querySelector('#provider-panel .settings-form').requestSubmit()`);
  await sleep(600);
  const savedFake = await api("/provider-config");
  check(
    "X1 · 回归：连接保存仍走 PUT /provider-config，字段与结果不变",
    savedFake.config.provider === before.provider && savedFake.config.model === before.model,
    { before, after: savedFake.config },
  );

  const models = (await api("/provider-models")).models.filter((m) => m.provider === "openai");
  const keyPath = await ev(`(async()=>{
    const form = document.querySelector('#provider-panel .settings-form');
    const provider = form.querySelector('select[name=provider]');
    provider.value = 'openai';
    provider.dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,150));
    form.requestSubmit();
    await new Promise(r=>setTimeout(r,700));
    const credential = document.querySelector('#provider-panel .credential-form');
    const hiddenAfterSwitch = credential.hidden;
    credential.querySelector('input[type=password]').value = 'sk-wk12-check';
    credential.requestSubmit();
    await new Promise(r=>setTimeout(r,700));
    const afterSave = credential.querySelector('.form-help').textContent;
    credential.querySelector('.danger-button').click();
    await new Promise(r=>setTimeout(r,700));
    return { hiddenAfterSwitch, afterSave, afterDelete: credential.querySelector('.form-help').textContent };
  })()`);
  const credentialState = (await api("/provider-config")).credentialStatus;
  check(
    "X2 · 回归：切到真实 provider 后 key 的保存与删除路径不变，key 从不回显",
    keyPath.hiddenAfterSwitch === false && keyPath.afterSave.includes("A key is saved") &&
      keyPath.afterDelete.includes("No key is saved") && credentialState !== "configured",
    { keyPath, credentialState },
  );
  /* 复位到本地 fake provider。 */
  await ev(`(async()=>{
    const form = document.querySelector('#provider-panel .settings-form');
    const provider = form.querySelector('select[name=provider]');
    provider.value = 'fake-openai-loopback';
    provider.dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,150));
    form.requestSubmit();
    await new Promise(r=>setTimeout(r,700));
    return true;
  })()`);
  check(
    "X3 · 复位：工作区回到本地 fake provider",
    (await api("/provider-config")).config.provider === "fake-openai-loopback",
    (await api("/provider-config")).config,
  );

  await ev(`document.getElementById('settings-tab-developer').click()`);
  await sleep(400);
  const lifecycle = await ev(`(async()=>{
    const row = [...document.querySelectorAll('#extension-list .extension-row')].find(r=>r.textContent.includes('evidence-memo'));
    const before = row.querySelector('.extension-status').textContent;
    [...row.querySelectorAll('button')].find(b=>b.textContent==='Load')?.click();
    await new Promise(r=>setTimeout(r,1200));
    const loaded = [...document.querySelectorAll('#extension-list .extension-row')].find(r=>r.textContent.includes('evidence-memo'));
    return { before, after: loaded.querySelector('.extension-status').textContent,
             actions: [...loaded.querySelectorAll('button')].map(b=>b.textContent) };
  })()`);
  check(
    "X4 · 回归：extension 生命周期在 Developer 组内不变（load 后状态与动作集照旧）",
    lifecycle.after === "loaded" && lifecycle.actions.includes("Unload") && lifecycle.actions.includes("Reload"),
    lifecycle,
  );

  /* 绑定入口：会话在场时 Developer 组给出 Bind to session；按下后这一页让位，
     绑定面出现并接过焦点（原对话框的行为，换成页面之后路径不变）。 */
  await ev(`window.__V5_UI__.state.activeSessionId`);
  const bind = await ev(`(async()=>{
    document.querySelector('#navigation-panel .project-toggle')?.click();
    await new Promise(r=>setTimeout(r,900));
    const session = [...document.querySelectorAll('#navigation-panel button')].find(b=>b.textContent.includes('Settings checks'));
    if (!session) return { found: false, reason: 'no session button', buttons: [...document.querySelectorAll('#navigation-panel button')].map(b=>b.textContent.trim().slice(0,24)) };
    session.click();
    await new Promise(r=>setTimeout(r,1400));
    document.getElementById('runtime-setup-button').click();
    await new Promise(r=>setTimeout(r,900));
    document.getElementById('settings-tab-developer').click();
    await new Promise(r=>setTimeout(r,600));
    const row = [...document.querySelectorAll('#extension-list .extension-row')].find(r=>r.textContent.includes('evidence-memo'));
    const button = row && [...row.querySelectorAll('button')].find(b=>b.textContent==='Bind to session');
    if (!button) return { found: false, reason: 'no bind button', actions: row ? [...row.querySelectorAll('button')].map(b=>b.textContent) : null, session: window.__V5_UI__.state.activeSessionId };
    button.click();
    await new Promise(r=>setTimeout(r,200));
    const panel = document.getElementById('binding-panel');
    const focusOnHandover = panel.contains(document.activeElement);
    const focusedTag = document.activeElement.tagName + ':' + (document.activeElement.name || document.activeElement.id || '');
    /* 项目已有工作的读取回来之后绑定面会重画一次，这是既有行为（与对话框版本同一段代码），
       重画后焦点回到 body；这里把两个时刻都记下来，断言只落在交接的那一刻。 */
    await new Promise(r=>setTimeout(r,900));
    return {
      found: true,
      settingsHidden: document.getElementById('settings-page').hidden,
      panelOpen: !panel.hidden,
      focusOnHandover,
      focusedTag,
      focusAfterReread: panel.contains(document.activeElement),
      hash: location.hash,
    };
  })()`);
  check(
    "X5 · 回归：Bind to session 仍在 Developer 组内，按下后本页让位、绑定面出现、hash 离开设置",
    bind.found && bind.settingsHidden && bind.panelOpen && !bind.hash.startsWith("#settings"),
    bind,
  );
  /* 既有缺陷，不是本单造成的：focusBindingEntry 在项目工作读回来之前跑，那时面里
     还没有可聚焦的字段，于是焦点留在 body。对话框版本是同一段代码同一顺序。
     单列一行记下来，交 WO-WK11 一并处理，本单不改绑定面的行为。 */
  check(
    "X5b · 既有缺陷（非本单造成）：交接时绑定面里还没有字段，焦点落在 body",
    bind.focusOnHandover === false && bind.focusedTag === "BODY:",
    { focusOnHandover: bind.focusOnHandover, focusedTag: bind.focusedTag, focusAfterReread: bind.focusAfterReread },
  );

  await report(import.meta.url, "checks-groups", { sessionId: session.id });
} catch (error) {
  console.error("checks-groups failed:", error);
  process.exitCode = 1;
} finally {
  await close();
}
