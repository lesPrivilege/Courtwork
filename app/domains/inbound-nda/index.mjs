import {
  CONTRACT_VERSION,
  PLAYBOOK_VERSION,
  REVIEW_STATUSES,
  SCHEMA_VERSION,
} from './constants.mjs';
import { RULE_DEFINITIONS } from './rules.mjs';
import { sha256, stableJson } from './serialization.mjs';

const RULE_IDS = Object.freeze(RULE_DEFINITIONS.map((rule) => rule.ruleId));
const STATUS_SET = new Set(REVIEW_STATUSES);
const RULE_SET = new Set(RULE_IDS);

/**
 * Bounded synthetic playbook data.  The rules are experiment fixtures, not
 * legal advice or a general legal rule set.  Functions are intentionally kept
 * outside this object so JSON.stringify(playbook) is a stable artifact.
 */
export const playbook = Object.freeze({
  id: 'inbound-nda-playbook',
  scope: 'synthetic inbound NDA review only',
  notice: 'Synthetic fixture rules are not legal advice or general legal rules.',
  contractVersion: CONTRACT_VERSION,
  version: PLAYBOOK_VERSION,
  rules: RULE_DEFINITIONS,
  statusValues: REVIEW_STATUSES,
  fallback: {
    mode: 'proposal-only',
    artifactAdapter: 'reviewToCoreCandidate',
    obligationsAdapter: 'reviewToObligations',
  },
});

export { CONTRACT_VERSION, PLAYBOOK_VERSION, REVIEW_STATUSES, SCHEMA_VERSION };

export class InboundNdaError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'InboundNdaError';
    this.code = code;
    Object.assign(this, details);
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function identifier(value, label) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\u0000')) {
    throw new InboundNdaError('INVALID_INPUT', `${label} must be a non-empty string`);
  }
  return value.trim();
}

function integer(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new InboundNdaError('INVALID_INPUT', `${label} must be a non-negative integer`);
  }
  return value;
}

function ensureSerializable(value, label) {
  try {
    const json = JSON.stringify(value, (_key, child) => {
      if (child === undefined || typeof child === 'function' || typeof child === 'symbol' || typeof child === 'bigint') {
        throw new TypeError('unsupported JSON value');
      }
      return child;
    });
    if (json === undefined) throw new Error('undefined JSON value');
    JSON.parse(json);
  } catch (error) {
    throw new InboundNdaError('INVALID_INPUT', `${label} must be JSON-serializable`, { cause: error });
  }
  return value;
}

function normalizeSources(input) {
  let sourceList;
  if (Array.isArray(input)) sourceList = input;
  else if (isRecord(input)) sourceList = Object.values(input);
  else throw new InboundNdaError('INVALID_INPUT', 'sources must be an array or source map');

  const seen = new Set();
  return sourceList.map((value, index) => {
    if (!isRecord(value)) throw new InboundNdaError('INVALID_INPUT', `sources[${index}] must be an object`);
    const id = identifier(value.id ?? value.source_id, `sources[${index}].id`);
    const version = integer(value.version ?? value.source_version, `sources[${index}].version`);
    if (typeof value.text !== 'string' || value.text.length === 0 || value.text.includes('\u0000')) {
      throw new InboundNdaError('INVALID_INPUT', `sources[${index}].text must be non-empty text`);
    }
    const digest = sha256(value.text);
    if (value.digest !== undefined && value.digest !== digest) {
      throw new InboundNdaError('SOURCE_DIGEST_MISMATCH', `sources[${index}] digest does not match text`);
    }
    const key = `${id}:${version}`;
    if (seen.has(key)) throw new InboundNdaError('DUPLICATE_SOURCE', `duplicate source ${key}`);
    seen.add(key);
    return { id, version, text: value.text, digest };
  }).sort((a, b) => a.id.localeCompare(b.id) || a.version - b.version);
}

function codePointIndex(text, utf16Index) {
  return Array.from(text.slice(0, utf16Index)).length;
}

function codePointSlice(text, start, end) {
  return Array.from(text).slice(start, end).join('');
}

