/**
 * 工具闸门（ADR-022 决定三：不变量经扩展机制挂载，不改内核）。
 *
 * 挂载点是 pi 内核自带的 `beforeToolCall` 钩子。内核默认语义是「无扩展注册即放行」，
 * 本闸门把默认翻转为**默认拒绝**：只读闭集之外的工具名一律 `block`，并给出可见理由。
 *
 * 与 {@link createReadOnlyScopedEnv} 是两道独立的锁：闸门管「能不能调这个工具」，
 * 容器管「这次调用能不能碰到这个路径 / 能不能写」。任一单独失效，另一道仍然拦得住。
 */

/** 当期只读票的工具闭集。扩集是契约变更，须回 ADR-022。 */
export const READ_ONLY_TOOL_NAMES = ['read', 'grep', 'glob'] as const;

/** 明确点名的禁用面。列在这里是为了让拒绝理由说得出「你要的是哪一类能力」。 */
export const DISABLED_TOOL_NAMES = ['edit', 'write', 'bash'] as const;

const DISABLED_REASON: Record<string, string> = {
  edit: '改写原件属写面',
  write: '新建/覆盖文件属写面',
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

export function createToolGate(allowed: readonly string[] = READ_ONLY_TOOL_NAMES): ToolGate {
  const allowlist = new Set(allowed);

  function reasonFor(name: string): string {
    const category = DISABLED_REASON[name];
    const head = category
      ? `工具 \`${name}\` 未授权：${category}`
      : `工具 \`${name}\` 未授权：不在本线只读闭集内`;
    return (
      `${head}。pi lane 当期只开读面（ADR-022 决定二），` +
      `写与 bash 面锁 SANDBOX-PROBE-1，且放行不等于升档——升档须由实现自带该等级的越界反例证成。` +
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
