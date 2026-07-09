import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toJSONSchemaRecord } from '../src/export-json-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'json-schema');

mkdirSync(outDir, { recursive: true });

const record = toJSONSchemaRecord();
for (const [name, schema] of Object.entries(record)) {
  const filePath = join(outDir, `${name}.schema.json`);
  writeFileSync(filePath, `${JSON.stringify(schema, null, 2)}\n`, 'utf-8');
  console.log(`wrote ${filePath}`);
}
