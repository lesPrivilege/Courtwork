#!/usr/bin/env node
/* WO-ATT-UI02 · author checks in a real browser (system Chrome, headless).
 * These are the author's own checks, not independent acceptance.
 *
 *   node verify.mjs --origin http://127.0.0.1:8872
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, openPage } from './pw.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const origin = arg('origin', 'http://127.0.0.1:8872');
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'evidence');
await mkdir(outDir, { recursive: true });

const key = k => `[data-attention-focus="${k}"]`;
const url = q => `${origin}/preview/index.html?panel=0&latency=60${q}`;
const idle = page => page.waitForTimeout(450);
const fault = (page, name, value) => page.evaluate(([n, v]) => { window.__attentionPreview.core.faults[n] = v; }, [name, value]);
const running = page => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => {
  const t = a.effect?.getTiming?.() ?? {};
  const frames = a.effect?.getKeyframes?.() ?? [];
  return { target: a.effect?.target?.className ?? '', duration: t.duration, easing: t.easing, from: frames[0]?.transform ?? null, props: Object.keys(frames[0] ?? {}).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)) };
}));
const activeKey = page => page.evaluate(() => document.activeElement?.dataset?.attentionFocus ?? document.activeElement?.dataset?.focusKey ?? document.activeElement?.id ?? document.activeElement?.tagName);
const noHorizontalOverflow = page => page.evaluate(() => {
  const scroller = document.querySelector('.attention-workspace');
  return { page: document.documentElement.scrollWidth <= document.documentElement.clientWidth, workspace: scroller ? scroller.scrollWidth <= scroller.clientWidth : true };
});

const results = [];
async function check(name, options, fn) {
  const browser = check.browser;
  const { context, page } = await openPage(browser, options);
  try {
    const detail = await fn(page);
    const pass = detail?.pass !== false;
    results.push({ name, pass, ...detail });
  } catch (error) {
    results.push({ name, pass: false, error: String(error.message).split('\n')[0] });
  }
  await context.close();
}
check.browser = await chromium.launch();

await check('detail swap animates opacity/transform with the duration token; direction follows row order', { width: 1440, height: 900 }, async page => {
  await page.goto(url('&select=att-0102')); await idle(page);
  await page.click(key('item-att-0104')); await page.waitForSelector('.attention-detail'); await page.waitForTimeout(30);
  const down = (await running(page)).find(a => a.target === 'attention-detail');
  await idle(page);
  await page.click(key('item-att-0101')); await page.waitForSelector('.attention-detail'); await page.waitForTimeout(30);
  const up = (await running(page)).find(a => a.target === 'attention-detail');
  return { pass: Boolean(down && up && down.duration === 180 && down.from?.includes('6px') && up.from?.includes('-6px') && down.props.every(p => ['opacity', 'transform'].includes(p))), down, up };
});

await check('data-motion="reduce" runs no animation through select, editor, receipt', { width: 1440, height: 900 }, async page => {
  await page.goto(url('&motion=reduce&select=att-0102')); await idle(page);
  const seen = [];
  await page.click(key('item-att-0101')); await page.waitForSelector('.attention-detail'); seen.push(...await running(page));
  await page.click(key('action-resolve')); seen.push(...await running(page));
  await page.fill(key('field-reason'), 'Reduced motion check.');
  await page.click(key('submit-resolve')); await idle(page); seen.push(...await running(page));
  return { pass: seen.length === 0, animations: seen.length };
});

await check('system prefers-reduced-motion runs no animation', { width: 1440, height: 900, reduced: true }, async page => {
  await page.goto(url('&select=att-0102')); await idle(page);
  await page.click(key('item-att-0101')); await page.waitForSelector('.attention-detail');
  const a = await running(page);
  return { pass: a.length === 0, animations: a.length };
});

await check('J/K move focus only: no selection change and no animation', { width: 1440, height: 900 }, async page => {
  await page.goto(url('&select=att-0101')); await idle(page);
  await page.focus(key('item-att-0101'));
  await page.keyboard.press('j'); const a = await running(page);
  const focus = await activeKey(page);
  const pressed = await page.getAttribute(key('item-att-0102'), 'aria-pressed');
  return { pass: a.length === 0 && focus === 'item-att-0102' && pressed === 'false', focus, animations: a.length };
});

await check('narrow round trip: detail enters from the right, list returns from the left with scroll and focus restored', { width: 390, height: 844 }, async page => {
  await page.goto(url('&project=p-paged')); await idle(page);
  await page.evaluate(() => { document.querySelector('.attention-workspace').scrollTop = 600; });
  const before = await page.evaluate(() => document.querySelector('.attention-workspace').scrollTop);
  const row = await page.evaluate(() => [...document.querySelectorAll('[data-attention-row]')].find(r => r.getBoundingClientRect().top > 120).dataset.attentionRow);
  await page.click(key(`item-${row}`)); await page.waitForTimeout(20);
  const push = (await running(page)).find(a => a.target.split(' ').includes('attention-reading'));
  await idle(page);
  const detailTop = await page.evaluate(() => document.querySelector('.attention-workspace').scrollTop);
  await page.click(key('list-back')); await page.waitForTimeout(20);
  const back = (await running(page)).find(a => a.target.split(' ').includes('attention-registry'));
  await idle(page);
  const after = await page.evaluate(() => document.querySelector('.attention-workspace').scrollTop);
  const focus = await activeKey(page);
  return { pass: Boolean(push?.from?.includes('24px') && back?.from?.includes('-24px')) && detailTop === 0 && Math.abs(after - before) <= 2 && focus === `item-${row}`, before, after, detailTop, focus, push, back };
});

await check('Sending… is in place, nothing optimistic, no settle before the receipt; settle after', { width: 1440, height: 900 }, async page => {
  /* Every Element.animate call is logged, so the check does not race a 180 ms animation. */
  await page.addInitScript(() => {
    window.__animations = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      window.__animations.push({ target: String(this.className), duration: options?.duration, at: performance.now() });
      return original.call(this, keyframes, options);
    };
  });
  const settles = () => page.evaluate(() => window.__animations.filter(a => /attention-(detail|row)-state/.test(a.target)).length);
  await page.goto(url('&select=att-0101')); await idle(page);
  await page.click(key('action-resolve'));
  await page.fill(key('field-reason'), 'Checked.');
  await fault(page, 'action', 'slow');
  const width0 = await page.evaluate(k => document.querySelector(k).getBoundingClientRect().width, key('submit-resolve'));
  await page.click(key('submit-resolve')); await page.waitForTimeout(400);
  const during = { label: await page.textContent(key('submit-resolve')), width: await page.evaluate(k => document.querySelector(k).getBoundingClientRect().width, key('submit-resolve')),
    status: await page.textContent('.attention-detail-state'), row: await page.textContent(`${key('item-att-0101')} .attention-row-state`), settle: await settles(),
    receipt: Boolean(await page.$('.attention-receipt')) };
  await page.waitForSelector('.attention-receipt', { timeout: 5000 }); await idle(page);
  const settle = await settles();
  const status = await page.textContent('.attention-detail-state');
  return { pass: during.label === 'Sending…' && Math.abs(during.width - width0) < 1 && during.status === 'Needs you' && during.row === 'Needs you' && during.settle === 0 && !during.receipt && status === 'Resolved' && settle === 2,
    during, width0, settle, status };
});

