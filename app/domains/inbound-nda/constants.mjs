/**
 * Version constants for the bounded synthetic inbound NDA review.
 *
 * These values identify the domain contract and its rule set.  They are
 * intentionally independent of a provider, host session, renderer, or
 * persistence implementation.
 */
export const SCHEMA_VERSION = 1;
export const CONTRACT_VERSION = 'inbound-nda-v1';
export const PLAYBOOK_VERSION = 'inbound-nda-playbook-v1';

export const REVIEW_STATUSES = Object.freeze([
  'pass',
  'deviation',
  'missing',
  'conflict',
  'unknown',
]);
