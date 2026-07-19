import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { validateSchemaExemplarContract } from './schema-exemplar-contract-lib.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..', '..');
const designRoot = path.join(repositoryRoot, 'docs', 'design');
const manifestPath = path.join(designRoot, 'schema-exemplar.sources.json');
const exemplarPath = path.join(designRoot, 'schema-exemplar.md');
const ledgerPath = path.join(designRoot, 'r2-tier-ledger.json');

const failures = [];
for (const required of [manifestPath, exemplarPath, ledgerPath]) {
  if (!fs.existsSync(required)) failures.push(`必需文件缺失：${path.relative(repositoryRoot, required)}`);
}

if (failures.length === 0) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const tierLedgerFile = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const sourceTexts = new Map();
  for (const source of manifest.sources ?? []) {
    const target = path.resolve(repositoryRoot, source.path ?? '');
    if (target !== repositoryRoot && target.startsWith(`${repositoryRoot}${path.sep}`) && fs.existsSync(target)) {
      sourceTexts.set(source.path, fs.readFileSync(target, 'utf8'));
    }
  }
  failures.push(...validateSchemaExemplarContract({
    exemplar: fs.readFileSync(exemplarPath, 'utf8'),
    manifest,
    tierLedger: tierLedgerFile.entries,
    sourceTexts,
  }));
}

if (failures.length > 0) {
  console.error(`SCHEMA-EXEMPLAR contracts failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exit(1);
}

console.log('SCHEMA-EXEMPLAR contracts passed');
