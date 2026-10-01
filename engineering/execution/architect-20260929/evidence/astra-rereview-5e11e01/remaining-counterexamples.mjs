// Independent synthetic counterexamples at 5e11e01. Assertions pin defects,
// not desired behavior. Run: node <this-file> <architect-worktree>/app
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const app = path.resolve(process.argv[2]);
const { evaluatePolicy, foldPathAliases } = await import(pathToFileURL(path.join(app, 'runtime/control-plane.mjs')));
const { governTools } = await import(pathToFileURL(path.join(app, 'runtime/control-tools.mjs')));
const { createWsReadTool } = await import(pathToFileURL(path.join(app, 'runtime/workspace-tools.mjs')));
const root = await realpath(await mkdtemp(path.join(tmpdir(), 'cw-ar-rereview-')));
let worker;
const layer = rules => [{ scope: { type: 'user', id: 'local' }, rules }];
try {
  const workspace = path.join(root, 'workspace'), materials = path.join(workspace, 'materials');
  await mkdir(materials, { recursive: true });
  await writeFile(path.join(materials, 'aσx.txt'), 'SENTINEL wildcard');
  await writeFile(path.join(materials, 'private.txt'), 'SENTINEL collision');
  const cases = [
    { name: 'wildcard-context', rules: [['materials/aσ*', 'deny']], denied: 'materials/aσx.txt', alias: 'materials/aςx.txt', text: 'SENTINEL wildcard' },
    { name: 'collision-alias', rules: [['materials/private.txt', 'deny'], ['materials/PRIVATE.txt', 'allow']], denied: 'materials/private.txt', alias: 'materials/PRIVATE.txt', text: 'SENTINEL collision' },
  ];
  for (const item of cases) {
    const aliases = await readFile(path.join(workspace, item.alias), 'utf8') === item.text;
    assert.ok(aliases, 'this volume must demonstrate the actual filesystem alias');
    for (const action of ['ws_read', 'repo_read', 'candidate_read']) {
      const policies = layer(item.rules.map(([resource, effect]) => ({ action, resource, effect })));
      const direct = evaluatePolicy(policies, action, item.denied).effect;
      const alias = evaluatePolicy(policies, action, item.alias).effect;
      console.log(JSON.stringify({ probe: item.name, action, direct, alias, aliases, foldedPattern: foldPathAliases(item.rules[0][0]), foldedResource: foldPathAliases(item.alias) }));
      assert.equal(direct, 'deny');
      assert.equal(alias, 'allow', 'counterexample changed; reassess review');
    }
    // Real production ws_read wrapper and policy admission, not only evaluator.
    const policies = layer(item.rules.map(([resource, effect]) => ({ action: 'ws_read', resource, effect })));
    const binding = { resources: [{ id: 'tool:ws_read', kind: 'tool', action: 'ws_read', exposed: true }], policies };
    const [tool] = governTools([createWsReadTool({ workspaceDir: workspace })], {
      binding, permissionMode: 'draft', workspaceDir: workspace,
      requestPermission: async () => 'deny', isOpen: () => true,
    });
    await assert.rejects(tool.execute('denied', { path: item.denied }), /denied/);
    const result = await tool.execute('aliased', { path: item.alias });
    assert.ok(result.content.some(row => row.text.includes(item.text)));
    console.log(JSON.stringify({ probe: item.name, boundary: 'governTools/ws_read', leakedSyntheticText: true }));
  }

  const traverse = path.join(root, 'traversal'), directory = path.join(traverse, 'materials'), outside = path.join(root, 'outside');
  await mkdir(directory, { recursive: true });
  await mkdir(outside);
  await writeFile(path.join(directory, 'open.txt'), 'SENTINEL inside');
  await writeFile(path.join(outside, 'open.txt'), 'SENTINEL synthetic outside');
  const preload = path.join(root, 'worker-barrier.mjs');
  // Deterministic scheduling only: retain the genuine lstat result and perform
  // the filesystem swap before the production worker's next opendir. No stats,
  // file descriptors or matches are fabricated. Host admission uses allow-all.
  await writeFile(preload, `import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
const original = fs.lstat; let swapped = false;
fs.lstat = async function(file, ...args) {
  const info = await original.call(this, file, ...args);
  if (!swapped && String(file) === ${JSON.stringify(directory)} && info.isDirectory()) {
    swapped = true;
    await fs.rename(${JSON.stringify(directory)}, ${JSON.stringify(directory + '.saved')});
    await fs.symlink(${JSON.stringify(outside)}, ${JSON.stringify(directory)});
  }
  return info;
};
syncBuiltinESMExports();`);
  worker = new Worker(pathToFileURL(path.join(app, 'runtime/grep-worker.mjs')), {
    execArgv: ['--import', pathToFileURL(preload).href],
    workerData: { workspaceReal: traverse, searchPath: traverse, pattern: 'SENTINEL', maxReadBytes: 65536, maxResults: 100 },
  });
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker timeout')), 5000);
    worker.on('error', error => { clearTimeout(timer); reject(error); });
    worker.on('message', message => {
      if (message.files) worker.postMessage({ admitted: message.files.map(() => true) });
      else { clearTimeout(timer); resolve(message); }
    });
  });
  console.log(JSON.stringify({ probe: 'ancestor-swap-during-traversal', ...result }));
  assert.ok(result.matches.some(row => row.text === 'SENTINEL synthetic outside'), 'counterexample changed; reassess review');
} finally {
  await worker?.terminate();
  await rm(root, { recursive: true, force: true });
}
