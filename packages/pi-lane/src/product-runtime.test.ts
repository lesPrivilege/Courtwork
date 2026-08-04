import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Agent, type AgentTool, type ExecutionEnv } from '@earendil-works/pi-agent-core';
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
  type Context,
  type Model,
  type SimpleStreamOptions,
} from '@earendil-works/pi-ai';
import { beforeEach, describe, expect, it } from 'vitest';

import { CASE_LOGICAL_ROOT, createProductCaseEnv } from './product-case-env.js';
import {
  decodeSidecarPacketLine,
  encodePacketLine,
  type BootstrapPayload,
  type HostPacket,
  type HostResultPayload,
  type SidecarPacket,
  type WorkspaceHostRequest,
} from './product-protocol.js';
import {
  PRODUCT_CAPABILITIES,
  PRODUCT_PROMPT_ID,
  PRODUCT_SYSTEM_PROMPT,
  PRODUCT_SYSTEM_PROMPT_MAX_BYTES,
  createDeepSeekProviderBinding,
  createProductRuntime,
  withExplicitApiKey,
  type ProductProviderBinding,
} from './product-runtime.js';
import { createProductSidecarSession } from './product-stdio.js';
import { createPiLaneSession } from './session.js';
import { createReadOnlyTools } from './tools.js';

/**
 * 产品 runtime（PI-HOST-LOOP-1 §二.2、§四.6）。
 *
 * 施工序留档：本文件的 first-red 是「同 leg 第二个 prompt 不得重置累计预算」——在产品
 * runtime 落地前，那条断言直接指向现行 `createPiLaneSession`，红在 `session.ts:107`
 * （`prompt()` 里的 `budget.reset()`）。收紧后它改为对产品 runtime 断言，dev 那份以
 * **反例**形态留在本文件末尾。
 */

let caseRoot: string;
let faux: ReturnType<typeof fauxProvider>;
let models: ReturnType<typeof createModels>;
let model: Model<string>;

const CONTROL_KEY = 'sk-dummy-in-memory-key';
const MODEL_ID = 'faux-1';

type Harness = {
  readonly packets: SidecarPacket[];
  readonly exits: number[];
  readonly runtime: ReturnType<typeof createProductRuntime>;
  readonly streamOptions: (SimpleStreamOptions | undefined)[];
  send(packet: HostPacket): void;
  bootstrap(overrides?: Partial<BootstrapPayload>): void;
  prompt(text: string, requestId: string): Promise<void>;
  kinds(): string[];
  terminals(): Extract<SidecarPacket, { type: 'terminal' }>['payload'][];
  hostRequests(): WorkspaceHostRequest[];
};

/**
 * 受测宿主替身：收到 `host_request` 就按脚本回一枚 `host_result`。
 *
 * 它**不执行任何 effect**——本文件证的是 Node 侧装配（提案、两段式接缝、投影与收束），
 * 真实落盘、授权账本与屏障在 Rust（`pi_loop`/`pi_loop_workspace`）自有反例门。
 * 回包排在 microtask 里：状态机禁止在 runtime callback 内同步 `receive`，而 tool execute
 * 本就跑在 agent loop 的异步段，这里只是把「宿主不会同步答复」这条事实照实建模。
 */
type ScriptedHost = (request: WorkspaceHostRequest) => HostResultPayload | Promise<HostResultPayload>;

const hostWriteOk: ScriptedHost = (request) => ({
  operationId: request.operationId,
  capability: 'workspace_write',
  operation: 'write',
  status: 'ok',
  value:
    request.capability === 'workspace_write'
      ? {
          logicalPath: request.arguments.logicalPath,
          disposition: 'created',
          contentSha256: request.arguments.contentSha256,
          byteLength: request.arguments.byteLength,
        }
      : { logicalPath: '', disposition: 'created', contentSha256: '', byteLength: 0 },
});

/**
 * 读写通吃的脚本宿主（`PI-WORKSPACE-READ-1`）。workspace 用一张内存表建模，
 * 写入照收、读回同一份字节——`byte-identical read-back` 在本文件就是这张表进出的逐值相等。
 */
function scriptedWorkspaceHost(initial: Record<string, string> = {}): {
  host: ScriptedHost;
  files: Map<string, string>;
} {
  const files = new Map(Object.entries(initial));
  const encoder = new TextEncoder();
  // 真 SHA-256：读面容器会重算并逐值比对，喂假 hash 等于把回读双验那道门自己拆了。
  const sha256 = async (value: string) => {
    const bytes = encoder.encode(value);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  };
  const childrenOf = (directory: string) => {
    const prefix = directory === '.' ? '' : `${directory}/`;
    const names = new Map<string, 'file' | 'directory'>();
    for (const logical of files.keys()) {
      if (!logical.startsWith(prefix)) continue;
      const rest = logical.slice(prefix.length);
      if (rest.length === 0) continue;
      const cut = rest.indexOf('/');
      if (cut === -1) names.set(rest, 'file');
      else names.set(rest.slice(0, cut), 'directory');
    }
    return [...names].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  };
  const host: ScriptedHost = async (request) => {
    if (request.capability === 'workspace_write') {
      files.set(request.arguments.logicalPath, request.arguments.content);
      return {
        operationId: request.operationId,
        capability: 'workspace_write',
        operation: 'write',
        status: 'ok',
        value: {
          logicalPath: request.arguments.logicalPath,
          disposition: 'created',
          contentSha256: request.arguments.contentSha256,
          byteLength: request.arguments.byteLength,
        },
      };
    }
    const { operation, logicalPath } = request.arguments;
    if (operation === 'exists') {
      return {
        operationId: request.operationId,
        capability: 'workspace_read',
        operation: 'exists',
        status: 'ok',
        value: { logicalPath, exists: files.has(logicalPath) || childrenOf(logicalPath).length > 0 },
      };
    }
    if (operation === 'read_file') {
      const content = files.get(logicalPath);
      if (content === undefined) {
        return {
          operationId: request.operationId,
          capability: 'workspace_read',
          operation: 'read_file',
          status: 'failed',
          error: { code: 'not_found', message: '目标不存在' },
        };
      }
      return {
        operationId: request.operationId,
        capability: 'workspace_read',
        operation: 'read_file',
        status: 'ok',
        value: {
          logicalPath,
          content,
          contentSha256: await sha256(content),
          byteLength: encoder.encode(content).byteLength,
        },
      };
    }
    const entries = childrenOf(logicalPath);
    if (logicalPath !== '.' && entries.length === 0) {
      return {
        operationId: request.operationId,
        capability: 'workspace_read',
        operation: 'list',
        status: 'failed',
        error: { code: 'not_found', message: '目标不存在' },
      };
    }
    return {
      operationId: request.operationId,
      capability: 'workspace_read',
      operation: 'list',
      status: 'ok',
      value: {
        logicalPath,
        entries: entries.map(([name, kind]) => ({
          name,
          kind,
          byteLength: kind === 'file' ? encoder.encode(files.get(`${logicalPath === '.' ? '' : `${logicalPath}/`}${name}`) ?? '').byteLength : null,
          mtimeMs: 1,
        })),
      },
    };
  };
  return { host, files };
}

