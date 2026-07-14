import type { ReactNode } from 'react';
import { RepeatComposition } from '../composition/FiniteComposition.js';
import { Decision, Estimate, Evidence, Partial, Status } from '../primitives/index.js';
import {
  assertFrozenViewModel,
  type DecisionView,
  type EstimateView,
  type EvidenceView,
  type PartialView,
  type StatusView,
} from '../projection/view-model.js';

export const GALLERY_SPECIMEN_KINDS = [
  'evidence_quote',
  'evidence_chain',
  'status_overview',
  'compare_matrix',
  'timeline',
  'entity_graph',
  'estimate',
  'priority_ranking',
  'action_ledger',
  'coverage_view',
  'revision_compare',
  'interaction_decision',
] as const;

export type GallerySpecimenKind = typeof GALLERY_SPECIMEN_KINDS[number];
export type GallerySpecimenState = 'implemented' | 'candidate' | 'deferred';

export type GalleryPrimitive =
  | Readonly<{ kind: 'evidence'; view: EvidenceView }>
  | Readonly<{ kind: 'status'; view: StatusView }>
  | Readonly<{ kind: 'status_set'; views: readonly StatusView[] }>
  | Readonly<{ kind: 'estimate'; view: EstimateView }>
  | Readonly<{ kind: 'partial'; view: PartialView }>
  | Readonly<{ kind: 'decision'; view: DecisionView }>;

export interface GallerySpecimenView {
  readonly id: string;
  readonly kind: GallerySpecimenKind;
  readonly title: string;
  readonly state: GallerySpecimenState;
  readonly lines: readonly string[];
  readonly primitive?: GalleryPrimitive;
  readonly fixture?: Readonly<{ namespace: 'legal' | 'pm'; hash: string }>;
}

export interface VisualizationGalleryView {
  readonly title: string;
  readonly provenance: string;
  readonly specimens: readonly GallerySpecimenView[];
}

function line(lines: readonly string[], index: number): string {
  return lines[index] ?? `结构字段 ${index + 1}`;
}

function Primitive({ model }: { model: GalleryPrimitive }) {
  if (model.kind === 'evidence') return <Evidence view={model.view} />;
  if (model.kind === 'status') return <Status view={model.view} />;
  if (model.kind === 'status_set') {
    return <RepeatComposition items={model.views} render={(view) => <Status key={view.tone} view={view} />} />;
  }
  if (model.kind === 'estimate') return <Estimate view={model.view} />;
  if (model.kind === 'partial') return <Partial view={model.view} />;
  return <Decision view={model.view} />;
}

function specimenBody(specimen: GallerySpecimenView): ReactNode {
  if (specimen.primitive) return <Primitive model={specimen.primitive} />;
  const lines = specimen.lines;
  if (specimen.kind === 'evidence_quote') {
    return <blockquote><q>{line(lines, 0)}</q><cite>{line(lines, 1)}</cite></blockquote>;
  }
  if (specimen.kind === 'evidence_chain') {
    return <ol className="gallery-chain">{lines.slice(0, 4).map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}</ol>;
  }
  if (specimen.kind === 'status_overview' || specimen.kind === 'compare_matrix') {
    return (
      <table><thead><tr><th>{line(lines, 0)}</th><th>{line(lines, 1)}</th></tr></thead>
        <tbody><tr><td>{line(lines, 2)}</td><td>{line(lines, 3)}</td></tr></tbody></table>
    );
  }
  if (specimen.kind === 'timeline') {
    return <ol className="gallery-timeline">{lines.slice(0, 3).map((item, index) => <li key={`${index}:${item}`}><time>{index + 1}</time><span>{item}</span></li>)}</ol>;
  }
  if (specimen.kind === 'entity_graph') {
    return <div className="gallery-graph" role="img" aria-label={specimen.title}>{lines.slice(0, 4).map((item, index) => <span key={`${index}:${item}`}>{item}</span>)}</div>;
  }
  if (specimen.kind === 'estimate') {
    return <output className="gallery-estimate"><strong>{line(lines, 0)}</strong><span>{line(lines, 1)}</span></output>;
  }
  if (specimen.kind === 'priority_ranking' || specimen.kind === 'action_ledger') {
    return <ol className="gallery-ledger">{lines.slice(0, 4).map((item, index) => <li key={`${index}:${item}`}><b>{index + 1}</b><span>{item}</span></li>)}</ol>;
  }
  if (specimen.kind === 'coverage_view') {
    return <dl className="gallery-coverage"><div><dt>{line(lines, 0)}</dt><dd>{line(lines, 1)}</dd></div><div><dt>{line(lines, 2)}</dt><dd>{line(lines, 3)}</dd></div></dl>;
  }
  if (specimen.kind === 'revision_compare') {
    return <p className="gallery-revision"><del>{line(lines, 0)}</del><ins>{line(lines, 1)}</ins></p>;
  }
  return <div className="gallery-decision"><p>{line(lines, 0)}</p><button type="button" disabled>{line(lines, 1)}</button></div>;
}

export function VisualizationGallery({ view }: { view: VisualizationGalleryView }) {
  assertFrozenViewModel(view);
  if (view.specimens.length !== GALLERY_SPECIMEN_KINDS.length) {
    throw new Error(`Visualization gallery requires ${GALLERY_SPECIMEN_KINDS.length} specimens`);
  }
  const received = new Set(view.specimens.map((specimen) => specimen.kind));
  if (GALLERY_SPECIMEN_KINDS.some((kind) => !received.has(kind))) throw new Error('Visualization gallery specimen family drift');
  return (
    <main className="visualization-gallery" data-testid="visualization-gallery">
      <header className="gallery-header"><p>SCHEMA VISUALIZATION KIT</p><h1>{view.title}</h1><small>{view.provenance}</small></header>
      <div className="gallery-grid">
        {view.specimens.map((specimen) => (
          <section
            key={specimen.id}
            className={`gallery-specimen is-${specimen.kind}`}
            data-gallery-specimen={specimen.kind}
            data-state={specimen.state}
            data-namespace={specimen.fixture?.namespace}
          >
            <header><span>{specimen.kind.replaceAll('_', ' ')}</span><h2>{specimen.title}</h2><em>{specimen.state}</em></header>
            <div className="gallery-specimen-body">{specimenBody(specimen)}</div>
            {specimen.fixture && <footer><span>{specimen.fixture.namespace}</span><code>{specimen.fixture.hash}</code></footer>}
          </section>
        ))}
      </div>
    </main>
  );
}
