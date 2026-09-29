/**
 * Shape declarations for the opt-in file-memo-v1 extension profile.
 *
 * This module deliberately contains no authority, verification, or PASS
 * decision.  The Core owns those facts; the adapter only uses these frozen
 * declarations to expose and normalize the model-facing shape.
 */

export const FILE_MEMO_PROFILE = 'file-memo-v1';
export const FILE_MEMO_CONTRACT = 'se-file-memo-v1';
// The longer name makes the persisted contract/version distinction explicit
// at call sites while retaining the short alias for extension consumers.
export const FILE_MEMO_CONTRACT_VERSION = FILE_MEMO_CONTRACT;

export const FILE_MEMO_LIMITS = Object.freeze({
  maxFiles: 16,
  maxFileBytes: 65_536,
  maxBundleBytes: 131_072,
  maxPathBytes: 240,
  maxPageCodePoints: 4_000,
});

const FILE_SELECTOR_ITEM_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['path', 'sha256'],
  properties: {
    path: {
      type: 'string',
      minLength: 1,
      maxLength: FILE_MEMO_LIMITS.maxPathBytes,
      pattern: '^[A-Za-z0-9._/-]+$',
    },
    sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' },
  },
});

export const FILE_MEMO_RECORDED_FILES_SCHEMA = Object.freeze({
  type: 'array',
  minItems: 1,
  maxItems: FILE_MEMO_LIMITS.maxFiles,
  items: FILE_SELECTOR_ITEM_SCHEMA,
});

export const FILE_MEMO_PROPOSAL_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['artifact_text', 'evidence', 'obligations', 'recordedFiles'],
  properties: {
    artifact_text: { type: 'string', minLength: 1, maxLength: 100_000 },
    evidence: { type: 'array' },
    obligations: { type: 'array' },
    recordedFiles: FILE_MEMO_RECORDED_FILES_SCHEMA,
    supersedes: { type: 'string', minLength: 1, maxLength: 256 },
  },
});
