import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTRACT_VERSION,
  GOLD_FIXTURES,
  HASH_MANIFEST,
  HOLDOUT_FIXTURES,
  PLAYBOOK_VERSION,
  REVIEW_STATUSES,
  buildReview,
  playbook,
  reviewToArtifact,
  reviewToCoreCandidate,
  reviewToObligations,
  verifyReview,
} from '../domains/inbound-nda/index.mjs';

const cases = Object.values(GOLD_FIXTURES);

test('bounded NDA playbook and fixture manifest are versioned and serializable', () => {
  assert.equal(CONTRACT_VERSION, 'inbound-nda-v1');
  assert.equal(typeof PLAYBOOK_VERSION, 'string');
  assert.equal(playbook.rules.length, 4);
  assert.deepEqual(playbook.rules.map((rule) => rule.ruleId), [
    'purpose-limitation',
    'need-to-know-recipients',
    'security-and-notice',
    'term-duration',
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(playbook)), playbook);
  assert.deepEqual(REVIEW_STATUSES, ['pass', 'deviation', 'missing', 'conflict', 'unknown']);
  assert.match(HASH_MANIFEST.schema, /inbound-nda-fixture-hashes\/v1/);
  assert.equal(HASH_MANIFEST.contractVersion, CONTRACT_VERSION);
  assert.equal(HASH_MANIFEST.playbookVersion, PLAYBOOK_VERSION);
  assert.equal(Object.keys(HASH_MANIFEST.development.cases).length, 4);
  assert.ok(HASH_MANIFEST.holdout.cases['holdout-normal']);
  for (const digest of [
    HASH_MANIFEST.development.sourceSetSha256,
    HASH_MANIFEST.development.fixtureSetSha256,
    HASH_MANIFEST.holdout.sourceSetSha256,
    HASH_MANIFEST.holdout.fixtureSetSha256,
  ]) assert.match(digest, /^[a-f0-9]{64}$/);
});

test('buildReview produces the four frozen gold outcomes with complete anchors', () => {
  for (const fixture of cases) {
    const review = buildReview({ sources: fixture.sources, facts: fixture.facts });
    assert.equal(review.schemaVersion, 1);
    assert.equal(review.contractVersion, CONTRACT_VERSION);
    assert.equal(review.playbookVersion, PLAYBOOK_VERSION);
    assert.deepEqual(Object.fromEntries(review.findings.map((finding) => [finding.ruleId, finding.status])), fixture.expectedStatuses);
    assert.equal(review.findings.length, 4);
    for (const finding of review.findings) {
      assert.equal(finding.evidence.length, 1);
      assert.ok(finding.evidence[0].quote.length > 20);
      assert.ok(finding.evidence[0].digest);
    }
    const verification = verifyReview(review, { sources: fixture.sources, facts: fixture.facts });
    assert.equal(verification.ok, true, `${fixture.id}: ${JSON.stringify(verification.errors)}`);
  }
});

test('verifyReview rejects self-reported conclusions, missing coverage and duplicate rules', () => {
  const fixture = GOLD_FIXTURES.normal;
  const review = buildReview({ sources: fixture.sources, facts: fixture.facts });

  const forged = structuredClone(review);
  forged.findings[2].status = 'pass';
  forged.findings[2].reason = 'model says pass';
  const forgedResult = verifyReview(forged, { sources: GOLD_FIXTURES.missing.sources, facts: GOLD_FIXTURES.missing.facts });
  assert.equal(forgedResult.ok, false);
  assert.ok(forgedResult.errors.some((error) => error.code === 'FACTS_MISMATCH'));
  assert.ok(forgedResult.errors.some((error) => error.code === 'CONCLUSION_MISMATCH'));

  const duplicate = structuredClone(review);
  duplicate.findings[1] = structuredClone(duplicate.findings[0]);
  const duplicateResult = verifyReview(duplicate, { sources: fixture.sources, facts: fixture.facts });
  assert.equal(duplicateResult.ok, false);
  assert.ok(duplicateResult.errors.some((error) => error.code === 'DUPLICATE_RULE'));
  assert.ok(duplicateResult.errors.some((error) => error.code === 'FINDINGS_COVERAGE'));

  const missingFinding = structuredClone(review);
  missingFinding.findings.pop();
  const missingResult = verifyReview(missingFinding, { sources: fixture.sources, facts: fixture.facts });
  assert.equal(missingResult.ok, false);
  assert.ok(missingResult.errors.some((error) => error.code === 'FINDINGS_COVERAGE'));
});

