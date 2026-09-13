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

// Applicability of a candidate's input basis, not authority to accept it.
export function candidateBasis(candidate, matter) {
  const reasons = [];
  if (candidate.base_version !== matter.version) reasons.push('base_version_changed');
  if (candidate.source_version !== matter.source_version) reasons.push('source_version_changed');
  if (candidate.contract_version !== matter.contract_version) reasons.push('contract_version_changed');
  return {current:reasons.length === 0,reasons};
}

// Compact the already-authorized surface, including domain restrictions. This
// is a read snapshot, not a decision descriptor or a second pending-work store.
export function workReviewSummary(projection) {
  const matter = projection?.matter;
  if (!matter || typeof matter.id !== 'string' || !Number.isSafeInteger(matter.version)
    || !Number.isSafeInteger(matter.source_version) || typeof matter.contract_version !== 'string'
    || typeof projection.stateVersion !== 'string' || !Array.isArray(projection.candidates)) return null;
  const pending = projection.candidates.filter(candidate => candidate.status === 'pending');
  const reviewable = new Set((projection.readOnly !== false ? [] : projection.humanActions ?? [])
    .filter(action => action.action === 'decide')
    .map(action => action.payloadSchema?.properties?.candidate_id?.const));
  return {
    matterId: matter.id, title: projection.title ?? '', version: matter.version,
    sourceVersion: matter.source_version, contractVersion: matter.contract_version,
    stateVersion: projection.stateVersion, readOnly: projection.readOnly !== false,
    pendingCount: pending.length,
    stalePendingCount: pending.filter(candidate => !candidateBasis(candidate, matter).current).length,
    reviewableCount: pending.filter(candidate => reviewable.has(candidate.id)).length,
    acceptedArtifactId: projection.artifact?.id ?? null,
  };
}

export function workProjection(view, { extension, writable = false, contractVersion = null, revisionProposalSchema = MEMO_PROPOSAL_SCHEMA } = {}) {
  const candidates = view.candidates ?? [];
  const compatible = contractVersion === view.matter.contract_version
    && (!view.domain || view.domain.schemaVersion === 1)
    && candidates.every(c => !c.domain || c.domain.schemaVersion === 1);
  const humanActions = [];
  if (writable && compatible) {
    for (const candidate of candidates) {
      if (candidate.status !== 'pending' || !candidateBasis(candidate,view.matter).current) continue;
      humanActions.push({
        schemaVersion: candidate.contract_version === 'se-file-memo-v1' ? 2 : 1,
        ...(candidate.contract_version === 'se-file-memo-v1' ? {fileCapabilityVersion:1} : {}), action: 'decide', label: `Review candidate ${candidate.id}`,
        payloadSchema: {
          type: 'object', additionalProperties: false,
          required: ['request_id', 'candidate_id', 'base_version', 'action', 'reason'],
          properties: {
            request_id: { type: 'string' }, candidate_id: { const: candidate.id }, base_version: { const: candidate.base_version },
            action: { enum: candidate.contract_version === 'se-file-memo-v1' && candidate.files?.acceptable !== true ? ['reject','request_evidence'] : ['accept', 'reject', 'request_evidence'] }, reason: { type: 'string', minLength: 1 },
          },
        },
      });
    }
    for (const candidate of candidates) {
      // A revision is a fresh proposal at the current work version. Its parent
      // may be closed or source-stale; historical decisions are not revoked.
      if (candidate.contract_version === 'se-file-memo-v1' || candidate.contract_version !== view.matter.contract_version) continue;
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
    ...(view.matter.contract_version === 'se-file-memo-v1' ? {fileCapability:{schemaVersion:1,contractVersion:'se-file-memo-v1',queries:['file-manifest','file-content','file-diff']}} : {}),
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
  let artifact = null;
  if (view.artifact) {
    const a = view.artifact;
    const origin = view.candidates.find(c=>c.id === a.candidate_id);
    const decision = view.decisions?.find(d=>d.action === 'accept' && d.result?.active_artifact === a.id);
    const reasons = [];
    if (!origin) reasons.push('origin_unavailable');
    else {
      if (origin.source_version !== view.matter.source_version) reasons.push('source_version_changed');
      if (origin.contract_version !== view.matter.contract_version) reasons.push('contract_version_changed');
    }
    artifact = {id:a.id,candidateId:a.candidate_id,contentDigest:a.content_digest,
      lengthCodePoints:Array.from(a.content).length,acceptedVersion:decision?.result?.version ?? null,
      sourceVersion:origin?.source_version ?? null,contractVersion:origin?.contract_version ?? null,
      basis:{current:reasons.length === 0,reasons},
      read:{tool:'se_read_artifact',artifactId:a.id,offset:0,limit:4000}};
  }
  const required = { schemaVersion: 2, domain: view.domain ?? null, matter: view.matter, artifact,
    sourceRefs: view.sources.map(({id,version,digest}) => ({id,version,digest})),
    pending: view.candidates.filter(c => c.status === 'pending').map(c => ({id:c.id,baseVersion:c.base_version,
      sourceVersion:c.source_version,contractVersion:c.contract_version,basis:candidateBasis(c,view.matter),domain:c.domain})) };
  const text = JSON.stringify(required);
  if (text.length > limit) throw Object.assign(new Error('Required work context exceeds budget'), {code:'CONTEXT_BUDGET'});
  return {text, provenance:{matterId:view.matter.id,stateVersion:view.matter.version,sourceVersion:view.matter.source_version,contractVersion:view.matter.contract_version,selected:['active artifact identity and input basis','obligations','pending candidates and input basis','source references'],omitted:['artifact body available through se_read_artifact','source bodies available through scoped read tool','closed candidates and execution trace'],characters:text.length,limit}};
}
