// Visual evidence · the Attention assistant's approval card (the shared approval
// basis of app/web/approval-basis.mjs inside the popover), pending and decided,
// beside the same request in the full Chat; 1440×900 and 390×844, light and dark.
//
// The request is a `check_run` on a private repository candidate with two
// model-written files, asked in a global (Attention) Session. Whether the Host
// admits that on a global Session is recorded in report.json (`reachability`).
//
//   node engineering/reviews/declaration-to-implementation-2026-10-01/evidence/capture-approval.mjs [--data-dir <dir>] [--out-dir <dir>]
//
// Harness: engineering/research/ux-interaction-topology-20260930/evidence/harness.mjs.
// A disposable Host with the local fake provider, seeded only through the app's
// own API; the source repository is the synthetic fixture, created under the
// data directory. The decided scene presses the popover's own Approve button:
// the recipe is `node --test` in that synthetic candidate. Author evidence, not
// visual or accessibility acceptance.
import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openHarness, sleep } from "../../../research/ux-interaction-topology-20260930/evidence/harness.mjs";
import { createSyntheticRepository, KNOWN_BUG } from "../../../../app/tests/fixtures/synthetic-repo/create-synthetic-repo.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, "captures");
// The harness and the source repository share one disposable directory.
let work = process.argv.indexOf("--data-dir") > 0 ? path.resolve(process.argv[process.argv.indexOf("--data-dir") + 1]) : null;
if (!work) { work = await mkdtemp(path.join(tmpdir(), "cw-approval-capture-")); process.argv.push("--data-dir", work); }

