/* global HTMLElement, document, getComputedStyle, innerHeight, innerWidth, localStorage, navigator, performance, requestAnimationFrame, window */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const desktopRequire = createRequire(new URL('../../../../../apps/desktop/package.json', import.meta.url));
const { chromium } = desktopRequire('@playwright/test');

const baseURL = process.env.COURTWORK_P2_URL;
const sarasaDir = process.env.P2_SARASA_DIR;
if (!baseURL || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL)) {
  throw new Error('COURTWORK_P2_URL must be an explicit loopback origin with a dedicated port');
}
if (!sarasaDir) throw new Error('P2_SARASA_DIR must point at the locally verified Sarasa subsets');

const root = resolve('site/craft-evidence/SKIN-R2-P2/blind-typography');
const frameRoot = resolve(root, 'frames');
const metricRoot = resolve(root, 'metrics');
mkdirSync(frameRoot, { recursive: true });
mkdirSync(metricRoot, { recursive: true });

const source = {
  ui400: resolve(sarasaDir, 'SarasaUiSC-Regular-blind.woff2'),
  ui600: resolve(sarasaDir, 'SarasaUiSC-SemiBold-blind.woff2'),
  mono400: resolve(sarasaDir, 'SarasaMonoSC-Regular-blind.woff2'),
};
const bytes = Object.fromEntries(Object.entries(source).map(([key, path]) => [key, readFileSync(path)]));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const dataURL = (value) => `data:font/woff2;base64,${value.toString('base64')}`;
const candidateCSS = `
@font-face { font-family: 'P2 Sarasa UI SC'; src: url('${dataURL(bytes.ui400)}') format('woff2'); font-style: normal; font-weight: 400; font-display: block; }
@font-face { font-family: 'P2 Sarasa UI SC'; src: url('${dataURL(bytes.ui600)}') format('woff2'); font-style: normal; font-weight: 510 700; font-display: block; }
@font-face { font-family: 'P2 Sarasa Mono SC'; src: url('${dataURL(bytes.mono400)}') format('woff2'); font-style: normal; font-weight: 400 700; font-display: block; }
:root {
  --font-ui: 'P2 Sarasa UI SC', sans-serif !important;
  --mono: 'P2 Sarasa Mono SC', monospace !important;
  --type-dense-mono: var(--mono) !important;
}
`;

// Blind labels contain no semantic hint. The reveal lives outside score-sheet.md.
const samples = [
  { label: 'sample-17', variant: 'C' },
  { label: 'sample-42', variant: 'D' },
];

async function enterSample(page) {
  await page.goto(baseURL);
  const welcome = page.getByTestId('welcome-demo-start');
  await welcome.waitFor();
  await welcome.click();
  const onboarding = page.getByTestId('provider-setup');
  if (await onboarding.isVisible()) await page.getByTestId('provider-skip').click();
  await page.getByTestId('preview-host').waitFor();
  await page.mouse.move(0, 0);
}

async function openSettings(page) {
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings' }).click();
  await page.getByTestId('settings-page').waitFor();
}

async function createEmptyCase(page) {
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await dialog.getByRole('textbox', { name: '案件名称' }).fill('案件乙·长名称用于十二至十三像素截断审计');
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await page.getByTestId('conversation-empty').waitFor();
}

async function applyVariant(page, variant) {
  const started = performance.now();
  if (variant === 'D') await page.addStyleTag({ content: candidateCSS });
  const load = await page.evaluate(async ({ variant: active }) => {
    const before = performance.now();
    const probe = '合同审查 Risk 2026-07-19 ABC 12345';
    if (active === 'D') {
      await Promise.all([
        document.fonts.load('400 12px "P2 Sarasa UI SC"', probe),
        document.fonts.load('600 13px "P2 Sarasa UI SC"', probe),
        document.fonts.load('400 13px "P2 Sarasa Mono SC"', probe),
      ]);
    }
    await document.fonts.ready;
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
    return {
      fontReadyMs: +(performance.now() - before).toFixed(2),
      uiLoaded: active === 'C' || document.fonts.check('400 12px "P2 Sarasa UI SC"', probe),
      uiEmphasisLoaded: active === 'C' || document.fonts.check('600 13px "P2 Sarasa UI SC"', probe),
      monoLoaded: active === 'C' || document.fonts.check('400 13px "P2 Sarasa Mono SC"', probe),
    };
  }, { variant });
  return { ...load, wallMs: +(performance.now() - started).toFixed(2) };
}

