/**
 * pi lane 会话装配（ADR-022 决定一：loop runtime 整体引入，真源仍在容器、授权与契约）。
 *
 * 层次选择留痕：挂载点取 `Agent` 而非 `AgentHarness`。核实 0.82.1 后的事实是——
 * `AgentHarness` 的选项面**不含任何权限钩子**（无 `beforeToolCall`），我方不变量在那一层无处可挂；
 * 钩子只在 `Agent`（及更低的 `agentLoop` 配置）上。代价是 `Agent` 不带 session journal
 * 与 compaction，故 ADR-022 决定四的卷宗分区在本票只交提案、不落实现（见 pi-lane-1 评估件）。
 *
 * 停 loop 的杠杆同理：`shouldStopAfterTurn` 只在低层 `AgentLoopConfig` 上，
 * `Agent` 不向 loop 转发它（实测：dist/agent.js 全文无该标识符），
 * 故预算只能由 sidecar 层经 `abort()` 强杀——此即 ADR-022 未决一的实测答案。
 */

import {
  Agent,
  type AgentEvent,
  type AgentMessage,
  type AgentTool,
  type AgentHarnessTool,
  type ExecutionToolContext,
} from '@earendil-works/pi-agent-core';
import type { Model, Models } from '@earendil-works/pi-ai';

import { createAuthorizedRoot } from './authorized-root.js';
import { createBudget, type Budget, type BudgetLimits } from './budget.js';
import { createReadOnlyScopedEnv } from './scoped-env.js';
import { assertToolsWithinPolicy, createToolGate } from './tool-policy.js';
import { createReadOnlyTools } from './tools.js';

const DEFAULT_SYSTEM_PROMPT = [
  '你是一名只读文档助手，只能查看用户明确授权的那一个文件夹。',
  '可用工具只有三件：read（读文件）、glob（按名检索）、grep（按内容检索）。',
  '你没有修改、新建、删除文件的能力，也不能执行任何命令；请求这些能力会被系统拒绝。',
  '回答须基于实际读到的内容；读不到就直说读不到，不要推测文件内容。',
].join('\n');

export interface PiLaneSessionOptions {
  /** 授权文件夹绝对路径。这是本会话能触及的全部文件系统。 */
  readonly root: string;
  readonly models: Models;
  readonly model: Model<string>;
  readonly limits?: BudgetLimits;
  readonly systemPrompt?: string;
}

export interface PiLaneSession {
  /** 授权文件夹的规范路径。 */
  readonly root: string;
  readonly budget: Budget;
  prompt(text: string): Promise<void>;
  subscribe(listener: (event: AgentEvent) => void): () => void;
  messages(): AgentMessage[];
  abort(): void;
}

/** pi 的 `Agent` 只认四参 execute；把容器绑进闭包，工具本身不必知道会话。 */
function bindToolContext(
  tools: AgentHarnessTool<ExecutionToolContext>[],
  context: ExecutionToolContext,
): AgentTool<never>[] {
  return tools.map(
    (tool) =>
      ({
        ...tool,
        execute: (toolCallId: string, params: never, signal?: AbortSignal, onUpdate?: never) =>
          tool.execute(toolCallId, params, signal, onUpdate, context),
      }) as AgentTool<never>,
  );
}

export async function createPiLaneSession(options: PiLaneSessionOptions): Promise<PiLaneSession> {
  const authorized = await createAuthorizedRoot(options.root);
  const env = createReadOnlyScopedEnv(authorized);
  const gate = createToolGate();
  const budget = createBudget(options.limits);

  const tools = createReadOnlyTools();
  // 闸门与工具表必须同批改；内核只在工具已注册时才调 `beforeToolCall`，故这道校验不是冗余。
  assertToolsWithinPolicy(
    tools.map((tool) => tool.name),
    gate,
  );

  const agent = new Agent({
    streamFn: (model, context, streamOptions) => options.models.streamSimple(model, context, streamOptions),
    beforeToolCall: async (context) => gate.beforeToolCall(context),
    initialState: {
      systemPrompt: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      model: options.model,
      tools: bindToolContext(tools, { env }),
    },
  });

  // 预算执法：pi 不接受来自扩展的「停」（`shouldStopAfterTurn` 不经 Agent 转发），
  // 只能在回合边界从外面 abort。被 abort 打断的那个回合不计入用量——它没产出。
  agent.subscribe((event) => {
    if (event.type !== 'turn_end' || event.message.role !== 'assistant') return;
    const message = event.message;
    if (message.stopReason === 'aborted' || message.stopReason === 'error') return;
    if (budget.recordTurn(message.usage.cost.total).exceeded) agent.abort();
  });

  return {
    root: authorized.root,
    budget,
    async prompt(text) {
      budget.reset();
      await agent.prompt(text);
    },
    subscribe(listener) {
      return agent.subscribe((event) => {
        listener(event);
      });
    },
    messages: () => agent.state.messages,
    abort: () => agent.abort(),
  };
}
