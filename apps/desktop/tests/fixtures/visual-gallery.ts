import { getPmFixture } from '@courtwork/demo-data';
import type { RiskList } from '@courtwork/legal/schemas';
import { createDesktopPackageRuntime } from '../../src/composition/package-runtime.js';
import { projectArtifactTable, type HostArtifactDescriptor } from '../../src/preview/projection/artifact-table.js';
import { freezeViewModel, type AnchorView, type EvidenceView } from '../../src/preview/projection/view-model.js';
import type { GallerySpecimenView, VisualizationGalleryView } from '../../src/preview/gallery/VisualizationGallery.js';

export const PM_PRD_REVIEW_HASH = 'sha256:e627e10e6f02d6839871e9da9e4fd1ebbede2db3dac0582b68f7ca73ee082f9c';
export const LEGAL_RISK_LIST_HASH = 'sha256:8cd77784331b51166c46012b51480290d5f942eee25ddfa825a9c142e8a36487';

function pmEvidence(): EvidenceView {
  const fixture = getPmFixture();
  const runtime = createDesktopPackageRuntime();
  const descriptor = runtime.packageRegistries.artifactSchemas.get('pm.PrdReview')?.descriptor;
  if (!descriptor) throw new Error('PM fixture descriptor missing');
  const projection = projectArtifactTable(descriptor as HostArtifactDescriptor, fixture.artifacts.prdReview);
  if (projection.status !== 'ready') throw new Error('PM fixture projection failed');
  const anchorCell = projection.rows[0]?.find((cell) => cell.kind === 'anchor');
  if (!anchorCell || anchorCell.kind !== 'anchor' || anchorCell.views.length === 0) throw new Error('PM fixture anchor missing');
  return {
    statement: fixture.artifacts.prdReview.findings[0]!.issue,
    verification: 'verified',
    anchors: anchorCell.views.map((anchor): AnchorView => ({ ...anchor, availability: 'quote_only' })),
  };
}

function legalEvidence(fixture: RiskList): EvidenceView {
  const risk = fixture.risks[0]!;
  return {
    statement: risk.description,
    verification: 'verified',
    anchors: risk.basis.flatMap((basis, basisIndex) => basis.sourceAnchors.map((anchor, anchorIndex) => ({
      id: `legal-risk-${basisIndex}-${anchorIndex}`,
      fileLabel: anchor.fileId,
      quote: anchor.quote!,
      availability: 'quote_only' as const,
    }))),
  };
}

export function createRealFixtureGallery(legalFixture: RiskList): VisualizationGalleryView {
  const specimens: GallerySpecimenView[] = [
    { id: 'pm-evidence', kind: 'evidence_quote', title: 'Evidence quote', state: 'implemented', lines: [], primitive: { kind: 'evidence', view: pmEvidence() }, fixture: { namespace: 'pm', hash: PM_PRD_REVIEW_HASH } },
    { id: 'legal-evidence', kind: 'evidence_chain', title: 'Evidence chain', state: 'implemented', lines: [], primitive: { kind: 'evidence', view: legalEvidence(legalFixture) }, fixture: { namespace: 'legal', hash: LEGAL_RISK_LIST_HASH } },
    { id: 'status', kind: 'status_overview', title: 'Status overview', state: 'implemented', lines: [], primitive: { kind: 'status_set', views: [
      { label: '中性', tone: 'neutral' },
      { label: '已生成', tone: 'generated' },
      { label: '已验证', tone: 'verified' },
      { label: '需注意', tone: 'warning' },
      { label: '临界', tone: 'critical' },
    ] } },
    { id: 'matrix', kind: 'compare_matrix', title: 'Compare matrix', state: 'candidate', lines: ['字段', '状态', '值 A', '值 B'] },
    { id: 'timeline', kind: 'timeline', title: 'Timeline', state: 'candidate', lines: ['节点 A', '节点 B', '节点 C'] },
    { id: 'graph', kind: 'entity_graph', title: 'Entity graph', state: 'deferred', lines: ['实体 A', '关系', '实体 B'] },
    { id: 'estimate', kind: 'estimate', title: 'Estimate', state: 'implemented', lines: [], primitive: { kind: 'estimate', view: { range: { low: 2, high: 4 }, unit: '区间' } } },
    { id: 'ranking', kind: 'priority_ranking', title: 'Priority ranking', state: 'candidate', lines: ['条目 A', '条目 B', '条目 C'] },
    { id: 'ledger', kind: 'action_ledger', title: 'Action ledger', state: 'candidate', lines: ['动作 A', '动作 B', '动作 C'] },
    { id: 'coverage', kind: 'coverage_view', title: 'Coverage view', state: 'implemented', lines: [], primitive: { kind: 'partial', view: { completed: 2, total: 3, failures: ['待补材料'], pending: 1 } } },
    { id: 'revision', kind: 'revision_compare', title: 'Revision compare', state: 'candidate', lines: ['原始字段', '修订字段'] },
    { id: 'decision', kind: 'interaction_decision', title: 'Interaction decision', state: 'implemented', lines: [], primitive: { kind: 'decision', view: { requestId: 'gallery-request', state: 'pending', actions: [{ id: 'confirm', label: '确认' }, { id: 'revise', label: '修正' }] } } },
  ];
  return freezeViewModel({ title: 'Schema Visualization Kit', provenance: 'Legal / PM authoritative fixtures', specimens });
}
