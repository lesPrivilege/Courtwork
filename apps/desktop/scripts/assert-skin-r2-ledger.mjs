import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { validateSignedR2Ledger } from './skin-r2-ledger-contract-lib.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..', '..');
const ledgerPath = path.join(repositoryRoot, 'docs', 'design', 'r2-tier-ledger.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const failures = validateSignedR2Ledger(ledger.entries);

if (failures.length > 0) {
  console.error(`SKIN-R2 signed ledger failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exit(1);
}

console.log('SKIN-R2 signed ledger passed');
