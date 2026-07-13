/**
 * 渲染兜底（兜底四层之③，docs/architecture/schema-engineering.md 组装-回填包域律）：artifact 有 schema 无 renderer 时，
 * 底座以键值/树形只读保底——可读不可美，永不白屏。本文件是纯逻辑层（路由与树化），
 * 组件见 GenericStructurePanel。
 */

/** 已有渲染归宿的 artifact 类型（legal 包七类各有面板/模块）；此外的类型落通用结构视图。 */
export const HOMED_ARTIFACT_TYPES = new Set([
  'legal.CaseFile',
  'legal.Timeline',
  'legal.PartyGraph',
  'legal.RiskList',
  'legal.ReviewMatrix',
  'legal.RevisionInstructionSet',
  'legal.FileOpsPlan',
]);

/** 会话产物里无渲染归宿的条目（typeId → 数据）。 */
export function unhomedArtifacts(artifacts: Partial<Record<string, unknown>>): Array<{ typeId: string; artifact: unknown }> {
  return Object.entries(artifacts)
    .filter(([typeId, artifact]) => artifact !== undefined && !HOMED_ARTIFACT_TYPES.has(typeId))
    .map(([typeId, artifact]) => ({ typeId, artifact }));
}

export interface StructureRow {
  depth: number;
  label: string;
  value?: string;
}

const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;

function scalarText(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/**
 * 确定性树化：对象按键序原样展开（不排序——wire 序即声明序）、数组截断显示、
 * 深度封顶防巨物；同输入同输出，可 golden。
 */
export function toStructureRows(value: unknown, depth = 0, label = ''): StructureRow[] {
  if (depth > MAX_DEPTH) return [{ depth, label, value: '（层级过深，已折叠）' }];
  if (Array.isArray(value)) {
    const rows: StructureRow[] = label === '' ? [] : [{ depth, label: `${label}（${value.length} 项）` }];
    const childDepth = label === '' ? depth : depth + 1;
    value.slice(0, MAX_ARRAY_ITEMS).forEach((item, index) => {
      rows.push(...toStructureRows(item, childDepth, `#${index + 1}`));
    });
    if (value.length > MAX_ARRAY_ITEMS) {
      rows.push({ depth: childDepth, label: `…其余 ${value.length - MAX_ARRAY_ITEMS} 项未展开` });
    }
    return rows;
  }
  if (value !== null && typeof value === 'object') {
    const rows: StructureRow[] = label === '' ? [] : [{ depth, label }];
    const childDepth = label === '' ? depth : depth + 1;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      rows.push(...toStructureRows(child, childDepth, key));
    }
    return rows;
  }
  return [{ depth, label, value: scalarText(value) }];
}
