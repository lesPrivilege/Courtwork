import { createHash } from 'node:crypto';

export const FIXTURE_IDENTITY = Object.freeze({ provider: 'courtwork-async-loop-fixture', version: '1' });
export function sha256Utf8(content) { return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`; }
function document(id, title, content) { return Object.freeze({ id, title, version: '1', content, digest: sha256Utf8(content) }); }
export const DOCUMENTS = Object.freeze({
  A: document('document-A', 'Synthetic document A', 'Courtwork fixture document A.\n'),
  B: document('document-B', 'Synthetic document B', 'Courtwork fixture document B.\n'),
});
export function fixtureInput(jobId) {
  const content = `Courtwork fixture input for ${jobId}.\n`;
  return Object.freeze({ version: '1', content, digest: sha256Utf8(content) });
}
