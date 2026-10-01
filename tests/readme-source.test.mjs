import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { renderReadme } from '../site/src/readme.mjs';

test('README.md equals the output of its generator source', async () => {
  const committed = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(
    committed === renderReadme(),
    'README.md differs from renderReadme() in site/src/readme.mjs. Edit site/src/readme.mjs, then run '
      + '`node site/build.mjs --write-readme`; do not hand-edit README.md.',
  );
});
