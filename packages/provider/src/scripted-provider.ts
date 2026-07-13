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
  return {
    id,
    modelId,
    async generate(): Promise<GenerationResponse> {
      if (cursor >= script.length) {
        throw new ScriptedProviderExhaustedError(id, script.length);
      }
      const response = script[cursor];
      cursor += 1;
      return response;
    },
  };
}
