import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.COURTWORK_AUDIT_URL ?? 'http://127.0.0.1:1488';
const outputDir = resolve('visual-audit');
const viewport = { width: 1440, height: 900 };
const commit = process.env.COURTWORK_AUDIT_COMMIT
  ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const port = new URL(baseURL).port;

mkdirSync(outputDir, { recursive: true });
for (const file of readdirSync(outputDir)) {
  if (file.endsWith('.png')) rmSync(resolve(outputDir, file));
}

const browser = await chromium.launch();

async function freshPage() {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.clear());
  await page.goto(baseURL);
  return { context, page };
}

async function capture(page, file) {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: resolve(outputDir, file), animations: 'disabled' });
}

async function enterSample(page) {
  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-setup').waitFor();
  await page.getByTestId('provider-skip').click();
  await page.getByTestId('preview-host').waitFor();
  await page.getByTestId('turn-card-gate').waitFor();
  await page.locator('[data-testid="thinking-stream"][data-state="settled"]').waitFor();
}

{
  const { context, page } = await freshPage();
  await page.getByTestId('welcome-state').waitFor();
  await capture(page, '01-first-install-welcome-1440.png');
  await page.evaluate(() => { document.documentElement.style.zoom = '125%'; });
  await page.getByTestId('welcome-continuations').scrollIntoViewIfNeeded();
  await capture(page, '02-welcome-continuations-1440.png');
  await context.close();
}

{
  const { context, page } = await freshPage();
  await enterSample(page);
  await page.getByTestId('view-timeline').click();
  await page.getByTestId('view-timeline').waitFor();
  await capture(page, '03-sample-preview-open-1440.png');
  await page.getByTestId('view-revision').click();
  await page.getByTestId('revision-panel').waitFor();
  await page.locator('[data-risk-id="risk-01"]').click();
  await page.locator('.risk-detail .verified-block button').first().click();
  await capture(page, '04-revision-signature-line-1440.png');
  await page.locator('[data-risk-id="risk-03"]').click();
  await capture(page, '05-batch-confirmation-gate-1440.png');
  await page.locator('[data-risk-id="risk-04"]').click();
  await page.getByTestId('revision-static-viewport').evaluate((element) => { element.scrollTop = 0; });
  await capture(page, '07-og-source-clean-workbench-1440.png');
  await context.close();
}

{
  const { context, page } = await freshPage();
  await enterSample(page);
  const provider = page.getByTestId('composer-provider');
  if (await provider.getAttribute('data-phase') !== 'connected') {
    await provider.click();
    const embed = page.getByTestId('settings-credential-embed');
    await embed.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
    await embed.getByTestId('settings-credential-validate').click();
    await page.getByTestId('settings-credential-verified').waitFor();
    await page.keyboard.press('Escape');
    await page.getByTestId('settings-page').waitFor({ state: 'hidden' });
  }
  await page.getByTestId('segment-chat').click();
  await page.evaluate(() => {
    const hooks = window.__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    hooks.setResponder(async () => ({
      content: '已核对采购合同的付款与验收条款。三处建议均保留原文锚点，签字前请逐条确认。',
      reasoningContent: '先核对付款期限，再比对验收异议与违约责任，最后检查每条建议是否有原文出处。',
    }));
  });
  await page.getByTestId('composer-input').fill('核对这份合同的付款、验收与违约责任。');
  await page.getByTestId('composer-send').click();
  await page.getByTestId('chat-assistant-message').waitFor();
  await page.getByTestId('chat-reasoning').waitFor();
  await capture(page, '06-chat-real-reply-reasoning-folded-1440.png');
  await context.close();
}

await browser.close();

const files = readdirSync(outputDir).filter((file) => file.endsWith('.png')).sort();
const hashes = files.map((file) => createHash('sha256').update(readFileSync(resolve(outputDir, file))).digest('hex'));
if (new Set(hashes).size !== files.length) {
  throw new Error(`visual audit contains duplicate frames: ${hashes.length - new Set(hashes).size}`);
}
const manifest = {
  commit,
  baseURL,
  port,
  viewport,
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
  generatedAt: new Date().toISOString(),
  files,
  sha256: Object.fromEntries(files.map((file, index) => [file, hashes[index]])),
};
writeFileSync(resolve(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(resolve(outputDir, 'README.md'), [
  '# SOL-FINALE visual audit',
  '',
  `- commit: \`${commit}\``,
  `- viewport: \`${viewport.width}×${viewport.height}@1x\``,
  `- isolated preview: \`${baseURL}\` (port \`${port}\`)`,
  '- motion: `prefers-reduced-motion: reduce`; screenshot animations disabled',
  '- old screenshots: retired and removed by this capture pipeline',
  '',
  ...files.map((file) => `- \`${file}\``),
  '',
].join('\n'));
