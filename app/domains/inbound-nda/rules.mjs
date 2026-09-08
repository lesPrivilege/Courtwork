import { PLAYBOOK_VERSION } from './constants.mjs';

/**
 * Production rule metadata for the bounded synthetic playbook.  This module
 * contains no evaluation corpus or expected gold outcomes.
 */
export const RULE_DEFINITIONS = Object.freeze([
  {
    ruleId: 'purpose-limitation',
    sequence: 1,
    title: 'Use is limited to the synthetic transaction purpose',
    sourceQuotes: [
      '1. Purpose. Recipient may use Confidential Information solely to evaluate Project Cedar acquisition.',
    ],
    conflictQuotes: [
      '1. Purpose. Recipient may use Confidential Information for any business purpose, including Project Cedar acquisition.',
    ],
    sourceMarkers: ['1. Purpose.'],
    factPaths: ['transaction.purpose', 'use.purpose'],
    expected: 'use.purpose equals "evaluate Project Cedar acquisition"',
  },
  {
    ruleId: 'need-to-know-recipients',
    sequence: 2,
    title: 'Recipients are need-to-know and bound',
    sourceQuotes: [
      '2. Recipients. Recipient may disclose Confidential Information only to employees and professional advisers with a need to know who are bound by confidentiality obligations at least as protective as this Agreement.',
    ],
    conflictQuotes: [
      '2. Recipients. Recipient may disclose Confidential Information to any contractor without a need-to-know restriction.',
    ],
    sourceMarkers: ['2. Recipients.'],
    factPaths: ['recipients[].needToKnow', 'recipients[].boundToConfidentiality'],
    expected: 'every listed recipient has needToKnow=true and boundToConfidentiality=true',
  },
  {
    ruleId: 'security-and-notice',
    sequence: 3,
    title: 'Safeguards and notice window meet the synthetic check',
    sourceQuotes: [
      '3. Safeguards. Recipient shall maintain reasonable administrative, technical, and physical safeguards and notify Disclosing Party without undue delay after discovering unauthorized access.',
    ],
    conflictQuotes: [
      '3. Safeguards. Recipient may use any safeguards and has no duty to notify Disclosing Party of unauthorized access.',
    ],
    sourceMarkers: ['3. Safeguards.'],
    factPaths: ['security.safeguards', 'security.noticeHours'],
    expected: 'safeguards="reasonable" and noticeHours<=24',
  },
  {
    ruleId: 'term-duration',
    sequence: 4,
    title: 'Confidentiality term is three years',
    sourceQuotes: [
      '4. Term. These confidentiality obligations continue for three years after the Effective Date.',
    ],
    conflictQuotes: [
      '4. Term. These confidentiality obligations continue for five years after the Effective Date.',
    ],
    sourceMarkers: ['4. Term.'],
    factPaths: ['term.years'],
    expected: 'term.years equals 3',
  },
]);

export const RULE_IDS = Object.freeze(RULE_DEFINITIONS.map((rule) => rule.ruleId));
export const RULE_SET = new Set(RULE_IDS);
export const PLAYBOOK_RULES_VERSION = PLAYBOOK_VERSION;
