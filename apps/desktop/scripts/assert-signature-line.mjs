import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve('src/styles.css'), 'utf8');
const app = readFileSync(resolve('src/App.tsx'), 'utf8');
const panels = readFileSync(resolve('src/workbench/Panels.tsx'), 'utf8');
// 封闭集六色（2026-07-19 拍板由五扩六）。封闭是设计法，基数不是：封闭集保护的是
// 「每色有语义」，不是「恰好五个」；经拍板的语义扩容是封闭集的正常演化，无语义的加色
// 才是它要挡的。settled=朱为印记色非状态色——绿保持全部既有语义位（系统与权威的确认
// 「状态」），朱只出现在人工裁决留下印记之处。
const expected = new Map([
  ['danger', '--red-graphic'],
  ['attention', '--amber-graphic'],
  ['revision', '--blue-graphic'],
  ['authority', '--green-graphic'],
  ['neutral', '--slate-graphic'],
  ['settled', '--zhu-graphic'],
]);
const violations = [];
const declared = [...css.matchAll(/\.line-([a-z]+)\s*\{/g)]
  .map((match) => match[1])
  .filter((name) => name !== 'icon');

if (declared.length !== expected.size || declared.some((name) => !expected.has(name))) {
  violations.push(`法理之线 selector 不是六色封闭集：${declared.join(', ')}`);
}

for (const [tone, token] of expected) {
  const rule = css.match(new RegExp(`\\.line-${tone}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  if (!rule.includes(`color: var(${token})`) || !rule.includes(`background: var(${token})`)) {
    violations.push(`line.${tone} 未同时消费 ${token}`);
  }
}

// 朱色语义断言（2026-07-19 拍板条件②）：朱是印记色不是装饰——出现处必须绑定
// 「人工裁决留下印记」的数据态。B1 只落色未接消费面（接线要么夺绿的既有 authority 槽
// 违条件③，要么引入「该处置是否人工作出」的新数据信号违行为零触碰），消费面随 B4
// 落定章落地。故本条为前向守卫：当前零消费即真空成立，一旦有人接线就必须携带落定数据。
// （前向守卫惯例同 tests/e2e/overlay-residue.ts 的 inert/aria-hidden 检查。）
const settledUsers = [...panels.matchAll(/tone=\{([^}]*)'settled'([^}]*)\}/g)];
for (const [full, before, after] of settledUsers) {
  if (!/confirmed|disposition|settled[A-Z]|resolution/i.test(before + after)) {
    violations.push(`line.settled 未绑定落定处置数据态（朱不得作装饰）：${full.trim()}`);
  }
}
// B4 接线时补的盲区：上面只扫 JSX 里的**字面** tone={…'settled'…}，而 tone 值也可以由函数算出
// （`riskLineTone` 即是），那条路径原先完全绕过本守卫——守卫看不见的绑定等于没守。
// 故凡返回 'settled' 的函数，其函数体同样必须携落定处置数据。
for (const fn of panels.matchAll(/function\s+(\w+)\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)) {
  const [, name, body] = fn;
  if (!/return\s+'settled'/.test(body)) continue;
  if (!/confirmed|disposition|settled[A-Z]|resolution/i.test(body)) {
    violations.push(`line.settled 由 ${name}() 算出却未绑定落定处置数据态（朱不得作装饰）`);
  }
}

if (app.includes('<SignatureLine') || app.includes('SignatureLine,')) {
  violations.push('中栏 App 通用层仍在消费 SignatureLine');
}
const iconRule = css.match(/\.line-icon\s*\{([^}]*)\}/)?.[1] ?? '';
if (!iconRule.includes('color: var(--slate-graphic)')) violations.push('图标未锁定品牌中性色');

if (violations.length) throw new Error(`法理之线使用域审计失败：\n${violations.join('\n')}`);
globalThis.process.stdout.write('法理之线审计通过：右栏白名单 + 六色封闭集 + icon 品牌单色\n');
