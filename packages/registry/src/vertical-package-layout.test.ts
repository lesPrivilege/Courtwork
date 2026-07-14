import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const LEGAL_SOURCE = join(REPO_ROOT, 'packages', 'legal', 'src');
const PM_SOURCE = join(REPO_ROOT, 'packages', 'pm', 'src');

function missingPaths(root: string, paths: readonly string[]): string[] {
  return paths.filter((path) => !existsSync(join(root, path)));
}

function presentPaths(root: string, paths: readonly string[]): string[] {
  return paths.filter((path) => existsSync(join(root, path)));
}

function layoutViolations(
  existing: ReadonlySet<string>,
  required: readonly string[],
  forbidden: readonly string[],
): string[] {
  return [
    ...required.filter((path) => !existing.has(path)).map((path) => `missing:${path}`),
    ...forbidden.filter((path) => existing.has(path)).map((path) => `forbidden:${path}`),
  ];
}

describe('VPKG-LAYOUT-1 垂类包物理体例与内容 golden', () => {
  it('Legal 真实能力各归其位，旧 manifest/root domain 真源与空 runtime 不存在', () => {
    expect(missingPaths(LEGAL_SOURCE, [
      'package/descriptor.ts',
      'package/bindings.ts',
      'package/index.ts',
      'presentation/index.ts',
      'scenarios/index.ts',
      'interactions/index.ts',
      'domain/compile-risk-list-to-revisions.ts',
      'testing/index.ts',
    ])).toEqual([]);
    expect(presentPaths(LEGAL_SOURCE, [
      'manifest.ts',
      'compile-risk-list-to-revisions.ts',
      'runtime',
    ])).toEqual([]);
  });

  it('PM 只建立真实 package/presentation/schema/domain，不制造空场景、交互、runtime 或 testing', () => {
    expect(missingPaths(PM_SOURCE, [
      'package/descriptor.ts',
      'package/bindings.ts',
      'package/index.ts',
      'presentation/index.ts',
      'schemas/index.ts',
      'schemas/source-grade.ts',
      'schemas/feedback-digest.ts',
      'schemas/prd-review.ts',
      'schemas/priority-score.ts',
      'schemas/action-items.ts',
      'domain/score-calc.ts',
    ])).toEqual([]);
    expect(presentPaths(PM_SOURCE, [
      'manifest.ts',
      'schemas.ts',
      'source-grade.ts',
      'feedback-digest.ts',
      'prd-review.ts',
      'priority-score.ts',
      'action-items.ts',
      'score-calc.ts',
      'scenarios',
      'interactions',
      'runtime',
      'testing',
    ])).toEqual([]);
  });

  it('守卫自检：合成缺文件与旧真源残留都会逐项触红', () => {
    expect(layoutViolations(
      new Set(['package/index.ts', 'manifest.ts']),
      ['package/descriptor.ts', 'package/index.ts'],
      ['manifest.ts', 'runtime'],
    )).toEqual([
      'missing:package/descriptor.ts',
      'forbidden:manifest.ts',
    ]);
  });
});
