import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  capabilityLedger,
  nodePrimitiveLedger,
  parseIsolationContract,
  productionDynamicSpawns,
  productionNodePrimitives,
  productionSpawnPrograms,
  validateCapabilityLedger,
  validateIsolationBinding,
  validateLevelEvidence,
  validateNodePrimitiveLedger,
} from './isolation-binding-lib.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const ADR_FIXTURE = `# ADR-018

> **当期隔离等级：\`none\`（显式停留，非疏漏）。**

## 决定一：隔离等级是闭集，且不得自我声明

| 等级 | 判据 | 本仓现状 |
|---|---|---|
| \`none\` | 同进程调用 | 全部工具 |
| \`process\` | 独立 OS 进程 | 设计定位 |
| \`os_confined\` | 进程 + 内核级约束 | 无 |
| \`container\` | 独立文件系统命名空间 | 无 |

## 决定五：无沙箱不阻塞能力，但必须收窄能力面

| 隔离等级 | 可授予的最高能力 |
|---|---|
| \`none\` | 只读、无副作用 |
| \`process\` | 加：无损级动作 |
| \`os_confined\` | 加：策略内的受限写入 |
| \`container\` | 不预授 |
`;

const SOURCES_FIXTURE = {
  'apps/desktop/src-tauri/src/lib.rs': 'fn probe() { std::process::Command::new("codesign").output(); }\n',
};

const LEDGER_FIXTURE = [{ capability: 'host-codesign-probe', program: 'codesign', requiredLevel: 'none', anchor: 'apps/desktop/src-tauri/src/lib.rs' }];

const run = (overrides = {}) =>
  validateIsolationBinding({
    adrText: ADR_FIXTURE,
    evidenceText: null,
    sources: SOURCES_FIXTURE,
    ledger: LEDGER_FIXTURE,
    dynamicLedger: [],
    ...overrides,
  }).failures;

test('绿证一：契约自洽 + 登记册与生产码对齐时零失败', () => {
  assert.deepEqual(run(), []);
});

test('绿证二：仓内真 ADR-018 + 真宿主源码 + 在册登记册全绿', () => {
  const adrText = fs.readFileSync(path.join(repositoryRoot, 'docs/decisions/ADR-018-execution-isolation-and-sandbox.md'), 'utf8');
  const hostDir = path.join(repositoryRoot, 'apps/desktop/src-tauri/src');
  const sources = Object.fromEntries(
    fs
      .readdirSync(hostDir)
      .filter((file) => file.endsWith('.rs'))
      .map((file) => [path.posix.join('apps/desktop/src-tauri/src', file), fs.readFileSync(path.join(hostDir, file), 'utf8')]),
  );
  const evidencePath = path.join(repositoryRoot, 'docs/engineering/sandbox-probe-1.md');
  const evidenceText = fs.existsSync(evidencePath) ? fs.readFileSync(evidencePath, 'utf8') : null;
  assert.deepEqual(validateIsolationBinding({ adrText, evidenceText, sources, ledger: capabilityLedger }).failures, []);
});

test('注入一：能力面超出当前隔离等级（票面点名的反例）定点触红', () => {
  const ledger = [{ capability: 'controlled-script-exec', program: 'sandbox-exec', requiredLevel: 'os_confined', anchor: 'x' }];
  const sources = { 'apps/desktop/src-tauri/src/exec.rs': 'std::process::Command::new("sandbox-exec")\n' };
  assert.match(run({ ledger, sources }).join('\n'), /能力面超出当前隔离等级：「controlled-script-exec」/);
});

test('注入二：生产码新增未登记的执行原语触红', () => {
  const sources = {
    ...SOURCES_FIXTURE,
    'apps/desktop/src-tauri/src/exec.rs': 'std::process::Command::new("sandbox-exec").arg("-f")\n',
  };
  assert.match(run({ sources }).join('\n'), /未登记的执行原语：spawn `sandbox-exec`/);
});

