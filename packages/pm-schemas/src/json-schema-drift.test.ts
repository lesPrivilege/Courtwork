import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { toJSONSchemaRecord } from './export-json-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonSchemaDir = join(__dirname, '..', 'json-schema');

describe('PM JSON Schema export drift', () => {
  const record = toJSONSchemaRecord();

  it('只提交 descriptor 引用的四份 schema', () => {
    expect(Object.keys(record).sort()).toEqual([
      'ActionItems',
      'FeedbackDigest',
      'PrdReview',
      'PriorityScore',
    ]);
    expect(readdirSync(jsonSchemaDir).sort()).toEqual(
      Object.keys(record).map((name) => `${name}.schema.json`).sort(),
    );
  });

  for (const [name, generated] of Object.entries(record)) {
    it(`${name}.schema.json 与当前 Zod schema 一致且使用不可解引用 URN`, () => {
      const committed = JSON.parse(readFileSync(join(jsonSchemaDir, `${name}.schema.json`), 'utf-8'));
      expect(generated).toEqual(committed);
      expect((generated as { $schema?: string }).$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect((generated as { $id?: string }).$id).toBe(`urn:courtwork:schema:pm.${name}:v1`);
      expect(JSON.stringify(generated)).not.toMatch(/"\$ref":"(?!#)/);
    });
  }
});
