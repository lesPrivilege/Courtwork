#!/usr/bin/env node
/* WO-ATT-UI02 · fixed-fixture captures for the author return.
 *
 *   node capture.mjs --origin http://127.0.0.1:8872 --label after  [--only 02,06] [--widths 1440,1280,390] [--schemes light,dark]
 *   node capture.mjs --origin http://127.0.0.1:8871 --label before
 *
 * Every scene starts from a fresh page load, so the mock core's data is the
 * fixture's. Scenes drive the product through its own data-attention-focus
 * keys, which exist in the baseline and the candidate alike; a scene the
 * baseline cannot reach is recorded as skipped, never faked. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, openPage } from './pw.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const origin = arg('origin', 'http://127.0.0.1:8872');
const label = arg('label', 'after');
const only = arg('only', null)?.split(',');
const widths = arg('widths', '1440,1280,390').split(',').map(Number);
const schemes = arg('schemes', 'light,dark').split(',');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'evidence', 'screens', label);
await mkdir(out, { recursive: true });

const key = k => `[data-attention-focus="${k}"]`;
const settle = page => page.waitForTimeout(700);
async function open(page, query = '') { await page.goto(`${origin}/preview/index.html?panel=0&latency=60${query}`); await settle(page); }
async function click(page, k) { await page.click(key(k)); await settle(page); }
async function type(page, k, text) { await page.fill(key(k), text); }
const fault = (page, name, value) => page.evaluate(([n, v]) => { window.__attentionPreview.core.faults[n] = v; }, [name, value]);
const narrow = page => page.viewportSize().width < 768;

/* Each scene returns nothing; it leaves the page in the state to capture. */
const SCENES = {
  '01-list': async page => open(page),
  '02-detail-needs-you': async page => open(page, '&select=att-0101'),
  '03-detail-context-open': async page => {
    await open(page, '&select=att-0103');
    await page.click('.attention-basis > summary'); await settle(page);
  },
  '04-detail-due-later': async page => open(page, '&select=att-0104'),
  '05-detail-resolved': async page => open(page, '&select=att-0105'),
  '06-editor-snooze-field-error': async page => {
    await open(page, '&select=att-0101');
    await click(page, 'action-snooze');
    await page.selectOption(key('field-trigger'), 'at'); await settle(page);
    await click(page, 'submit-snooze');
  },
  '07-sending': async page => {
    await open(page, '&select=att-0101');
    await click(page, 'action-resolve');
    await type(page, 'field-reason', 'Counsel confirmed Draft B is current.');
    await fault(page, 'action', 'slow');
    await page.click(key('submit-resolve')); await page.waitForTimeout(500);
  },
  '08-receipt-left-view': async page => {
    await open(page);
    await click(page, 'view-needs_you');
    await click(page, 'item-att-0101');
    await click(page, 'action-resolve');
    await type(page, 'field-reason', 'Counsel confirmed Draft B is current.');
    await click(page, 'submit-resolve'); await settle(page);
  },
  '09-conflict-draft-kept': async page => {
    await open(page, '&select=att-0101');
    await click(page, 'action-resolve');
    await type(page, 'field-reason', 'Counsel confirmed Draft B is current.');
    await fault(page, 'action', 'conflict');
    await click(page, 'submit-resolve'); await settle(page);
  },
  '10-unknown-retry': async page => {
    await open(page, '&select=att-0101');
    await click(page, 'action-resolve');
    await type(page, 'field-reason', 'Counsel confirmed Draft B is current.');
    await fault(page, 'action', 'lost-before-commit');
    await click(page, 'submit-resolve'); await settle(page);
  },
  '11-seen-receipt': async page => {
    await open(page, '&select=att-0101');
    await click(page, 'action-acknowledge'); await settle(page);
  },
  '12-registry-unavailable': async page => open(page, '&project=p-down'),
  '13-empty-project': async page => open(page, '&project=p-empty'),
  '14-long-text': async page => {
    await open(page, '&project=p-long&select=att-0201');
    await page.click('.attention-basis > summary'); await settle(page);
  },
  '15-paged-second-page': async page => { await open(page, '&project=p-paged'); await click(page, 'next'); },
  '16-loading': async page => {
    await page.goto(`${origin}/preview/index.html?panel=0&latency=6000`); await page.waitForTimeout(900);
  },
  '17-home-entry': async page => { await page.goto(`${origin}/preview/index.html?panel=0&latency=60&view=home`); await settle(page); },
  '18-assistant-open': async page => { await open(page, '&select=att-0101'); await click(page, 'open-assistant'); },
};

const report = [];
const browser = await chromium.launch();
for (const [name, scene] of Object.entries(SCENES)) {
  if (only && !only.some(prefix => name.startsWith(prefix))) continue;
  for (const width of widths) for (const scheme of schemes) {
    const { context, page } = await openPage(browser, { width, height: width < 768 ? 844 : 900, scheme });
    const file = `${name}-${width}-${scheme}.png`;
    try {
      await scene(page);
      await page.screenshot({ path: join(out, file) });
      report.push({ file, status: 'captured' });
    } catch (error) {
      report.push({ file, status: 'skipped', reason: String(error.message).split('\n')[0] });
    }
    await context.close();
  }
}
await browser.close();
await writeFile(join(out, 'manifest.json'), JSON.stringify({ origin, label, captured_at: new Date().toISOString(), report }, null, 2));
console.log(report.map(r => `${r.status.padEnd(8)} ${r.file}${r.reason ? ` — ${r.reason}` : ''}`).join('\n'));
