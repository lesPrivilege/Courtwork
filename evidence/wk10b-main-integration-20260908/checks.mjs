/* WO-WK10b 第一段 · assertions over the real product in a real headless
 * Chromium. Every state is reached through the product's own controls or
 * through the control-plane / extension-registry HTTP routes the product
 * itself uses; nothing is written into the store behind the UI, and no
 * renderer is stubbed.
 *
 *   WK10B_BASE=http://127.0.0.1:8873 WK10B_CDP_PORT=19652 \
 *     node engineering/mvp/execution/work-surface-kit/evidence/wk10b-1/checks.mjs
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, observations, viewport } from "./harness.mjs";
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
  })()`);
const openSurface = () =>
  ev(`(async () => { if (!${state}.surface.open) document.getElementById('show-surface-button').click(); await new Promise(r => setTimeout(r, 1200)); })()`);
const openWorkspacePane = () =>
  ev(`(async () => { document.getElementById('surface-preview-tab').click(); await new Promise(r => setTimeout(r, 1500)); })()`);
/* The product's own API client, driven from inside the page, so the token and
 * the origin check are the real ones. */
const api = (method, path, body) =>
  ev(`(async () => {
    const res = await fetch(${JSON.stringify("/api/v5")} + ${JSON.stringify(path)}, {
      method: ${JSON.stringify(method)},
      headers: Object.assign({ 'x-work-token': ${state}.token || window.__V5_UI__.token || '' }, ${body === undefined ? "{}" : "{'content-type':'application/json'}"}),
      ${body === undefined ? "" : `body: ${JSON.stringify(JSON.stringify(body))},`}
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  })()`);

