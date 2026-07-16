import { defineConfig } from '@playwright/test';

const port = Number(process.env.COURTWORK_E2E_PORT ?? 1420);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  // UI-RESIDUE-1（批一）：像素闭合门只在 residue project 内跑，确定性启动参数不外溢既有用例。
  // 既有全部用例归 app project（testIgnore 排除 residue 谱），行为与单 project 时一致。
  projects: [
    {
      name: 'app',
      testIgnore: /ui-residue\.spec\.ts/,
    },
    {
      name: 'residue',
      testMatch: /ui-residue\.spec\.ts/,
      use: {
        // 抖动抑制（调研 §1）：CSS 像素比例 1、sRGB 色域、关 LCD 次像素、关字体 hinting。
        deviceScaleFactor: 1,
        launchOptions: {
          args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'],
        },
      },
    },
  ],
  webServer: {
    command: `VITE_COURTWORK_E2E=1 pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
