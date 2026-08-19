import { chromium } from '/private/tmp/work-agent-showcase-accept/apps/desktop/node_modules/@playwright/test/index.mjs';
import { mkdirSync } from 'node:fs';

const port = process.env.PORT ?? '1421';
const base = `http://127.0.0.1:${port}`;
const out = process.env.OUT ?? '/private/tmp/work-agent-showcase-acceptance-evidence/custom';
const viewport = { width: 1440, height: 900 };
mkdirSync(out, { recursive: true });

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const WRITE_SCRIPT = [
  { kind: 'text', delta: '先读案件材料。' },
  { kind: 'tool', toolCallId: 'tc-read', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc-read', toolName: 'read' },
  { kind: 'tool', toolCallId: 'tc-write-a', toolName: 'write' },
  { kind: 'propose', toolCallId: 'tc-write-a', operationId: 'op-a', logicalPath: '纪要.md', byteLength: 137, contentSha256: SHA_A },
  { kind: 'toolEnd', toolCallId: 'tc-write-a', toolName: 'write' },
  { kind: 'terminal', status: 'completed' },
];

async function fresh() {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('courtwork.onboarding.seen', 'true'));
  await page.goto(base);
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
  const welcomeDemo = page.getByTestId('welcome-demo-start');
  if (await welcomeDemo.isVisible()) {
    await welcomeDemo.click();
    const onboarding = page.getByTestId('provider-setup');
    if (await onboarding.isVisible()) await page.getByTestId('provider-skip').click();
    await page.getByTestId('event-stream').waitFor();
  }
  return { context, page };
}

async function bindCase(page, label = '设备采购案卷') {
  await page.evaluate(() => window.__courtworkPiLane.reset());
  await page.getByTestId('new-case-open').click();
  await page.evaluate((label) => window.__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId: `grant-accept-${label}`, label } }), label);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('segment-draft').click();
}

async function shot(page, name) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = '__courtwork_text_mask__';
    style.textContent = '* { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }';
    document.head.appendChild(style);
  });
  await page.screenshot({ path: `${out}/${name}-text-mask.png` });
  await page.evaluate(() => document.getElementById('__courtwork_text_mask__')?.remove());
  console.log('shot', name);
}

const browser = await chromium.launch();

// A real running frame: the harness gets many independent event-loop turns before any proposal.
{
  const { context, page } = await fresh();
  await bindCase(page);
  const longText = Array.from({ length: 2500 }, () => ({ kind: 'text', delta: '·' }));
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), longText);
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('持续整理案件材料');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-running').waitFor();
  await page.waitForTimeout(30);
  await shot(page, '16-running-real');
  await context.close();
}

// Stop is captured after the actual cancel command settles the pending proposal.
{
  const { context, page } = await fresh();
  await bindCase(page);
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), WRITE_SCRIPT);
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('整理一份纪要');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-proposal').waitFor();
  await page.getByTestId('pi-stop').click();
  await page.getByTestId('pi-running').waitFor({ state: 'detached' });
  await page.getByTestId('pi-drafts-empty').waitFor();
  await shot(page, '17-stopped');
  await context.close();
}

// Restart/resume is a distinct capture from the denied stop state.
{
  const { context, page } = await fresh();
  await bindCase(page);
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), WRITE_SCRIPT);
  await page.evaluate((sha) => window.__courtworkPiLane.setWorkspaceFile('纪要.md', { content: '# 纪要\n', contentSha256: sha, byteLength: 6 }), SHA_A);
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('整理一份纪要');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-proposal').waitFor();
  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-draft-open').first().waitFor();
  await page.getByTestId('pi-restart').click();
  await page.getByTestId('pi-prior-drafts').waitFor();
  await shot(page, '18-resumed');
  await context.close();
}

const MULTI_SCRIPT = [
  { kind: 'text', delta: '逐项检查材料并形成两份工作稿。' },
  { kind: 'tool', toolCallId: 'tc-read', toolName: 'read' },
  { kind: 'toolEnd', toolCallId: 'tc-read', toolName: 'read' },
  { kind: 'tool', toolCallId: 'tc-glob', toolName: 'glob' },
  { kind: 'toolEnd', toolCallId: 'tc-glob', toolName: 'glob' },
  { kind: 'tool', toolCallId: 'tc-grep', toolName: 'grep' },
  { kind: 'toolEnd', toolCallId: 'tc-grep', toolName: 'grep' },
  { kind: 'tool', toolCallId: 'tc-write-a', toolName: 'write' },
  { kind: 'propose', toolCallId: 'tc-write-a', operationId: 'op-a', logicalPath: '纪要.md', byteLength: 137, contentSha256: SHA_A },
  { kind: 'toolEnd', toolCallId: 'tc-write-a', toolName: 'write' },
  { kind: 'tool', toolCallId: 'tc-write-b', toolName: 'write' },
  { kind: 'propose', toolCallId: 'tc-write-b', operationId: 'op-b', logicalPath: '行动清单.md', byteLength: 89, contentSha256: SHA_B },
  { kind: 'toolEnd', toolCallId: 'tc-write-b', toolName: 'write' },
  { kind: 'terminal', status: 'completed' },
];

// Multiple tools and multiple proposals/drafts in one work line.
{
  const { context, page } = await fresh();
  await bindCase(page);
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), MULTI_SCRIPT);
  await page.evaluate(({ a, b }) => {
    window.__courtworkPiLane.setWorkspaceFile('纪要.md', { content: '# 纪要\n', contentSha256: a, byteLength: 6 });
    window.__courtworkPiLane.setWorkspaceFile('行动清单.md', { content: '# 行动清单\n', contentSha256: b, byteLength: 15 });
  }, { a: SHA_A, b: SHA_B });
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('逐项检查材料并形成两份工作稿');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-proposal').waitFor();
  await shot(page, '19-multi-cards-proposal');
  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-proposal').waitFor();
  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-drafts').getByTestId('pi-draft-open').nth(1).waitFor();
  await shot(page, '20-multi-drafts');
  await context.close();
}

// Viewer hash drift remains explicit and does not create a replacement success.
{
  const { context, page } = await fresh();
  await bindCase(page);
  await page.evaluate((steps) => window.__courtworkPiLane.setScript(steps), WRITE_SCRIPT);
  await page.evaluate((sha) => window.__courtworkPiLane.setWorkspaceFile('纪要.md', { content: '# 外部改动\n', contentSha256: sha, byteLength: 9 }), SHA_B);
  await page.getByTestId('pi-start').click();
  await page.getByTestId('pi-composer-input').fill('整理一份纪要');
  await page.getByTestId('pi-send').click();
  await page.getByTestId('pi-proposal').waitFor();
  await page.getByTestId('pi-approve').click();
  await page.getByTestId('pi-drafts').getByTestId('pi-draft-open').click();
  await page.getByTestId('pi-viewer-hash-differs').waitFor();
  await shot(page, '21-viewer-hash-differs');
  await context.close();
}

await browser.close();
