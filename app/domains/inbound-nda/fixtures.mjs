import { createHash } from 'node:crypto';
import { CONTRACT_VERSION, PLAYBOOK_VERSION, SCHEMA_VERSION } from './constants.mjs';

const clone = (value) => structuredClone(value);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function sha256(value) {
  const input = typeof value === 'string' ? value : stableJson(value);
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

const NDA_TEXT = [
  'SYNTHETIC INBOUND NON-DISCLOSURE AGREEMENT',
  'Disclosing Party: Northstar Bio, Inc.',
  'Receiving Party: Courtwork Holdings Pte. Ltd.',
  'Transaction: Project Cedar acquisition.',
  '',
  '1. Purpose. Recipient may use Confidential Information solely to evaluate Project Cedar acquisition.',
  '2. Recipients. Recipient may disclose Confidential Information only to employees and professional advisers with a need to know who are bound by confidentiality obligations at least as protective as this Agreement.',
  '3. Safeguards. Recipient shall maintain reasonable administrative, technical, and physical safeguards and notify Disclosing Party without undue delay after discovering unauthorized access.',
  '4. Term. These confidentiality obligations continue for three years after the Effective Date.',
].join('\n');

const HOLDOUT_NDA_TEXT = [
  'SYNTHETIC INBOUND NON-DISCLOSURE AGREEMENT — HOLDOUT B',
  'Disclosing Party: Northstar Bio, Inc.',
  'Receiving Party: Courtwork Holdings Pte. Ltd.',
  'Transaction: Project Cedar acquisition.',
  '',
  '1. Purpose. Recipient may use Confidential Information solely to evaluate Project Cedar acquisition.',
  '2. Recipients. Recipient may disclose Confidential Information only to employees and professional advisers with a need to know who are bound by confidentiality obligations at least as protective as this Agreement.',
  '3. Safeguards. Recipient shall maintain reasonable administrative, technical, and physical safeguards and notify Disclosing Party without undue delay after discovering unauthorized access.',
  '4. Term. These confidentiality obligations continue for three years after the Effective Date.',
].join('\n');

function source(id, text) {
  return {
    id,
    version: 1,
    text,
    digest: sha256(text),
  };
}

export const SYNTHETIC_SOURCE_ID = 'synthetic-inbound-nda-dev';
export const HOLDOUT_SOURCE_ID = 'synthetic-inbound-nda-holdout-b';

export const SYNTHETIC_SOURCES = deepFreeze([
  source(SYNTHETIC_SOURCE_ID, NDA_TEXT),
]);

export const HOLDOUT_SOURCES = deepFreeze([
  source(HOLDOUT_SOURCE_ID, HOLDOUT_NDA_TEXT),
]);

const baseFacts = {
  matterId: 'synthetic-nda-matter-001',
  representedParty: 'Courtwork Holdings Pte. Ltd.',
  disclosingParty: 'Northstar Bio, Inc.',
  transaction: {
    id: 'project-cedar',
    name: 'Project Cedar acquisition',
    purpose: 'evaluate Project Cedar acquisition',
  },
  use: {
    purpose: 'evaluate Project Cedar acquisition',
  },
  recipients: [
    {
      name: 'Courtwork deal team',
      kind: 'employees',
      needToKnow: true,
      boundToConfidentiality: true,
    },
    {
      name: 'Harrow LLP',
      kind: 'professional advisers',
      needToKnow: true,
      boundToConfidentiality: true,
    },
  ],
  security: {
    safeguards: 'reasonable',
    noticeHours: 24,
  },
  term: {
    years: 3,
  },
};

export const NORMAL_FACTS = deepFreeze(baseFacts);

const missingFacts = clone(baseFacts);
delete missingFacts.security.noticeHours;

const conflictFacts = clone(baseFacts);
conflictFacts.term.years = [3, 5];

const unknownFacts = clone(baseFacts);
unknownFacts.use.purpose = { state: 'unknown' };

export const GOLD_FIXTURES = deepFreeze({
  normal: {
    id: 'normal',
    sources: clone(SYNTHETIC_SOURCES),
    facts: clone(NORMAL_FACTS),
    expectedStatuses: {
      'purpose-limitation': 'pass',
      'need-to-know-recipients': 'pass',
      'security-and-notice': 'pass',
      'term-duration': 'pass',
    },
  },
  missing: {
    id: 'missing',
    sources: clone(SYNTHETIC_SOURCES),
    facts: missingFacts,
    expectedStatuses: {
      'purpose-limitation': 'pass',
      'need-to-know-recipients': 'pass',
      'security-and-notice': 'missing',
      'term-duration': 'pass',
    },
  },
  conflict: {
    id: 'conflict',
    sources: clone(SYNTHETIC_SOURCES),
    facts: conflictFacts,
    expectedStatuses: {
      'purpose-limitation': 'pass',
      'need-to-know-recipients': 'pass',
      'security-and-notice': 'pass',
      'term-duration': 'conflict',
    },
  },
  unknown: {
    id: 'unknown',
    sources: clone(SYNTHETIC_SOURCES),
    facts: unknownFacts,
    expectedStatuses: {
      'purpose-limitation': 'unknown',
      'need-to-know-recipients': 'pass',
      'security-and-notice': 'pass',
      'term-duration': 'pass',
    },
  },
});

// The development set contains the four frozen status classes.  The holdout
// uses a distinct source id/digest and facts identity so it cannot be silently
// counted as an additional development example.
export const DEVELOPMENT_FIXTURES = deepFreeze(Object.values(GOLD_FIXTURES).map((item) => clone(item)));

const holdoutFacts = clone(NORMAL_FACTS);
holdoutFacts.matterId = 'synthetic-nda-matter-holdout-001';
holdoutFacts.representedParty = 'Courtwork Holdings Pte. Ltd. — holdout';

const holdoutDeviationFacts = clone(holdoutFacts);
holdoutDeviationFacts.security.noticeHours = 48;

export const HOLDOUT_FIXTURES = deepFreeze([
  {
    id: 'holdout-normal',
    sources: clone(HOLDOUT_SOURCES),
    facts: holdoutFacts,
    expectedStatuses: {
      'purpose-limitation': 'pass',
      'need-to-know-recipients': 'pass',
      'security-and-notice': 'pass',
      'term-duration': 'pass',
    },
  },
  {
    id: 'holdout-deviation',
    sources: clone(HOLDOUT_SOURCES),
    facts: holdoutDeviationFacts,
    expectedStatuses: {
      'purpose-limitation': 'pass',
      'need-to-know-recipients': 'pass',
      'security-and-notice': 'deviation',
      'term-duration': 'pass',
    },
  },
]);

export const RULE_DEFINITIONS = deepFreeze([
  {
    ruleId: 'purpose-limitation',
    sequence: 1,
    title: 'Use is limited to the synthetic transaction purpose',
    sourceQuotes: [
      '1. Purpose. Recipient may use Confidential Information solely to evaluate Project Cedar acquisition.',
    ],
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
    factPaths: ['term.years'],
    expected: 'term.years equals 3',
  },
]);

function fixtureHashes(items) {
  return Object.fromEntries(items.map((item) => [item.id, {
    factsSha256: sha256(item.facts),
    sourcesSha256: sha256(item.sources),
    expectedSha256: sha256(item.expectedStatuses),
    fixtureSha256: sha256({
      id: item.id,
      facts: item.facts,
      sources: item.sources,
      expectedStatuses: item.expectedStatuses,
    }),
  }]));
}

function setHashes(items) {
  return {
    sourceSetSha256: sha256(items.flatMap((item) => item.sources)),
    factsSetSha256: sha256(items.map((item) => ({ id: item.id, facts: item.facts }))),
    goldSetSha256: sha256(items.map((item) => ({ id: item.id, expectedStatuses: item.expectedStatuses }))),
    fixtureSetSha256: sha256(items.map((item) => ({
      id: item.id,
      facts: item.facts,
      sources: item.sources,
      expectedStatuses: item.expectedStatuses,
    }))),
    cases: fixtureHashes(items),
  };
}

export const HASH_MANIFEST = deepFreeze({
  schema: 'inbound-nda-fixture-hashes/v1',
  schemaVersion: SCHEMA_VERSION,
  contractVersion: CONTRACT_VERSION,
  playbookVersion: PLAYBOOK_VERSION,
  development: setHashes(DEVELOPMENT_FIXTURES),
  holdout: setHashes(HOLDOUT_FIXTURES),
});

// Lowercase aliases are convenient for callers that treat fixtures as data;
// uppercase names above make the frozen test corpus obvious in imports.
export const syntheticSources = SYNTHETIC_SOURCES;
export const normalFacts = NORMAL_FACTS;
export const goldFixtures = GOLD_FIXTURES;
export const developmentFixtures = DEVELOPMENT_FIXTURES;
export const holdoutFixtures = HOLDOUT_FIXTURES;
export const hashManifest = HASH_MANIFEST;
