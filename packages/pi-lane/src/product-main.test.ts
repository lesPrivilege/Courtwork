import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  HOST_PACKET_TYPES,
  SIDECAR_PACKET_TYPES,
  decodeHostPacketLine,
  decodeSidecarPacketLine,
  encodePacketLine,
  type HostPacket,
  type ProductPacket,
  type SidecarPacket,
} from './product-protocol.js';

/**
 * production 组合根（PI-HOST-LOOP-1 §二.2、§二.4、§五门 3/4）。
 *
 * 本文件**不 import** `product-main.ts`——它是 executable entry，import 即接管 stdin。
 * 观察面因此是两条：源码文本（组合了什么、没组合什么），以及**真跑起来的 CJS**。
 * 后者用与 `build-product-sidecar.mjs` 同一份 `bundleOptions` 现编，故 source 漂移当场可见，
 * 不必等独占下载/发布命令。
 *
 * 冻结 Node v22.23.1 上的同一对跑动由独占 `build:product-sidecar` 产出的 snapshot 承担
 * （票面 §五门 3/4）；本组在无网络的 `pnpm test` 里跑的是同一份 bundle、同一套 packet。
 */

const CONTROL_CANARY = 'PI-HOST-LOOP-1-CONTROL-PROVIDER-CANARY';

type BuildModule = {
  BUILD_DIR: string;
  PRODUCT_ENTRY: string;
  ROUTE_ID: string;
  NODE_VERSION: string;
  USE_CODE_CACHE: boolean;
  SIDECAR_BASENAME: string;
  TARGETS: {
    targetTriple: string;
    machoArch: string;
    archive: { filename: string; bytes: number; sha256: string };
    runtime: { bytes: number; sha256: string };
  }[];
  bundleOptions(entryPoint: string, outfile: string): Record<string, unknown>;
  buildDeterministicBundle(input?: { entryPoint?: string; scratchDir?: string }): Promise<{
    bytes: number;
    sha256: string;
    reproducible: boolean;
  }>;
};

let build: BuildModule;
let esbuild: { build(options: Record<string, unknown>): Promise<unknown> };
let scratch: string;
let caseRoot: string;
let productionBundle: string;
let controlBundle: string;

type Run = { code: number | null; packets: SidecarPacket[]; stderr: string };

/** 把 host packet 序列喂给一枚真进程，收 sidecar 出包与退出码。child 环境严格为空。 */
async function drive(bundle: string, packets: HostPacket[], options: { delayMs?: number } = {}): Promise<Run> {
  const child = spawn(process.execPath, [bundle], { stdio: ['pipe', 'pipe', 'pipe'], cwd: scratch, env: {} });
  // 退出等待器必须**先于**写入挂上：`exit` 只发一次，晚挂的听不到已经发生的那一次，
  // 于是「进程早退」会被误读成「进程挂死」。实测就踩过这一脚。
  const exited = new Promise<number | null>((resolve) => child.on('exit', resolve));
  const out: SidecarPacket[] = [];
  let stderr = '';
  let carry = '';
  child.stdout.on('data', (chunk: Buffer) => {
    carry += chunk.toString('utf8');
    for (;;) {
      const index = carry.indexOf('\n');
      if (index < 0) break;
      const line = carry.slice(0, index);
      carry = carry.slice(index + 1);
      const decoded = decodeSidecarPacketLine(Buffer.from(line, 'utf8'));
      if (!decoded.ok) throw new Error(`sidecar 出包不合契约：${decoded.reason}`);
      out.push(decoded.packet);
    }
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });

  for (const packet of packets) {
    const encoded = encodePacketLine(packet);
    if (!encoded.ok) throw new Error(`host 入包不合契约：${encoded.reason}`);
    if (child.exitCode === null && child.signalCode === null) child.stdin.write(encoded.line);
    await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 400));
  }
  const code = await exited;
  return { code, packets: out, stderr };
}

