// Derives app/docs/dependency-ledger.json from app/package-lock.json.
// Default: compare and exit non-zero on difference without writing. --write: write the ledger.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
export const lockPath = `${appRoot}package-lock.json`;
export const ledgerPath = `${appRoot}docs/dependency-ledger.json`;

export function buildLedger(lockText) {
  const lock = JSON.parse(lockText);
  const packages = Object.entries(lock.packages)
    .filter(([path]) => path !== '')
    .map(([path, entry]) => ({
      path,
      name: entry.name || path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length),
      version: entry.version,
      license: entry.license,
      optional: !!entry.optional,
      integrity: entry.integrity ?? null,
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return `${JSON.stringify({
    source: 'package-lock.json metadata; includes platform-optional dependencies',
    lockfileSha256: createHash('sha256').update(lockText).digest('hex'),
    packages,
  }, null, 2)}\n`;
}

export async function checkLedger({ write = false } = {}) {
  const generated = buildLedger(await readFile(lockPath, 'utf8'));
  const current = await readFile(ledgerPath, 'utf8').catch(() => null);
  if (current === generated) return { packages: JSON.parse(generated).packages.length, written: false };
  if (!write) throw new Error('app/docs/dependency-ledger.json differs from app/package-lock.json. Run: node app/scripts/dependency-ledger.mjs --write');
  await writeFile(ledgerPath, generated);
  return { packages: JSON.parse(generated).packages.length, written: true };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await checkLedger({ write: process.argv.includes('--write') })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