function bootstrapPayload(overrides: Partial<BootstrapPayload> = {}): BootstrapPayload {
  return {
    containerId: 'container-1',
    grantId: 'grant-1',
    caseRoot,
    provider: { id: 'deepseek', modelId: MODEL_ID, apiKey: CONTROL_KEY },
    limits: { maxTurns: 12, maxUsd: null },
    resume: { kind: 'fresh', leg: 1, priorObservedTurns: 0, priorTurns: 0, priorUsd: 0 },
    ...overrides,
  };
}

function createHarness(host?: ScriptedHost): Harness {
  const packets: SidecarPacket[] = [];
  const exits: number[] = [];
  const streamOptions: (SimpleStreamOptions | undefined)[] = [];
  let seq = 0;
  let answer: ((packet: Extract<SidecarPacket, { type: 'host_request' }>) => void) | null = null;

  const runtime = createProductRuntime({
    createProvider: ({ modelId, apiKey }): ProductProviderBinding => {
      expect(apiKey).toBe(CONTROL_KEY);
      const target = faux.getModel(modelId);
      if (!target) throw new Error(`scripted catalog 里没有 ${modelId}`);
      return {
        model: target,
        streamSimple: withExplicitApiKey((currentModel, context: Context, options) => {
          streamOptions.push(options);
          return models.streamSimple(currentModel, context, options);
        }, apiKey),
      };
    },
  });

  const session = createProductSidecarSession({
    transport: {
      write(line) {
        const decoded = decodeSidecarPacketLine(line.subarray(0, line.byteLength - 1));
        if (!decoded.ok) throw new Error(`sidecar 出包不合契约：${decoded.reason}`);
        packets.push(decoded.packet);
        if (decoded.packet.type === 'host_request' && answer !== null) answer(decoded.packet);
      },
      exit(code) {
        exits.push(code);
      },
    },
    runtime,
  });
  runtime.bind(session);

  const send = (packet: HostPacket) => {
    const encoded = encodePacketLine(packet);
    if (!encoded.ok) throw new Error(`host 入包不合契约：${encoded.reason}`);
    session.receive(encoded.line);
  };

  if (host !== undefined) {
    answer = (packet) => {
      // 允许脚本宿主异步出结果：`read_file` 的 hash 走 `crypto.subtle`，而它是异步的。
      void Promise.resolve(host(packet.payload)).then((payload) => {
        seq += 1;
        send({
          protocolVersion: 1,
          seq,
          sessionId: packet.sessionId,
          requestId: packet.requestId,
          type: 'host_result',
          payload,
        });
      });
    };
  }

  return {
    packets,
    exits,
    runtime,
    streamOptions,
    send,
    bootstrap(overrides) {
      seq += 1;
      send({
        protocolVersion: 1,
        seq,
        sessionId: 'session-1',
        requestId: null,
        type: 'bootstrap',
        payload: bootstrapPayload(overrides),
      });
    },
    async prompt(text, requestId) {
      seq += 1;
      send({
        protocolVersion: 1,
        seq,
        sessionId: 'session-1',
        requestId,
        type: 'prompt',
        payload: { text },
      });
      await runtime.settled();
    },
    kinds: () =>
      packets
        .filter((packet): packet is Extract<SidecarPacket, { type: 'agent_event' }> => packet.type === 'agent_event')
        .map((packet) =>
          packet.payload.kind === 'tool_started' ||
          packet.payload.kind === 'tool_progress' ||
          packet.payload.kind === 'tool_finished'
            ? `${packet.payload.kind}:${packet.payload.toolCallId}`
            : packet.payload.kind,
        ),
    terminals: () =>
      packets
        .filter((packet): packet is Extract<SidecarPacket, { type: 'terminal' }> => packet.type === 'terminal')
        .map((packet) => packet.payload),
    hostRequests: () =>
      packets
        .filter((packet): packet is Extract<SidecarPacket, { type: 'host_request' }> => packet.type === 'host_request')
        .map((packet) => packet.payload),
  };
}

