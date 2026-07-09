import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { toJSONSchemaRecord } from './export-json-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonSchemaDir = join(__dirname, '..', 'json-schema');

describe('JSON Schema export drift', () => {
  const record = toJSONSchemaRecord();

  for (const [name, generated] of Object.entries(record)) {
    it(`${name}.schema.json matches the current zod definition`, () => {
      const committedRaw = readFileSync(join(jsonSchemaDir, `${name}.schema.json`), 'utf-8');
      const committed = JSON.parse(committedRaw);
      expect(generated).toEqual(committed);
    });
  }
});
