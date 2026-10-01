// S5 visual evidence · icon sizes and meanings on the surfaces that carry most
// glyphs: Home, a chat with tool rows and message actions, the rail with the
// account menu and the object menu, and Settings tabs. Every visible `.ui-icon`
// is measured: the rendered box against the size its `icon()` call asked for
// (rulings ICN-10: the size passed is the size rendered).
//
//   node engineering/research/ux-interaction-topology-20260930/evidence/capture-s5.mjs --label before|after [--data-dir <dir>]
//
// `before` captures 1440 light only, for comparison; `after` captures 1440 and
// 390, light and dark. Harness: harness.mjs. Author evidence, not acceptance.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openHarness, sleep } from "./harness.mjs";

const labelAt = process.argv.indexOf("--label");
const label = labelAt > 0 ? process.argv[labelAt + 1] : "after";
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "captures-s5", label);
const h = await openHarness({ outDir: OUT_DIR, prefix: "cw-ux-topology-s5-" });
const { call, until, evaluate, waitFor, click, closeAll, variant, shot } = h;

// Seed through the app's own API.
const lease = (await call("/projects", { method: "POST", body: JSON.stringify({ name: "租约审阅 Harborview" }) })).project.id;
await call("/projects", { method: "POST", body: JSON.stringify({ name: "证据整理" }) });
const session = async (title) => (await call("/sessions", { method: "POST", body: JSON.stringify({ projectId: lease, title }) })).session.id;
const tools = await session("续期条款核对 · Lease renewal");
await session("合同红线（待确认）");
const settled = async (sessionId, input) => {
  const run = (await call(`/sessions/${sessionId}/runs`, { method: "POST", body: JSON.stringify({ input, commandId: crypto.randomUUID() }) })).run;
  await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${run.id}`)).run.status));
};
await settled(tools, "请核对租约的续期窗口，并列出通知期限。");
await settled(tools, `/fixture script ${JSON.stringify([{ name: "ws_write", arguments: { path: "out/续期摘要.md", text: "Synthetic summary." } }, { name: "ws_list", arguments: {} }])}`);

const report = { label, scenes: [], errors: [] };
// Every visible glyph: requested size (the width attribute icon() sets) against the rendered box.
const measure = () => evaluate(`(() => {
  const rows = [];
  for (const node of document.querySelectorAll('svg.ui-icon')) {
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(node).visibility === 'hidden') continue;
    const host = node.closest('button, a, summary, [role], h1, h2, h3, h4, li, div');
    rows.push({ asked: Number(node.getAttribute('width')), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
      where: (host?.id ? '#' + host.id : '') + '.' + String(host?.className || host?.tagName || '').split(' ')[0] });
  }
  const mismatched = rows.filter((row) => row.w !== row.asked || row.h !== row.asked);
  const sizes = {};
  for (const row of rows) sizes[row.w + 'x' + row.h] = (sizes[row.w + 'x' + row.h] || 0) + 1;
  return { glyphs: rows.length, sizes, mismatched: mismatched.length, examples: [...new Map(mismatched.map((row) => [row.where + row.asked + row.w, row])).values()].slice(0, 12) };
})()`);
const railRow = (title) => `[...document.querySelectorAll('.session-button')].find((b) => b.textContent.includes(${JSON.stringify(title)}))`;

await h.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await h.cdp("Page.navigate", { url: `${h.origin}/` });
await waitFor(`document.readyState === 'complete' && document.querySelectorAll('.session-button').length > 0`, "the rail");
await sleep(600);

async function toHome() {
  await evaluate(`(location.hash = '', document.getElementById('home-button').click(), true)`);
  await waitFor(`!document.getElementById('home-composer-context').hidden`, "Home");
}
async function toChat() {
  await evaluate(`(location.hash = '', ${railRow("续期条款核对")}?.click(), true)`);
  await waitFor(`!document.getElementById('composer-area').hidden && document.querySelectorAll('.flow-row').length > 0`, "the chat");
}
const scenes = [
  ["home", async () => { await toHome(); }],
  ["chat", async () => {
    await toChat();
    // Reveal the last answer's actions as a pointer over it would.
    await evaluate(`(() => { const row = [...document.querySelectorAll('.chat-action-row')].at(-1); row?.closest('[class*="message"]')?.scrollIntoView({ block: 'center' }); row?.querySelector('button')?.focus(); return true; })()`);
  }],
  ["account-menu", async () => { await toChat(); await click("#account-button"); await waitFor(h.open("account-popover"), "the account menu"); }],
  ["object-menu", async () => {
    await toChat();
    await evaluate(`(${railRow("合同红线")}?.parentElement?.querySelector('.object-more')?.click(), true)`);
    await waitFor(h.open("object-menu"), "the object menu");
  }],
  ["settings", async () => {
    await evaluate(`(location.hash = '#settings/models', true)`);
    await waitFor(`Boolean(document.querySelector('.settings-tab.is-current'))`, "Settings");
  }],
];
const variants = label === "before" ? [[1440, 900, "light"]] : [[1440, 900, "light"], [1440, 900, "dark"], [390, 844, "light"], [390, 844, "dark"]];
for (const [width, height, scheme] of variants) {
  await variant(width, height, scheme);
  for (const [scene, act] of scenes) {
    const name = `${scene}-${width}-${scheme}`;
    try {
      await closeAll();
      if (width < 768 && (scene === "account-menu" || scene === "object-menu")) {
        await act();
        await closeAll();
        await click("#toggle-nav-button");
        await sleep(400);
        if (scene === "account-menu") await click("#account-button");
        else await evaluate(`(${railRow("合同红线")}?.parentElement?.querySelector('.object-more')?.click(), true)`);
        await sleep(300);
      } else await act();
      await shot(name);
      report.scenes.push({ name, ...(await measure()) });
    } catch (error) {
      report.errors.push({ name, error: String(error?.message || error) });
    }
  }
}

/* IC-8 · every glyph's occupancy on the 24 grid: the stroked bounding box
   (getBBox plus the 2px stroke) as a share of 24, beside the Lucide median and
   interquartile band. A hand-drawn glyph belongs in the band of its Lucide
   neighbours at the same size. */
report.occupancy = await evaluate(`(async () => {
  const { iconData } = await import('/web/vendor/icon-data.generated.mjs');
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.setAttribute('width', '0'); host.setAttribute('height', '0');
  document.body.append(host);
  const rows = {};
  for (const [name, shapes] of Object.entries(iconData)) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (const [tag, attrs] of shapes) { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v); g.append(node); }
    host.append(g);
    const box = g.getBBox();
    const w = Math.min(24, box.width + 2), h = Math.min(24, box.height + 2);
    rows[name] = { x0: +(box.x - 1).toFixed(2), y0: +(box.y - 1).toFixed(2), x1: +(box.x + box.width + 1).toFixed(2), y1: +(box.y + box.height + 1).toFixed(2), span: +(Math.max(w, h) / 24).toFixed(3), area: +((w * h) / 576).toFixed(3) };
    g.remove();
  }
  host.remove();
  return rows;
})()`);
{
  const { readFile } = await import("node:fs/promises");
  const courtwork = JSON.parse(await readFile(new URL("../../../../tools/ui-vendor/courtwork/sources.json", import.meta.url), "utf8"));
  const domain = new Set(Object.keys(courtwork.files).filter((file) => file.endsWith(".svg")).map((file) => file.slice(0, -4)));
  const quantile = (values, q) => { const sorted = [...values].sort((a, b) => a - b); const at = (sorted.length - 1) * q; const lo = Math.floor(at); return +(sorted[lo] + (sorted[Math.ceil(at)] - sorted[lo]) * (at - lo)).toFixed(3); };
  const lucide = Object.entries(report.occupancy).filter(([name]) => !domain.has(name)).map(([, row]) => row.area);
  report.occupancyBand = { lucideArea: { q1: quantile(lucide, 0.25), median: quantile(lucide, 0.5), q3: quantile(lucide, 0.75) },
    domain: Object.fromEntries([...domain].map((name) => [name, report.occupancy[name]])) };
}

await h.writeReport(report);
console.log(JSON.stringify({ scenes: report.scenes.map(({ name, glyphs, mismatched }) => ({ name, glyphs, mismatched })), errors: report.errors }, null, 2));
await h.close();
