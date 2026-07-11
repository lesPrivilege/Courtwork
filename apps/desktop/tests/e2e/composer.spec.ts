import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectProvider, openWorkbench } from './helpers';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureMd = path.resolve(here, '../fixtures/sample-brief.md');

test('composer 按钮族：已绑定卷宗不重复显示 folder，附件来源统一收进 +', async ({ page }) => {
  await openWorkbench(page);
  const composer = page.getByTestId('composer');
  await expect(composer).toBeVisible();

  await expect(page.getByTestId('composer-case')).toHaveCount(0);
  await expect(page.getByTestId('composer-send')).toBeDisabled();
  await expect(page.getByTestId('composer-plus')).toBeVisible();

  // 平铺区无相机/语音；打开 + 菜单后见禁用态
  await expect(page.getByTestId('composer-camera')).toHaveCount(0);
  await page.getByTestId('composer-plus').click();
  await expect(page.getByTestId('composer-upload')).toHaveText('Attach files');
  const camera = page.getByTestId('composer-camera');
  await expect(camera).toHaveAttribute('aria-disabled', 'true');
  await expect(camera).toHaveAttribute('title', 'Coming soon · Attach a photo or PDF for now');

  const voice = page.getByTestId('composer-voice');
  await expect(voice).toHaveAttribute('aria-disabled', 'true');
  await expect(voice).toHaveAttribute('title', 'Coming soon · Type your message for now');

  await expect(page.getByTestId('composer-kbd-hint')).toContainText('Send');
  await expect(page.getByTestId('composer-kbd-hint')).toContainText('New line');
});

test('附件 chip 生命周期：上传成功、作用域确认单向落定', async ({ page }) => {
  await openWorkbench(page);

  await page.getByTestId('composer-file-input').setInputFiles(fixtureMd);
  const chip = page.locator('[data-testid^="attachment-chip-"]').first();
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
  await expect(chip).toContainText('.md');

  const scope = page.locator('[data-testid^="attachment-scope-"]').first();
  await expect(scope).toHaveText('仅本条');
  await scope.click();
  const popover = page.locator('[data-testid^="scope-popover-"]').first();
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('存入卷宗后');
  await page.locator('[data-testid^="scope-confirm-"]').first().click();
  await expect(scope).toHaveText('已存入卷宗');
  await expect(chip).toHaveAttribute('data-scope', 'dossier');
  // 单向：已存入后徽章不可再点回
  await expect(scope).toBeDisabled();
});

test('Enter 发送、Shift+Enter 换行；发送后进入对话流', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  const input = page.getByTestId('composer-input');
  await input.fill('请核对验收条款');
  await expect(page.getByTestId('composer-send')).toBeEnabled();

  await input.press('Shift+Enter');
  await input.type('第二行说明');
  await expect(input).toHaveValue(/请核对验收条款[\s\S]*第二行说明/);

  await input.press('Enter');
  await expect(page.getByTestId('local-user-message')).toContainText('请核对验收条款');
  await expect(input).toHaveValue('');
});

test('拖放全窗 overlay 与粘贴文件可形成 chip', async ({ page }) => {
  await openWorkbench(page);

  // 模拟 dragenter 全窗 overlay
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['# paste'], '粘贴说明.md', { type: 'text/markdown' }));
    window.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
  });
  await expect(page.getByTestId('composer-drop-overlay')).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new DragEvent('dragleave', { bubbles: true, dataTransfer: new DataTransfer() }));
  });
  // depth 计数可能仍 >0 若只 leave 一次；再 leave 归零
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'x.md', { type: 'text/markdown' }));
    // 补一次 enter/leave 对称
    window.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
    window.dispatchEvent(new DragEvent('dragleave', { bubbles: true, dataTransfer: dt }));
    window.dispatchEvent(new DragEvent('dragleave', { bubbles: true, dataTransfer: dt }));
  });

  // 粘贴文件到 textarea
  await page.getByTestId('composer-input').focus();
  await page.evaluate(async () => {
    const file = new File(['# clipboard body'], '剪贴板纪要.md', { type: 'text/markdown' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('[data-testid="composer-input"]');
    input?.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
  });

  const chip = page.locator('[data-testid^="attachment-chip-"]').filter({ hasText: '剪贴板' }).first();
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
});

test('needs_ocr 结果呈现为 chip 失败态说明（非空文）', async ({ page }) => {
  await openWorkbench(page);
  // 最小 PNG 头：reading-view 会按扩展名短路 needs_ocr
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49,
    0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4,
    0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  await page.getByTestId('composer-file-input').setInputFiles({
    name: 'scan-page.png',
    mimeType: 'image/png',
    buffer: pngBytes,
  });
  const chip = page.locator('[data-testid^="attachment-chip-"]').first();
  await expect(chip).toHaveAttribute('data-status', 'failed', { timeout: 15_000 });
  await expect(chip).toContainText('文字识别');
  await expect(chip).not.toContainText('OCR');
});
