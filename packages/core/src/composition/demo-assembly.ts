import { findPartyRecord, type PartyCorpusRecord } from '@courtwork/demo-data';
import { LEGAL_PACKAGE, S3_RISK_LIST_RESPONSE } from '@courtwork/legal';
import { admitPackages, buildPackageRegistries, type PackageRegistries } from '@courtwork/registry';
import {
  createDemoFixturePartyVerifyAdapter,
  createPartyVerifyTool,
  type PartyVerifyData,
  type PartyVerifyInput,
} from '@courtwork/tools';
import { createToolRegistry, type ToolRegistry } from '../tools/tool-registry.js';
import { createScriptedProvider } from '../provider/scripted-provider.js';
import type { Provider } from '../provider/types.js';

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
  /** 包准入产物：legal 包经 ABI 门装载（装配点绑定，core 其余板块只见 registry 接口）。 */
  registries: PackageRegistries;
}

/**
 * 装配点（composition root，docs/21 例外条款）：全仓库运行时代码中唯一允许
 * import @courtwork/demo-data 与 @courtwork/legal 的绑定层——包域律的物理边界
 * 由 core 单测 package-boundary.test.ts 机器守护。真实数据接入 = 换这一个文件的
 * wiring，其余板块零改动。
 */
export function buildDemoS3Runtime(): DemoS3Runtime {
  const tools = createToolRegistry();
  tools.register('party-verify', {
    tool: createPartyVerifyTool(createDemoFixturePartyVerifyAdapter(corpusLookup)),
    grade: 'B',
    sideEffect: 'pure_read',
  });

  // 寻址信封（四知·知输出）：脚本响应同样按址交货——地址错在 schema 层即拒收，
  // 演示管线与真管线过同一道门。
  const provider = createScriptedProvider('demo-scripted-provider', 'fake-scripted-v1', [
    {
      content: JSON.stringify({
        target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' },
        artifact: S3_RISK_LIST_RESPONSE,
      }),
    },
  ]);

  const admission = admitPackages([LEGAL_PACKAGE]);
  if (admission.rejected.length > 0) {
    // 装配点对包拒载不静默（诚实降级在 UI 层是禁用态；在装配点是显式失败）。
    const detail = admission.rejected.map((r) => `${r.packageId}: ${r.issues.join('；')}`).join('\n');
    throw new Error(`legal 包未通过 ABI 准入：\n${detail}`);
  }

  return {
    tools,
    provider,
    toolInputs: { 'party-verify': { name: '起云智能装备（虚构）有限公司' } },
    registries: buildPackageRegistries(admission.admitted),
  };
}
