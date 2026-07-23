import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

type ForcedReadinessWindow = typeof window & {
  __CW_FORCE_CREDENTIAL__: {
    credential: { phase: string };
    connection: { phase: string; failKind?: string; failureMessage?: string };
  };
};

const MODEL_CONFIG_KEY = 'courtwork.model-config.v1';
const MODEL_CONFIG_RESET_NOTICE = '模型配置已重置为默认';
const MODEL_CONFIG_SAVE_NOTICE = '模型配置未能保存；本次会话仍使用当前选择，重新打开应用后可能恢复为先前配置';

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
    await expect(page.getByTestId('settings-model-config-notice')).toHaveCount(0);
    await page.getByTestId('settings-close').click();
    await expect(page.getByTestId('settings-page')).toHaveCount(0);

    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: 'Settings', exact: true }).click();
    await expect(page.getByTestId('settings-page')).toBeVisible();
  });

  test('model config 真实读取回落：超过旧 3.2 秒后 Settings → Model 仍持续显示 reset notice', async ({ page }) => {
    await page.addInitScript((key) => {
      const nativeGetItem = Storage.prototype.getItem;
      Object.defineProperty(Storage.prototype, 'getItem', {
        configurable: true,
        writable: true,
        value(this: Storage, candidate: string) {
          if (this === window.localStorage && candidate === key) {
            throw new DOMException('model config read blocked', 'SecurityError');
          }
          return nativeGetItem.call(this, candidate);
        },
      });
    }, MODEL_CONFIG_KEY);

    await openWorkbench(page);
    await expect(page.getByTestId('system-open-feedback').filter({ hasText: MODEL_CONFIG_RESET_NOTICE })).toHaveCount(0);
    await page.waitForTimeout(3400);
    await openSettings(page);
    const notice = page.getByTestId('settings-section-model').getByTestId('settings-model-config-notice');
    await expect(notice).toHaveAttribute('role', 'status');
    await expect(notice).toHaveText(MODEL_CONFIG_RESET_NOTICE);

    await page.getByTestId('settings-nav-appearance').click();
    await page.getByTestId('settings-nav-model').click();
    await expect(notice).toHaveText(MODEL_CONFIG_RESET_NOTICE);
    await page.getByTestId('settings-close').click();
    await openSettings(page);
    await expect(notice).toHaveText(MODEL_CONFIG_RESET_NOTICE);
  });

  test('model config 真实写入回落：当前会话持续告知，reload 后旧 Deep 恢复且不伪造 notice', async ({ page }) => {
    await page.addInitScript(({ key, deep }) => {
      const nativeGetItem = Storage.prototype.getItem;
      const nativeSetItem = Storage.prototype.setItem;
      if (nativeGetItem.call(window.localStorage, key) === null) {
        nativeSetItem.call(window.localStorage, key, JSON.stringify(deep));
      }
      Object.defineProperty(Storage.prototype, 'setItem', {
        configurable: true,
        writable: true,
        value(this: Storage, candidate: string, value: string) {
          if (this === window.localStorage && candidate === key) {
            throw new DOMException('model config quota', 'QuotaExceededError');
          }
          return nativeSetItem.call(this, candidate, value);
        },
      });
    }, {
      key: MODEL_CONFIG_KEY,
      deep: { providerId: 'deepseek', modelId: 'deepseek-v4-flash', reasoning: 'deep' },
    });

    await openWorkbench(page);
    await openSettings(page);
    await expect(page.getByRole('radio', { name: 'Deep', exact: true })).toBeChecked();
    await page.getByRole('radio', { name: 'Standard', exact: true }).check();
    await expect(page.getByTestId('settings-model-summary')).toHaveText('Current: Standard');
    const notice = page.getByTestId('settings-section-model').getByTestId('settings-model-config-notice');
    await expect(notice).toHaveAttribute('role', 'status');
    await expect(notice).toHaveText(MODEL_CONFIG_SAVE_NOTICE);
    await page.waitForTimeout(3400);
    await expect(notice).toHaveText(MODEL_CONFIG_SAVE_NOTICE);

    await page.getByTestId('settings-nav-appearance').click();
    await page.getByTestId('settings-nav-model').click();
    await expect(notice).toHaveText(MODEL_CONFIG_SAVE_NOTICE);
    expect(await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!).reasoning, MODEL_CONFIG_KEY)).toBe('deep');

    await page.reload();
    await expect(page.getByTestId('workbench')).toBeVisible();
    await openSettings(page);
    await expect(page.getByRole('radio', { name: 'Deep', exact: true })).toBeChecked();
    await expect(page.getByTestId('settings-model-summary')).toHaveText('Current: Deep');
    await expect(page.getByTestId('settings-model-config-notice')).toHaveCount(0);
  });

  test('themeMode 同键持久化：system 随 OS，显式宗不随，根只暴露解析后的 data-theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openWorkbench(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-mode');

    await openSettings(page);
    await page.getByTestId('settings-nav-appearance').click();
    const mode = page.getByTestId('settings-theme-mode');
    await expect(mode).toHaveValue('system');
    await mode.selectOption('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('courtwork.settings')));
    expect(keys).toEqual(['courtwork.settings.v1']);
    await openSettings(page);
    await page.getByTestId('settings-nav-appearance').click();
    await page.getByTestId('settings-theme-mode').selectOption('system');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.evaluate(() => localStorage.setItem('courtwork.settings.v1', JSON.stringify({ appearance: { themeMode: 'sepia' } })));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('分组切换 0ms 且真实路由组行为可用', async ({ page }) => {
    await openWorkbench(page);
    await openSettings(page);

    // 收敛令②：模型区用户面只余两档,UI 不暴露模型名;provider/model 撤入 developer 层（字段在,面板隐）
    await expect(page.getByTestId('settings-credential-phase')).toBeVisible();
    const standardReasoning = page.getByRole('radio', { name: 'Standard' });
    const deepReasoning = page.getByRole('radio', { name: 'Deep' });
    await expect(standardReasoning).toHaveCSS('width', '14px');
    await expect(standardReasoning).toHaveCSS('height', '14px');
    await expect(standardReasoning.locator('..')).toHaveCSS('display', 'inline-flex');
    await deepReasoning.check();
    await expect(page.getByTestId('settings-model-summary')).toContainText('Deep');
    // 默认面不泄露模型名（能力全量、暴露最小）
    await expect(page.getByTestId('settings-model')).toBeHidden();
    // developer 层只保留受控 DeepSeek 模型；provider/base URL 不进入产品配置。
    await page.getByTestId('settings-developer').locator('summary').click();
    await expect(page.getByTestId('settings-developer')).toContainText('DeepSeek');
    await expect(page.getByTestId('settings-provider')).toHaveCount(0);
    await expect(page.getByTestId('settings-base-url')).toHaveCount(0);
    await page.getByTestId('settings-model').fill('deepseek-v4-pro');
    await expect(page.getByTestId('settings-model')).toHaveValue('deepseek-v4-pro');
    await page.getByTestId('settings-maxusd').fill('8');
    await page.getByTestId('settings-maxusd-save').click();
    await expect(page.getByTestId('system-open-feedback')).toContainText('8');

    // Output & files：文件夹授权统一归宿主原生 picker（HostAccessPanel）；
    // CASE-ROOT-1 退役 webkitdirectory「默认产出文件夹」行，其 input 不得复活。
    await page.getByTestId('settings-nav-output').click();
    await expect(page.getByTestId('settings-section-output')).toBeVisible();
    await expect(page.getByTestId('host-access-authorize')).toBeVisible();
    await expect(page.getByTestId('settings-output-folder-input')).toHaveCount(0);
    await expect(page.getByTestId('settings-pick-output-dir')).toHaveCount(0);

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
    await expect(page.getByTestId('settings-version')).toHaveText(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version);
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

  test('管理凭证内嵌设置页展开（#43：不再叠开根层浮层）', async ({ page }) => {
    await openWorkbench(page);
    await openSettings(page);
    await page.getByTestId('settings-open-credentials').click();
    await expect(page.getByTestId('settings-credential-embed')).toBeVisible();
    // 根层引导卡不被拉起；settings 全程在场（#44 宿主稳定契约）
    await expect(page.getByTestId('provider-setup')).toHaveCount(0);
    await expect(page.getByTestId('settings-page')).toBeVisible();
  });

  test('连接失败态展示分型文案与钥匙串恢复指引', async ({ page }) => {
    await page.addInitScript(() => {
      (window as ForcedReadinessWindow).__CW_FORCE_CREDENTIAL__ = { credential: { phase: 'absent' }, connection: { phase: 'failed', failKind: 'platform', failureMessage: '无法解锁电脑的安全凭证库，请确认钥匙串密码后重试' } };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();

    await openSettings(page);
    await expect(page.getByTestId('settings-credential-phase')).toHaveAttribute('data-phase', 'failed');
    await expect(page.getByTestId('settings-credential-phase')).toHaveAttribute('data-fail-kind', 'platform');
    const recovery = page.getByTestId('settings-credential-recovery');
    await expect(recovery).toBeVisible();
    await expect(page.getByTestId('settings-credential-fail-message')).toContainText('钥匙串密码');
    await expect(recovery).toContainText('钥匙串访问');
    await expect(recovery).toContainText('cn.courtwork.desktop.provider');
    await expect(recovery).toContainText('active-source');
  });
});
