// GUI-COMPOSITION-1 · 构图矩阵摄制（light 1180／1440／390 × empty／running／proposal／succeeded
// ＋ dark 1440 smoke）。用法：
//   先起 dev server（`VITE_COURTWORK_E2E=1 pnpm dev --port <port>`），再
//   PORT=<port> OUT=<dir> node scripts/capture-gui-composition-1.mjs
//
// 驱动的是 `browser-pi-lane` 的 scripted 桩（ADR-022 六-C）：产的是账本形状的记录，
// 没有真 sidecar／真模型／真落盘，摄下来的是界面对账本的投影。
//
// GUI-LEAD-WHITE-1 首帧失真判例：每一帧落盘前都实测 `data-theme` 已写，未写即抛，不摄。
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const port = process.env.PORT ?? '19871';
const base = `http://127.0.0.1:${port}`;
const OUT = process.env.OUT ?? '/tmp/gc1shots';
mkdirSync(OUT, { recursive: true });

const SHA = 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba';
const SCRIPT = [
  { kind: 'text', delta: '先读案件材料，定位需要整理的条目。' },
  { kind: 'tool', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'text', delta: '\n\n已读完，下面写成一份工作稿。\n' },
  { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'propose', toolCallId: 'tc_2', operationId: 'op_1', logicalPath: '纪要.md', byteLength: 137, contentSha256: SHA },
  { kind: 'toolEnd', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'text', delta: '\n已写入 /workspace/纪要.md，共 137 字节。' },
  { kind: 'usage', costUsd: 0.0018 },
  { kind: 'terminal', status: 'completed' },
];

const browser = await chromium.launch();

async function fresh(theme, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  // 宗别在首帧之前就写进 settings 真源（`courtwork.settings.v1` 存的就是 settings 本体），
  // 不靠加载后补写 data-theme——那正是 GUI-LEAD-WHITE-1 首帧失真的成因。
  await page.addInitScript((value) => {
    localStorage.setItem('courtwork.onboarding.seen', 'true');
    localStorage.setItem('courtwork.settings.v1', JSON.stringify({ appearance: { themeMode: value } }));
  }, theme);
  await page.goto(base);
  await page.mouse.move(0, 0);
  return { context, page };
}

async function bindCase(page, label = '设备采购案卷') {
  await page.evaluate(() => window.__courtworkPiLane.reset());
  await page.getByTestId('new-case-open').click();
  await page.evaluate((value) => window.__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId: 'grant-gc1-shot', label: value } }), label);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
}

async function shot(page, name, theme) {
  const written = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (written !== theme) throw new Error(`data-theme 未写实：期望 ${theme}，实得 ${written ?? '(缺)'} · ${name}`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name, `data-theme=${written}`);
}

const MATRIX = [
  { theme: 'light', viewport: { width: 1180, height: 860 }, tag: 'light-1180' },
  { theme: 'light', viewport: { width: 1440, height: 900 }, tag: 'light-1440' },
  { theme: 'light', viewport: { width: 390, height: 844 }, tag: 'light-390' },
  { theme: 'dark', viewport: { width: 1440, height: 900 }, tag: 'dark-1440-smoke', only: 'proposal' },
];

let index = 0;
for (const cell of MATRIX) {
  // 建案入口按 rail 的桌面断点排布：一律先在 1240 宽建案，再收到目标视口摄制
  // （与既有 capture-pi-lane-states.mjs 的 SETUP_VIEWPORT 同一做法）。
  const setup = { width: Math.max(cell.viewport.width, 1240), height: Math.max(cell.viewport.height, 800) };
  const { context, page } = await fresh(cell.theme, setup);
  await bindCase(page);
  await page.setViewportSize(cell.viewport);
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), SCRIPT);
  await page.evaluate((sha) => window.__courtworkPiLane.setWorkspaceFile('纪要.md', {
    content: '# 采购合同纪要\n\n| 项 | 值 |\n| --- | --- |\n| 合同编号 | HT-2024-081 |\n| 金额 | 1,280,000 元 |\n',
    contentSha256: sha, byteLength: 137,
  }), SHA);

  const want = (state) => !cell.only || cell.only === state;

  await page.getByTestId('pi-start').click();
  if (want('empty')) await shot(page, `${String(++index).padStart(2, '0')}-empty-${cell.tag}`, cell.theme);

  await page.getByTestId('pi-composer-input').fill('把这一段要做的事整理成工作稿');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-tool-card').first().waitFor();
  if (want('running')) await shot(page, `${String(++index).padStart(2, '0')}-running-${cell.tag}`, cell.theme);

  await page.getByTestId('pi-proposal').waitFor();
  await page.getByTestId('pi-proposal').evaluate((proposal) => {
    proposal.closest('[data-testid="pi-tool-card"]')?.querySelector('[data-testid="pi-tool-details"]')?.setAttribute('open', '');
  });
  if (want('proposal')) await shot(page, `${String(++index).padStart(2, '0')}-proposal-${cell.tag}`, cell.theme);

  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-draft-open').first().waitFor();
  if (want('succeeded')) await shot(page, `${String(++index).padStart(2, '0')}-succeeded-${cell.tag}`, cell.theme);

  await context.close();
}
await browser.close();
