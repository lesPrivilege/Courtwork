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

export function workProjection(view, { extension, writable = false, contractVersion = null } = {}) {
  const candidates = view.candidates ?? [];
  const compatible = contractVersion === view.matter.contract_version
    && (!view.domain || view.domain.schemaVersion === 1)
    && candidates.every(c => !c.domain || c.domain.schemaVersion === 1);
  return {
    schemaVersion: 1, contractVersion: view.matter.contract_version,
    domain: view.domain ?? null, extension, matter: view.matter, title: view.title, sources: view.sources,
    candidates, artifact: view.artifact, draft: view.draft, decisions: view.decisions,
    runs: view.runs, evidence: candidates.flatMap(c => c.evidence),
    stateVersion: view.core_state_digest, readOnly: !writable || !compatible,
    compatibility: compatible ? 'supported' : 'read_only',
    humanActions: writable && compatible ? candidates.filter(c => c.status === 'pending' && c.base_version === view.matter.version && c.source_version === view.matter.source_version && c.contract_version === view.matter.contract_version).map(c => ({
      action: 'decide', label: `Review candidate ${c.id}`, payloadSchema: {
        type: 'object', additionalProperties: false,
        required: ['request_id','candidate_id','base_version','action','reason'],
        properties: { request_id: {type:'string'},candidate_id:{const:c.id},base_version:{const:c.base_version},action:{enum:['accept','reject','request_evidence']},reason:{type:'string',minLength:1} },
      },
    })) : [],
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