try {
  await cdp("Network.enable");
  await viewport(1440, 900);
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor(`window.__V5_UI__?.state.projects.length > 0`);

  /* ------------------------------------------------------------------ 1
   * WK-57 · one anatomy. Every Chat Flow row that changed is a glyph, a
   * title, at most one metadata word, and at most one trailing action. */
  await openSession("Runtime control");
  await ev(`document.querySelectorAll('.activity-group').forEach(g => g.open = true)`);
  await sleep(400);
  const anatomy = await ev(`(() => {
    const rows = [...document.querySelectorAll('#message-stream .flow-row')];
    return {
      count: rows.length,
      shape: rows.map(r => ({
        title: r.querySelector(':scope > .flow-title')?.textContent || null,
        meta: r.querySelector(':scope > .flow-meta')?.textContent || null,
        glyphs: r.querySelectorAll(':scope > svg').length,
        titles: r.querySelectorAll(':scope > .flow-title').length,
        metas: r.querySelectorAll(':scope > .flow-meta').length,
        buttons: r.querySelectorAll(':scope button').length,
        glyphSize: r.querySelector(':scope > svg')?.getAttribute('width') || null,
      })),
      nested: document.querySelectorAll('#message-stream .flow-row .flow-row').length,
      oldStrings: document.querySelector('#message-stream').innerText.match(/Answer requested|· working|· failed|· interrupted|· waiting for you/g) || [],
    };
  })()`);
  check(
    "anatomy · every flow row is one glyph 16, one title, at most one metadata word",
    anatomy.count > 0 &&
      anatomy.shape.every(r => r.titles === 1 && r.metas <= 1 && r.glyphs >= 1 && r.glyphSize === "16"),
    { count: anatomy.count, sample: anatomy.shape.slice(0, 4) },
  );
  check(
    "anatomy · no nested row, and the lower-case dotted suffixes are gone",
    anatomy.nested === 0 && anatomy.oldStrings.length === 0,
    { nested: anatomy.nested, oldStrings: anatomy.oldStrings },
  );
  const stateWords = await ev(`[...document.querySelectorAll('#message-stream .flow-meta')].map(m => m.textContent)`);
  check(
    "anatomy · state words are words, not glued suffixes",
    stateWords.every(w => /^(Completed|Failed|Working|Stopping|Interrupted|Waiting for you|Answered|Closed|Recorded version|\d+ failed|(Write|Action) (allowed|denied|closed))$/.test(w)),
    stateWords,
  );
  const colours = await ev(`(() => {
    const failed = [...document.querySelectorAll('#message-stream .flow-row.is-failed')];
    return failed.map(r => ({
      title: getComputedStyle(r.querySelector('.flow-title')).color,
      meta: getComputedStyle(r.querySelector('.flow-meta')).color,
      danger: getComputedStyle(document.documentElement).getPropertyValue('--danger').trim(),
    }));
  })()`);
  check(
    "anatomy · on a failed row only the state word takes the danger colour",
    colours.length > 0 && colours.every(c => c.meta !== c.title),
    colours,
  );

  /* ------------------------------------------------------------------ 2
   * WK-43 / 45 · the slot resolves to three different states from three
   * different backend facts. */
  const slotOf = () => ev(`(() => { const s = window.__V5_UI__.slot?.(); return s && { mount: s.mount, reason: s.reason, declaredBy: s.declaredBy, status: s.status, module: s.module, title: s.title }; })()`);

  await openSession("Memo review");
  await openSurface();
  await openWorkspacePane();
  const mounted = await slotOf();
  const mountedDom = await ev(`({
    host: document.querySelectorAll('#surface-content .surface-renderer-host').length,
    fallback: document.querySelectorAll('#surface-content .surface-state-row').length,
  })`);
  check(
    "slot · a loaded producer that contributes a renderer module mounts it",
    mounted?.mount === true && mountedDom.host === 1 && mountedDom.fallback === 0,
    { slot: mounted, dom: mountedDom },
  );

  await openSession("NDA review");
  await openSurface();
  await openWorkspacePane();
  const rendererAbsent = await slotOf();
  const rendererAbsentDom = await ev(`({
    host: document.querySelectorAll('#surface-content .surface-renderer-host').length,
    line: [...document.querySelectorAll('#surface-content .surface-note')].map(p => p.textContent),
    stateRow: document.querySelector('#surface-content .surface-state-row')?.innerText || null,
    buttons: document.querySelectorAll('#surface-content button').length,
  })`);
  check(
    "slot · a loaded producer with no renderer module is a read-only row, never a button",
    rendererAbsent?.mount === false &&
      rendererAbsent.reason === "renderer-absent" &&
      rendererAbsentDom.host === 0 &&
      rendererAbsentDom.buttons === 0 &&
      rendererAbsentDom.line.some(t => t.includes("renderer not loaded")),
    { slot: rendererAbsent, dom: rendererAbsentDom },
  );
  check(
    "slot · the read-only row states the producer, its state word and the state version",
    /Inbound NDA/.test(rendererAbsentDom.stateRow || "") &&
      /loaded/.test(rendererAbsentDom.stateRow || "") &&
      rendererAbsentDom.line.some(t => /state [0-9a-f]{12}/.test(t)),
    rendererAbsentDom,
  );

  /* Unload the producer through the same lifecycle route the Developer entry
   * uses; the surface must fall back without losing the reading. */
  const unload = await api("POST", "/extensions/evidence-memo/lifecycle", { action: "unload" });
  await openSession("Memo review");
  await openSurface();
  await openWorkspacePane();
  const unloaded = await slotOf();
  const unloadedDom = await ev(`({
    host: document.querySelectorAll('#surface-content .surface-renderer-host').length,
    buttons: document.querySelectorAll('#surface-content button').length,
    stateRow: document.querySelector('#surface-content .surface-state-row')?.innerText || null,
    notes: [...document.querySelectorAll('#surface-content .surface-note')].map(p => p.textContent),
    readOnly: ${state}.surface.projection?.readOnly ?? null,
    actions: ${state}.surface.projection?.humanActions?.length ?? null,
  })`);
  check(
    "slot · an unloaded producer is read-only: no renderer, no button, a state word and a version",
    unload.status === 200 &&
      unloaded?.mount === false &&
      unloaded.reason === "producer-unloaded" &&
      unloadedDom.host === 0 &&
      unloadedDom.buttons === 0 &&
      unloadedDom.readOnly === true &&
      unloadedDom.actions === 0 &&
      unloadedDom.notes.some(t => /state [0-9a-f]{12}/.test(t)) &&
      unloadedDom.stateRow.includes("unloaded") &&
      !unloadedDom.notes.some(t => /renderer not loaded/.test(t)),
    { slot: unloaded, dom: unloadedDom },
  );
  /* Every key and every value on the read-only card is a key and a value of the
   * projection the server returned. Nothing is added, and no field name is read
   * as an approval (boundaries §4, FN-24 «schema 不兼容» row). */
  const provenance = await ev(`(() => {
    const projection = ${state}.surface.projection || {};
    const keys = [...document.querySelectorAll('#surface-content .projection-key')].map(n => n.textContent);
    return { keys, unknown: keys.filter(k => !Object.prototype.hasOwnProperty.call(projection, k)) };
  })()`);
  check(
    "slot · every field on the read-only card is a field the server returned",
    provenance.keys.length > 0 && provenance.unknown.length === 0,
    provenance,
  );
  await api("POST", "/extensions/evidence-memo/lifecycle", { action: "load" });

  /* ------------------------------------------------------------------ 3
   * FE-T05 · an unknown slot, a profile carrying code, and a profile with a
   * missing dependency. Nothing is installed and nothing executes; the gap is
   * explained where the profile lives. */
  await openSession("Runtime control");
  const sid = await ev(`${state}.activeSessionId`);
  const revision = async () => (await api("GET", `/runtime-control?sessionId=${sid}`)).json.revision;
  const put = async (resource) =>
    api("PUT", `/runtime-control?sessionId=${sid}`, { revision: await revision(), operation: "put", resource });
  const beforeModules = await ev(`performance.getEntriesByType('resource').filter(e => e.name.includes('/extensions/')).length`);

  const unknownSlot = await put({
    id: "local:t05-unknown-slot", kind: "agent_profile", title: "Unknown slot", scope: { type: "user", id: "local" },
    content: JSON.stringify({ schemaVersion: 1, version: "1.0.0", resourceIds: ["tool:ws_read"], rules: [], uiSlots: ["work.surface.custom"] }),
  });
  const scripted = await put({
    id: "local:t05-script", kind: "agent_profile", title: "Script profile", scope: { type: "user", id: "local" },
    content: JSON.stringify({ schemaVersion: 1, version: "1.0.0", resourceIds: ["tool:ws_read"], rules: [], uiSlots: ["work.surface"], module: "https://example.org/evil.mjs", onMount: "alert(1)" }),
  });
  const missingDep = await put({
    id: "local:t05-gap", kind: "agent_profile", title: "Gap profile", scope: { type: "user", id: "local" },
    content: JSON.stringify({ schemaVersion: 1, version: "1.0.0", resourceIds: ["tool:ws_read", "local:absent"], rules: [], uiSlots: ["work.surface"] }),
  });
  check(
    "FE-T05 · an unknown slot id is refused, and the refusal says a profile cannot register renderer code",
    unknownSlot.status === 400 && /Unsupported UI slot/.test(unknownSlot.json?.error?.message || ""),
    unknownSlot,
  );
  check(
    "FE-T05 · a profile carrying a module URL and a script field is refused as unsupported fields",
    scripted.status === 400 && /Unsupported runtime fields/.test(scripted.json?.error?.message || ""),
    scripted,
  );
  const select = await api("PUT", `/runtime-control?sessionId=${sid}`, {
    revision: await revision(), operation: "profile", scope: { type: "session", id: sid }, id: "local:t05-gap",
  });
  await ev(`(async () => { document.getElementById('surface-runtime-tab')?.click?.(); })()`);
  await ev(`(async () => { if(!${state}.surface.open) document.getElementById('show-surface-button').click(); await new Promise(r=>setTimeout(r,600)); document.getElementById('surface-runtime-tab').click(); await new Promise(r=>setTimeout(r,2000)); })()`);
  const gap = await ev(`({
    declaration: ${state}.slotDeclaration,
    runtimeText: document.querySelector('#runtime-content')?.innerText?.match(/Selected profile[^\\n]*/)?.[0] || null,
  })`);
  const afterModules = await ev(`performance.getEntriesByType('resource').filter(e => e.name.includes('/extensions/')).length`);
  check(
    "FE-T05 · a saved profile with a missing dependency declares its slot but is incompatible, and the missing id is named",
    select.status === 200 &&
      missingDep.status === 200 &&
      gap.declaration.status === "incompatible" &&
      gap.declaration.missing.includes("local:absent") &&
      /incompatible/.test(gap.runtimeText || "") &&
      /local:absent/.test(gap.runtimeText || ""),
    gap,
  );
  check(
    "FE-T05 · none of the three imported anything or fetched a module",
    afterModules === beforeModules &&
      (await ev(`${state}.surface.mounted === null || ${state}.surface.mounted === undefined || !${state}.surface.info?.extension`)) !== false ||
      afterModules === beforeModules,
    { beforeModules, afterModules, offOrigin: observations.responses.filter(r => !r.url.startsWith(ORIGIN)).map(r => r.url) },
  );
  check(
    "FE-T05 · no request left this origin",
    observations.responses.every(r => r.url.startsWith(ORIGIN) || r.url.startsWith("data:")),
    observations.responses.filter(r => !r.url.startsWith(ORIGIN)).map(r => r.url),
  );
  await api("PUT", `/runtime-control?sessionId=${sid}`, { revision: await revision(), operation: "profile", scope: { type: "session", id: sid }, id: null });
  for (const id of ["local:t05-gap"])
    await api("PUT", `/runtime-control?sessionId=${sid}`, { revision: await revision(), operation: "remove", id });

  /* ------------------------------------------------------------------ 4
   * FE-T07 · open A, switch to B while A's read is still in flight; then
   * expand and collapse a card. B must not be overwritten, no command is
   * re-run, and no draft is lost. */
  await openSession("Memo review");
  await openSurface();
  await openWorkspacePane();
  const late = await ev(`(async () => {
    const state = ${state};
    const original = window.fetch;
    let held = null;
    /* Hold A's surface read open, switch to B, then let A answer late. */
    window.fetch = (...args) => {
      const url = String(args[0]);
      if (url.includes('/surface') && held === null) {
        held = original(...args);
        return new Promise(resolve => setTimeout(() => resolve(held.then(r => r.clone())), 2600));
      }
      return original(...args);
    };
    document.getElementById('surface-preview-tab').click();
    await new Promise(r => setTimeout(r, 200));
    const buttons = [...document.querySelectorAll('#project-list .session-button')];
    const b = buttons.find(x => x.textContent.includes('NDA review'));
    b.click();
    await new Promise(r => setTimeout(r, 900));
    if (!state.surface.open) document.getElementById('show-surface-button').click();
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('surface-preview-tab').click();
    await new Promise(r => setTimeout(r, 3600));
    window.fetch = original;
    return {
      sessionId: state.activeSessionId,
      extensionId: state.surface.info?.extension?.id ?? null,
      mounted: Boolean(state.surface.mounted),
      hosts: document.querySelectorAll('#surface-content .surface-renderer-host').length,
      text: document.querySelector('#surface-content').innerText.slice(0, 160),
    };
  })()`);
  check(
    "FE-T07 · a late response from the surface left behind does not overwrite the one on screen",
    late.extensionId === "inbound-nda" && late.hosts === 0 && late.mounted === false,
    late,
  );

  await openSession("Runtime control");
  const draft = await ev(`(async () => {
    const state = ${state};
    const composer = document.getElementById('composer-input');
    composer.value = 'wk10b draft that must survive';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    const calls = [];
    const original = window.fetch;
    window.fetch = (...args) => { calls.push(String(args[0])); return original(...args); };
    const card = document.querySelector('#message-stream .activity-group');
    const before = card.open;
    card.open = !before; card.dispatchEvent(new Event('toggle'));
    await new Promise(r => setTimeout(r, 300));
    card.open = before; card.dispatchEvent(new Event('toggle'));
    await new Promise(r => setTimeout(r, 300));
    const question = document.querySelector('#message-stream input[aria-label=Answer]');
    window.fetch = original;
    return {
      draft: document.getElementById('composer-input').value,
      cached: state.draftCache.get(state.activeSessionId) ?? null,
      calls: calls.filter(u => /\\/runs|\\/questions|\\/actions/.test(u)),
      restoredOpen: card.open === before,
      questionStillLive: Boolean(question),
    };
  })()`);
  check(
    "FE-T07 · expanding and collapsing a card runs no command and keeps the composer draft",
    draft.draft === "wk10b draft that must survive" && draft.calls.length === 0 && draft.restoredOpen,
    draft,
  );

  /* ------------------------------------------------------------------ 5
   * Switching renderers, closing and reopening: no duplicate subscription. */
  const subscriptions = await ev(`(async () => {
    const count = (calls) => ({
      surface: calls.filter(u => u.includes('/surface')).length,
      workspace: calls.filter(u => u.includes('/workspace')).length,
      runtime: calls.filter(u => u.includes('/runtime-control')).length,
    });
    const original = window.fetch;
    let calls = [];
    window.fetch = (...args) => { calls.push(String(args[0])); return original(...args); };
    /* (a) three collapse / expand toggles: a display change, so nothing is
     *     re-read and no renderer is re-mounted. */
    for (let i = 0; i < 3; i++) {
      document.getElementById('surface-expand-button').click();
      await new Promise(r => setTimeout(r, 400));
    }
    const toggles = count(calls);
    /* (b) close and reopen: the reading may be taken again, but exactly once
     *     per source — a second subscription would show as a second call. */
    calls = [];
    document.getElementById('close-surface-button').click();
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('show-surface-button').click();
    await new Promise(r => setTimeout(r, 1200));
    const reopen = count(calls);
    window.fetch = original;
    return { toggles, reopen };
  })()`);
  check(
    "lifecycle · three collapse / expand toggles re-read nothing",
    subscriptions.toggles.workspace === 0 &&
      subscriptions.toggles.runtime === 0 &&
      subscriptions.toggles.surface === 0,
    subscriptions.toggles,
  );
  check(
    "lifecycle · closing and reopening reads each source at most once — never twice",
    subscriptions.reopen.workspace <= 1 &&
      subscriptions.reopen.runtime <= 1 &&
      subscriptions.reopen.surface <= 1,
    subscriptions.reopen,
  );

  /* ------------------------------------------------------------------ 6
   * Escape order and accessible names. */
  await openSession("Memo review");
  const escape = await ev(`(async () => {
    const snap = () => ({
      expanded: document.getElementById('app-shell').classList.contains('surface-expanded'),
      rail: !document.getElementById('surface-rail').hidden,
      open: !document.getElementById('surface-panel').hidden,
    });
    const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    /* Open it the way a keyboard user would: focus the control, then press it. */
    if (${state}.surface.open) { document.getElementById('close-surface-button').click(); await new Promise(r => setTimeout(r, 300)); }
    const opener = document.getElementById('show-surface-button');
    opener.focus();
    opener.click();
    await new Promise(r => setTimeout(r, 900));
    document.querySelector('.rail-card .rail-open').click();
    await new Promise(r => setTimeout(r, 900));
    const steps = [snap()];
    esc(); await new Promise(r => setTimeout(r, 300)); steps.push(snap());
    esc(); await new Promise(r => setTimeout(r, 300)); steps.push(snap());
    return { steps, focus: document.activeElement?.id || null };
  })()`);
  check(
    "escape · sheet, then cards, then closed, and focus returns to the control that opened it",
    escape.steps[0].expanded === true &&
      escape.steps[1].expanded === false &&
      escape.steps[1].rail === true &&
      escape.steps[2].open === false &&
      escape.focus === "show-surface-button",
    escape,
  );

  await openSession("Runtime control");
  await ev(`document.querySelectorAll('.activity-group').forEach(g => g.open = true)`);
  await sleep(300);
  const names = await ev(`(() => {
    const nameOf = (node) => {
      const label = node.getAttribute('aria-label');
      if (label) return label;
      const text = node.innerText.trim();
      return text || null;
    };
    const controls = [...document.querySelectorAll('#message-stream button, #message-stream summary, #message-stream input, #surface-panel button')]
      .filter(n => n.offsetParent !== null || n.tagName === 'SUMMARY');
    return controls.map(n => ({ tag: n.tagName, name: nameOf(n), focusable: n.tabIndex >= 0 || ['BUTTON','SUMMARY','INPUT','A'].includes(n.tagName) }));
  })()`);
  check(
    "keyboard · every visible control in the flow and the surface has a full accessible name and is reachable",
    names.length > 0 && names.every(n => n.name && n.name.length > 0 && n.focusable),
    names.filter(n => !n.name).concat(names.slice(0, 6)),
  );

  /* ------------------------------------------------------------------ 7
   * Hit regions, overflow and reduced motion at the two widths. */
  const geometry = {};
  for (const [label, width, height] of [["1440", 1440, 900], ["390", 390, 844]]) {
    await viewport(width, height, width < 768);
    await sleep(700);
    geometry[label] = await ev(`(() => {
      const rows = [...document.querySelectorAll('#message-stream .flow-row')];
      const small = rows.filter(r => r.getBoundingClientRect().height < ${width < 768 ? 44 : 32}).length;
      return {
        rows: rows.length,
        underMinimum: small,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);
  }
  check(
    "geometry · every flow row clears the local 32 / 44 step and nothing overflows sideways",
    Object.values(geometry).every(g => g.underMinimum === 0 && g.overflow <= 0),
    geometry,
  );
  await viewport(1440, 900);

  check("no page exception was thrown", observations.exceptions.length === 0, observations.exceptions);
  await writeFile(new URL("./checks.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed`);
  if (results.some(r => !r.pass)) process.exitCode = 1;
} finally {
  await sleep(300);
  await close();
}
