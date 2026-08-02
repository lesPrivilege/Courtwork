/**
 * PI-HOST-LOOP-1 §五 门 3 / 门 4：冻结 Node v22.23.1 **实物** × 两枚 CJS。
 *
 * 这两枚是票面点名的必跑硬门；装置若只活在会话 scratchpad 里，门就退化成轶事
 * （R5 独立验收已就同型 evidence-packaging 缺口留过批评）。故按 PI-HOST-LOOP-1R
 * 「三·补」裁定三收为 tracked 实现件，四条约束逐条落在下面：
 *
 * 1. **确定性**。输入全部固定：同一枚 bootstrap、同一份 scripted 响应、同一批断言。
 *    等待一律等**条件**（收够 N 枚出包或进程退出）并带上界，不睡定长——睡定长在快机上
 *    是浪费，在慢机上是假红。
 * 2. **零网络**。production 形态用内存 dummy key，control 形态把 provider 换成 pi-ai 的
 *    faux；两者都不发 provider 请求。child 环境严格为空（`env: {}`），代理变量也带不进去。
 *    本文件不含任何 fetch/download，快照与 archive 都只读既有实物。
 * 3. **缺快照 / 缺产物一律硬失败**。runtime、CJS、tracked manifest 缺任一件，或快照 CJS 与
 *    manifest 的 bytes/SHA 对不上，都以 exit 2 停下并打印补救命令——不静默跳过，
 *    也没有任何一处 `|| true`。
 * 4. **不进 root `pnpm test`**。循 `build-product-sidecar.test.mjs` 先例，由 package.json
 *    的独占 script 调用；两形态各自独立退出码，可单独跑、单独判。
 *
 * 判定层刻意**不复用仓内 codec**：只做裸 LF 切行与 `JSON.parse`，再逐字段断言。
 * 被判对象是 product wire 的实际出包，判据若同源就没有区分力。
 *
 * 跑法：
 *   pnpm --filter @courtwork/pi-lane gate:verified-node -- production
 *   pnpm --filter @courtwork/pi-lane gate:verified-node -- control
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  BUILD_DIR,
  BUNDLE_BASENAME,
  NODE_VERSION,
  PACKAGE_ROOT,
  RESOURCE_DIR_BASENAME,
  ROUTE_ID,
  SIDECAR_BASENAME,
  SNAPSHOT_DIR,
  TARGETS,
  USE_CODE_CACHE,
  bundleOptions,
} from './build-product-sidecar.mjs';

export const MANIFEST_FILE = path.resolve(
  PACKAGE_ROOT,
  '../../apps/desktop/src-tauri/pi-sidecar/route-manifest.json',
);

/**
 * 判 manifest 用的冻结真值。它**不**从被判的 manifest 里取值——判据与被判对象同源就没有
 * 区分力，正是复验 blocker 4 的形状。这里逐值来自 `build-product-sidecar.mjs` 的冻结表，
 * 与 Tauri mapping、Rust `RESOURCE_DIR_NAME` 同源。
 */
export const FROZEN_ROUTE = {
  schemaVersion: 1,
  routeId: ROUTE_ID,
  nodeVersion: NODE_VERSION,
  useCodeCache: USE_CODE_CACHE,
  bundle: { resourceRelativePath: `${RESOURCE_DIR_BASENAME}/${BUNDLE_BASENAME}` },
  targets: TARGETS.map((target) => ({
    targetTriple: target.targetTriple,
    machoArch: target.machoArch,
    sourceArchive: {
      filename: target.archive.filename,
      bytes: target.archive.bytes,
      sha256: target.archive.sha256,
    },
    runtime: {
      externalBinBasename: SIDECAR_BASENAME,
      bytes: target.runtime.bytes,
      sha256: target.runtime.sha256,
    },
  })),
};