test('注入三：登记册与生产码脱节（反向锁）触红', () => {
  const ledger = [...LEDGER_FIXTURE, { capability: 'retired', program: 'osascript', requiredLevel: 'none', anchor: 'x' }];
  assert.match(run({ ledger }).join('\n'), /能力登记册与生产码脱节：「retired」/);
});

test('注入四：决定一闭集与决定五绑定表不对齐触红', () => {
  const adrText = ADR_FIXTURE.replace('| `os_confined` | 加：策略内的受限写入 |', '| `sandboxed` | 加：策略内的受限写入 |');
  assert.match(run({ adrText }).join('\n'), /不对齐——两表必须逐条同集同序/);
});

test('注入五：当期等级不在闭集内触红', () => {
  const adrText = ADR_FIXTURE.replace('当期隔离等级：`none`', '当期隔离等级：`vm`');
  assert.match(run({ adrText }).join('\n'), /不在决定一闭集/);
});

test('注入六：等级升档但无越界反例证据触红（无反例即无等级）', () => {
  const adrText = ADR_FIXTURE.replace('当期隔离等级：`none`', '当期隔离等级：`os_confined`');
  assert.match(run({ adrText }).join('\n'), /找不到越界反例证据文件——无反例即无等级/);
});

test('注入七：等级升档、证据在册但缺一类反例，缺哪类报哪类', () => {
  const adrText = ADR_FIXTURE.replace('当期隔离等级：`none`', '当期隔离等级：`os_confined`');
  const evidenceText = '读策略外路径：被拒\n写策略外路径：被拒\n';
  assert.match(run({ adrText, evidenceText }).join('\n'), /缺一类：「连策略外地址：被拒」/);
});

test('注入八：三类反例齐全时升档判据放行（证明注入六七不是恒红）', () => {
  const adrText = ADR_FIXTURE.replace('当期隔离等级：`none`', '当期隔离等级：`os_confined`');
  const evidenceText = '读策略外路径：被拒\n写策略外路径：被拒\n连策略外地址：被拒\n';
  assert.deepEqual(validateLevelEvidence(parseIsolationContract(adrText), evidenceText), []);
});

test('测试块内的 spawn 不计入能力面（截断有效，且不是把整份文件都吞掉）', () => {
  const scanned = productionSpawnPrograms({
    'x.rs': 'std::process::Command::new("codesign");\n#[cfg(test)]\nmod tests { use std::process::Command; Command::new("kill"); }\n',
  });
  assert.deepEqual([...scanned.keys()], ['codesign']);
});

test('登记册里的等级写成闭集外的值触红', () => {
  const ledger = [{ capability: 'x', program: 'codesign', requiredLevel: 'jail', anchor: 'x' }];
  assert.match(
    validateCapabilityLedger(ledger, parseIsolationContract(ADR_FIXTURE), SOURCES_FIXTURE).join('\n'),
    /声明的隔离等级 `jail` 不在 ADR-018 闭集内/,
  );
});

// ── pi lane 的 Node 侧扫描面（ADR-022 修订记录 2026-07-27 随 `PI-LANE-1` 扩入）──

const CONTRACT = parseIsolationContract(ADR_FIXTURE);
const scanNode = (sources, ledger = []) => validateNodePrimitiveLedger(ledger, CONTRACT, sources).join('\n');

test('pi lane 绿证一：只读 fs 导入不触红（realpath/readFile 不是写原语）', () => {
  const sources = {
    'packages/pi-lane/src/scoped-env.ts': "import { lstat, readdir, readFile, realpath } from 'node:fs/promises';\n",
  };
  assert.deepEqual(validateNodePrimitiveLedger([], CONTRACT, sources), []);
});

test('pi lane 绿证二：同名方法不误报——判据取模块来源而非标识符长相', () => {
  const sources = {
    'packages/pi-lane/src/scoped-env.ts': 'async exec() { return err(new ExecutionError("shell_unavailable")); }\nawait env.exec("echo hi");\n',
  };
  assert.deepEqual(validateNodePrimitiveLedger([], CONTRACT, sources), []);
});