await check('acknowledge changes seen and not status', { width: 1440, height: 900 }, async page => {
  await page.goto(url('&select=att-0101')); await idle(page);
  const before = [await page.textContent('.attention-detail-state'), await page.textContent('.attention-seen')];
  await page.click(key('action-acknowledge')); await page.waitForSelector('.attention-receipt');
  const after = [await page.textContent('.attention-detail-state'), await page.textContent('.attention-seen')];
  return { pass: before[0] === after[0] && before[1] === 'Not seen' && after[1] === 'Seen', before, after };
});

await check('conflict keeps the draft and states the re-read version', { width: 1440, height: 900 }, async page => {
  await page.goto(url('&select=att-0101')); await idle(page);
  await page.click(key('action-resolve'));
  await page.fill(key('field-reason'), 'Draft that must survive.');
  await fault(page, 'action', 'conflict');
  await page.click(key('submit-resolve')); await page.waitForSelector('.attention-conflict-now'); await idle(page);
  const draft = await page.inputValue(key('field-reason'));
  const line = await page.textContent('.attention-conflict-now');
  const alert = await page.textContent('.attention-action-alert');
  return { pass: draft === 'Draft that must survive.' && /Now Waiting \(was Needs you\) · revision 5/.test(line), draft, line, alert };
});

await check('unknown result: Retry sending takes focus, same request id is re-sent, receipt then recorded', { width: 1440, height: 900 }, async page => {
  const bodies = [];
  page.on('console', () => {});
  await page.goto(url('&select=att-0101')); await idle(page);
  await page.evaluate(() => {
    const core = window.__attentionPreview.core; const original = core.request;
    window.__sent = [];
    core.request = (path, init) => { if (path.endsWith('/actions')) window.__sent.push(init.body.request.request_id); return original(path, init); };
  });
  await page.click(key('action-resolve'));
  await page.fill(key('field-reason'), 'Retry check.');
  await fault(page, 'action', 'lost-before-commit');
  await page.click(key('submit-resolve')); await page.waitForSelector(key('retry-mutation')); await idle(page);
  const focus = await activeKey(page);
  await page.click(key('retry-mutation')); await page.waitForSelector('.attention-receipt');
  const sent = await page.evaluate(() => window.__sent);
  return { pass: focus === 'retry-mutation' && sent.length === 2 && sent[0] === sent[1], focus, sent };
});