async function setupState(page, state) {
  if (state.id.startsWith('welcome')) {
    await page.goto(baseURL);
    await page.getByTestId('welcome-state').waitFor();
    return;
  }
  await enterSample(page);
  if (state.id.startsWith('settings')) {
    await openSettings(page);
  } else if (state.id.startsWith('compare')) {
    await page.getByTestId('split-start').click();
    const columns = page.getByRole('button', { name: 'Side-by-side comparison' });
    if (await columns.isEnabled()) await columns.click();
    await page.getByTestId('split-grid').waitFor();
  } else if (state.id.startsWith('empty')) {
    await createEmptyCase(page);
  } else if (state.id.startsWith('document')) {
    await page.getByTestId('view-draft').click();
    await page.getByTestId('draft-panel').waitFor();
    await page.evaluate(() => {
      const editor = document.querySelector('[aria-label="文书起草画布"]');
      if (!(editor instanceof HTMLElement)) return;
      const paragraph = '甲方应于本协议签署之日起十个工作日内交付技术图纸、验收记录与付款凭证。The Supplier shall deliver the acceptance package before 2026-07-19，逾期责任依第12.3条处理。';
      editor.innerHTML = `<h2>答辩意见与履约事实核验</h2>${Array.from({ length: 12 }, (_, index) => `<p>第${index + 1}段\u3000${paragraph}</p>`).join('')}`;
    });
  }
}

async function collectMetrics(page, load) {
  return page.evaluate(({ load: fontLoad }) => {
    const style = getComputedStyle(document.documentElement);
    const family = {
      title: style.getPropertyValue('--font-title').trim(),
      document: style.getPropertyValue('--font-body').trim(),
      ui: style.getPropertyValue('--font-ui').trim(),
      mono: style.getPropertyValue('--mono').trim(),
    };
    const visible = [...document.querySelectorAll('button,input,select,textarea,[data-testid],p,li,td,th')]
      .filter((node) => node instanceof HTMLElement && node.getClientRects().length > 0);
    const slots = [12, 13, 14, 16].map((size) => {
      const nodes = visible.filter((node) => Math.abs(Number.parseFloat(getComputedStyle(node).fontSize) - size) < 0.1);
      const overflow = nodes.filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1);
      return {
        size,
        visibleCount: nodes.length,
        overflowCount: overflow.length,
        overflowExamples: overflow.slice(0, 12).map((node) => ({
          tag: node.tagName.toLowerCase(),
          testid: node.getAttribute('data-testid'),
          text: (node.textContent ?? '').trim().slice(0, 80),
          client: [node.clientWidth, node.clientHeight],
          scroll: [node.scrollWidth, node.scrollHeight],
        })),
      };
    });

    const canvas = document.createElement('canvas').getContext('2d');
    if (!canvas) throw new Error('2d canvas unavailable');
    const glyph = (font, text) => {
      canvas.font = font;
      const metric = canvas.measureText(text);
      return {
        width: +metric.width.toFixed(3),
        ascent: +metric.actualBoundingBoxAscent.toFixed(3),
        descent: +metric.actualBoundingBoxDescent.toFixed(3),
      };
    };
    const baselines = {
      ui12Cjk: glyph(`400 12px ${family.ui}`, '合同审查设置'),
      ui12Latin: glyph(`400 12px ${family.ui}`, 'Risk Review Settings'),
      ui13Mixed: glyph(`400 13px ${family.ui}`, '第12.3条 Risk 2026'),
      mono12Cjk: glyph(`400 12px ${family.mono}`, '风险编号'),
      mono12Latin: glyph(`400 12px ${family.mono}`, 'RISK-2026-019'),
      document16Mixed: glyph(`400 16px ${family.document}`, '第12.3条 Supplier 2026'),
      title20Mixed: glyph(`600 20px ${family.title}`, '合同审查 Courtwork'),
    };

    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;font-size:13px;line-height:1.5;font-family:var(--font-ui);white-space:normal';
    probe.textContent = '案件乙·长名称用于十二至十三像素控件换行与截断审计 Risk Review 2026-07-19';
    document.body.append(probe);
    const wrap = {
      width: probe.clientWidth,
      height: probe.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(getComputedStyle(probe).lineHeight),
      lineCount: +(probe.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(probe).lineHeight)).toFixed(2),
    };
    probe.remove();

    const contrastPairs = ['--text-primary', '--text-secondary', '--text-tertiary', '--text-disabled'].map((name) => ({
      foreground: name,
      value: style.getPropertyValue(name).trim(),
      backgrounds: ['--bg-app', '--bg-surface', '--bg-raised'].map((background) => ({ background, value: style.getPropertyValue(background).trim() })),
    }));

    return {
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      viewport: [innerWidth, innerHeight],
      fontLoad,
      family,
      slots,
      baselines,
      wrap,
      contrastPairs,
      titleDocumentControl: {
        title: style.getPropertyValue('--font-title').trim(),
        document: style.getPropertyValue('--font-body').trim(),
        documentSize: style.getPropertyValue('--type-document-size').trim(),
        documentLineHeight: style.getPropertyValue('--type-document-line-height').trim(),
      },
    };
  }, { load });
}