test('pi lane 绿证三：仓内真源码 + 在册（空）登记册全绿——读面票内此类调用点应为零', () => {
  const sourceDir = path.join(repositoryRoot, 'packages/pi-lane/src');
  const sources = Object.fromEntries(
    fs
      .readdirSync(sourceDir)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => [path.posix.join('packages/pi-lane/src', file), fs.readFileSync(path.join(sourceDir, file), 'utf8')]),
  );
  assert.ok(Object.keys(sources).length > 0, 'pi lane 扫描面为空即判据空转，按红处理');
  assert.deepEqual(validateNodePrimitiveLedger(nodePrimitiveLedger, CONTRACT, sources), []);
});

test('pi lane 注入一：注入 child_process 具名导入必红（票面点名的红证）', () => {
  const sources = { 'packages/pi-lane/src/sidecar.ts': "import { spawn } from 'node:child_process';\nspawn('sh');\n" };
  assert.match(scanNode(sources), /未登记的 Node 侧执行\/写原语：`child_process`/);
});

test('pi lane 注入二：require 形式的 child_process 同样必红', () => {
  const sources = { 'packages/pi-lane/src/sidecar.ts': "const cp = require('child_process');\n" };
  assert.match(scanNode(sources), /`child_process`/);
});

test('pi lane 注入三：fs 写调用具名导入触红，并点名是哪一个写原语', () => {
  const sources = { 'packages/pi-lane/src/scoped-env.ts': "import { writeFile } from 'node:fs/promises';\n" };
  assert.match(scanNode(sources), /`fs:writeFile`/);
});

test('pi lane 注入四：命名空间导入 + 成员写调用触红（不靠具名导入才发现）', () => {
  const sources = { 'packages/pi-lane/src/x.ts': "import fs from 'node:fs';\nfs.writeFileSync(p, c);\n" };
  assert.match(scanNode(sources), /`fs:writeFileSync`/);
});

test('pi lane 注入五：登记册留着已不存在的原语触红（反向锁）', () => {
  const ledger = [{ capability: 'retired-sidecar', primitive: 'child_process', requiredLevel: 'none', anchor: 'x' }];
  assert.match(scanNode({ 'packages/pi-lane/src/x.ts': 'export const x = 1;\n' }, ledger), /脱节：「retired-sidecar」/);
});

test('pi lane 注入六：登记的能力越出当期等级触红', () => {
  const ledger = [{ capability: 'sidecar-spawn', primitive: 'child_process', requiredLevel: 'os_confined', anchor: 'x' }];
  const sources = { 'packages/pi-lane/src/x.ts': "import { spawn } from 'node:child_process';\n" };
  assert.match(scanNode(sources, ledger), /pi lane 能力面超出当前隔离等级：「sidecar-spawn」/);
});

test('pi lane 注入七：测试文件里的 child_process 不计入能力面（与 Rust 侧 cfg(test) 截断同义）', () => {
  const scanned = productionNodePrimitives({
    'packages/pi-lane/src/x.test.ts': "import { spawn } from 'node:child_process';\n",
    'packages/pi-lane/src/x.ts': "import { readFile } from 'node:fs/promises';\n",
  });
  assert.deepEqual([...scanned.keys()], []);
});

test('pi lane 注入八：整条链路——validateIsolationBinding 也把 pi lane 的红带出来', () => {
  const failures = validateIsolationBinding({
    adrText: ADR_FIXTURE,
    evidenceText: null,
    sources: SOURCES_FIXTURE,
    ledger: LEDGER_FIXTURE,
    nodeSources: { 'packages/pi-lane/src/sidecar.ts': "import { exec } from 'node:child_process';\n" },
    nodeLedger: [],
  }).failures;
  assert.match(failures.join('\n'), /packages\/pi-lane 生产码出现未登记的 Node 侧执行\/写原语/);
});

