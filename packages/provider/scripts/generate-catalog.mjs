import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageRoot = resolve(import.meta.dirname, '..');
const sourcePath = resolve(packageRoot, 'catalog', 'deepseek.json');
const outputPath = resolve(packageRoot, 'src', 'catalog.generated.ts');
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));

function assertCatalog(value) {
  const paths = value?.paths;
  if (
    value?.id !== 'deepseek'
    || typeof value.label !== 'string'
    || !Array.isArray(value.models)
    || value.models.length === 0
    || !value.models.every((model) => typeof model === 'string' && model.length > 0)
    || typeof paths?.chat !== 'string'
    || typeof paths?.models !== 'string'
  ) throw new Error('deepseek catalog shape is invalid');
  const base = new URL(value.baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('deepseek catalog baseUrl must be a credential-free HTTPS URL');
  }
  for (const path of [paths.chat, paths.models]) {
    if (!path.startsWith('/') || path.includes('..') || path.includes('?') || path.includes('#')) {
      throw new Error(`deepseek catalog path is invalid: ${path}`);
    }
  }
}

assertCatalog(source);
const rendered = [
  '// Generated from catalog/deepseek.json by scripts/generate-catalog.mjs. Do not edit.',
  `export const DEEPSEEK_CATALOG = ${JSON.stringify(source, null, 2)} as const;`,
  '',
].join('\n');

if (process.argv.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== rendered) {
    throw new Error('catalog.generated.ts drifted from catalog/deepseek.json; run pnpm catalog:generate');
  }
} else {
  writeFileSync(outputPath, rendered);
}
