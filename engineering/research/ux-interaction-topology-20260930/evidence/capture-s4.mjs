// S4 visual evidence · a chat waiting on the person marked on its rail row and
// on the Chat page, the Attention entry's count for the working project, the
// assistant's way to the items and the item queue opened on the working
// project; 1440×900 and 390×844, light and dark, CJK and mixed names.
//
// Harness: harness.mjs. The Host runs one active run at a time, so one chat
// waits at a time: first on an approval, then on an answer.
//
//   node engineering/research/ux-interaction-topology-20260930/evidence/capture-s4.mjs [--data-dir <dir>]
//
// Author evidence, not visual or accessibility acceptance.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openHarness, sleep } from "./harness.mjs";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "captures-s4");
const h = await openHarness({ outDir: OUT_DIR, prefix: "cw-ux-topology-s4-" });
const { call, until, evaluate, waitFor, click, closeAll, variant, shot } = h;

// Seed through the app's own API.
const lease = (await call("/projects", { method: "POST", body: JSON.stringify({ name: "租约审阅 Harborview" }) })).project.id;
const evidence = (await call("/projects", { method: "POST", body: JSON.stringify({ name: "证据整理" }) })).project.id;
const session = async (projectId, title, extra = {}) => (await call("/sessions", { method: "POST", body: JSON.stringify({ projectId, title, ...extra }) })).session.id;
const working = await session(lease, "续期条款核对 · Lease renewal");
const approval = await session(lease, "合同红线（待确认）", { permissionMode: "ask" });
const answer = await session(lease, "证据问题 · Evidence question");
await session(evidence, "证据清单");
const settled = (runId) => until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${runId}`)).run.status));
const startRun = async (sessionId, input) => (await call(`/sessions/${sessionId}/runs`, { method: "POST", body: JSON.stringify({ input, commandId: crypto.randomUUID() }) })).run;
await settled((await startRun(working, "请核对租约的续期窗口。")).id);

// Attention items: two need the person in the lease project, one is being
// investigated there, and one needs the person in the other project.
let item = 0;
async function attention(projectId, title, needsYou) {
  const id = `ux-s4-item-${++item}`;
  const act = (action, revision, payload) => call(action === "create" ? "/attention" : `/attention/${id}/actions`, { method: "POST", body: JSON.stringify({ projectId, request: { schema_version: 1, request_id: crypto.randomUUID(), attention_id: id, expected_revision: revision, action, payload } }) });
  await act("create", 0, { descriptor: { title, summary: "Synthetic S4 capture item" }, reason: "Synthetic capture fixture.", next_action: { kind: "inspect", label: "Inspect", trigger: "manual", due_at: null }, source_refs: [], relation_refs: [] });
  if (!needsYou) return;
  await act("set_waiting", 1, { reason: "Synthetic capture fixture.", next_action: { kind: "inspect", label: "Inspect", trigger: "manual", due_at: null } });
  await act("resume", 2, { reason: "Synthetic capture fixture.", status: "needs_you" });
}
await attention(lease, "续期通知期限需要确认", true);
await attention(lease, "Harborview 押金条款 · deposit clause", true);
await attention(lease, "付款日程核对", false);
await attention(evidence, "证据清单缺页", true);

// One chat waits on an approval.
const approvalRun = await startRun(approval, `/fixture script ${JSON.stringify([{ name: "ws_write", arguments: { path: "out/redline.md", text: "Synthetic redline." } }])}`);
const permission = await until(async () => (await call(`/sessions/${approval}/events`)).events.find((event) => event.type === "permission.open"));

const report = { origin: "disposable Host", scenes: [], errors: [] };
const railRow = (title) => `[...document.querySelectorAll('.session-button')].find((b) => b.textContent.includes(${JSON.stringify(title)}))`;
const readRail = () => evaluate(`({
  attention: document.getElementById('attention-button').getAttribute('aria-label'),
  count: document.querySelector('#attention-button .nav-count')?.textContent ?? null,
  marks: [...document.querySelectorAll('.session-button')].filter((b) => b.querySelector('.session-wait')).map((b) => b.textContent.trim()),
})`);

await h.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await h.cdp("Page.navigate", { url: `${h.origin}/` });
await waitFor(`document.readyState === 'complete' && document.querySelectorAll('.session-button').length > 0`, "the rail");
await waitFor(`(() => { const b = ${railRow("续期条款核对")}; b?.click(); return Boolean(b); })()`, "the working chat");
await waitFor(`!document.getElementById('composer-area').hidden`, "the chat");
await waitFor(`Boolean(document.querySelector('.session-wait')) && Boolean(document.querySelector('#attention-button .nav-count'))`, "the signals");

const narrowNav = async (width) => {
  if (width >= 768) return;
  await click("#toggle-nav-button");
  await sleep(400);
};
const scenes = [
  ["s4-rail", async (width) => { await narrowNav(width); }],
  ["s4-assistant", async () => {
    await click("#attention-button");
    await waitFor(`document.getElementById('attention-agent-dialog').open`, "the assistant");
  }],
  ["s4-queue", async () => {
    await click("#attention-button");
    await waitFor(`document.getElementById('attention-agent-dialog').open`, "the assistant");
    await evaluate(`([...document.querySelectorAll('#attention-agent-dialog button')].find((b) => b.textContent.startsWith('Attention items'))?.click(), true)`);
    await waitFor(`!document.getElementById('attention-workspace').hidden && document.querySelectorAll('#attention-workspace [data-attention-row]').length > 0`, "the queue");
  }],
  ["s4-chat-page", async () => {
    await click("#chat-button");
    await waitFor(`Boolean(document.querySelector('#chat-page .session-wait'))`, "the Chat page mark");
  }],
];
async function backToChat() {
  await evaluate(`(document.getElementById('attention-agent-dialog').open && document.getElementById('attention-agent-dialog').close(), true)`);
  if (await evaluate(`!document.getElementById('attention-workspace').hidden`)) await evaluate(`([...document.querySelectorAll('#attention-workspace button')].find((b) => /Back to/.test(b.textContent))?.click(), true)`);
  await evaluate(`(${railRow("续期条款核对")}?.click(), true)`);
  await waitFor(`!document.getElementById('composer-area').hidden`, "the chat again");
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  for (const scheme of ["light", "dark"]) {
    await variant(width, height, scheme);
    for (const [scene, act] of scenes) {
      const name = `${scene}-${width}-${scheme}`;
      try {
        await closeAll();
        await backToChat();
        await act(width);
        await shot(name);
        report.scenes.push({ name, rail: await readRail(), queueProject: await evaluate(`document.querySelector('#attention-workspace select')?.selectedOptions?.[0]?.textContent ?? null`), itemsButton: await evaluate(`[...document.querySelectorAll('#attention-agent-dialog button')].find((b) => b.textContent.startsWith('Attention items'))?.textContent ?? null`) });
      } catch (error) {
        report.errors.push({ name, error: String(error?.message || error) });
      }
    }
  }
}

// The working project follows the open chat: a chat in the other project shows its count.
await variant(1440, 900, "light");
await closeAll();
await backToChat();
try {
  await evaluate(`(${railRow("证据清单")}?.click(), true)`);
  await waitFor(`document.querySelector('#attention-button .nav-count')?.textContent === '1'`, "the other project's count");
  await shot("s4-rail-other-project-1440-light");
  report.scenes.push({ name: "s4-rail-other-project-1440-light", rail: await readRail() });
} catch (error) {
  report.errors.push({ name: "s4-rail-other-project-1440-light", error: String(error?.message || error) });
}

// The approval is declined; another chat then waits on an answer.
await call(`/runs/${approvalRun.id}/questions/${permission.data.id}`, { method: "POST", body: JSON.stringify({ decision: "deny" }) });
await settled(approvalRun.id);
const answerRun = await startRun(answer, "/fixture question");
await until(async () => (await call(`/sessions/${answer}/events`)).events.find((event) => event.type === "question.open"));
await variant(1440, 900, "light");
await closeAll();
await backToChat();
await evaluate(`(document.dispatchEvent(new Event('visibilitychange')), true)`);
try {
  await waitFor(`${railRow("证据问题")}?.querySelector('.session-wait')?.textContent.includes('Answer')`, "the answer mark", 20000);
  await shot("s4-rail-answer-1440-light");
  report.scenes.push({ name: "s4-rail-answer-1440-light", rail: await readRail() });
} catch (error) {
  report.errors.push({ name: "s4-rail-answer-1440-light", error: String(error?.message || error) });
}
void answerRun;

await writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenes: report.scenes.length, errors: report.errors }, null, 2));
await h.close();
