#!/usr/bin/env node
/* WO-ATT-UI02 · motion recordings against the fixed synthetic fixture.
 *
 *   node record.mjs --origin http://127.0.0.1:8872
 *
 * Four takes: the normal path, the failure/recovery path, the narrow round trip
 * and the normal path again under reduced motion. Pauses are for a human
 * watcher only; nothing in the product waits for them. */
import { mkdir, rename, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, openPage } from './pw.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const origin = arg('origin', 'http://127.0.0.1:8872');
const only = arg('only', null);
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'evidence', 'motion');
await mkdir(out, { recursive: true });

const key = k => `[data-attention-focus="${k}"]`;
const beat = (page, ms = 650) => page.waitForTimeout(ms);
const fault = (page, name, value) => page.evaluate(([n, v]) => { window.__attentionPreview.core.faults[n] = v; }, [name, value]);
async function typeSlowly(page, k, text) { await page.click(key(k)); await page.keyboard.type(text, { delay: 18 }); }

const TAKES = {
  'normal-1440-light': { width: 1440, height: 900, scheme: 'light', async run(page) {
    await page.goto(`${origin}/preview/index.html?panel=0&latency=160&view=home`); await beat(page, 900);
    await page.click('[data-focus-key="attention-item-att-0101"]'); await beat(page, 900);
    await page.click('[data-focus-key="attention-workspace-link"]'); await beat(page, 1100);
    await page.click(key('item-att-0102')); await beat(page, 900);
    await page.click(key('item-att-0101')); await beat(page, 900);
    await page.keyboard.press('j'); await beat(page, 250); await page.keyboard.press('j'); await beat(page, 500);
    await page.click(key('view-needs_you')); await beat(page, 900);
    await page.click(key('item-att-0101')); await beat(page, 900);
    await page.click(key('action-acknowledge')); await beat(page, 1200);
    await page.click(key('action-resolve')); await beat(page, 600);
    await typeSlowly(page, 'field-reason', 'Counsel confirmed Draft B is current.'); await beat(page, 400);
    await fault(page, 'action', 'slow');
    await page.click(key('submit-resolve')); await beat(page, 3200);
    await page.keyboard.press('Escape'); await beat(page, 1000);
    await page.click(key('back')); await beat(page, 1200);
  } },
  'failure-1440-dark': { width: 1440, height: 900, scheme: 'dark', async run(page) {
    await page.goto(`${origin}/preview/index.html?panel=0&latency=160&select=att-0101`); await beat(page, 1000);
    await page.click(key('action-resolve')); await beat(page, 500);
    await typeSlowly(page, 'field-reason', 'Counsel confirmed Draft B is current.'); await beat(page, 300);
    await fault(page, 'action', 'conflict');
    await page.click(key('submit-resolve')); await beat(page, 2200);
    await fault(page, 'action', 'lost-before-commit');
    await page.click(key('submit-resolve')); await beat(page, 2200);
    await fault(page, 'action', 'lost-after-commit');
    await page.click(key('retry-mutation')); await beat(page, 2200);
    /* Reverse: an editor opened and closed again by its own choice, then by Escape. */
    await page.click(key('action-reopen')); await beat(page, 500);
    await page.click(key('action-reopen')); await beat(page, 600);
    await page.click(key('action-reopen')); await beat(page, 500);
    await page.keyboard.press('Escape'); await beat(page, 800);
  } },
  'narrow-roundtrip-390-light': { width: 390, height: 844, scheme: 'light', async run(page) {
    await page.goto(`${origin}/preview/index.html?panel=0&latency=160&project=p-paged`); await beat(page, 1000);
    await page.mouse.wheel(0, 700); await beat(page, 800);
    await page.click(key('item-att-0311')); await beat(page, 1100);
    await page.mouse.wheel(0, 400); await beat(page, 700);
    await page.click(key('list-back')); await beat(page, 1100);
    await page.click(key('item-att-0312')); await beat(page, 1000);
    await page.click(key('action-snooze')); await beat(page, 900);
    await page.keyboard.press('Escape'); await beat(page, 500);
    await page.keyboard.press('Escape'); await beat(page, 1100);
  } },
  'reduced-1440-light': { width: 1440, height: 900, scheme: 'light', reduced: true, async run(page) {
    await page.goto(`${origin}/preview/index.html?panel=0&latency=160&motion=reduce&select=att-0101`); await beat(page, 900);
    await page.click(key('item-att-0102')); await beat(page, 700);
    await page.click(key('item-att-0101')); await beat(page, 700);
    await page.click(key('action-resolve')); await beat(page, 500);
    await typeSlowly(page, 'field-reason', 'Counsel confirmed Draft B is current.');
    await page.click(key('submit-resolve')); await beat(page, 1600);
  } },
};

const browser = await chromium.launch();
for (const [name, take] of Object.entries(TAKES)) {
  if (only && !name.startsWith(only)) continue;
  const tmp = join(out, `.tmp-${name}`);
  await rm(tmp, { recursive: true, force: true });
  const { context, page } = await openPage(browser, { width: take.width, height: take.height, scheme: take.scheme, reduced: take.reduced, video: tmp });
  await take.run(page);
  await context.close();
  const [file] = await readdir(tmp);
  await rename(join(tmp, file), join(out, `${name}.webm`));
  await rm(tmp, { recursive: true, force: true });
  console.log(`recorded ${name}.webm`);
}
await browser.close();
