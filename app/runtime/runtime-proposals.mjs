import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createTwoFilesPatch } from 'diff';
import { resolveRuntimeSource } from './source-resolver.mjs';

/* BE-6 / BE-7 first slice · declarative Skill proposals.
 *
 * The ledger holds what an Agent proposed and what a person decided. It is not
 * a second capability registry: nothing in it is compiled, exposed or loaded.
 * Only a human Apply — inside the existing configuration queue, active-Run
 * freeze and CAS on `runtime-control.json` — turns a proposal into a resource,
 * and that resource then follows every existing rule (exposure, admission,
 * `runtime_load` evidence). The file is written whole and atomically; the
 * crash-safety of Apply rests on a persisted pending marker that startup
 * reconciles against the configuration's own audit (see `recover`). */

export const PROPOSAL_KINDS = Object.freeze(['skill']);
export const PROPOSAL_CONTENT_LIMIT = 64 * 1024;
export const OPEN_PROPOSALS_PER_SESSION = 16;

const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const clone = value => structuredClone(value);
const now = () => new Date().toISOString();

export class ProposalError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new ProposalError(status, code, message); };
const check = (condition, message, code = 'invalid_proposal', status = 400) => { if (!condition) fail(status, code, message); };
const keys = (input, allowed) => {
  check(input && typeof input === 'object' && !Array.isArray(input), 'Body must be an object');
  for (const key of Object.keys(input)) check(allowed.includes(key), `Unknown field ${key}`);
};

function resolveSkill({ title, content }) {
  check(typeof title === 'string' && title.trim() && title.length <= 200, 'Proposal requires a title of at most 200 characters');
  check(typeof content === 'string' && content.length > 0, 'Proposal requires content');
  check(Buffer.byteLength(content, 'utf8') <= PROPOSAL_CONTENT_LIMIT, `Proposal content exceeds ${PROPOSAL_CONTENT_LIMIT} bytes`, 'proposal_too_large', 413);
  let resolved;
  try { resolved = resolveRuntimeSource({ type: 'inline', kind: 'skill', title, content }); }
  catch (error) { fail(400, error.code ?? 'invalid_proposal', error.message); }
  const declared = resolved.capabilities?.declared ?? {};
  const name = declared.name ?? declared.skill?.name;
  check(typeof name === 'string' && name, 'Skill frontmatter must name the skill');
  return { identity: resolved.identity, declared, name };
}

function validateLedger(data) {
  check(data && typeof data === 'object' && data.version === 1 && Number.isInteger(data.revision) && Array.isArray(data.proposals) && Array.isArray(data.applyCommands), 'Proposal ledger is malformed', 'invalid_ledger', 500);
  return data;
}

export class RuntimeProposalLedger {
  constructor({ dataDir }) { this.file = path.join(dataDir, 'runtime-proposals.json'); }

  async initialize() {
    const raw = await readFile(this.file, 'utf8').catch(e => { if (e.code === 'ENOENT') return null; throw e; });
    this.data = raw === null ? { version: 1, revision: 0, proposals: [], applyCommands: [] } : validateLedger(JSON.parse(raw));
  }