const h = await openHarness({ outDir: OUT_DIR });
const { call, until, evaluate, waitFor, variant, shot } = h;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const report = { origin: "disposable Host", reachability: {}, request: {}, scenes: [], errors: [] };
// The harness's `call` throws `<path> <status> <body>`; a refusal is a finding here, so keep it.
async function attempt(endpoint, init) {
  try { return { ok: true, status: 200, json: await call(endpoint, init) }; }
  catch (error) {
    const match = / (\d{3}) (.*)$/s.exec(String(error.message));
    let body = match?.[2] ?? String(error.message);
    try { body = JSON.parse(body); } catch { /* prose */ }
    return { ok: false, status: match ? Number(match[1]) : null, body };
  }
}
const put = (endpoint, body) => attempt(endpoint, { method: "PUT", body: JSON.stringify(body) });
const events = async (sessionId) => (await call(`/sessions/${sessionId}/events`)).events;
const opened = async (sessionId, count) => until(async () => { const list = (await events(sessionId)).filter((event) => event.type === "permission.open"); return list.length >= count ? list[count - 1] : null; });
const settled = (runId) => until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${runId}`)).run.status), 60000);

// Background: an ordinary project with one settled chat, so the shell is not empty.
const project = (await call("/projects", { method: "POST", body: JSON.stringify({ name: "租约审阅 Harborview" }) })).project.id;
const ordinary = (await call("/sessions", { method: "POST", body: JSON.stringify({ projectId: project, title: "续期条款核对 · Lease renewal" }) })).session.id;
await settled((await call(`/sessions/${ordinary}/runs`, { method: "POST", body: JSON.stringify({ input: "请核对租约的续期窗口。", commandId: crypto.randomUUID() }) })).run.id);

// The Attention (global) Session, created as the web creates it.
const conversation = crypto.randomUUID();
const created = await attempt("/attention/conversations", { method: "POST", body: JSON.stringify({ conversationId: conversation }) });
report.reachability.conversation = { endpoint: "POST /api/v5/attention/conversations", status: created.status, scope: created.json?.session?.scope ?? null, permissionMode: created.json?.session?.permissionMode ?? null, error: created.body ?? null };

// The synthetic source repository, a binding and a private candidate on the global Session.
const sourceDir = path.join(work, "source-repo");
const { head } = await createSyntheticRepository(sourceDir);
const CANDIDATE_ID = "e23e4567-e89b-42d3-a456-426614174000";
const bound = await put(`/sessions/${conversation}/repository-binding`, { operation: "bind", requestId: "capture-bind", expectedRevision: 0, rootPath: sourceDir });
report.reachability.binding = { endpoint: "PUT /api/v5/sessions/<global session>/repository-binding", status: bound.status, error: bound.body ?? null, bindingRevision: bound.json?.revision ?? bound.json?.binding?.revision ?? null };
const candidate = bound.ok ? await put(`/sessions/${conversation}/repository-candidate`, { operation: "create", requestId: "capture-candidate", expectedRevision: 0, expectedBindingRevision: 1, candidateId: CANDIDATE_ID, baseCommit: head }) : null;
report.reachability.candidate = candidate ? { endpoint: "PUT /api/v5/sessions/<global session>/repository-candidate", status: candidate.status, error: candidate.body ?? null, candidateStatus: candidate.json?.candidate?.status ?? null } : { skipped: "the binding was refused" };
if (!candidate?.ok) {
  report.errors.push({ name: "seed", error: "the Host refused a repository candidate on the global Session; no scene was captured" });
  await h.writeReport(report); console.log(JSON.stringify(report, null, 2)); await h.close(); process.exit(1);
}

// One scripted turn: two writes into the candidate (approved through the API), then `check_run`, left pending.
const original = await readFile(path.join(sourceDir, KNOWN_BUG.path), "utf8");
const extraPath = "test/partial-last-page-boundary-regression.test.mjs";
const extra = 'import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { pageCount } from "../src/parcel.mjs";\n\ntest("eleven items in pages of five need three pages", () => {\n  assert.equal(pageCount(11, 5), 3);\n});\n';
const script = [
  { name: "repo_write", arguments: { path: KNOWN_BUG.path, text: original.replace(KNOWN_BUG.broken, KNOWN_BUG.fixed), expectedSha256: sha256(Buffer.from(original)) } },
  { name: "repo_write", arguments: { path: extraPath, text: extra } },
  { name: "check_run", arguments: { recipeId: "node-test" } },
];
const run = (await call(`/sessions/${conversation}/runs`, { method: "POST", body: JSON.stringify({ input: `/fixture script ${JSON.stringify(script)}`, commandId: crypto.randomUUID() }) })).run;
for (const index of [1, 2]) {
  const question = await opened(conversation, index);
  await call(`/runs/${run.id}/questions/${question.data.id}`, { method: "POST", body: JSON.stringify({ decision: "allow" }) });
}
const check = await opened(conversation, 3);
const seeded = await events(conversation);
report.reachability.checkRun = {
  tool: check.data.tool, recipeId: check.data.recipeId ?? null, argv: check.data.argv ?? null,
  candidateId: check.data.candidateId ?? null, candidateWriteRevision: check.data.candidateWriteRevision ?? null,
  confirmedWrites: seeded.filter((event) => event.type === "repository.write.confirmed").map((event) => event.data.path),
  failedWrites: seeded.filter((event) => ["repository.write.failed", "repository.write.unknown"].includes(event.type)).map((event) => event.data),
  runStatus: (await call(`/runs/${run.id}`)).run.status,
};
report.reachability.answer = check.data.tool === "check_run" && report.reachability.checkRun.confirmedWrites.length === 2
  ? "yes: the Host bound a repository, created a private candidate and asked a check_run approval on a global (Attention) Session"
  : "partial: see checkRun";
report.request = { sessionId: conversation, runId: run.id, questionId: check.data.id, prompt: check.data.prompt ?? null, preview: check.data.preview ?? null };

// Measurements taken in the page. `selector` picks the card; `scrollerSelector` its scroll container.
const measure = (cardExpression, scrollerExpression) => evaluate(`(() => {
  const round = (n) => Math.round(n * 10) / 10;
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height), right: round(r.right), bottom: round(r.bottom) }; };
  const within = (r, o) => r.left >= o.left - 0.5 && r.right <= o.right + 0.5 && r.top >= o.top - 0.5 && r.bottom <= o.bottom + 0.5;
  const describe = (n) => n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\\s+/).join('.') : '');
  const card = ${cardExpression};
  const scroller = ${scrollerExpression};
  const dialog = document.getElementById('attention-agent-dialog');
  if (!card) return { card: null };
  const cardRect = card.getBoundingClientRect();
  const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  const clip = scroller ? scroller.getBoundingClientRect() : viewport;
  const basis = card.matches('.attention-approval-basis') ? card : card.querySelector('.attention-approval-basis');
  const all = [...card.querySelectorAll('*')];
  const clipped = (n) => { for (let p = n.parentElement; p && p !== card.parentElement; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return describe(p); } return null; };
  const wider = all.filter((n) => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.right > cardRect.right + 0.5 || r.left < cardRect.left - 0.5); })
    .map((n) => ({ node: describe(n), box: box(n), clippedBy: clipped(n) }));
  const scrollers = [card, ...all].filter((n) => n.scrollWidth > n.clientWidth + 1 || (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)))
    .filter((n) => n.clientWidth > 0 && getComputedStyle(n).display !== 'inline' && !n.matches('.sr-only'))
    .map((n) => ({ node: describe(n), scrollWidth: n.scrollWidth, clientWidth: n.clientWidth, scrollHeight: n.scrollHeight, clientHeight: n.clientHeight, overflowX: getComputedStyle(n).overflowX, overflowY: getComputedStyle(n).overflowY }));
  const buttons = [...card.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => { const r = b.getBoundingClientRect(); return { label: b.textContent.trim(), ariaLabel: b.getAttribute('aria-label'), box: box(b), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true', className: b.className, borderWidth: getComputedStyle(b).borderTopWidth, background: getComputedStyle(b).backgroundColor, insideViewport: within(r, viewport), insideScrollContainer: within(r, clip), insideCard: within(r, cardRect) }; });
  return {
    viewport: { w: innerWidth, h: innerHeight },
    popover: dialog?.open ? box(dialog) : null,
    scrollContainer: scroller ? { node: describe(scroller), box: box(scroller), scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight, scrollTop: Math.round(scroller.scrollTop), horizontalOverflow: scroller.scrollWidth > scroller.clientWidth } : null,
    card: { node: describe(card), box: box(card), scrollWidth: card.scrollWidth, clientWidth: card.clientWidth, horizontalOverflow: card.scrollWidth > card.clientWidth, fullyInsideScrollContainer: within(cardRect, clip), tallerThanScrollContainer: cardRect.height > (clip.bottom - clip.top) },
    basis: basis ? { box: box(basis), scrollWidth: basis.scrollWidth, clientWidth: basis.clientWidth, horizontalOverflow: basis.scrollWidth > basis.clientWidth } : null,
    // Vertical space between consecutive lines of the basis (the grid gap, where it applies).
    basisLineGaps: basis ? [...basis.children].filter((n) => n.getBoundingClientRect().height > 0).map((n, i, list) => i ? round(n.getBoundingClientRect().top - list[i - 1].getBoundingClientRect().bottom) : null).slice(1) : null,
    basisDisplay: basis ? getComputedStyle(basis).display : null,
    widerThanCard: wider,
    innerScrollers: scrollers,
    documentHorizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    lines: [...card.querySelectorAll(':scope > strong, :scope > p, h3, summary')].map((n) => n.textContent.trim()),
    text: card.innerText,
    buttons,
    approvalButtons: buttons.filter((b) => /^(Deny|Approve) this /.test(b.label)),
  };
})()`);
// The card of this request, by the question id the Host gave it (other approvals share the stream).
const QUESTION = JSON.stringify(String(check.data.id));
const POPOVER_CARD = `[...document.querySelectorAll('#attention-agent-dialog .attention-agent-message.is-permission')].find((n) => { try { return String(JSON.parse(n.dataset.readingKey)[3]) === ${QUESTION}; } catch { return false; } })`;
const POPOVER_SCROLLER = `document.querySelector('#attention-agent-dialog .attention-agent-stream')`;
const CHAT_PENDING = `[...document.querySelectorAll('.permission-card')].filter((n) => !n.closest('dialog')).at(-1)`;
const CHAT_DECIDED = `[...document.querySelectorAll('.resolved-permission')].find((n) => !n.closest('dialog') && (n.querySelector('summary')?.dataset.focusKey || '').includes(${QUESTION}))`;
// A decided approval of a successful tool action sits inside the Run's collapsed
// "Execution" disclosure on both surfaces. Open it, and say that it was closed.
const reveal = (cardExpression) => evaluate(`(() => { for (let p = ${cardExpression}; p; p = p.parentElement) { if (p.hidden && p.id) { const b = [...document.querySelectorAll('.execution-disclosure-summary')].find((n) => (n.getAttribute('aria-controls') || '').split(' ').includes(p.id)); if (b) { const label = b.textContent.trim().replace(/\\s+/g, ' '); b.click(); return label; } } } return null; })()`);
// The nearest ancestor that scrolls, as the page lays it out.
const chatScroller = (cardExpression) => `(() => { for (let p = (${cardExpression})?.parentElement; p; p = p.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) return p; } return null; })()`;

async function openPopover() {
  await evaluate(`(document.getElementById('attention-agent-dialog').open || document.getElementById('attention-button').click(), true)`);
  await waitFor(`document.getElementById('attention-agent-dialog').open`, "the assistant");
  await waitFor(`[...document.querySelectorAll('#attention-agent-dialog .attention-agent-toolbar select option')].some((o) => o.value === ${JSON.stringify(conversation)})`, "the conversation in the list");
  await evaluate(`(() => { const s = document.querySelector('#attention-agent-dialog .attention-agent-toolbar select'); if (s.value !== ${JSON.stringify(conversation)}) { s.value = ${JSON.stringify(conversation)}; s.dispatchEvent(new Event('change', { bubbles: true })); } return true; })()`);
  await waitFor(`Boolean(${POPOVER_CARD})`, "the approval card");
}
async function openChat() {
  await openPopover();
  await evaluate(`([...document.querySelectorAll('#attention-agent-dialog .attention-agent-toolbar button')].find((b) => b.textContent.trim() === 'Open conversation').click(), true)`);
  await waitFor(`!document.getElementById('attention-agent-dialog').open`, "the assistant to close");
}
async function scene(name, cardExpression, scrollerExpression, extra = {}) {
  await shot(name);
  report.scenes.push({ name, ...extra, ...(await measure(cardExpression, scrollerExpression)) });
}
// The card as the stream leaves it, then — when it does not fit — from its top.
async function popoverScenes(prefix, suffix) {
  await scene(`${prefix}-${suffix}`, POPOVER_CARD, POPOVER_SCROLLER, { scroll: "as opened" });
  const fits = await evaluate(`(() => { const c = (${POPOVER_CARD}).getBoundingClientRect(), s = (${POPOVER_SCROLLER}).getBoundingClientRect(); return c.top >= s.top - 0.5 && c.bottom <= s.bottom + 0.5; })()`);
  if (!fits) {
    await evaluate(`((${POPOVER_CARD}).scrollIntoView({ block: 'start' }), true)`);
    await scene(`${prefix}-top-${suffix}`, POPOVER_CARD, POPOVER_SCROLLER, { scroll: "card top" });
    await evaluate(`((${POPOVER_CARD}).scrollIntoView({ block: 'end' }), true)`);
    await scene(`${prefix}-end-${suffix}`, POPOVER_CARD, POPOVER_SCROLLER, { scroll: "card end" });
  }
}
const guarded = async (name, act) => { try { await act(); } catch (error) { report.errors.push({ name, error: String(error?.message || error) }); } };

// Each variant loads the page at its own size, so the popover opens as it would
// for a person at that size and not with a scroll position kept from another one.
async function load(width, height, scheme) {
  await variant(width, height, scheme);
  await h.cdp("Page.navigate", { url: `${h.origin}/?capture=${width}-${scheme}-${Date.now()}` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.getElementById('attention-button')) && document.querySelectorAll('.session-button').length > 0`, "the shell");
  await sleep(300);
}
const VARIANTS = [[1440, 900, "light"], [1440, 900, "dark"], [390, 844, "light"], [390, 844, "dark"]];

