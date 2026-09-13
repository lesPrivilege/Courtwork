import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { historicalFixtures } from '../tests/fixtures/historical/manifest.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const failures = [];
let checked = 0;
for (const [name, fixture] of Object.entries(historicalFixtures)) {
  for (const object of [`${fixture.commit}^{commit}`, ...fixture.files.map(file => `${fixture.commit}:app/${file}`)]) {
    const result = spawnSync('git', ['cat-file', '-e', object], { cwd: repoRoot, encoding: 'utf8' });
    if (result.error || result.status !== 0) failures.push(`${name}: missing ${object}`);
    checked++;
  }
}
const root = new URL('../tests/fixtures/historical/schema3/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
for (const [file, expected] of Object.entries(manifest.files)) {
  try {
    const actual = createHash('sha256').update(await readFile(new URL(file, root))).digest('hex');
    if (actual !== expected) failures.push(`schema3: frozen bytes changed for ${file}`);
  } catch (error) { failures.push(`schema3: ${file}: ${error.code ?? error.message}`); }
  checked++;
}
if (failures.length) {
  console.error('Historical test inputs unavailable. Use a full-history clone (or git fetch --unshallow) and preserve the committed schema3 fixture. No tests were skipped.');
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Historical test inputs verified: ${checked} commit/path/hash checks.`);