beforeEach(async () => {
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-host-runtime-')));
  caseRoot = path.join(sandbox, '案卷');
  await mkdir(caseRoot);
  await writeFile(path.join(caseRoot, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n');
  await writeFile(path.join(caseRoot, '证人.md'), '证人 张三\n');

  faux = fauxProvider({ provider: 'faux', models: [{ id: MODEL_ID }] });
  models = createModels();
  models.setProvider(faux.provider);
  model = faux.getModel();
});

describe('md-work-v1 system prompt', () => {
  it('exact snapshot：六行以 LF 相连、末尾无 LF', () => {
    expect(PRODUCT_PROMPT_ID).toBe('md-work-v1');
    expect(PRODUCT_SYSTEM_PROMPT).toBe(
      '你是一名文档工作助手；回答与写入都只能基于实际读到的内容，读不到、被截断或没读过就直说，不猜。\n' +
        '你有两个逻辑根：/case 是只读案件材料，/workspace 是你的过程草稿区；一律用逻辑路径，不猜测、不回显任何物理路径与凭证。\n' +
        '在 /workspace 新建或改写 Markdown 只有一种方式：用 write 覆盖式整体写入，目标 basename 必须以 .md 结尾且扩展名前至少一个字符。\n' +
        '覆盖既有文件前先读它；每次写入后回读确认，并把最终逻辑路径报告给用户。\n' +
        '你没有 edit、delete、rename、把文件晋升到用户目录或执行命令的能力，也不得声称做过这些。\n' +
        '一次写入是否真的发生只由宿主的授权结果与 journal 决定；工具文案不是证据，未获授权或结果未确认就如实说明。',
    );
    expect(PRODUCT_SYSTEM_PROMPT.endsWith('\n')).toBe(false);
    expect(PRODUCT_SYSTEM_PROMPT.split('\n')).toHaveLength(6);
  });

  /**
   * ADR-022 六-0 的六条语义逐条在场。exact snapshot 只锁「一个字都没变」，
   * 这一枚锁的是**变的时候仍必须还是那六条**——改写 prompt 时两枚一起红才说明是有意换语义。
   */
  it('六行逐条覆盖 ADR-022 六-0 点名的六条语义', () => {
    const lines = PRODUCT_SYSTEM_PROMPT.split('\n');
    expect(lines[0]).toContain('实际读到');
    expect(lines[1]).toContain('/case');
    expect(lines[1]).toContain('/workspace');
    expect(lines[2]).toContain('write');
    expect(lines[2]).toContain('.md');
    expect(lines[3]).toContain('回读');
    expect(lines[4]).toContain('edit');
    expect(lines[4]).toContain('rename');
    expect(lines[5]).toContain('journal');
    for (const line of lines) expect(line.trim().length).toBeGreaterThan(0);
  });

  it('不超过 2048 字节，且不夹带工具 schema、plan 格式或垂类正文', () => {
    expect(Buffer.byteLength(PRODUCT_SYSTEM_PROMPT, 'utf8')).toBeLessThanOrEqual(PRODUCT_SYSTEM_PROMPT_MAX_BYTES);
    // 六-0 明禁：复制工具 schema、注入 coding playbook、Dossier 正文、plan 格式或营销人格。
    for (const forbidden of ['{"type"', 'parameters', 'JSON Schema', 'Dossier', '卷宗', 'plan:', 'Courtwork']) {
      expect(PRODUCT_SYSTEM_PROMPT).not.toContain(forbidden);
    }
  });
});

describe('provider 装配', () => {
  it('key 显式进入本次 streamSimple options，且不覆盖调用方其余 options', () => {
    const seen: (SimpleStreamOptions | undefined)[] = [];
    const wrapped = withExplicitApiKey((_model, _context, options) => {
      seen.push(options);
      return undefined as never;
    }, 'sk-explicit');
    wrapped(model, [] as unknown as Context, { temperature: 0.2 } as SimpleStreamOptions);
    expect(seen[0]).toEqual({ temperature: 0.2, apiKey: 'sk-explicit' });
  });

  it('production binding 取 pi-ai 0.82.1 的 DeepSeek catalog', () => {
    const binding = createDeepSeekProviderBinding({ modelId: 'deepseek-v4-flash', apiKey: 'sk-x' });
    expect(binding.model.provider).toBe('deepseek');
    expect(binding.model.id).toBe('deepseek-v4-flash');
  });

  it('目录里没有的型号显式抛出，不回落其他型号', () => {
    expect(() => createDeepSeekProviderBinding({ modelId: '并不存在的型号', apiKey: 'sk-x' })).toThrow('不回落');
  });

  it('runtime 用 bootstrap 的内存 key，每一次 stream 都带着它', async () => {
    faux.setResponses([fauxAssistantMessage([fauxText('好')])]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('第一句', 'request-1');
    expect(harness.streamOptions).not.toHaveLength(0);
    for (const options of harness.streamOptions) {
      expect(options?.apiKey).toBe(CONTROL_KEY);
    }
  });
});

describe('bootstrap → ready', () => {
  /**
   * `workspace_write` 进闭集是 `PI-WRITE-HOST-1` ⑤ 的握手改动，`workspace_read` 是
   * `PI-WORKSPACE-READ-1` 的，两枚都与 Rust `EXPECTED_CAPABILITIES` 同批。字典序不是排版：
   * 状态机按字典序归一，Rust 逐值比对，顺序错一位就是 capability 漂移。
   */
  it('ready 恰宣告 case_read、workspace_read 与 workspace_write，按字典序', () => {
    const harness = createHarness();
    harness.bootstrap();
    const ready = harness.packets.find((packet) => packet.type === 'ready');
    expect(ready?.type).toBe('ready');
    if (ready?.type !== 'ready') return;
    expect(ready.payload.capabilities).toEqual([...PRODUCT_CAPABILITIES]);
    expect(ready.payload.capabilities).toEqual(['case_read', 'workspace_read', 'workspace_write']);
  });

  it('modelId 只认 bootstrap 给的那一个，目录里没有就不出 ready', () => {
    const harness = createHarness();
    expect(() => harness.bootstrap({ provider: { id: 'deepseek', modelId: '并不存在的型号', apiKey: CONTROL_KEY } })).toThrow();
    expect(harness.packets.some((packet) => packet.type === 'ready')).toBe(false);
  });

  it('一条 leg 只接受一枚 bootstrap', () => {
    const harness = createHarness();
    harness.bootstrap();
    expect(() => harness.bootstrap()).not.toThrow();
    // 第二枚 bootstrap 由状态机以 state_violation 收场，runtime 不会再造第二枚 Agent。
    expect(harness.runtime.agentCount()).toBe(1);
    expect(harness.packets.some((packet) => packet.type === 'protocol_error')).toBe(true);
  });
});

describe('真实 read loop（scripted stream，零网络）', () => {
  it('read 经 /case 容器真执行，结果回灌，终态 completed', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '/case/备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('合同编号是 HT-2024-081。')]),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('备忘里的合同编号是多少', 'request-1');

    expect(harness.kinds()).toContain('tool_started:tc_1_1');
    expect(harness.kinds()).toContain('tool_finished:tc_1_1');
    const finished = harness.packets.find(
      (packet) => packet.type === 'agent_event' && packet.payload.kind === 'tool_finished',
    );
    expect(finished?.type === 'agent_event' && finished.payload.kind === 'tool_finished' && finished.payload.outcome).toBe(
      'succeeded',
    );
    expect(harness.terminals()).toEqual([
      { status: 'completed', budget: { turns: 2, usd: 0, turnLimit: 'open', usdLimit: 'disabled', stopReason: null } },
    ]);
    expect(JSON.stringify(harness.runtime.messages())).toContain('HT-2024-081');
  });

  /**
   * `/case` 侧的读**仍然**一枚 operation 都不铸：那一根是 Node 直读容器。
   * `PI-WORKSPACE-READ-1` 改的只是 `/workspace` 那一根——两根各自的账在此分开钉住，
   * 否则「读面开始发 host request 了」会顺手把 `/case` 的直读性质一起冲掉。
   */
  it('起点落在 /case 时读面一枚 operation 都不申请，host_request 恰零', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('glob', { pattern: '**/*.md', path: '/case' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('读完了。')]),
    ]);
    const harness = createHarness(hostWriteOk);
    harness.bootstrap();
    await harness.prompt('先列再读', 'request-1');
    expect(harness.hostRequests()).toEqual([]);
    expect(harness.terminals().at(-1)?.status).toBe('completed');
  });

  it('起点落在 /workspace 时读面走 host-mediated：capability 恰为 workspace_read', async () => {
    const { host } = scriptedWorkspaceHost({ '简报.md': '# 简报\n结论一\n' });
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('glob', { pattern: '**/*.md', path: '/workspace' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('工作稿里有一份简报。')]),
    ]);
    const harness = createHarness(host);
    harness.bootstrap();
    await harness.prompt('看看工作稿', 'request-1');
    const requests = harness.hostRequests();
    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) expect(request.capability).toBe('workspace_read');
    expect(requests.map((request) => request.capability === 'workspace_read' && request.arguments.operation)).toContain('list');
    // 物理坐标零泄漏：wire 上恒是裸逻辑路径，根写作 `.`。
    for (const request of requests) {
      if (request.capability !== 'workspace_read') continue;
      expect(request.arguments.logicalPath.startsWith('/')).toBe(false);
      expect(request.arguments.logicalPath).not.toContain(caseRoot);
    }
    expect(JSON.stringify(harness.runtime.messages())).toContain('/workspace/简报.md');
  });

  it('模型给相对路径也走同一容器，工具结果不含物理根', async () => {
    const { host } = scriptedWorkspaceHost();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('grep', { pattern: '张三' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('证人是张三。')]),
    ]);
    const harness = createHarness(host);
    harness.bootstrap();
    await harness.prompt('证人是谁', 'request-1');
    const transcript = JSON.stringify(harness.runtime.messages());
    expect(transcript).toContain('/case/证人.md');
    expect(transcript).not.toContain(caseRoot);
    // 双根检索的出面恒是逻辑绝对路径：`../workspace` 这一形态结构性不存在。
    expect(transcript).not.toContain('../workspace');
  });

  /**
   * 票面的闭环判据：write → 批准 → 落盘 → **同 leg 内**逐字节回读。
   * 这里的「落盘」由脚本宿主的内存表建模，Rust 真件的屏障与原子性由 `pi_loop_workspace`
   * 自有反例门承担；本文件只证 Node 侧那一半——回读拿到的就是写出去的那份字节。
   */
  it('write → 回读：同一 leg 内 byte-identical，且回读双验真的在跑', async () => {
    const content = '# 简报\n合同编号 HT-2024-081\n附：签署地 临江\n';
    const { host, files } = scriptedWorkspaceHost();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('write', { path: '简报.md', content })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxToolCall('read', { path: '/workspace/简报.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('已写入并回读确认：/workspace/简报.md')]),
    ]);
    const harness = createHarness(host);
    harness.bootstrap();
    await harness.prompt('写一份简报再回读', 'request-1');

    expect(files.get('简报.md')).toBe(content);
    const transcript = JSON.stringify(harness.runtime.messages());
    // 回读的正文逐字出现在 transcript 里（JSON 转义后按同一口径比对）。
    expect(transcript).toContain(JSON.stringify(content).slice(1, -1));
    const capabilities = harness.hostRequests().map((request) => request.capability);
    expect(capabilities[0]).toBe('workspace_write');
    expect(capabilities.slice(1).every((capability) => capability === 'workspace_read')).toBe(true);
    expect(harness.terminals().at(-1)?.status).toBe('completed');
  });

  it('cancel 后终态是 canceled，且 cancel 之后不再出 delta', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('继续')]),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    harness.send({
      protocolVersion: 1,
      seq: 2,
      sessionId: 'session-1',
      requestId: 'request-1',
      type: 'prompt',
      payload: { text: '慢慢读' },
    });
    harness.send({
      protocolVersion: 1,
      seq: 3,
      sessionId: 'session-1',
      requestId: 'request-1',
      type: 'cancel',
      payload: { reason: 'user' },
    });
    await harness.runtime.settled();
    const terminal = harness.terminals().at(-1);
    expect(terminal?.status).toBe('canceled');
  });
});

