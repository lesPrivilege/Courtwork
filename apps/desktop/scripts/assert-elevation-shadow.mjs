import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const srcRoot = path.resolve(import.meta.dirname, '..', 'src');
const styles = await readFile(path.join(srcRoot, 'styles.css'), 'utf8');
const tokens = JSON.parse(await readFile(path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'design', 'tokens.json'), 'utf8'));
// B1 色阶批：ink 由 #0A2540 迁为 #232B38(rgb 35,43,56)，阴影随 ink 重算。
// 单点供给与「CSS == token == 本字面量」三重锁不变，只换值。
const approvedShadow = '0 1px 2px rgba(35,43,56,0.045), 0 4px 12px rgba(35,43,56,0.035)';

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? sourceFiles(path.join(dir, entry.name))
    : [path.join(dir, entry.name)]))).flat().filter((file) => /\.(ts|tsx)$/.test(file));
}

const failures = [];
const cssShadow = styles.match(/--elevation-shadow:\s*([^;]+);/)?.[1]?.trim();
const tokenShadow = tokens.elevation?.shadow?.value;
if (cssShadow !== tokenShadow || tokenShadow !== approvedShadow) {
  failures.push(`elevation token drift: css=${cssShadow ?? '(missing)'} token=${tokenShadow ?? '(missing)'}`);
}
for (const file of await sourceFiles(srcRoot)) {
  const source = await readFile(file, 'utf8');
  if (/boxShadow\s*:|box-shadow/.test(source)) failures.push(`${file}: component contains shadow literal`);
}

const declarations = [...styles.matchAll(/box-shadow\s*:\s*([^;]+);/g)].map((match) => match[1].trim());
for (const value of declarations) {
  if (value !== 'none' && value !== 'none !important' && value !== 'var(--elevation-shadow)') {
    failures.push(`styles.css: shadow bypasses --elevation-shadow: ${value}`);
  }
}

const tokenConsumers = [...styles.matchAll(/([^{}]+)\{[^{}]*box-shadow\s*:\s*var\(--elevation-shadow\);[^{}]*\}/g)]
  .map((match) => match[1].trim().replace(/\s+/g, ' '));
// RP-2.11 ⑨：拍板受控扩项——composer 附件 chip 入白名单（藏青双层极轻值）。
// RP-2.12：四模块白卡（rail-module）为右列 L1 浮面,入影白名单（有影必描边同律）。
// 批次七首例（2026-07-12）：会话流新消息浮标为悬浮控件,浮=影语义正当消费（有影必描边同律,border-strong）。
const expectedConsumer = '.case-rail.surface-float, .surface-card-raised, .rail-module, .scroll-latest-button, .attachment-chip';
if (tokenConsumers.length !== 1 || tokenConsumers[0] !== expectedConsumer) {
  failures.push(`styles.css: elevation consumer whitelist drifted: ${tokenConsumers.join(' | ') || '(none)'}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Elevation shadow boundary: OK');
