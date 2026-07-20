import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { validateLedgerTargets, validateSignedR2Ledger } from './skin-r2-ledger-contract-lib.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..', '..');
const ledgerPath = path.join(repositoryRoot, 'docs', 'design', 'r2-tier-ledger.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const atRoot = (file) => path.join(repositoryRoot, file);
const failures = [
  ...validateSignedR2Ledger(ledger.entries),
  ...validateLedgerTargets(ledger.entries, {
    exists: (file) => fs.existsSync(atRoot(file)),
    isDirectory: (file) => fs.statSync(atRoot(file)).isDirectory(),
    readText: (file) => fs.readFileSync(atRoot(file), 'utf8'),
  }),
];

if (failures.length > 0) {
  console.error(`SKIN-R2 signed ledger failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exit(1);
}

console.log('SKIN-R2 signed ledger passed');
