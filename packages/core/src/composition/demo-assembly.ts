import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findPartyRecord, type PartyCorpusRecord } from '@courtwork/demo-data';
import { LEGAL_PACKAGE, S3_RISK_LIST_DRAFT, S3_PDF_DOSSIER_DRAFT } from '@courtwork/legal';
import { admitPackages, buildPackageRegistries, type PackageRegistries } from '@courtwork/registry';
import { convertToReadingView, type ReadingViewOutcome } from '@courtwork/reading-view';
import {
  createDemoFixturePartyVerifyAdapter,
  createPartyVerifyTool,
  type PartyVerifyData,
  type PartyVerifyInput,
} from '@courtwork/tools';
import { createToolRegistry, type ToolRegistry } from '../tools/tool-registry.js';
import { createScriptedProvider } from '../provider/scripted-provider.js';
import type { Provider } from '../provider/types.js';
import type { MaterialInput } from '../assembly/segments.js';

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
 * 装配点（composition root，docs/decisions/ADR-001-package-abi.md 例外条款）：全仓库运行时代码中唯一允许
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

  // 寻址信封（四知·知输出）+ 引用闭环（拍板一）：脚本响应交草稿（引语无坐标），
  // 坐标由 resolver 对材料文本层公证铸造——演示管线与真管线过同一道门。
  const provider = createScriptedProvider('demo-scripted-provider', 'fake-scripted-v1', [
    {
      content: JSON.stringify({
        target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' },
        artifact: S3_RISK_LIST_DRAFT,
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

/** ReadingViewOutcome → MaterialInput：语料全文 + sha256 + 文本层块（resolver 公证基底）1:1 派生。 */
export function materialFromReadingView(outcome: ReadingViewOutcome, sourceBytes: Uint8Array): MaterialInput {
  if (outcome.status !== 'ok') {
    throw new Error(`材料 ${outcome.fileId} 阅读视图不可用（${outcome.status}）——公证基底缺失，不静默降级`);
  }
  // md/txt 路径有意不填 textLayerVersion（原件本身即文本层，reading-view 既裁）——
  // 公证锚点仍须携版本作漂移检测，消费侧对全文铸一枚源文版本，不动管线契约。
  const sourceVersion = `source-text@1+${createHash('sha256').update(outcome.view.markdown).digest('hex').slice(0, 16)}`;
  return {
    fileId: outcome.fileId,
    sha256: createHash('sha256').update(sourceBytes).digest('hex'),
    readingMarkdown: outcome.view.markdown,
    blocks: outcome.view.paragraphs.map((paragraph) => ({
      blockId: String(paragraph.index),
      page: paragraph.anchor.page,
      // 块文本取锚点 quote（原件真实子串），非 markdown（含 ## 等装饰）——公证对原文。
      text: paragraph.anchor.quote ?? '',
      rangeBase: paragraph.anchor.textRange?.start ?? 0,
      textLayerVersion: paragraph.anchor.textLayerVersion ?? sourceVersion,
    })),
  };
}

/**
 * LEGAL-DEMO-RUN（PDF 卷宗档）装配：与 buildDemoS3Runtime 同一装配点、不同剧本——
 * 脚本响应回放 S3_PDF_DOSSIER_DRAFT（引语出自生成 PDF 文本层），party-verify 查询
 * 对象为对方主体（委托方＝乙方起云智能，核验卖方临江精铸）。剧本与考点住 legal
 * demo 包，这里只做绑定。
 */
export function buildLegalDemoRunRuntime(): DemoS3Runtime {
  const base = buildDemoS3Runtime();
  return {
    ...base,
    provider: createScriptedProvider('demo-scripted-provider', 'fake-scripted-v1', [
      {
        content: JSON.stringify({
          target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' },
          artifact: S3_PDF_DOSSIER_DRAFT,
        }),
        reasoningContent:
          '通读合同两页与信用查询单：付款、验收、风险转移、所有权、不可抗力、管辖各条对买方的失衡点逐条核对，并对照关联公司网络核验收款主体。',
      },
    ]),
    toolInputs: { 'party-verify': { name: '临江精铸科技有限公司' } },
  };
}

const DEMO_DOCX_PATH = join(import.meta.dirname, '..', '..', '..', 'output', 'test', 'fixtures', 'original.docx');
const DEMO_CREDIT_MD_PATH = join(import.meta.dirname, '..', '..', '..', 'demo-data', 'data', 'dossier', '20-企业信用信息查询单.md');
const DEMO_CONTRACTS_DIR = join(import.meta.dirname, '..', '..', '..', 'demo-data', 'data', 'contracts');

/** LEGAL-DEMO-RUN 材料路径（装配点数据源绑定）：生成 PDF 原件 + docx 修订孪生 + 信用查询单。 */
export const LEGAL_DEMO_MATERIAL_PATHS = {
  contractPdf: join(DEMO_CONTRACTS_DIR, '设备采购合同.pdf'),
  contractDocxTwin: join(DEMO_CONTRACTS_DIR, '设备采购合同.docx'),
  creditMd: DEMO_CREDIT_MD_PATH,
} as const;

/**
 * S3 演示材料装配：被审合同（docx 文本层，risk-01–06 引语出处）+ 企业信用查询单
 * （md 文本层，risk-07 引语出处）。真实数据接入 = 换文件来源，派生逻辑零改动。
 */
export async function loadDemoS3Materials(): Promise<MaterialInput[]> {
  const docxBytes = new Uint8Array(readFileSync(DEMO_DOCX_PATH));
  const creditBytes = new Uint8Array(readFileSync(DEMO_CREDIT_MD_PATH));
  const [contract, credit] = await Promise.all([
    convertToReadingView({ fileId: 'sample-sale-contract-v1.docx', fileName: 'sample-sale-contract-v1.docx', data: docxBytes }),
    convertToReadingView({ fileId: '20-企业信用信息查询单.md', fileName: '20-企业信用信息查询单.md', data: creditBytes }),
  ]);
  return [materialFromReadingView(contract, docxBytes), materialFromReadingView(credit, creditBytes)];
}
