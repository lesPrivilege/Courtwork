import {CONTRACT_VERSION, PLAYBOOK_VERSION, REVIEW_STATUSES, SCHEMA_VERSION} from './constants.mjs';
import {RULE_IDS} from './rules.mjs';

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

// Static wire vocabulary, shared by the producer contract and verifier.
// No source bytes, current findings, fixture corpus, or computed answers live here.
export const REASON_TEMPLATES = freeze({
  "source": {
    "conflictWithNormal": "the supplied source contains both the playbook clause and an explicit conflicting clause",
    "conflictWithoutNormal": "the supplied source contains an explicit clause that conflicts with the playbook",
    "unknown": "the supplied source clause is changed or cannot be parsed against the playbook",
    "missing": "the supplied source does not contain the playbook clause"
  },
  "purpose": {
    "conflict": "the transaction or intended-use fact contains conflicting values",
    "unknown": "the transaction or intended-use fact is explicitly unknown",
    "missing": "the transaction purpose and intended use are both required",
    "transactionDeviation": "the transaction purpose does not match the synthetic playbook purpose",
    "useDeviation": "the intended use differs from the transaction purpose",
    "pass": "the intended use matches the synthetic transaction purpose"
  },
  "recipients": {
    "missing": "at least one recipient with need-to-know and confidentiality facts is required",
    "unknownSet": "the recipient set is explicitly unknown",
    "conflictSet": "the recipient set is explicitly conflicting",
    "notList": "the recipient fact is not a structured list",
    "notRecord": "recipient {n} is not a structured fact",
    "conflictControl": "recipient {n} has conflicting controls",
    "unknownControl": "recipient {n} has an unknown control",
    "missingControl": "recipient {n} is missing a category or control fact",
    "unknownCategory": "recipient {n} has an unrecognized category",
    "conflictRepeated": "recipient {n} repeats with conflicting controls",
    "deviation": "recipient {n} is not both need-to-know and bound",
    "pass": "all listed synthetic recipients are need-to-know and bound"
  },
  "security": {
    "conflict": "the security facts contain conflicting values",
    "unknown": "the security facts are explicitly unknown",
    "missing": "safeguards and a notice window are required",
    "safeguardsDeviation": "the stated safeguard level does not match the synthetic check",
    "noticeUnknown": "the notice window is not a finite number of hours",
    "noticeDeviation": "the notice window exceeds the synthetic 24-hour check",
    "pass": "reasonable safeguards and a notice window of at most 24 hours are recorded"
  },
  "term": {
    "conflict": "the term fact contains conflicting durations",
    "unknown": "the term duration is explicitly unknown",
    "missing": "a term duration is required",
    "notNumber": "the term duration is not a finite number of years",
    "deviation": "the term duration differs from the synthetic three-year check",
    "pass": "the term duration matches the synthetic three-year check"
  }
});

export function formatReason(template, recipientNumber) {
  return template.replace('{n}', String(recipientNumber));
}

const sourceIdentity = {
  source_id: {type: 'string', minLength: 1},
  source_version: {type: 'integer', minimum: 0},
  start: {type: 'integer', minimum: 0, description: 'Zero-based Unicode code points, inclusive start; not UTF-16 units or UTF-8 bytes.'},
  end: {type: 'integer', minimum: 1, description: 'Exclusive Unicode code point offset; greater than start.'},
  digest: {type: 'string', minLength: 1, description: 'Copy the digest of the entire approved source revision. Do not hash the quote.'},
};
const ruleId = {type: 'string', enum: RULE_IDS};
const ruleIds = () => ({type: 'array', items: ruleId});

