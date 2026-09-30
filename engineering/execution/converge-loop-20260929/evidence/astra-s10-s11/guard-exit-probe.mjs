// Reproduce the S11 handoff counterexample using only this script's processes
// and temporary directory. Run: node <this-file> <delivery-worktree>/app
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = await mkdtemp(path.join(tmpdir(), 'cw-guard-review-'));
const pidFile = path.join(root, 'pids');
const runner = pathToFileURL(path.resolve(process.argv[2], 'runtime/check-runner.mjs')).href;
// Noninteractive sh leaves sleep in the check's group. Inherited stdout keeps
// the runner awaiting close after both the recipe leader and guard have exited.
const script = 'sleep 15 &\necho "$$ $PPID $!" > "$1"\nexit 0';
const hostSource = `import {runCheckRecipe} from ${JSON.stringify(runner)};
runCheckRecipe({recipe:{command:'/bin/sh',argv:['-c',${JSON.stringify(script)},'sh',${JSON.stringify(pidFile)}],timeoutMs:30000,outputLimitBytes:1000},cwd:${JSON.stringify(root)}}).then(r=>console.log('SETTLED',JSON.stringify(r)));
setInterval(()=>{},1000);`;
const host = spawn(process.execPath, ['--input-type=module', '-e', hostSource], { stdio: ['ignore', 'pipe', 'pipe'] });
let output = '', descendant, guard, leader;
host.stdout.on('data', data => output += data);
host.stderr.on('data', data => output += data);
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  for (let i = 0; i < 200; i++) {
    const text = await readFile(pidFile, 'utf8').catch(() => '');
    if (/^\d+ \d+ \d+\s*$/.test(text)) {
      [leader, guard, descendant] = text.trim().split(' ').map(Number);
      break;
    }
    await delay(10);
  }
  assert.ok(descendant, 'synthetic recipe did not announce its processes: ' + output);
  for (let i = 0; i < 200 && (alive(leader) || alive(guard)); i++) await delay(10);
  const pgid = Number(execFileSync('/bin/ps', ['-o', 'pgid=', '-p', String(descendant)], { encoding: 'utf8' }).trim());
  const before = { leaderAlive: alive(leader), guardAlive: alive(guard), descendantAlive: alive(descendant), settled: output.includes('SETTLED'), sameCheckGroup: pgid === guard };
  const exited = new Promise(resolve => host.once('exit', resolve));
  host.kill('SIGKILL');
  await exited;
  await delay(300);
  const after = { descendantAlive: alive(descendant) };
  console.log(JSON.stringify({ beforeHostCrash: before, afterHostCrash: after, output }));
  // These assertions pin the observed defect, not correct product behavior.
  assert.deepEqual(before, { leaderAlive: false, guardAlive: false, descendantAlive: true, settled: false, sameCheckGroup: true });
  assert.equal(after.descendantAlive, true, 'counterexample changed; reassess the review');
} finally {
  for (const pid of [descendant, leader, guard]) if (pid && alive(pid)) {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
  if (host.exitCode === null && host.signalCode === null) {
    const exited = new Promise(resolve => host.once('exit', resolve));
    host.kill('SIGKILL');
    await exited;
  }
  if (descendant) for (let i = 0; i < 100 && alive(descendant); i++) await delay(10);
  await rm(root, { recursive: true, force: true });
  assert.ok(!descendant || !alive(descendant), 'synthetic descendant cleanup did not complete');
}
