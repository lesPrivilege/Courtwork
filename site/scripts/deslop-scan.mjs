import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = ['site/index.html', 'site/styles.css', 'site/main.js', 'site/og.html'];
const sources = files.map((file) => [file, readFileSync(resolve(file), 'utf8')]);
const failures = [];
const bannedCopy = ['赋能', '打造', '一站式', 'streamline', 'empower', 'supercharge', 'scroll to explore'];
const bannedVisual = ['linear-gradient', 'radial-gradient', 'conic-gradient', 'gradient-text', 'aurora', 'mesh-gradient', 'box-shadow: 0 '];
const tailwindHex = ['#0f172a', '#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb'];

for (const [file, source] of sources) {
  const lower = source.toLowerCase();
  for (const word of [...bannedCopy, ...bannedVisual, ...tailwindHex]) if (lower.includes(word.toLowerCase())) failures.push(`${file}: banned tell ${word}`);
  if (/\b(bg|text|border|from|via|to)-gray-\d{2,3}\b/.test(source)) failures.push(`${file}: Tailwind gray utility`);
  if (/#[0-9a-fA-F]{6}/.test(source) && !['site/styles.css', 'site/og.html'].includes(file)) failures.push(`${file}: raw hex outside token source`);
  if (/\b(?:TBD|TODO|BUILD_PENDING|待发布回填|发布前替换|v0\.1\.x)\b/.test(source)) failures.push(`${file}: unresolved release placeholder`);
}

const css = readFileSync(resolve('site/styles.css'), 'utf8');
for (const line of css.split('\n')) {
  if (/#[0-9a-fA-F]{6}/.test(line) && !/^\s*--[a-z-]+:\s*#[0-9a-fA-F]{6};\s*$/.test(line)) failures.push(`site/styles.css: raw hex outside :root token: ${line.trim()}`);
  const achromatic = line.match(/#([0-9a-fA-F]{2})\1\1\b/);
  if (achromatic && achromatic[0].toUpperCase() !== '#FFFFFF') failures.push(`site/styles.css: achromatic gray ${achromatic[0]}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`deslop: PASS (${files.length} files, deterministic exit 0)`);
