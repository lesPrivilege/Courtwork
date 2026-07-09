import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDataset } from './dataset-loader.js';

describe('loadDataset', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'courtwork-eval-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeCase(scenario: string, caseId: string, overrides: Record<string, unknown> = {}) {
    const dir = join(root, scenario, caseId);
    mkdirSync(dir, { recursive: true });
    const caseData = {
      id: caseId,
      scenario,
      caseType: 'core',
      task: { instruction: '审查条款', input: {} },
      expectedAnswer: {},
      scoringRules: [{ type: 'schemaValid', schemaName: 'RiskList' }],
      sourceRefs: ['x'],
      ...overrides,
    };
    writeFileSync(join(dir, 'case.json'), JSON.stringify(caseData, null, 2));
  }

  it('loads all cases under a scenario directory, sorted by id', () => {
    writeCase('S3', 'b-case');
    writeCase('S3', 'a-case');

    const cases = loadDataset(root, 'S3');

    expect(cases.map((c) => c.id)).toEqual(['a-case', 'b-case']);
  });

  it('throws with the case id in the message when a case.json fails schema validation', () => {
    const dir = join(root, 'S3', 'bad-case');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'case.json'), JSON.stringify({ id: 'bad-case' }));

    expect(() => loadDataset(root, 'S3')).toThrow(/bad-case/);
  });

  it('throws when case.json id does not match its directory name', () => {
    writeCase('S3', 'dir-name', { id: 'wrong-id' });

    expect(() => loadDataset(root, 'S3')).toThrow(/dir-name/);
  });

  it('returns an empty array when the scenario directory has no cases', () => {
    mkdirSync(join(root, 'S4'), { recursive: true });

    expect(loadDataset(root, 'S4')).toEqual([]);
  });
});