await check('Escape closes the editor to its choice, then the detail to its row', { width: 1440, height: 900 }, async page => {
  await page.goto(url('')); await idle(page);
  await page.click(key('item-att-0103')); await idle(page);
  await page.click(key('action-snooze')); await idle(page);
  const inField = await activeKey(page);
  await page.keyboard.press('Escape'); const toChoice = await activeKey(page);
  await page.keyboard.press('Escape'); const toRow = await activeKey(page);
  return { pass: inField === 'field-reason' && toChoice === 'action-snooze' && toRow === 'item-att-0103', inField, toChoice, toRow };
});

await check('Home entry opens the same object; Back to workspace returns focus to the Home entry', { width: 1440, height: 900 }, async page => {
  await page.goto(url('&view=home')); await idle(page);
  await page.click('[data-focus-key="attention-item-att-0101"]'); await idle(page);
  await page.click('[data-focus-key="attention-workspace-link"]'); await idle(page);
  const selected = await page.getAttribute(key('item-att-0101'), 'aria-pressed');
  await page.click(key('back')); await idle(page);
  const focus = await activeKey(page);
  return { pass: selected === 'true' && focus === 'attention-workspace-link', selected, focus };
});

await check('assistant dialog opens from the workspace heading and returns focus on close', { width: 1440, height: 900 }, async page => {
  await page.goto(url('&select=att-0101')); await idle(page);
  await page.click(key('open-assistant')); await idle(page);
  const open = await page.evaluate(() => document.getElementById('attention-agent-dialog').open);
  await page.keyboard.press('Escape'); await idle(page);
  const focus = await activeKey(page);
  const stillSelected = await page.getAttribute(key('item-att-0101'), 'aria-pressed');
  return { pass: open && focus === 'open-assistant' && stillSelected === 'true', open, focus };
});

for (const [label, size] of [['200% zoom of 1440×900 (720×450)', { width: 720, height: 450 }], ['390 long text', { width: 390, height: 844 }], ['1280 long text', { width: 1280, height: 900 }]]) {
  await check(`no horizontal overflow · ${label} · list, long detail, editor, context`, size, async page => {
    const states = [];
    await page.goto(url('&project=p-long')); await idle(page); states.push(await noHorizontalOverflow(page));
    await page.click(key('item-att-0201')); await idle(page); states.push(await noHorizontalOverflow(page));
    await page.click(key('action-snooze')); await idle(page);
    await page.selectOption(key('field-trigger'), 'at'); await idle(page); states.push(await noHorizontalOverflow(page));
    await page.click('.attention-basis > summary'); await idle(page); states.push(await noHorizontalOverflow(page));
    return { pass: states.every(s => s.page && s.workspace), states };
  });
}

await check('touch targets at 390 are at least 44px for workspace buttons, fields and summary', { width: 390, height: 844 }, async page => {
  await page.goto(url('&select=att-0101')); await idle(page);
  await page.click(key('action-snooze')); await idle(page);
  const small = await page.evaluate(() => [...document.querySelectorAll('.attention-workspace button, .attention-workspace select, .attention-workspace input:not([type=radio]), .attention-workspace textarea, .attention-basis > summary')]
    .filter(n => n.offsetParent !== null).map(n => ({ key: n.dataset.attentionFocus ?? n.className, h: Math.round(n.getBoundingClientRect().height) })).filter(n => n.h < 44));
  return { pass: small.length === 0, small };
});

await check('large text size keeps the layout without horizontal overflow', { width: 1280, height: 900 }, async page => {
  await page.goto(url('&select=att-0101')); await page.evaluate(() => document.documentElement.setAttribute('data-text-size', 'large')); await idle(page);
  await page.click(key('action-snooze')); await idle(page);
  return { pass: Object.values(await noHorizontalOverflow(page)).every(Boolean) };
});

await check.browser.close();
await writeFile(join(outDir, 'author-browser-checks.json'), JSON.stringify({ origin, run_at: new Date().toISOString(), browser: 'system Google Chrome (headless) via Playwright', results }, null, 2));
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : `  ${JSON.stringify(r).slice(0, 400)}`}`);
process.exitCode = results.every(r => r.pass) ? 0 : 1;
