// Publishing is intentionally deferred until the single merged-UI capture batch is complete.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { captureBatch, validateCaptureBatch } from '../src/capture-plan.mjs';
const media = JSON.parse(await readFile(new URL('../media/main/manifest.json', import.meta.url), 'utf8'));
validateCaptureBatch(media, { publish: true });
execFileSync('git', ['merge-base', '--is-ancestor', captureBatch.source_sha, 'main'], { cwd: new URL('../../', import.meta.url) });
console.log('Screenshot batch ready.');
