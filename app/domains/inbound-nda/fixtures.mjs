import { CONTRACT_VERSION, PLAYBOOK_VERSION, SCHEMA_VERSION } from './constants.mjs';
import { RULE_DEFINITIONS } from './rules.mjs';
import { sha256, stableJson } from './serialization.mjs';

const clone = (value) => structuredClone(value);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
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

const PURPOSE_CLAUSE = RULE_DEFINITIONS.find((rule) => rule.ruleId === 'purpose-limitation').sourceQuotes[0];
const SECURITY_CLAUSE = RULE_DEFINITIONS.find((rule) => rule.ruleId === 'security-and-notice').sourceQuotes[0];
const TERM_CLAUSE = RULE_DEFINITIONS.find((rule) => rule.ruleId === 'term-duration').sourceQuotes[0];
const TERM_CONFLICT_CLAUSE = RULE_DEFINITIONS.find((rule) => rule.ruleId === 'term-duration').conflictQuotes[0];

function replaceClause(text, clause, replacement) {
  if (!text.includes(clause)) throw new Error(`fixture clause is not present: ${clause}`);
  return text.replace(clause, replacement);
}

// Keep one source variant per failure class.  These are valid source bytes,
// with the same source identity shape, so the domain must report the clause
// boundary rather than throw before it can produce a review finding.
const MISSING_SOURCE_TEXT = replaceClause(NDA_TEXT, `${SECURITY_CLAUSE}\n`, '');
const CONFLICT_SOURCE_TEXT = replaceClause(NDA_TEXT, TERM_CLAUSE, `${TERM_CLAUSE}\n${TERM_CONFLICT_CLAUSE}`);
const UNKNOWN_SOURCE_TEXT = replaceClause(
  NDA_TEXT,
  PURPOSE_CLAUSE,
  '1. Purpose. Recipient may use Confidential Information solely to assess Project Cedar acquisition.',
);

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

export const MISSING_SOURCES = deepFreeze([
  source('synthetic-inbound-nda-dev-missing', MISSING_SOURCE_TEXT),
]);

export const CONFLICT_SOURCES = deepFreeze([
  source('synthetic-inbound-nda-dev-conflict', CONFLICT_SOURCE_TEXT),
]);

