import * as z from 'zod';
import {
  defineTool,
  ToolNotConfiguredError,
  ToolNotImplementedError,
  ToolOutOfCoverageError,
  type ToolAdapter,
  type ToolDefinition,
} from './contract.js';

export const PartyVerifyInputSchema = z.object({
  name: z.string().min(1),
  unifiedSocialCreditCode: z.string().min(1).optional(),
});
export type PartyVerifyInput = z.infer<typeof PartyVerifyInputSchema>;

const LitigationRecordSchema = z.object({
  caseNumber: z.string().min(1),
  summary: z.string().min(1),
});

export const PartyVerifyDataSchema = z.object({
  matchedName: z.string().min(1),
  unifiedSocialCreditCode: z.string().min(1).optional(),
  businessStatus: z.string().min(1),
  litigationSummary: z.array(LitigationRecordSchema),
});
export type PartyVerifyData = z.infer<typeof PartyVerifyDataSchema>;

export type PartyVerifyAdapter = ToolAdapter<PartyVerifyInput, PartyVerifyData>;

const PARTY_VERIFY_TOOL_ID = 'party-verify';
const PARTY_VERIFY_TIMEOUT_MS = 8_000;
/** 工商状态/涉诉概要不是分钟级变化的数据，但也不宜缓存过久，6 小时是 MVP 阶段的折中值。 */
const PARTY_VERIFY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function createPartyVerifyTool(adapter: PartyVerifyAdapter): ToolDefinition<PartyVerifyInput, PartyVerifyData> {
  return defineTool(
    {
      id: PARTY_VERIFY_TOOL_ID,
      inputSchema: PartyVerifyInputSchema,
      dataSchema: PartyVerifyDataSchema,
      timeoutMs: PARTY_VERIFY_TIMEOUT_MS,
      cacheTtlMs: PARTY_VERIFY_CACHE_TTL_MS,
    },
    adapter,
  );
}

/** mock 适配器不接受任何配置——它的行为不可能受凭证是否存在影响，也不可能被误当成真实核验结果。 */
export function createMockPartyVerifyAdapter(): PartyVerifyAdapter {
  return {
    sourceId: 'mock',
    async run(input) {
      return {
        matchedName: input.name,
        unifiedSocialCreditCode: input.unifiedSocialCreditCode,
        businessStatus: '存续',
        litigationSummary: [],
      };
    },
  };
}

/**
 * demo-fixture 查找函数：调用方（未来的装配点）负责实现，本文件不 import 任何具体的
 * fixture 数据包（@courtwork/demo-data 之类）——"src 只认接口，不认数据"，见
 * docs/21-架构决定-演示数据包与样板案.md。返回 undefined 表示"演示库未收录该主体"，
 * 适配器会把它翻译成 ToolOutOfCoverageError，不是"该主体不存在"的结论。
 */
export interface PartyFixtureLookup {
  (input: PartyVerifyInput): PartyVerifyData | undefined;
}

/** B 级信源（自建/演示库）适配器：数据源以注入方式传入，本文件不持有任何具体演示数据。 */
export function createDemoFixturePartyVerifyAdapter(lookup: PartyFixtureLookup): PartyVerifyAdapter {
  return {
    sourceId: 'demo-fixture',
    async run(input) {
      const found = lookup(input);
      if (!found) {
        throw new ToolOutOfCoverageError(
          PARTY_VERIFY_TOOL_ID,
          `演示库未收录主体"${input.name}"：查不到不等于不存在，禁止据此判定该主体不存在或状态异常。`,
        );
      }
      return found;
    },
  };
}

export interface QccAdapterConfig {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * 真实主体核验适配器骨架（企查查/天眼查，二选一，MVP 先接企查查）。
 * 尚未接入真实请求与响应映射：没有官方 API 文档与凭证可依据，为避免编造端点路径与响应字段、
 * 用假数据冒充"已对接"，此处在凭证齐备后仍明确抛出"未实现"而不是尝试拼一个看起来合理的请求。
 * 补全时：请求/鉴权按官方文档实现；成功分支的 source 固定为 'qcc'（与 mock 的 'mock' 明确区分，
 * 不得复用）；响应映射的产出必须能通过 PartyVerifyDataSchema 校验——校验不通过会被契约层
 * 兜底降级为 invalid_response，不会向下游泄漏假数据。
 */
export function createQccPartyVerifyAdapter(config: QccAdapterConfig | undefined): PartyVerifyAdapter {
  return {
    sourceId: 'qcc',
    async run() {
      if (!config?.apiKey || !config?.baseUrl) {
        throw new ToolNotConfiguredError(
          PARTY_VERIFY_TOOL_ID,
          '企查查/天眼查适配器缺少 apiKey/baseUrl 配置：真实主体核验的凭证通过配置注入，不进代码库；未配置时不得静默改用 mock，只能降级为 not_configured。',
        );
      }
      throw new ToolNotImplementedError(
        PARTY_VERIFY_TOOL_ID,
        '企查查/天眼查真实请求与响应映射尚未接入，当前仅为适配器骨架：需要官方 API 文档确认请求路径与响应字段后补全。',
      );
    },
  };
}
