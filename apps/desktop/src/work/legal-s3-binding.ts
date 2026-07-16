/**
 * LEGAL-S3-BINDING-1 · 概念二：legal.S3 合同审查场景的**生产装配点**（ADR-010 决定五 + 就绪图）。
 *
 * 闭合内容：显式主体输入（缺主体/缺工具显式阻断，不默认补全）、真实 party-verify 工具装配
 * （qcc 适配器，未配置即 typed not_configured，绝不换 demo/mock）、材料经 `resolveForProvider` 核验后才入
 * provider、live gate projection（由真实 RiskList + package policy 构造，不复用 demo `GATES`）、逐条
 * revision mapping（confirm→confirmed / reject→rejected /risks/<i>/dispositionStatus，revise 保持 pending 非终态）、
 * session 原文绑定（docx 源文只从复验后的会话材料取）、以及首个真实 `ArtifactEnvelope` 版本源。
 *
 * **browser-safe**：runtime 只走 `@courtwork/core/work-protocol` 与 `@courtwork/tools/*` 子路径、
 * `@courtwork/legal(/package)`、`@courtwork/registry`（零 `node:*`）；类型走 `import type`。
 * **零 demo**：绝不 import demo/recording/DEMO_ARTIFACTS/demo-data/demo-runtime，绝不消费 demo 原文——
 * 由 `scripts/assert-legal-s3-contracts.mjs` 静态门守卫（注入 demo 依赖触红）。
 *
 * 本单是就绪图倒数第二环：只闭合装配语义（`WorkCommandPort` start/{done}/cancel 全链、跨重启 replay 与
 * desktop 运行控制归 `WORK-LIVE-1`，消费本模块的纯装配件）。
 */
import { createToolRegistry, type ToolRegistry } from '@courtwork/core/work-protocol';
import { createToolExecutor } from '@courtwork/tools/contract';
import { createPartyVerifyTool, createQccPartyVerifyAdapter } from '@courtwork/tools/party-verify';
import { LEGAL_PACKAGE } from '@courtwork/legal/package';
import { admitPackages, buildPackageRegistries } from '@courtwork/registry';
import type { ArtifactVersioningSource } from '@courtwork/core/work-protocol';
import type { WorkStateStore } from '@courtwork/core/work-protocol';
import type {
  ConfirmationActor,
  EvidenceGradeAnnotation,
  EvidenceLedger,
  MaterialInput,
  RevisionInput,
  ScenarioExecutorDeps,
  ScenarioResumeInput,
  ScenarioRunInput,
  TurnRunnerPort,
} from '@courtwork/core';
import type { PackageRegistries, ScenarioRuntime } from '@courtwork/registry';
import type { RiskList } from '@courtwork/legal';
import type { ReviewGateItemProjection, ReviewGateProjection, ReviewResolution } from '../protocol/client';
import type { ResolveResult } from '../material/material-store';
import type { MaterialBlockReason, StoredMaterial } from '../material/material-ref';

export const S3_SCENARIO_ID = 'legal.S3';
export const S3_RISK_LIST_TYPE = 'legal.RiskList';
export const PARTY_VERIFY_TOOL_ID = 'party-verify';
/** legal 包的 artifact schemaVersion（版本信封 schemaVersion 真源；v1 单版本）。 */
export const LEGAL_S3_SCHEMA_VERSION = LEGAL_PACKAGE.identity.schemaVersion;

// ─── 错误闭集（每一类失败显式到达 UI，零静默降级）───────────────────────────

/** 缺主体：主体名称必须来自受控 preflight，不从案名/文件名/正文/模型猜测；空/仅空白即阻断。 */
export class MissingContractPartyError extends Error {
  constructor() {
    super('合同审查缺少显式主体输入——主体名称必须来自受控 preflight（不从案名/文件名/正文/模型猜测）');
    this.name = 'MissingContractPartyError';
  }
}

/** 缺工具输入：scenario 声明的 toolId 未获显式输入，绝不默认补全。 */
export class MissingToolInputError extends Error {
  constructor(readonly scenarioId: string, readonly missingToolIds: readonly string[]) {
    super(`场景 ${scenarioId} 缺少工具输入：${missingToolIds.join('、')}——缺工具输入必须显式阻断，不默认补全`);
    this.name = 'MissingToolInputError';
  }
}

