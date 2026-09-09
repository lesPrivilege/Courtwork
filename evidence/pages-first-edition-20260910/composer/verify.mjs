import { writeFile, mkdir } from "node:fs/promises";
import { cdp, evaluate, waitFor, close, ORIGIN, sleep, observations } from "../../cc-w-main-integration-20260909/browser.mjs";

const evidenceDir = process.env.EVIDENCE_DIR ?? new URL(".", import.meta.url).pathname;
await mkdir(evidenceDir, { recursive: true });
const origin = process.env.APP_URL ?? ORIGIN;
const boot = await (await fetch(`${origin}/api/v5/bootstrap`)).json();
const token = boot.sessionToken;
const headers = { "content-type": "application/json", "x-work-token": token };
const api = async (path, method = "GET", body) => {
  const response = await fetch(`${origin}/api/v5${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${raw}`);
  return raw ? JSON.parse(raw) : null;
};
const project = (await api("/projects")).projects.at(-1);
if (!project) throw new Error("seed project missing");
const sessions = (await api(`/sessions?projectId=${encodeURIComponent(project.id)}`)).sessions;
const byTitle = (title) => {
  const value = sessions.find((item) => item.title === title);
  if (!value) throw new Error(`session missing: ${title}`);
  return value;
};
const chat = byTitle("Chat verification");
const work = byTitle("Work verification");
const failure = byTitle("Failure verification");
const terminal = new Set(["completed", "failed", "cancelled", "unknown"]);
let question;
let questionRun;

const inspect = async (selector) => evaluate(`(() => {
  const node = document.querySelector(${JSON.stringify(selector)});
  if (!node) return null;
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return {
    selector: ${JSON.stringify(selector)},
    outerHTML: node.outerHTML,
    innerHTML: node.innerHTML,
    textContent: node.textContent,
    ariaLabel: node.getAttribute("aria-label"),
    tooltip: node.dataset.tooltip ?? null,
    classes: node.className,
    hidden: node.hidden,
    disabled: Boolean(node.disabled),
    readOnly: Boolean(node.readOnly),
    childTags: [...node.children].map((child) => child.tagName + (child.getAttribute("class") ? "." + child.getAttribute("class") : "")),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    display: style.display,
    borderRadius: style.borderRadius,
    activeElement: document.activeElement?.id || document.activeElement?.className || null,
  };
})()`);
const capture = async (name) => {
  const shot = (await cdp("Page.captureScreenshot", { format: "png" })).data;
  const path = `${evidenceDir}/${name}.png`;
  await writeFile(path, Buffer.from(shot, "base64"));
  return path;
};
const render = () => evaluate("window.__V5_UI__.renderAll(), true");
const uiState = () => evaluate(`(() => {
  const s = window.__V5_UI__?.state;
  return { view: s?.view, activeSessionId: s?.activeSessionId, activeRun: s?.runs?.find((r) => ["running", "waiting_user", "stopping"].includes(r.status))?.status ?? null, runs: (s?.runs || []).map((r) => ({ id:r.id, status:r.status })) };
})()`);
const clickSession = async (session) => {
  await evaluate(`(() => {
    const state = window.__V5_UI__.state;
    state.navigationLimits.set(${JSON.stringify(project.id)}, 100);
    const toggle = document.querySelector(${JSON.stringify(`.project-toggle[data-nav-key="project:${project.id}"]`)});
    if (!state.openProjectIds.has(${JSON.stringify(project.id)})) toggle?.click();
    else window.__V5_UI__.renderAll();
    return Boolean(toggle);
  })()`);
  const sessionSelector = `[data-nav-key="session:${session.id}"]`;
  await waitFor(`Boolean(document.querySelector(${JSON.stringify(sessionSelector)}))`, 10000);
  await evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(sessionSelector)});
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await waitFor(`window.__V5_UI__?.state?.activeSessionId === ${JSON.stringify(session.id)}`, 15000);
  await sleep(500);
};
const setInput = async (text) => evaluate(`(() => {
  const input = document.getElementById("composer-input");
  input.focus();
  input.value = ${JSON.stringify(text)};
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return { value: input.value, active: document.activeElement === input };
})()`);
const installDelayedFetch = async (kind, delayMs) => evaluate(`(() => {
  const original = window.__verifyOriginalFetch || window.fetch;
  window.__verifyOriginalFetch = original;
  window.fetch = async (...args) => {
    const request = args[0];
    const url = typeof request === "string" ? request : request?.url || "";
    const method = String(args[1]?.method || request?.method || "GET").toUpperCase();
    const response = await original(...args);
    if (method === "POST" && url.includes(${JSON.stringify(kind)}))
      await new Promise((resolve) => setTimeout(resolve, ${delayMs}));
    return response;
  };
  return true;
})()`);
const restoreFetch = async () => evaluate("window.fetch = window.__verifyOriginalFetch || window.fetch, true");

