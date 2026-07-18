import * as z from 'zod';
import {
  defineTool,
  ToolNotConfiguredError,
  ToolNotImplementedError,
  ToolOutOfCoverageError,
  type ToolAdapter,
  type ToolDefinition,
} from './contract.js';

/** Open discriminator: each vertical owns its citation taxonomy and validation. */
export const CitationTypeEnum = z.string().trim().min(1).max(64);
export type CitationType = z.infer<typeof CitationTypeEnum>;

export const CiteCheckInputSchema = z.object({
  citationText: z.string().min(1),
  citationType: CitationTypeEnum,
});
export type CiteCheckInput = z.infer<typeof CiteCheckInputSchema>;

export const CiteCheckDataSchema = z.object({
  citationType: CitationTypeEnum,
  normalizedCitation: z.string().min(1),
  exists: z.boolean(),
  /** null means the selected citation taxonomy does not define a validity state. */
  currentlyValid: z.boolean().nullable(),
  notes: z.string().optional(),
});
export type CiteCheckData = z.infer<typeof CiteCheckDataSchema>;

export type CiteCheckAdapter = ToolAdapter<CiteCheckInput, CiteCheckData>;

const CITE_CHECK_TOOL_ID = 'cite-check';
const CITE_CHECK_TIMEOUT_MS = 8_000;
/** Verified citation records use a bounded cache; adapters remain free to fail closed. */
const CITE_CHECK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function createCiteCheckTool(adapter: CiteCheckAdapter): ToolDefinition<CiteCheckInput, CiteCheckData> {
  return defineTool(
    {
      id: CITE_CHECK_TOOL_ID,
      inputSchema: CiteCheckInputSchema,
      dataSchema: CiteCheckDataSchema,
      timeoutMs: CITE_CHECK_TIMEOUT_MS,
      cacheTtlMs: CITE_CHECK_CACHE_TTL_MS,
    },
    adapter,
  );
}

/** mock 适配器不接受任何配置——它的行为不可能受凭证是否存在影响，也不可能被误当成真实核验结果。 */
export function createMockCiteCheckAdapter(): CiteCheckAdapter {
  return {
    sourceId: 'mock',
    async run(input) {
      return {
        citationType: input.citationType,
        normalizedCitation: input.citationText,
        exists: true,
        currentlyValid: null,
      };
    },
  };
}

/**
 * demo-fixture 查找函数：调用方（未来的装配点）负责实现，本文件不 import 任何具体的
 * fixture 数据包——理由同 party-verify.ts 的 PartyFixtureLookup。返回 undefined 表示
 * "演示库未收录该引用"，适配器会把它翻译成 ToolOutOfCoverageError，不是"该引用不存在"
 * 的结论。
 */
export interface CitationFixtureLookup {
  (input: CiteCheckInput): CiteCheckData | undefined;
}

/** B 级信源（自建/演示库）适配器：数据源以注入方式传入，本文件不持有任何具体演示数据。 */
export function createDemoFixtureCiteCheckAdapter(lookup: CitationFixtureLookup): CiteCheckAdapter {
  return {
    sourceId: 'demo-fixture',
    async run(input) {
      const found = lookup(input);
      if (!found) {
        throw new ToolOutOfCoverageError(
          CITE_CHECK_TOOL_ID,
          `演示库未收录引用"${input.citationText}"：查不到不等于不存在，禁止据此判定该引用不存在或无效。`,
        );
      }
      return found;
    },
  };
}

export interface PublicLawDbAdapterConfig {
  baseUrl?: string;
  apiKey?: string;
}

/**
 * 真实引用校验适配器骨架。具体数据源与 citationType 规则由受信装配点选择，
 * 不进入本机器层。尚未接入真实查询与响应映射，也没有可依据的接口约定；为避免编造查询路径与响应字段，
 * 此处在配置齐备后仍明确抛出"未实现"而不是尝试拼一个看起来合理的请求。
 * 补全时：查询方式按选定数据源的实际约定实现；成功分支的 source 固定为 'public-law-db'
 * （与 mock 的 'mock' 明确区分，不得复用）；响应映射的产出必须能通过 CiteCheckDataSchema
 * 校验——校验不通过会被契约层兜底降级为 invalid_response，不会向下游泄漏假数据。
 */
export function createPublicLawDbCiteCheckAdapter(config: PublicLawDbAdapterConfig | undefined): CiteCheckAdapter {
  return {
    sourceId: 'public-law-db',
    async run() {
      if (!config?.baseUrl) {
        throw new ToolNotConfiguredError(
          CITE_CHECK_TOOL_ID,
          '引用校验适配器缺少 baseUrl 配置：地址与可能的凭证通过配置注入，不进代码库；未配置时不得静默改用 mock，只能降级为 not_configured。',
        );
      }
      throw new ToolNotImplementedError(
        CITE_CHECK_TOOL_ID,
        '引用数据源的真实查询与响应映射尚未接入，当前仅为适配器骨架：需要受信装配点选定数据源并确认其查询约定后补全。',
      );
    },
  };
}
