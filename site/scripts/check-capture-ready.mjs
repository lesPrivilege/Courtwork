// Empty capture slots require explicit approval on a manual Pages dispatch.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { captureBatch, validateCaptureBatch } from '../src/capture-plan.mjs';
const media = JSON.parse(await readFile(new URL('../media/main/manifest.json', import.meta.url), 'utf8'));
const allowPending = process.env.ALLOW_PENDING_CAPTURES === 'true';
if (captureBatch.status === 'pending' && allowPending) {
  validateCaptureBatch(media);
  console.log('Publishing approved layout with empty capture slots; capture batch remains pending.');
  process.exit(0);
}
validateCaptureBatch(media, { publish: true });
execFileSync('git', ['merge-base', '--is-ancestor', captureBatch.source_sha, 'main'], { cwd: new URL('../../', import.meta.url) });
console.log('Screenshot batch ready.');
