export const manifest = Object.freeze({
  schemaVersion: 1,
  id: 'evidence-memo',
  version: '0.1.0',
  title: 'Evidence Memo (development)',
  kind: 'development-extension',
  releaseStatus: 'development',
  owner: 'schema-engineering',
  applicability: 'A Matter with one approved source and a reviewable memo candidate.',
  exclusions: [
    'No Expert routing or approved release.',
    'No real provider credentials or external network access.',
    'No automatic candidate acceptance or publication.',
  ],
  declaredTools: ['se_read_source', 'se_submit_candidate', 'se_read_artifact'],
  surface: {
    id: 'evidence-memo',
    title: 'Evidence Memo',
    module: '/extensions/evidence-memo/renderer.mjs',
  },
  bindingFields: [
    { name: 'title', label: 'Title', multiline: false, required: true, maxLength: 120 },
    { name: 'sourceText', label: 'Source text', multiline: true, required: true, maxLength: 100_000 },
  ],
  stateCompatibility: 'v5-se-core-v1',
  rollback: 'Future activations only; existing Matter, Candidate and Artifact records remain immutable history.',
  deprecation: null,
  evalObligations: [
    'Run fake-provider tool, error, cancellation and admission-close fixtures.',
    'Keep human Review separate from model Candidate submission.',
    'Retain source digest and Evidence anchors for every Candidate.',
  ],
});
