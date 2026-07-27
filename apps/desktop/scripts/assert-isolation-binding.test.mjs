import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  capabilityLedger,
  nodePrimitiveLedger,
  parseIsolationContract,
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
