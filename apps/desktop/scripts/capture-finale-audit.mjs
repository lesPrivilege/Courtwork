import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const configuredURL = process.env.COURTWORK_AUDIT_URL;
if (!configuredURL) {
  throw new Error('COURTWORK_AUDIT_URL must name a dedicated local audit server');
}

const auditURL = new URL(configuredURL);
if (!['127.0.0.1', 'localhost'].includes(auditURL.hostname) || !auditURL.port) {
  throw new Error(`visual audit requires an explicit loopback port, received ${configuredURL}`);
}
if (auditURL.port === '1420') {
  throw new Error('visual audit must not reuse the shared Playwright port 1420');
}

const baseURL = auditURL.origin;
const port = Number(auditURL.port);
const outputDir = resolve('visual-audit');
const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const viewports = [1180, 1280, 1440, 1600].map((width) => ({ width, height: 900 }));
const reducedMotion = 'reduce';

mkdirSync(outputDir, { recursive: true });
for (const file of readdirSync(outputDir)) {
  if (file.endsWith('.png')) rmSync(resolve(outputDir, file));
}

const browser = await chromium.launch();
const captures = [];

async function enterSample(page) {
  await page.goto(baseURL);
  await page.getByTestId('welcome-state').waitFor();
  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-setup').waitFor();
  await page.getByTestId('provider-skip').click();
  await page.getByTestId('preview-host').waitFor();
  await page.getByTestId('turn-card-gate').waitFor();
}

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion,
  });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.clear());
  await enterSample(page);
  await page.getByTestId('view-graph').click();
  await page.getByTestId('graph-panel').waitFor();
  await page.locator('[data-testid="graph-panel"][data-layout-ready="true"]').waitFor();
  await page.locator('.courtwork-minimap').waitFor();
  await page.mouse.move(0, 0);

  const name = `polish-p0-graph-${viewport.width}.png`;
  const path = resolve(outputDir, name);
  await page.screenshot({ path, animations: 'disabled' });
  captures.push({
    name,
    viewport,
    deviceScaleFactor: 1,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  });
  await context.close();
}

await browser.close();

if (new Set(captures.map(({ sha256 }) => sha256)).size !== captures.length) {
  throw new Error('visual audit contains duplicate viewport frames');
}

const manifest = {
  schemaVersion: 1,
  actualHead,
  baseURL,
  port,
  reducedMotion,
  screenshotAnimations: 'disabled',
  generatedAt: new Date().toISOString(),
  captures,
};
writeFileSync(resolve(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(resolve(outputDir, 'README.md'), [
  '# POLISH-P0 visual audit',
  '',
  `- actual HEAD: \`${actualHead}\``,
  `- isolated preview: \`${baseURL}\` (port \`${port}\`)`,
  `- motion: \`prefers-reduced-motion: ${reducedMotion}\`; screenshot animations disabled`,
  '- viewports: `1180 / 1280 / 1440 / 1600 × 900 @1x`',
  '- old screenshots: retired and removed by this capture pipeline',
  '',
  ...captures.map(({ name, viewport, sha256 }) => `- \`${name}\` — \`${viewport.width}×${viewport.height}\` — \`${sha256}\``),
  '',
].join('\n'));