function findSourceAnchors(sources, quote) {
  const anchors = [];
  for (const source of sources) {
    let from = 0;
    while (from <= source.text.length) {
      const utf16Start = source.text.indexOf(quote, from);
      if (utf16Start < 0) break;
      const utf16End = utf16Start + quote.length;
      anchors.push({
        source_id: source.id,
        source_version: source.version,
        start: codePointIndex(source.text, utf16Start),
        end: codePointIndex(source.text, utf16End),
        quote,
        digest: source.digest,
      });
      from = utf16End;
    }
  }
  return anchors;
}

function firstSourceAnchor(sources, quote) {
  return findSourceAnchors(sources, quote)[0] ?? null;
}

function anchorsForQuotes(sources, quotes = []) {
  return quotes
    .map((quote) => firstSourceAnchor(sources, quote))
    .filter(Boolean);
}

function uniqueAnchors(anchors) {
  const result = [];
  const seen = new Set();
  for (const anchor of anchors) {
    const key = anchorKey(anchor);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(anchor);
    }
  }
  return result;
}

function anchorKey(anchor) {
  return [anchor.source_id, anchor.source_version, anchor.start, anchor.end, anchor.digest].join(':');
}

function normalizeAnchor(anchor, sources, path) {
  if (!isRecord(anchor)) throw new InboundNdaError('INVALID_EVIDENCE', `${path} must be an object`);
  const allowed = ['source_id', 'source_version', 'start', 'end', 'quote', 'digest'];
  if (Object.keys(anchor).some((key) => !allowed.includes(key))) {
    throw new InboundNdaError('INVALID_EVIDENCE', `${path} has unsupported fields`);
  }
  const sourceId = identifier(anchor.source_id, `${path}.source_id`);
  const sourceVersion = integer(anchor.source_version, `${path}.source_version`);
  const start = integer(anchor.start, `${path}.start`);
  const end = integer(anchor.end, `${path}.end`);
  if (end <= start) throw new InboundNdaError('INVALID_EVIDENCE', `${path} range must be non-empty`);
  const quote = identifier(anchor.quote, `${path}.quote`);
  const digest = identifier(anchor.digest, `${path}.digest`);
  const source = sources.find((item) => item.id === sourceId && item.version === sourceVersion);
  if (!source) throw new InboundNdaError('SOURCE_OUTSIDE_BOUNDARY', `${path} points outside the supplied source set`);
  const sourceLength = Array.from(source.text).length;
  if (start > sourceLength || end > sourceLength) {
    throw new InboundNdaError('INVALID_EVIDENCE', `${path} range exceeds the supplied source bytes`);
  }
  if (digest !== source.digest || codePointSlice(source.text, start, end) !== quote) {
    throw new InboundNdaError('INVALID_EVIDENCE', `${path} does not match the supplied source bytes`);
  }
  return { source_id: sourceId, source_version: sourceVersion, start, end, quote, digest };
}

/**
 * Classify the supplied source clause before looking at the represented-party
 * facts.  An exact playbook clause is evaluated with deterministic facts;
 * missing, contradictory, and unparseable clauses remain visible as distinct
 * review states so a model cannot turn an absent or changed clause into a
 * pass.
 */
function assessSource(rule, sources) {
  const normal = anchorsForQuotes(sources, rule.sourceQuotes);
  const conflict = anchorsForQuotes(sources, rule.conflictQuotes);
  const markers = anchorsForQuotes(sources, rule.sourceMarkers);
  const normalComplete = normal.length === (rule.sourceQuotes?.length ?? 0) && normal.length > 0;

  if (conflict.length > 0) {
    return {
      state: 'conflict',
      evidence: uniqueAnchors([...normal, ...conflict]),
      reason: normalComplete
        ? 'the supplied source contains both the playbook clause and an explicit conflicting clause'
        : 'the supplied source contains an explicit clause that conflicts with the playbook',
    };
  }
  if (normalComplete) return { state: 'exact', evidence: uniqueAnchors(normal) };
  if (normal.length > 0 || markers.length > 0) {
    return {
      state: 'unknown',
      evidence: uniqueAnchors([...normal, ...markers]),
      reason: 'the supplied source clause is changed or cannot be parsed against the playbook',
    };
  }
  return {
    state: 'missing',
    evidence: [],
    reason: 'the supplied source does not contain the playbook clause',
  };
}

function getPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (!isRecord(current) && !Array.isArray(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function isUnknownMarker(value) {
  if (typeof value === 'string') return ['unknown', 'indeterminate', 'unavailable'].includes(value.trim().toLowerCase());
  return isRecord(value) && (
    value.state === 'unknown'
    || value.status === 'unknown'
    || value.kind === 'unknown'
    || value.state === 'indeterminate'
    || value.status === 'indeterminate'
  );
}

function isConflictMarker(value) {
  return isRecord(value) && (
    value.state === 'conflict'
    || value.status === 'conflict'
    || value.kind === 'conflict'
  );
}

function classifyScalar(value) {
  if (value === undefined || value === null || value === '') return { state: 'missing' };
  if (isUnknownMarker(value)) return { state: 'unknown' };
  if (isConflictMarker(value)) return { state: 'conflict' };
  if (Array.isArray(value)) {
    if (value.length === 0) return { state: 'missing' };
    const entries = value.map(classifyScalar);
    if (entries.some((entry) => entry.state === 'conflict')) return { state: 'conflict' };
    if (entries.some((entry) => entry.state === 'unknown')) return { state: 'unknown' };
    if (entries.some((entry) => entry.state === 'missing')) return { state: 'missing' };
    const serialized = entries.map((entry) => stableJson(entry.value));
    if (new Set(serialized).size > 1) return { state: 'conflict' };
    return { state: 'known', value: entries[0].value };
  }
  return { state: 'known', value };
}

function statusResult(state, reason) {
  return { status: state, reason };
}

function evaluatePurpose(facts) {
  const transactionPurpose = classifyScalar(getPath(facts, ['transaction', 'purpose']));
  const usePurpose = classifyScalar(getPath(facts, ['use', 'purpose']));
  for (const item of [transactionPurpose, usePurpose]) {
    if (item.state === 'conflict') return statusResult('conflict', 'the transaction or intended-use fact contains conflicting values');
    if (item.state === 'unknown') return statusResult('unknown', 'the transaction or intended-use fact is explicitly unknown');
    if (item.state === 'missing') return statusResult('missing', 'the transaction purpose and intended use are both required');
  }
  if (transactionPurpose.value !== 'evaluate Project Cedar acquisition') {
    return statusResult('deviation', 'the transaction purpose does not match the synthetic playbook purpose');
  }
  if (usePurpose.value !== transactionPurpose.value) {
    return statusResult('deviation', 'the intended use differs from the transaction purpose');
  }
  return statusResult('pass', 'the intended use matches the synthetic transaction purpose');
}

function evaluateRecipients(facts) {
  const value = getPath(facts, ['recipients']);
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    return statusResult('missing', 'at least one recipient with need-to-know and confidentiality facts is required');
  }
  if (isUnknownMarker(value)) return statusResult('unknown', 'the recipient set is explicitly unknown');
  if (isConflictMarker(value)) return statusResult('conflict', 'the recipient set is explicitly conflicting');
  if (!Array.isArray(value)) return statusResult('unknown', 'the recipient fact is not a structured list');

  const seen = new Map();
  for (const [index, recipient] of value.entries()) {
    if (!isRecord(recipient)) return statusResult('unknown', `recipient ${index + 1} is not a structured fact`);
    const category = recipient.kind ?? recipient.category;
    const needToKnow = classifyScalar(recipient.needToKnow);
    const bound = classifyScalar(recipient.boundToConfidentiality ?? recipient.bound);
    if (needToKnow.state === 'conflict' || bound.state === 'conflict') return statusResult('conflict', `recipient ${index + 1} has conflicting controls`);
    if (needToKnow.state === 'unknown' || bound.state === 'unknown') return statusResult('unknown', `recipient ${index + 1} has an unknown control`);
    if (needToKnow.state === 'missing' || bound.state === 'missing' || typeof category !== 'string' || category.trim() === '') {
      return statusResult('missing', `recipient ${index + 1} is missing a category or control fact`);
    }
    const normalizedCategory = category.trim().toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ');
    if (!['employee', 'employees', 'adviser', 'advisers', 'professional adviser', 'professional advisers'].includes(normalizedCategory)) {
      return statusResult('unknown', `recipient ${index + 1} has an unrecognized category`);
    }
    const key = `${normalizedCategory}:${recipient.name ?? index}`;
    const tuple = `${needToKnow.value}:${bound.value}`;
    if (seen.has(key) && seen.get(key) !== tuple) return statusResult('conflict', `recipient ${index + 1} repeats with conflicting controls`);
    seen.set(key, tuple);
    if (needToKnow.value !== true || bound.value !== true) return statusResult('deviation', `recipient ${index + 1} is not both need-to-know and bound`);
  }
  return statusResult('pass', 'all listed synthetic recipients are need-to-know and bound');
}

function evaluateSecurity(facts) {
  const safeguards = classifyScalar(getPath(facts, ['security', 'safeguards']));
  const noticeHours = classifyScalar(getPath(facts, ['security', 'noticeHours']));
  for (const item of [safeguards, noticeHours]) {
    if (item.state === 'conflict') return statusResult('conflict', 'the security facts contain conflicting values');
    if (item.state === 'unknown') return statusResult('unknown', 'the security facts are explicitly unknown');
    if (item.state === 'missing') return statusResult('missing', 'safeguards and a notice window are required');
  }
  if (safeguards.value !== 'reasonable') return statusResult('deviation', 'the stated safeguard level does not match the synthetic check');
  if (typeof noticeHours.value !== 'number' || !Number.isFinite(noticeHours.value)) {
    return statusResult('unknown', 'the notice window is not a finite number of hours');
  }
  if (noticeHours.value < 0 || noticeHours.value > 24) return statusResult('deviation', 'the notice window exceeds the synthetic 24-hour check');
  return statusResult('pass', 'reasonable safeguards and a notice window of at most 24 hours are recorded');
}

function evaluateTerm(facts) {
  const term = classifyScalar(getPath(facts, ['term', 'years']));
  if (term.state === 'conflict') return statusResult('conflict', 'the term fact contains conflicting durations');
  if (term.state === 'unknown') return statusResult('unknown', 'the term duration is explicitly unknown');
  if (term.state === 'missing') return statusResult('missing', 'a term duration is required');
  if (typeof term.value !== 'number' || !Number.isFinite(term.value)) return statusResult('unknown', 'the term duration is not a finite number of years');
  if (term.value !== 3) return statusResult('deviation', 'the term duration differs from the synthetic three-year check');
  return statusResult('pass', 'the term duration matches the synthetic three-year check');
}

function evaluateRule(ruleId, facts) {
  switch (ruleId) {
    case 'purpose-limitation': return evaluatePurpose(facts);
    case 'need-to-know-recipients': return evaluateRecipients(facts);
    case 'security-and-notice': return evaluateSecurity(facts);
    case 'term-duration': return evaluateTerm(facts);
    default: throw new InboundNdaError('INTERNAL_RULE_ERROR', `no evaluator for ${ruleId}`);
  }
}

function findingResult(ruleId, facts, sourceAssessment) {
  if (sourceAssessment.state === 'exact') return evaluateRule(ruleId, facts);
  return statusResult(sourceAssessment.state, sourceAssessment.reason);
}

function reconciliationFor(findings) {
  const byStatus = (status) => findings.filter((finding) => finding.status === status).map((finding) => finding.ruleId);
  const unresolvedRuleIds = findings.filter((finding) => finding.status !== 'pass').map((finding) => finding.ruleId);
  const conflictRuleIds = byStatus('conflict');
  const unknownRuleIds = byStatus('unknown');
  const missingRuleIds = byStatus('missing');
  const deviationRuleIds = byStatus('deviation');
  let status = 'complete';
  if (conflictRuleIds.length > 0) status = 'conflict';
  else if (unknownRuleIds.length > 0) status = 'unknown';
  else if (missingRuleIds.length > 0 || deviationRuleIds.length > 0) status = 'needs_review';
  return {
    status,
    complete: unresolvedRuleIds.length === 0,
    coveredRuleIds: findings.map((finding) => finding.ruleId),
    unresolvedRuleIds,
    conflictRuleIds,
    unknownRuleIds,
    missingRuleIds,
    deviationRuleIds,
    sourceAnchors: findings.flatMap((finding) => finding.evidence.map((anchor) => ({
      ruleId: finding.ruleId,
      source_id: anchor.source_id,
      source_version: anchor.source_version,
      start: anchor.start,
      end: anchor.end,
      digest: anchor.digest,
    }))),
  };
}

function compareStable(left, right) {
  return stableJson(left) === stableJson(right);
}

/**
 * Build a deterministic versioned domain proposal from an approved source set
 * and deal facts.  This function never invokes a provider and never commits a
 * formal decision; its output is a candidate/review packet.
 */
export function buildReview({ sources, facts } = {}) {
  const sourceViews = normalizeSources(sources);
  if (!isRecord(facts)) throw new InboundNdaError('INVALID_INPUT', 'facts must be an object');
  ensureSerializable(facts, 'facts');
  const findings = RULE_DEFINITIONS.map((rule) => {
    const sourceAssessment = assessSource(rule, sourceViews);
    const result = findingResult(rule.ruleId, facts, sourceAssessment);
    return {
      ruleId: rule.ruleId,
      status: result.status,
      evidence: sourceAssessment.evidence,
      reason: result.reason,
    };
  });
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    contractVersion: CONTRACT_VERSION,
    playbookVersion: PLAYBOOK_VERSION,
    facts: clone(facts),
    findings,
    reconciliation: reconciliationFor(findings),
  };
  return ensureSerializable(payload, 'review payload');
}

