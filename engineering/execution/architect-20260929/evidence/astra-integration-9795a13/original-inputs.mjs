// Positive revalidation of the original review inputs at 5e11e01. All file contents are synthetic; no personal
// directory is inspected. Run with: node <this-file> <architect-worktree>/app
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const app = path.resolve(process.argv[2]);
const { evaluatePolicy } = await import(pathToFileURL(path.join(app, 'runtime/control-plane.mjs')));
const { createWsGrepTool } = await import(pathToFileURL(path.join(app, 'runtime/workspace-tools.mjs')));
const root = await mkdtemp(path.join(tmpdir(), 'cw-astra-review-'));
try {
  const workspace = path.join(root, 'workspace'), outside = path.join(root, 'outside');
  await mkdir(path.join(workspace, 'materials'), { recursive: true });
  await mkdir(outside);
  await writeFile(path.join(workspace, 'materials', 'open.txt'), 'SENTINEL inside');
  await writeFile(path.join(outside, 'open.txt'), 'SENTINEL synthetic outside');
  let swapped = false;
  const admitPath = () => {
    if (!swapped) {
      swapped = true;
      renameSync(path.join(workspace, 'materials'), path.join(workspace, 'saved'));
      symlinkSync(outside, path.join(workspace, 'materials'));
    }
    return 'allow';
  };
  const result = await createWsGrepTool({ workspaceDir: workspace, admitPath }).execute('review', { pattern: 'SENTINEL' });
  const leaked = result.details.matches.some(row => row.text === 'SENTINEL synthetic outside');
  console.log(JSON.stringify({ probe: 'parent-directory-swap', leaked, result: result.details }));
  assert.equal(leaked, false, 'original ancestor swap must no longer leak');

  await writeFile(path.join(root, 'Σ.txt'), 'SYNTHETIC SIGMA');
  let aliases = false;
  try { aliases = await readFile(path.join(root, 'ς.txt'), 'utf8') === 'SYNTHETIC SIGMA'; } catch {}
  for (const action of ['ws_read', 'repo_read', 'candidate_read']) {
    const layers = [{ scope: { type: 'user', id: 'local' }, rules: [{ action, resource: 'Σ.txt', effect: 'deny' }] }];
    const original = evaluatePolicy(layers, action, 'Σ.txt').effect;
    const alias = evaluatePolicy(layers, action, 'ς.txt').effect;
    console.log(JSON.stringify({ probe: 'unicode-alias', action, aliases, original, alias }));
    assert.equal(original, 'deny');
    assert.equal(alias, 'deny', 'original final-sigma alias must now be denied');
  }

  const rules = [
    { action: 'ws_read', resource: 'private.txt', effect: 'deny' },
    { action: 'ws_read', resource: 'PRIVATE.txt', effect: 'allow' },
  ];
  const collision = evaluatePolicy([{ scope: { type: 'user', id: 'local' }, rules }], 'ws_read', 'private.txt');
  console.log(JSON.stringify({ probe: 'canonical-rule-collision', ...collision }));
  assert.equal(collision.effect, 'deny', 'original lowercase collision request must stay denied');
} finally {
  await rm(root, { recursive: true, force: true });
}
