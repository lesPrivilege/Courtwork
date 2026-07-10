import * as z from 'zod';
import type { ProviderQuirkProfile } from './quirk-profile.js';
import type { ChatMessage, HttpClientConfig, ResponseFormat } from './http-client.js';
import { sendChatCompletion } from './http-client.js';
import { ProviderInvalidResponseError, ProviderResponseFormatUnsupportedError } from './errors.js';

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/** zod→JSON Schema 转换的防御性兜底：z.toJSONSchema 对 .refine()/.meta() 已实测不抛错
 * （谓词被丢弃、shape 保留），但未来 schema 若引入不可转换的构造（如 z.custom()），这里
 * 优雅降级为 undefined，调用方据此退回 json_object 档位 + 纯文本提示，而不是让整个
 * 生成请求失败。 */
function toJsonSchemaSafe(schema: z.ZodTypeAny): unknown | undefined {
  try {
    return z.toJSONSchema(schema);
  } catch {
    return undefined;
  }
}

export interface GenerateStructuredParams {
  profile: ProviderQuirkProfile;
  model: string;
  systemPrompt?: string;
  messages: ChatMessage[];
  responseSchema?: z.ZodTypeAny;
  maxValidationRetries: number;
  httpConfig: HttpClientConfig;
}

export interface GenerateStructuredResult {
  content: string;
  reasoningContent?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export async function generateStructured(params: GenerateStructuredParams): Promise<GenerateStructuredResult> {
  const { profile, responseSchema } = params;

  if (responseSchema && profile.responseFormat.tier === 'unsupported') {
    throw new ProviderResponseFormatUnsupportedError(profile.providerId, params.model);
  }

  const jsonSchema = responseSchema ? toJsonSchemaSafe(responseSchema) : undefined;
  const responseFormat: ResponseFormat | undefined = responseSchema ? buildResponseFormat(profile, jsonSchema) : undefined;
  const augmentedSystemPrompt = responseSchema
    ? augmentSystemPromptForStructuredOutput(profile, params.systemPrompt, jsonSchema)
    : params.systemPrompt;

  let messages: ChatMessage[] = [
    ...(augmentedSystemPrompt ? [{ role: 'system' as const, content: augmentedSystemPrompt }] : []),
    ...params.messages,
  ];

  const maxAttempts = responseSchema ? params.maxValidationRetries + 1 : 1;
  let allAttemptsFailedToParse = true;
  let lastIssue = '';
  let attempt: number;

  for (attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await sendChatCompletion(
      profile,
      {
        model: params.model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        ...(responseFormat ? { response_format: responseFormat } : {}),
      },
      params.httpConfig,
    );

    if (!responseSchema) {
      return result;
    }

    const cleaned = stripMarkdownFence(result.content);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      lastIssue = `不是合法 JSON：${error instanceof Error ? error.message : String(error)}`;
      messages = appendRetryFeedback(messages, result.content, lastIssue);
      continue;
    }

    allAttemptsFailedToParse = false;
    const validated = responseSchema.safeParse(parsed);
    if (validated.success) {
      return result;
    }

    lastIssue = validated.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    messages = appendRetryFeedback(messages, result.content, lastIssue);
  }

  throw new ProviderInvalidResponseError(profile.providerId, attempt - 1, lastIssue, allAttemptsFailedToParse);
}

function buildResponseFormat(profile: ProviderQuirkProfile, jsonSchema: unknown | undefined): ResponseFormat {
  if (!jsonSchema) return { type: 'json_object' };
  switch (profile.responseFormat.tier) {
    case 'json_schema_strict':
      return { type: 'json_schema', json_schema: { name: 'structured_response', strict: true, schema: jsonSchema } };
    case 'json_schema':
      return { type: 'json_schema', json_schema: { name: 'structured_response', schema: jsonSchema } };
    case 'json_object':
      return { type: 'json_object' };
    case 'unsupported':
      // 不可达：generateStructured 顶部已对 tier==='unsupported' && responseSchema 提前抛错。
      return { type: 'json_object' };
  }
}

function augmentSystemPromptForStructuredOutput(
  profile: ProviderQuirkProfile,
  systemPrompt: string | undefined,
  jsonSchema: unknown | undefined,
): string {
  // json_object 档位（DeepSeek）或 schema 转换失败的降级情形都必须在 prompt 里显式给结构
  // 提示——DeepSeek 官方文档明确要求 prompt 含 "json" 字样并给出结构示例（docs/18 §3①）。
  // json_schema(_strict) 档位且转换成功时，wire 层约束已足够，不额外注入提示（省 token）。
  if (profile.responseFormat.tier !== 'json_object' && jsonSchema) {
    return systemPrompt ?? '';
  }
  const hint = jsonSchema
    ? `请仅返回符合以下 JSON Schema 的合法 json，不要包含任何解释文字或 markdown 代码围栏：\n${JSON.stringify(jsonSchema)}`
    : '请仅返回合法 json，不要包含任何解释文字或 markdown 代码围栏。';
  return systemPrompt ? `${systemPrompt}\n\n${hint}` : hint;
}

function appendRetryFeedback(messages: ChatMessage[], previousContent: string, issue: string): ChatMessage[] {
  return [
    ...messages,
    { role: 'assistant', content: previousContent },
    { role: 'user', content: `上一次输出未通过校验：${issue}\n请修正后重新返回完整的合法 json（同样不要包含解释文字或代码围栏）。` },
  ];
}