// ── 动态 spawn 扫描面（PI-HOST-LOOP-1 §二.8）────────────────────────────────
//
// 现行门只识别字面量 `Command::new("...")`。`pi_loop_process.rs` 里真实存在的
// `Command::new(verified_runtime_path)` 因此整枚落在盲区：ledger 零登记、门仍 exit 0。
// 下面第一枚就钉在**仓内真源码**上，它先红再绿，才有资格说这条判据有区分力。

const RUST_SOURCE_DIR = path.join(repositoryRoot, 'apps/desktop/src-tauri/src');

function realHostSources() {
  return Object.fromEntries(
    fs
      .readdirSync(RUST_SOURCE_DIR)
      .filter((file) => file.endsWith('.rs'))
      .map((file) => [
        path.posix.join('apps/desktop/src-tauri/src', file),
        fs.readFileSync(path.join(RUST_SOURCE_DIR, file), 'utf8'),
      ]),
  );
}

/** needle 由片段拼出，免得判据自己复现禁形、把被测计数打歪。 */
const NEW = `${'Command'}::new`;

/** 一枚最小的、形态与 `pi_loop_process.rs` 同构的动态 spawn 生产段。 */
const dynamicSource = (expression, fnName = 'spawn_verified_sidecar') =>
  `pub(crate) fn ${fnName}(pair: &VerifiedRoutePair) -> std::io::Result<Child> {\n` +
  `    let verified_runtime_path = pair.runtime_path.clone();\n` +
  `    ${NEW}(${expression})\n        .arg(&pair.sidecar_cjs_path)\n        .spawn()\n}\n`;

const DYNAMIC_ROW = {
  capability: 'pi-product-sidecar',
  programExpression: 'verified_runtime_path',
  enclosingFunction: 'spawn_verified_sidecar',
  requiredLevel: 'none',
  anchor: 'apps/desktop/src-tauri/src/pi_loop_process.rs',
  exactCount: 1,
  note: 'fixture',
};

const runDynamic = (sources, dynamicLedger) => run({ sources: { ...SOURCES_FIXTURE, ...sources }, dynamicLedger }).join('\n');

test('first-red：仓内真 pi_loop_process.rs 的动态 spawn，在空 dynamic 登记下必须触红', () => {
  const adrText = fs.readFileSync(path.join(repositoryRoot, 'docs/decisions/ADR-018-execution-isolation-and-sandbox.md'), 'utf8');
  const evidencePath = path.join(repositoryRoot, 'docs/engineering/sandbox-probe-1.md');
  const evidenceText = fs.existsSync(evidencePath) ? fs.readFileSync(evidencePath, 'utf8') : null;
  const failures = validateIsolationBinding({
    adrText,
    evidenceText,
    sources: realHostSources(),
    ledger: capabilityLedger,
    dynamicLedger: [],
  }).failures;
  assert.match(failures.join('\n'), /未登记的动态执行原语/);
  assert.match(failures.join('\n'), /pi_loop_process\.rs/);
  assert.match(failures.join('\n'), /verified_runtime_path/);
});

test('动态绿证：仓内真源码 + 在册 dynamicSpawnLedger 零失败', () => {
  const adrText = fs.readFileSync(path.join(repositoryRoot, 'docs/decisions/ADR-018-execution-isolation-and-sandbox.md'), 'utf8');
  const evidencePath = path.join(repositoryRoot, 'docs/engineering/sandbox-probe-1.md');
  const evidenceText = fs.existsSync(evidencePath) ? fs.readFileSync(evidencePath, 'utf8') : null;
  assert.deepEqual(
    validateIsolationBinding({ adrText, evidenceText, sources: realHostSources() }).failures,
    [],
  );
});

