import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FeedbackDigestSchema,
  PrdReviewSchema,
  type FeedbackDigest,
  type PrdReview,
} from '@courtwork/pm';

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export interface PmFixtureSnapshot {
  readonly caseBible: string;
  readonly manifest: string;
  readonly materials: Readonly<{
    '01-prd.md': string;
    '02-feedback.md': string;
  }>;
  readonly artifacts: Readonly<{
    prdReview: DeepReadonly<PrdReview>;
    feedbackDigest: DeepReadonly<FeedbackDigest>;
  }>;
}

const fixtureRoot = join(import.meta.dirname, '..', 'data', 'pm');

function readText(path: string): string {
  return readFileSync(join(fixtureRoot, path), 'utf8');
}

function readJson(path: string): unknown {
  return JSON.parse(readText(path));
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

const snapshot: PmFixtureSnapshot = deepFreeze({
  caseBible: readText('case-bible.md'),
  manifest: readText('manifest.md'),
  materials: {
    '01-prd.md': readText('materials/01-prd.md'),
    '02-feedback.md': readText('materials/02-feedback.md'),
  },
  artifacts: {
    prdReview: PrdReviewSchema.parse(readJson('artifacts/prd-review.json')),
    feedbackDigest: FeedbackDigestSchema.parse(readJson('artifacts/feedback-digest.json')),
  },
});

/** Returns the one recursively frozen, schema-validated PM catalog snapshot. */
export function getPmFixture(): PmFixtureSnapshot {
  return snapshot;
}
