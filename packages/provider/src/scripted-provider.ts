import type { GenerationResponse, Provider } from './types.js';

export class ScriptedProviderExhaustedError extends Error {
  constructor(providerId: string, scriptLength: number) {
    super(
      `录制回放 provider "${providerId}" 的脚本（共 ${scriptLength} 条）已耗尽，收到了超出录制范围的第 ${scriptLength + 1} 次 generate() 调用`,
    );
    this.name = 'ScriptedProviderExhaustedError';
  }
}

/**
 * 录制回放假 provider：按调用顺序依次返回脚本里预置的响应，不依赖真实 API。
 * SPEC 要求"测试用假 provider/录制回放，不依赖真实 API"——本模块是该要求的落点。
 */
export function createScriptedProvider(id: string, modelId: string, script: GenerationResponse[]): Provider {
  let cursor = 0;
  const provider: Provider = {
    id,
    modelId,
    async *stream(_request, options = {}) {
      if (cursor >= script.length) throw new ScriptedProviderExhaustedError(id, script.length);
      const response = script[cursor];
      cursor += 1;
      const requestId = options.requestId ?? `scripted-${cursor}`;
      let seq = 0;
      yield { type: 'started' as const, requestId, seq: seq++, providerId: id, modelId };
      for (const notice of response.notices ?? []) {
        yield { type: 'notice' as const, requestId, seq: seq++, notice };
      }
      if (response.reasoningContent) yield { type: 'reasoning_delta' as const, requestId, seq: seq++, delta: response.reasoningContent };
      if (response.content) yield { type: 'content_delta' as const, requestId, seq: seq++, delta: response.content };
      if (response.usage) yield { type: 'usage' as const, requestId, seq: seq++, ...response.usage };
      yield { type: 'completed' as const, requestId, seq, finishReason: 'stop' as const };
    },
    async generate(request): Promise<GenerationResponse> {
      const requestId = `scripted-generate-${cursor + 1}`;
      let content = '';
      let reasoningContent = '';
      let usage: GenerationResponse['usage'];
      const notices: NonNullable<GenerationResponse['notices']> = [];
      for await (const event of provider.stream(request, { requestId })) {
        if (event.type === 'content_delta') content += event.delta;
        else if (event.type === 'reasoning_delta') reasoningContent += event.delta;
        else if (event.type === 'usage') usage = { inputTokens: event.inputTokens, outputTokens: event.outputTokens };
        else if (event.type === 'notice') notices.push(event.notice);
      }
      return {
        content,
        reasoningContent: reasoningContent || undefined,
        usage,
        ...(notices.length > 0 ? { notices } : {}),
      };
    },
  };
  return provider;
}