async function collectStateAudit(page) {
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll('button,input,select,textarea,[data-testid],p,li,td,th')]
      .filter((node) => node instanceof HTMLElement && node.getClientRects().length > 0);
    const sizeAudit = [12, 13, 14, 16].map((size) => {
      const nodes = visible.filter((node) => Math.abs(Number.parseFloat(getComputedStyle(node).fontSize) - size) < 0.1);
      return {
        size,
        count: nodes.length,
        overflow: nodes.filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).map((node) => ({
          testid: node.getAttribute('data-testid'),
          text: (node.textContent ?? '').trim().slice(0, 80),
          client: [node.clientWidth, node.clientHeight],
          scroll: [node.scrollWidth, node.scrollHeight],
        })),
      };
    });
    const landmarks = ['workspace', 'conversation-canvas', 'preview-host', 'revision-panel', 'settings-page', 'split-grid', 'conversation-empty', 'draft-panel']
      .map((testid) => {
        const node = document.querySelector(`[data-testid="${testid}"]`);
        if (!(node instanceof HTMLElement) || node.getClientRects().length === 0) return null;
        const box = node.getBoundingClientRect();
        return { testid, box: [box.x, box.y, box.width, box.height].map((value) => +value.toFixed(2)) };
      }).filter(Boolean);
    const text = document.body.innerText;
    return {
      sizeAudit,
      landmarks,
      visibleCodepoints: [...new Set([...text].map((char) => char.codePointAt(0)))].sort((a, b) => a - b),
    };
  });
}

const states = [
  { id: 'welcome-1180x720', viewport: { width: 1180, height: 720 } },
  { id: 'risklist-1280x720', viewport: { width: 1280, height: 720 } },
  { id: 'risklist-1440x900', viewport: { width: 1440, height: 900 }, metrics: true },
  { id: 'compare-1600x900', viewport: { width: 1600, height: 900 } },
  { id: 'risklist-2400x1000', viewport: { width: 2400, height: 1000 } },
  { id: 'settings-1440x900', viewport: { width: 1440, height: 900 } },
  { id: 'empty-1440x900', viewport: { width: 1440, height: 900 } },
  { id: 'document-1440x900', viewport: { width: 1440, height: 900 } },
];

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const manifest = { schemaVersion: 1, baseURL, generatedAt: new Date().toISOString(), source: {}, samples: {} };
for (const [key, value] of Object.entries(bytes)) manifest.source[key] = { bytes: value.length, sha256: sha256(value) };

for (const sample of samples) {
  const sampleDir = resolve(frameRoot, sample.label);
  mkdirSync(sampleDir, { recursive: true });
  manifest.samples[sample.label] = [];
  for (const state of states) {
    const context = await browser.newContext({
      viewport: state.viewport,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.clear());
    await setupState(page, state);
    const load = await applyVariant(page, sample.variant);
    await page.mouse.move(0, 0);
    const path = resolve(sampleDir, `${state.id}.png`);
    await page.screenshot({ path, animations: 'disabled' });
    const stateAudit = await collectStateAudit(page);
    const record = { state: state.id, viewport: state.viewport, sha256: sha256(readFileSync(path)), load, stateAudit };
    manifest.samples[sample.label].push(record);
    if (state.metrics) {
      const metrics = await collectMetrics(page, load);
      writeFileSync(resolve(metricRoot, `${sample.label}.json`), `${JSON.stringify(metrics, null, 2)}\n`);
    }
    await context.close();
  }
}
await browser.close();

writeFileSync(resolve(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(resolve(root, 'reveal.json'), `${JSON.stringify({
  schemaVersion: 1,
  method: 'fixed opaque labels chosen before capture; score-sheet contains no mapping',
  mapping: Object.fromEntries(samples.map(({ label, variant }) => [label, variant])),
  mappingCommitment: sha256(samples.map(({ label, variant }) => `${label}=${variant}`).join('|')),
}, null, 2)}\n`);
