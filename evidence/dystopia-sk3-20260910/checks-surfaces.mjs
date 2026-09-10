/*
 * SK3 surface evidence.  This file only drives the product through its HTTP
 * API and browser surface; it does not write product state or seed the store
 * directly.  The server is the separately started local fake at ORIGIN.
 */
import { writeFile } from "node:fs/promises";

process.env.WK6_CDP_PORT ??= "21250";
const { cdp, evaluate: ev, waitFor, close, ORIGIN, observations, sleep } = await import("./browser.mjs");

const checks = [];
const screenshots = [];
const result = {
  schemaVersion: 1,
  task: "dystopia-sk3-surfaces",
  origin: ORIGIN,
  browserPort: Number(process.env.WK6_CDP_PORT),
  seed: null,
  checks,
  screenshots,
  observations,
};
let sessionToken = null;

const check = (name, pass, actual) => {
  checks.push({ name, pass: Boolean(pass), actual });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
};

async function api(path, init = {}) {
  const response = await fetch(`${ORIGIN}/api/v5${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${init.method || "GET"} ${path} ${response.status}: ${text}`);
  return body;
}

async function seedAttention() {
  const bootstrap = await api("/bootstrap");
  const token = bootstrap.sessionToken;
  sessionToken = token;
  const call = (path, init = {}) => api(path, {
    ...init,
    headers: { "x-work-token": token, ...(init.headers || {}) },
  });
  const json = body => JSON.stringify(body);
  const stamp = Date.now().toString(36);
  const prefix = `sk3-${stamp}-${crypto.randomUUID().slice(0, 8)}`;
  const project = (await call("/projects", { method: "POST", body: json({ name: `SK3 Dystopia ${stamp}` }) })).project;
  const emptyProject = (await call("/projects", { method: "POST", body: json({ name: `SK3 Empty ${stamp}` }) })).project;
  const longTitle = `Needs human review · ${"retained filing comparison requires a person to inspect the recorded basis · ".repeat(2)}final decision`;
  const longSummary = `Synthetic long text for SK3 surface evidence. ${"The detail remains a recorded Attention item and does not grant authority. ".repeat(7)}`;
  const records = [
    { suffix: "01-needs-you", title: longTitle, summary: longSummary, transition: ["resume", { reason: "A human decision is required for this long synthetic record.", status: "needs_you" }] },
    { suffix: "02-investigating", title: "Synthetic investigation", summary: "A record still being investigated.", transition: null },
    { suffix: "03-waiting", title: "Synthetic waiting item", summary: "A record waiting for its source owner.", transition: ["set_waiting", { reason: "Awaiting the source owner.", next_action: { kind: "wait", label: "Wait for source owner", trigger: "external", due_at: null } }] },
    { suffix: "04-later", title: "Synthetic later item", summary: "A record scheduled for later.", transition: ["snooze", { reason: "Review later.", next_action: { kind: "wait", label: "Review later", trigger: "at", due_at: "2099-01-01T00:00:00Z" } }] },
    { suffix: "05-resolved", title: "Synthetic resolved item", summary: "A completed human review.", transition: ["resolve", { reason: "Human review completed." }] },
  ];
  const request = (id, requestId, revision, action, payload) => ({
    schema_version: 1,
    request_id: requestId,
    attention_id: id,
    expected_revision: revision,
    action,
    payload,
  });
  const send = async (id, requestBody) => call(
    requestBody.action === "create" ? "/attention" : `/attention/${encodeURIComponent(id)}/actions`,
    { method: "POST", body: json({ projectId: project.id, request: requestBody }) },
  );
  const seeded = [];
  for (const item of records) {
    const id = `${prefix}-${item.suffix}`;
    await send(id, request(id, `${id}-create`, 0, "create", {
      descriptor: { title: item.title, summary: item.summary },
      reason: `Synthetic basis for ${item.title}.`,
      next_action: { kind: "inspect", label: "Inspect retained synthetic record", trigger: "manual", due_at: null },
      source_refs: [],
      relation_refs: [],
    }));
    if (item.transition) await send(id, request(id, `${id}-${item.transition[0]}`, 1, item.transition[0], item.transition[1]));
    seeded.push({ id, expectedStatus: item.transition?.[0] === "resume" ? "needs_you" : item.transition?.[0] === "set_waiting" ? "waiting" : item.transition?.[0] === "snooze" ? "later" : item.transition?.[0] === "resolve" ? "resolved" : "investigating" });
  }
  const registry = await call(`/attention/registry?projectId=${encodeURIComponent(project.id)}`);
  return { prefix, project, emptyProject, seeded, registry };
}