/** 门自身的失败信号。CLI 入口把它翻成 exit 2；定向测试直接捕获它断言。 */
export class GateFailure extends Error {}
const REBUILD_HINT = 'pnpm --filter @courtwork/pi-lane build:product-sidecar';
/** 每一步等条件的上界。到点仍不满足即失败，不再等。 */
const STEP_DEADLINE_MS = 30_000;
const KEY_CANARY = 'sk-canary-verified-node-gate-in-memory-only';

const MODES = ['production', 'control'];

function fail(message) {
  throw new GateFailure(message);
}

/**
 * `lstat` 而非 `stat`：跟随 symlink 的 `statSync` 看到的是**目标**的类型与尺寸，于是
 * 「把 runtime 换成指向别处的软链」在门里与真实物没有区别（复验 blocker 4 第二形态）。
 * 这里要判的恰恰是这一枚路径上摆着什么，故只认 regular file 本身。
 */
function requireFile(file, what) {
  let stats;
  try {
    stats = fs.lstatSync(file);
  } catch {
    return fail(`缺${what}：${file}\n  先跑独占命令生成快照：${REBUILD_HINT}`);
  }
  if (stats.isSymbolicLink()) {
    return fail(`${what}是 symlink，不是实物：${file}\n  先跑独占命令重建：${REBUILD_HINT}`);
  }
  if (!stats.isFile() || stats.size === 0) {
    return fail(`${what}不是非空 regular file：${file}\n  先跑独占命令重建：${REBUILD_HINT}`);
  }
  return stats;
}

function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** closed record：键集必须逐字相同，多一枚少一枚都是漂移。 */
function closedRecord(value, keys, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`manifest ${label} 必须是对象`);
  }
  const observed = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    fail(`manifest ${label} 键集漂移：实得 ${JSON.stringify(observed)} ≠ ${JSON.stringify(expected)}`);
  }
  return value;
}

function frozenEqual(observed, expected, label) {
  if (observed !== expected) {
    fail(`manifest ${label} 漂移：实得 ${JSON.stringify(observed)} ≠ 冻结值 ${JSON.stringify(expected)}`);
  }
}

/**
 * tracked manifest 的 closed decode + 逐值冻结核对。
 *
 * 1R 只从 manifest 里挑出三四个字段用，其余删改一律不问——于是 `routeId`/`nodeVersion`/
 * `useCodeCache`/`resourceRelativePath` 全都可以随便改而门照样绿。冻结值来自
 * {@link FROZEN_ROUTE}（源自 builder 冻结表），不从被判的 manifest 自取。
 * `bundle.bytes/sha256` 是构建产出而非冻结常量，故不在此比，交给下面与实物的逐值比对。
 */
function assertManifestFrozen(manifest, frozen) {
  closedRecord(
    manifest,
    ['schemaVersion', 'routeId', 'nodeVersion', 'useCodeCache', 'bundle', 'targets'],
    '顶层',
  );
  frozenEqual(manifest.schemaVersion, frozen.schemaVersion, 'schemaVersion');
  frozenEqual(manifest.routeId, frozen.routeId, 'routeId');
  frozenEqual(manifest.nodeVersion, frozen.nodeVersion, 'nodeVersion');
  frozenEqual(manifest.useCodeCache, frozen.useCodeCache, 'useCodeCache');

  closedRecord(manifest.bundle, ['resourceRelativePath', 'bytes', 'sha256'], 'bundle');
  frozenEqual(
    manifest.bundle.resourceRelativePath,
    frozen.bundle.resourceRelativePath,
    'bundle.resourceRelativePath',
  );

  if (!Array.isArray(manifest.targets) || manifest.targets.length !== frozen.targets.length) {
    fail(`manifest targets 必须恰 ${frozen.targets.length} 行，实得 ${JSON.stringify(manifest.targets)}`);
  }
  for (const [index, expected] of frozen.targets.entries()) {
    const row = manifest.targets[index];
    const at = `targets[${index}]`;
    closedRecord(row, ['targetTriple', 'machoArch', 'sourceArchive', 'runtime'], at);
    frozenEqual(row.targetTriple, expected.targetTriple, `${at}.targetTriple`);
    frozenEqual(row.machoArch, expected.machoArch, `${at}.machoArch`);
    closedRecord(row.sourceArchive, ['filename', 'bytes', 'sha256'], `${at}.sourceArchive`);
    for (const key of ['filename', 'bytes', 'sha256']) {
      frozenEqual(row.sourceArchive[key], expected.sourceArchive[key], `${at}.sourceArchive.${key}`);
    }
    closedRecord(row.runtime, ['externalBinBasename', 'bytes', 'sha256'], `${at}.runtime`);
    for (const key of ['externalBinBasename', 'bytes', 'sha256']) {
      frozenEqual(row.runtime[key], expected.runtime[key], `${at}.runtime.${key}`);
    }
  }
}