  async #write(next) {
    next.revision++;
    validateLedger(next);
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try { await writeFile(temp, JSON.stringify(next), { mode: 0o600 }); await rename(temp, this.file); }
    finally { await unlink(temp).catch(() => {}); }
    this.data = next;
  }

  list({ sessionId = null } = {}) {
    return this.data.proposals.filter(p => !sessionId || p.target.scope.id === sessionId).map(p => this.#public(p));
  }
  get(id) {
    const proposal = this.data.proposals.find(p => p.id === id);
    if (!proposal) fail(404, 'not_found', 'proposal not found');
    return proposal;
  }
  #public(proposal) {
    const { pending, ...rest } = clone(proposal);
    return { ...rest, pending: pending ? { requestId: pending.requestId, at: pending.at } : null };
  }

  /** The Agent's side. Author identity comes from the real Run, never from params. */
  async propose({ sessionId, runId, title, content }) {
    check(typeof sessionId === 'string' && sessionId && typeof runId === 'string' && runId, 'A proposal needs its originating session and run', 'invalid_author', 400);
    const { identity, declared, name } = resolveSkill({ title, content });
    const open = this.data.proposals.filter(p => p.status === 'proposed' && p.target.scope.id === sessionId).length;
    check(open < OPEN_PROPOSALS_PER_SESSION, `This session already has ${OPEN_PROPOSALS_PER_SESSION} proposals awaiting review`, 'proposal_limit', 429);
    const at = now();
    const proposal = {
      id: `proposal-${randomUUID()}`, revision: 1, status: 'proposed', kind: 'skill', title, content,
      identity, declared,
      target: { resourceId: `local:${name}`, scope: { type: 'session', id: sessionId } },
      author: { origin: 'agent', sessionId, runId, at },
      createdAt: at, updatedAt: at,
      history: [{ revision: 1, at, by: 'agent', action: 'propose' }],
      decision: null, pending: null,
    };
    const next = clone(this.data);
    next.proposals.push(proposal);
    await this.#write(next);
    return this.#public(proposal);
  }

  /** A person's edit is a new revision; any approval summary of the old one is void. */
  async edit(id, input) {
    keys(input, ['revision', 'title', 'content']);
    const next = clone(this.data);
    const proposal = next.proposals.find(p => p.id === id) ?? fail(404, 'not_found', 'proposal not found');
    check(proposal.status === 'proposed', `A ${proposal.status} proposal cannot be edited`, 'proposal_state', 409);
    check(input.revision === proposal.revision, 'Proposal changed; review the current revision', 'proposal_conflict', 409);
    const title = input.title ?? proposal.title, content = input.content ?? proposal.content;
    const { identity, declared, name } = resolveSkill({ title, content });
    check(`local:${name}` === proposal.target.resourceId, 'The skill name (its resource id) cannot change in an edit; propose a new skill instead');
    Object.assign(proposal, { title, content, identity, declared, revision: proposal.revision + 1, updatedAt: now() });
    proposal.history.push({ revision: proposal.revision, at: proposal.updatedAt, by: 'local-user', action: 'edit' });
    await this.#write(next);
    return this.#public(proposal);
  }

  async reject(id, input) {
    keys(input, ['revision', 'requestId', 'reason']);
    check(typeof input.requestId === 'string' && input.requestId, 'requestId is required');
    const next = clone(this.data);
    const proposal = next.proposals.find(p => p.id === id) ?? fail(404, 'not_found', 'proposal not found');
    if (proposal.decision?.requestId === input.requestId) return { proposal: this.#public(proposal), idempotent: true };
    check(proposal.status === 'proposed', `A ${proposal.status} proposal cannot be rejected`, 'proposal_state', 409);
    check(input.revision === proposal.revision, 'Proposal changed; review the current revision', 'proposal_conflict', 409);
    check(input.reason === undefined || (typeof input.reason === 'string' && input.reason.length <= 1000), 'Reason must be at most 1000 characters');
    const at = now();
    proposal.status = 'rejected'; proposal.updatedAt = at;
    proposal.decision = { action: 'reject', by: 'local-user', at, proposalRevision: proposal.revision, requestId: input.requestId, reason: input.reason ?? null };
    proposal.history.push({ revision: proposal.revision, at, by: 'local-user', action: 'reject' });
    await this.#write(next);
    return { proposal: this.#public(proposal), idempotent: false };
  }

  /**
   * The BE-6 result, computed against the configuration as it stands now.
   * `control` is the RuntimeControlPlane; `inspection` its snapshot for the
   * proposal's session (so exposure is the real rule, not a guess). Every field
   * enters the approval summary: a person approves this exact reading.
   */
  review(id, { control, inspection }) {
    const proposal = this.get(id);
    const existing = control.config.resources.find(r => r.id === proposal.target.resourceId) ?? null;
    const descriptor = inspection.resources.find(r => r.id === proposal.target.resourceId) ?? null;
    const same = existing && sha256(existing.content) === proposal.identity.contentSha256 && existing.title === proposal.title;
    const source = { kind: proposal.kind, title: proposal.title, contentSha256: proposal.identity.contentSha256, artifactSha256: proposal.identity.artifactSha256,
      bytes: proposal.identity.bytes, characters: proposal.identity.characters, trust: 'unverified', origin: 'agent-created', author: clone(proposal.author) };
    const target = { resourceId: proposal.target.resourceId, scope: clone(proposal.target.scope), expectedConfigRevision: control.config.revision,
      exists: Boolean(existing), currentContentSha256: existing ? sha256(existing.content) : null,
      currentScope: existing ? clone(existing.scope) : null, sameScope: !existing || (existing.scope.type === proposal.target.scope.type && existing.scope.id === proposal.target.scope.id) };
    const operations = [{ operation: 'put', resource: { id: proposal.target.resourceId, kind: proposal.kind, title: proposal.title, scope: clone(proposal.target.scope), contentSha256: proposal.identity.contentSha256 } }];
    const effectiveDiff = {
      before: existing ? existing.content : null, after: proposal.content, unchanged: Boolean(same),
      // The same git-style patch shape the candidate diff reader already parses.
      patch: `diff --git a/${proposal.target.resourceId} b/${proposal.target.resourceId}\n` + createTwoFilesPatch(existing ? `${proposal.target.resourceId} (current)` : '/dev/null', `${proposal.target.resourceId} (proposed)`, existing ? existing.content : '', proposal.content, '', '', { context: 3 }),
      exposure: descriptor ? { current: descriptor.exposed, provenance: clone(descriptor.provenance ?? []) } : { current: null, rule: 'A new skill is exposed by the default rule of its owning scope until you close it; Apply sets no exposure override.' },
    };
    const requestedTools = Array.isArray(proposal.declared.requestedTools) ? clone(proposal.declared.requestedTools) : proposal.declared.requestedTools ?? null;
    const permissionsDelta = { policyChanges: [], exposureChanges: [], requestedTools, note: 'Apply writes the resource only. allowed-tools is a declaration on the skill; it grants nothing and no policy rule changes.' };
    const description = typeof proposal.declared.description === 'string' ? proposal.declared.description : '';
    const contextImpact = { catalogCharacters: proposal.title.length + description.length, deferredBodyCharacters: proposal.content.length,
      previousBodyCharacters: existing ? existing.content.length : 0, tokens: null, note: 'Catalog text enters the next Run\'s context when the skill is exposed; the body only on an explicit runtime_load. Characters are UTF-16 code units, not tokens.' };
    const trustImpact = { trust: 'unverified', origin: 'agent-created', declaredOrigin: null, requestedTools, compatibility: proposal.declared.compatibility ?? null, executes: false };
    const persistence = { scope: 'session', sessionId: proposal.target.scope.id, store: 'runtime-control.json' };
    const rollback = existing
      ? { action: 'put', resourceId: proposal.target.resourceId, previousContentSha256: sha256(existing.content), previousTitle: existing.title, note: 'A rollback is a new human request under the CAS of that time; it does not rewind the revision or erase the audit.' }
      : { action: 'remove', resourceId: proposal.target.resourceId, note: 'A rollback removes the added resource under the CAS of that time; the revision moves forward.' };
    const summary = { proposalId: proposal.id, proposalRevision: proposal.revision, source, target, operations, effectiveDiff, permissionsDelta, contextImpact, trustImpact, persistence, rollback };
    const approvalSha256 = sha256(summary);
    const blockers = [];
    if (proposal.status !== 'proposed') blockers.push({ code: 'proposal_state', message: `This proposal is ${proposal.status}.` });
    if (existing && !target.sameScope) blockers.push({ code: 'scope_mismatch', message: 'A resource with this id exists in another scope; kind and owning scope are immutable.' });
    if (existing && existing.kind !== proposal.kind) blockers.push({ code: 'kind_mismatch', message: 'A resource with this id exists with another kind.' });
    return { proposal: this.#public(proposal), ...summary, approvalSha256, blockers };
  }

  /**
   * Apply as a transaction driven by the caller:
   *   1. same requestId → the same receipt (idempotent replay);
   *   2. proposal revision and approval summary must be current;
   *   3. a pending marker is persisted before the configuration changes;
   *   4. `commit()` performs the CAS put on the configuration (atomic on its own);
   *   5. success persists the receipt, failure clears the marker (fail-back:
   *      the configuration was never touched or the put itself refused).
   */
  async apply(id, input, { review, commit }) {
    keys(input, ['revision', 'approvalSha256', 'requestId']);
    check(typeof input.requestId === 'string' && input.requestId, 'requestId is required');
    const requestHash = sha256({ revision: input.revision, approvalSha256: input.approvalSha256 });
    const replay = this.data.applyCommands.find(c => c.proposalId === id && c.requestId === input.requestId);
    if (replay) {
      check(replay.requestHash === requestHash, 'This requestId was used for a different apply', 'idempotency_conflict', 409);
      return { proposal: this.#public(this.get(id)), receipt: clone(replay.receipt), idempotent: true };
    }
    const proposal = this.get(id);
    check(proposal.status === 'proposed', `A ${proposal.status} proposal cannot be applied`, 'proposal_state', 409);
    check(input.revision === proposal.revision, 'Proposal changed; review the current revision', 'proposal_conflict', 409);
    const current = review();
    check(current.blockers.length === 0, current.blockers[0]?.message ?? 'Proposal cannot be applied', current.blockers[0]?.code ?? 'proposal_blocked', 409);
    check(input.approvalSha256 === current.approvalSha256, 'The configuration or proposal changed since this review; review again before applying', 'approval_stale', 409);
    const expectedConfigRevision = current.target.expectedConfigRevision;
    // 3 · persisted intent: a crash after this point is reconciled by `recover`.
    {
      const next = clone(this.data);
      const item = next.proposals.find(p => p.id === id);
      item.status = 'applying';
      item.pending = { requestId: input.requestId, requestHash, approvalSha256: input.approvalSha256, expectedConfigRevision, at: now() };
      await this.#write(next);
    }
    let after;
    try {
      after = await commit({ expectedConfigRevision, resource: { id: proposal.target.resourceId, kind: proposal.kind, title: proposal.title, scope: clone(proposal.target.scope), content: proposal.content } });
    } catch (error) {
      const next = clone(this.data);
      const item = next.proposals.find(p => p.id === id);
      item.status = 'proposed'; item.pending = null;
      await this.#write(next);
      throw error;
    }
    return this.#settle(id, { requestId: input.requestId, requestHash, approvalSha256: input.approvalSha256, expectedConfigRevision, configRevisionAfter: after.revision, recovered: false });
  }

  async #settle(id, { requestId, requestHash, approvalSha256, expectedConfigRevision, configRevisionAfter, recovered }) {
    const next = clone(this.data);
    const item = next.proposals.find(p => p.id === id);
    const at = now();
    const receipt = { requestId, proposalId: id, proposalRevision: item.revision, approvalSha256, decidedBy: 'local-user', at,
      configRevisionBefore: expectedConfigRevision, configRevisionAfter, resourceId: item.target.resourceId, contentSha256: item.identity.contentSha256, recovered };
    item.status = 'applied'; item.pending = null; item.updatedAt = at;
    item.decision = { action: 'apply', by: 'local-user', at, proposalRevision: item.revision, requestId, approvalSha256, configRevisionBefore: expectedConfigRevision, configRevisionAfter };
    item.history.push({ revision: item.revision, at, by: 'local-user', action: 'apply' });
    next.applyCommands.push({ proposalId: id, requestId, requestHash, receipt });
    await this.#write(next);
    return { proposal: this.#public(item), receipt: clone(receipt), idempotent: false };
  }

  /** Startup: an `applying` proposal is either already in the configuration
   * (the put landed before the crash) or it is not; nothing in between. */
  async recover(control) {
    const outcomes = [];
    for (const item of this.data.proposals.filter(p => p.status === 'applying')) {
      const pending = item.pending;
      const resource = control.config.resources.find(r => r.id === item.target.resourceId);
      const landed = control.config.audit.find(a => a.revision === pending.expectedConfigRevision + 1 && a.operation === 'put' && a.id === item.target.resourceId);
      if (pending && resource && landed && sha256(resource.content) === item.identity.contentSha256) {
        await this.#settle(item.id, { ...pending, configRevisionAfter: pending.expectedConfigRevision + 1, recovered: true });
        outcomes.push({ id: item.id, outcome: 'applied' });
      } else {
        const next = clone(this.data);
        const again = next.proposals.find(p => p.id === item.id);
        again.status = 'proposed'; again.pending = null;
        await this.#write(next);
        outcomes.push({ id: item.id, outcome: 'pending' });
      }
    }
    return outcomes;
  }
}
