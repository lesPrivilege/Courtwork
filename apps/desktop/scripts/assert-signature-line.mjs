import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve('src/styles.css'), 'utf8');
const app = readFileSync(resolve('src/App.tsx'), 'utf8');
const expected = new Map([
  ['danger', '--red-graphic'],
  ['attention', '--amber-graphic'],
  ['revision', '--blue-graphic'],
  ['authority', '--green-graphic'],
  ['neutral', '--slate-graphic'],
]);
const violations = [];
const declared = [...css.matchAll(/\.line-([a-z]+)\s*\{/g)]
  .map((match) => match[1])
  .filter((name) => name !== 'icon');

if (declared.length !== expected.size || declared.some((name) => !expected.has(name))) {
  violations.push(`法理之线 selector 不是五色封闭集：${declared.join(', ')}`);
}

for (const [tone, token] of expected) {
  const rule = css.match(new RegExp(`\\.line-${tone}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  if (!rule.includes(`color: var(${token})`) || !rule.includes(`background: var(${token})`)) {
    violations.push(`line.${tone} 未同时消费 ${token}`);
  }
}

if (app.includes('<SignatureLine') || app.includes('SignatureLine,')) {
  violations.push('中栏 App 通用层仍在消费 SignatureLine');
}
const iconRule = css.match(/\.line-icon\s*\{([^}]*)\}/)?.[1] ?? '';
if (!iconRule.includes('color: var(--slate-graphic)')) violations.push('图标未锁定品牌中性色');

if (violations.length) throw new Error(`法理之线使用域审计失败：\n${violations.join('\n')}`);
globalThis.process.stdout.write('法理之线审计通过：右栏白名单 + 五色封闭集 + icon 品牌单色\n');