/**
 * write 装配（`PI-WRITE-HOST-1` ⑤）。
 *
 * 本组只证 **Node 侧装配**：模型的一次 `write` 经极薄 binder → invocation-scoped 虚拟 env →
 * 两段式接缝（reserve op → send host_request）→ 等宿主的 `host_result` → 收束工具账。
 * 落盘、逐次授权与持久化屏障全在 Rust，本文件的宿主替身**不执行任何 effect**，
 * 因此这里的绿不构成「写面已放行」。
 */
describe('write 装配：提案上 wire、effect 归宿主', () => {
  const writeCall = (path: string, content: string) =>
    fauxAssistantMessage([fauxToolCall('write', { path, content })], { stopReason: 'toolUse' });

  it('模型一次 write ⇒ 恰一枚 host_request，八字段逐值可独立重算', async () => {
    const content = '# 摘要\n合同编号 HT-2024-081。\n';
    faux.setResponses([writeCall('brief.md', content), fauxAssistantMessage([fauxText('已写入 /workspace/brief.md。')])]);
    const harness = createHarness(hostWriteOk);
    harness.bootstrap();
    await harness.prompt('写一份摘要', 'request-1');

    const requests = harness.hostRequests();
    expect(requests).toHaveLength(1);
    const request = requests[0];
    expect(request.capability).toBe('workspace_write');
    if (request.capability !== 'workspace_write') return;
    // logicalPath 不带 /workspace 前缀（ADR-022 六-B.2）。
    expect(request.arguments.logicalPath).toBe('brief.md');
    expect(request.arguments.content).toBe(content);
    // 独立重算：production 走 crypto.subtle，这里走 node:crypto，避免同源假绿。
    expect(request.arguments.contentSha256).toBe(createHash('sha256').update(content, 'utf8').digest('hex'));
    expect(request.arguments.byteLength).toBe(Buffer.byteLength(content, 'utf8'));
    // op 由状态机铸，不由 binder 预分配。
    expect(request.operationId).toBe('op_1_1');

    /*
     * proposalHash 的**生产者**自本票起真实存在（此前 wire 上只有测试喂的常量）。
     * 这里按 ADR-022 六-B.2 的 `frame(x)=u32be(len)||UTF8(x)` 独立重算一遍：它同时证明
     * 绑定的 session/request/operation 三枚 id 都是**本次**的，而不是某个冻结在 bind 时的旧值。
     * Rust 侧的重算与 `hash_mismatch` 反例是 ⑥ 的债（④ 回执 §八.2），本枚给它留下可比对的真值。
     */
    const frame = (value: string): Buffer => {
      const body = Buffer.from(value, 'utf8');
      const header = Buffer.alloc(4);
      header.writeUInt32BE(body.byteLength, 0);
      return Buffer.concat([header, body]);
    };
    const expected = createHash('sha256')
      .update(
        Buffer.concat(
          [
            'courtwork.pi.workspace_write.v1',
            'session-1',
            'request-1',
            request.operationId,
            request.arguments.logicalPath,
            String(request.arguments.byteLength),
            request.arguments.contentSha256,
          ].map(frame),
        ),
      )
      .digest('hex');
    expect(request.proposalHash).toBe(expected);
  });

  it('公开 tc 与 operation 对得上：一枚 tool call 恰一枚 operation，收束按 host status', async () => {
    faux.setResponses([writeCall('notes/会议纪要.md', '记录'), fauxAssistantMessage([fauxText('写好了。')])]);
    const harness = createHarness(hostWriteOk);
    harness.bootstrap();
    await harness.prompt('记一笔', 'request-1');

    expect(harness.kinds().filter((kind) => kind.startsWith('tool_'))).toEqual([
      'tool_started:tc_1_1',
      'tool_finished:tc_1_1',
    ]);
    const finished = harness.packets.flatMap((packet) =>
      packet.type === 'agent_event' && packet.payload.kind === 'tool_finished' ? [packet.payload] : [],
    );
    expect(finished.map((event) => [event.toolName, event.outcome])).toEqual([['write', 'succeeded']]);
    expect(harness.hostRequests().map((request) => request.operationId)).toEqual(['op_1_1']);
    expect(harness.terminals().at(-1)?.status).toBe('completed');
  });

  it('host 拒绝时工具账是 denied，不是失败更不是成功', async () => {
    faux.setResponses([writeCall('brief.md', '正文'), fauxAssistantMessage([fauxText('没有获得授权。')])]);
    const harness = createHarness((request) => ({
      operationId: request.operationId,
      capability: 'workspace_write',
      operation: 'write',
      status: 'denied',
      error: { code: 'policy_denied', message: '本次未获授权' },
    }));
    harness.bootstrap();
    await harness.prompt('写一份摘要', 'request-1');

    const outcomes = harness.packets.flatMap((packet) =>
      packet.type === 'agent_event' && packet.payload.kind === 'tool_finished' ? [packet.payload.outcome] : [],
    );
    expect(outcomes).toEqual(['denied']);
    expect(harness.terminals().at(-1)?.status).toBe('completed');
  });

  it('Node 门先拒的一律零 operation：非 .md、basename 恰 .md、越界路径都不上 wire', async () => {
    for (const path of ['brief.txt', '.md', 'notes/.md', '/case/备忘.md', '../外面.md', '/workspace']) {
      faux.setResponses([writeCall(path, '正文'), fauxAssistantMessage([fauxText('写不了。')])]);
      const harness = createHarness(hostWriteOk);
      harness.bootstrap();
      await harness.prompt('试着写', 'request-1');
      expect(harness.hostRequests(), path).toEqual([]);
      // 拒绝必须显式落在工具账上：既不是 succeeded，也不是静默无事发生。
      const outcomes = harness.packets.flatMap((packet) =>
        packet.type === 'agent_event' && packet.payload.kind === 'tool_finished' ? [packet.payload.outcome] : [],
      );
      expect(outcomes, path).toEqual(['failed']);
    }
  });

  /**
   * binder 在 bootstrap 当场建成一次（一 leg 一枚 Agent），而 `requestId` 每 prompt 换一枚。
   * 若装配把首个 prompt 的 requestId 冻结在 binder 上，第二个 prompt 的 write 就会带着旧
   * requestId 上 wire——状态机的 send 门会当场拒（`reserved request 的 session/request 必须是
   * 当前活动 prompt`），故这条既证取值时机、又证那道门确实在。
   */
  it('第二个 prompt 的 write 带的是第二个 requestId，不是 bind 当时那一枚', async () => {
    faux.setResponses([
      writeCall('一.md', '甲'),
      fauxAssistantMessage([fauxText('第一份写好了。')]),
      writeCall('二.md', '乙'),
      fauxAssistantMessage([fauxText('第二份写好了。')]),
    ]);
    const harness = createHarness(hostWriteOk);
    harness.bootstrap();
    await harness.prompt('写第一份', 'request-1');
    await harness.prompt('写第二份', 'request-2');

    const requestIds = harness.packets.flatMap((packet) =>
      packet.type === 'host_request' ? [packet.requestId] : [],
    );
    expect(requestIds).toEqual(['request-1', 'request-2']);
    expect(harness.hostRequests().map((request) => request.operationId)).toEqual(['op_1_1', 'op_1_2']);
    expect(harness.terminals().map((terminal) => terminal.status)).toEqual(['completed', 'completed']);
  });

  it('没有在途 operation 时 deliverHostResult 显式抛出，不静默吞', () => {
    const harness = createHarness(hostWriteOk);
    harness.bootstrap();
    expect(() =>
      harness.runtime.deliverHostResult({
        operationId: 'op_1_1',
        capability: 'workspace_write',
        operation: 'write',
        status: 'ok',
        value: { logicalPath: 'brief.md', disposition: 'created', contentSha256: 'c'.repeat(64), byteLength: 6 },
      }),
    ).toThrow(/在途/);
  });
});