/** 材料 provider 前核验未通过：漂移/删除/需 OCR/跨案不入 provider，绝不读 demo、不猜内容。 */
export class MaterialResolutionBlockedError extends Error {
  constructor(readonly materialId: string, readonly reason: MaterialBlockReason) {
    super(`材料 ${materialId} provider 前核验未通过（${reason}）——不入 provider，绝不回落 demo 或猜内容`);
    this.name = 'MaterialResolutionBlockedError';
  }
}

/** revise 保持 pending 进入编辑，不得当终态 resume（存在待编辑项即不可续行）。 */
export class ReviseNotTerminalError extends Error {
  constructor(readonly itemRefs: readonly string[]) {
    super(`存在待编辑（revise）审阅项 ${itemRefs.join('、')}——revise 保持 pending 进入编辑，不得当终态 resume`);
    this.name = 'ReviseNotTerminalError';
  }
}

/** 逐条处置未覆盖全部条目：不足以形成合法 revisions，不得续行。 */
export class IncompleteReviewError extends Error {
  constructor(readonly uncoveredItemRefs: readonly string[]) {
    super(`审阅项 ${uncoveredItemRefs.join('、')} 尚未处置——只有全部条目形成合法 revisions 才可续行`);
    this.name = 'IncompleteReviewError';
  }
}

/** 处置引用了 RiskList 中不存在的审阅项。 */
export class UnknownReviewItemError extends Error {
  constructor(readonly itemRef: string) {
    super(`处置引用了不存在的审阅项 "${itemRef}"——确认清单与 RiskList 失真`);
    this.name = 'UnknownReviewItemError';
  }
}

// ─── 显式主体输入 → 工具输入 ───────────────────────────────────────────────

export interface ContractPartySubject {
  partyName: string;
  unifiedSocialCreditCode?: string;
}

/** 显式结构化主体输入 → party-verify 工具输入。空/仅空白 → MissingContractPartyError（不默认补全）。 */
export function buildS3ToolInputs(subject: ContractPartySubject): Record<string, unknown> {
  const name = subject.partyName?.trim();
  if (!name) throw new MissingContractPartyError();
  return {
    [PARTY_VERIFY_TOOL_ID]: {
      name,
      ...(subject.unifiedSocialCreditCode ? { unifiedSocialCreditCode: subject.unifiedSocialCreditCode } : {}),
    },
  };
}

/** scenario 声明的每个 toolId 必须有显式输入；缺任一 → MissingToolInputError。 */
export function assertScenarioToolInputsComplete(scenario: ScenarioRuntime, toolInputs: Record<string, unknown>): void {
  const missing = scenario.toolIds.filter((toolId) => toolInputs[toolId] === undefined);
  if (missing.length > 0) throw new MissingToolInputError(scenario.id, missing);
}

/**
 * 装配 S3 的 `ScenarioRunInput`：显式主体 → toolInputs（缺主体/缺工具显式阻断），材料经会话与语料段注入。
 * `subject` 缺省即触发缺工具输入阻断（不默认补全）。
 */
export function buildS3RunInput(input: {
  scenario: ScenarioRuntime;
  subject: ContractPartySubject | undefined;
  materials: MaterialInput[];
  caseFile?: unknown;
}): ScenarioRunInput {
  const toolInputs = input.subject === undefined ? {} : buildS3ToolInputs(input.subject);
  assertScenarioToolInputsComplete(input.scenario, toolInputs);
  return {
    inputArtifacts: input.caseFile !== undefined ? { 'legal.CaseFile': input.caseFile } : {},
    toolInputs,
    materials: input.materials,
  };
}

// ─── 材料经 resolveForProvider 核验 → provider 输入 / docx 源文 ─────────────

/** 只需 resolveForProvider 的最小消费面（解耦 MaterialStore 具体类，便于装配与测试注入）。 */
export interface MaterialResolver {
  resolveForProvider(caseId: string, materialId: string): Promise<ResolveResult>;
}

/**
 * 逐件经 `resolveForProvider` 核验（漂移/删除/需 OCR/跨案已由 MATERIAL-INGRESS 闭合，本单消费不重造）；
 * 任一 blocked → 显式阻断，绝不入 provider。返回复验后的当前原件视图（source-neutral）。
 */
