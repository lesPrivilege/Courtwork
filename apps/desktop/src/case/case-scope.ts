import type { ScenarioFlow } from '../protocol/client';
import { DEMO_CASE_ROOT } from '../system/demo-case-layout';
import type { CaseSummary } from './types';

/** 样板案容器 id——demo 语料与装配只属于此 id（docs/21 + D-1）。 */
export const DEMO_CASE_ID = 'demo-linjiang';

export function isDemoCaseId(caseId: string): boolean {
  return caseId === DEMO_CASE_ID;
}

export function createDemoCaseSummary(): CaseSummary {
  return {
    id: DEMO_CASE_ID,
    title: '临江精铸 诉 起云智能 设备采购合同纠纷',
    caseNumber: '(2025)云章03民初472号',
    fileCount: 20,
    archived: false,
    folderPath: DEMO_CASE_ROOT,
    isDemo: true,
    kind: 'case',
  };
}

/** 案件域路径一律由 activeCase.folderPath 派生，禁止回落 demo 根。 */
export function resolveCaseRoot(active: CaseSummary): string | undefined {
  if (active.folderPath) return active.folderPath;
  if (active.isDemo || isDemoCaseId(active.id)) return DEMO_CASE_ROOT;
  return undefined;
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
 */
export const CASE_SCOPE_AUDIT = [
  {
    symbol: 'DEMO_CASE / DEMO_CASE_ID',
    kind: '合法全局' as const,
    note: '仅标识样板案容器，不注入非 demo 会话',
  },
  {
    symbol: 'DEMO_ARTIFACTS fallback in render',
    kind: '死路由' as const,
    note: '已改为仅 isDemo 时回落；非 demo 禁止 demo 语料',
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
    symbol: 'DEMO_OUTPUT_DIR / DEMO_OUTPUT_DOCX 直读',
    kind: '死路由' as const,
    note: '已改为 caseOutputDir(resolveCaseRoot(active))',
  },
  {
    symbol: 'caseRoot ?? DEMO_CASE_ROOT',
    kind: '死路由' as const,
    note: '非 demo 无 folderPath 时不回落 demo 根',
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
    symbol: 'createDemoClient module singleton',
    kind: '合法全局' as const,
    note: '协议客户端；replay 仅 demo 容器调用',
  },
  {
    symbol: 'Composer DEMO_CASE_OPTIONS / case chip',
    kind: '死路由' as const,
    note: '已改为 activeCase 投影注入；随 selectedCaseId 重置；非 demo 禁止粘滞临江案名',
  },
  {
    symbol: 'rail-footer lead attorney · 林律师',
    kind: '应派生' as const,
    note: 'docs/52 #17：demo persona 仅 isDemo 案件显示；非 demo 案件不渲染主办律师占位',
  },
] as const;
