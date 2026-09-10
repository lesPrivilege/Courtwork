/* FE-05a · 字阶 / 密度 / 形状的实测取样。三次调用产出三份可并排的 JSON：
 *   OUT=baseline-repaired  Commit A 之后（缺陷已修，字阶未动）
 *   OUT=shape-baseline     Commit B 之后（Shape 语法落地，字阶仍未动）—— V1 对照的 A 侧
 *   OUT=v1                 Commit C 之后（V1 字阶与控件密度）—— V1 对照的 B 侧
 * 两处消融面各 1440 / 390 × 浅 / 深，1:1，不 zoom，同一份种子数据与同一个运行态。
 * harness 逐字复制自 evidence/cc-d0a/browser.mjs，只改端口。
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile, mkdir } from "node:fs/promises";

const OUT = process.env.OUT ?? "measure";
const SHOT = process.env.SHOT === "1";

async function open(url, { width = 1440, height = 900, scheme = "light" } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
  });
  await cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: scheme },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  await cdp("Page.navigate", { url });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(600);
}
const shot = async (name) => {
  if (!SHOT) return;
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  await writeFile(new URL(`./screenshots/${name}.png`, import.meta.url),
    Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"));
};

/* 一个角色一条实测：字号、字重、行高、字距、盒高，以及渲染出来的前景色对它实际
   落在的那张底面的 WCAG 比值（底面沿祖先链找第一个不透明背景，与眼睛看到的一致）。 */
const SAMPLE = (roles) => `(() => {
  const rel = (c) => { const f=(v)=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;};
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
  const parse = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const opaque = (s) => { const p = parse(s); return p.length >= 3 && (p.length < 4 || p[3] === 1); };
  const ground = (node) => {
    for (let n = node; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (opaque(bg)) return parse(bg).slice(0, 3);
    }
    return [255, 255, 255];
  };
  const ratio = (a, b) => { const [x, y] = [rel(a), rel(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const out = {};
  for (const [role, selector] of ${JSON.stringify(roles)}) {
    const node = [...document.querySelectorAll(selector)].find((n) => n.getClientRects().length);
    if (!node) { out[role] = null; continue; }
    const s = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    const fg = parse(s.color).slice(0, 3);
    out[role] = {
      selector,
      text: node.textContent.trim().slice(0, 28),
      fontSize: Math.round(parseFloat(s.fontSize) * 100) / 100,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight === "normal" ? "normal" : Math.round(parseFloat(s.lineHeight) * 100) / 100,
      letterSpacing: s.letterSpacing,
      height: Math.round(r.height * 100) / 100,
      width: Math.round(r.width * 100) / 100,
      radius: s.borderTopLeftRadius,
      contrast: Math.round(ratio(fg, ground(node)) * 100) / 100,
    };
  }
  out.__tokens = Object.fromEntries(["--text-title","--text-navigation-title","--text-reading",
    "--text-body","--text-section","--text-label","--text-meta","--text-caption","--tracking-caps",
    "--control","--radius-control","--text-scale"].map((t) => [t,
      getComputedStyle(document.documentElement).getPropertyValue(t).trim()]));
  out.__overflow = document.documentElement.scrollWidth - innerWidth;
  return out;
})()`;

const SETTINGS_ROLES = [
  ["title", ".settings-section h2"],
  ["section", ".settings-section h3"],
  ["row-label", ".settings-row-label"],
  ["help", ".form-help"],
  ["nav-item", ".settings-tab"],
  ["segment", ".segment"],
  ["select", ".settings-row-control select"],
  ["button", ".settings-row-control button"],
  ["back", "#settings-back-button"],
  ["page-title", ".chat-header h1"],
];
const WORK_ROLES = [
  ["navigation-title", ".chat-header h1"],
  ["reading", ".message-text"],
  ["message-role", ".message-role"],
  ["status-badge", ".status-badge"],
  ["composer-input", "#composer-input"],
  ["send", "#send-button"],
  ["cancel", "#cancel-run-button"],
  ["run-hint", ".composer-run-hint"],
  ["scope", "#model-settings-button"],
  ["surface-button", "#show-surface-button"],
];

const openWork = async () => {
  await ev(`document.querySelector('.project-list button')?.click(), true`);
  await sleep(400);
  await ev(`(() => { const list = document.querySelectorAll('.project-list [data-session-id]');
     (list[0] || document.querySelector('.home-row'))?.click(); return true; })()`);
  await waitFor("window.__V5_UI__?.state.activeSessionId");
  await sleep(700);
};
const startRun = async () => {
  await ev(`(() => { const t = document.getElementById('composer-input');
    t.focus(); t.value = 'Summarise the retainer letter';
    t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await sleep(250);
  await ev(`(() => { document.getElementById('send-button').click(); return true; })()`);
  await waitFor(`(() => { const c = document.getElementById('cancel-run-button');
    return Boolean(c && !c.hidden && c.getClientRects().length); })()`);
  await sleep(300);
};

const report = { out: OUT, sampledAt: new Date().toISOString(), surfaces: {} };
try {
  for (const scheme of ["light", "dark"])
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const tag = `${width}-${scheme}`;
      /* Settings › General */
      await open(`${ORIGIN}/#settings/general`, { width, height, scheme });
      await sleep(600);
      await shot(`settings-${tag}-${OUT}`);
      report.surfaces[`settings-${tag}`] = await ev(SAMPLE(SETTINGS_ROLES));
      /* Work 头部 + composer：idle（Send）与在跑（Cancel run）两个态 */
      await open(ORIGIN, { width, height, scheme });
      await openWork();
      await shot(`work-idle-${tag}-${OUT}`);
      report.surfaces[`work-idle-${tag}`] = await ev(SAMPLE(WORK_ROLES));
      await startRun();
      await shot(`work-cancel-${tag}-${OUT}`);
      report.surfaces[`work-cancel-${tag}`] = await ev(SAMPLE(WORK_ROLES));
    }
} finally {
  await mkdir(new URL("./measurements/", import.meta.url), { recursive: true });
  await writeFile(new URL(`./measurements/${OUT}.json`, import.meta.url), JSON.stringify(report, null, 1));
  const failures = [];
  for (const [surface, roles] of Object.entries(report.surfaces))
    for (const [role, value] of Object.entries(roles))
      if (value && value.contrast !== undefined && value.contrast < 4.5 && !role.startsWith("__"))
        failures.push(`${surface}/${role} ${value.contrast}`);
  console.log(`${OUT}: ${Object.keys(report.surfaces).length} surfaces`);
  console.log(failures.length ? `contrast below 4.5: ${failures.join(", ")}` : "contrast: every sampled role ≥ 4.5");
  await close();
}