function hostTargetTriple() {
  if (process.platform !== 'darwin') fail(`本门只覆盖 darwin，实得 ${process.platform}`);
  if (process.arch === 'arm64') return 'aarch64-apple-darwin';
  if (process.arch === 'x64') return 'x86_64-apple-darwin';
  return fail(`target 不在闭集内：${process.arch}`);
}

/**
 * 缺件 / 漂移一律硬失败：门要么在真实物上跑，要么不跑。
 *
 * 三枚坐标与冻结表都可注入，供定向反例用合成 app-layout 构造篡改形态——不去动那份
 * ignored 的真实 snapshot（还原式变异是验收手法，不是常驻测试该做的事）。
 */
export function resolveVerifiedRoute({
  snapshotDir = SNAPSHOT_DIR,
  manifestFile = MANIFEST_FILE,
  frozen = FROZEN_ROUTE,
  triple = hostTargetTriple(),
} = {}) {
  const runtime = path.join(snapshotDir, `${SIDECAR_BASENAME}-${triple}`);
  const bundle = path.join(snapshotDir, BUNDLE_BASENAME);
  requireFile(manifestFile, 'tracked route manifest');
  const runtimeStats = requireFile(runtime, `冻结 runtime（${triple}）`);
  const bundleStats = requireFile(bundle, 'production sealed CJS');

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch (cause) {
    return fail(`tracked route manifest 不是合法 JSON：${cause instanceof Error ? cause.message : cause}`);
  }
  assertManifestFrozen(manifest, frozen);
  const target = manifest.targets.find((row) => row.targetTriple === triple);
  if (!target) fail(`tracked manifest 没有 ${triple} 那一行`);

  // 快照实物必须与 tracked manifest 逐值相同——对不上就是漂移，不是「差不多」。
  // runtime 与 sealed CJS **同待遇**：bytes + SHA 双核。只比 bytes 时，同尺寸的尾字节
  // 篡改一枚都拦不住，而门 3/4 的全部意义就是证明本次执行的是那枚冻结二进制。
  if (runtimeStats.size !== target.runtime.bytes) {
    fail(`runtime bytes 漂移：实物 ${runtimeStats.size} ≠ manifest ${target.runtime.bytes}`);
  }
  const runtimeSha = sha256File(runtime);
  if (runtimeSha !== target.runtime.sha256) {
    fail(`runtime SHA 漂移：实物 ${runtimeSha} ≠ manifest ${target.runtime.sha256}`);
  }
  if (bundleStats.size !== manifest.bundle.bytes) {
    fail(`sealed CJS bytes 漂移：实物 ${bundleStats.size} ≠ manifest ${manifest.bundle.bytes}`);
  }
  const bundleSha = sha256File(bundle);
  if (bundleSha !== manifest.bundle.sha256) {
    fail(`sealed CJS SHA 漂移：实物 ${bundleSha} ≠ manifest ${manifest.bundle.sha256}`);
  }
  return { triple, runtime, bundle, manifest, bundleSha, runtimeSha };
}

/**
 * 裸驱动。逐步「发一枚 packet → 等到收够 N 枚出包或进程退出」，全程有界。
 * 退出等待器必须**先于**写入挂上：`exit` 只发一次，晚挂的听不到已经发生的那一次。
 */
