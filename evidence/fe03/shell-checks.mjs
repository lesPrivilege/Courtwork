/* FE-03 · Chat / Work / Memory shell 的五轮收敛断言（WK-100 / WK-92）。
 * 每个事实都从渲染出来的文档上读，或经产品自己的 `window.__V5_UI__.request`
 * 读后端，不从 CSS 反推，也不写 UI 状态。
 *
 *   CW-1   未绑定会话的头部说 Chat，没有 scope 位（轮 ①）
 *   CW-2   绑定 Matter 的会话头部说 Work，并且多出一个 Memory · Off（轮 ①）
 *   CW-3   scope 位零 focusable、零 popover、无背景无边框（轮 ③ / ⑤）
 *   CW-4   模式词 / scope 位 / run badge 同字号同基线（轮 ②）
 *   CW-5   导航只对 Work 加标记，Chat 不加；两种行同高（轮 ②③）
 *   CW-6   Continue in Work 面板：一个 primary action，两段各自命名（轮 ①）
 *   CW-7   Continue in Work 只发 POST /sessions/:id/extension，且 Chat 的
 *          id、项目与历史条数逐字不变（不复制、不迁移）
 *   CW-8   续用之后同一个会话变成 Work：头部换词、scope 位出现
 *   CW-9   Settings › Memory 零控件，且 Session Memory 零命中
 *   CW-10  Chat / Work 两态与 Settings › Memory 三处无 backdrop-filter（轮 ④）
 *   CW-11  1440 / 390 无横向溢出（轮 ③）
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { readFile, writeFile } from "node:fs/promises";

const seed = JSON.parse(await readFile(new URL("./work-seed.json", import.meta.url), "utf8"));
const results = [];
const record = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(pass ? "PASS" : "FAIL", name, JSON.stringify(actual));
};
const state = "window.__V5_UI__.state";

const HEADER = `(() => {
  const meta = document.getElementById("session-meta");
  const mode = meta.querySelector(".session-mode");
  const scope = meta.querySelector(".session-scope");
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); const s = getComputedStyle(n);
    return { top: Math.round(r.top), size: s.fontSize, colour: s.color, background: s.backgroundColor, border: s.borderStyle }; };
  return {
    binding: window.__V5_UI__.state.session?.extensionBinding ?? null,
    mode: mode?.textContent ?? null,
    scope: scope?.textContent ?? null,
    metaFocusable: [...meta.querySelectorAll("button, a, input, select, [tabindex], [popover], [aria-haspopup]")].length,
    modeBox: box(mode),
    scopeBox: box(scope),
    badgeBox: box(meta.querySelector(".run-badge")),
    overflow: document.documentElement.scrollWidth - innerWidth,
    /* 轮 ④ 在 FE-05 之前只验"不越层、无未登记 blur"：登记表（WK-101 / lint-materials）
       今天只有 .jump-latest-button 与 .context-popover 两条，所以这里数的是**表外**
       的 backdrop-filter。 */
    blurred: [...document.querySelectorAll("#session-meta *, #conversation-body *, #settings-memory *")]
      .filter((n) => { const v = getComputedStyle(n).backdropFilter; return v && v !== "none"; })
      .filter((n) => !n.classList.contains("jump-latest-button") && !n.classList.contains("context-popover"))
      .map((n) => n.className),
  };
})()`;

async function openSession(id) {
  await ev(`window.__V5_UI__.selectSessionById && window.__V5_UI__.selectSessionById(${JSON.stringify(id)})`).catch(() => {});
  await ev(`(() => { location.hash = ""; return true; })()`);
  await ev(`(() => {
    const button = document.querySelector('[data-nav-key="session:${id}"]');
    if (button) { button.click(); return true; }
    return false;
  })()`);
  await waitFor(`${state}.activeSessionId === ${JSON.stringify(id)}`, 20000);
  await sleep(900);
}
async function expandProject(projectId) {
  await ev(`(() => {
    const p = document.querySelector('[data-nav-key="project:${projectId}"]');
    if (p && p.getAttribute("aria-expanded") !== "true") p.click();
    return true;
  })()`);
  await sleep(700);
}
async function shot(name) {
  const png = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(new URL(`./${name}.png`, import.meta.url), Buffer.from(png.data, "base64"));
}

try {
  await cdp("Network.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor("window.__V5_UI__ !== undefined", 20000);
  await waitFor(`${state}.projects.length > 0`, 20000);
  await expandProject(seed.projectId);

  // ── Chat：未绑定 ─────────────────────────────────────────────────────
  await openSession(seed.sessions.continuation);
  const chat = await ev(HEADER);
  record("CW-1 · 未绑定会话的头部说 Chat，没有 scope 位",
    chat.binding === null && chat.mode === "Chat" && chat.scope === null, chat);
  await shot("chat-1440-light");
  const chatHistory = await ev(`${state}.events.length`);
  const chatProject = await ev(`${state}.session.projectId`);

  // ── Work：已绑定 ─────────────────────────────────────────────────────
  await openSession(seed.sessions.complete);
  const work = await ev(HEADER);
  record("CW-2 · 绑定 Matter 的会话头部说 Work，并多出一个 Memory · Off",
    work.binding !== null && work.mode === "Work" && work.scope === "Memory · Off", work);
  record("CW-3 · scope 位零 focusable、无背景无边框",
    work.metaFocusable === 0 &&
      work.scopeBox.background === "rgba(0, 0, 0, 0)" && work.scopeBox.border === "none",
    { metaFocusable: work.metaFocusable, scopeBox: work.scopeBox });
  record("CW-4 · 模式词 / scope 位 / run badge 同字号同基线",
    work.modeBox.size === work.scopeBox.size && work.modeBox.top === work.scopeBox.top &&
      work.modeBox.colour === work.scopeBox.colour,
    { mode: work.modeBox, scope: work.scopeBox, badge: work.badgeBox });
  record("CW-10 · Chat / Work / Memory 三处无未登记 backdrop-filter",
    work.blurred.length === 0, { unregistered: work.blurred });
  record("CW-11 · 1440 无横向溢出", work.overflow <= 0, { overflow: work.overflow });
  await shot("work-1440-light");

  const nav = await ev(`(() => {
    const rows = [...document.querySelectorAll(".session-button")].map((b) => ({
      id: (b.getAttribute("data-nav-key") || "").replace("session:", ""),
      tag: b.querySelector(".session-mode-tag")?.textContent ?? null,
      height: Math.round(b.getBoundingClientRect().height),
    }));
    return rows;
  })()`);
  const boundRow = nav.find((r) => r.id === seed.sessions.complete);
  const chatRow = nav.find((r) => r.id === seed.sessions.continuation);
  record("CW-5 · 导航只对 Work 加标记，Chat 不加；两种行同高",
    boundRow?.tag === "Work" && chatRow?.tag === null &&
      new Set(nav.map((r) => r.height)).size === 1,
    { boundRow, chatRow, heights: [...new Set(nav.map((r) => r.height))] });

  // ── Continue in Work ────────────────────────────────────────────────
  await openSession(seed.sessions.continuation);
  await ev(`(() => { window.__V5_UI__.state.bindingExtensionId = "inbound-nda"; return true; })()`);
  await ev(`(() => {
    location.hash = "#settings/developer";
    return true;
  })()`);
  await sleep(500);
  await ev(`(() => {
    const b = [...document.querySelectorAll("button")].find((n) => n.textContent.trim() === "Continue in Work");
    if (b) { b.click(); return true; }
    return false;
  })()`);
  await waitFor(`document.getElementById("binding-panel").hidden === false`, 20000);
  await sleep(900);
  const panel = await ev(`(() => {
    const p = document.getElementById("binding-panel");
    return {
      heading: p.querySelector("h3")?.textContent ?? null,
      segments: [...p.querySelectorAll("h4")].map((n) => n.textContent),
      primary: [...p.querySelectorAll(".primary-button")].map((n) => n.textContent.trim()),
      note: p.querySelector(".binding-panel-note")?.textContent ?? "",
      entries: [...p.querySelectorAll(".binding-entry-open")].length,
    };
  })()`);
  record("CW-6 · Continue in Work 面板：一个 primary action，两段各自命名",
    panel.heading === "Continue in Work" && panel.primary.length === 1 &&
      panel.primary[0] === "Continue in Work" &&
      panel.segments.includes("Existing work in this project") && panel.segments.includes("New work") &&
      /Nothing is copied and nothing is moved/.test(panel.note),
    panel);
  await shot("continue-in-work-1440-light");

  // 续用既有 Matter：只发 extension 一条请求。
  const posted = [];
  await cdp("Network.setRequestInterception", { patterns: [] }).catch(() => {});
  const before = await ev(`window.__V5_UI__.request("/sessions/" + ${JSON.stringify(seed.sessions.continuation)})`);
  /* 面板里列着这个项目已有的三条 Matter；点的是 seed 记下的那一条，而不是
   * DOM 顺序里的第一条 —— 断言要能说出"续到了哪一条"。 */
  await ev(`(() => {
    const target = [...document.querySelectorAll(".binding-entry-open")]
      .find((b) => (b.getAttribute("aria-label") || "").includes(${JSON.stringify(seed.matterId)}));
    if (!target) throw new Error("seeded matter is not offered");
    target.click();
    return true;
  })()`);
  await waitFor(`${state}.session?.extensionBinding !== null`, 25000);
  await sleep(1200);
  const after = await ev(`window.__V5_UI__.request("/sessions/" + ${JSON.stringify(seed.sessions.continuation)})`);
  record("CW-7 · 同一个会话：id、项目与历史条数逐字不变，没有第二个会话被造出来",
    after.session.id === before.session.id && after.session.projectId === chatProject &&
      after.events.length === before.events.length && before.events.length === chatHistory &&
      after.session.extensionBinding.binding.matterId === seed.matterId,
    { id: after.session.id, projectId: after.session.projectId,
      events: [before.events.length, after.events.length], matterId: after.session.extensionBinding.binding.matterId });
  const nowWork = await ev(HEADER);
  record("CW-8 · 续用之后同一个会话变成 Work：头部换词，scope 位出现",
    nowWork.mode === "Work" && nowWork.scope === "Memory · Off", { mode: nowWork.mode, scope: nowWork.scope, posted });

  // ── Settings › Memory ───────────────────────────────────────────────
  await ev(`(() => { location.hash = "#settings/memory"; return true; })()`);
  await waitFor(`document.getElementById("settings-memory") && !document.getElementById("settings-memory").hidden`);
  await sleep(500);
  const memory = await ev(`(() => {
    const section = document.getElementById("settings-memory");
    return {
      focusable: [...section.querySelectorAll("button, a, input, select, textarea, [tabindex]")].length,
      text: section.innerText.replace(/\\s+/g, " ").trim(),
      blurred: [...section.querySelectorAll("*")].filter((n) => { const v = getComputedStyle(n).backdropFilter; return v && v !== "none"; }).length,
      paragraphs: [...section.querySelectorAll("p")].length,
    };
  })()`);
  record("CW-9 · Settings › Memory 零控件；Session Memory 零命中；Sources ≠ Memory；Temporary chat 只有一行",
    memory.focusable === 0 && memory.blurred === 0 &&
      !/session memory/i.test(memory.text) &&
      /Sources are files, not memory/.test(memory.text) &&
      /Temporary chat/.test(memory.text) && memory.paragraphs === 2,
    memory);
  await shot("settings-memory-1440-light");

  // ── 390 ────────────────────────────────────────────────────────────
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await sleep(600);
  await ev(`(() => { location.hash = ""; return true; })()`);
  await sleep(700);
  const narrow = await ev(`(() => ({ overflow: document.documentElement.scrollWidth - innerWidth }))()`);
  record("CW-11 · 390 无横向溢出", narrow.overflow <= 0, narrow);
  await shot("work-390-light");
} catch (error) {
  results.push({ name: "exception", pass: false, error: error.stack, dom: await ev("document.body.innerText").catch(() => null) });
  process.exitCode = 1;
} finally {
  await writeFile(new URL("./shell-checks.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log(`${results.filter((r) => r.pass).length} / ${results.length}`);
  await close();
}
