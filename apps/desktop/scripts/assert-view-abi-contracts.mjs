import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const app = read('src/App.tsx');
const artifactTable = read('src/preview/ArtifactTableRenderer.tsx');
const moduleStack = read('src/modules/module-stack.ts');
const main = read('src/main.tsx');
const hostRenderers = read('src/preview/courtwork-host-renderers.ts');

assert(!/artifactType\s*===\s*['"]legal\./.test(app), 'App production route still switches on legal artifact type id');
assert(!app.includes('HOMED_ARTIFACT_TYPES'), 'App still depends on HOMED_ARTIFACT_TYPES');
assert(!app.includes('GenericStructurePanel'), 'App still renders raw GenericStructurePanel');
assert(!moduleStack.includes("'legal."), 'module auto-open still maps legal artifact type ids');
assert(!fs.existsSync(path.join(root, 'src/workbench/generic-structure.ts')), 'raw generic-structure fallback still exists');
assert(!fs.existsSync(path.join(root, 'src/workbench/GenericStructurePanel.tsx')), 'raw GenericStructurePanel still exists');
assert(!/JSON\.stringify\s*\(\s*payload\b/.test(artifactTable), 'artifact renderer serializes raw payload');
assert(!/Object\.(?:entries|keys|values)\s*\(\s*payload\b/.test(artifactTable), 'artifact renderer enumerates raw payload');
assert(!/Reflect\.ownKeys\s*\(\s*payload\b/.test(artifactTable), 'artifact renderer enumerates raw payload through Reflect');
assert(main.includes('createDesktopPackageRuntime'), 'composition root does not admit the package runtime');
assert(main.includes('packageRegistries={packageRuntime.packageRegistries}'), 'App does not receive admitted package registries');
assert(main.includes('hostRenderers={packageRuntime.hostRenderers}'), 'App does not receive host renderer registry');

// PANEL-BLUEPRINT-1 首枚：矩阵审阅迁 `kind:'component'` 全链后，App 的顺位 if 链不得留下第二条
// 渲染路径。四条锁分别对应 if 判等回流、判等扩散、组件直连回流与 blueprint 降回 route。
//
// **残留如实登记**：`viewCount` 里另有一处 `view === 'matrix'`，是 demo 页签计数的硬编码
// （'47 件'/'14 · 15'/'10 × 7'/'4 处' 四个同族之一），不在渲染链上，本票不动它——只改四者之一
// 会让同族口径分裂，改全部则触及其余三 panel。故此处不作全称否定，而用位置锁 + 数量锁：
// 渲染链零判等，且全文判等恰一处（新增第二处即红，掩不住回流）。
const viewCountAt = app.indexOf('function viewCount(');
assert(viewCountAt > 0, 'viewCount helper moved; the matrix branch position lock needs re-anchoring');
assert(
  !/view\s*===\s*['"]matrix['"]/.test(app.slice(0, viewCountAt)),
  'App render chain still branches on the matrix workbench view',
);
assert(
  (app.match(/view\s*===\s*['"]matrix['"]/g) ?? []).length === 1,
  'App gained a second matrix view branch beyond the registered demo tab-count residue',
);
assert(!/\bMatrixPanel\b/.test(app), 'App still renders MatrixPanel outside the host blueprint chain');
assert(
  !/kind:\s*['"]route['"][^}]*view:\s*['"]matrix['"]/.test(hostRenderers),
  'matrix workbench view fell back to a route blueprint (component chain retired)',
);

if (failures.length > 0) {
  console.error(`VIEW-ABI contracts failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('VIEW-ABI contracts passed (18/18)');