async function drive(runtime, cjs, cwd, steps) {
  const child = spawn(runtime, [cjs], { stdio: ['pipe', 'pipe', 'pipe'], cwd, env: {} });
  let exited = false;
  const exit = new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      exited = true;
      resolve({ code, signal });
    });
  });

  const lines = [];
  let carry = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    carry += chunk.toString('utf8');
    for (;;) {
      const index = carry.indexOf('\n');
      if (index < 0) break;
      lines.push(carry.slice(0, index));
      carry = carry.slice(index + 1);
    }
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });

  for (const step of steps) {
    if (!exited) child.stdin.write(`${JSON.stringify(step.packet)}\n`);
    const started = Date.now();
    // 等条件，不睡定长；进程提前退出也算「等到头了」，交由断言判对错。
    while (lines.length < step.untilLines && !exited && Date.now() - started < STEP_DEADLINE_MS) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    if (lines.length < step.untilLines && !exited) {
      child.kill('SIGKILL');
      await exit;
      return { lines, carry, stderr, code: null, signal: 'SIGKILL', timedOutAt: step.label };
    }
  }
  child.stdin.end();
  const { code, signal } = await exit;
  return { lines, carry, stderr, code, signal, timedOutAt: null };
}

function createChecker() {
  const failures = [];
  return {
    check(label, condition, detail = '') {
      if (condition) {
        console.log(`  PASS  ${label}`);
      } else {
        failures.push(label);
        console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
      }
    },
    failures,
  };
}

const bootstrapPacket = (caseRoot) => ({
  protocolVersion: 1,
  seq: 1,
  sessionId: 'session-1',
  requestId: null,
  type: 'bootstrap',
  payload: {
    containerId: 'container-1',
    grantId: 'grant-1',
    caseRoot,
    provider: { id: 'deepseek', modelId: 'deepseek-v4-flash', apiKey: KEY_CANARY },
    limits: { maxTurns: 12, maxUsd: null },
    resume: { kind: 'fresh', leg: 1, priorObservedTurns: 0, priorTurns: 0, priorUsd: 0 },
  },
});
const promptPacket = (seq, text) => ({
  protocolVersion: 1,
  seq,
  sessionId: 'session-1',
  requestId: 'request-1',
  type: 'prompt',
  payload: { text },
});
const shutdownPacket = (seq) => ({
  protocolVersion: 1,
  seq,
  sessionId: 'session-1',
  requestId: null,
  type: 'shutdown',
  payload: { reason: 'host_shutdown' },
});

