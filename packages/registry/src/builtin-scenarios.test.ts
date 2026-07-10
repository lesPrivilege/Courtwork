import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenariosFromDir } from './loader.js';

const SCENARIOS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'scenarios');

describe('built-in MVP scenarios', () => {
  it('loads and validates all built-in scenario declarations', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    expect(scenarios.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S6']);
  });

  it('S1 卷宗阅卷 produces CaseFile, Timeline, and PartyGraph', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s1 = scenarios.find((s) => s.id === 'S1');
    expect(s1?.outputArtifacts).toEqual(['CaseFile', 'Timeline', 'PartyGraph']);
  });

  it('S1 卷宗阅卷 triggers on reading-view formats and OCR-gated formats alike', () => {
    // docs/41 拍板"S1 以阅读视图版运行"：office 生态原生格式（docx/md/txt）经
    // packages/reading-view 直接产出阅读视图；pdf/jpg/png 保留在触发范围内，
    // 但会经该包判定为 needs_ocr（禁用态声明），不是被排除在触发之外。
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s1 = scenarios.find((s) => s.id === 'S1');
    expect(s1?.trigger.fileTypes).toEqual(['docx', 'md', 'txt', 'pdf', 'jpg', 'png']);
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

  it('S6 卷宗整理 produces FileOpsPlan with plan confirmation gate and move-capable tools', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s6 = scenarios.find((s) => s.id === 'S6');
    expect(s6?.name).toBe('卷宗整理');
    expect(s6?.outputArtifacts).toEqual(['FileOpsPlan']);
    expect(s6?.confirmationGates[0]?.artifact).toBe('FileOpsPlan');
    expect(s6?.toolIds).toEqual(['copy-file', 'mkdir', 'file-ops-executor']);
    expect(s6?.trigger.userActions).toContain('drop-unsorted-files');
  });
});
