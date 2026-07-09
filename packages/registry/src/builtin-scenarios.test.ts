import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenariosFromDir } from './loader.js';

const SCENARIOS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'scenarios');

describe('built-in MVP scenarios', () => {
  it('loads and validates all four built-in scenario declarations', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    expect(scenarios.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4']);
  });

  it('S1 卷宗阅卷 produces CaseFile, Timeline, and PartyGraph', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s1 = scenarios.find((s) => s.id === 'S1');
    expect(s1?.outputArtifacts).toEqual(['CaseFile', 'Timeline', 'PartyGraph']);
  });

  it('S3 合同审查 requires party-verify and produces RiskList', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s3 = scenarios.find((s) => s.id === 'S3');
    expect(s3?.toolIds).toEqual(['party-verify']);
    expect(s3?.outputArtifacts).toEqual(['RiskList']);
  });

  it('S4 文书起草 produces RevisionInstructionSet with an artifact-referencing confirmation gate', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s4 = scenarios.find((s) => s.id === 'S4');
    expect(s4?.outputArtifacts).toEqual(['RevisionInstructionSet']);
    expect(s4?.confirmationGates[0]?.artifact).toBe('RevisionInstructionSet');
  });
});