async function makeCaseRoot() {
  const scratch = await mkdtemp(path.join(tmpdir(), 'pi-verified-node-gate-'));
  const caseRoot = path.join(scratch, '案卷');
  await mkdir(caseRoot);
  await writeFile(path.join(caseRoot, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n', 'utf8');
  return { scratch, caseRoot };
}

/** 门 3：冻结 runtime × production sealed CJS，bootstrap → ready → shutdown。 */
async function runProductionGate(route) {
  const { scratch, caseRoot } = await makeCaseRoot();
  try {
    const run = await drive(route.runtime, route.bundle, scratch, [
      { label: 'bootstrap→ready', packet: bootstrapPacket(caseRoot), untilLines: 1 },
      { label: 'shutdown→terminal', packet: shutdownPacket(2), untilLines: 2 },
    ]);
    const { check, failures } = createChecker();
    check('未触任一步的等待上界', run.timedOutAt === null, run.timedOutAt ?? '');
    const parsed = run.lines.map((line) => JSON.parse(line));
    check('恰两枚出包', parsed.length === 2, `实得 ${parsed.length}: ${run.lines.join(' | ')}`);
    check(
      '首包 ready 且 capabilities 恰 ["case_read"]',
      parsed[0]?.type === 'ready' &&
        JSON.stringify(parsed[0]?.payload?.capabilities) === '["case_read"]',
      JSON.stringify(parsed[0] ?? null),
    );
    check(
      '次包 terminal{status:"shutdown"}',
      parsed[1]?.type === 'terminal' && parsed[1]?.payload?.status === 'shutdown',
      JSON.stringify(parsed[1] ?? null),
    );
    check('EOF 前无残留半行', run.carry === '', JSON.stringify(run.carry));
    check('stderr 0 字节', run.stderr.length === 0, `${run.stderr.length} B`);
    check('exit 0', run.code === 0 && run.signal === null, `code=${run.code} signal=${run.signal}`);
    const whole = run.lines.join('\n');
    check('canary：出包不含 provider key', !whole.includes(KEY_CANARY));
    check('canary：出包不含物理案件根', !whole.includes(caseRoot));
    check('production bundle 不含 control 面', !whole.includes('faux'));
    return failures.length;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

/**
 * control entry：与 production 同一枚 `createProductRuntime` factory seam，只把 provider
 * 换成 scripted faux。它住在 ignored 的构建 scratch 里，production 图上没有一条边指向它。
 */
const CONTROL_ENTRY_SOURCE = `
import process from 'node:process';

import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
} from '@earendil-works/pi-ai';

import { createProductRuntime, withExplicitApiKey } from '../../src/product-runtime.js';
import { createProductSidecarSession } from '../../src/product-stdio.js';

const faux = fauxProvider({ provider: 'faux', models: [{ id: 'deepseek-v4-flash' }] });
const models = createModels();
models.setProvider(faux.provider);
// 一界内一界外：界外那一枚必须被产品容器拒绝，且如实记成 denied，不是 succeeded。
faux.setResponses([
  fauxAssistantMessage([fauxToolCall('read', { path: '/case/备忘.md' })], { stopReason: 'toolUse' }),
  fauxAssistantMessage([fauxToolCall('read', { path: '/workspace/记录.md' })], { stopReason: 'toolUse' }),
  fauxAssistantMessage([fauxText('合同编号是 HT-2024-081。')]),
]);

let pendingWrites = 0;
let requestedExit = null;
const exitWhenFlushed = () => {
  if (requestedExit !== null && pendingWrites === 0) process.exit(requestedExit);
};

const runtime = createProductRuntime({
  createProvider: ({ modelId, apiKey }) => ({
    model: faux.getModel(modelId),
    streamSimple: withExplicitApiKey(
      (model, context, options) => models.streamSimple(model, context, options),
      apiKey,
    ),
  }),
});
const session = createProductSidecarSession({
  transport: {
    write(line) {
      pendingWrites += 1;
      process.stdout.write(line, () => {
        pendingWrites -= 1;
        exitWhenFlushed();
      });
    },
    exit(code) {
      requestedExit = code;
      exitWhenFlushed();
    },
  },
  runtime,
});
runtime.bind(session);

let carry = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
  carry = Buffer.concat([carry, chunk]);
  for (;;) {
    const index = carry.indexOf(0x0a);
    if (index < 0) break;
    const line = carry.subarray(0, index + 1);
    carry = carry.subarray(index + 1);
    session.receive(line);
  }
});
process.stdin.on('end', () => session.endOfInput());
`;

/** 门 4：同一冻结 runtime × 现编 control CJS，逼出 read → tool result → terminal。 */
async function runControlGate(route) {
  const esbuild = await import('esbuild');
  await mkdir(BUILD_DIR, { recursive: true });
  const entry = path.join(BUILD_DIR, 'verified-node-gate-control.ts');
  const bundle = path.join(BUILD_DIR, 'verified-node-gate-control.cjs');
  await writeFile(entry, CONTROL_ENTRY_SOURCE, 'utf8');
  await esbuild.build(bundleOptions(entry, bundle));
  requireFile(bundle, '现编 control CJS');

  const { scratch, caseRoot } = await makeCaseRoot();
  try {
    // 一次 prompt 走两枚工具回合与一枚正文回合：ready + 6 枚 agent_event + completed = 至少 8 枚。
    const run = await drive(route.runtime, bundle, scratch, [
      { label: 'bootstrap→ready', packet: bootstrapPacket(caseRoot), untilLines: 1 },
      { label: 'prompt→terminal', packet: promptPacket(2, '备忘里的合同编号是多少'), untilLines: 8 },
      { label: 'shutdown→terminal', packet: shutdownPacket(3), untilLines: 9 },
    ]);
    const { check, failures } = createChecker();
    check('未触任一步的等待上界', run.timedOutAt === null, run.timedOutAt ?? '');
    const parsed = run.lines.map((line) => JSON.parse(line));
    const kinds = parsed.map((packet) =>
      packet.type === 'agent_event'
        ? `agent_event:${packet.payload.kind}`
        : packet.type === 'terminal'
          ? `terminal:${packet.payload.status}`
          : packet.type,
    );
    console.log(`  出包序列: ${kinds.join(' → ')}`);
    check('ready 首出', kinds[0] === 'ready');
    const finished = parsed.filter(
      (packet) => packet.type === 'agent_event' && packet.payload.kind === 'tool_finished',
    );
    check('两枚 read 都出了 tool_finished', finished.length === 2, `实得 ${finished.length}`);
    check(
      'toolName 恒为 read',
      finished.every((packet) => packet.payload.toolName === 'read'),
    );
    // N3 在真实 sealed 路径上的端到端判据：界内 succeeded、界外 denied，一枚都不许伪成成功。
    check(
      '/case/备忘.md → succeeded；/workspace/记录.md → denied',
      JSON.stringify(finished.map((packet) => packet.payload.outcome)) === '["succeeded","denied"]',
      JSON.stringify(finished.map((packet) => packet.payload.outcome)),
    );
    check('turn_finished 出现', kinds.includes('agent_event:turn_finished'));
    check('terminal:completed 出现', kinds.includes('terminal:completed'));
    check('terminal:shutdown 收尾', kinds.at(-1) === 'terminal:shutdown');
    check('EOF 前无残留半行', run.carry === '', JSON.stringify(run.carry));
    check('stderr 0 字节', run.stderr.length === 0, run.stderr.slice(0, 200));
    check('exit 0', run.code === 0 && run.signal === null, `code=${run.code} signal=${run.signal}`);
    // 助手正文按 delta 流式下发，须先拼回再断言——裸拼 JSON 行会把它切在中间。
    const assistantText = parsed
      .filter((packet) => packet.type === 'agent_event' && packet.payload.kind === 'assistant_text_delta')
      .map((packet) => packet.payload.delta)
      .join('');
    check('助手正文完整流回 HT-2024-081', assistantText.includes('HT-2024-081'), assistantText);
    const whole = run.lines.join('\n');
    check('canary：出包不含 provider key', !whole.includes(KEY_CANARY));
    check('canary：出包不含物理案件根', !whole.includes(caseRoot));
    return failures.length;
  } finally {
    await rm(scratch, { recursive: true, force: true });
    await rm(entry, { force: true });
    await rm(bundle, { force: true });
  }
}

/** 只有被独占 script 直接调起时才跑门；`import` 进来只取上面那些可注入的纯件。 */
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const mode = process.argv[2];
  let route;
  try {
    if (!MODES.includes(mode)) {
      fail(`用法：node scripts/verified-node-gate.mjs <${MODES.join('|')}>（实得 ${mode ?? '空'}）`);
    }
    route = resolveVerifiedRoute();
  } catch (cause) {
    if (!(cause instanceof GateFailure)) throw cause;
    console.error(`verified-node-gate: ${cause.message}`);
    process.exit(2);
  }
  console.log(
    `verified-node-gate ${mode}\n  runtime  ${route.runtime}\n  target   ${route.triple}\n  runtime SHA ${route.runtimeSha}\n  bundle   ${route.bundle}\n  bundle SHA ${route.bundleSha}`,
  );

  const failed = mode === 'production' ? await runProductionGate(route) : await runControlGate(route);
  console.log(failed === 0 ? `\n门 ${mode}：全部通过` : `\n门 ${mode}：失败 ${failed} 项`);
  process.exit(failed === 0 ? 0 : 1);
}