// Pending.
for (const [width, height, scheme] of VARIANTS) {
  const suffix = `${width}-${scheme}`;
  await load(width, height, scheme);
  await guarded(`popover-pending-${suffix}`, async () => {
    await openPopover();
    await waitFor(`Boolean((${POPOVER_CARD}).querySelector('.question-actions > button'))`, "the approval buttons");
    await popoverScenes("popover-pending", suffix);
  });
  await guarded(`popover-pending-details-${suffix}`, async () => {
    await evaluate(`(() => { const d = (${POPOVER_CARD}).querySelector('.attention-approval-basis details'); if (d && !d.open) d.querySelector('summary').click(); return true; })()`);
    await sleep(200);
    await popoverScenes("popover-pending-details", suffix);
    await evaluate(`(() => { const d = (${POPOVER_CARD}).querySelector('.attention-approval-basis details'); if (d && d.open) d.querySelector('summary').click(); return true; })()`);
  });
  await guarded(`chat-pending-${suffix}`, async () => {
    await openChat();
    await waitFor(`Boolean(${CHAT_PENDING})`, "the Chat permission card");
    await scene(`chat-pending-${suffix}`, CHAT_PENDING, chatScroller(CHAT_PENDING), { scroll: "as opened" });
  });
}

// Decided: the popover's own Approve button; the recipe runs the synthetic repository's tests.
await load(1440, 900, "light");
await guarded("decide", async () => {
  await openPopover();
  await waitFor(`(() => { const b = [...(${POPOVER_CARD}).querySelectorAll('.question-actions > button')].find((n) => n.textContent.startsWith('Approve this')); return Boolean(b) && !b.disabled; })()`, "an enabled Approve");
  report.request.decidedBy = await evaluate(`(() => { const b = [...(${POPOVER_CARD}).querySelectorAll('.question-actions > button')].find((n) => n.textContent.startsWith('Approve this')); b.click(); return 'popover button: ' + b.textContent; })()`);
  await settled(run.id);
  const after = await events(conversation);
  report.request.runStatus = (await call(`/runs/${run.id}`)).run.status;
  report.request.checkSettled = after.filter((event) => event.type === "check.settled").map((event) => ({ status: event.data.status, exitCode: event.data.exitCode ?? null }));
  await waitFor(`!(${POPOVER_CARD})?.querySelector('.question-actions > button')`, "the decided card", 20000);
  await sleep(1800); // one poll, so the stream is the settled Run's
});
// Where the decided card was when the surface was first opened after the decision.
const hiddenBehind = { popover: undefined, chat: undefined };
// As the popover leaves it straight after the answer, before anything is opened.
await guarded("popover-after-approve-1440-light", async () => {
  await shot("popover-after-approve-1440-light");
  report.scenes.push({ name: "popover-after-approve-1440-light", decidedCardVisible: await evaluate(`(() => { const c = ${POPOVER_CARD}; return Boolean(c) && c.getBoundingClientRect().height > 0; })()`), streamText: await evaluate(`(${POPOVER_SCROLLER}).innerText`) });
});
for (const [width, height, scheme] of VARIANTS) {
  const suffix = `${width}-${scheme}`;
  await load(width, height, scheme);
  hiddenBehind.popover = undefined; hiddenBehind.chat = undefined;
  await guarded(`popover-decided-${suffix}`, async () => {
    await openPopover();
    await waitFor(`!(${POPOVER_CARD}).querySelector('.question-actions > button')`, "the decided card");
    await guarded(`popover-decided-as-opened-${suffix}`, async () => {
      await shot(`popover-decided-as-opened-${suffix}`);
      report.scenes.push({ name: `popover-decided-as-opened-${suffix}`, decidedCardVisible: await evaluate(`(${POPOVER_CARD}).getBoundingClientRect().height > 0`), streamText: await evaluate(`(${POPOVER_SCROLLER}).innerText`) });
    });
    hiddenBehind.popover = await reveal(POPOVER_CARD);
    await evaluate(`(() => { const d = (${POPOVER_CARD}).querySelector(':scope > details'); if (d && d.open) d.querySelector('summary').click(); return true; })()`);
    await sleep(200);
    await evaluate(`((${POPOVER_CARD}).scrollIntoView({ block: 'nearest' }), true)`);
    await popoverScenes("popover-decided", suffix);
    report.scenes.at(-1).hiddenBehind = hiddenBehind.popover;
  });
  await guarded(`popover-decided-open-${suffix}`, async () => {
    await evaluate(`(() => { const d = (${POPOVER_CARD}).querySelector(':scope > details'); if (d && !d.open) d.querySelector('summary').click(); return true; })()`);
    await sleep(200);
    await evaluate(`((${POPOVER_CARD}).scrollIntoView({ block: 'nearest' }), true)`);
    await popoverScenes("popover-decided-open", suffix);
  });
  await guarded(`chat-decided-${suffix}`, async () => {
    await openChat();
    await waitFor(`Boolean(${CHAT_DECIDED})`, "the Chat decided record");
    hiddenBehind.chat = await reveal(CHAT_DECIDED);
    await evaluate(`(() => { const d = ${CHAT_DECIDED}; if (!d.open) d.querySelector('summary').click(); d.scrollIntoView({ block: 'center' }); return true; })()`);
    await sleep(200);
    await scene(`chat-decided-open-${suffix}`, CHAT_DECIDED, chatScroller(CHAT_DECIDED), { scroll: "record in view", hiddenBehind: hiddenBehind.chat });
  });
}

await h.writeReport(report);
console.log(JSON.stringify({ reachability: report.reachability, scenes: report.scenes.map((s) => s.name), errors: report.errors }, null, 2));
await h.close();
