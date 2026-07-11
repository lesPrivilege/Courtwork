import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings' }).click();
}

test.describe('SET-1 设置页', () => {
  test('标题栏齿轮与 ⌘K 设置动词打开全局设置层', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByTestId('settings-page')).toHaveCount(0);
    await openSettings(page);
    await expect(page.getByTestId('settings-page')).toBeVisible();
    await expect(page.getByTestId('settings-section-model')).toBeVisible();
    await page.getByTestId('settings-close').click();
    await expect(page.getByTestId('settings-page')).toHaveCount(0);

    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: 'Settings', exact: true }).click();
    await expect(page.getByTestId('settings-page')).toBeVisible();
  });

  test('分组切换 0ms 且真实路由组行为可用', async ({ page }) => {
    await openWorkbench(page);
    await openSettings(page);

    // 模型：凭证入口 + provider + maxUsd
    await expect(page.getByTestId('settings-credential-phase')).toBeVisible();
    await page.getByTestId('settings-provider').selectOption('qwen');
    await page.getByTestId('settings-model').selectOption('qwen-max');
    await page.getByRole('radio', { name: 'Deep' }).check();
    await expect(page.getByTestId('settings-model-summary')).toContainText('Qwen Max');
    await expect(page.getByTestId('settings-model-summary')).toContainText('Deep');
    await page.getByTestId('settings-maxusd').fill('8');
    await page.getByTestId('settings-maxusd-save').click();
    await expect(page.getByTestId('system-open-feedback')).toContainText('8');

    // 产出目录：选择文件夹路径可见 + reveal 在有路径时可用
    await page.getByTestId('settings-nav-output').click();
    await expect(page.getByTestId('settings-section-output')).toBeVisible();
    await expect(page.getByTestId('settings-reveal-output-dir')).toBeDisabled();
    const outDir = mkdtempSync(join(tmpdir(), 'cw-settings-out-'));
    writeFileSync(join(outDir, 'note.txt'), 'x');
    await page.getByTestId('settings-output-folder-input').setInputFiles(outDir);
    await expect(page.getByTestId('settings-output-dir')).not.toHaveText(/Not set/);
    await expect(page.getByTestId('settings-reveal-output-dir')).toBeEnabled();

    // 隐私：遥测开关 + opt-in 确认制带时间戳
    await page.getByTestId('settings-nav-privacy').click();
    const telemetry = page.getByTestId('settings-telemetry');
    await expect(telemetry).toBeChecked();
    await telemetry.uncheck();
    await expect(telemetry).not.toBeChecked();
    await page.getByTestId('settings-optin-on').click();
    await expect(page.getByTestId('settings-optin-confirm')).toBeVisible();
    await page.getByTestId('settings-optin-confirm-yes').click();
    await expect(page.getByTestId('settings-optin-timestamp')).toBeVisible();
    await page.getByTestId('settings-optin-off').click();
    await expect(page.getByTestId('settings-optin-timestamp')).toHaveCount(0);

    // 数据承诺声明页文书级文案
    await page.getByTestId('settings-nav-promise').click();
    await expect(page.getByTestId('settings-promise-doc')).toContainText('案件内容永不训练');
    await expect(page.getByTestId('promise-never-train')).toBeVisible();

    // 关于：版本 + 诊断导出（下载不拦截断言按钮可用）
    await page.getByTestId('settings-nav-about').click();
    await expect(page.getByTestId('settings-version')).toHaveText('0.1.0');
    await expect(page.getByTestId('settings-export-diagnostics')).toBeEnabled();
  });

  test('预留组一律禁用态 + tooltip，无假开关', async ({ page }) => {
    await openWorkbench(page);
    await openSettings(page);

    await page.getByTestId('settings-nav-output').click();
    const sources = page.getByTestId('settings-sources');
    await expect(sources).toHaveAttribute('aria-disabled', 'true');
    await expect(sources).toHaveAttribute('title', /coming soon/);

    await page.getByTestId('settings-nav-channels').click();
    for (const id of ['wecom', 'feishu', 'email', 'enterprise-lib'] as const) {
      const btn = page.getByTestId(`settings-channel-${id}-btn`);
      await expect(btn).toHaveAttribute('aria-disabled', 'true');
      await expect(btn).toHaveAttribute('title', /coming soon/);
    }

    await page.getByTestId('settings-nav-privacy').click();
    await expect(page.getByTestId('settings-clear-prefs')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('settings-clear-prefs')).toHaveAttribute('title', /coming soon/);

    await page.getByTestId('settings-nav-about').click();
    await expect(page.getByTestId('settings-check-update')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('settings-check-update')).toHaveAttribute('title', /coming soon/);
  });

  test('管理凭证打开既有探针对话框', async ({ page }) => {
    await openWorkbench(page);
    await openSettings(page);
    await page.getByTestId('settings-open-credentials').click();
    await expect(page.getByTestId('provider-setup')).toBeVisible();
  });

  test('连接失败态展示分型文案与钥匙串恢复指引', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as {
        __CW_FORCE_CREDENTIAL__: {
          phase: string;
          failKind: string;
          failureMessage: string;
        };
      }).__CW_FORCE_CREDENTIAL__ = {
        phase: 'failed',
        failKind: 'auth_failed',
        failureMessage: '无法解锁电脑的安全凭证库，请确认钥匙串密码后重试',
      };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();

    await openSettings(page);
    await expect(page.getByTestId('settings-credential-phase')).toHaveAttribute('data-phase', 'failed');
    await expect(page.getByTestId('settings-credential-phase')).toHaveAttribute('data-fail-kind', 'auth_failed');
    const recovery = page.getByTestId('settings-credential-recovery');
    await expect(recovery).toBeVisible();
    await expect(page.getByTestId('settings-credential-fail-message')).toContainText('钥匙串密码');
    await expect(recovery).toContainText('钥匙串访问');
    await expect(recovery).toContainText('cn.courtwork.desktop.provider');
    await expect(recovery).toContainText('active-source');
  });
});