function errorRecord(code, path, message) {
  return { code, path, message };
}

/**
 * Verify a proposal against independently supplied source bytes and facts.
 * The payload's status/reason fields are never trusted: status is recomputed
 * from the deterministic synthetic rule evaluator and all evidence anchors
 * are checked against source bytes and digest.
 */
export function verifyReview(payload, { sources, facts } = {}) {
  const errors = [];
  let sourceViews;
  try {
    sourceViews = normalizeSources(sources);
  } catch (error) {
    errors.push(errorRecord(error.code ?? 'INVALID_INPUT', 'sources', error.message));
  }
  if (!isRecord(facts)) errors.push(errorRecord('INVALID_INPUT', 'facts', 'facts must be an object'));
  if (!isRecord(payload)) {
    errors.push(errorRecord('INVALID_PAYLOAD', '', 'review payload must be an object'));
    return { ok: false, errors };
  }
  if (payload.schemaVersion !== SCHEMA_VERSION) errors.push(errorRecord('SCHEMA_MISMATCH', 'schemaVersion', `expected ${SCHEMA_VERSION}`));
  if (payload.contractVersion !== CONTRACT_VERSION) {
    errors.push(errorRecord('CONTRACT_MISMATCH', 'contractVersion', `expected ${CONTRACT_VERSION}`));
  }
  if (payload.playbookVersion !== PLAYBOOK_VERSION) errors.push(errorRecord('PLAYBOOK_MISMATCH', 'playbookVersion', `expected ${PLAYBOOK_VERSION}`));
  try {
    ensureSerializable(payload, 'review payload');
  } catch (error) {
    errors.push(errorRecord(error.code ?? 'INVALID_PAYLOAD', '', error.message));
  }
  if (!compareStable(payload.facts, facts)) errors.push(errorRecord('FACTS_MISMATCH', 'facts', 'payload facts differ from the independently supplied facts'));
  if (!Array.isArray(payload.findings)) {
    errors.push(errorRecord('FINDINGS_INVALID', 'findings', 'findings must be an array'));
    return { ok: false, errors };
  }
  if (payload.findings.length !== RULE_DEFINITIONS.length) errors.push(errorRecord('FINDINGS_COVERAGE', 'findings', `expected exactly ${RULE_DEFINITIONS.length} findings`));

  const seenRules = new Set();
  for (const [index, finding] of payload.findings.entries()) {
    const path = `findings[${index}]`;
    if (!isRecord(finding)) {
      errors.push(errorRecord('FINDING_INVALID', path, 'finding must be an object'));
      continue;
    }
    const allowed = ['ruleId', 'status', 'evidence', 'reason'];
    if (Object.keys(finding).some((key) => !allowed.includes(key))) errors.push(errorRecord('FINDING_FIELDS', path, 'finding has unsupported fields'));
    if (typeof finding.ruleId !== 'string' || !RULE_SET.has(finding.ruleId)) {
      errors.push(errorRecord('UNKNOWN_RULE', `${path}.ruleId`, 'finding ruleId is not in the playbook'));
      continue;
    }
    if (seenRules.has(finding.ruleId)) errors.push(errorRecord('DUPLICATE_RULE', `${path}.ruleId`, 'each playbook rule must appear exactly once'));
    seenRules.add(finding.ruleId);
    if (!STATUS_SET.has(finding.status)) errors.push(errorRecord('STATUS_INVALID', `${path}.status`, 'status is outside the contract'));
    if (typeof finding.reason !== 'string' || finding.reason.trim() === '') errors.push(errorRecord('REASON_INVALID', `${path}.reason`, 'reason must be non-empty text'));
    const rule = RULE_DEFINITIONS.find((item) => item.ruleId === finding.ruleId);
    if (!Array.isArray(finding.evidence)) {
      errors.push(errorRecord('EVIDENCE_INVALID', `${path}.evidence`, 'evidence must be an array'));
      continue;
    }
    const anchors = [];
    for (const [evidenceIndex, anchor] of finding.evidence.entries()) {
      try {
        anchors.push(normalizeAnchor(anchor, sourceViews ?? [], `${path}.evidence[${evidenceIndex}]`));
      } catch (error) {
        errors.push(errorRecord(error.code ?? 'INVALID_EVIDENCE', `${path}.evidence[${evidenceIndex}]`, error.message));
      }
    }
    const anchorKeys = anchors.map(anchorKey);
    if (new Set(anchorKeys).size !== anchorKeys.length) errors.push(errorRecord('DUPLICATE_EVIDENCE', `${path}.evidence`, 'evidence anchors must be unique'));
    const sourceAssessment = assessSource(rule, sourceViews ?? []);
    const expectedQuotes = new Set(sourceAssessment.evidence.map((anchor) => anchor.quote));
    const actualQuotes = new Set(anchors.map((anchor) => anchor.quote));
    for (const quote of expectedQuotes) {
      if (!actualQuotes.has(quote)) errors.push(errorRecord('SOURCE_COVERAGE', `${path}.evidence`, 'finding is missing its rule source anchor'));
    }
    for (const quote of actualQuotes) {
      if (!expectedQuotes.has(quote)) errors.push(errorRecord('SOURCE_SCOPE', `${path}.evidence`, 'finding contains an anchor outside its rule source clause'));
    }
    if (isRecord(facts)) {
      const result = findingResult(finding.ruleId, facts, sourceAssessment);
      if (finding.status !== result.status) errors.push(errorRecord('CONCLUSION_MISMATCH', `${path}.status`, `expected deterministic status ${result.status}`));
      if (finding.reason !== result.reason) errors.push(errorRecord('REASON_MISMATCH', `${path}.reason`, 'reason does not match the deterministic source and fact assessment'));
    }
  }
  for (const ruleId of RULE_IDS) if (!seenRules.has(ruleId)) errors.push(errorRecord('FINDINGS_COVERAGE', 'findings', `missing finding for ${ruleId}`));

  if (!isRecord(payload.reconciliation)) errors.push(errorRecord('RECONCILIATION_INVALID', 'reconciliation', 'reconciliation must be an object'));
  else if (payload.findings.every((finding) => isRecord(finding) && RULE_SET.has(finding.ruleId) && STATUS_SET.has(finding.status) && Array.isArray(finding.evidence))) {
    const normalizedFindings = payload.findings.map((finding) => ({
      ruleId: finding.ruleId,
      status: finding.status,
      evidence: finding.evidence,
    }));
    const expectedReconciliation = reconciliationFor(normalizedFindings);
    if (!compareStable(payload.reconciliation, expectedReconciliation)) errors.push(errorRecord('RECONCILIATION_MISMATCH', 'reconciliation', 'reconciliation does not match the findings'));
  }
  return { ok: errors.length === 0, errors };
}