export const REVIEW_SCHEMA = freeze({
  type: 'object',
  description: 'A model-proposed synthetic NDA review. The domain verifies the full packet against the bound sources and facts; submission never accepts it.',
  required: ['schemaVersion', 'contractVersion', 'playbookVersion', 'facts', 'findings', 'reconciliation'],
  properties: {
    schemaVersion: {type: 'integer', const: SCHEMA_VERSION},
    contractVersion: {type: 'string', const: CONTRACT_VERSION},
    playbookVersion: {type: 'string', const: PLAYBOOK_VERSION},
    facts: {type: 'object', description: 'Copy the complete bound facts object without alteration.'},
    findings: {
      type: 'array', minItems: RULE_IDS.length, maxItems: RULE_IDS.length,
      description: 'One finding for every rule, in any order; reconciliation follows that submitted order. Choose status from the supplied rules and sources, and canonical reason text from the static producer contract.',
      items: {
        type: 'object', additionalProperties: false,
        required: ['ruleId', 'status', 'evidence', 'reason'],
        properties: {
          ruleId,
          status: {type: 'string', enum: REVIEW_STATUSES},
          evidence: {
            type: 'array', items: {
              type: 'object', additionalProperties: false,
              required: ['source_id', 'source_version', 'start', 'end', 'quote', 'digest'],
              properties: {...sourceIdentity, quote: {type: 'string', minLength: 1, description: 'Exact source substring at [start,end).'}},
            },
          },
          reason: {type: 'string', minLength: 1, description: 'Exact text from producerContract.canonicalReasonTemplates. Substitute the one-based recipient number for {n}; do not paraphrase.'},
        },
      },
    },
    reconciliation: {
      type: 'object', additionalProperties: false,
      required: ['status', 'complete', 'coveredRuleIds', 'unresolvedRuleIds', 'conflictRuleIds', 'unknownRuleIds', 'missingRuleIds', 'deviationRuleIds', 'sourceAnchors'],
      properties: {
        status: {type: 'string', enum: ['conflict', 'unknown', 'needs_review', 'complete']},
        complete: {type: 'boolean'},
        coveredRuleIds: ruleIds(), unresolvedRuleIds: ruleIds(), conflictRuleIds: ruleIds(),
        unknownRuleIds: ruleIds(), missingRuleIds: ruleIds(), deviationRuleIds: ruleIds(),
        sourceAnchors: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            required: ['ruleId', 'source_id', 'source_version', 'start', 'end', 'digest'],
            properties: {ruleId, ...sourceIdentity},
          },
        },
      },
    },
  },
});

export const REVIEW_PROPOSAL_SCHEMA = freeze({
  type: 'object', additionalProperties: false, required: ['domain'],
  properties: {domain: REVIEW_SCHEMA},
});

export const producerContract = freeze({
  id: 'inbound-nda-review-packet-v1',
  schemaVersion: SCHEMA_VERSION,
  contractVersion: CONTRACT_VERSION,
  playbookVersion: PLAYBOOK_VERSION,
  canonicalReasonTemplates: REASON_TEMPLATES,
  reasonSelection: [
    'These are static protocol templates, not findings for the current source or facts. Evaluate each rule; never assume pass.',
    'Assess source first: any explicit conflict quote gives source.conflictWithNormal when all normal quotes also exist, otherwise source.conflictWithoutNormal. Status is conflict.',
    'All normal sourceQuotes present: assess facts using the rule. Partial normal quotes or a sourceMarker without the complete normal clause: unknown with source.unknown. No matching quote or marker: missing with source.missing.',
    'Evidence uses exact approved-source occurrences of every applicable normal/conflict quote; using the first occurrence is a compact producer convention, not a validator requirement. For unknown source use the partial normal quotes and source markers, deduplicated. Missing source has no anchors. Source assessment takes precedence over fact outcomes.',
    'Purpose uses canonicalReasonTemplates.purpose; need-to-know-recipients uses recipients; security-and-notice uses security; term-duration uses term. Source errors use source templates regardless of rule.',
    'A missing scalar is absent, null, or empty string. Unknown markers include unknown, indeterminate, unavailable strings and objects with state/status/kind unknown (state/status indeterminate). Conflict markers have state/status/kind conflict.',
    'For scalar arrays: empty is missing; assess entries, giving conflict then unknown then missing precedence; distinct remaining values conflict, identical values collapse to that value.',
    'Purpose checks transaction.purpose then use.purpose, reporting the first conflict/unknown/missing. Then test the playbook transaction purpose, then intended-use equality, then pass.',
    'Recipients: missing empty set, explicitly unknown/conflict set, non-list; then each recipient in order. Check record shape, conflicting/unknown/missing controls, category, repeated identity with conflicting controls, then both controls exactly true. {n} is one-based.',
    'Recipient category is kind or category, trim/lowercase and replace hyphens/underscores with spaces; allowed: employee(s), adviser(s), professional adviser(s). Controls are needToKnow and boundToConfidentiality (or bound). Identity is normalized category plus name, or zero-based index when name is absent.',
    'Security checks safeguards then noticeHours for first conflict/unknown/missing; then safeguards=reasonable, finite numeric noticeHours, inclusive 0..24, then pass.',
    'Term checks conflict/unknown/missing, finite numeric years, years=3, then pass.',
  ],
  reconciliation: [
    'Derive only from the submitted findings in their array order. coveredRuleIds contains every ruleId; unresolvedRuleIds contains all non-pass rules. The four status-specific arrays contain exactly their matching ruleIds.',
    'Status priority: conflict, unknown, needs_review (missing or deviation), complete. complete is true exactly when unresolvedRuleIds is empty.',
    'sourceAnchors flattens each finding evidence in order, adding ruleId and copying source_id/source_version/start/end/digest; omit quote. Do not independently deduplicate across findings.',
  ],
});
