/* global document, localStorage, window */

// GUI-PAPER-THEMES-1 · 双宗状态矩阵摄制。
// 用法：先起 dev server（VITE_COURTWORK_E2E=1 pnpm dev --port <port>），再：
//   PORT=<port> OUT=<dir> node scripts/capture-gui-paper-themes-1.mjs
//
// 这里只摄 scripted browser-pi-lane projection；不把截图当作真实 sidecar、模型或落盘证据。
// 矩阵覆盖两宗 × 三视口 × 四状态，并附 240px squint、横溢与同构 bounding-box 机器记录。

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const port = process.env.PORT ?? '19872';
const base = `http://127.0.0.1:${port}`;
const out = process.env.OUT ?? '/tmp/gui-paper-themes-1';
mkdirSync(out, { recursive: true });

const contentSha = 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba';
const script = [
  { kind: 'text', delta: '先读案件材料，定位需要整理的条目。' },
  { kind: 'tool', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'text', delta: '\n\n已读完，下面写成一份工作稿。\n' },
  { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'propose', toolCallId: 'tc_2', operationId: 'op_1', logicalPath: '纪要.md', byteLength: 137, contentSha256: contentSha },
  { kind: 'toolEnd', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'text', delta: '\n已写入 /workspace/纪要.md，共 137 字节。' },
  { kind: 'usage', costUsd: 0.0018 },
  { kind: 'terminal', status: 'completed' },
];

const viewports = [
  { width: 1180, height: 860, tag: '1180' },
  { width: 1440, height: 900, tag: '1440' },
  { width: 390, height: 844, tag: '390' },
];
const themes = ['light', 'dark'];
const states = ['empty', 'running', 'proposal', 'succeeded'];
const geometrySelectors = [
  'body',
  '.workspace',
  '[data-testid="case-rail"]',
  '[data-testid="pi-panel"]',
  '[data-testid="pi-work-head"]',
  '[data-testid="pi-viewport"]',
  '[data-testid="pi-composer"]',
  '[data-testid="right-module-stack"]',
];

const browser = await chromium.launch();
const measurements = [];

async function fresh(theme, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.addInitScript((value) => {
    localStorage.setItem('courtwork.onboarding.seen', 'true');
    localStorage.setItem('courtwork.settings.v1', JSON.stringify({ appearance: { themeMode: value } }));
  }, theme);
  await page.goto(base);
  await page.mouse.move(0, 0);
  return { context, page };
}

async function bindCase(page) {
  await page.evaluate(() => window.__courtworkPiLane.reset());
  await page.getByTestId('new-case-open').click();
  await page.evaluate((value) => window.__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId: 'grant-gpt-paper', label: value } }), '设备采购案卷');
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
}

async function inspect(page) {
  return page.evaluate((selectors) => {
    const boxes = Object.fromEntries(selectors.map((selector) => {
      const node = document.querySelector(selector);
      if (!node) return [selector, null];
      const rect = node.getBoundingClientRect();
      return [selector, {
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      }];
    }));
    const root = document.documentElement;
    const body = document.body;
    return {
      innerWidth: window.innerWidth,
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      clientWidth: root.clientWidth,
      horizontalOverflow: Math.max(root.scrollWidth, body.scrollWidth) > root.clientWidth,
      boxes,
    };
  }, geometrySelectors);
}

async function shot(page, theme, viewportTag, state) {
  const written = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (written !== theme) throw new Error(`data-theme 未写实：期望 ${theme}，实得 ${written ?? '(缺)'}`);
  await page.waitForTimeout(150);
  const name = `${theme}-${viewportTag}-${state}`;
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  const inspection = await inspect(page);
  measurements.push({ theme, viewport: viewportTag, state, ...inspection });
  console.log('shot', name, `overflow=${inspection.horizontalOverflow}`);
}

async function runCell(theme, viewport, stateFilter = states) {
  const setup = { width: Math.max(viewport.width, 1240), height: Math.max(viewport.height, 800) };
  const { context, page } = await fresh(theme, setup);
  await bindCase(page);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), script);
  await page.evaluate((sha) => window.__courtworkPiLane.setWorkspaceFile('纪要.md', {
    content: '# 采购合同纪要\n\n| 项 | 值 |\n| --- | --- |\n| 合同编号 | HT-2024-081 |\n| 金额 | 1,280,000 元 |\n',
    contentSha256: sha,
    byteLength: 137,
  }), contentSha);

  await page.getByTestId('pi-start').click();
  if (stateFilter.includes('empty')) await shot(page, theme, viewport.tag, 'empty');

  await page.getByTestId('pi-composer-input').fill('把这一段要做的事整理成工作稿');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-tool-card').first().waitFor();
  if (stateFilter.includes('running')) await shot(page, theme, viewport.tag, 'running');

  await page.getByTestId('pi-proposal').waitFor();
  await page.getByTestId('pi-proposal').evaluate((proposal) => {
    proposal.closest('[data-testid="pi-tool-card"]')?.querySelector('[data-testid="pi-tool-details"]')?.setAttribute('open', '');
  });
  if (stateFilter.includes('proposal')) await shot(page, theme, viewport.tag, 'proposal');

  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-draft-open').first().waitFor();
  if (stateFilter.includes('succeeded')) await shot(page, theme, viewport.tag, 'succeeded');
  await context.close();
}

for (const theme of themes) {
  for (const viewport of viewports) await runCell(theme, viewport);
}

// 240px squint：同一 scripted proposal 状态的窄幅缩略，单独记录而不混入主矩阵。
for (const theme of themes) {
  await runCell(theme, { width: 240, height: 520, tag: 'squint-240' }, ['proposal']);
}

const byKey = new Map(measurements.map((measurement) => [
  `${measurement.viewport}:${measurement.state}:${measurement.theme}`,
  measurement,
]));
const boundingBoxComparisons = [];
for (const measurement of measurements.filter(({ theme }) => theme === 'light')) {
  const dark = byKey.get(`${measurement.viewport}:${measurement.state}:dark`);
  if (!dark) continue;
  const selectors = geometrySelectors.filter((selector) => measurement.boxes[selector] && dark.boxes[selector]);
  const mismatches = selectors.filter((selector) => JSON.stringify(measurement.boxes[selector]) !== JSON.stringify(dark.boxes[selector]));
  boundingBoxComparisons.push({
    viewport: measurement.viewport,
    state: measurement.state,
    selectors,
    mismatches,
    isomorphic: mismatches.length === 0,
  });
}

const report = {
  ticket: 'GUI-PAPER-THEMES-1',
  generatedAt: new Date().toISOString(),
  scriptedProjection: true,
  screenshots: measurements.length,
  horizontalOverflowFree: measurements.every(({ horizontalOverflow }) => !horizontalOverflow),
  measurements,
  boundingBoxComparisons,
  allBoundingBoxesIsomorphic: boundingBoxComparisons.every(({ isomorphic }) => isomorphic),
};
writeFileSync(`${out}/matrix.json`, `${JSON.stringify(report, null, 2)}\n`);
await browser.close();

if (!report.horizontalOverflowFree || !report.allBoundingBoxesIsomorphic) {
  process.exitCode = 1;
}
