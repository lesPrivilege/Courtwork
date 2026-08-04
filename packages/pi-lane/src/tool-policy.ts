/**
 * 工具闸门（ADR-022 决定三：不变量经扩展机制挂载，不改内核）。
 *
 * 挂载点是 pi 内核自带的 `beforeToolCall` 钩子。内核默认语义是「无扩展注册即放行」，
 * 本闸门把默认翻转为**默认拒绝**：只读闭集之外的工具名一律 `block`，并给出可见理由。
 *
 * 与 {@link createReadOnlyScopedEnv} 是两道独立的锁：闸门管「能不能调这个工具」，
 * 容器管「这次调用能不能碰到这个路径 / 能不能写」。任一单独失效，另一道仍然拦得住。
 */

import type { ProductToolName } from './product-protocol.js';

/** dev 只读线的工具闭集（无 host port，故结构上没有写面）。扩集是契约变更，须回 ADR-022。 */
export const READ_ONLY_TOOL_NAMES = ['read', 'grep', 'glob'] as const;

/**
 * 产品线的模型工具闭集，恰四件（ADR-022 六-0）。
 *
 * `write` 在这里**不是** Node 的写权：它只提案，物理 effect 由受信 Rust 宿主经
 * `workspace_write` host operation 兑现（ADR-022 六-C）。`satisfies` 把本表与 wire 的
 * {@link ProductToolName} 闭集钉在编译期——两处闭集若来日各自改名或增减，当场不通过类型检查。
 */
export const PRODUCT_TOOL_NAMES = ['read', 'grep', 'glob', 'write'] as const satisfies readonly ProductToolName[];

/**
 * 明确点名的禁用面。列在这里是为了让拒绝理由说得出「你要的是哪一类能力」。
 *
 * `write` 自 `PI-WRITE-HOST-1` 起离开本表：它在产品线上是**已授权**的提案工具，
 * 留在这里就与 {@link PRODUCT_TOOL_NAMES} 各说各话。dev 线仍拒 write，但那不是「点名禁用」，
 * 而是「不在 dev 闭集内」——拒绝理由因此走通用支，不再谎称它属于某个被锁的能力面。
 */
export const DISABLED_TOOL_NAMES = ['edit', 'bash'] as const;

const DISABLED_REASON: Record<string, string> = {
  edit: '改写原件属修订面',
  bash: '任意命令执行属 shell 面',
};

export interface ToolGateRequest {
  readonly toolCall: { readonly name: string };
}

export interface ToolGateVerdict {
  readonly block?: boolean;
  readonly reason?: string;
}

export interface ToolGate {
  isAllowed(name: string): boolean;
  /** 直接挂 pi 的 `beforeToolCall`：放行返回 undefined，拦截返回带理由的 `block`。 */
  beforeToolCall(request: ToolGateRequest): Promise<ToolGateVerdict | undefined>;
}

/**
 * 装配期校验：注册的工具必须全在**本次闸门的**闭集内（dev 三件、产品四件各按各的表）。
 *
 * 之所以需要这道校验：内核在 `beforeToolCall` **之前**就以「Tool X not found」拒掉未注册的工具
 * （`agent-loop.js` 的 `prepareToolCall` 先查工具表再调钩子），所以闸门只对已注册的工具生效。
 * 若有人往工具表里加了一件却忘了改闭集，闸门放行、内核也放行——这道校验就是那个缺口的堵头。
 */
export function assertToolsWithinPolicy(toolNames: readonly string[], gate: ToolGate): void {
  const unauthorized = toolNames.filter((name) => !gate.isAllowed(name));
  if (unauthorized.length > 0) {
    throw new Error(`工具装配与闸门闭集不一致：${unauthorized.join('、')} 不在闭集内——闸门与工具表须同批改`);
  }
}

export function createToolGate(allowed: readonly string[] = READ_ONLY_TOOL_NAMES): ToolGate {
  const allowlist = new Set(allowed);

  function reasonFor(name: string): string {
    const category = DISABLED_REASON[name];
    const head = category
      ? `工具 \`${name}\` 未授权：${category}`
      : `工具 \`${name}\` 未授权：不在本线工具闭集内`;
    return (
      `${head}。pi lane 的工具闭集由 ADR-022 决定六冻结：` +
      `写面只以提案形态存在、物理 effect 由受信宿主经 workspace_write 兑现，bash 面仍锁 SANDBOX-PROBE-1，` +
      `且放行不等于升档——升档须由实现自带该等级的越界反例证成。` +
      `当前可用：${[...allowlist].join('、')}。`
    );
  }

  return {
    isAllowed: (name) => allowlist.has(name),
    async beforeToolCall({ toolCall }) {
      if (allowlist.has(toolCall.name)) return undefined;
      return { block: true, reason: reasonFor(toolCall.name) };
    },
  };
}
