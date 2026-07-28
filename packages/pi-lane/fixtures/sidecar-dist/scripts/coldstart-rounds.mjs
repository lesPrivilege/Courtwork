/**
 * PI-SIDECAR-DIST-1R · 冷启动：固定八候选 × 三轮 × 每轮 25 样本（丢 3 热身），逐轮随机化。
 *
 * 为什么必须三轮：单轮读数会被机器负载带偏——本票失败记录三实测到同一枚
 * `b/x86_64/code-cache` 在两次全量实测里给出 111 ms 与 219 ms。一轮读数撑不起任何比较。
 *
 * 为什么必须逐轮随机化取样次序：固定次序会把「机器越跑越热 / 页缓存越来越暖」
 * 系统性地送给排在后面的候选。打乱后把这份漂移摊平，并把每轮实际次序写进读数备查。
 *
 * 与 `70e6482` 的差别（`9b8142f` 拒绝理由第一条同源）：原件的 subject 表是**另抄一份**的
 * 短 id 清单，产物缺失时 `continue` 静默跳过，`--rounds 1` 也照跑照报。现在候选来自
 * 库存闭集，轮数/样本数/身份/EOF 全部经 `verdictColdstart` 判，少一样就非零。
 *
 * **本件只报同机数字，不设任何路线胜负阈值。** 快慢由架构在裁路线时自行权衡。
 *
 * 用法：`node scripts/coldstart-rounds.mjs [--rounds N] [--samples N]`
 * 结果写 `dist/coldstart-rounds.json`；跑时机器须空闲，否则读数不可用。
 */

import fs from 'node:fs';
import path from 'node:path';

import { COLDSTART_SHAPE, NODE_VERSION, conclude, verdictColdstart } from './lib/probe-verdict.mjs';
import {
  DIST_DIR,
  RUNTIME_DIR,
  ensureDir,
  median,
  resolveInventory,
  round,
  run,
  shuffled,
  spawnNdjson,
} from './lib/toolkit.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = argv.indexOf(name);
  return index >= 0 ? Number(argv[index + 1]) : fallback;
};
const ROUNDS = flag('--rounds', COLDSTART_SHAPE.rounds);
const SAMPLES = flag('--samples', COLDSTART_SHAPE.samples);
const WARMUP = flag('--warmup', COLDSTART_SHAPE.warmup);

/** 只测八候选。两枚 `esm-naive` 负控起不来，冷启对它们无定义——由 measure 判其失败。 */
const SUBJECTS = resolveInventory().filter((entry) => entry.role === 'candidate');

/** 裸 runtime 基线：把「Node 自身启动」与「pi 模块图载入」分开，否则冷启读数无从归因。 */
function runtimeBaseline(nodeArch) {
  const binary = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-${nodeArch}`, 'bin', 'node');
  if (!fs.existsSync(binary)) return { status: 'blocked', reason: 'runtime-missing' };
  const samples = [];
  for (let index = 0; index < SAMPLES; index += 1) {
    const started = process.hrtime.bigint();
    const result = run(binary, ['-e', 'process.stdout.write("x")']);
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    if (result.status !== 0) return { status: 'failed', exit: result.status, stderr: result.stderr.slice(0, 400) };
    if (index >= WARMUP) samples.push(elapsed);
  }
  return { status: 'ok', samples: samples.length, medianMs: round(median(samples)), minMs: round(Math.min(...samples)) };
}

/** 一枚产物的一轮：外部计时 `spawn` → 读到 `ready` 行，即宿主等待可服务的真实时长。 */
async function sampleRound(artifact, roundNumber) {
  const external = [];
  let identity = null;
  let identityDrift = null;
  let eofClean = true;

  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const started = process.hrtime.bigint();
    const proc = spawnNdjson(artifact.command, artifact.args);
    const ready = await proc.waitFor((packet) => packet.op === 'ready', 30_000);
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    if (!ready) {
      proc.child.kill('SIGKILL');
      await proc.exited;
      return {
        round: roundNumber,
        failed: { atSample: sample, stderrTail: proc.stderr().split('\n').filter(Boolean).slice(-2) },
      };
    }
    const seen = { node: ready.node, arch: ready.arch, sea: ready.sea };
    identity ??= seen;
    if (identityDrift === null && JSON.stringify(seen) !== JSON.stringify(identity)) {
      identityDrift = { atSample: sample, seen };
    }
    proc.child.stdin.end();
    const exit = await proc.exited;
    if (exit.code !== 0 || exit.signal !== null) eofClean = false;
    if (sample >= WARMUP) external.push(elapsed);
  }

  return {
    round: roundNumber,
    keptSamples: external.length,
    identity: identityDrift ? identityDrift.seen : identity,
    identityDrift,
    eofClean,
    medianMs: round(median(external)),
    minMs: round(Math.min(...external)),
    maxMs: round(Math.max(...external)),
  };
}

const orders = [];
const perSubject = new Map(SUBJECTS.map((subject) => [subject.id, []]));

for (let roundNumber = 1; roundNumber <= ROUNDS; roundNumber += 1) {
  const order = shuffled(SUBJECTS);
  orders.push(order.map((subject) => subject.id));
  for (const subject of order) {
    perSubject.get(subject.id).push(await sampleRound(subject, roundNumber));
  }
  process.stderr.write(`轮 ${roundNumber}/${ROUNDS} 完\n`);
}

const observation = {
  shape: { rounds: ROUNDS, samples: SAMPLES, warmup: WARMUP },
  orders,
  subjects: SUBJECTS.map((subject) => ({ id: subject.id, rounds: perSubject.get(subject.id) })),
};

const summary = observation.subjects.map(({ id, rounds }) => {
  const medians = rounds.filter((entry) => entry.medianMs !== undefined).map((entry) => entry.medianMs);
  if (medians.length === 0) return { id, status: 'failed', rounds };
  const low = Math.min(...medians);
  return {
    id,
    roundMedians: medians,
    // 轮间中位数的中位数：单轮被负载带偏时不至于整条结论跟着偏。
    medianOfMediansMs: round(median(medians)),
    bestMs: Math.min(...rounds.map((entry) => entry.minMs ?? Infinity)),
    spreadPercent: round(((Math.max(...medians) - low) / low) * 100),
  };
});

const verdict = conclude(verdictColdstart(observation), {
  probe: 'coldstart-rounds',
  note: '同机数字，不设路线胜负阈值',
  runtimeBaseline: {
    'aarch64-apple-darwin': runtimeBaseline('arm64'),
    'x86_64-apple-darwin': runtimeBaseline('x64'),
  },
  ...observation,
  summary,
});

ensureDir(DIST_DIR);
fs.writeFileSync(path.join(DIST_DIR, 'coldstart-rounds.json'), `${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`\nstatus=${verdict.status} failures=${verdict.failureCount}\n`);
for (const failure of verdict.failures.slice(0, 40)) {
  process.stdout.write(`  ✗ ${failure.id} ${failure.check}: 期望 ${JSON.stringify(failure.expected)}，实测 ${JSON.stringify(failure.observed)}\n`);
}

if (verdict.status !== 'ok') process.exit(1);
