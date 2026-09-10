/* FE-05a Commit C · V1 字阶与控件密度的断言（TYPE-*）。
 *
 *   TYPE-1  `:root` 的九个字阶 / 字距 / 控件 token 就是 V1 选定的那组值
 *   TYPE-2  阅读与正文一字未动：--text-reading 15、--text-body 14，消息正文实测同值
 *   TYPE-3  桌面控件 28、segment 26；390 下控件与 segment 仍 ≥44（V1 不动命中区）
 *   TYPE-4  按钮完整可读：无折行、scrollWidth ≤ clientWidth；Send / Cancel run 的
 *           字形、可访问名与几何逐项记录（不预设宽度，记实测）
 *   TYPE-5  两宗下每一个取样文字角色的实测对比度 ≥ 4.5
 *   TYPE-6  大写 eyebrow 的字距是 0.08em
 * harness 逐字复制自 evidence/cc-d0a/browser.mjs，只改端口。
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { readFile, writeFile } from "node:fs/promises";

const results = [];
const record = (id, pass, detail) => results.push({ id, pass, ...detail });

async function open(url, { width = 1440, height = 900, scheme = "light" } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await cdp("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-color-scheme", value: scheme },
    { name: "prefers-reduced-motion", value: "reduce" }] });
  await cdp("Page.navigate", { url });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(600);
}
const openWork = async () => {
  await ev(`document.querySelector('.project-list button')?.click(), true`);
  await sleep(400);
  await ev(`(() => { const list = document.querySelectorAll('.project-list [data-session-id]');
     (list[0] || document.querySelector('.home-row'))?.click(); return true; })()`);
  await waitFor("window.__V5_UI__?.state.activeSessionId");
  await sleep(700);
};

const V1 = {
  "--text-title": 18, "--text-navigation-title": 15, "--text-reading": 15,
  "--text-body": 14, "--text-section": 13, "--text-label": 12,
  "--text-meta": 11.5, "--text-caption": 10.5,
};
const TOKENS = `(() => {
  const root = document.documentElement;
  const probe = document.createElement("div");
  document.body.append(probe);
  const read = (name) => { probe.style.fontSize = getComputedStyle(root).getPropertyValue(name); 
    return parseFloat(getComputedStyle(probe).fontSize); };
  const out = {};
  for (const name of ${JSON.stringify(Object.keys(V1))}) out[name] = read(name);
  const style = getComputedStyle(root);
  out["--tracking-caps"] = style.getPropertyValue("--tracking-caps").trim();
  out["--control"] = style.getPropertyValue("--control").trim();
  out["--radius-control"] = style.getPropertyValue("--radius-control").trim();
  out["--text-scale"] = style.getPropertyValue("--text-scale").trim();
  probe.remove();
  return out;
})()`;

try {
  /* ── TYPE-1 / TYPE-2 / TYPE-6 ───────────────────────────────────────── */
  await open(ORIGIN);
  const tokens = await ev(TOKENS);
  record("TYPE-1", Object.entries(V1).every(([name, value]) => Math.abs(tokens[name] - value) < 0.01) &&
    tokens["--tracking-caps"] === "0.08em" && tokens["--control"] === "28px" &&
    tokens["--radius-control"] === "8px", { tokens, expected: { ...V1, "--tracking-caps": "0.08em", "--control": "28px" } });

  await openWork();
  const reading = await ev(`(() => {
    const p = document.querySelector('.markdown-body p');
    const body = document.querySelector('.settings-row-title') || document.querySelector('.user-message-content');
    const s = p && getComputedStyle(p);
    return { reading: s ? parseFloat(s.fontSize) : null, readingLineHeight: s ? s.lineHeight : null,
      body: body ? parseFloat(getComputedStyle(body).fontSize) : null };
  })()`);
  record("TYPE-2", reading.reading === 15 && reading.body === 14, { ...reading, expected: { reading: 15, body: 14 } });

  const caps = await ev(`(() => {
    const n = document.querySelector('.eyebrow, .message-role, .context-card h4');
    if (!n) return null;
    const s = getComputedStyle(n);
    return { selector: n.className, letterSpacing: s.letterSpacing, fontSize: parseFloat(s.fontSize),
      transform: s.textTransform, expected: Math.round(parseFloat(s.fontSize) * 0.08 * 100) / 100 };
  })()`);
  record("TYPE-6", Boolean(caps) && Math.abs(parseFloat(caps.letterSpacing) - caps.expected) <= 0.05, caps ?? {});

  /* ── TYPE-3 · 桌面密度与 390 命中区 ─────────────────────────────────── */
  const desktop = await ev(`(() => {
    const control = document.getElementById('show-surface-button');
    const segment = document.querySelector('.segment');
    return { control: control ? Math.round(control.getBoundingClientRect().height) : null,
      segmentMin: segment ? getComputedStyle(segment).minHeight : null };
  })()`);
  const desktopSegment = await (async () => {
    await open(`${ORIGIN}/#settings/general`);
    await sleep(600);
    return ev(`(() => {
      /* 基线规则的取值来自规则本身；实例高度另记 —— Settings 行里的 segment 是换行
         变体（.settings-row .segment），它有自己的两行密度，不是基线那一条。 */
      let base = null;
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        const walk = (list) => { for (const rule of list) {
          if (!rule.selectorText) { if (rule.cssRules) walk(rule.cssRules); continue; }
          if (rule.selectorText === '.segment' && rule.style.minHeight && !rule.parentRule)
            base = rule.style.minHeight;
        } };
        walk(rules);
      }
      const instances = [...document.querySelectorAll('.segment')]
        .filter((n) => n.getClientRects().length)
        .map((n) => ({ parent: n.parentElement.className,
          height: Math.round(n.getBoundingClientRect().height),
          minHeight: getComputedStyle(n).minHeight }));
      return { base, instances };
    })()`);
  })();
  record("TYPE-3-desktop", desktop.control === 28 && desktopSegment.base === "26px", {
    control: desktop.control, segmentBaseRule: desktopSegment.base,
    segmentInstances: desktopSegment.instances,
    note: "Settings 行里的 segment 走 .settings-row .segment 的换行变体（32），基线 26 今天没有可见实例",
  });
  await open(`${ORIGIN}/#settings/general`, { width: 390, height: 844 });
  await sleep(600);
  const narrow = await ev(`(() => {
    const targets = [...document.querySelectorAll('button, select, input:not([type=radio]), .segment')]
      .filter((n) => n.getClientRects().length && !n.classList.contains('sr-only'))
      .map((n) => ({ id: n.id || n.className, height: Math.round(n.getBoundingClientRect().height) }));
    return { total: targets.length, under44: targets.filter((t) => t.height < 44),
      control: getComputedStyle(document.documentElement).getPropertyValue('--control').trim() };
  })()`);
  record("TYPE-3-390", narrow.control === "44px" && narrow.under44.length === 0, narrow);

  /* ── TYPE-4 · 按钮完整可读 ──────────────────────────────────────────── */
  await open(ORIGIN);
  const homeButtons = await ev(`(() => {
    const read = (b) => { const r = b.getBoundingClientRect();
      const shown = b.querySelector(':scope > .button-label');
      return { id: b.id || b.className, label: shown ? shown.textContent.trim() : null,
        width: Math.round(r.width), height: Math.round(r.height),
        scrollWidth: b.scrollWidth, clientWidth: b.clientWidth,
        wrapped: b.scrollWidth > b.clientWidth + 1,
        glyph: Boolean(b.querySelector(':scope > svg.ui-icon')),
        iconOnly: b.classList.contains('icon-only'), aria: b.getAttribute('aria-label') }; };
    const all = [...document.querySelectorAll('button')].filter((b) => b.getClientRects().length).map(read);
    const send = document.getElementById('send-button');
    return { wrapped: all.filter((b) => b.wrapped), send: send ? read(send) : null };
  })()`);
  await openWork();
  const workButtons = await ev(`(() => {
    const read = (b) => { const r = b.getBoundingClientRect();
      const shown = b.querySelector(':scope > .button-label');
      return { id: b.id || b.className, label: shown ? shown.textContent.trim() : null,
        width: Math.round(r.width), height: Math.round(r.height),
        scrollWidth: b.scrollWidth, clientWidth: b.clientWidth,
        wrapped: b.scrollWidth > b.clientWidth + 1,
        glyph: Boolean(b.querySelector(':scope > svg.ui-icon')),
        iconOnly: b.classList.contains('icon-only'), aria: b.getAttribute('aria-label') }; };
    const all = [...document.querySelectorAll('button')].filter((b) => b.getClientRects().length).map(read);
    const cancel = document.getElementById('cancel-run-button');
    return { wrapped: all.filter((b) => b.wrapped), cancel: cancel ? read(cancel) : null,
      labelled: all.filter((b) => b.label && b.iconOnly) };
  })()`);
  record("TYPE-4", homeButtons.wrapped.length === 0 && workButtons.wrapped.length === 0 &&
    workButtons.labelled.length === 0 &&
    homeButtons.send?.glyph === true && homeButtons.send?.aria === "Send" &&
    workButtons.cancel?.glyph === true && workButtons.cancel?.aria === "Cancel run", {
    send: homeButtons.send, cancel: workButtons.cancel,
    wrapped: [...homeButtons.wrapped, ...workButtons.wrapped],
    lockedAndLabelled: workButtons.labelled,
  });

  /* ── TYPE-5 · 两宗的实测对比度（读 measure.mjs 已取的样本） ─────────── */
  const measured = JSON.parse(await readFile(new URL("./measurements/v1.json", import.meta.url), "utf8"));
  const low = [];
  for (const [surface, roles] of Object.entries(measured.surfaces))
    for (const [role, value] of Object.entries(roles))
      if (!role.startsWith("__") && value && value.contrast < 4.5)
        low.push({ surface, role, contrast: value.contrast, size: value.fontSize });
  record("TYPE-5", low.length === 0, {
    sampled: Object.values(measured.surfaces).reduce((n, roles) =>
      n + Object.entries(roles).filter(([role, value]) => !role.startsWith("__") && value).length, 0),
    below: low, source: "measurements/v1.json",
  });
} finally {
  await writeFile(new URL("./type-checks.json", import.meta.url),
    JSON.stringify({ results, passed: results.filter((r) => r.pass).length, total: results.length }, null, 1));
  console.log(results.map((r) => `${r.pass ? "ok" : "FAIL"} ${r.id}`).join("\n"));
  console.log(`${results.filter((r) => r.pass).length}/${results.length}`);
  await close();
}
