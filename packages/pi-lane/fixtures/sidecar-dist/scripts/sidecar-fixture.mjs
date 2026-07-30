/**
 * PI-SIDECAR-DIST-1 · 被测 sidecar fixture。
 *
 * 这不是产品 sidecar，也**不是** ADR-022 六-B 的生产 wire：那份契约由 `PI-CODE-STDIO-1`
 * 实现，本票禁止触碰。这里只需要一个「会真实 import pi core、真跑一轮 tool loop、
 * 能被 abort、能按令崩溃」的进程，用来量两条分发路线的体积/冷启/stdio/abort/崩溃回收。
 *
 * 真实性判据（决定分发结论是否可信）：
 * - 经 `../../../dist/index.js` 载入 `@courtwork/pi-lane`，从而把 pi core 的 `Agent`、
 *   TypeBox 校验、pi-ai 的 provider 目录与 DeepSeek profile 一并拉进模块图——
 *   sealed bundle 与 SEA 打进去的是这整张图，不是一个空壳 import。
 * - provider 用 pi-ai 自带 faux：确定性、不触网、不耗额度。分发实验量的是进程与打包，
 *   不是模型。
 *
 * 与生产形态的两处已知偏离，如实登记，不得反推为产品设计：
 * 1. `ready` 在启动即发（生产是 host 先 bootstrap、sidecar 再 ready）——因为冷启动的定义
 *    就是「spawn 到 sidecar 可服务」，先等一个入包会把 host 调度混进读数。
 * 2. 授权根经 `init` 包给出，非 argv、非环境变量；这一点与生产的 stdin bootstrap 同向。
 */

import { createHash } from 'node:crypto';

import {
  createPiLaneSession,
  PI_LANE_MODEL_ID,
  READ_ONLY_TOOL_NAMES,
} from '../../../dist/index.js';
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
} from '@earendil-works/pi-ai';

const MAX_LINE_BYTES = 8 * 1024 * 1024;

/** stdout 一行一个 JSON。写失败不吞：分发实验里 stdout 断了就是结论本身。 */
function emit(packet) {
  process.stdout.write(`${JSON.stringify(packet)}\n`);
}

function seaState() {
  // node:sea 在 SEA 与非 SEA 下都可 import；`isSea()` 是「这确实是单可执行文件」的一手证据。
  try {
    const sea = process.getBuiltinModule ? process.getBuiltinModule('node:sea') : undefined;
    if (!sea) return 'unavailable';
    return sea.isSea() ? 'sea' : 'not-sea';
  } catch (cause) {
    return `error:${cause instanceof Error ? cause.message : String(cause)}`;
  }
}

let session;
let running = false;

async function ensureSession(root) {
  const faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1' }] });
  const models = createModels();
  models.setProvider(faux.provider);
  session = {
    faux,
    lane: await createPiLaneSession({
      root,
      models,
      model: faux.getModel(),
      limits: { maxTurns: 12, maxUsd: 1 },
    }),
  };
  return session;
}

/**
 * 慢流：faux 按 `tokensPerSecond` 节流，且逐块检查 abort signal（0.82.1 实测）。
 * 这让 abort 有一个真实的在途窗口可打断，而不是「abort 一个已经结束的回合」。
 */
async function ensureSlowSession(root, tokensPerSecond) {
  const faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-slow' }], tokensPerSecond });
  const models = createModels();
  models.setProvider(faux.provider);
  session = {
    faux,
    lane: await createPiLaneSession({
      root,
      models,
      model: faux.getModel(),
      limits: { maxTurns: 12, maxUsd: 1 },
    }),
  };
  return session;
}

