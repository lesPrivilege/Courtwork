// Exercise the actual fixed recipe files through the production sandboxed
// runner. The checkout is read-only to the child. No provider is configured.
// Run from the reviewed worktree: node <this-file>
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = process.cwd();
const { getCheckRecipe } = await import(pathToFileURL(path.join(root, 'app/runtime/check-recipes.mjs')));
const { runCheckRecipe } = await import(pathToFileURL(path.join(root, 'app/runtime/check-runner.mjs')));
const output = path.dirname(fileURLToPath(import.meta.url));
const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-integration-i1-'));
const summaries = [];
try {
  for (const id of ['node-test-attention-contract', 'node-test-harness-contract']) {
    const result = await runCheckRecipe({ recipe: getCheckRecipe(id), cwd: root, dataDir });
    await writeFile(path.join(output, id + '.stdout.log'), result.stdout);
    await writeFile(path.join(output, id + '.stderr.log'), result.stderr);
    const summary = {
      id, exitCode: result.exitCode, signal: result.signal,
      timedOut: result.timedOut, truncated: result.truncated,
      totals: result.stdout.split('\n').filter(line => /^(?:#|ℹ) (tests|pass|fail|skipped|cancelled) /.test(line)),
      listenDenied: /listen EPERM/.test(result.stdout + result.stderr),
      sandboxFailure: /sandbox_unavailable|sandbox_init:|sandbox did not start/.test(result.stdout + result.stderr),
    };
    summaries.push(summary);
    console.log(JSON.stringify(summary));
  }
  await writeFile(path.join(output, 'real-recipes.json'), JSON.stringify(summaries, null, 2) + '\n');
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