test('verifyReview rejects bad source anchors and reconciliation tampering', () => {
  const fixture = GOLD_FIXTURES.normal;
  const review = buildReview({ sources: fixture.sources, facts: fixture.facts });

  const badAnchor = structuredClone(review);
  badAnchor.findings[0].evidence[0].quote = 'a forged quote';
  const badAnchorResult = verifyReview(badAnchor, { sources: fixture.sources, facts: fixture.facts });
  assert.equal(badAnchorResult.ok, false);
  assert.ok(badAnchorResult.errors.some((error) => error.code === 'INVALID_EVIDENCE'));
  assert.ok(badAnchorResult.errors.some((error) => error.code === 'SOURCE_COVERAGE'));

  const duplicateEvidence = structuredClone(review);
  duplicateEvidence.findings[0].evidence.push(structuredClone(duplicateEvidence.findings[0].evidence[0]));
  const duplicateEvidenceResult = verifyReview(duplicateEvidence, { sources: fixture.sources, facts: fixture.facts });
  assert.equal(duplicateEvidenceResult.ok, false);
  assert.ok(duplicateEvidenceResult.errors.some((error) => error.code === 'DUPLICATE_EVIDENCE'));

  const badReconciliation = structuredClone(review);
  badReconciliation.reconciliation.complete = false;
  const badReconciliationResult = verifyReview(badReconciliation, { sources: fixture.sources, facts: fixture.facts });
  assert.equal(badReconciliationResult.ok, false);
  assert.ok(badReconciliationResult.errors.some((error) => error.code === 'RECONCILIATION_MISMATCH'));
});

test('candidate adapters are serializable and preserve proposal-only obligations', () => {
  const fixture = GOLD_FIXTURES.missing;
  const review = buildReview({ sources: fixture.sources, facts: fixture.facts });
  const candidate = reviewToCoreCandidate(review);
  const artifact = reviewToArtifact(review);
  const obligations = reviewToObligations(review);
  assert.deepEqual(JSON.parse(JSON.stringify(candidate)), candidate);
  assert.deepEqual(JSON.parse(JSON.stringify(artifact)), artifact);
  assert.deepEqual(JSON.parse(JSON.stringify(obligations)), obligations);
  assert.equal(typeof candidate.artifact_text, 'string');
  assert.equal(candidate.evidence.length, 4);
  assert.equal(obligations.length, 1);
  assert.equal(obligations[0].id, 'nda-security-and-notice-missing');
  assert.equal(obligations[0].status, 'open');
  assert.equal(obligations[0].blocking, true);
  assert.equal(artifact.status, 'needs_review');
  assert.match(candidate.artifact_text, /proposal only/);
});

test('development and holdout fixtures are distinct but obey the same deterministic contract', () => {
  const devNormal = buildReview({
    sources: HASH_MANIFEST.development.cases.normal ? GOLD_FIXTURES.normal.sources : [],
    facts: GOLD_FIXTURES.normal.facts,
  });
  const holdout = HOLDOUT_FIXTURES[0];
  const holdoutReview = buildReview({ sources: holdout.sources, facts: holdout.facts });
  assert.equal(verifyReview(devNormal, { sources: GOLD_FIXTURES.normal.sources, facts: GOLD_FIXTURES.normal.facts }).ok, true);
  assert.equal(verifyReview(holdoutReview, { sources: holdout.sources, facts: holdout.facts }).ok, true);
  assert.notEqual(HASH_MANIFEST.development.sourceSetSha256, HASH_MANIFEST.holdout.sourceSetSha256);
  assert.notEqual(HASH_MANIFEST.development.fixtureSetSha256, HASH_MANIFEST.holdout.fixtureSetSha256);
});
