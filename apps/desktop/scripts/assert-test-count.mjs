import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list'], { encoding: 'utf8' });
if (result.status !== 0) {
  globalThis.process.stderr.write(result.stderr || result.stdout);
  globalThis.process.exit(result.status ?? 1);
}

const output = `${result.stdout}\n${result.stderr}`;
const match = output.match(/Total:\s+(\d+)\s+tests?/);
const count = match ? Number(match[1]) : 0;
const minimum = 26;
if (count < minimum) {
  throw new Error(`Playwright 用例不足：发现 ${count}，至少需要 ${minimum}`);
}
globalThis.process.stdout.write(`Playwright 假绿防护通过：${count} 条用例（下限 ${minimum}）\n`);
