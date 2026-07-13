import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = ['site/index.html', 'site/styles.css', 'site/main.js', 'site/og.html'];
const sources = Object.fromEntries(files.map((file) => [file, readFileSync(resolve(file), 'utf8')]));
const icon = readFileSync(resolve('site/assets/icon.svg'), 'utf8');
const failures = [];
const bannedCopy = ['赋能', '打造', '一站式', 'streamline', 'empower', 'supercharge', 'scroll to explore'];
const bannedVisual = ['linear-gradient', 'radial-gradient', 'conic-gradient', 'gradient-text', 'aurora', 'mesh-gradient', 'drop-shadow'];
const tailwindHex = ['#0f172a', '#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb'];

for (const [file, source] of Object.entries(sources)) {
  const lower = source.toLowerCase();
  for (const word of [...bannedCopy, ...bannedVisual, ...tailwindHex]) {
    if (lower.includes(word.toLowerCase())) failures.push(`${file}: banned tell ${word}`);
  }
  if (/\b(bg|text|border|from|via|to)-gray-\d{2,3}\b/.test(source)) failures.push(`${file}: Tailwind gray utility`);
  if (/#[0-9a-fA-F]{6}/.test(source) && !['site/styles.css', 'site/og.html'].includes(file)) failures.push(`${file}: raw hex outside token source`);
  if (/\b(?:TBD|TODO|BUILD_PENDING|待发布回填|发布前替换|v0\.1\.x)\b/.test(source)) failures.push(`${file}: unresolved release placeholder`);
  if (/archive\//i.test(source)) failures.push(`${file}: active site references archive`);
}

const html = sources['site/index.html'];
const css = sources['site/styles.css'];
for (const line of css.split('\n')) {
  if (/#[0-9a-fA-F]{6}/.test(line) && !/^\s*--[a-z-]+:\s*#[0-9a-fA-F]{6};\s*$/.test(line)) failures.push(`site/styles.css: raw hex outside :root token: ${line.trim()}`);
  const achromatic = line.match(/#([0-9a-fA-F]{2})\1\1\b/);
  if (achromatic && achromatic[0].toUpperCase() !== '#FFFFFF') failures.push(`site/styles.css: achromatic gray ${achromatic[0]}`);
  if (/box-shadow\s*:/i.test(line) && !/box-shadow\s*:\s*none\b/i.test(line)) failures.push(`site/styles.css: unauthorized shadow consumption: ${line.trim()}`);
}

const stageOrder = ['original', 'quote', 'conclusion', 'confirmation'];
let cursor = -1;
for (const stage of stageOrder) {
  const next = html.indexOf(`data-stage="${stage}"`);
  if (next <= cursor) failures.push(`site/index.html: evidence stage missing or out of order: ${stage}`);
  cursor = next;
}
if ((html.match(/class="mac-window/g) ?? []).length !== 1) failures.push('site/index.html: exactly one complete workbench window is allowed');
if (/scene-mark|>\s*0[1-9]\s*</i.test(html)) failures.push('site/index.html: placeholder section scaffolding is not allowed');
if (/trust-list|feature-card|card-grid/i.test(`${html}\n${css}`)) failures.push('site: card-grid trust/feature scaffolding is not allowed');
if (!/<a class="wordmark"[^>]*><img[^>]*><span>Courtwork<\/span><\/a>/.test(html)) failures.push('site/index.html: core mark must sit immediately left of Courtwork');
if (!html.includes('下载 macOS 版') || html.includes('Download for macOS')) failures.push('site/index.html: macOS CTA must use the product language');
if (!html.includes('原件') || !html.includes('引语') || !html.includes('人工确认')) failures.push('site/index.html: Evidence Line semantics are incomplete');
if (!/viewBox="0 0 24 24"/.test(icon) || /<(?:rect|circle|ellipse|polygon)\b/.test(icon)) failures.push('site/assets/icon.svg: wordmark mark must be core path geometry without a base');
if ((icon.match(/<path\b/g) ?? []).length !== 4) failures.push('site/assets/icon.svg: core brand geometry must contain four paths');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`deslop: PASS (${files.length + 1} files, structure-aware exit 0)`);
