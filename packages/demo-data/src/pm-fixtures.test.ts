import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FeedbackDigestSchema, PrdReviewSchema } from '@courtwork/pm';
import { getPmFixture } from './pm-fixtures.js';

const fixtureRoot = join(import.meta.dirname, '..', 'data', 'pm');

function listFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(relative(root, absolute));
    }
  };
  visit(root);
  return files.sort();
}

function contentVersion(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

function assertAnchor(source: string, anchor: {
  fileId: string;
  textRange?: { start: number; end: number };
  textLayerVersion?: string;
  quote?: string;
}) {
  expect(anchor.textRange, `${anchor.fileId}:${anchor.quote}`).toBeDefined();
  expect(anchor.textRange!.start, `${anchor.fileId}:${anchor.quote}`).toBeGreaterThan(0);
  expect(anchor.textRange!.end).toBeGreaterThan(anchor.textRange!.start);
  expect(source.slice(anchor.textRange!.start, anchor.textRange!.end)).toBe(anchor.quote);
  expect(anchor.textLayerVersion).toBe(contentVersion(source));
}

describe('PM-FIXTURE-1 file and watermark boundary', () => {
  it('ships exactly the frozen fixture file set and no PriorityScore payload', () => {
    expect(listFiles(fixtureRoot)).toEqual([
      'artifacts/feedback-digest.json',
      'artifacts/prd-review.json',
      'case-bible.md',
      'manifest.md',
      'materials/01-prd.md',
      'materials/02-feedback.md',
    ]);
  });

  it('marks every material and both schema-constrained artifacts as synthetic', () => {
    const fixture = getPmFixture();
    for (const text of [fixture.caseBible, fixture.manifest, ...Object.values(fixture.materials)]) {
      expect(text).toMatch(/^> .*虚构.*水印/m);
    }
    expect(fixture.artifacts.prdReview.projectId).toMatch(/^DEMO-/);
    expect(fixture.artifacts.feedbackDigest.projectId).toMatch(/^DEMO-/);
  });
});

describe('PM-FIXTURE-1 schema and evidence closure', () => {
  it('is valid against the public @courtwork/pm schemas', () => {
    const fixture = getPmFixture();
    expect(PrdReviewSchema.safeParse(fixture.artifacts.prdReview).success).toBe(true);
    expect(FeedbackDigestSchema.safeParse(fixture.artifacts.feedbackDigest).success).toBe(true);
  });

  it('keeps project and document identities closed across the snapshot', () => {
    const fixture = getPmFixture();
    const review = fixture.artifacts.prdReview;
    expect(review.projectId).toBe(fixture.artifacts.feedbackDigest.projectId);
    expect(fixture.caseBible).toContain(`项目 ID：\`${review.projectId}\``);
    expect(review.documentId).toBe('01-prd.md');
    expect(Object.keys(fixture.materials)).toContain(review.documentId);
  });

  it('covers the six PRD defects exactly once, all pending, with exact UTF-16 anchors', () => {
    const fixture = getPmFixture();
    const review = fixture.artifacts.prdReview;
    expect(review.findings.map((finding) => finding.defectType).sort()).toEqual([
      'conflicting-requirement',
      'missing-acceptance',
      'missing-dependency',
      'undefined-boundary',
      'untestable',
      'vague-metric',
    ]);
    expect(new Set(review.findings.map((finding) => finding.id)).size).toBe(review.findings.length);
    expect(review.findings.every((finding) => finding.status === 'pending')).toBe(true);

    const source = fixture.materials['01-prd.md'];
    for (const finding of review.findings) {
      expect(finding.sourceAnchors).toHaveLength(1);
      const anchor = finding.sourceAnchors[0]!;
      expect(anchor.fileId).toBe('01-prd.md');
      expect(anchor.quote).toBe(finding.clause);
      assertAnchor(source, anchor);
    }
    const firstStart = review.findings[0]!.sourceAnchors[0]!.textRange!.start;
    expect([...source.slice(0, firstStart)].length).toBeLessThan(firstStart);
  });

  it('closes FeedbackDigest clusters in both directions and leaves OOC honestly unclassified', () => {
    const fixture = getPmFixture();
    const digest = fixture.artifacts.feedbackDigest;
    expect(digest.clusters.length).toBeGreaterThanOrEqual(2);
    expect(new Set(digest.items.map((item) => item.channel)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(digest.items.map((item) => item.id)).size).toBe(digest.items.length);
    expect(new Set(digest.clusters.map((cluster) => cluster.id)).size).toBe(digest.clusters.length);

    const ooc = digest.items.filter((item) => item.status === 'out_of_coverage');
    expect(ooc).toHaveLength(1);
    expect(ooc[0]).toMatchObject({ clusterId: null, rootCause: null });

    const source = fixture.materials['02-feedback.md'];
    const items = new Map(digest.items.map((item) => [item.id, item]));
    for (const item of digest.items) {
      expect(item.sourceAnchors.some((anchor) => anchor.quote === item.quote)).toBe(true);
      for (const anchor of item.sourceAnchors) {
        expect(anchor.fileId).toBe('02-feedback.md');
        assertAnchor(source, anchor);
      }
    }
    for (const cluster of digest.clusters) {
      const expectedMembers = digest.items
        .filter((item) => item.clusterId === cluster.id)
        .map((item) => item.id)
        .sort();
      expect([...cluster.memberIds].sort()).toEqual(expectedMembers);
      const memberQuotes = new Set(cluster.memberIds.map((id) => items.get(id)?.quote));
      for (const anchor of cluster.evidence) {
        expect(anchor.fileId).toBe('02-feedback.md');
        expect(memberQuotes.has(anchor.quote)).toBe(true);
        assertAnchor(source, anchor);
      }
    }
    expect(digest.clusters.flatMap((cluster) => cluster.memberIds)).not.toContain(ooc[0]!.id);
  });

  it('binds every anchor and manifest entry to deterministic full-content hashes', () => {
    const fixture = getPmFixture();
    for (const [fileId, source] of Object.entries(fixture.materials)) {
      expect(fixture.manifest).toContain(`${fileId}: ${contentVersion(source)}`);
    }
  });

  it('returns one recursively frozen snapshot', () => {
    const fixture = getPmFixture();
    expect(getPmFixture()).toBe(fixture);
    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.artifacts.prdReview.findings[0])).toBe(true);
    expect(() => {
      (fixture.artifacts.prdReview as { projectId: string }).projectId = 'mutated';
    }).toThrow();
  });
});