const bootstrap = (): HostPacket => ({
  protocolVersion: 1,
  seq: 1,
  sessionId: 'session-1',
  requestId: null,
  type: 'bootstrap',
  payload: {
    containerId: 'container-1',
    grantId: 'grant-1',
    caseRoot,
    provider: { id: 'deepseek', modelId: 'deepseek-v4-flash', apiKey: 'sk-dummy-in-memory-key' },
    limits: { maxTurns: 12, maxUsd: null },
    resume: { kind: 'fresh', leg: 1, priorObservedTurns: 0, priorTurns: 0, priorUsd: 0 },
  },
});

/**
 * control entry：与 production 同一枚 `createProductRuntime` factory seam，只把 provider
 * 换成 scripted stream。它住在 ignored 的构建 scratch 里，production 图上没有任何一条边指向它。
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

const CANARY = '${CONTROL_CANARY}';

const faux = fauxProvider({ provider: 'faux', models: [{ id: 'deepseek-v4-flash' }] });
const models = createModels();
models.setProvider(faux.provider);
faux.setResponses([
  fauxAssistantMessage([fauxToolCall('read', { path: '/case/备忘.md' })], { stopReason: 'toolUse' }),
  fauxAssistantMessage([fauxText('合同编号是 HT-2024-081。' + CANARY)]),
]);

let pendingWrites = 0;
let requestedExit = null;
const exitWhenFlushed = () => {
  if (requestedExit !== null && pendingWrites === 0) process.exit(requestedExit);
};
const transport = {
  write(line) {
    pendingWrites += 1;
    process.stdout.write(line, () => {
      pendingWrites -= 1;
      exitWhenFlushed();
    });
  },
  exit(code) {
    if (requestedExit !== null) return;
    requestedExit = code;
    process.stdin.pause();
    exitWhenFlushed();
  },
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
const session = createProductSidecarSession({ transport, runtime });
runtime.bind(session);
process.stdin.on('data', (chunk) => session.receive(chunk));
process.stdin.on('end', () => session.endOfInput());
`;

beforeAll(async () => {
  build = (await import(
    /* @vite-ignore */ new URL('../scripts/build-product-sidecar.mjs', import.meta.url).href
  )) as BuildModule;
  esbuild = (await import('esbuild')) as unknown as typeof esbuild;

  scratch = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-host-main-')));
  caseRoot = path.join(scratch, '案卷');
  await mkdir(caseRoot);
  await writeFile(path.join(caseRoot, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n');

  await mkdir(build.BUILD_DIR, { recursive: true });
  productionBundle = path.join(build.BUILD_DIR, 'production-under-test.cjs');
  controlBundle = path.join(build.BUILD_DIR, 'control-under-test.cjs');
  const controlEntry = path.join(build.BUILD_DIR, 'control-main.ts');
  await writeFile(controlEntry, CONTROL_ENTRY_SOURCE, 'utf8');

  await esbuild.build(build.bundleOptions(build.PRODUCT_ENTRY, productionBundle));
  await esbuild.build(build.bundleOptions(controlEntry, controlBundle));
}, 180_000);

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe('组合根的源码边界', () => {
  it('只组合真实 DeepSeek binding，不从 argv/环境/wire 选 provider', async () => {
    const source = await readFile(new URL('product-main.ts', import.meta.url), 'utf8');
    expect(source).toContain('createDeepSeekProviderBinding');
    expect(source.match(/createProductSidecarSession\(/g)).toHaveLength(1);
    expect(source).not.toContain('createProvider: (');
    for (const forbidden of ['./provider.js', './session.js', './sidecar.js', './sidecar-main.js']) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('node:process 只用到 stdin / stdout / exit', async () => {
    const source = await readFile(new URL('product-main.ts', import.meta.url), 'utf8');
    const used = [...source.matchAll(/process\.([A-Za-z_$][\w$]*)/g)].map((match) => match[1]);
    expect([...new Set(used)].sort()).toEqual(['exit', 'stdin', 'stdout']);
  });
});

describe('production sealed CJS：bootstrap → ready → shutdown', () => {
  it('用内存 dummy key 真跑一遍，零网络、零 stderr、exit 0', async () => {
    const run = await drive(productionBundle, [
      bootstrap(),
      {
        protocolVersion: 1,
        seq: 2,
        sessionId: 'session-1',
        requestId: null,
        type: 'shutdown',
        payload: { reason: 'host_shutdown' },
      },
    ]);
    expect(run.stderr).toBe('');
    expect(run.code).toBe(0);
    expect(run.packets.map((packet) => packet.type)).toEqual(['ready', 'terminal']);
    const ready = run.packets[0];
    // 真跑一遍 sealed CJS 的握手闭集：与 `PRODUCT_CAPABILITIES`、Rust `EXPECTED_CAPABILITIES` 同表。
    expect(ready.type === 'ready' && ready.payload.capabilities).toEqual([
      'case_read',
      'workspace_read',
      'workspace_write',
    ]);
    const terminal = run.packets[1];
    expect(terminal.type === 'terminal' && terminal.payload).toEqual({ status: 'shutdown' });
  }, 120_000);

  it('bundle 可复现，且不含 control provider 与构建期绝对路径', async () => {
    const built = await build.buildDeterministicBundle();
    expect(built.reproducible).toBe(true);
    expect(built.bytes).toBeGreaterThan(0);
    expect(built.sha256).toMatch(/^[0-9a-f]{64}$/);

    const production = await readFile(productionBundle, 'utf8');
    const control = await readFile(controlBundle, 'utf8');
    // canary 在 control 里确实存在——否则下面那条「production 里没有」零区分力。
    expect(control).toContain(CONTROL_CANARY);
    expect(production).not.toContain(CONTROL_CANARY);
    expect(production).not.toContain('fauxProvider');
    expect(production).not.toContain(path.resolve(new URL('.', import.meta.url).pathname, '..'));
    // 真实 catalog 确实被链进来了。
    expect(production).toContain('api.deepseek.com');
  }, 180_000);
});

describe('control CJS：scripted stream 逼出 read → tool result → terminal', () => {
  it('同一枚 runtime factory + scripted provider，真跑出工具回合与 completed', async () => {
    const run = await drive(
      controlBundle,
      [
        bootstrap(),
        {
          protocolVersion: 1,
          seq: 2,
          sessionId: 'session-1',
          requestId: 'request-1',
          type: 'prompt',
          payload: { text: '备忘里的合同编号是多少' },
        },
        {
          protocolVersion: 1,
          seq: 3,
          sessionId: 'session-1',
          requestId: null,
          type: 'shutdown',
          payload: { reason: 'host_shutdown' },
        },
      ],
      { delayMs: 900 },
    );

    expect(run.stderr).toBe('');
    expect(run.code).toBe(0);
    const kinds = run.packets.flatMap((packet) => (packet.type === 'agent_event' ? [packet.payload.kind] : []));
    expect(kinds).toContain('tool_started');
    expect(kinds).toContain('tool_finished');
    expect(kinds.filter((kind) => kind === 'turn_finished')).toHaveLength(2);

    const toolEvents = run.packets.flatMap((packet) =>
      packet.type === 'agent_event' && packet.payload.kind === 'tool_finished' ? [packet.payload] : [],
    );
    expect(toolEvents).toHaveLength(1);
    expect(toolEvents[0].toolName).toBe('read');
    expect(toolEvents[0].outcome).toBe('succeeded');

    const terminals = run.packets.flatMap((packet) => (packet.type === 'terminal' ? [packet.payload] : []));
    expect(terminals.map((terminal) => terminal.status)).toEqual(['completed', 'shutdown']);

    // 模型面出来的文字里不得出现物理案件根。
    expect(JSON.stringify(run.packets)).not.toContain(caseRoot);
  }, 120_000);
});

/**
 * 共享 wire golden（PI-HOST-LOOP-1 §三 尾段、§四.3）。
 *
 * 落点说明：票面的实现文件闭集里**没有**独立的 golden 测试文件，而 fixture 讲的正是
 * production entry 对外说的那套 packet，故本组住在这里，不另开文件扩票。
 *
 * 判据三层，缺一层就会退化成排版：
 * 1. **方向唯一**：每行去掉结尾 LF 后，`decodeHostPacketLine` / `decodeSidecarPacketLine`
 *    恰有一个成功。两个都成或两个都败都算 fixture 坏。
 * 2. **canonical**：公开 `encodePacketLine` 重编码必须与原 bytes 逐字相同。fixture 是手写的，
 *    故这一条是真检查——键序写错、数值 lexeme 漂移（`0.50`）都会当场红。
 * 3. **覆盖闭集**：每种 packet type、每个 union branch、每枚 enum 值至少出现一行。
 *    expected 侧在本文件独立声明，不从被测 codec 的内部词表 import——同源就没有区分力。
 *
 * `decodePacketNode` 是 `product-protocol.ts` 的内部件，本文件不导出、不复制它。
 * Rust 侧在 `PI-HOST-LOOP-1` H2 用 `include_bytes!` 读同一枚 tracked blob 独立复验。
 */

const GOLDEN_PATH = new URL('../fixtures/product-wire-v1.jsonl', import.meta.url);

/** 按字节切行，保留原始 bytes——先转字符串再切会丢掉 CRLF/BOM 这类判据。 */
function splitGoldenLines(bytes: Uint8Array): Uint8Array[] {
  const lines: Uint8Array[] = [];
  let start = 0;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== 0x0a) continue;
    lines.push(bytes.subarray(start, index));
    start = index + 1;
  }
  if (start !== bytes.byteLength) throw new Error('golden 最后一行没有以 LF 结束');
  return lines;
}

type LineVerdict = { index: number; packet: ProductPacket | null; problems: string[] };

/** 单行判据：方向唯一 + canonical 重编码。 */
function verifyLine(line: Uint8Array, index: number): LineVerdict {
  const host = decodeHostPacketLine(line);
  const sidecar = decodeSidecarPacketLine(line);
  const problems: string[] = [];
  if (host.ok && sidecar.ok) problems.push('两个方向都解成功');
  if (!host.ok && !sidecar.ok) problems.push(`两个方向都解失败：${host.reason} / ${sidecar.reason}`);
  if (problems.length > 0) return { index, packet: null, problems };

  const packet = (host.ok ? host.packet : sidecar.ok ? sidecar.packet : null) as ProductPacket;
  const encoded = encodePacketLine(packet);
  if (!encoded.ok) {
    problems.push(`重编码失败：${encoded.reason}`);
    return { index, packet, problems };
  }
  const expected = new Uint8Array(line.byteLength + 1);
  expected.set(line);
  expected[line.byteLength] = 0x0a;
  if (Buffer.compare(Buffer.from(encoded.line), Buffer.from(expected)) !== 0) {
    problems.push('canonical 重编码与原 bytes 不同');
  }
  return { index, packet, problems };
}

/** 期望闭集：本文件独立声明，与被测 codec 的内部词表不同源。 */
const EXPECTED = {
  hostTypes: ['bootstrap', 'prompt', 'cancel', 'host_result', 'shutdown'],
  sidecarTypes: ['ready', 'agent_event', 'host_request', 'terminal', 'protocol_error'],
  resumeKinds: ['fresh', 'after_interruption'],
  cancelReasons: ['user', 'host'],
  hostResultStatuses: ['ok', 'denied', 'failed', 'uncertain'],
  workspaceOperations: ['write', 'exists', 'read_file', 'list'],
  capabilities: ['case_read', 'workspace_read', 'workspace_write'],
  deniedCodes: ['user_denied', 'policy_denied'],
  hostFailureCodes: [
    'invalid_path',
    'not_found',
    'not_directory',
    'is_directory',
    'symlink_forbidden',
    'limit_exceeded',
    'hash_mismatch',
    'state_changed',
    'unsupported_file_type',
    'unsupported_filesystem',
    'io',
    'aborted',
    'interrupted',
  ],
  entryKinds: ['file', 'directory', 'symlink'],
  dispositions: ['created', 'overwritten'],
  agentEventKinds: [
    'assistant_text_delta',
    'assistant_reasoning_delta',
    'tool_started',
    'tool_progress',
    'tool_finished',
    'turn_finished',
  ],
  toolNames: ['read', 'glob', 'grep', 'write'],
  toolOutcomes: ['succeeded', 'denied', 'failed', 'uncertain'],
  stopReasons: ['stop', 'length', 'tool', 'aborted', 'error', 'unknown'],
  terminalStatuses: ['completed', 'budget_stopped', 'canceled', 'failed', 'shutdown'],
  terminalFailureMessages: {
    provider_error: 'provider 调用失败，本轮未能完成',
    host_error: '宿主操作失败，本轮未能完成',
    budget_unknown: '已启用金额限额，但存在费用未知的回合',
    effect_uncertain: '目标可能已是完整新版本，落盘无法证明',
    upstream_event_unsupported: '上游事件序列不在投影闭集内',
    invalid_state: '状态机收到不合法的状态转移',
    unknown: '未归类的失败',
  } as Record<string, string>,
  protocolErrorCodes: [
    'invalid_json',
    'packet_too_large',
    'invalid_schema',
    'unsupported_version',
    'unknown_type',
    'seq_mismatch',
    'session_mismatch',
    'request_mismatch',
    'state_violation',
    'duplicate_id',
  ],
};

/** 覆盖清点：返回缺项清单。空数组即全覆盖。 */
function coverageProblems(packets: ProductPacket[]): string[] {
  const seen = new Set<string>();
  const mark = (bucket: string, value: unknown) => seen.add(`${bucket}:${String(value)}`);

  for (const packet of packets) {
    mark('type', packet.type);
    const payload = packet.payload as Record<string, unknown>;
    switch (packet.type) {
      case 'bootstrap':
        mark('resumeKind', (payload.resume as { kind: string }).kind);
        break;
      case 'cancel':
        mark('cancelReason', payload.reason);
        break;
      case 'host_result': {
        mark('hostResultStatus', payload.status);
        mark('workspaceOperation', payload.operation);
        if (payload.status === 'ok') {
          const value = payload.value as Record<string, unknown>;
          if (payload.operation === 'write') mark('disposition', value.disposition);
          if (payload.operation === 'list') {
            for (const entry of value.entries as { kind: string }[]) mark('entryKind', entry.kind);
            if ((value.entries as unknown[]).length === 0) mark('boundary', 'empty-list');
          }
          if (payload.operation === 'read_file' && value.byteLength === 0) mark('boundary', 'empty-content');
        } else {
          const error = payload.error as { code: string };
          if (payload.status === 'denied') mark('deniedCode', error.code);
          if (payload.status === 'failed') mark('hostFailureCode', error.code);
          if (payload.status === 'uncertain') mark('uncertainCode', error.code);
        }
        break;
      }
      case 'ready':
        for (const capability of payload.capabilities as string[]) mark('capability', capability);
        break;
      case 'agent_event': {
        mark('agentEventKind', payload.kind);
        if (typeof payload.toolName === 'string') mark('toolName', payload.toolName);
        if (typeof payload.outcome === 'string') mark('toolOutcome', payload.outcome);
        if (payload.kind === 'turn_finished') mark('stopReason', payload.stopReason);
        break;
      }
      case 'host_request':
        mark('hostRequestCapability', payload.capability);
        if (payload.capability === 'workspace_read') {
          mark('workspaceOperation', (payload.arguments as { operation: string }).operation);
        }
        break;
      case 'terminal': {
        mark('terminalStatus', payload.status);
        if (payload.status === 'canceled') mark('cancelReason', payload.reason);
        if (payload.status === 'budget_stopped') {
          mark('budgetStopReason', (payload.budget as { stopReason: string }).stopReason);
        }
        if (payload.status === 'failed') {
          const error = payload.error as { code: string; message: string; retryable: boolean };
          mark('terminalFailure', `${error.code}=${error.message}`);
          mark('retryable', error.retryable);
        }
        break;
      }
      default:
        mark('protocolErrorCode', (payload as { code: string }).code);
        if (packet.sessionId === null) mark('boundary', 'null-session');
    }
    if (packet.seq === Number.MAX_SAFE_INTEGER) mark('boundary', 'max-seq');
  }

  const problems: string[] = [];
  const require = (bucket: string, values: readonly unknown[]) => {
    for (const value of values) {
      if (!seen.has(`${bucket}:${String(value)}`)) problems.push(`${bucket}:${String(value)} 未覆盖`);
    }
  };
  require('type', [...EXPECTED.hostTypes, ...EXPECTED.sidecarTypes]);
  require('resumeKind', EXPECTED.resumeKinds);
  require('cancelReason', EXPECTED.cancelReasons);
  require('hostResultStatus', EXPECTED.hostResultStatuses);
  require('workspaceOperation', EXPECTED.workspaceOperations);
  require('capability', EXPECTED.capabilities);
  require('deniedCode', EXPECTED.deniedCodes);
  require('hostFailureCode', EXPECTED.hostFailureCodes);
  require('uncertainCode', ['durability_unknown']);
  require('entryKind', EXPECTED.entryKinds);
  require('disposition', EXPECTED.dispositions);
  require('agentEventKind', EXPECTED.agentEventKinds);
  require('toolName', EXPECTED.toolNames);
  require('toolOutcome', EXPECTED.toolOutcomes);
  require('stopReason', EXPECTED.stopReasons);
  require('terminalStatus', EXPECTED.terminalStatuses);
  require('budgetStopReason', ['turns', 'usd']);
  require('retryable', [true, false]);
  require('hostRequestCapability', ['workspace_write', 'workspace_read']);
  require('protocolErrorCode', EXPECTED.protocolErrorCodes);
  require('boundary', ['empty-list', 'empty-content', 'null-session', 'max-seq']);
  require(
    'terminalFailure',
    Object.entries(EXPECTED.terminalFailureMessages).map(([code, message]) => `${code}=${message}`),
  );
  return problems;
}

describe('product-wire-v1 共享 golden', () => {
  let goldenBytes: Uint8Array;
  let goldenLines: Uint8Array[];

  beforeAll(async () => {
    goldenBytes = await readFile(GOLDEN_PATH);
    goldenLines = splitGoldenLines(goldenBytes);
  });

  it('文件本身没有 BOM / CR / 空行，且行内容互不重复', () => {
    expect(goldenBytes[0]).not.toBe(0xef);
    expect(goldenBytes.includes(0x0d)).toBe(false);
    expect(goldenLines.length).toBeGreaterThan(0);
    for (const line of goldenLines) expect(line.byteLength).toBeGreaterThan(0);
    const texts = goldenLines.map((line) => Buffer.from(line).toString('utf8'));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('每行恰一个方向解成功，并 canonical 重编码为同 bytes', () => {
    const verdicts = goldenLines.map((line, index) => verifyLine(line, index));
    expect(verdicts.filter((verdict) => verdict.problems.length > 0)).toEqual([]);
    expect(verdicts).toHaveLength(goldenLines.length);
  });

  it('两个方向的 type 闭集不相交——「两边都成」在结构上不可能', () => {
    const overlap = HOST_PACKET_TYPES.filter((type) => (SIDECAR_PACKET_TYPES as readonly string[]).includes(type));
    expect(overlap).toEqual([]);
    expect([...HOST_PACKET_TYPES].sort()).toEqual([...EXPECTED.hostTypes].sort());
    expect([...SIDECAR_PACKET_TYPES].sort()).toEqual([...EXPECTED.sidecarTypes].sort());
  });

  it('覆盖闭集：每种 packet/branch/enum 与七枚终态文案都在', () => {
    const packets = goldenLines.map((line, index) => verifyLine(line, index).packet as ProductPacket);
    expect(coverageProblems(packets)).toEqual([]);
  });

  it('反例：缺行 / 重复 / CRLF / BOM / extra key / 数值 lexeme 漂移都触红', () => {
    const packets = goldenLines.map((line, index) => verifyLine(line, index).packet as ProductPacket);

    // 缺行：逐枚拿掉七种终态失败所在那一行，覆盖清点必须点名它。
    for (const [code, message] of Object.entries(EXPECTED.terminalFailureMessages)) {
      const without = packets.filter(
        (packet) =>
          !(
            packet.type === 'terminal' &&
            packet.payload.status === 'failed' &&
            packet.payload.error.code === code &&
            packet.payload.error.message === message
          ),
      );
      expect(coverageProblems(without)).toContain(`terminalFailure:${code}=${message} 未覆盖`);
    }

    // 重复行：唯一性判据必须抓住。
    const texts = goldenLines.map((line) => Buffer.from(line).toString('utf8'));
    const duplicated = [...texts, texts[0]];
    expect(new Set(duplicated).size).not.toBe(duplicated.length);

    const sample = goldenLines[0];
    const sampleText = Buffer.from(sample).toString('utf8');

    // CRLF：行尾多一个 CR。
    expect(verifyLine(Buffer.concat([Buffer.from(sample), Buffer.from([0x0d])]), 0).problems).toEqual([
      expect.stringContaining('两个方向都解失败'),
    ]);

    // BOM。
    expect(verifyLine(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(sample)]), 0).problems).toEqual([
      expect.stringContaining('两个方向都解失败'),
    ]);

    // extra key。
    expect(
      verifyLine(Buffer.from(sampleText.replace('"type":"bootstrap"', '"extra":1,"type":"bootstrap"'), 'utf8'), 0)
        .problems,
    ).toEqual([expect.stringContaining('两个方向都解失败')]);

    // 键序漂移：内容一模一样、只把两枚顶层字段换位，canonical 判据必须当场红。
    // 没有这一条，「重编码等于原 bytes」就可能只是因为原文本恰好怎么写都行。
    expect(
      verifyLine(
        Buffer.from(sampleText.replace('"seq":1,"sessionId":"sess-1"', '"sessionId":"sess-1","seq":1'), 'utf8'),
        0,
      ).problems,
    ).toEqual(['canonical 重编码与原 bytes 不同']);

    // 数值 lexeme 漂移：`0.5` → `0.50` 仍可解，但重编码不再是同 bytes。
    const usdLine = goldenLines
      .map((line) => Buffer.from(line).toString('utf8'))
      .find((text) => text.includes('"maxUsd":0.5'));
    expect(usdLine).toBeDefined();
    expect(verifyLine(Buffer.from(usdLine!.replace('"maxUsd":0.5', '"maxUsd":0.50'), 'utf8'), 0).problems).toEqual([
      'canonical 重编码与原 bytes 不同',
    ]);

    // 字面量漂移：终态文案改一个字即被覆盖清点抓住。
    const drifted = packets.map((packet) =>
      packet.type === 'terminal' && packet.payload.status === 'failed' && packet.payload.error.code === 'unknown'
        ? { ...packet, payload: { ...packet.payload, error: { ...packet.payload.error, message: '未归类的错误' } } }
        : packet,
    ) as ProductPacket[];
    expect(coverageProblems(drifted)).toContain('terminalFailure:unknown=未归类的失败 未覆盖');
  });
});

/**
 * 跨侧核验门（PI-HOST-LOOP-1 §四.1 末句）。
 *
 * Route A 的 expected-side 是 tracked `apps/desktop/src-tauri/pi-sidecar/route-manifest.json`——
 * Rust 以 `include_bytes!` 把它编进 host binary。可它记的是 **product source 编出来的 bundle**
 * 的字节与 SHA：source 一改，manifest 就过时了，而 Rust 侧对此毫无察觉（它只比对 resource
 * 与编译期 bytes 是否一致，两边可以一起旧下去）。
 *
 * 所以这道门必须住在**普通 `pnpm test`** 里：从同一份 product entry 现编一次 CJS，逐值核
 * tracked manifest 的 `bundle.bytes` 与 `bundle.sha256`。source 漂移当场红，不等独占下载
 * 或发布命令才发现。
 */
describe('route manifest 与 product source 的跨侧核验', () => {
  const MANIFEST_URL = new URL('../../../apps/desktop/src-tauri/pi-sidecar/route-manifest.json', import.meta.url);

  it('tracked manifest 的 bundle bytes/SHA 恰等于现编 product CJS', async () => {
    const manifest = JSON.parse(await readFile(MANIFEST_URL, 'utf8')) as {
      schemaVersion: number;
      routeId: string;
      nodeVersion: string;
      useCodeCache: boolean;
      bundle: { resourceRelativePath: string; bytes: number; sha256: string };
      targets: {
        targetTriple: string;
        machoArch: string;
        sourceArchive: { filename: string; bytes: number; sha256: string };
        runtime: { externalBinBasename: string; bytes: number; sha256: string };
      }[];
    };

    const built = await build.buildDeterministicBundle();
    expect(built.reproducible).toBe(true);
    // 逐值：字节数与 SHA 都不许「差不多」。
    expect(manifest.bundle.bytes).toBe(built.bytes);
    expect(manifest.bundle.sha256).toBe(built.sha256);
    expect(manifest.bundle.resourceRelativePath).toBe('pi-loop-resources/sidecar.cjs');
  }, 180_000);

  it('manifest 顶层与两枚 target 逐字段等于本包的冻结真值表', async () => {
    const manifest = JSON.parse(await readFile(MANIFEST_URL, 'utf8')) as Record<string, unknown>;
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.routeId).toBe(build.ROUTE_ID);
    expect(manifest.nodeVersion).toBe(build.NODE_VERSION);
    expect(manifest.useCodeCache).toBe(build.USE_CODE_CACHE);
    expect(Object.keys(manifest).sort()).toEqual(
      ['bundle', 'nodeVersion', 'routeId', 'schemaVersion', 'targets', 'useCodeCache'].sort(),
    );

    const targets = manifest.targets as {
      targetTriple: string;
      machoArch: string;
      sourceArchive: { filename: string; bytes: number; sha256: string };
      runtime: { externalBinBasename: string; bytes: number; sha256: string };
    }[];
    expect(targets).toHaveLength(2);
    // 恰两行并按 targetTriple UTF-8 升序。
    expect(targets.map((target) => target.targetTriple)).toEqual(
      [...targets.map((target) => target.targetTriple)].sort(),
    );
    expect(new Set(targets.map((target) => target.targetTriple)).size).toBe(2);

    for (const target of targets) {
      const frozen = build.TARGETS.find((candidate) => candidate.targetTriple === target.targetTriple);
      expect(frozen).toBeDefined();
      expect(Object.keys(target).sort()).toEqual(['machoArch', 'runtime', 'sourceArchive', 'targetTriple'].sort());
      expect(target.machoArch).toBe(frozen!.machoArch);
      expect(target.sourceArchive).toEqual({
        filename: frozen!.archive.filename,
        bytes: frozen!.archive.bytes,
        sha256: frozen!.archive.sha256,
      });
      expect(target.runtime).toEqual({
        externalBinBasename: build.SIDECAR_BASENAME,
        bytes: frozen!.runtime.bytes,
        sha256: frozen!.runtime.sha256,
      });
      // 0/null/TODO/placeholder 一律拒。
      for (const bytes of [target.sourceArchive.bytes, target.runtime.bytes]) {
        expect(Number.isSafeInteger(bytes)).toBe(true);
        expect(bytes).toBeGreaterThan(0);
      }
      for (const sha of [target.sourceArchive.sha256, target.runtime.sha256]) {
        expect(sha).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });
});
