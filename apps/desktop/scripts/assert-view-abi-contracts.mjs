import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
let checks = 0;
const assert = (condition, message) => {
  checks += 1;
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

const viewCountAt = app.indexOf('function viewCount(');
assert(viewCountAt > 0, 'viewCount helper moved; the named-view branch position locks need re-anchoring');

// GENERIC-PACK-1 承 PANEL-BLUEPRINT-1：具名工作面逐枚迁 `kind:'component'` 后，App 的顺位
// if 链不得留下第二条渲染路径。锁的形状对每一枚同族，故按 view 生成而不逐枚手抄；
// **闭集是本门自己的字面量清单**，不从被测的 `courtwork-host-renderers.ts` 反向派生——期望侧
// 由被判物派生正是「被测物不得给自己出考卷」。清单少一员即少一枚看守，故下方另有一条
// 反向锁：宿主注册表里凡具名 view（非 `artifact`）都必须在本清单内，新增 view 不入清单即红。
const MIGRATED_NAMED_VIEWS = ['matrix', 'timeline', 'graph'];
// 尚未迁移的具名工作面（GENERIC-PACK-1 逐枚清空；`draft` 是通用面，不属迁移债）。
// 本表是**债的清单**不是豁免清单：迁完即从此处移入 MIGRATED_NAMED_VIEWS，两表之外一律红。
const PENDING_NAMED_VIEWS = ['revision', 'draft'];
// 迁移完成的 view 在 App 里只剩 `viewCount` 那一处 demo 页签计数的硬编码
// （'47 件'/'14 · 15'/'10 × 7'/'4 处' 同族）。故用位置锁 + 数量锁：渲染链零判等，
// 且全文判等恰一处——新增第二处即红，掩不住回流。
for (const view of MIGRATED_NAMED_VIEWS) {
  assert(
    !new RegExp(`view\\s*===\\s*['"]${view}['"]`).test(app.slice(0, viewCountAt)),
    `App render chain still branches on the ${view} workbench view`,
  );
  assert(
    (app.match(new RegExp(`view\\s*===\\s*['"]${view}['"]`, 'g')) ?? []).length === 1,
    `App gained a second ${view} view branch beyond the registered demo tab-count residue`,
  );
  assert(
    !new RegExp(`kind:\\s*['"]route['"][^}]*view:\\s*['"]${view}['"]`).test(hostRenderers),
    `${view} workbench view fell back to a route blueprint (component chain retired)`,
  );
}
// 反向锁：宿主注册表里出现清单外的具名 view，说明有一枚工作面没有任何迁移锁看守。
const registeredNamedViews = [...hostRenderers.matchAll(/view:\s*['"]([a-z-]+)['"]/g)]
  .map((match) => match[1])
  .filter((view) => view !== 'artifact');
for (const view of new Set(registeredNamedViews)) {
  assert(
    MIGRATED_NAMED_VIEWS.includes(view) || PENDING_NAMED_VIEWS.includes(view),
    `host renderer registry declares named view '${view}' that no VIEW-ABI migration lock guards`,
  );
}
// 直连回流锁：迁完的面，其呈现件不得再被 App 直接渲染。
assert(!/\bMatrixPanel\b/.test(app), 'App still renders MatrixPanel outside the host blueprint chain');
assert(!/\bTimelinePanel\b/.test(app), 'App still renders TimelinePanel outside the host blueprint chain');
assert(!/\bGraphPanel\b/.test(app), 'App still renders GraphPanel outside the host blueprint chain');

if (failures.length > 0) {
  console.error(`VIEW-ABI contracts failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`VIEW-ABI contracts passed (${checks} checks)`);