describe('toolExecution:"sequential" 是显式固定值', () => {
  it('同一 turn 两枚 read：投影序列恰是 起—止—起—止，终态仍 completed', async () => {
    faux.setResponses([
      fauxAssistantMessage(
        [
          fauxToolCall('read', { path: '备忘.md' }, { id: 'raw-a' }),
          fauxToolCall('read', { path: '证人.md' }, { id: 'raw-b' }),
        ],
        { stopReason: 'toolUse' },
      ),
      fauxAssistantMessage([fauxText('两份都读完了。')]),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('把两份都读一遍', 'request-1');

    expect(harness.kinds().filter((kind) => kind.startsWith('tool_'))).toEqual([
      'tool_started:tc_1_1',
      'tool_finished:tc_1_1',
      'tool_started:tc_1_2',
      'tool_finished:tc_1_2',
    ]);
    expect(harness.terminals().at(-1)?.status).toBe('completed');
  });

  /**
   * 对照实验：同一批工具、同一份脚本，只改 `toolExecution`。
   * parallel 下两枚 execute 真的重叠（enter-enter-exit-exit），sequential 下不重叠——
   * 故上面那条断言不是「怎么跑都绿」的排版。
   */
  it('对照：parallel 下同一批 execute 真的重叠，sequential 下不重叠', async () => {
    const trace: string[] = [];
    const baseEnv = createProductCaseEnv({ caseRoot });
    const env: ExecutionEnv = {
      ...baseEnv,
      async readBinaryFile(input: string, signal?: AbortSignal) {
        trace.push(`enter:${input}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        const result = await baseEnv.readBinaryFile(input, signal);
        trace.push(`exit:${input}`);
        return result;
      },
    };
    const tools = createReadOnlyTools({ logicalRoots: [CASE_LOGICAL_ROOT] }).map(
      (tool) =>
        ({
          ...tool,
          execute: (toolCallId: string, params: never, signal?: AbortSignal, onUpdate?: never) =>
            tool.execute(toolCallId, params, signal, onUpdate, { env }),
        }) as AgentTool<never>,
    );

    const script = () => [
      fauxAssistantMessage(
        [
          fauxToolCall('read', { path: '备忘.md' }, { id: 'raw-a' }),
          fauxToolCall('read', { path: '证人.md' }, { id: 'raw-b' }),
        ],
        { stopReason: 'toolUse' },
      ),
      fauxAssistantMessage([fauxText('完')]),
    ];

    for (const mode of ['parallel', 'sequential'] as const) {
      trace.length = 0;
      faux.setResponses(script());
      const agent = new Agent({
        streamFn: (target, context, options) => models.streamSimple(target, context, options),
        toolExecution: mode,
        initialState: { systemPrompt: '', model, tools },
      });
      await agent.prompt('两份都读');
      const shape = trace.map((entry) => entry.split(':')[0]);
      if (mode === 'parallel') expect(shape).toEqual(['enter', 'enter', 'exit', 'exit']);
      else expect(shape).toEqual(['enter', 'exit', 'enter', 'exit']);
    }
  });
});

describe('每 leg 恰一枚 Agent，同 leg 保留 messages', () => {
  it('第二个 prompt 复用同一枚 Agent 并保留上一轮 transcript', async () => {
    faux.setResponses([fauxAssistantMessage([fauxText('第一答')]), fauxAssistantMessage([fauxText('第二答')])]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('第一问', 'request-1');
    const afterFirst = harness.runtime.messages().length;
    await harness.prompt('第二问', 'request-2');

    expect(harness.runtime.agentCount()).toBe(1);
    expect(harness.runtime.messages().length).toBeGreaterThan(afterFirst);
    const transcript = JSON.stringify(harness.runtime.messages());
    expect(transcript).toContain('第一问');
    expect(transcript).toContain('第一答');
    expect(transcript).toContain('第二问');
  });

  it('新 leg 是新进程：另起一枚 runtime 的 messages 从空开始', async () => {
    faux.setResponses([fauxAssistantMessage([fauxText('答')])]);
    const first = createHarness();
    first.bootstrap();
    await first.prompt('问', 'request-1');
    expect(first.runtime.messages().length).toBeGreaterThan(0);

    const second = createHarness();
    expect(second.runtime.agentCount()).toBe(0);
    expect(second.runtime.messages()).toEqual([]);
    second.bootstrap({ resume: { kind: 'after_interruption', leg: 2, priorObservedTurns: 1, priorTurns: 1, priorUsd: 0 } });
    expect(second.runtime.messages()).toEqual([]);
  });
});

describe('预算跨 prompt 累计（产品口径，没有 per-prompt reset）', () => {
  it('同 leg 第二个 prompt 从上一轮的计数继续，越限即 budget_stopped', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('第一答')]),
      fauxAssistantMessage([fauxText('第二答')]),
    ]);
    const harness = createHarness();
    harness.bootstrap({ limits: { maxTurns: 3, maxUsd: null } });
    await harness.prompt('第一问', 'request-1');
    expect(harness.terminals().at(-1)).toEqual({
      status: 'completed',
      budget: { turns: 2, usd: 0, turnLimit: 'open', usdLimit: 'disabled', stopReason: null },
    });

    await harness.prompt('第二问', 'request-2');
    const terminal = harness.terminals().at(-1);
    expect(terminal?.status).toBe('budget_stopped');
    expect(terminal?.status === 'budget_stopped' && terminal.budget).toEqual({
      turns: 3,
      usd: 0,
      turnLimit: 'reached',
      usdLimit: 'disabled',
      stopReason: 'turns',
    });
  });

  it('priorUsd 的 null 是「费用未知」，不得被当成 0', async () => {
    faux.setResponses([fauxAssistantMessage([fauxText('答')])]);
    const harness = createHarness();
    harness.bootstrap({
      limits: { maxTurns: 12, maxUsd: null },
      resume: { kind: 'after_interruption', leg: 2, priorObservedTurns: 2, priorTurns: 1, priorUsd: null },
    });
    await harness.prompt('继续', 'request-1');
    const terminal = harness.terminals().at(-1);
    expect(terminal?.status).toBe('completed');
    expect(terminal?.status === 'completed' && terminal.budget.usd).toBeNull();
  });

  it('resume 的 prior 三值真被采信：上一 leg 已用满即首个回合就停', async () => {
    faux.setResponses(
      Array.from({ length: 6 }, () =>
        fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      ),
    );
    const harness = createHarness();
    harness.bootstrap({
      limits: { maxTurns: 3, maxUsd: null },
      resume: { kind: 'after_interruption', leg: 2, priorObservedTurns: 2, priorTurns: 2, priorUsd: 0 },
    });
    await harness.prompt('继续读', 'request-1');
    const terminal = harness.terminals().at(-1);
    expect(terminal?.status).toBe('budget_stopped');
    expect(terminal?.status === 'budget_stopped' && terminal.budget.turns).toBe(3);
    // observed ordinal 也从 prior 起算，不从 1 重开；越限后被 abort 的那个回合仍被观察到，
    // 但不计入限额、usage 全 null——observed ≥ counted 正是 resume 要分两个 prior 的理由。
    const turns = harness.packets.flatMap((packet) =>
      packet.type === 'agent_event' && packet.payload.kind === 'turn_finished' ? [packet.payload] : [],
    );
    expect(turns.map((turn) => turn.turn)).toEqual([3, 4]);
    expect(turns.map((turn) => turn.countedTowardTurnLimit)).toEqual([true, false]);
    expect(turns[1].usage).toEqual({
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      costUsd: null,
    });
  });
});

describe('Node 侧零 process.env', () => {
  it('三件 product 源码都不出现 process.env', async () => {
    for (const file of ['product-case-env.ts', 'product-runtime.ts', 'product-main.ts']) {
      const source = await readFile(new URL(file, import.meta.url), 'utf8');
      expect(source).not.toContain('process.env');
    }
  });

  it('产品 runtime 不引 dev 的 createDeepSeekLane（那一支会去环境里找 key）', async () => {
    const source = await readFile(new URL('product-runtime.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('createDeepSeekLane');
    expect(source).not.toContain('./provider.js');
  });
});

/**
 * PI-HOST-LOOP-1R N2（首轮验收 `314117d` 的 Node 反例二，转为常驻）。
 *
 * 首轮实现的 `finish()` 无条件发 `{kind:'completed'}`，于是上游 `stopReason:'error'`
 * 结束的一轮虽然在 `turn_finished` 里如实记了 error，最终终态仍是 `{status:'completed'}`——
 * 把上游失败写成了产品成功。收尾 stop reason 不是 `stop|toolUse` 的一律不得 completed。
 */
describe('provider 失败终态如实（N2）', () => {
  it("上游 stopReason:'error' 必以 failed{provider_error} 收场，不得 completed", async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxText('半截')], { stopReason: 'error', errorMessage: '上游连接中断' }),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('问一句', 'request-1');

    // 对照：turn_finished 那一层本来就如实记了 error——真正丢失真相的是终态那一层。
    const turns = harness.packets.flatMap((packet) =>
      packet.type === 'agent_event' && packet.payload.kind === 'turn_finished' ? [packet.payload] : [],
    );
    expect(turns.map((turn) => turn.stopReason)).toEqual(['error']);

    const terminal = harness.terminals().at(-1);
    expect(terminal?.status).toBe('failed');
    if (terminal?.status !== 'failed') return;
    expect(terminal.error.code).toBe('provider_error');
    expect(terminal.error.message).toBe('provider 调用失败，本轮未能完成');
  });

  it("上游 stopReason:'length' 同样不得产出 completed", async () => {
    faux.setResponses([fauxAssistantMessage([fauxText('被截断了')], { stopReason: 'length' })]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('问一句', 'request-1');
    expect(harness.terminals().at(-1)?.status).not.toBe('completed');
  });

  it('对照：stop 与 toolUse 收尾仍是 completed——上面两条不是恒红', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('读完了。')], { stopReason: 'stop' }),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('读一读', 'request-1');
    expect(harness.terminals().at(-1)?.status).toBe('completed');
  });

  /**
   * PI-HOST-LOOP-1R2 C1（独立复验 `427f4fa` 的 Blocker 1，转为常驻）。
   *
   * 1R 的 `completionFor()` 只特判 `error`，`aborted` 掉进 default 的 `failed/unknown`——
   * 上游真发 `stopReason:'aborted'` 时终态实得 `{status:'failed',error:{code:'unknown'}}`，
   * 而票面 N2 明定它必须走 canceled 路径。宿主 cancel 与越限 abort 两条路各有优先级压过
   * 这里，故唯一露出的就是**上游自行 abort**这一支。
   *
   * 按 2026-08-02 C1 裁定走甲路：runtime 报 `{kind:'canceled'}`，状态机在没有 cancel
   * 闩锁时以 `reason:'host'` 收——`aborted` 只能由宿主侧 AbortController 触发，
   * provider 结构上产生不了它，故宿主归因恒真。
   */
  it("上游 stopReason:'aborted' 必走 canceled 路径，不得落 failed/unknown", async () => {
    faux.setResponses([fauxAssistantMessage([fauxText('半截就断了')], { stopReason: 'aborted' })]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('问一句', 'request-1');

    // 对照：turn_finished 那一层如实记了 aborted——丢失真相的仍是终态那一层。
    const turns = harness.packets.flatMap((packet) =>
      packet.type === 'agent_event' && packet.payload.kind === 'turn_finished' ? [packet.payload] : [],
    );
    expect(turns.map((turn) => turn.stopReason)).toEqual(['aborted']);

    const terminal = harness.terminals().at(-1);
    expect(terminal?.status).toBe('canceled');
    // 无闩锁的上游 abort 归因宿主；`user` 只属真收到 cancel packet 的那一支。
    expect(terminal?.status === 'canceled' && terminal.reason).toBe('host');
  });

  /**
   * PI-HOST-LOOP-1R2 C1 的全枚举断言：`StopReason` 闭集逐枚过一遍，
   * 只有 `stop|toolUse` 允许 completed。单测 `error` 与 `length` 两枚挡不住 default 分支
   * 把整个闭集其余成员一起吞掉——复验的 `aborted` 正是从那条 default 溜走的。
   */
  it('全枚举：StopReason 闭集里非 stop|toolUse 的收尾一律零 completed', async () => {
    // 上游 `StopReason` 闭集（pi-ai 0.82.1 types.d.ts）恰五枚，另加一枚认不出的收尾。
    const nonCompleting = ['length', 'aborted', 'error'] as const;
    for (const stopReason of nonCompleting) {
      faux.setResponses([fauxAssistantMessage([fauxText('半截')], { stopReason })]);
      const harness = createHarness();
      harness.bootstrap();
      await harness.prompt('问一句', 'request-1');
      expect(harness.terminals().at(-1)?.status, `stopReason=${stopReason}`).not.toBe('completed');
    }

    // 对照两枚：`stop` 与 `toolUse` 是仅有的完成路径，故上面不是恒红。
    for (const responses of [
      [fauxAssistantMessage([fauxText('答完了。')], { stopReason: 'stop' })],
      [
        fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
        fauxAssistantMessage([fauxText('读完了。')], { stopReason: 'stop' }),
      ],
    ]) {
      faux.setResponses(responses);
      const harness = createHarness();
      harness.bootstrap();
      await harness.prompt('问一句', 'request-1');
      expect(harness.terminals().at(-1)?.status).toBe('completed');
    }
  });
});

/**
 * PI-HOST-LOOP-1R N3（首轮验收 `314117d` 的 Node 反例三，转为常驻）。
 *
 * `bindReadToLogicalRoot` / glob / grep 在 case-env 拒绝时回的是 `details.denied` 的
 * 文本结果，上游 `isError` 因而为 false；首轮 runtime 只按 `isError` 二分，于是把政策
 * 拒绝投影成 `succeeded`——Rust journal 会收到与真实授权结果相反的工具账。
 */
describe('政策拒绝的工具账如实（N3）', () => {
  const outcomes = (harness: Harness) =>
    harness.packets.flatMap((packet) =>
      packet.type === 'agent_event' && packet.payload.kind === 'tool_finished' ? [packet.payload.outcome] : [],
    );

  /**
   * `PI-WORKSPACE-READ-1` 之后 `/workspace` 不再是拒绝面，但**读不到仍必须显式**：
   * 宿主回 `not_found` 时工具账不得变成 succeeded——那才是静默降级。
   */
  it('read 不存在的 /workspace 文件：宿主 not_found 如实成为失败，不冒充成功', async () => {
    const { host } = scriptedWorkspaceHost();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '/workspace/记录.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('读不到。')]),
    ]);
    const harness = createHarness(host);
    harness.bootstrap();
    await harness.prompt('读一读 /workspace/记录.md', 'request-1');
    expect(outcomes(harness)).toEqual(['failed']);
  });

  it('存在的 /workspace 文件读得到：not_found 不是恒判', async () => {
    const { host } = scriptedWorkspaceHost({ '记录.md': '第一条\n' });
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '/workspace/记录.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('读到了。')]),
    ]);
    const harness = createHarness(host);
    harness.bootstrap();
    await harness.prompt('读一读 /workspace/记录.md', 'request-1');
    expect(outcomes(harness)).toEqual(['succeeded']);
  });

  it('两根之外的起始目录仍是 denied，不是 succeeded', async () => {
    for (const call of [
      fauxToolCall('glob', { pattern: '**/*.md', path: '/别的根' }),
      fauxToolCall('grep', { pattern: '张三', path: '../界外' }),
    ]) {
      faux.setResponses([
        fauxAssistantMessage([call], { stopReason: 'toolUse' }),
        fauxAssistantMessage([fauxText('检索不到。')]),
      ]);
      const harness = createHarness();
      harness.bootstrap();
      await harness.prompt('检索', 'request-1');
      expect(outcomes(harness)).toEqual(['denied']);
    }
  });

  it('对照：界内合法调用仍是 succeeded——denied 不是恒判', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '/case/备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('合同编号是 HT-2024-081。')]),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('读备忘', 'request-1');
    expect(outcomes(harness)).toEqual(['succeeded']);
  });
});

describe('dev session 是反例，不得被误当产品面', () => {
  it('它的 prompt() 每次都重置预算——产品口径不允许', async () => {
    faux.setResponses([fauxAssistantMessage([fauxText('一')]), fauxAssistantMessage([fauxText('二')])]);
    const session = await createPiLaneSession({ root: caseRoot, models, model, limits: { maxTurns: 12 } });
    await session.prompt('第一句');
    await session.prompt('第二句');
    expect(session.budget.snapshot().turns).toBe(1);
  });
});