test('动态绿证二：登记册与生产码四项双向对上时零失败（证明后面的注入不是恒红）', () => {
  const sources = { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path') };
  assert.deepEqual(run({ sources: { ...SOURCES_FIXTURE, ...sources }, dynamicLedger: [DYNAMIC_ROW] }), []);
});

test('动态注入一：未登记的动态 spawn 触红，并点名表达式与函数', () => {
  const failures = runDynamic(
    { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path') },
    [],
  );
  assert.match(failures, /未登记的动态执行原语/);
  assert.match(failures, /verified_runtime_path/);
  assert.match(failures, /spawn_verified_sidecar/);
});

test('动态注入二：改变量名（源码 runtime_path vs 在册 verified_runtime_path）双向触红', () => {
  const failures = runDynamic(
    { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('runtime_path') },
    [DYNAMIC_ROW],
  );
  assert.match(failures, /未登记的动态执行原语/);
  assert.match(failures, /动态能力登记册与生产码脱节/);
});

test('动态注入三：把表达式换成拼接触红（表达式按 exact source text 匹配）', () => {
  const failures = runDynamic(
    { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('pair.runtime_path.clone()') },
    [DYNAMIC_ROW],
  );
  assert.match(failures, /未登记的动态执行原语/);
  assert.match(failures, /pair\.runtime_path\.clone\(\)/);
});

test('动态注入四：helper 包裹（调用搬出 spawn_verified_sidecar）触红', () => {
  const failures = runDynamic(
    { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path', 'build_command') },
    [DYNAMIC_ROW],
  );
  assert.match(failures, /未登记的动态执行原语/);
  assert.match(failures, /build_command/);
});

test('动态注入五：同函数内第二枚 spawn 让 exactCount 对不上触红', () => {
  const doubled =
    'pub(crate) fn spawn_verified_sidecar(pair: &VerifiedRoutePair) {\n' +
    `    ${NEW}(verified_runtime_path).spawn();\n` +
    `    ${NEW}(verified_runtime_path).spawn();\n}\n`;
  const failures = runDynamic({ 'apps/desktop/src-tauri/src/pi_loop_process.rs': doubled }, [DYNAMIC_ROW]);
  assert.match(failures, /实测 2 处，登记 1 处/);
});

test('动态注入六：错 anchor 触红（同一调用点换个文件即视作两件事）', () => {
  const failures = runDynamic(
    { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path') },
    [{ ...DYNAMIC_ROW, anchor: 'apps/desktop/src-tauri/src/lib.rs' }],
  );
  assert.match(failures, /未登记的动态执行原语/);
  assert.match(failures, /动态能力登记册与生产码脱节/);
});

test('动态注入七：错 enclosingFunction 触红', () => {
  const failures = runDynamic(
    { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path') },
    [{ ...DYNAMIC_ROW, enclosingFunction: 'spawn_sidecar' }],
  );
  assert.match(failures, /动态能力登记册与生产码脱节/);
});

test('动态注入八：留空登记（programExpression 为空串）触红，不许拿空值糊过双向锁', () => {
  const failures = runDynamic(
    { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path') },
    [{ ...DYNAMIC_ROW, programExpression: '   ' }],
  );
  assert.match(failures, /`programExpression` 不得为空/);
});

test('动态注入九：dynamic row 的键集漂移（缺 key / 多 key）触红', () => {
  const source = { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path') };
  const missing = { ...DYNAMIC_ROW };
  delete missing.exactCount;
  assert.match(runDynamic(source, [missing]), /动态登记行的键集必须恰为/);
  assert.match(runDynamic(source, [{ ...DYNAMIC_ROW, program: 'node' }]), /动态登记行的键集必须恰为/);
});

test('动态注入十：登记的动态能力越出当期等级触红', () => {
  const failures = runDynamic(
    { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path') },
    [{ ...DYNAMIC_ROW, requiredLevel: 'os_confined' }],
  );
  assert.match(failures, /动态能力面超出当前隔离等级：「pi-product-sidecar」/);
});

test('动态注入十一：literal 串成 dynamic（把 codesign 登进动态册）触红', () => {
  const failures = runDynamic({}, [
    { ...DYNAMIC_ROW, capability: 'host-codesign-probe', programExpression: '"codesign"', enclosingFunction: 'probe', anchor: 'apps/desktop/src-tauri/src/lib.rs' },
  ]);
  assert.match(failures, /动态能力登记册与生产码脱节/);
});

test('动态注入十二：dynamic 串成 literal（把表达式登进字面量册）触红', () => {
  const sources = { 'apps/desktop/src-tauri/src/pi_loop_process.rs': dynamicSource('verified_runtime_path') };
  const ledger = [...LEDGER_FIXTURE, { capability: 'pi-product-sidecar', program: 'verified_runtime_path', requiredLevel: 'none', anchor: 'x' }];
  const failures = run({ sources: { ...SOURCES_FIXTURE, ...sources }, ledger, dynamicLedger: [DYNAMIC_ROW] }).join('\n');
  assert.match(failures, /能力登记册与生产码脱节：「pi-product-sidecar」/);
});

test('生产段边界：item 级 `#[cfg(test)]` 属性之后的生产码仍在扫描面内', () => {
  // 旧判据「截到首个 #[cfg(test)]」会从这枚属性一刀切下，把后面的真实调用点整段丢掉。
  const source =
    'impl VerifiedRoutePair {\n' +
    '    #[cfg(test)]\n' +
    '    pub(crate) fn for_lifecycle_test(a: PathBuf) -> Self { Self { a } }\n' +
    '}\n\n' +
    dynamicSource('verified_runtime_path') +
    '\n#[cfg(test)]\nmod tests {\n' +
    `    fn t() { ${NEW}(escape_hatch).spawn(); }\n}\n`;
  const scanned = productionDynamicSpawns({ 'apps/desktop/src-tauri/src/pi_loop_process.rs': source });
  assert.deepEqual(
    scanned.map((entry) => entry.programExpression),
    ['verified_runtime_path'],
    '属性之后的生产调用点必须可见，且测试 module 内的仍须被切掉',
  );
});

test('生产段边界：仓内真源码的 item 级属性没有把 spawn 调用点切出扫描面', () => {
  const sources = realHostSources();
  const text = sources['apps/desktop/src-tauri/src/pi_loop_process.rs'];
  assert.ok(
    text.indexOf('#[cfg(test)]') < text.indexOf(`${NEW}(verified_runtime_path)`),
    '前提：真源码里确有一枚早于调用点的 item 级 #[cfg(test)] 属性',
  );
  assert.equal(productionDynamicSpawns(sources).length, 1);
});

test('动态扫描：测试块内的动态 spawn 不计入能力面（work_state.rs 真源即此形态）', () => {
  const scanned = productionDynamicSpawns({
    'apps/desktop/src-tauri/src/work_state.rs': fs.readFileSync(path.join(RUST_SOURCE_DIR, 'work_state.rs'), 'utf8'),
  });
  assert.deepEqual(scanned, []);
});

test('动态扫描：嵌套括号的表达式被完整取到，不是截到第一个右括号', () => {
  const scanned = productionDynamicSpawns({
    'x.rs': `fn f() { ${NEW}(resolve(a, g(b))).spawn(); }\n`,
  });
  assert.deepEqual(
    scanned.map((entry) => entry.programExpression),
    ['resolve(a, g(b))'],
  );
  assert.deepEqual(scanned.map((entry) => entry.enclosingFunction), ['f']);
});

test('动态扫描：字面量调用不被误算成动态（两类扫描面互斥）', () => {
  assert.deepEqual(productionDynamicSpawns(SOURCES_FIXTURE), []);
  assert.deepEqual([...productionSpawnPrograms({ 'x.rs': `fn f() { ${NEW}(runtime_path); }\n` }).keys()], []);
});
