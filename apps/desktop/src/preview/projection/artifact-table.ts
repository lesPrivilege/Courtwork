import type { ArtifactDescriptorDataV1, RuntimeArtifactDescriptor } from '@courtwork/registry';
import {
  freezeViewModel,
  type AnchorView,
  type EstimateView,
  type FieldView,
  type StatusView,
} from './view-model.js';

export type HostArtifactDescriptor = RuntimeArtifactDescriptor;
type PresentationField = NonNullable<ArtifactDescriptorDataV1['presentation']>['fields'][number];

export type ArtifactTableCellView =
  | Readonly<{ kind: 'field'; view: FieldView }>
  | Readonly<{ kind: 'status'; view: StatusView }>
  | Readonly<{ kind: 'estimate'; view: EstimateView }>
  | Readonly<{ kind: 'anchor'; views: readonly AnchorView[] }>;

export type ArtifactTableProjection =
  | Readonly<{
      status: 'ready';
      title: string;
      columns: readonly Readonly<{ id: string; label: string }>[];
      rows: readonly (readonly ArtifactTableCellView[])[];
    }>
  | Readonly<{ status: 'unsupported' }>;

const POINTER = /^(?:\/(?:[^~/]|~[01])*)*$/;
const unsupported = () => freezeViewModel({ status: 'unsupported' as const });

function resolvePointer(root: unknown, pointer: string): unknown {
  if (!POINTER.test(pointer) || pointer.split('/').slice(1).includes('*')) return undefined;
  if (pointer === '') return root;
  let current = root;
  for (const encoded of pointer.slice(1).split('/')) {
    if (current === null || typeof current !== 'object') return undefined;
    const segment = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function fieldCell(field: PresentationField, value: unknown, id: string): ArtifactTableCellView | undefined {
  if (field.format === 'text' || field.format === 'mono') {
    if (value !== null && typeof value !== 'string' && !(field.format === 'mono' && typeof value === 'number' && Number.isFinite(value))) return undefined;
    const view: FieldView = { id, label: field.label, value: value === null ? '—' : String(value), valueKind: field.format };
    return { kind: 'field', view };
  }
  if (field.format === 'number') {
    if (value === null) return { kind: 'field', view: { id, label: field.label, value: '—', valueKind: 'text' } };
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return { kind: 'field', view: { id, label: field.label, value: String(value), valueKind: 'text' } };
  }
  if (field.format === 'tags') {
    if (!Array.isArray(value)) return undefined;
    const labels: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string' || field.valueLabels?.[item] === undefined) return undefined;
      labels.push(field.valueLabels[item]);
    }
    return { kind: 'field', view: { id, label: field.label, value: labels, valueKind: 'tags' } };
  }
  if (field.format === 'enum' || field.format === 'status' || field.format === 'grade') {
    if (typeof value !== 'string') return undefined;
    const label = field.valueLabels?.[value];
    if (label === undefined) return undefined;
    return { kind: 'status', view: { label, tone: 'neutral' } };
  }
  return undefined;
}

function finiteRange(value: unknown): Readonly<{ low: number; high: number }> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const low = (value as { low?: unknown }).low;
  const high = (value as { high?: unknown }).high;
  if (typeof low !== 'number' || !Number.isFinite(low) || typeof high !== 'number' || !Number.isFinite(high) || high < low) return undefined;
  return { low, high };
}

function estimateCell(field: PresentationField, value: unknown): ArtifactTableCellView | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return { kind: 'estimate', view: { point: value } };
  const directRange = finiteRange(value);
  if (directRange) return { kind: 'estimate', view: { range: directRange } };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const envelope = value as { value?: unknown; range?: unknown; status?: unknown };
  if (!Object.hasOwn(envelope, 'value') || !Object.hasOwn(envelope, 'range') || !Object.hasOwn(envelope, 'status') || typeof envelope.status !== 'string') return undefined;
  const statusLabel = field.valueLabels?.[envelope.status];
  if (statusLabel === undefined) return undefined;
  const hasPoint = typeof envelope.value === 'number' && Number.isFinite(envelope.value);
  const range = envelope.range === null ? undefined : finiteRange(envelope.range);
  const hasRange = range !== undefined;
  if (envelope.value !== null && !hasPoint) return undefined;
  if (envelope.range !== null && !hasRange) return undefined;
  if (hasPoint === hasRange) return hasPoint ? undefined : { kind: 'estimate', view: { statusLabel } };
  return hasPoint ? { kind: 'estimate', view: { point: envelope.value as number } } : { kind: 'estimate', view: { range: range! } };
}

function anchorCell(value: unknown, rowIndex: number, columnIndex: number): ArtifactTableCellView | undefined {
  if (!Array.isArray(value)) return undefined;
  const views: AnchorView[] = [];
  for (const [index, item] of value.entries()) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return undefined;
    const fileId = (item as { fileId?: unknown }).fileId;
    const page = (item as { page?: unknown }).page;
    const quote = (item as { quote?: unknown }).quote;
    if (typeof fileId !== 'string' || fileId.trim().length === 0) return undefined;
    if (typeof quote !== 'string' || quote.length === 0) return undefined;
    if (page !== undefined && (typeof page !== 'number' || !Number.isInteger(page) || page <= 0)) return undefined;
    const basename = fileId.split(/[\\/]/).at(-1)!;
    const stem = basename.replace(/\.[^.]+$/, '') || basename;
    views.push({
      id: `artifact-anchor-${rowIndex}-${columnIndex}-${index}`,
      fileLabel: stem,
      ...(page === undefined ? {} : { page }),
      quote,
      availability: 'quote_only',
    });
  }
  return { kind: 'anchor', views };
}

function projectCell(field: PresentationField, value: unknown, rowIndex: number, columnIndex: number): ArtifactTableCellView | undefined {
  if (field.format === 'estimate') return estimateCell(field, value);
  if (field.format === 'anchor') return anchorCell(value, rowIndex, columnIndex);
  return fieldCell(field, value, `artifact-field-${rowIndex}-${columnIndex}`);
}

/** Complete validation precedes a namespace-blind, whitelist-only projection. */
export function projectArtifactTable(descriptor: HostArtifactDescriptor, payload: unknown): ArtifactTableProjection {
  const parsed = descriptor.schema.safeParse(payload);
  const presentation = descriptor.presentation;
  if (!parsed.success || presentation === undefined || presentation.fields.length === 0) return unsupported();
  const collection = presentation.collectionPointer === undefined ? [parsed.data] : resolvePointer(parsed.data, presentation.collectionPointer);
  if (!Array.isArray(collection)) return unsupported();
  const rows: ArtifactTableCellView[][] = [];
  for (const [rowIndex, item] of collection.entries()) {
    const row: ArtifactTableCellView[] = [];
    for (const [columnIndex, field] of presentation.fields.entries()) {
      const raw = resolvePointer(item, field.pointer);
      if (raw === undefined) return unsupported();
      const cell = projectCell(field, raw, rowIndex, columnIndex);
      if (cell === undefined) return unsupported();
      row.push(cell);
    }
    rows.push(row);
  }
  return freezeViewModel({
    status: 'ready' as const,
    title: descriptor.title,
    columns: presentation.fields.map((field, index) => ({ id: `artifact-column-${index}`, label: field.label })),
    rows,
  });
}
