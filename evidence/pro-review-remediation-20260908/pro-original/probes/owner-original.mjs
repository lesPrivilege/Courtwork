import path from 'node:path';
import { CoreClient } from './client.mjs';

// Host lifecycle owns the worker. Keep the established data coordinate so old
// evidence-memo records need no file move or second writable database.
export class WorkCoreOwner {
  constructor(dataDir) {
    this.client = new CoreClient({ dataDir: path.join(dataDir, 'extensions', 'evidence-memo') });
  }
  async close() { await this.client.close(); }
}

const MEMO_PROPOSAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['artifact_text', 'evidence', 'obligations'],
  properties: {
    artifact_text: { type: 'string', minLength: 1, maxLength: 100000 },
    evidence: { type: 'array' }, obligations: { type: 'array' },
  },
};

export function workProjection(view, { extension, writable = false, contractVersion = null, revisionProposalSchema = MEMO_PROPOSAL_SCHEMA } = {}) {
  const candidates = view.candidates ?? [];
  const compatible = contractVersion === view.matter.contract_version
    && (!view.domain || view.domain.schemaVersion === 1)
    && candidates.every(c => !c.domain || c.domain.schemaVersion === 1);
  const humanActions = [];
  if (writable && compatible) {
    for (const candidate of candidates) {
      if (candidate.status !== 'pending' || candidate.base_version !== view.matter.version
        || candidate.source_version !== view.matter.source_version || candidate.contract_version !== view.matter.contract_version) continue;
      humanActions.push({
        schemaVersion: 1, action: 'decide', label: `Review candidate ${candidate.id}`,
        payloadSchema: {
          type: 'object', additionalProperties: false,
          required: ['request_id', 'candidate_id', 'base_version', 'action', 'reason'],
          properties: {
            request_id: { type: 'string' }, candidate_id: { const: candidate.id }, base_version: { const: candidate.base_version },
            action: { enum: ['accept', 'reject', 'request_evidence'] }, reason: { type: 'string', minLength: 1 },
          },
        },
      });
    }
    for (const candidate of candidates) {
      // A revision is a fresh proposal at the current work version. Its parent
      // may be closed or source-stale; historical decisions are not revoked.
      if (candidate.contract_version !== view.matter.contract_version) continue;
      humanActions.push({
        schemaVersion: 1, action: 'revise_candidate', label: `Revise candidate ${candidate.id}`,
        payloadSchema: {
          type: 'object', additionalProperties: false,
          required: ['candidate_id', 'new_candidate_id', 'base_version', 'proposal'],
          properties: {
            candidate_id: { const: candidate.id }, new_candidate_id: { type: 'string', minLength: 1 },
            base_version: { const: view.matter.version }, proposal: structuredClone(revisionProposalSchema),
          },
        },
      });
    }
  }
  return {
    schemaVersion: 1, contractVersion: view.matter.contract_version,
    domain: view.domain ?? null, extension, matter: view.matter, title: view.title, sources: view.sources,
    candidates, artifact: view.artifact, draft: view.draft, decisions: view.decisions,
    runs: view.runs, evidence: candidates.flatMap(c => c.evidence),
    stateVersion: view.core_state_digest, readOnly: !writable || !compatible,
    compatibility: compatible ? 'supported' : 'read_only',
    humanActions,
  };
}

export function compileWorkContext(view, limit = 24000) {
  const required = { schemaVersion: 1, domain: view.domain ?? null, matter: view.matter, artifact: view.artifact,
    sourceRefs: view.sources.map(({id,version,digest}) => ({id,version,digest})),
    pending: view.candidates.filter(c => c.status === 'pending').map(c => ({id:c.id,baseVersion:c.base_version,domain:c.domain})) };
  const text = JSON.stringify(required);
  if (text.length > limit) throw Object.assign(new Error('Required work context exceeds budget'), {code:'CONTEXT_BUDGET'});
  return {text, provenance:{matterId:view.matter.id,stateVersion:view.matter.version,sourceVersion:view.matter.source_version,contractVersion:view.matter.contract_version,selected:['effective artifact','obligations','pending candidates','source references'],omitted:['source bodies available through scoped read tool','closed candidates and execution trace'],characters:text.length,limit}};
}
