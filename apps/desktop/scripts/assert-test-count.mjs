import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list'], { encoding: 'utf8' });
if (result.status !== 0) {
  globalThis.process.stderr.write(result.stderr || result.stdout);
  globalThis.process.exit(result.status ?? 1);
}

const output = `${result.stdout}\n${result.stderr}`;
const match = output.match(/Total:\s+(\d+)\s+tests?/);
const count = match ? Number(match[1]) : 0;
// GOAL-1：+goal1 用例；floor 只升（禁降史 …→146→152→160→167→169→171→172→173→176→181→182→183→185，……chrome 装卡内 +1、三栏对齐+打字机 +2、双侧收拢磁吸 +1）。
const minimum = 208;
if (count < minimum) {
  throw new Error(`Playwright 用例不足：发现 ${count}，至少需要 ${minimum}`);
}
globalThis.process.stdout.write(`Playwright 假绿防护通过：${count} 条用例（下限 ${minimum}）\n`);
