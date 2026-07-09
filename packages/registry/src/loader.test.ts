import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseScenarioYaml,
  loadScenarioFile,
  loadScenariosFromDir,
  ScenarioValidationError,
} from './loader.js';

const VALID_YAML = `
id: S-test
name: 测试场景
trigger:
  fileTypes: [pdf]
  userActions: []
  classifierTags: []
inputArtifacts: []
toolIds: []
outputArtifacts: [RiskList]
uiTemplateId: test-panel
confirmationGates:
  - label: 确认测试产物
promptTemplateRef: test-v0
`;

describe('parseScenarioYaml', () => {
  it('parses a well-formed scenario declaration', () => {
    const scenario = parseScenarioYaml(VALID_YAML, 'inline-valid');
    expect(scenario.id).toBe('S-test');
    expect(scenario.outputArtifacts).toEqual(['RiskList']);
  });

  it('throws ScenarioValidationError naming the source label and the missing field', () => {
    const badYaml = VALID_YAML.replace('uiTemplateId: test-panel\n', '');
    expect(() => parseScenarioYaml(badYaml, 'inline-missing-ui-template')).toThrow(ScenarioValidationError);
    expect(() => parseScenarioYaml(badYaml, 'inline-missing-ui-template')).toThrow('inline-missing-ui-template');
    expect(() => parseScenarioYaml(badYaml, 'inline-missing-ui-template')).toThrow(/uiTemplateId/);
  });

  it('throws naming the field when outputArtifacts references an unknown artifact type', () => {
    const badYaml = VALID_YAML.replace('outputArtifacts: [RiskList]', 'outputArtifacts: [ContradictionList]');
    expect(() => parseScenarioYaml(badYaml, 'inline-unknown-artifact')).toThrow(/outputArtifacts/);
  });

  it('throws a clear error on malformed YAML syntax', () => {
    const brokenYaml = 'id: S-test\noutputArtifacts: [RiskList\n';
    expect(() => parseScenarioYaml(brokenYaml, 'inline-broken-syntax')).toThrow(ScenarioValidationError);
    expect(() => parseScenarioYaml(brokenYaml, 'inline-broken-syntax')).toThrow('inline-broken-syntax');
  });

  it('throws naming the source label and the unknown key on a top-level typo (W2.1: strict declaration loading)', () => {
    const badYaml = VALID_YAML.replace('uiTemplateId: test-panel\n', 'uiTemplateId: test-panel\nuiTemplatId: test-panel\n');
    expect(() => parseScenarioYaml(badYaml, 'scenarios/S-typo.yaml')).toThrow(ScenarioValidationError);
    expect(() => parseScenarioYaml(badYaml, 'scenarios/S-typo.yaml')).toThrow('scenarios/S-typo.yaml');
    expect(() => parseScenarioYaml(badYaml, 'scenarios/S-typo.yaml')).toThrow(/uiTemplatId/);
  });

  it('throws naming the unknown key on a typo nested inside trigger (W2.1)', () => {
    const badYaml = VALID_YAML.replace('fileTypes: [pdf]', 'fileTypes: [pdf]\n  fileTyps: [pdf]');
    expect(() => parseScenarioYaml(badYaml, 'scenarios/S-trigger-typo.yaml')).toThrow(/fileTyps/);
  });

  it('throws naming the unknown key on a typo nested inside a confirmationGates entry (W2.1)', () => {
    const badYaml = VALID_YAML.replace('- label: 确认测试产物', '- label: 确认测试产物\n    artfact: RiskList');
    expect(() => parseScenarioYaml(badYaml, 'scenarios/S-gate-typo.yaml')).toThrow(/artfact/);
  });

  it('still strips unrelated whitespace-only differences and accepts a well-formed declaration under strict mode', () => {
    expect(() => parseScenarioYaml(VALID_YAML, 'inline-valid-strict-sanity')).not.toThrow();
  });
});

describe('loadScenarioFile / loadScenariosFromDir', () => {
  it('loads a single valid scenario file from disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'registry-loader-'));
    const filePath = join(dir, 'S-test.yaml');
    writeFileSync(filePath, VALID_YAML, 'utf-8');
    try {
      const scenario = loadScenarioFile(filePath);
      expect(scenario.id).toBe('S-test');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loads all yaml files in a directory, sorted by filename', () => {
    const dir = mkdtempSync(join(tmpdir(), 'registry-loader-'));
    try {
      writeFileSync(join(dir, 'b.yaml'), VALID_YAML.replace('S-test', 'S-b'), 'utf-8');
      writeFileSync(join(dir, 'a.yaml'), VALID_YAML.replace('S-test', 'S-a'), 'utf-8');
      writeFileSync(join(dir, 'notes.txt'), 'ignore me', 'utf-8');
      const scenarios = loadScenariosFromDir(dir);
      expect(scenarios.map((s) => s.id)).toEqual(['S-a', 'S-b']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails fast on the first invalid file in a directory, naming the file in the error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'registry-loader-'));
    try {
      writeFileSync(join(dir, 'a-good.yaml'), VALID_YAML.replace('S-test', 'S-a'), 'utf-8');
      writeFileSync(
        join(dir, 'b-bad.yaml'),
        VALID_YAML.replace('S-test', 'S-b').replace(
          'confirmationGates:\n  - label: 确认测试产物\n',
          'confirmationGates: []\n',
        ),
        'utf-8',
      );
      expect(() => loadScenariosFromDir(dir)).toThrow(/b-bad\.yaml/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when two scenario files declare the same id', () => {
    const dir = mkdtempSync(join(tmpdir(), 'registry-loader-'));
    try {
      writeFileSync(join(dir, 'a.yaml'), VALID_YAML, 'utf-8');
      writeFileSync(join(dir, 'b.yaml'), VALID_YAML, 'utf-8');
      expect(() => loadScenariosFromDir(dir)).toThrow('S-test');
      expect(() => loadScenariosFromDir(dir)).toThrow('重复');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