const result = {
  source: {
    origin,
    projectId: project.id,
    sessions: { chat: chat.id, work: work.id, failure: failure.id, answer: null },
    providerMode: "local deterministic fake-openai-loopback; synthetic only",
    realProvider: false,
    fixturePort: 8939,
    cdpPort: Number(process.env.WK6_CDP_PORT ?? 19988),
  },
  home: {},
  chat: {},
  work: {},
  failure: {},
  answer: {},
  textAction: {},
  browser: { exceptions: observations.exceptions.length },
};

try {
  await cdp("Page.navigate", { url: `${origin}#home` });
  await waitFor("window.__V5_UI__?.state?.token", 15000);
  await sleep(650);
  await waitFor("document.getElementById('send-button')", 5000);
  await render(); await render(); await render();
  result.home.state = await uiState();
  result.home.resting = await inspect("#send-button");
  result.home.screenshot = await capture("home-resting");
  await render();
  result.home.afterRepeatRender = await inspect("#send-button");
  result.home.repeatSvgPreserved = result.home.resting.childTags.includes("svg.ui-icon") && result.home.afterRepeatRender.childTags.includes("svg.ui-icon");

  await clickSession(chat);
  await render();
  result.chat.state = await uiState();
  result.chat.resting = await inspect("#send-button");
  result.chat.restingFocus = await evaluate(`(() => { const b=document.getElementById("send-button"); b.focus(); const before=document.activeElement===b; window.__V5_UI__.renderAll(); return { before, after:document.activeElement===b, activeId:document.activeElement?.id || null }; })()`);
  await setInput("/fixture slow chat icon check");
  await installDelayedFetch("/runs", 500);
  await evaluate("document.getElementById('composer-form').requestSubmit(), true");
  await sleep(80);
  result.chat.sendInFlight = await inspect("#send-button");
  result.chat.sendInFlightFocus = await evaluate(`(() => { const b=document.getElementById("send-button"); b.focus(); const before=document.activeElement===b; window.__V5_UI__.renderAll(); return { before, after:document.activeElement===b, activeId:document.activeElement?.id || null }; })()`);
  await sleep(650);
  await waitFor("window.__V5_UI__?.state?.runs?.some((r) => [\"running\",\"stopping\"].includes(r.status))", 10000);
  result.chat.activeBeforeCancel = await inspect("#cancel-run-button");
  await installDelayedFetch("/cancel", 500);
  await evaluate("document.getElementById('cancel-run-button').click(), true");
  await sleep(80);
  result.chat.cancelInFlight = await inspect("#cancel-run-button");
  await restoreFetch();
  await sleep(650);
  await waitFor("!window.__V5_UI__?.state?.runs?.some((r) => [\"running\",\"waiting_user\",\"stopping\"].includes(r.status))", 10000);
  await render();
  result.chat.afterCancel = await inspect("#send-button");
  result.chat.screenshot = await capture("chat-after-cancel");

  await clickSession(failure);
  await setInput("/fixture error");
  await evaluate("document.getElementById('composer-form').requestSubmit(), true");
  await waitFor("window.__V5_UI__?.state?.runs?.some((r) => r.status === \"failed\")", 20000);
  await render();
  result.failure.state = await uiState();
  result.failure.afterFailedRun = await inspect("#send-button");
  result.failure.screenshot = await capture("chat-after-failure");

  await clickSession(work);
  await render(); await render();
  result.work.state = await uiState();
  result.work.resting = await inspect("#send-button");
  result.work.cancelResting = await inspect("#cancel-run-button");
  result.work.surface = await evaluate(`(() => ({ binding: window.__V5_UI__.state.session?.extensionBinding || null, extensionRoot: Boolean(document.querySelector('[data-extension]')), text: document.querySelector('[data-extension]')?.textContent?.slice(0,120) || null }))()`);
  result.work.screenshot = await capture("work-resting");

  // The runtime deliberately admits only one active Run globally. Create the
  // question fixture after Chat cancel, failure, and Work resting checks so it
  // can wait without blocking those earlier UI transitions.
  question = (await api("/sessions", "POST", { projectId: project.id, title: "Answer verification" })).session;
  result.source.sessions.answer = question.id;
  questionRun = (await api(`/sessions/${question.id}/runs`, "POST", {
    commandId: `answer-verification-question-${Date.now()}`,
    input: "/fixture question",
  })).run;
  let questionSnapshot;
  for (let i = 0; i < 200; i++) {
    questionSnapshot = (await api(`/runs/${questionRun.id}`)).run;
    if (questionSnapshot.status === "waiting_user" || terminal.has(questionSnapshot.status)) break;
    await sleep(25);
  }
  if (questionSnapshot.status !== "waiting_user") throw new Error(`question fixture did not wait: ${questionSnapshot.status}`);
  const latestSessions = (await api(`/sessions?projectId=${encodeURIComponent(project.id)}`)).sessions;
  await evaluate(`(() => { const s=window.__V5_UI__.state; s.sessionsByProject.set(${JSON.stringify(project.id)}, ${JSON.stringify(latestSessions)}); s.navigationLimits.set(${JSON.stringify(project.id)}, 100); window.__V5_UI__.renderAll(); return true; })()`);

  await clickSession(question);
  result.answer.state = await uiState();
  result.answer.resting = await inspect(".question-card button[type='submit']");
  result.answer.restingFocus = await evaluate(`(() => { const b=document.querySelector(".question-card button[type='submit']"); b.focus(); const before=document.activeElement===b; window.__V5_UI__.renderAll(); return { before, after:document.activeElement===b, activeId:document.activeElement?.id || null }; })()`);
  await evaluate(`(() => { const input=document.querySelector(".question-card input[aria-label='Answer']"); input.value="synthetic answer"; input.dispatchEvent(new Event("input",{bubbles:true})); return true; })()`);
  await installDelayedFetch("/questions/", 500);
  await evaluate("document.querySelector('.question-card form').requestSubmit(), true");
  await sleep(80);
  result.answer.inFlight = await inspect(".question-card button[type='submit']");
  await restoreFetch();
  await sleep(650);
  result.answer.afterResponse = await inspect(".question-card button[type='submit']");
  result.answer.screenshot = await capture("answer-after-response");

  result.textAction = await evaluate(`(async () => {
    const { setRequestLabel } = await import("/web/ui-controls.mjs?verify=text-width");
    const button = document.createElement("button");
    button.className = "secondary-button";
    button.type = "button";
    document.body.append(button);
    setRequestLabel(button, "Approve this write", false);
    button.focus();
    const resting = { width:button.getBoundingClientRect().width, height:button.getBoundingClientRect().height, focus:document.activeElement===button, html:button.outerHTML };
    setRequestLabel(button, "Approve this write", true);
    const sending = { width:button.getBoundingClientRect().width, height:button.getBoundingClientRect().height, focus:document.activeElement===button, html:button.outerHTML };
    button.remove();
    return { resting, sending, stableWidth:resting.width===sending.width && resting.height===sending.height, focusPreserved:resting.focus && sending.focus };
  })()`);
  result.browser.exceptions = observations.exceptions.length;
} finally {
  await restoreFetch().catch(() => {});
  await close();
}
console.log(JSON.stringify(result, null, 2));
await writeFile(`${evidenceDir}/verification.json`, JSON.stringify(result, null, 2) + "\n");
