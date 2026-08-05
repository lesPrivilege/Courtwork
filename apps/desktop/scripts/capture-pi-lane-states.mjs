// PI-LANE-UI-1 · 通用工作稿面（Draft）全状态摄制。
//
// 用法：先起 dev server（`VITE_COURTWORK_E2E=1 pnpm dev --port <port>`），再
//   PORT=<port> OUT=<dir> THEMES=light,dark node scripts/capture-pi-lane-states.mjs
//
// 它驱动的是 `browser-pi-lane` 的 scripted 樁（ADR-022 六-C harness 注入面）：产的是账本形状
// 的记录，没有真 sidecar／真模型／真落盘。摄下来的是**界面对账本的投影**，不是产品运行事实。
// 证据与逐枚 SHA-256 见 `release/evidence/pi-lane-ui-1-2026-08-05/README.md`。
import { chromium } from '@playwright/test';
const port = process.env.PORT ?? '1470';
const base = `http://127.0.0.1:${port}`;
const OUT = process.env.OUT ?? '/tmp/pishots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const SHA = 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba';
const WRITE_SCRIPT = [
  { kind: 'text', delta: '先读 /case/备忘.md，找出合同编号与金额。' },
  { kind: 'tool', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'text', delta: '\n\n找到 **HT-2024-081**，金额 1,280,000 元。现在写成工作稿。\n' },
  { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'propose', toolCallId: 'tc_2', operationId: 'op_1', logicalPath: '纪要.md', byteLength: 137, contentSha256: SHA },
  { kind: 'toolEnd', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'text', delta: '\n已写入 /workspace/纪要.md，共 137 字节。' },
  { kind: 'usage', costUsd: 0.0018 },
  { kind: 'terminal', status: 'completed' },
];

const browser = await chromium.launch();
async function fresh(theme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base);
  if (theme === 'dark') {
    await page.evaluate(() => {
      window.localStorage.setItem('courtwork.settings.v1', JSON.stringify({ version: 1, settings: { appearance: { themeMode: 'dark' } } }));
    });
    await page.reload();
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  }
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
  const welcomeDemo = page.getByTestId('welcome-demo-start');
  if (await welcomeDemo.isVisible()) {
    await welcomeDemo.click();
    const onboarding = page.getByTestId('provider-setup');
    if (await onboarding.isVisible()) await page.getByTestId('provider-skip').click();
    await page.getByTestId('event-stream').waitFor();
  }
  await page.mouse.move(0, 0);
  if (theme === 'dark') await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  return { context, page };
}

async function bindCase(page) {
  await page.evaluate(() => window.__courtworkPiLane.reset());
  await page.getByTestId('new-case-open').click();
  await page.evaluate(() => window.__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId: 'grant-pi-shot', label: '设备采购案卷' } }));
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
}

async function shot(page, name) {
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}

const themes = (process.env.THEMES ?? 'light').split(',');
for (const theme of themes) {
  const suffix = theme === 'dark' ? '-dark' : '';
  // 1 空态（未绑定）
  {
    const { context, page } = await fresh(theme);
    await page.getByTestId('segment-draft').click();
    await shot(page, `01-empty-unbound${suffix}`);
    await context.close();
  }
  // 2 空态（已绑定，可开工） 3 运行中 4 提案 5 已写入+索引 6 viewer
  {
    const { context, page } = await fresh(theme);
    await bindCase(page);
    await shot(page, `02-empty-bound${suffix}`);
    await page.evaluate((s) => window.__courtworkPiLane.setScript(s), WRITE_SCRIPT);
    await page.evaluate((sha) => window.__courtworkPiLane.setWorkspaceFile('纪要.md', {
      content: '# 采购合同纪要\n\n| 项 | 值 |\n| --- | --- |\n| 合同编号 | HT-2024-081 |\n| 金额 | 1,280,000 元 |\n\n来源：/case/备忘.md\n',
      contentSha256: sha, byteLength: 137,
    }), SHA);
    await page.getByTestId('pi-start').click();
    await page.getByTestId('pi-composer-input').fill('把案件材料里的合同编号与金额整理成一份纪要');
    await shot(page, `03-composed${suffix}`);
    await page.getByTestId('pi-send').click();
    await page.getByTestId('pi-tool-card').first().waitFor();
    await shot(page, `04-running${suffix}`);
    await page.getByTestId('pi-proposal').waitFor();
    await shot(page, `05-proposal${suffix}`);
    await page.getByTestId('pi-approve').click();
    await page.getByTestId('pi-draft-open').first().waitFor();
    await shot(page, `06-succeeded${suffix}`);
    await page.getByTestId('pi-drafts').getByTestId('pi-draft-open').click();
    await page.getByTestId('pi-viewer-body').waitFor();
    await shot(page, `07-viewer${suffix}`);
    await page.getByTestId('pi-viewer-close').click();
    await page.getByTestId('pi-restart').click();
    await shot(page, `08-resume-prior${suffix}`);
    await context.close();
  }
  // 9 拒绝
  {
    const { context, page } = await fresh(theme);
    await bindCase(page);
    await page.evaluate((s) => window.__courtworkPiLane.setScript(s), WRITE_SCRIPT);
    await page.getByTestId('pi-start').click();
    await page.getByTestId('pi-composer-input').fill('整理一份纪要');
    await page.getByTestId('pi-send').click();
    await page.getByTestId('pi-proposal').waitFor();
    await page.getByTestId('pi-deny').click();
    await page.getByTestId('pi-drafts-empty').waitFor();
    await shot(page, `09-denied${suffix}`);
    await context.close();
  }
  // 10 failed 11 uncertain
  for (const [name, effect] of [['10-failed', 'failed'], ['11-uncertain', 'uncertain']]) {
    const { context, page } = await fresh(theme);
    await bindCase(page);
    await page.evaluate(({ effect, SHA }) => window.__courtworkPiLane.setScript([
      { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
      { kind: 'propose', toolCallId: 'tc_2', operationId: 'op_1', logicalPath: '纪要.md', byteLength: 137, contentSha256: SHA, effect, failureCode: 'symlink_forbidden' },
      { kind: 'terminal', status: 'completed' },
    ]), { effect, SHA });
    await page.getByTestId('pi-start').click();
    await page.getByTestId('pi-composer-input').fill('整理一份纪要');
    await page.getByTestId('pi-send').click();
    await page.getByTestId('pi-proposal').waitFor();
    await page.getByTestId('pi-approve').click();
    await page.getByTestId('pi-drafts-empty').waitFor();
    await shot(page, `${name}${suffix}`);
    await context.close();
  }
  // 12 fail-closed
  {
    const { context, page } = await fresh(theme);
    await bindCase(page);
    await page.evaluate(() => window.__courtworkPiLane.setScript([
      { kind: 'text', delta: '开始。' },
      { kind: 'raw', line: JSON.stringify({ schemaVersion: 1, eventId: 'e', seq: 9, containerId: 'x', sessionId: 'x', leg: 1, requestId: 'r-1', type: 'tool_promoted', recordedAt: 9, payload: {} }) },
      { kind: 'terminal', status: 'completed' },
    ]));
    await page.getByTestId('pi-start').click();
    await page.getByTestId('pi-composer-input').fill('整理一份纪要');
    await page.getByTestId('pi-send').click();
    await page.getByTestId('pi-decode-failure').waitFor();
    await shot(page, `12-fail-closed${suffix}`);
    await context.close();
  }
}
await browser.close();