function assertReview(review) {
  if (!isRecord(review)) throw new InboundNdaError('INVALID_PAYLOAD', 'review must be an object');
  if (review.schemaVersion !== SCHEMA_VERSION || review.contractVersion !== CONTRACT_VERSION || review.playbookVersion !== PLAYBOOK_VERSION) {
    throw new InboundNdaError('VERSION_MISMATCH', 'review version is not supported');
  }
  if (!Array.isArray(review.findings) || review.findings.length !== RULE_DEFINITIONS.length) {
    throw new InboundNdaError('FINDINGS_COVERAGE', 'review does not contain the complete playbook coverage');
  }
  const statuses = new Set();
  for (const finding of review.findings) {
    if (!isRecord(finding) || !RULE_SET.has(finding.ruleId) || !STATUS_SET.has(finding.status) || !Array.isArray(finding.evidence)) {
      throw new InboundNdaError('INVALID_PAYLOAD', 'review contains an invalid finding');
    }
    statuses.add(finding.ruleId);
  }
  if (statuses.size !== RULE_DEFINITIONS.length) throw new InboundNdaError('FINDINGS_COVERAGE', 'review contains duplicate or missing rules');
}

function uniqueEvidence(findings) {
  const result = [];
  const seen = new Set();
  for (const finding of findings) {
    for (const anchor of finding.evidence) {
      const key = anchorKey(anchor);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(clone(anchor));
      }
    }
  }
  return result;
}