export const UNKNOWN_SOURCES = deepFreeze([
  source('synthetic-inbound-nda-dev-unknown', UNKNOWN_SOURCE_TEXT),
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
    sources: clone(MISSING_SOURCES),
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
    sources: clone(CONFLICT_SOURCES),
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
    sources: clone(UNKNOWN_SOURCES),
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

const ACTUAL_HASH_MANIFEST = {
  schema: 'inbound-nda-fixture-hashes/v1',
  schemaVersion: SCHEMA_VERSION,
  contractVersion: CONTRACT_VERSION,
  playbookVersion: PLAYBOOK_VERSION,
  playbookSha256: sha256(RULE_DEFINITIONS),
  development: setHashes(DEVELOPMENT_FIXTURES),
  holdout: setHashes(HOLDOUT_FIXTURES),
};

// These values are deliberately checked into the fixture module.  Dynamic
// recomputation alone would make a changed corpus look valid on every run.
const EXPECTED_HASH_MANIFEST = {
  schema: 'inbound-nda-fixture-hashes/v1',
  schemaVersion: 1,
  contractVersion: 'inbound-nda-v1',
  playbookVersion: 'inbound-nda-playbook-v1',
  playbookSha256: '3ecd3a9f33b39de12a6ad4d41e4077e650f2678a9746234baa627e29272a597f',
  development: {
    sourceSetSha256: 'e33f05f97e92c0c60d3b2b5a28e5934207c934bac8ed23de1691f7254d1ad418',
    factsSetSha256: '8c1961394d3d7f28eea7b269cbb2ad4057b09fc4449a163bcdfae80a6391f1c2',
    goldSetSha256: 'fa275a546b16d79f56f3b53005fb24ad6ce3c5a1178bf242dc542550b18e1806',
    fixtureSetSha256: '56710275cc377e3a7024465682b5516910e978b0e444744522653ef25d33346a',
    cases: {
      normal: {
        factsSha256: 'acce46c1ab0402dcf038cf3ddb767ed93fa2900bc57743f94d6e1953d07af279',
        sourcesSha256: '5be82870d2c8c50c019be1c22448a16828f87568383a5510301e72b5512b7948',
        expectedSha256: '1a766c04f98ffe4d5dee2b00078d7006df516ed2dadedd8b4dcdc8eb627b99c1',
        fixtureSha256: '7384201d03e1b8df8eeb4290b7735545732e101f8f68ffe236e53ecf1aca9b3a',
      },
      missing: {
        factsSha256: '4f4ac723a7233975e90dbbd30cb92eec665dfaac76436378a4d7825a15ec31ee',
        sourcesSha256: 'b7eb50ae7e15f0323d2ebb829b41ee539cb032515d5604ad35d8db39c6ddc646',
        expectedSha256: '56f62333d7984440340a7c42ad96e328e776a91ca2c3635b671cab7f189c0450',
        fixtureSha256: '3090b1336cc3481fd7026e8b7cdee1277e72f885b7e835ae7f41fe9fccad35b5',
      },
      conflict: {
        factsSha256: 'e62138816b74ad748270dca8fc3a5cccf343c9c9f00ddb768318170c0819fc3a',
        sourcesSha256: 'b716bd52abc9b0db82044dbef8b69e618ba63428ab501fedf32a64f8c35a1d63',
        expectedSha256: '35905dea273ecf5ecc8d05ba0a94fcbd726b93ed96e5eb5354a2efdcfc95ed0c',
        fixtureSha256: '127d4b4ab71873c84638f34834afe7fcf5f1a2e6625e25d60c582b5eec90fd00',
      },
      unknown: {
        factsSha256: 'b3ed72e32c5abdc1a91fc7e9a9b700c9d0d51972d38171084ce9a625318cc549',
        sourcesSha256: '59e0896e0a71c6eab19476374ab061f8e130bcfa68f0930189a0371f2e336e9a',
        expectedSha256: '113b8ab9396e8c703ce9128ef4a6ba9d614d687f1fcb7cb2bd855945e3044fe4',
        fixtureSha256: 'e67ef49c40c190fdd95ccc213123e7c7da861e76fd6718d873e621848a57f4d7',
      },
    },
  },
  holdout: {
    sourceSetSha256: '1bba0f79302a0d168f8794da57d864a5e4d24fcba9acc5cb79c9f8a145479124',
    factsSetSha256: '370ecfb3859aac1bbc15992dd98a8b6bead93e6ed37a7ff36877c214028ae3de',
    goldSetSha256: 'a14cbd12bd2ed1ca6fe9adf62848a9b60451f5c70b983ea3b5389fd4ff0fcf24',
    fixtureSetSha256: '76f59f5329966f6805c06381b076eba40f9b23b40d44f43d7ecc139d5abfabfc',
    cases: {
      'holdout-normal': {
        factsSha256: '3c65f1de1bb40cdf974de3287eed96d7f7874bfd4c0381ae9c010d17e329db19',
        sourcesSha256: '989573b526d3e80b6ea1870398880a401be03291bf21ee41d04c534c2c04a3a6',
        expectedSha256: '1a766c04f98ffe4d5dee2b00078d7006df516ed2dadedd8b4dcdc8eb627b99c1',
        fixtureSha256: '7c007fafb664b1740f1bdd7822093d4fb756aa0295a24b31e8a0c273cfefb090',
      },
      'holdout-deviation': {
        factsSha256: '182f9d7bde87c7827252426560e5c34a3613d6b02715e7536617f0255beee3c1',
        sourcesSha256: '989573b526d3e80b6ea1870398880a401be03291bf21ee41d04c534c2c04a3a6',
        expectedSha256: '79f94aa361b83e8c95bfd0d22f245c5fa26be76db70f81add49d9beb24d236be',
        fixtureSha256: '62bdd0a25dbb7849dc01888b1c1400440284a7ba7eb553ccb879ce8a21dc2246',
      },
    },
  },
};

if (stableJson(ACTUAL_HASH_MANIFEST) !== stableJson(EXPECTED_HASH_MANIFEST)) {
  throw new Error('inbound NDA fixture hash manifest mismatch; update fixture data and expected hashes together');
}

export const HASH_MANIFEST = deepFreeze(EXPECTED_HASH_MANIFEST);

export const fixtures = deepFreeze({
  gold: GOLD_FIXTURES,
  development: DEVELOPMENT_FIXTURES,
  holdout: HOLDOUT_FIXTURES,
  hashes: HASH_MANIFEST,
});

// Lowercase aliases are convenient for callers that treat fixtures as data;
// uppercase names above make the frozen test corpus obvious in imports.
export const syntheticSources = SYNTHETIC_SOURCES;
export const normalFacts = NORMAL_FACTS;
export const goldFixtures = GOLD_FIXTURES;
export const developmentFixtures = DEVELOPMENT_FIXTURES;
export const holdoutFixtures = HOLDOUT_FIXTURES;
export const hashManifest = HASH_MANIFEST;
export const gold = GOLD_FIXTURES;
export const development = DEVELOPMENT_FIXTURES;
export const holdout = HOLDOUT_FIXTURES;
export const fixtureManifest = HASH_MANIFEST;