async function setViewport(width, height = 900) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
}

async function setTheme(skin, scheme) {
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
  await ev(`(()=>{const next={...(window.__cwPrefs?.value||{}),skin:${JSON.stringify(skin)},scheme:${JSON.stringify(scheme)},homeLayout:"modules",homeModuleBand:"expanded"};localStorage.setItem(window.__cwPrefs.key,JSON.stringify(next));return true})()`);
  /* Reload the actual document so index.html's first-frame preference read and
   * the settings projection both see the same persisted value. */
  await cdp("Page.reload", {});
  await waitFor("window.__V5_UI__?.state?.view === 'home'");
  await waitFor("!!window.__V5_UI__?.state?.homeAttention");
  await waitFor("!!window.__V5_UI__?.state?.projects");
  await sleep(220);
}

async function screenshot(name) {
  const image = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(new URL(`./${name}.png`, import.meta.url), Buffer.from(image.data, "base64"));
  screenshots.push(name);
}

async function goHome() {
  await cdp("Page.navigate", { url: `${ORIGIN}/#home` });
  await waitFor("!!window.__V5_UI__?.state?.homeAttention");
  await waitFor("!!window.__V5_UI__?.state?.projects");
  await sleep(250);
}

async function chooseHomeProject(projectId) {
  await waitFor("!!document.querySelector('.home-attention-project')");
  await ev(`(()=>{const select=document.querySelector('.home-attention-project');select.value=${JSON.stringify(projectId)};select.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  await waitFor(`window.__V5_UI__.state.homeAttention.projectId===${JSON.stringify(projectId)} && !window.__V5_UI__.state.homeAttention.loading`);
  await sleep(220);
}

async function homeReadout() {
  return ev(`(()=>{const rows=[...document.querySelectorAll('.home-attention-item')];return {
    skin:document.documentElement.dataset.skin||'slate',
    theme:document.documentElement.dataset.theme||'system',
    count:window.__V5_UI__.state.homeAttention.data?.count??null,
    statuses:rows.map(row=>row.dataset.status),
    reviewStatuses:rows.filter(row=>row.querySelector('.home-attention-state.is-review')).map(row=>row.dataset.status),
    reviewColor:document.querySelector('.home-attention-state.is-review')?getComputedStyle(document.querySelector('.home-attention-state.is-review')).color:null,
    longTitle:rows.some(row=>row.querySelector('.home-attention-item-title')?.textContent.length>140),
    empty:Boolean(document.querySelector('.home-attention-empty')),
    error:document.querySelector('.home-module-error')?.innerText||null,
    overflow:document.documentElement.scrollWidth-innerWidth,
    card:document.querySelector('.home-attention')?{width:Math.round(document.querySelector('.home-attention').getBoundingClientRect().width),height:Math.round(document.querySelector('.home-attention').getBoundingClientRect().height),background:getComputedStyle(document.querySelector('.home-attention')).backgroundColor}:null,
  }})()`);
}

async function openAttentionWorkspace(projectId) {
  await ev("document.querySelector('.home-attention-heading-link').click()");
  await waitFor("window.__V5_UI__.state.attentionOpen===true");
  await waitFor(`window.__V5_UI__.state.attentionOpen && window.__V5_UI__.state.projects?.some(p=>p.id===${JSON.stringify(projectId)})`);
  await waitFor("document.querySelector('.attention-workspace')");
  await sleep(300);
}

async function workspaceReadout() {
  return ev(`(()=>{const rows=[...document.querySelectorAll('.attention-registry-row')];const detail=document.querySelector('.attention-detail-state');return {
    skin:document.documentElement.dataset.skin||'slate',
    theme:document.documentElement.dataset.theme||'system',
    count:window.__V5_UI__.state.attentionOpen?rows.length:null,
    reviewRows:rows.filter(row=>row.querySelector('.home-attention-state.is-review')).map(row=>row.innerText.split('\\n')[0]),
    reviewColor:document.querySelector('.home-attention-state.is-review')?getComputedStyle(document.querySelector('.home-attention-state.is-review')).color:null,
    detailReview:Boolean(detail?.classList.contains('is-review')),
    detailText:detail?.textContent||null,
    longRow:rows.some(row=>row.innerText.length>140),
    empty:Boolean(document.querySelector('.attention-registry .attention-empty')),
    error:document.querySelector('.attention-registry [role="status"]')?.innerText||null,
    overflow:document.documentElement.scrollWidth-innerWidth,
    reading:document.querySelector('.attention-reading')?{width:Math.round(document.querySelector('.attention-reading').getBoundingClientRect().width),height:Math.round(document.querySelector('.attention-reading').getBoundingClientRect().height),background:getComputedStyle(document.querySelector('.attention-reading')).backgroundColor}:null,
  }})()`);
}

async function run() {
  await cdp("Network.enable");
  result.seed = await seedAttention();
  const { project, emptyProject, seeded } = result.seed;
  const needsYou = seeded.find(item => item.expectedStatus === "needs_you");
  if (!needsYou) throw new Error("seed did not create needs_you");

  await goHome();
  await chooseHomeProject(project.id);
  const populated = await homeReadout();
  check("Home reads the real five-status Attention registry", populated.count === 5 && populated.statuses.includes("needs_you"), populated);
  check("Home marks only needs_you as review and preserves long title input", populated.reviewStatuses.length === 1 && populated.reviewStatuses[0] === "needs_you" && populated.longTitle, populated);

  /* Capture the populated Home surface in both skins, both schemes and all
   * requested widths before the explicit needs_you → resolved transition. */
  for (const skin of ["slate", "dystopia"]) for (const scheme of ["light", "dark"]) for (const width of [1440, 1280, 390]) {
    await setViewport(width); await setTheme(skin, scheme); await chooseHomeProject(project.id);
    const reading = await homeReadout();
    const expectedReview = scheme === "dark" ? "rgb(239, 170, 164)" : "rgb(174, 54, 48)";
    check(`Home ${skin}/${scheme}/${width} persisted theme + fixed review + no horizontal overflow`, reading.skin === skin && reading.theme === scheme && reading.reviewColor === expectedReview && reading.reviewStatuses.length === 1 && reading.overflow <= 1, reading);
    await screenshot(`home-${skin}-${scheme}-${width}`);
  }

  await setViewport(1440); await setTheme("slate", "light"); await chooseHomeProject(project.id);
  await openAttentionWorkspace(project.id);
  const workspace = await workspaceReadout();
  check("Attention workspace reads all five seeded statuses", workspace.count === 5 && workspace.reviewRows.length === 1, workspace);
  await ev("document.querySelector('.attention-registry-row .home-attention-state.is-review')?.closest('button')?.click()");
  await waitFor("Boolean(document.querySelector('.attention-detail-state'))");
  const selected = await workspaceReadout();
  check("Attention detail keeps needs_you as the only review state", selected.detailReview && selected.reviewRows.length === 1 && selected.longRow, selected);

  for (const skin of ["slate", "dystopia"]) for (const scheme of ["light", "dark"]) for (const width of [1440, 1280, 390]) {
    await setViewport(width); await setTheme(skin, scheme); await chooseHomeProject(project.id); await openAttentionWorkspace(project.id);
    await ev("document.querySelector('.attention-registry-row .home-attention-state.is-review')?.closest('button')?.click()");
    await waitFor("Boolean(document.querySelector('.attention-detail-state'))");
    const reading = await workspaceReadout();
    const expectedReview = scheme === "dark" ? "rgb(239, 170, 164)" : "rgb(174, 54, 48)";
    check(`Attention ${skin}/${scheme}/${width} persisted theme + fixed review + no horizontal overflow`, reading.skin === skin && reading.theme === scheme && reading.reviewColor === expectedReview && reading.reviewRows.length === 1 && reading.overflow <= 1, reading);
    await screenshot(`attention-${skin}-${scheme}-${width}`);
  }

  /* A real typed transition, then a real workspace refresh, proves the
   * visual review marker follows the recorded status instead of the title. */
  await setViewport(1440); await setTheme("slate", "light"); await chooseHomeProject(project.id);
  const resolved = requestForResolve(result.seed, needsYou.id);
  await api(`/attention/${encodeURIComponent(needsYou.id)}/actions`, { method: "POST", headers: { "x-work-token": sessionToken }, body: JSON.stringify({ projectId: project.id, request: resolved }) });
  await openAttentionWorkspace(project.id);
  await ev("document.querySelector('[data-attention-focus=refresh]')?.click()");
  await waitFor("document.querySelectorAll('.attention-registry-row').length===5");
  await sleep(250);
  const afterResolve = await workspaceReadout();
  check("needs_you → resolved removes the review marker after workspace refresh", afterResolve.reviewRows.length === 0 && !afterResolve.detailReview, afterResolve);
  await ev("document.getElementById('home-button')?.click()");
  await waitFor("window.__V5_UI__.state.attentionOpen===false");
  await chooseHomeProject(project.id);
  const homeResolved = await homeReadout();
  check("Home reflects resolved status after the typed transition", homeResolved.reviewStatuses.length === 0 && homeResolved.statuses.includes("resolved"), homeResolved);
  await screenshot("home-resolved-slate-light-1440");

  /* Empty project is a real project with no Attention rows. */
  await chooseHomeProject(emptyProject.id);
  const emptyHome = await homeReadout();
  check("Home empty project states empty Attention without fabricating a row", emptyHome.count === 0 && emptyHome.empty && emptyHome.overflow <= 1, emptyHome);
  await screenshot("home-empty-slate-light-1440");
  await openAttentionWorkspace(emptyProject.id);
  const emptyWorkspace = await workspaceReadout();
  check("Attention workspace empty project has an explicit empty state", emptyWorkspace.count === 0 && emptyWorkspace.empty, emptyWorkspace);
  await ev("document.getElementById('home-button')?.click()"); await waitFor("window.__V5_UI__.state.attentionOpen===false");

  /* Block only the Attention registry endpoint and force the real Home retry.
   * The previous data must stay visible while the error is shown. */
  await chooseHomeProject(project.id);
  await cdp("Network.setBlockedURLs", { urls: ["*attention/query*"] });
  await ev(`(()=>{const select=document.querySelector('.home-attention-project');select.value=${JSON.stringify(project.id)};select.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  await waitFor("Boolean(window.__V5_UI__.state.homeAttention.error)"); await sleep(250);
  const homeFailure = await homeReadout();
  const homeRetry = await ev("document.querySelector('.home-module-error button')?.textContent||null");
  check("Home load failure keeps last records and exposes Retry", Boolean(homeFailure.error) && homeFailure.count === 5 && homeRetry === "Retry", { ...homeFailure, retry: homeRetry });
  await screenshot("home-load-failure-slate-light-1440");
  await cdp("Network.setBlockedURLs", { urls: [] });
  await ev("document.querySelector('.home-module-error button')?.click()");
  await waitFor("!window.__V5_UI__.state.homeAttention.error && !!window.__V5_UI__.state.homeAttention.data");

  await openAttentionWorkspace(project.id);
  await cdp("Network.setBlockedURLs", { urls: ["*attention/query*"] });
  await ev("document.querySelector('[data-attention-focus=refresh]')?.click()");
  await waitFor("Boolean(document.querySelector('.attention-registry [role=\"status\"]'))"); await sleep(200);
  const workspaceFailure = await workspaceReadout();
  check("Attention workspace load failure exposes status instead of an empty registry", Boolean(workspaceFailure.error) && workspaceFailure.count === 0, workspaceFailure);
  await screenshot("attention-load-failure-slate-light-1440");
  await cdp("Network.setBlockedURLs", { urls: [] });
  await ev("document.querySelector('[data-attention-focus=refresh]')?.click()");
  await waitFor("document.querySelectorAll('.attention-registry-row').length===5");
  check("Attention retry restores the real registry", (await workspaceReadout()).count === 5, await workspaceReadout());
}

function requestForResolve(seed, id) {
  return { schema_version: 1, request_id: `${seed.prefix}-resolve-after-screenshot`, attention_id: id, expected_revision: 2, action: "resolve", payload: { reason: "SK3 synthetic review resolved by a human." } };
}

let fatal = null;
try {
  await run();
} catch (error) {
  fatal = error.stack || String(error);
  console.error(fatal);
} finally {
  result.observations = observations;
  result.fatal = fatal;
  result.pass = !fatal && checks.every(item => item.pass);
  await writeFile(new URL("./checks-surfaces.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
  await close();
}

if (!result.pass) process.exitCode = 1;
