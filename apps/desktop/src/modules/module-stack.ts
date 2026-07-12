/**
 * 右栏模块栈状态机（docs/49 三章）。
 * 用户手动折叠/展开优先于 artifact 自动展开。
 */

export type ModuleId =
  | 'progress'
  | 'working-folders'
  | 'context'
  | 'timeline'
  | 'graph'
  | 'matrix'
  | 'revision'
  | 'draft';

export type ModuleOpenMap = Record<ModuleId, boolean>;

/** 全模块默认面板头可见；内容默认折叠，仅 progress 轻量预告可开 */
export const DEFAULT_MODULE_OPEN: ModuleOpenMap = {
  progress: true,
  'working-folders': false,
  context: false,
  timeline: false,
  graph: false,
  matrix: false,
  revision: false,
  draft: false,
};

/** artifact schema → 应自动展开的模块 */
export const ARTIFACT_TO_MODULE: Record<string, ModuleId> = {
  'legal.RiskList': 'revision',
  'legal.Timeline': 'timeline',
  'legal.PartyGraph': 'graph',
  'legal.ReviewMatrix': 'matrix',
  'legal.FileOpsPlan': 'working-folders',
};

export type UserModuleOverride = Partial<Record<ModuleId, boolean>>;

/**
 * 用户手动切换：写入 override，并更新 open 映射。
 */
export function toggleModuleManual(
  open: ModuleOpenMap,
  override: UserModuleOverride,
  id: ModuleId,
): { open: ModuleOpenMap; override: UserModuleOverride } {
  const nextOpen = !open[id];
  return {
    open: { ...open, [id]: nextOpen },
    override: { ...override, [id]: nextOpen },
  };
}

/**
 * artifact_produced 自动展开：若用户曾手动设定该模块，则尊重 override，不改。
 */
export function applyArtifactAutoExpand(
  open: ModuleOpenMap,
  override: UserModuleOverride,
  artifactType: string,
): ModuleOpenMap {
  const target = ARTIFACT_TO_MODULE[artifactType];
  if (!target) return open;
  if (override[target] !== undefined) return open;
  return { ...open, [target]: true, progress: open.progress || true };
}

/** frontier 形制：`3/6` */
export function progressHeadCount(done: number, total: number): string {
  const safeDone = Math.max(0, Math.min(done, total));
  return `${safeDone}/${total}`;
}

/** 右栏全折（收缩态）：仅保留面板头，内容全关 */
export function collapseAllModules(open: ModuleOpenMap): ModuleOpenMap {
  const next = { ...open };
  for (const key of Object.keys(next) as ModuleId[]) {
    next[key] = false;
  }
  return next;
}
