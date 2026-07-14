import { Anchor, Estimate, Field, Status } from './primitives/index.js';
import {
  projectArtifactTable,
  type ArtifactTableCellView,
  type HostArtifactDescriptor,
} from './projection/artifact-table.js';

export {
  projectArtifactTable,
  type ArtifactTableProjection,
  type HostArtifactDescriptor,
} from './projection/artifact-table.js';

export function UnsupportedArtifactView({ title }: { title: string }) {
  return (
    <section className="artifact-incompatible" data-testid="artifact-incompatible" role="status">
      <h3>{title}</h3>
      <p>当前版本不支持此工作面</p>
    </section>
  );
}

function ArtifactCell({ cell }: { cell: ArtifactTableCellView }) {
  if (cell.kind === 'field') return <Field view={cell.view} />;
  if (cell.kind === 'status') return <Status view={cell.view} />;
  if (cell.kind === 'estimate') return <Estimate view={cell.view} />;
  return (
    <div className="artifact-anchor-summary">
      <span>{cell.views.length} 个来源</span>
      {cell.views.map((view) => <Anchor key={view.id} view={view} />)}
    </div>
  );
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
            <tr>{projection.columns.map((column) => <th key={column.id} scope="col">{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {projection.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => <td key={`${rowIndex}:${projection.columns[cellIndex]!.id}`}><ArtifactCell cell={cell} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
