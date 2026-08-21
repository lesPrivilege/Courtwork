/* global document, localStorage, window */

import { chromium } from '../../../../apps/desktop/node_modules/@playwright/test/index.mjs';
import { mkdirSync } from 'node:fs';

const port = process.env.PORT ?? '18741';
const base = `http://127.0.0.1:${port}`;
const out = process.env.OUT ?? './';
const viewport = {
  width: Number(process.env.VIEWPORT_W ?? 1440),
  height: Number(process.env.VIEWPORT_H ?? 900),
};
const setupViewport = {
  width: Math.max(viewport.width, 1240),
  height: Math.max(viewport.height, 800),
};
const theme = process.env.THEME ?? 'light';
const suffix = theme === 'dark' ? '-dark' : '';
const sha = 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba';
const writeScript = [
  { kind: 'text', delta: '先读 /case/备忘.md，找出合同编号与金额。' },
  { kind: 'tool', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc_1', toolName: 'read' },
  { kind: 'text', delta: '\n\n找到 HT-2024-081，金额 1,280,000 元。现在写成工作稿。\n' },
  { kind: 'tool', toolCallId: 'tc_2', toolName: 'write' },
  {
    kind: 'propose',
    toolCallId: 'tc_2',
    operationId: 'op_1',
    logicalPath: '纪要.md',
    byteLength: 137,
    contentSha256: sha,
  },
  { kind: 'toolEnd', toolCallId: 'tc_2', toolName: 'write' },
  { kind: 'text', delta: '\n已写入 /workspace/纪要.md，共 137 字节。' },
  { kind: 'usage', costUsd: 0.0018 },
  { kind: 'terminal', status: 'completed' },
];
const longRunningScript = Array.from({ length: 2500 }, () => ({ kind: 'text', delta: '·' }));

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function fresh() {
  const context = await browser.newContext({ viewport: setupViewport });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('courtwork.onboarding.seen', 'true');
  });
  await page.goto(base);
  if (theme === 'dark') {
    await page.evaluate(() => {
      window.localStorage.setItem(
        'courtwork.settings.v1',
        JSON.stringify({ version: 1, settings: { appearance: { themeMode: 'dark' } } }),
      );
    });
    await page.reload();
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  }
  await page.mouse.move(0, 0);
  return { context, page };
}

async function bindCase(page) {
  await page.evaluate(() => window.__courtworkPiLane.reset());
  await page.getByTestId('new-case-open').click();
  await page.evaluate((label) => {
    window.__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: 'grant-work-surface-acceptance', label },
    });
  }, '设备采购案卷');
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
}

async function assertNoOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  if (geometry.documentWidth > geometry.innerWidth || geometry.bodyWidth > geometry.innerWidth) {
    throw new Error(`${label}: horizontal overflow ${JSON.stringify(geometry)}`);
  }
  console.log('geometry', label, JSON.stringify(geometry));
}

async function shot(page, name) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(220);
  await assertNoOverflow(page, `${name}${suffix}`);
  if (viewport.width === 390) {
    const required = {
      running: ['pi-work-head', 'pi-composer-input'],
      proposal: ['pi-work-head', 'pi-composer-input', 'pi-proposal', 'pi-approve', 'pi-deny'],
      succeeded: ['pi-work-head', 'pi-drafts', 'pi-draft-open'],
    }[name] ?? [];
    for (const testId of required) {
      if (!(await page.getByTestId(testId).count())) {
        throw new Error(`${name}: missing 390 smoke target ${testId}`);
      }
    }
    console.log('smoke-targets', name, required.join(','));
  }
  await page.screenshot({ path: `${out}/${name}${suffix}.png` });
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = '__courtwork_text_mask__';
    style.textContent =
      '* { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }';
    document.head.appendChild(style);
  });
  await page.screenshot({ path: `${out}/${name}${suffix}-text-mask.png` });
  await page.evaluate(() => document.getElementById('__courtwork_text_mask__')?.remove());
  console.log('shot', `${name}${suffix}`);
}

// A long event-loop script keeps the renderer in running state before any proposal.
{
  const { context, page } = await fresh();
  await bindCase(page);
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), longRunningScript);
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('持续整理案件材料');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-running').waitFor();
  await page.waitForTimeout(30);
  await shot(page, 'running');
  await context.close();
}

// Proposal is captured before the real decision command is sent.
{
  const { context, page } = await fresh();
  await bindCase(page);
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), writeScript);
  await page.evaluate((contentSha256) => {
    window.__courtworkPiLane.setWorkspaceFile('纪要.md', {
      content: '# 采购合同纪要\n\n合同编号：HT-2024-081\n金额：1,280,000 元\n',
      contentSha256,
      byteLength: 137,
    });
  }, sha);
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('把案件材料里的合同编号与金额整理成一份纪要');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-proposal').waitFor();
  await page.getByTestId('pi-proposal').evaluate((proposal) => {
    proposal.closest('[data-testid="pi-tool-card"]')
      ?.querySelector('[data-testid="pi-tool-details"]')
      ?.setAttribute('open', '');
  });
  await shot(page, 'proposal');
  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-draft-open').first().waitFor();
  if (await page.getByTestId('pi-open-from-card').count()) {
    throw new Error('succeeded state still exposes duplicate pi-open-from-card');
  }
  await shot(page, 'succeeded');
  await context.close();
}

await browser.close();
