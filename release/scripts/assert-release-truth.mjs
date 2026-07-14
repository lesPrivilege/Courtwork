import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRepositoryReleaseTruth } from './release-truth-lib.mjs';

const args = process.argv.slice(2);
const expectedIndex = args.indexOf('--expected');
const expectedVersion = expectedIndex >= 0 ? args[expectedIndex + 1] : undefined;
const requireSiteMatch = args.includes('--require-site-match');

if (expectedIndex >= 0 && !expectedVersion) {
  console.error('release-truth: --expected requires an x.y.z value');
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const result = validateRepositoryReleaseTruth(root, { expectedVersion, requireSiteMatch });
if (result.failures.length) {
  console.error(result.failures.map((failure) => `release-truth: ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`release-truth: PASS (app ${result.app.version}; site ${result.site.version}; ${result.site.sha256})`);
