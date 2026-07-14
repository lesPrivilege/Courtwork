import type { ArtifactDescriptorDataV1, RuntimeArtifactDescriptor } from '@courtwork/registry';

export type HostArtifactDescriptor = RuntimeArtifactDescriptor;

type PresentationField = NonNullable<ArtifactDescriptorDataV1['presentation']>['fields'][number];

type ProjectedCell =
  | { kind: 'text'; text: string; mono: boolean }
  | { kind: 'tags'; values: string[] }
  | { kind: 'anchor'; sourceCount: number; pages: number[]; quotes: string[] };

export type ArtifactTableProjection =
  | {
      status: 'ready';
      title: string;
      fields: PresentationField[];
      rows: ProjectedCell[][];
    }
  | { status: 'unsupported' };

const POINTER = /^(?:\/(?:[^~/]|~[01])*)*$/;

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

function textCell(value: unknown, mono: boolean): ProjectedCell | undefined {
  if (value === null) return { kind: 'text', text: '—', mono };
  if (typeof value === 'string') return { kind: 'text', text: value, mono };
  if (mono && typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'text', text: String(value), mono };
  }
  return undefined;
}

function rangeText(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const low = (value as { low?: unknown }).low;
  const high = (value as { high?: unknown }).high;
  if (
    typeof low !== 'number'
    || !Number.isFinite(low)
    || typeof high !== 'number'
    || !Number.isFinite(high)
    || high < low
  ) {
    return undefined;
  }
  return `${low}–${high}`;
}

function estimateCell(field: PresentationField, value: unknown): ProjectedCell | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'text', text: String(value), mono: true };
  }
  const directRange = rangeText(value);
  if (directRange !== undefined) return { kind: 'text', text: directRange, mono: true };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const envelope = value as { value?: unknown; range?: unknown; status?: unknown };
  if (!Object.hasOwn(envelope, 'value') || !Object.hasOwn(envelope, 'range') || !Object.hasOwn(envelope, 'status')) {
    return undefined;
  }
  if (typeof envelope.status !== 'string') return undefined;
  const statusLabel = field.valueLabels?.[envelope.status];
  if (statusLabel === undefined) return undefined;
  const hasValue = typeof envelope.value === 'number' && Number.isFinite(envelope.value);
  const range = envelope.range === null ? undefined : rangeText(envelope.range);
  const hasRange = range !== undefined;
  if (envelope.value !== null && !hasValue) return undefined;
  if (envelope.range !== null && !hasRange) return undefined;
  if (hasValue === hasRange) {
    return hasValue ? undefined : { kind: 'text', text: statusLabel, mono: false };
  }
  return {
    kind: 'text',
    text: hasValue ? String(envelope.value) : range!,
    mono: true,
  };
}

function projectCell(field: PresentationField, value: unknown): ProjectedCell | undefined {
  if (field.format === 'text') return textCell(value, false);
  if (field.format === 'mono') return textCell(value, true);
  if (field.format === 'number') {
    if (value === null) return { kind: 'text', text: '—', mono: false };
    return typeof value === 'number' && Number.isFinite(value)
      ? { kind: 'text', text: String(value), mono: false }
      : undefined;
  }
  if (field.format === 'estimate') return estimateCell(field, value);
  if (field.format === 'enum' || field.format === 'status' || field.format === 'grade') {
    if (typeof value !== 'string') return undefined;
    const label = field.valueLabels?.[value];
    return label === undefined ? undefined : { kind: 'text', text: label, mono: false };
  }
  if (field.format === 'tags') {
    if (!Array.isArray(value)) return undefined;
    const labels: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string') return undefined;
      const label = field.valueLabels?.[item];
      if (label === undefined) return undefined;
      labels.push(label);
    }
    return { kind: 'tags', values: labels };
  }
  if (field.format === 'anchor') {
    if (!Array.isArray(value)) return undefined;
    const pages = new Set<number>();
    const quotes: string[] = [];
    for (const anchor of value) {
      if (anchor === null || typeof anchor !== 'object' || Array.isArray(anchor)) return undefined;
      const page = (anchor as { page?: unknown }).page;
      const quote = (anchor as { quote?: unknown }).quote;
      if (page !== undefined) {
        if (typeof page !== 'number' || !Number.isFinite(page)) return undefined;
        pages.add(page);
      }
      if (quote !== undefined) {
        if (typeof quote !== 'string') return undefined;
        quotes.push(quote);
      }
    }
    return {
      kind: 'anchor',
      sourceCount: value.length,
      pages: [...pages].sort((left, right) => left - right),
      quotes,
    };
  }
  return undefined;
}

/** 整体 schema 验证成功后才开始 presentation 投影；任一漂移整面 fail closed。 */
export function projectArtifactTable(
  descriptor: HostArtifactDescriptor,
  payload: unknown,
): ArtifactTableProjection {
  const parsed = descriptor.schema.safeParse(payload);
  const presentation = descriptor.presentation;
  if (!parsed.success || presentation === undefined || presentation.fields.length === 0) {
    return { status: 'unsupported' };
  }
  const collection = presentation.collectionPointer === undefined
    ? [parsed.data]
    : resolvePointer(parsed.data, presentation.collectionPointer);
  if (!Array.isArray(collection)) return { status: 'unsupported' };

  const rows: ProjectedCell[][] = [];
  for (const item of collection) {
    const row: ProjectedCell[] = [];
    for (const field of presentation.fields) {
      const raw = resolvePointer(item, field.pointer);
      if (raw === undefined) return { status: 'unsupported' };
      const cell = projectCell(field, raw);
      if (cell === undefined) return { status: 'unsupported' };
      row.push(cell);
    }
    rows.push(row);
  }
  return { status: 'ready', title: descriptor.title, fields: presentation.fields, rows };
}

export function UnsupportedArtifactView({ title }: { title: string }) {
  return (
    <section className="artifact-incompatible" data-testid="artifact-incompatible" role="status">
      <h3>{title}</h3>
      <p>当前版本不支持此工作面</p>
    </section>
  );
}

function ArtifactCell({ cell }: { cell: ProjectedCell }) {
  if (cell.kind === 'tags') {
    return <>{cell.values.length > 0 ? cell.values.join(' · ') : '—'}</>;
  }
  if (cell.kind === 'anchor') {
    return (
      <div className="artifact-anchor-summary">
        <span>{cell.sourceCount} 个来源</span>
        {cell.pages.length > 0 && <span>{cell.pages.map((page) => `第 ${page} 页`).join(' · ')}</span>}
        {cell.quotes.map((quote, index) => <q key={`${index}:${quote}`}>{quote}</q>)}
      </div>
    );
  }
  return <span className={cell.mono ? 'artifact-table-mono' : undefined}>{cell.text}</span>;
}

export function ArtifactTableRenderer({
  descriptor,
  payload,
}: {
  descriptor: HostArtifactDescriptor;
  payload: unknown;
}) {
  const projection = projectArtifactTable(descriptor, payload);
  if (projection.status === 'unsupported') return <UnsupportedArtifactView title={descriptor.title} />;
  return (
    <section className="artifact-table-view" data-testid="artifact-table-view">
      <h3>{projection.title}</h3>
      <div className="artifact-table-scroll">
        <table className="artifact-table">
          <thead>
            <tr>{projection.fields.map((field) => <th key={field.pointer} scope="col">{field.label}</th>)}</tr>
          </thead>
          <tbody>
            {projection.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => <td key={`${rowIndex}:${projection.fields[cellIndex]!.pointer}`}><ArtifactCell cell={cell} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
