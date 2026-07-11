import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const srcRoot = path.resolve(import.meta.dirname, '..', 'src');
const styles = await readFile(path.join(srcRoot, 'styles.css'), 'utf8');
const tokens = JSON.parse(await readFile(path.resolve(import.meta.dirname, '..', '..', '..', 'docs', '32-设计语言包', 'tokens.json'), 'utf8'));
const approvedShadow = '0 1px 2px rgba(10,37,64,0.045), 0 4px 12px rgba(10,37,64,0.035)';

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
const expectedConsumer = '.case-rail.surface-float, .right-rail-collapsed.surface-float, .surface-card-raised';
if (tokenConsumers.length !== 1 || tokenConsumers[0] !== expectedConsumer) {
  failures.push(`styles.css: elevation consumer whitelist drifted: ${tokenConsumers.join(' | ') || '(none)'}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Elevation shadow boundary: OK');
