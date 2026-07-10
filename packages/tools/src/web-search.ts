import * as z from 'zod';
import {
  defineTool,
  ToolNotConfiguredError,
  ToolNotImplementedError,
  ToolWebReferenceError,
  type ToolAdapter,
  type ToolDefinition,
  type WebReferencePayload,
} from './contract.js';
import { spotlight } from './web-fetch-spotlight.js';

export const WebSearchInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(20).optional(),
});
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

/**
 * 与 web-fetch 同理：search 的成功路径结构上不存在（docs/20"不许让 web 结果以任何
 * 路径获得 verified:true"对 search 与 fetch 一视同仁）。dataSchema 声明 z.never()，
 * 未来接入真实搜索后端时，其成功分支也只能走 ToolWebReferenceError 这一条通道。
 */
export type WebSearchAdapter = ToolAdapter<WebSearchInput, never>;

const WEB_SEARCH_TOOL_ID = 'web-search';
const WEB_SEARCH_TIMEOUT_MS = 8_000;

export function createWebSearchTool(adapter: WebSearchAdapter): ToolDefinition<WebSearchInput, never> {
  return defineTool(
    {
      id: WEB_SEARCH_TOOL_ID,
      inputSchema: WebSearchInputSchema,
      dataSchema: z.never(),
      timeoutMs: WEB_SEARCH_TIMEOUT_MS,
    },
    adapter,
  );
}

/**
 * mock 适配器不接受任何配置。搜索结果的 title/snippet 同样经过 spotlighting——
 * 搜索引擎返回的标题/摘要一样是第三方不可信文本，是已被记录在案的间接注入向量
 * （docs/14 §4.1），不能因为字数短就豁免消毒。
 */
export function createMockWebSearchAdapter(): WebSearchAdapter {
  return {
    sourceId: 'mock',
    async run(input): Promise<never> {
      const payload: WebReferencePayload = {
        kind: 'search_results',
        query: input.query,
        fetchedAt: new Date().toISOString(),
        results: [
          {
            url: 'https://example.invalid/mock-result-1',
            title: spotlight(`关于"${input.query}"的模拟搜索结果标题`),
            snippet: spotlight('这是模拟搜索结果的摘要文本，仅用于开发/测试，不代表真实检索内容。'),
          },
        ],
      };
      throw new ToolWebReferenceError(WEB_SEARCH_TOOL_ID, `模拟搜索完成（C 级信源，未核验）：${input.query}`, payload);
    },
  };
}

export interface SerperAdapterConfig {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * 真实搜索适配器骨架（serper.dev，博查等同类可作为平级适配器后续补充，同一套接口）。
 * 尚未接入真实请求与响应映射：为避免编造端点路径与响应字段、用假数据冒充"已对接"，
 * 此处在凭证齐备后仍明确抛出"未实现"而不是尝试拼一个看起来合理的请求（仿
 * party-verify.ts 的 qcc 骨架先例）。补全时：请求/鉴权按官方文档实现；成功分支必须
 * 走 ToolWebReferenceError（不得开辟 verified:true 路径）；结果的 title/snippet
 * 必须经过 spotlight() 消毒后才能装入 WebReferencePayload。
 */
export function createSerperWebSearchAdapter(config: SerperAdapterConfig | undefined): WebSearchAdapter {
  return {
    sourceId: 'serper',
    async run(): Promise<never> {
      if (!config?.apiKey) {
        throw new ToolNotConfiguredError(
          WEB_SEARCH_TOOL_ID,
          '搜索适配器缺少 apiKey 配置：凭证通过配置注入，不进代码库；未配置时不得静默改用 mock，只能降级为 not_configured。',
        );
      }
      throw new ToolNotImplementedError(
        WEB_SEARCH_TOOL_ID,
        'serper.dev 真实请求与响应映射尚未接入，当前仅为适配器骨架：需要确认官方 API 请求/响应约定后补全。',
      );
    },
  };
}
