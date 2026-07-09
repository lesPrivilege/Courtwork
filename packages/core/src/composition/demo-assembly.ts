import { findPartyRecord, type PartyCorpusRecord } from '@courtwork/demo-data';
import {
  createDemoFixturePartyVerifyAdapter,
  createPartyVerifyTool,
  type PartyVerifyData,
  type PartyVerifyInput,
} from '@courtwork/tools';
import { createToolRegistry, type ToolRegistry } from '../tools/tool-registry.js';
import { createScriptedProvider } from '../provider/scripted-provider.js';
import type { Provider } from '../provider/types.js';
import { S3_RISK_LIST_RESPONSE } from './s3-risk-list-response.js';

/**
 * 富语料 → 核验字段子集的投影。参考 packages/tools/src/party-verify.test.ts 的
 * projectPartyRecord（那里明确标注是"提前演示装配点长什么样"，非生产代码）——
 * 这里是生产标准的正式落地，真正的装配点。
 */
function projectPartyRecord(record: PartyCorpusRecord): PartyVerifyData {
  return {
    matchedName: record.entityName,
    unifiedSocialCreditCode: record.unifiedSocialCreditCode,
    businessStatus: record.registrationStatus,
    litigationSummary:
      record.litigationSummary === '无公开涉诉记录'
        ? []
        : [{ caseNumber: '(2025)云章03民初472号', summary: record.litigationSummary }],
  };
}

function corpusLookup(input: PartyVerifyInput): PartyVerifyData | undefined {
  const record = findPartyRecord(input.name);
  return record ? projectPartyRecord(record) : undefined;
}

export interface DemoS3Runtime {
  tools: ToolRegistry;
  provider: Provider;
  toolInputs: Record<string, unknown>;
}

/**
 * 全仓库唯一 import @courtwork/demo-data 的运行时文件（docs/21 定义的装配点例外）。
 * 真实数据接入 = 换这一个文件的 wiring，其余板块零改动。
 */
export function buildDemoS3Runtime(): DemoS3Runtime {
  const tools = createToolRegistry();
  tools.register('party-verify', {
    tool: createPartyVerifyTool(createDemoFixturePartyVerifyAdapter(corpusLookup)),
    grade: 'B',
  });

  const provider = createScriptedProvider('demo-scripted-provider', 'fake-scripted-v1', [
    { content: JSON.stringify(S3_RISK_LIST_RESPONSE) },
  ]);

  return {
    tools,
    provider,
    toolInputs: { 'party-verify': { name: '起云智能装备（虚构）有限公司' } },
  };
}
