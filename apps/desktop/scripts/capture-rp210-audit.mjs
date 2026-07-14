import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

// RP-2.10 三卡一纸 + 品牌 icon 推理动画 关键屏截图
const baseURL = process.env.COURTWORK_AUDIT_URL ?? 'http://127.0.0.1:1439';
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
  // 等推理静默锚落定（settled）
  await page.getByTestId('process-trace').getByTestId('process-trace-toggle').waitFor({ timeout: 15_000 }).catch(() => {});
  await page.mouse.move(0, 0);
}

await enterDemo();

// 1) 三卡一纸全景：左卡 + chat 底纸 + dock band + 折叠钮居中 + 唯一 schema 卡
await page.screenshot({ path: resolve(outputDir, '53-rp210-three-cards-1440.png'), animations: 'disabled' });

// 2) turn 尾整段：扁平 event/artifact/file 行 + question/门禁轻卡 + message 按钮排 + 品牌 icon 锚
const turn = page.getByTestId('assistant-turn-demo');
await turn.scrollIntoViewIfNeeded();
await turn.screenshot({ path: resolve(outputDir, '54-rp210-turn-tail.png'), animations: 'disabled' });

// 3) 品牌 icon 静默锚特写（藏青竖线 + 三横杠）
await page.getByTestId('process-trace').screenshot({ path: resolve(outputDir, '55-rp210-brand-anchor.png'), animations: 'disabled' });

// 4) base 态：关闭 schema → dock 三 tap 坐底纸 + reopen 入口（两态皆无 utility 卡）
await page.getByTestId('preview-close').click();
await page.getByTestId('preview-open').waitFor();
await page.mouse.move(0, 0);
await page.screenshot({ path: resolve(outputDir, '56-rp210-base-mode-1440.png'), animations: 'disabled' });

await browser.close();