export async function resolveSessionMaterials(
  resolver: MaterialResolver,
  caseId: string,
  materialRefs: readonly string[],
): Promise<StoredMaterial[]> {
  const resolved: StoredMaterial[] = [];
  for (const materialId of materialRefs) {
    const result = await resolver.resolveForProvider(caseId, materialId);
    if (result.status === 'blocked') throw new MaterialResolutionBlockedError(materialId, result.reason);
    resolved.push(result.material);
  }
  return resolved;
}

/** 复验后的会话材料 → 六段组装的 MaterialInput（fileId=materialId，公证基底块 1:1）。 */
export function toMaterialInputs(materials: readonly StoredMaterial[]): MaterialInput[] {
  return materials.map((m) => ({
    fileId: m.materialId,
    sha256: m.contentSha256,
    readingMarkdown: m.readingMarkdown,
    blocks: m.blocks.map((block) => ({
      blockId: block.blockId,
      ...(block.page !== undefined ? { page: block.page } : {}),
      text: block.text,
      rangeBase: block.rangeBase,
      textLayerVersion: block.textLayerVersion,
    })),
  }));
}

/**
 * session 原文绑定：docx 编译源文只从本 session 冻结、`resolveForProvider` 刚复验的材料取
 * （ADR-010 决定五）。绝不消费 demo `contractSourceMd`——漂移即在 `resolveSessionMaterials` 整体阻断。
 */
export function bindDocxSourceMarkdown(material: StoredMaterial): string {
  return material.readingMarkdown;
}

// ─── 真实工具装配（qcc，非 demo/mock）───────────────────────────────────────

