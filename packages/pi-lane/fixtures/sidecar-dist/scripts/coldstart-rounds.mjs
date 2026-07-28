/**
 * PI-SIDECAR-DIST-1 · 冷启动稳定性：三轮独立取样。
 *
 * 为什么单独一支：`measure.mjs` 每枚产物只取一轮，本票实测到该读数**会被机器负载带偏**——
 * 同一枚 `b/x86_64/code-cache` 在两轮全量实测里给出 111 ms 与 219 ms（后者 max 372 ms）。
 * 一轮读数撑不起路线比较，故冷启动结论一律取本脚本的三轮中位数与轮间跨度；
 * 跨度大的行按噪声处理，不当作路线差。
 *
 * 用法：`node scripts/coldstart-rounds.mjs [--rounds N] [--samples N]`
 * 结果写 `dist/coldstart-rounds.json`；跑时须让机器空闲，否则如实记负载。
 */

import fs from 'node:fs';
import path from 'node:path';

import { DIST_DIR, SIDECAR_BASENAME, median, round, spawnNdjson } from './lib/toolkit.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = argv.indexOf(name);
  return index >= 0 ? Number(argv[index + 1]) : fallback;
};
const ROUNDS = flag('--rounds', 3);
const SAMPLES = flag('--samples', 25);
const WARMUP = 3;

/** 只测能启动的产物；不启动的那档由 `measure.mjs` 的 launchProbe 留红证，不在这里重复。 */
const SUBJECTS = [
  ['a/aarch64/esm-createrequire', 'route-a', 'aarch64-apple-darwin--esm-createrequire', 'aarch64-apple-darwin', 'sidecar.mjs'],
  ['a/aarch64/cjs', 'route-a', 'aarch64-apple-darwin--cjs', 'aarch64-apple-darwin', 'sidecar.cjs'],
  ['b/aarch64/default', 'route-b', 'aarch64-apple-darwin--default', 'aarch64-apple-darwin', null],
  ['b/aarch64/code-cache', 'route-b', 'aarch64-apple-darwin--code-cache', 'aarch64-apple-darwin', null],
  ['a/x86_64/esm-createrequire', 'route-a', 'x86_64-apple-darwin--esm-createrequire', 'x86_64-apple-darwin', 'sidecar.mjs'],
  ['a/x86_64/cjs', 'route-a', 'x86_64-apple-darwin--cjs', 'x86_64-apple-darwin', 'sidecar.cjs'],
  ['b/x86_64/default', 'route-b', 'x86_64-apple-darwin--default', 'x86_64-apple-darwin', null],
  ['b/x86_64/code-cache', 'route-b', 'x86_64-apple-darwin--code-cache', 'x86_64-apple-darwin', null],
];

const rounds = {};

for (let index = 1; index <= ROUNDS; index += 1) {
  for (const [id, route, dirName, triple, bundle] of SUBJECTS) {
    const dir = path.join(DIST_DIR, route, dirName);
    const executable = path.join(dir, `${SIDECAR_BASENAME}-${triple}`);
    if (!fs.existsSync(executable)) continue;
    const args = bundle ? [path.join(dir, bundle)] : [];

    const samples = [];
    let failed = null;
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      const started = process.hrtime.bigint();
      const proc = spawnNdjson(executable, args);
      const ready = await proc.waitFor((packet) => packet.op === 'ready', 30_000);
      const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
      if (!ready) {
        proc.child.kill('SIGKILL');
        failed = { atSample: sample, stderrTail: proc.stderr().split('\n').filter(Boolean).slice(-2) };
        break;
      }
      proc.child.stdin.end();
      await proc.exited;
      if (sample >= WARMUP) samples.push(elapsed);
    }

    rounds[id] ??= [];
    rounds[id].push(
      failed
        ? { round: index, failed }
        : { round: index, medianMs: round(median(samples)), minMs: round(Math.min(...samples)), samples: samples.length },
    );
  }
  process.stderr.write(`轮 ${index}/${ROUNDS} 完\n`);
}

const summary = Object.entries(rounds).map(([id, list]) => {
  const medians = list.filter((entry) => entry.medianMs !== undefined).map((entry) => entry.medianMs);
  if (medians.length === 0) return { id, status: 'failed', rounds: list };
  const low = Math.min(...medians);
  return {
    id,
    status: 'ok',
    roundMedians: medians,
    // 轮间中位数的中位数：单轮被负载带偏时不至于整条结论跟着偏。
    medianOfMediansMs: round(median(medians)),
    bestMs: Math.min(...list.map((entry) => entry.minMs ?? Infinity)),
    spreadPercent: round(((Math.max(...medians) - low) / low) * 100),
  };
});

fs.writeFileSync(
  path.join(DIST_DIR, 'coldstart-rounds.json'),
  `${JSON.stringify({ rounds: ROUNDS, samples: SAMPLES, warmupDropped: WARMUP, detail: rounds, summary }, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
