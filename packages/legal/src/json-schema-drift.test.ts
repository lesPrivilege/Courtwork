import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoRemoteSchemaRefs } from '@courtwork/registry';
import { describe, expect, it } from 'vitest';
import { toJSONSchemaRecord } from './export-json-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonSchemaDir = join(__dirname, '..', 'json-schema');

describe('JSON Schema export drift', () => {
  const record = toJSONSchemaRecord();

  it('只提交 descriptor 引用的八份 schema，不留残余旧文件', () => {
    expect(Object.keys(record).sort()).toEqual([
      'CaseFile',
      'FileOpsPlan',
      'PartyGraph',
      'ReviewMatrix',
      'RevisionInstructionSet',
      'RiskList',
      'RiskListDraft',
      'Timeline',
    ]);
    expect(readdirSync(jsonSchemaDir).sort()).toEqual(
      Object.keys(record).map((name) => `${name}.schema.json`).sort(),
    );
  });

  for (const [name, generated] of Object.entries(record)) {
    it(`${name}.schema.json 与当前 Zod、Draft 2020-12 和不可解引用 URN 一致`, () => {
      const committedRaw = readFileSync(join(jsonSchemaDir, `${name}.schema.json`), 'utf-8');
      const committed = JSON.parse(committedRaw);
      expect(() => assertNoRemoteSchemaRefs(committed)).not.toThrow();
      expect(generated).toEqual(committed);
      expect((committed as { $schema?: string }).$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect((committed as { $id?: string }).$id).toBe(`urn:courtwork:schema:legal.${name}:v1`);
    });
  }
});
