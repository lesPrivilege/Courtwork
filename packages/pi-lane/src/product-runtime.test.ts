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
  type SidecarPacket,
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
};

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

function createHarness(): Harness {
  const packets: SidecarPacket[] = [];
  const exits: number[] = [];
  const streamOptions: (SimpleStreamOptions | undefined)[] = [];
  let seq = 0;

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

describe('case-read-v1 system prompt', () => {
  it('exact snapshot：四行以 LF 相连、末尾无 LF', () => {
    expect(PRODUCT_PROMPT_ID).toBe('case-read-v1');
    expect(PRODUCT_SYSTEM_PROMPT).toBe(
      '你是一名只读文档助手，案件材料只在虚拟根 /case。\n' +
        '可用工具只有 read、glob、grep；回答前须实际读取，读不到或结果被截断就明确说明。\n' +
        '你不能修改、新建、删除文件，也不能执行命令或声称已经完成这些动作。\n' +
        '引用材料时使用 /case 开头的逻辑路径；不得猜测、回显或索要任何物理路径与凭证。',
    );
    expect(PRODUCT_SYSTEM_PROMPT.endsWith('\n')).toBe(false);
    expect(PRODUCT_SYSTEM_PROMPT.split('\n')).toHaveLength(4);
  });

  it('不超过 2048 字节，且不含 write/workspace 说明（那是 md-work-v1 的事）', () => {
    expect(Buffer.byteLength(PRODUCT_SYSTEM_PROMPT, 'utf8')).toBeLessThanOrEqual(PRODUCT_SYSTEM_PROMPT_MAX_BYTES);
    expect(PRODUCT_SYSTEM_PROMPT).not.toContain('workspace');
    expect(PRODUCT_SYSTEM_PROMPT).not.toContain('write');
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
  it('ready 恰宣告 case_read', () => {
    const harness = createHarness();
    harness.bootstrap();
    const ready = harness.packets.find((packet) => packet.type === 'ready');
    expect(ready?.type).toBe('ready');
    if (ready?.type !== 'ready') return;
    expect(ready.payload.capabilities).toEqual([...PRODUCT_CAPABILITIES]);
    expect(ready.payload.capabilities).toEqual(['case_read']);
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

  it('read/glob/grep 一枚 operation 都不申请，host_request 全程为零', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('glob', { pattern: '**/*.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('读完了。')]),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('先列再读', 'request-1');
    expect(harness.packets.filter((packet) => packet.type === 'host_request')).toEqual([]);
    const source = await readFile(new URL('product-runtime.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('reserveHostOperation');
    expect(source).not.toContain('sendReservedHostRequest');
  });

  it('模型给相对路径也走同一容器，工具结果不含物理根', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('grep', { pattern: '张三' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('证人是张三。')]),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('证人是谁', 'request-1');
    const transcript = JSON.stringify(harness.runtime.messages());
    expect(transcript).toContain('/case/证人.md');
    expect(transcript).not.toContain(caseRoot);
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
    const tools = createReadOnlyTools({ logicalRoot: CASE_LOGICAL_ROOT }).map(
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

  it('read /workspace/记录.md 被 case-only policy 拒绝，outcome 必为 denied', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '/workspace/记录.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('读不到。')]),
    ]);
    const harness = createHarness();
    harness.bootstrap();
    await harness.prompt('读一读 /workspace/记录.md', 'request-1');
    expect(outcomes(harness)).toEqual(['denied']);
  });

  it('glob 与 grep 的越界起始目录同样是 denied，不是 succeeded', async () => {
    for (const call of [
      fauxToolCall('glob', { pattern: '**/*.md', path: '/workspace' }),
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