export interface S3PartyVerifyConfig {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * 生产 S3 工具注册表：party-verify 挂真实 QCC 适配器（sourceId='qcc'）。未配置 → typed `not_configured`、
 * 未实现 → typed `not_implemented`（executor 发布 step_failed），**绝不换 demo-fixture/mock 冒充已核验**。
 */
export function createProductionS3ToolRegistry(config?: S3PartyVerifyConfig): ToolRegistry {
  const tools = createToolRegistry();
  tools.register(PARTY_VERIFY_TOOL_ID, {
    tool: createPartyVerifyTool(createQccPartyVerifyAdapter(config)),
    grade: 'A',
    sideEffect: 'pure_read',
  });
  return tools;
}

// ─── live gate projection（真实 RiskList + package policy，不复用 demo GATES）────

/**
 * 由真实 RiskList + 证据台账构造 live gate projection（ADR-010 决定五）。package policy：
 * high 级 → `high_risk`；C 级未确认证据 → `unverified`；两者任一即强制逐条（individual），其余可批量（batch）。
 * 批量只是 UI 聚合手势——协议层处置永远逐条（core SPEC 拍板）。
 */
export function projectRiskListGate(
  riskList: RiskList,
  requestId: string,
  evidenceGrades: readonly EvidenceGradeAnnotation[] = [],
): ReviewGateProjection {
  const unverifiedKeys = new Set(evidenceGrades.filter((g) => g.grade === 'C' && !g.confirmed).map((g) => g.key));
  const items: ReviewGateItemProjection[] = riskList.risks.map((risk) => {
    const evidenceKeys = risk.basis.map((basis) => basis.citation);
    const reason: ReviewGateItemProjection['reason'] =
      risk.level === 'high'
        ? 'high_risk'
        : evidenceKeys.some((key) => unverifiedKeys.has(key))
          ? 'unverified'
          : undefined;
    return {
      itemRef: risk.id,
      mode: reason ? 'individual' : 'batch',
      evidenceKeys,
      ...(reason ? { reason } : {}),
    };
  });
  return { requestId, items };
}

// ─── 逐条 revision mapping（ADR-010 决定五）─────────────────────────────────

/**
 * 逐条处置 → core gate resume：confirm→`confirmed` / reject→`rejected`，各映射为
 * `/risks/<index>/dispositionStatus` 的 RevisionInput；revise 保持 pending 抛 `ReviseNotTerminalError`（非终态）。
 * 只有全部条目 confirm/reject 才以 `decision='confirm'` 续行（core 整体 `reject` 只表达终止整个场景，
 * 不承载单项驳回，故本映射永远产出 `confirm`）。
 */
export function mapReviewResolutionToResume(
  resolution: ReviewResolution,
  riskList: RiskList,
  actor: ConfirmationActor,
): ScenarioResumeInput {
  const revising = resolution.items.filter((item) => item.disposition === 'revise').map((item) => item.itemRef);
  if (revising.length > 0) throw new ReviseNotTerminalError(revising);

  const covered = new Set(resolution.items.map((item) => item.itemRef));
  const uncovered = riskList.risks.filter((risk) => !covered.has(risk.id)).map((risk) => risk.id);
  if (uncovered.length > 0) throw new IncompleteReviewError(uncovered);

  const indexById = new Map(riskList.risks.map((risk, index) => [risk.id, index] as const));
  const revisions: RevisionInput[] = resolution.items.map((item) => {
    const index = indexById.get(item.itemRef);
    if (index === undefined) throw new UnknownReviewItemError(item.itemRef);
    const risk = riskList.risks[index];
    return {
      artifactType: S3_RISK_LIST_TYPE,
      artifactId: riskList.caseId,
      fieldPath: `/risks/${index}/dispositionStatus`,
      previousValue: risk.dispositionStatus,
      newValue: item.disposition === 'reject' ? 'rejected' : 'confirmed',
      caseId: riskList.caseId,
    };
  });

  return {
    actor,
    decision: 'confirm',
    revisions,
    ...(resolution.instrumentation ? { instrumentation: resolution.instrumentation } : {}),
  };
}

// ─── ArtifactEnvelope 版本源（首个真实生产者）+ 装配件 ─────────────────────

/**
 * 从已准入包 registries 构造 `ArtifactEnvelope` 版本源：typeId → 归属包/schemaVersion/payload 校验（descriptor.schema）。
 * schemaVersion 从 `schemaVersionByPackage`（package identity 真源）读取；缺登记 → undefined（拒收不猜）。
 */
export function buildArtifactVersioningSource(
  registries: PackageRegistries,
  schemaVersionByPackage: Record<string, number>,
): ArtifactVersioningSource {
  return {
    resolve(typeId) {
      const entry = registries.artifactSchemas.get(typeId);
      if (!entry) return undefined;
      const schemaVersion = schemaVersionByPackage[entry.packageId];
      if (schemaVersion === undefined) return undefined;
      return {
        packageId: entry.packageId,
        schemaVersion,
        validate(payload) {
          const parsed = entry.descriptor.schema.safeParse(payload);
          return parsed.success ? { ok: true, value: parsed.data } : { ok: false, issues: parsed.error.message };
        },
      };
    },
  };
}

/** 准入 legal 包（生产装配点唯一绑定 legal 的物理边界）；拒载不静默（装配点显式失败）。 */
export function admitLegalS3Package(): PackageRegistries {
  const admission = admitPackages([LEGAL_PACKAGE]);
  if (admission.rejected.length > 0) {
    const detail = admission.rejected.map((r) => `${r.packageId}: ${r.issues.join('；')}`).join('\n');
    throw new Error(`legal 包未通过 ABI 准入：\n${detail}`);
  }
  return buildPackageRegistries(admission.admitted);
}

/** 取 legal.S3 运行时场景；未注册即显式失败（legal 包装载异常）。 */
export function getS3Scenario(registries: PackageRegistries): ScenarioRuntime {
  const scenario = registries.scenarios.get(S3_SCENARIO_ID);
  if (!scenario) throw new Error(`${S3_SCENARIO_ID} 未在场景注册表中——legal 包装载异常`);
  return scenario;
}

/**
 * 生产 S3 executor deps 装配缝（WORK-LIVE-1 消费）：把 WorkStateStore 四段账本 + commit 屏障、真实工具、
 * 已准入 registries 组装为 `ScenarioExecutorDeps`。`persistBarrier` = `store.commit`（durable-before-effect）。
 * artifact 的版本信封由构造 store 时注入的 `artifactCodec` 在 commit/reload 侧闭合，本处不重复。
 */
export function createLegalS3ScenarioDeps(input: {
  store: WorkStateStore;
  tools: ToolRegistry;
  turnRunner: TurnRunnerPort;
  ledger: EvidenceLedger;
  registries: PackageRegistries;
  signal?: AbortSignal;
}): ScenarioExecutorDeps {
  return {
    tools: input.tools,
    toolExecutor: createToolExecutor(),
    turnRunner: input.turnRunner,
    eventLog: input.store.eventLog,
    confirmationStore: input.store.confirmationStore,
    revisionStore: input.store.revisionStore,
    ledger: input.ledger,
    artifacts: input.registries.artifactSchemas,
    projections: input.registries.projections,
    persistBarrier: async () => {
      await input.store.commit();
    },
    ...(input.signal ? { signal: input.signal } : {}),
  };
}
