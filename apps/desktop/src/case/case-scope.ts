import type { ScenarioFlow } from '../protocol/client';
import type { CaseSummary } from './types';

/** 样板案容器 id——demo 语料与装配只属于此 id（docs/decisions/ADR-001-package-abi.md + D-1）。 */
export const DEMO_CASE_ID = 'demo-linjiang';

export function isDemoCaseId(caseId: string | null | undefined): boolean {
  return caseId === DEMO_CASE_ID;
}

export function createDemoCaseSummary(): CaseSummary {
  return {
    id: DEMO_CASE_ID,
    title: '临江精铸 诉 起云智能 设备采购合同纠纷',
    caseNumber: '(2025)云章03民初472号',
    fileCount: 20,
    archived: false,
    isDemo: true,
    kind: 'case',
  };
}

/**
 * CASE-ROOT-1：案件根的 opaque 绑定（替代绝对路径 `resolveCaseRoot`）。绝对路径与授权只住宿主：
 * - `demo`——样板案，容器语义由虚拟布局承载（仅浏览器/E2E mock，不触真实文件系统）；
 * - `grant`——真实案，宿主授权引用（grantId），绝对路径只在 Rust 宿主侧按 grantId 还原；
 * - `unbound`——尚未绑定文件夹。
 * renderer/wire 永不携带真实案件根绝对路径。
 */
export type CaseBinding =
  | { kind: 'demo' }
  | { kind: 'grant'; grantId: string }
  | { kind: 'unbound' };

export function resolveCaseBinding(active: CaseSummary): CaseBinding {
  if (active.isDemo || isDemoCaseId(active.id)) return { kind: 'demo' };
  if (active.grantId) return { kind: 'grant', grantId: active.grantId };
  return { kind: 'unbound' };
}

export function caseOutputDir(caseRoot: string): string {
  return `${caseRoot}/产出`;
}

export function caseOutputDocx(caseRoot: string, fileName = '合同审查报告.docx'): string {
  return `${caseRoot}/产出/${fileName}`;
}

export function stageLabel(flow: ScenarioFlow | null, isDemo: boolean): string {
  if (!isDemo || !flow) return '尚未开始阶段';
  return flow === 'S1' ? '阶段一 · 阅卷整理' : '阶段二 · 合同审查';
}

/**
 * D-1 容器作用域审计清单（静态扫描结果）。
 * 定性：合法全局 | 应派生 | 死路由（已修）。
 * CASE-ROOT-1 收口：`caseRoot ?? DEMO_CASE_ROOT` 回落与 `DEMO_OUTPUT_* 直读` 两条死路由已随
 * 绝对路径 `resolveCaseRoot`/`folderPath` 退役而彻底移除，不再登记。
 */
export const CASE_SCOPE_AUDIT = [
  {
    symbol: 'DEMO_CASE / DEMO_CASE_ID',
    kind: '合法全局' as const,
    note: '仅标识样板案容器，不注入非 demo 会话',
  },
  {
    symbol: 'main-injected fixture artifact fallback',
    kind: '死路由' as const,
    note: 'App 仅持有效 demo case/session ref 时查询 fixture artifact；非 demo 零调用',
  },
  {
    symbol: 'flow / session / dispositions',
    kind: '应派生' as const,
    note: '随 selectedCaseId 整体重置；demo 才 replay',
  },
  {
    symbol: 'titlebar case title / caseNumber',
    kind: '应派生' as const,
    note: '读 activeCase，禁止硬编码临江案',
  },
  {
    symbol: 'toolbar stage crumb',
    kind: '应派生' as const,
    note: 'stageLabel(activeCase)',
  },
  {
    symbol: 'OriginalsZone DEMO_ORIGINALS',
    kind: '应派生' as const,
    note: '仅 demo 案件渲染',
  },
  {
    symbol: 'credentialClient browserStatus',
    kind: '合法全局' as const,
    note: '本机凭证，非案件域',
  },
  {
    symbol: 'main composition → createDemoWorkFixture',
    kind: '合法全局' as const,
    note: '显式注入 projection/fixture adapter；App 无模块 singleton，非 demo 不查询 fixture',
  },
  {
    symbol: 'Composer DEMO_CASE_OPTIONS / case chip',
    kind: '死路由' as const,
    note: '已改为 activeCase 投影注入；随 selectedCaseId 重置；非 demo 禁止粘滞临江案名',
  },
  {
    symbol: 'queuedMessages / queued-message',
    kind: '应派生' as const,
    note: '每条绑定 caseId，只投影当前 selectedCaseId；切案零继承，切回原案恢复原队列',
  },
  {
    symbol: 'rail-footer lead attorney · 林律师',
    kind: '应派生' as const,
    note: 'docs/design/principles.md：demo persona 仅 isDemo 案件显示；非 demo 案件不渲染主办律师占位',
  },
] as const;
