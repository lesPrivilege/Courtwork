import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

// RP-2.11 chat|work 二段 + 顶栏秩序 + 字符推理 + 长消息收敛 关键屏
const baseURL = process.env.COURTWORK_AUDIT_URL ?? 'http://127.0.0.1:1420';
const outputDir = resolve('visual-audit');
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

async function enterDemo() {
  await page.goto(baseURL);
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible().catch(() => false)) await setup.getByRole('button', { name: '先查看演示' }).click();
  const welcomeDemo = page.getByTestId('welcome-demo-start');
  if (await welcomeDemo.isVisible().catch(() => false)) {
    await welcomeDemo.click();
    const onboarding = page.getByTestId('provider-setup');
    if (await onboarding.isVisible().catch(() => false)) await page.getByTestId('provider-skip').click();
  }
  await page.getByTestId('assistant-turn-demo').waitFor();
  await page.mouse.move(0, 0);
}

await enterDemo();

// 1) work 面：三卡一纸 + 案件标题迁顶栏（与红绿灯同排）+ Chat|Work 段控 + composer 五钮沉底
await page.screenshot({ path: resolve(outputDir, '57-rp211-work-topchrome-1440.png'), animations: 'disabled' });

// 2) chat 面：内存态轻画布（右栏退场，二栏）
await page.getByTestId('segment-chat').click();
await page.getByTestId('chat-canvas').waitFor();
await page.mouse.move(0, 0);
await page.screenshot({ path: resolve(outputDir, '58-rp211-chat-canvas-1440.png'), animations: 'disabled' });

// 3) ⑧ 长消息收敛：渐隐 + Show more
const providerTrigger = page.getByTestId('composer-provider');
if (await providerTrigger.getAttribute('data-phase') !== 'connected') {
  await providerTrigger.click();
  const dialog = page.getByTestId('provider-setup');
  await dialog.getByRole('textbox', { name: '访问凭证' }).fill('cw-valid-secret-key');
  await dialog.getByRole('button', { name: '完成连接' }).click();
  await dialog.waitFor({ state: 'hidden' });
}
await page.getByTestId('composer-input').fill('这是一段很长的消息用于触发长消息收敛渐隐遮罩与 Show more。'.repeat(40));
await page.getByTestId('composer-send').click();
await page.getByTestId('collapse-toggle').first().waitFor();
await page.mouse.move(0, 0);
await page.getByTestId('collapsible-message').first().screenshot({ path: resolve(outputDir, '59-rp211-long-message-collapse.png'), animations: 'disabled' });

await browser.close();