/**
 * Convert a verified-by-caller review packet into the existing evidence-memo
 * candidate shape.  This is a proposal adapter only: it does not call the
 * Core, assign a reviewer, or mark the artifact accepted.
 */
export function reviewToCoreCandidate(review) {
  assertReview(review);
  const evidence = uniqueEvidence(review.findings);
  const obligations = review.findings
    .filter((finding) => finding.status !== 'pass')
    .map((finding) => ({
      id: `nda-${finding.ruleId}-${finding.status}`,
      text: finding.reason,
      status: 'open',
      blocking: true,
      evidence_refs: finding.evidence.map((anchor) => clone(anchor)),
    }));
  return {
    artifact_text: reviewArtifactText(review),
    evidence,
    obligations,
  };
}

export function reviewToObligations(review) {
  return reviewToCoreCandidate(review).obligations;
}

export function reviewToArtifact(review) {
  return {
    kind: 'inbound-nda-review',
    contractVersion: CONTRACT_VERSION,
    playbookVersion: PLAYBOOK_VERSION,
    status: review.reconciliation?.status ?? 'unknown',
    text: reviewArtifactText(review),
    findingCount: Array.isArray(review.findings) ? review.findings.length : 0,
  };
}

function reviewArtifactText(review) {
  assertReview(review);
  const lines = [
    `Inbound NDA Playbook Review (${PLAYBOOK_VERSION})`,
    'Synthetic fixture rules; formal acceptance is recorded separately by Work Core.',
  ];
  for (const finding of review.findings) lines.push(`${finding.ruleId}: ${finding.status} — ${finding.reason}`);
  return lines.join('\n');
}

// Explicit aliases make the adapter seam discoverable without adding another
// authoritative state representation.
export const toArtifact = reviewToArtifact;
export const toObligations = reviewToObligations;
export const toCoreCandidate = reviewToCoreCandidate;
