import type { ProviderUsage } from '@courtwork/provider/types';

/** 缺失槽位语义 unknown，显示为“未知”而非 0；仅追加有值的 provider 分账。 */
export function formatUsageMetering(usage: ProviderUsage): string {
  const slot = (value?: number): string => (value === undefined ? '未知' : String(value));
  const parts = [`Input ${slot(usage.inputTokens)}`, `Output ${slot(usage.outputTokens)}`];
  if (usage.reasoningOutputTokens !== undefined) parts.push(`Reasoning ${usage.reasoningOutputTokens}`);
  if (usage.cacheHitInputTokens !== undefined) parts.push(`Cache hit ${usage.cacheHitInputTokens}`);
  if (usage.cacheMissInputTokens !== undefined) parts.push(`Cache miss ${usage.cacheMissInputTokens}`);
  return parts.join(' · ');
}
