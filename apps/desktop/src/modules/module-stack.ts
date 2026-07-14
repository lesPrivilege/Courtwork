/**
 * 右栏模块栈状态机（docs/decisions/ADR-006-ui-host.md 三章）。
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
 * 宿主 renderer 已解析出的 module target 自动展开；模块状态机不理解垂类 type id。
 * 若用户曾手动设定该模块，则尊重 override，不改。
 */
export function applyModuleAutoExpand(
  open: ModuleOpenMap,
  override: UserModuleOverride,
  target: ModuleId | undefined,
): ModuleOpenMap {
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
