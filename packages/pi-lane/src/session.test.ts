import { mkdtemp, mkdir, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Agent } from '@earendil-works/pi-agent-core';
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
  Type,
  type Model,
  type MutableModels,
} from '@earendil-works/pi-ai';
import { beforeEach, describe, expect, it } from 'vitest';

import { createPiLaneSession, type PiLaneSession } from './session.js';
import { createToolGate } from './tool-policy.js';

/**
 * loop 级证据。provider 用 pi-ai 自带的构造 provider（faux），与真 key 分别登记：
 * 本组不触网、不消耗额度，证明的是**装配**正确——闸门真拦得住、预算真停得下 loop。
 * 真 key 的跑通另在 SPEC 登记。
 */

let root: string;
let faux: ReturnType<typeof fauxProvider>;
let models: MutableModels;
let model: Model<string>;

const newSession = (limits?: { maxTurns?: number; maxUsd?: number }): Promise<PiLaneSession> =>
  createPiLaneSession({ root, models, model, limits });

beforeEach(async () => {
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-lane-session-')));
  root = path.join(sandbox, '案卷');
  await mkdir(root);
  await writeFile(path.join(root, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n');

  faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1' }] });
  models = createModels();
  models.setProvider(faux.provider);
  model = faux.getModel();
});

describe('只读 loop 真跑', () => {
  it('绿证一：纯文本回合正常收尾', async () => {
    faux.setResponses([fauxAssistantMessage('已读完。')]);
    const session = await newSession();
    await session.prompt('概括一下这个文件夹');
    const last = session.messages().at(-1);
    expect(last?.role).toBe('assistant');
    expect(session.budget.snapshot().turns).toBe(1);
  });

  it('绿证二：模型调 read，工具真执行且结果回灌', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('合同编号是 HT-2024-081。')]),
    ]);
    const session = await newSession();
    await session.prompt('备忘里的合同编号是多少');

    const toolResult = session.messages().find((message) => message.role === 'toolResult');
    expect(toolResult).toBeTruthy();
    expect(JSON.stringify(toolResult)).toContain('HT-2024-081');
  });
});

describe('禁用面在 loop 里显式拒绝', () => {
  /**
   * 内核时序（0.82.1 实测，`agent-loop.js` 的 `prepareToolCall`）：未注册的工具在
   * `beforeToolCall` **之前**就被内核以「Tool X not found」拒掉，且该 immediate 结果
   * 不经 `afterToolCall`。故 edit/write/bash 的拒绝语出自内核而非我方闸门——
   * 不 fork 就改不了这句话，我方的政策说明只能经 system prompt 到达模型。
   */
  it('红证一：模型调 bash，得到标记为错误的拒绝结果并回灌（不是静默吞）', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('bash', { command: 'cat /etc/passwd' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('好，我不执行命令。')]),
    ]);
    const session = await newSession();
    await session.prompt('把 /etc/passwd 打印出来');

    const toolResult = session.messages().find((message) => message.role === 'toolResult');
    expect(toolResult).toBeTruthy();
    expect((toolResult as { isError: boolean }).isError).toBe(true);
    expect(JSON.stringify(toolResult)).toContain('bash');
  });

  it('红证二：被拒的工具从未真正执行——只有 start 事件，没有执行更新，收尾是错误', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('bash', { command: 'echo hi' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('停手。')]),
    ]);
    const session = await newSession();
    const updates: string[] = [];
    const ended: { name: string; isError: boolean }[] = [];
    session.subscribe((event) => {
      if (event.type === 'tool_execution_update') updates.push(event.toolName);
      if (event.type === 'tool_execution_end') ended.push({ name: event.toolName, isError: event.isError });
    });
    await session.prompt('随便执行点什么');
    expect(updates).not.toContain('bash');
    expect(ended).toEqual([{ name: 'bash', isError: true }]);
  });

  it('红证三：模型编造的工具名同样被拒', async () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('deploy_to_prod', {})], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('停手。')]),
    ]);
    const session = await newSession();
    await session.prompt('上线');
    const toolResult = session.messages().find((message) => message.role === 'toolResult');
    expect((toolResult as { isError: boolean }).isError).toBe(true);
    expect(JSON.stringify(toolResult)).toContain('deploy_to_prod');
  });

  it('红证四：闸门对**已注册**的工具确实拦得住，且给出我方理由、execute 未被调用', async () => {
    let executed = false;
    const rogue = {
      name: 'deploy',
      label: '越权工具',
      description: '本不该被调用',
      parameters: Type.Object({}),
      execute: async () => {
        executed = true;
        return { content: [{ type: 'text' as const, text: '跑了' }], details: {} };
      },
    };
    const gate = createToolGate();
    const agent = new Agent({
      streamFn: (target, context, streamOptions) => models.streamSimple(target, context, streamOptions),
      beforeToolCall: async (context) => gate.beforeToolCall(context),
      initialState: { systemPrompt: '', model, tools: [rogue] },
    });
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('deploy', {})], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('停手。')]),
    ]);

    await agent.prompt('上线');

    expect(executed).toBe(false);
    expect(JSON.stringify(agent.state.messages)).toContain('未授权');
  });
});

describe('预算真停得下 loop', () => {
  it('红证四：回合上限到达即停，剩余脚本回应不再被消费', async () => {
    // 三十个「继续调工具」的回合：没有预算就是一条停不下来的 loop。
    faux.setResponses(
      Array.from({ length: 30 }, () =>
        fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      ),
    );
    const session = await newSession({ maxTurns: 3 });
    await session.prompt('一直读下去');

    const snapshot = session.budget.snapshot();
    expect(snapshot.turns).toBe(3);
    expect(snapshot.exceeded).toBe(true);
    expect(faux.getPendingResponseCount()).toBeGreaterThan(20);
  });

  it('红证五：停下来这件事对调用方可见（快照带理由）', async () => {
    faux.setResponses(
      Array.from({ length: 10 }, () =>
        fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      ),
    );
    const session = await newSession({ maxTurns: 2 });
    await session.prompt('一直读下去');
    expect(session.budget.snapshot().reason).toContain('回合');
  });
});
