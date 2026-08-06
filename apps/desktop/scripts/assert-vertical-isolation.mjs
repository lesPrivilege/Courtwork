// 零泄漏静态门（GENERIC-PACK-1 ①；ADR-015 决定三「静态门——垂类 import 只经受信组合根注册点，
// 通用件与壳零垂类引用」）。
//
// **立门以族，不点名单例**：本门不维护「哪几个文件可以 import 垂类」的白名单——那种表每加一行
// 就多一个藏身处（承 PI-HOST-LOOP 1R4 的终局判据）。它只认**目录族**：
//
//   受检面 ＝ `src/**` 全树，减去下方三个**绑定族**目录；
//   绑定族 ＝ 由目录本身声明其性质，成员随时增减而门不改一行。
//
// 三个绑定族与其正当性：
//   1. `src/verticals/**`  垂类绑定面。可执行绑定的合法住所（ADR-001「受信组合根、垂类 runtime、
//      desktop host 边界」）。它进入通用渲染链的**唯一注册点**是
//      `src/preview/courtwork-host-renderers.ts`——注册点自身在受检面内，故它只能引用组件符号，
//      不能引用垂类包。
//   2. `src/composition/**` 受信组合根。包准入与驱动装配住此（ADR-015 决定三）。
//   3. `src/demo/**`       样板案回放族。demo 与真实路径双向隔离由既有 demo 门另行看守。
//
// **未拆分的混合族（如实登记，非豁免）**：`work/`、`output/`、`system/`、`workbench/` 四个目录
// 各自混着通用件与 Legal 绑定件，本票未及拆分，故整族暂不入受检面。它们是**债**不是许可——
// 偿还去向是把其中的垂类绑定件迁入 `src/verticals/legal/`，迁完即从下表删除、目录自动入受检面。
// 本表逐条带偿还去向；空表即债清零。
//
// 测试文件同样受检（fixture 测试若要垂类语料，应住绑定族内）——唯一的例外是
// `preview/gallery/**` 的 fixture 谱：可视化样板库以真实垂类 fixture 证明原语可编排，
// 这是 ADR-012 决定五点名的用途，随族登记而非随文件豁免。

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** 绑定族：可执行垂类绑定的合法住所。族由目录声明，成员随时增减而本门不改一行。 */
const BINDING_FAMILIES = ['verticals', 'composition', 'demo'];
/** 未拆分的混合族（债）。逐条带偿还去向；迁完即删行，目录自动入受检面。 */
const UNSPLIT_FAMILIES = {
  work: '把 legal-s3-binding / work-command / contract-review-flow / primary-contract / use-contract-review-submission / legal-work-surface 迁入 verticals/legal/',
  output: '把 compile-review-output / contract-review-delivery 迁入 verticals/legal/',
  system: '把 FileOpsPlanPanel / file-ops-demo 迁入 verticals/legal/',
  workbench: '把 Panels.tsx 的 Legal 面（Timeline/Matrix/Revision/S3Launcher）与 GraphPanel 迁入 verticals/legal/，通用原语留在 workbench/',
};
/** 族级登记的可视化样板库：ADR-012 决定五点名以真实垂类 fixture 证明原语可编排。 */
const GALLERY_FAMILY = path.join('preview', 'gallery');

const VERTICAL_IMPORT = /from\s+['"]@courtwork\/(legal|pm)(\/[^'"]*)?['"]|import\s*\(\s*['"]@courtwork\/(legal|pm)(\/[^'"]*)?['"]/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(name)) yield full;
  }
}

const failures = [];
let scanned = 0;
let exempt = 0;

for (const file of walk(src)) {
  const relative = path.relative(src, file);
  const family = relative.split(path.sep)[0];
  if (BINDING_FAMILIES.includes(family)) { exempt += 1; continue; }
  if (family in UNSPLIT_FAMILIES) { exempt += 1; continue; }
  if (relative.startsWith(GALLERY_FAMILY + path.sep)) { exempt += 1; continue; }
  scanned += 1;
  const source = readFileSync(file, 'utf8');
  if (VERTICAL_IMPORT.test(source)) {
    failures.push(`${relative}: 壳/通用件引用了垂类包（垂类绑定只许住 ${BINDING_FAMILIES.join(' / ')} 三族）`);
  }
}

// 反向锁：绑定族里必须真有垂类绑定，否则「族」是空壳，受检面看似很大实则一切都在族外。
const verticalsDir = path.join(src, 'verticals');
let verticalBindings = 0;
for (const file of walk(verticalsDir)) {
  if (VERTICAL_IMPORT.test(readFileSync(file, 'utf8'))) verticalBindings += 1;
}
if (verticalBindings === 0) {
  failures.push('src/verticals/ 内零垂类绑定——绑定族是空壳，本门的受检面失去意义');
}

// 注册点锁：垂类 renderer 进入通用渲染链的唯一入口在受检面内，故它只能引用组件符号。
// 这条与上面的族规则同向：族给了绑定住所，注册点保证「只经受信组合根注册点」。
const registry = readFileSync(path.join(src, 'preview', 'courtwork-host-renderers.ts'), 'utf8');
if (!/from '\.\.\/verticals\/legal\//.test(registry)) {
  failures.push('宿主注册表不再从 verticals/legal 取 renderer——注册点被绕开');
}

if (failures.length > 0) {
  console.error(`零泄漏静态门失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const debt = Object.keys(UNSPLIT_FAMILIES);
console.log(
  `零泄漏静态门通过：受检 ${scanned} 份源码零垂类 import；绑定族 ${BINDING_FAMILIES.join('/')} 共 ${exempt} 份在族外，`
  + `其中 verticals/ 内实有 ${verticalBindings} 处垂类绑定。`
  + (debt.length ? `\n未拆分混合族（债，${debt.length} 个）：${debt.join('、')}——偿还去向见本门表。` : '\n未拆分混合族：无（债清零）。'),
);
