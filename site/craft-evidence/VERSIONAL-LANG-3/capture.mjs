/* global localStorage, process */

import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evidenceRoot, '../../..');
const requireFromDesktop = createRequire(resolve(repositoryRoot, 'apps/desktop/package.json'));
const { chromium } = requireFromDesktop('@playwright/test');
const frameRoot = resolve(evidenceRoot, 'frames');
const baseUrl = process.env.COURTWORK_CAPTURE_URL ?? 'http://127.0.0.1:19641/';

await mkdir(frameRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function openWorkbench(page) {
  await page.goto(baseUrl);
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible().catch(() => false)) await page.getByTestId('provider-skip').click();
  const welcomeDemo = page.getByTestId('welcome-demo-start');
  if (await welcomeDemo.isVisible().catch(() => false)) {
    await welcomeDemo.click();
    if (await setup.isVisible().catch(() => false)) await page.getByTestId('provider-skip').click();
  }
  await page.getByTestId('event-stream').waitFor();
  await page.mouse.move(0, 0);
}

async function capture(name, prepare) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await openWorkbench(page);
  await prepare(page);
  if (await page.locator('html').getAttribute('data-theme') !== 'dark') throw new Error('dark theme did not resolve');
  await page.screenshot({ path: resolve(frameRoot, name), animations: 'disabled' });
  await context.close();
}

await capture('01-chat-markdown-dark-1440x900.png', async (page) => {
  const assistantMessage = [
    '# 合并态审查结论',
    '',
    '依据 [可复制法条](https://example.com/article) 与 *补充约定*：',
    '',
    '> 引文保持独立缩进，不与正文混排。',
    '',
    '- [x] 已核验付款条款',
    '- [ ] 待核验验收条款',
    '',
    '~~原第八条~~ 已废止。',
    '',
    '- 第一层',
    '  - 第二层',
    '    - 第三层：`零裸标记`',
    '',
    '- 列表内代码',
    '',
    '  ```ts',
    '  const safe = true;',
    '  ```',
    '',
    '- 列表内表格',
    '',
    '  | 风险项 | 等级 |',
    '  | --- | --- |',
    '  | 违约金 | 高 |',
    '',
    '危险 URL [脚本](javascript:alert(1)) 与 [数据](data:text/html,boom) 均不得导航。',
    '',
    '<em>原始 HTML 仍是纯文本</em>',
  ].join('\n');
  await page.evaluate((content) => {
    const completed = {
      status: 'completed',
      turnId: 'release-verify-markdown',
      providerRequestId: 'release-verify-provider',
      providerId: 'deepseek',
      modelId: 'deepseek-v4-flash',
      reasoning: { status: 'absent' },
      assistantMessage: content,
      finishReason: 'stop',
      completedAt: '2026-07-20T12:00:00.000Z',
    };
    localStorage.setItem('courtwork.turn-journal.v1', JSON.stringify({
      version: 1,
      revision: 1,
      entries: [completed],
      turnIds: [completed.turnId],
    }));
  }, assistantMessage);
  await page.reload();
  await page.getByTestId('segment-chat').click();
  await page.getByTestId('chat-history-toggle').click();
  await page.getByTestId('session-entry').click();
  const markdown = page.getByTestId('chat-markdown');
  await markdown.waitFor();
  if (await markdown.locator('a').count() !== 0) throw new Error('markdown links gained navigation');
  if (await markdown.locator('li li li').count() !== 1) throw new Error('three-level nesting did not render');
  if (await markdown.locator('table').count() !== 1) throw new Error('nested table did not render');
});

await capture('02-risklist-settled-dark-1440x900.png', async (page) => {
  const panel = page.getByTestId('revision-panel');
  await panel.locator('[data-risk-id="risk-04"]').click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  await page.getByTestId('settle-seal-risk-04').waitFor();
});

await capture('03-revision-focus-dark-1440x900.png', async (page) => {
  await page.getByTestId('focus-toggle').click();
  await page.getByTestId('workspace').waitFor();
  if (await page.getByTestId('workspace').getAttribute('data-focus-mode') !== 'true') throw new Error('focus mode did not settle');
});

await browser.close();
