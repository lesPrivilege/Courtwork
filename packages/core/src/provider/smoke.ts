import * as z from 'zod';
import { createDeepSeekProvider, createDoubaoProvider, createQwenProvider } from './openai-compatible-provider.js';
import { estimateCostUsd } from './pricing-table.js';
import type { Provider } from './types.js';

export interface SmokeTarget {
  name: string;
  envKey: string;
  modelEnvKey: string;
  defaultModel: string;
  create: (config: { apiKey: string; modelId: string }) => Provider;
}

export const SMOKE_TARGETS: SmokeTarget[] = [
  { name: 'DeepSeek', envKey: 'DEEPSEEK_API_KEY', modelEnvKey: 'DEEPSEEK_MODEL_ID', defaultModel: 'deepseek-v4-pro', create: createDeepSeekProvider },
  { name: 'Qwen（阿里百炼）', envKey: 'DASHSCOPE_API_KEY', modelEnvKey: 'QWEN_MODEL_ID', defaultModel: 'qwen3.5-plus', create: createQwenProvider },
  { name: '豆包（火山方舟）', envKey: 'ARK_API_KEY', modelEnvKey: 'ARK_MODEL_ID', defaultModel: 'doubao-seed-1.6', create: createDoubaoProvider },
];

export interface ResolvedSmokeTarget {
  target: SmokeTarget;
  apiKey: string | undefined;
  modelId: string;
}

/** 纯函数：从任意 env-like 对象解析出三家的 key 是否存在与要用的模型 id（可被 *_MODEL_ID
 * 覆盖），不做任何网络调用——供 scripts/smoke-provider.ts 与单测共用。 */
export function resolveSmokeTargets(env: Record<string, string | undefined>): ResolvedSmokeTarget[] {
  return SMOKE_TARGETS.map((target) => {
    const rawApiKey = env[target.envKey];
    return {
      target,
      apiKey: rawApiKey && rawApiKey.length > 0 ? rawApiKey : undefined,
      modelId: env[target.modelEnvKey] ?? target.defaultModel,
    };
  });
}

const SmokeResponseSchema = z.object({ greeting: z.string().min(1) });

export interface SmokeRunResult {
  greeting: string;
  usage?: { inputTokens: number; outputTokens: number };
  reasoningLength?: number;
  costUsd?: number;
}

/** 真实发网络请求，验证一家 provider 端到端可用（含结构化输出往返）。不在单测里跑——
 * 单测覆盖已经在更早任务的假 fetch 测试里做到位，这里只是组合调用，真实正确性由
 * scripts/smoke-provider.ts 配合真实 key 手动验证。 */
export async function runSmokeTest(target: SmokeTarget, apiKey: string, modelId: string): Promise<SmokeRunResult> {
  const provider = target.create({ apiKey, modelId });
  const response = await provider.generate({
    systemPrompt: '你是一个简洁的助手。',
    messages: [{ role: 'user', content: '请返回一个 JSON，greeting 字段填一句简短的中文问候语。' }],
    responseSchema: SmokeResponseSchema,
  });
  const parsed = SmokeResponseSchema.parse(JSON.parse(response.content));
  return {
    greeting: parsed.greeting,
    usage: response.usage,
    reasoningLength: response.reasoningContent?.length,
    costUsd: estimateCostUsd(provider.id, provider.modelId, response.usage),
  };
}
