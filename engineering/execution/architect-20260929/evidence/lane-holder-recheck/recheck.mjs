// Author's recheck of every policy counterexample the independent reviews
// raised, with the corrected outcome asserted. Synthetic files only, under the
// system temporary directory. Run: node <this-file> <worktree>/app
// The traversal and file-identity counterexamples are asserted by
// app/tests/workspace-traversal-identity.test.mjs and
// app/tests/workspace-file-identity.test.mjs, which drive the production
// tools; the reviewer's traversal probe drove a worker protocol that no
// longer exists.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const app = path.resolve(process.argv[2]);
const { evaluatePolicy } = await import(pathToFileURL(path.join(app, 'runtime/control-plane.mjs')));
const { governTools } = await import(pathToFileURL(path.join(app, 'runtime/control-tools.mjs')));
const { createWsReadTool, createWsGrepTool } = await import(pathToFileURL(path.join(app, 'runtime/workspace-tools.mjs')));
const root = await realpath(await mkdtemp(path.join(tmpdir(), 'cw-lane-recheck-')));
const layer = rules => [{ scope: { type: 'user', id: 'local' }, rules }];
const FAMILIES = ['ws_read', 'repo_read', 'candidate_read'];
try {
  const workspace = path.join(root, 'workspace'), materials = path.join(workspace, 'materials');
  await mkdir(materials, { recursive: true });
  const cases = [
    { review: 'AR1', name: 'final sigma, exact name', file: 'Σ.txt', rules: [['materials/Σ.txt', 'deny']], spellings: ['materials/Σ.txt', 'materials/σ.txt', 'materials/ς.txt'], expected: 'deny' },
    { review: 'AR3', name: 'conflicting alias rules', file: 'private.txt', rules: [['materials/private.txt', 'deny'], ['materials/PRIVATE.txt', 'allow']], spellings: ['materials/private.txt', 'materials/PRIVATE.txt', 'MATERIALS/Private.TXT'], expected: 'deny' },
    { review: 're-review P1', name: 'wildcard beside sigma', file: 'aσx.txt', rules: [['materials/aσ*', 'deny']], spellings: ['materials/aσx.txt', 'materials/aςx.txt', 'materials/AΣX.TXT'], expected: 'deny' },
    { review: 'kept rule', name: 'ordinary last-match override', file: 'kept.txt', rules: [['*', 'deny'], ['materials/*', 'allow']], spellings: ['materials/kept.txt', 'MATERIALS/KEPT.TXT'], expected: 'allow' },
  ];
  for (const item of cases) {
    const text = 'SENTINEL ' + item.name;
    await writeFile(path.join(materials, item.file), text);
    const opens = [];
    for (const spelling of item.spellings) {
      let same = false;
      try { same = await readFile(path.join(workspace, spelling), 'utf8') === text; } catch {}
      opens.push(same);
    }
    for (const action of FAMILIES) {
      const policies = layer(item.rules.map(([resource, effect]) => ({ action, resource, effect })));
      const effects = item.spellings.map(spelling => evaluatePolicy(policies, action, spelling).effect);
      console.log(JSON.stringify({ review: item.review, probe: item.name, action, spellings: item.spellings, volumeOpensSameFile: opens, effects }));
      for (const effect of effects) assert.equal(effect, item.expected);
    }
    // The production wrapper and the real read, not only the evaluator.
    const policies = layer(item.rules.map(([resource, effect]) => ({ action: 'ws_read', resource, effect })));
    const binding = { resources: [{ id: 'tool:ws_read', kind: 'tool', action: 'ws_read', exposed: true }, { id: 'tool:ws_grep', kind: 'tool', action: 'ws_grep', exposed: true }], policies };
    const govern = tools => governTools(tools, { binding, permissionMode: 'draft', workspaceDir: workspace, requestPermission: async () => 'deny', isOpen: () => true });
    const [read] = govern([createWsReadTool({ workspaceDir: workspace })]);
    const outcomes = [];
    for (const [index, spelling] of item.spellings.entries()) {
      if (!opens[index]) { outcomes.push('not-an-alias-here'); continue; }
      const result = await read.execute('recheck', { path: spelling }).then(value => value.content.some(row => row.text.includes(text)) ? 'read' : 'no-text', error => /denied/.test(error.message) ? 'denied' : 'error: ' + error.message);
      outcomes.push(result);
      assert.equal(result, item.expected === 'deny' ? 'denied' : 'read');
    }
    console.log(JSON.stringify({ review: item.review, probe: item.name, boundary: 'governTools/ws_read', outcomes }));
  }
  // Aggregate: the denied files never appear in a search, the allowed one does.
  const policies = layer([
    { action: 'ws_read', resource: 'materials/Σ.txt', effect: 'deny' },
    { action: 'ws_read', resource: 'materials/private.txt', effect: 'deny' }, { action: 'ws_read', resource: 'materials/PRIVATE.txt', effect: 'allow' },
    { action: 'ws_read', resource: 'materials/aσ*', effect: 'deny' },
  ]);
  const binding = { policies, resources: [] };
  const { createPathAdmission } = await import(pathToFileURL(path.join(app, 'runtime/control-tools.mjs')));
  const grep = createWsGrepTool({ workspaceDir: workspace, admitPath: createPathAdmission({ binding, permissionMode: 'draft' }) });
  for (const scope of ['materials', 'MATERIALS']) {
    const found = await grep.execute('recheck', { pattern: 'SENTINEL', path: scope }).then(value => value.details, error => ({ error: error.message }));
    console.log(JSON.stringify({ probe: 'ws_grep over ' + scope, matches: found.matches?.map(row => row.path), excludedByPolicy: found.excludedByPolicy, error: found.error }));
    if (found.error && scope === 'MATERIALS') continue; // a volume that keeps case apart has no such directory
    assert.deepEqual(found.matches.map(row => row.path), ['materials/kept.txt']);
    assert.equal(found.excludedByPolicy, 3);
  }
  console.log(JSON.stringify({ result: 'every counterexample gives the corrected outcome' }));
} finally {
  await rm(root, { recursive: true, force: true });
}
