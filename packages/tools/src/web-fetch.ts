import * as z from 'zod';
import { defineTool, ToolWebReferenceError, type ToolAdapter, type ToolDefinition, type WebReferencePayload } from './contract.js';
import { classifyContentType, extractHtmlContent, readBodyWithLimit } from './web-fetch-extract.js';
import { fetchWithGuardedRedirects, type FetchLike, type HostResolver } from './web-fetch-ssrf.js';
import { spotlight } from './web-fetch-spotlight.js';

function isHttpOrHttpsUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export const WebFetchInputSchema = z.object({
  url: z.string().min(1).refine(isHttpOrHttpsUrl, { message: '仅支持 http/https URL' }),
});
export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;

/**
 * fetch 工具的成功路径结构上不存在——dataSchema 声明为 z.never()，run() 的返回类型是
 * Promise<never>：正常返回一个 verified:true 数据在编译期就不可能，唯一出口是抛出
 * ToolWebReferenceError（降级为 reason:'web_reference'）或其他错误（降级为对应 reason）。
 * 这是"C 级结果不许以任何路径获得 verified:true"（docs/decisions/ADR-003-evidence-and-anchors.md 红线）的结构化落点，mock
 * 适配器同样受此约束——不因为是开发用的假数据就开个口子。
 */
export type WebFetchAdapter = ToolAdapter<WebFetchInput, never>;

const WEB_FETCH_TOOL_ID = 'web-fetch';
const WEB_FETCH_TIMEOUT_MS = 10_000;
/** 抓取内容变化频率高、重复抓取的边际成本也不像付费核验接口那样值得省，10 分钟是"短 TTL"的 MVP 折中值。 */
const WEB_FETCH_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;

export function createWebFetchTool(adapter: WebFetchAdapter): ToolDefinition<WebFetchInput, never> {
  return defineTool(
    {
      id: WEB_FETCH_TOOL_ID,
      inputSchema: WebFetchInputSchema,
      dataSchema: z.never(),
      timeoutMs: WEB_FETCH_TIMEOUT_MS,
      cacheTtlMs: WEB_FETCH_CACHE_TTL_MS,
    },
    adapter,
  );
}

function buildMessage(title: string | undefined, finalUrl: string): string {
  return `抓取完成（C 级信源，未核验）：${title ?? finalUrl}`;
}

/** mock 适配器不接受任何配置，且和真实适配器一样只能走 web_reference 通道——不因为是假数据就允许伪装成已核验。 */
export function createMockWebFetchAdapter(): WebFetchAdapter {
  return {
    sourceId: 'mock',
    async run(input): Promise<never> {
      const content = spotlight(`这是 ${input.url} 的模拟抓取正文，仅用于开发/测试，不代表真实网页内容。`);
      const payload: WebReferencePayload = {
        kind: 'page',
        metadata: {
          url: input.url,
          finalUrl: input.url,
          title: '模拟页面标题',
          fetchedAt: new Date().toISOString(),
          contentType: 'html',
          truncated: false,
          possiblyIncomplete: false,
        },
        content,
      };
      throw new ToolWebReferenceError(WEB_FETCH_TOOL_ID, buildMessage(payload.metadata.title, input.url), payload);
    },
  };
}

export interface HttpWebFetchAdapterConfig {
  /** 默认走全局 fetch；测试注入录制夹具，不真实出网。 */
  fetchImpl?: FetchLike;
  /** 默认走系统 DNS；测试注入避免真实解析。 */
  resolveHost?: HostResolver;
  maxRedirects?: number;
  maxBodyBytes?: number;
  now?: () => number;
}

/**
 * 真实 HTTP 适配器：装配 SSRF 校验（web-fetch-ssrf）+ 大小/类型限制与正文提取
 * （web-fetch-extract）+ spotlighting 消毒（web-fetch-spotlight）。纯 HTTP GET，
 * 不执行 JS；证书校验失败与 SSRF 拦截均不做静默重试放宽，原样抛出后由契约层的
 * 通用 catch-all 降级为 adapter_error（docs/decisions/ADR-005-data-security.md 红线）。
 */
export function createHttpWebFetchAdapter(config?: HttpWebFetchAdapterConfig): WebFetchAdapter {
  const maxBodyBytes = config?.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const now = config?.now ?? Date.now;

  return {
    sourceId: 'http-fetch',
    async run(input, ctx): Promise<never> {
      const { response, finalUrl } = await fetchWithGuardedRedirects(input.url, {
        fetchImpl: config?.fetchImpl,
        resolveHost: config?.resolveHost,
        maxRedirects: config?.maxRedirects,
        signal: ctx.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}：${finalUrl}`);
      }

      const contentTypeHeader = response.headers.get('content-type') ?? '';
      const kind = classifyContentType(contentTypeHeader);
      if (!kind) {
        throw new Error(`不支持的 content-type（仅支持 html/text/json）：${contentTypeHeader || '(缺失)'}`);
      }

      const { text: rawBody, truncated } = await readBodyWithLimit(response, maxBodyBytes);

      let title: string | undefined;
      let bodyText: string;
      let possiblyIncomplete = false;
      if (kind === 'html') {
        const extracted = extractHtmlContent(rawBody, finalUrl);
        title = extracted.title;
        bodyText = extracted.text;
        possiblyIncomplete = extracted.possiblyIncomplete;
      } else {
        bodyText = rawBody;
      }

      const payload: WebReferencePayload = {
        kind: 'page',
        metadata: {
          url: input.url,
          finalUrl,
          title,
          fetchedAt: new Date(now()).toISOString(),
          contentType: kind,
          truncated,
          possiblyIncomplete,
        },
        content: spotlight(bodyText),
      };
      throw new ToolWebReferenceError(WEB_FETCH_TOOL_ID, buildMessage(title, finalUrl), payload);
    },
  };
}
