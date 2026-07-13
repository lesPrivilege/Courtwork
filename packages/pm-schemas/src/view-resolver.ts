import type { ArtifactDescriptor, FieldKind } from './descriptor.js';

/**
 * 描述符驱动的视图解析器——领域无关（本文件零领域字面量）。
 * 输入一份 artifact JSON + 其 descriptor，产出全字符串已词表映射的视图模型；
 * 换 descriptor 即换垂类，解析逻辑不改一行——这是"同宿主 descriptor 切换"的机制内核
 * （docs/69 F2.2：同一宿主按 descriptor 切换，core 与通用 renderer 不改）。
 *
 * 纪律：任一枚举/分级值在词表中无映射 → 抛 DescriptorVocabError，
 * 绝不回落机器字段名（docs/69 line155；docs/36 §五 零编码暴露律）。
 */

export class DescriptorVocabError extends Error {
  constructor(
    public readonly artifactType: string,
    public readonly fieldKey: string,
    public readonly rawValue: string,
  ) {
    super(`descriptor ${artifactType} 字段 "${fieldKey}" 无 "${rawValue}" 的词表映射（禁止回落机器值）`);
    this.name = 'DescriptorVocabError';
  }
}

export interface ResolvedCell {
  key: string;
  kind: FieldKind;
  /** 已词表映射的显示字符串（面向人的读者）。 */
  display: string;
  /** 原始 wire 值（供 diff/回填按址收货，不进人眼）。 */
  raw: unknown;
  /** anchor 字段：溯源锚数量与首条引语（溯源 hover）。 */
  anchorCount?: number;
  quote?: string;
}

export interface ResolvedRow {
  cells: ResolvedCell[];
}

export interface ResolvedView {
  title: string;
  columns: { key: string; label: string; kind: FieldKind }[];
  rows: ResolvedRow[];
}

/** 通用点分路径取值；任一段缺失即返回 undefined，不抛。 */
function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[seg];
  }, obj);
}

const EMPTY = '—';

function resolveCell(
  descriptor: ArtifactDescriptor,
  field: { key: string; kind: FieldKind },
  raw: unknown,
): ResolvedCell {
  const base: ResolvedCell = { key: field.key, kind: field.kind, display: EMPTY, raw };

  switch (field.kind) {
    case 'text':
    case 'mono':
    case 'number':
      base.display = raw === null || raw === undefined ? EMPTY : String(raw);
      return base;

    case 'enum':
    case 'status': {
      if (raw === null || raw === undefined) return base;
      const vocab = descriptor.enumVocab[field.key];
      const mapped = vocab?.[String(raw)];
      if (mapped === undefined) {
        throw new DescriptorVocabError(descriptor.artifactType, field.key, String(raw));
      }
      base.display = mapped;
      return base;
    }

    case 'grade': {
      if (raw === null || raw === undefined) return base;
      const mapped = descriptor.gradeVocab?.[raw as 'A' | 'B' | 'C'];
      if (mapped === undefined) {
        throw new DescriptorVocabError(descriptor.artifactType, field.key, String(raw));
      }
      base.display = mapped;
      return base;
    }

    case 'tags': {
      const list = Array.isArray(raw) ? raw : [];
      const vocab = descriptor.enumVocab[field.key];
      const mapped = list.map((elem) => {
        const label = vocab?.[String(elem)];
        if (label === undefined) {
          throw new DescriptorVocabError(descriptor.artifactType, field.key, String(elem));
        }
        return label;
      });
      base.display = mapped.length > 0 ? mapped.join('、') : EMPTY;
      return base;
    }

    case 'anchor': {
      const anchors = Array.isArray(raw) ? raw : [];
      base.anchorCount = anchors.length;
      const first = anchors[0];
      if (first && typeof first === 'object' && 'quote' in first) {
        const q = (first as { quote?: unknown }).quote;
        if (typeof q === 'string') base.quote = q;
      }
      base.display = String(anchors.length);
      return base;
    }

    default:
      return base;
  }
}

export function resolveArtifactView(artifact: unknown, descriptor: ArtifactDescriptor): ResolvedView {
  const collection = getPath(artifact, descriptor.primaryCollection);
  if (!Array.isArray(collection)) {
    throw new Error(
      `descriptor ${descriptor.artifactType} 的 primaryCollection "${descriptor.primaryCollection}" 未指向数组`,
    );
  }

  const columns = descriptor.fields.map((f) => ({ key: f.key, label: f.label, kind: f.kind }));
  const rows: ResolvedRow[] = collection.map((item) => ({
    cells: descriptor.fields.map((field) => resolveCell(descriptor, field, getPath(item, field.key))),
  }));

  return { title: descriptor.title, columns, rows };
}