const handlers = {
  ping: (packet) => emit({ op: 'pong', id: packet.id, uptimeMs: process.uptime() * 1000 }),

  /** 大 payload 往返：证明 stdio 在两条路线下都不截断、不改字节。 */
  echo: (packet) => {
    const text = String(packet.text ?? '');
    emit({
      op: 'echoed',
      id: packet.id,
      byteLength: Buffer.byteLength(text, 'utf8'),
      sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
    });
  },

  init: async (packet) => {
    const started = process.hrtime.bigint();
    const created = await ensureSession(packet.root);
    emit({
      op: 'inited',
      id: packet.id,
      root: created.lane.root === packet.root ? 'as-given' : 'normalized',
      tools: [...READ_ONLY_TOOL_NAMES],
      productModelId: PI_LANE_MODEL_ID,
      sessionSetupMs: Number(process.hrtime.bigint() - started) / 1e6,
    });
  },

  /** 真跑一轮 loop：模型请求 read → 容器执行 → 结果回灌 → 收尾文本。 */
  run: async (packet) => {
    if (!session) throw new Error('run before init');
    running = true;
    session.faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: packet.file })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('读毕。')]),
    ]);
    const toolNames = [];
    const unsubscribe = session.lane.subscribe((event) => {
      if (event.type === 'tool_execution_end') toolNames.push(event.toolName);
    });
    await session.lane.prompt(packet.prompt ?? '读一下这份文件');
    unsubscribe();
    running = false;
    const last = session.lane.messages().at(-1);
    emit({
      op: 'ran',
      id: packet.id,
      toolsExecuted: toolNames,
      turns: session.lane.budget.snapshot().turns,
      lastRole: last?.role ?? null,
    });
  },

  /** 慢流回合：发出 `running` 后即在途，等 abort 打断。 */
  slow: async (packet) => {
    const created = await ensureSlowSession(packet.root, packet.tokensPerSecond ?? 2);
    created.faux.setResponses([fauxAssistantMessage(String(packet.text ?? 'x '.repeat(400)))]);
    running = true;
    emit({ op: 'running', id: packet.id });
    const started = process.hrtime.bigint();
    await created.lane.prompt('慢流回合');
    running = false;
    const last = created.lane.messages().at(-1);
    emit({
      op: 'slow-ended',
      id: packet.id,
      elapsedMs: Number(process.hrtime.bigint() - started) / 1e6,
      stopReason: last?.role === 'assistant' ? (last.stopReason ?? null) : null,
    });
  },

  abort: (packet) => {
    session?.lane.abort();
    emit({ op: 'aborted', id: packet.id, wasRunning: running });
  },

  /** 按令崩溃：三种形态分别对应「未捕获异常 / 显式非零退出 / 挂死等外部 SIGKILL」。 */
  crash: (packet) => {
    if (packet.kind === 'exit') {
      emit({ op: 'crashing', id: packet.id, kind: 'exit' });
      process.exit(7);
    }
    if (packet.kind === 'hang') {
      emit({ op: 'crashing', id: packet.id, kind: 'hang' });
      // 永不返回：让父进程走 SIGKILL 回收路径。
      setTimeout(() => {}, 2_147_483_647);
      return;
    }
    emit({ op: 'crashing', id: packet.id, kind: 'throw' });
    // 下一个 tick 抛，保证上面的 stdout 已经排出。
    setTimeout(() => {
      throw new Error('pi-sidecar-dist fixture: deliberate uncaught crash');
    }, 0);
  },

  exit: (packet) => {
    emit({ op: 'exiting', id: packet.id });
    process.exit(0);
  },
};

/**
 * 控制面必须旁路串行队列。
 *
 * 实测教训（本票第一轮八枚产物 abort 全红的真因）：若把 stdin 每个包都挂在同一条
 * `queue.then(...)` 上，`abort` 就排在正在跑的 `slow` 后面，永远等不到执行——
 * 取消对在途回合结构性不可达。生产 sidecar 的 `cancel`（ADR-022 六-B.1）同理：
 * 它按定义就是要打断在途 prompt，不能与 prompt 共用一条串行链。
 */
const IMMEDIATE_OPS = new Set(['abort', 'ping', 'crash', 'exit']);

async function dispatch(line) {
  let packet;
  try {
    packet = JSON.parse(line);
  } catch (cause) {
    emit({ op: 'error', reason: 'invalid-json', message: String(cause) });
    return;
  }
  const handler = handlers[packet.op];
  if (!handler) {
    emit({ op: 'error', id: packet.id ?? null, reason: 'unknown-op', message: String(packet.op) });
    return;
  }
  try {
    await handler(packet);
  } catch (cause) {
    emit({
      op: 'error',
      id: packet.id ?? null,
      reason: 'handler-failed',
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

/** 只窥 `op` 一个字段决定走哪条链；解析失败留给 dispatch 报 invalid-json。 */
function isImmediate(line) {
  try {
    return IMMEDIATE_OPS.has(JSON.parse(line).op);
  } catch {
    return false;
  }
}

let pending = Buffer.alloc(0);
let queue = Promise.resolve();

process.stdin.on('data', (chunk) => {
  pending = pending.length === 0 ? chunk : Buffer.concat([pending, chunk]);
  for (;;) {
    const index = pending.indexOf(0x0a);
    if (index < 0) {
      if (pending.length > MAX_LINE_BYTES) {
        emit({ op: 'error', reason: 'line-too-large', message: String(pending.length) });
        process.exit(9);
      }
      return;
    }
    const line = pending.subarray(0, index).toString('utf8');
    pending = pending.subarray(index + 1);
    if (line.length === 0) continue;
    if (isImmediate(line)) void dispatch(line);
    else queue = queue.then(() => dispatch(line));
  }
});

// stdin EOF 即退出：宿主消失后不留孤儿。分发实验会实测这条。
process.stdin.on('end', () => {
  process.exit(0);
});

emit({
  op: 'ready',
  node: process.version,
  arch: process.arch,
  platform: process.platform,
  sea: seaState(),
  execPath: process.execPath,
  uptimeMs: process.uptime() * 1000,
});
