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

import { COLDSTART_SHAPE, CRASH_DEADLINES, NODE_VERSION, conclude, verdictColdstart } from './lib/probe-verdict.mjs';
import {
  DIST_DIR,
  RUNTIME_DIR,
  ensureDir,
  killAndConfirmInto,
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

/**
 * 反例注入面：落在采集完成、判定之前的观察值上（真起 200 次进程、真收 200 个 `ready`，
 * 然后只坏一处）。首枚与第三枚都是 warmup——`f261347` 之后 warmup 只从**性能统计**排除，
 * 不从安全门排除，故坏在 warmup 上同样必须红。
 */
const BAD_IDENTITY = { node: 'v20.19.0', arch: 'ppc64', sea: 'not-sea' };
const firstRound = (observation) => observation.subjects[0].rounds[0];

const COUNTEREXAMPLES = {
  'identity.firstSample': (o) => (firstRound(o).samples[0].identity = { ...BAD_IDENTITY }),
  'identity.warmupSample': (o) => (firstRound(o).samples[COLDSTART_SHAPE.warmup - 1].identity = { ...BAD_IDENTITY }),
  'identity.lastSample': (o) => (firstRound(o).samples.at(-1).identity = { ...BAD_IDENTITY }),
  // 中段样本坏掉：R1 会被首值洗白，R2 必须逐枚见。
  'identity.middleSample': (o) => (firstRound(o).samples[12].identity = { ...BAD_IDENTITY }),
  // 采集侧记下了漂移，但每枚样本看起来都对——drift 本身即硬失败，不许「记了就算交代过」。
  'identity.driftRecorded': (o) => (firstRound(o).identityDrift = { atSample: 7, seen: { ...BAD_IDENTITY } }),
  'sample.missing': (o) => firstRound(o).samples.pop(),
  'sample.eof': (o) => (firstRound(o).samples[9].eof = { code: 3, signal: null }),
  'sample.eofSignal': (o) => (firstRound(o).samples[4].eof = { code: null, signal: 'SIGSEGV' }),
  'sample.warmupCount': (o) => firstRound(o).samples.forEach((sample) => (sample.warmup = false)),

  // —— 缺口三：这四枚都**保持总数不变**，正是 count-only 判据看不见的形状。
  //    复制首枚顶掉次枚：长度仍 25，warmup 总数仍 3，只有逐枚 ordinal 抓得住。
  'sample.duplicateOrdinal': (o) => {
    const samples = firstRound(o).samples;
    samples[1] = JSON.parse(JSON.stringify(samples[0]));
  },
  'sample.ordinalOutOfRange': (o) => (firstRound(o).samples[5].sample = 99),
  // warmup 挪到第 10–12 枚、前三枚改 false：总数仍是 3。
  'sample.warmupPosition': (o) => {
    const samples = firstRound(o).samples;
    for (const index of [0, 1, 2]) samples[index].warmup = false;
    for (const index of [10, 11, 12]) samples[index].warmup = true;
  },
  // 三轮全标 round:1：轮数仍是 3。
  'round.duplicate': (o) => o.subjects[0].rounds.forEach((entry) => (entry.round = 1)),
};

const ceFlagIndex = argv.indexOf('--counterexample');
const COUNTEREXAMPLE = ceFlagIndex >= 0 ? argv[ceFlagIndex + 1] : null;
if (argv.includes('--list-counterexamples')) {
  process.stdout.write(`${Object.keys(COUNTEREXAMPLES).join('\n')}\n`);
  process.exit(0);
}
if (COUNTEREXAMPLE && !COUNTEREXAMPLES[COUNTEREXAMPLE]) {
  process.stderr.write(`未知反例 ${COUNTEREXAMPLE}；可选：\n${Object.keys(COUNTEREXAMPLES).join('\n')}\n`);
  process.exit(3);
}

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

/**
 * 一枚产物的一轮：外部计时 `spawn` → 读到 `ready` 行，即宿主等待可服务的真实时长。
 *
 * `f261347` 的 blocker 2 就出在这里的收束：R1 用 `identity ??= seen` 吃下首样本，
 * 再把返回的 `identity` 换成**漂移后**的值，于是「首枚错、后 24 枚对」在读数里查无此事。
 * R2 不再收束成一个 identity：**25 枚样本逐枚留档**，身份与 EOF 由判定层逐枚校验。
 * 三枚 warmup 只是不进性能统计（`warmup:true` 标出来），安全门一视同仁。
 */
async function sampleRound(artifact, roundNumber) {
  const samples = [];
  const external = [];
  let identity = null;
  let identityDrift = null;

  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const started = process.hrtime.bigint();
    const proc = spawnNdjson(artifact.command, artifact.args);
    const ready = await proc.waitFor((packet) => packet.op === 'ready', 30_000);
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    if (!ready) {
      const cleanupTimeouts = [];
      await killAndConfirmInto(proc, CRASH_DEADLINES.killConfirmMs, cleanupTimeouts);
      return {
        round: roundNumber,
        failed: {
          atSample: sample,
          cleanupTimeouts,
          stderrTail: proc.stderr().split('\n').filter(Boolean).slice(-2),
        },
        samples,
      };
    }
    const seen = { node: ready.node, arch: ready.arch, sea: ready.sea };
    identity ??= seen;
    if (identityDrift === null && JSON.stringify(seen) !== JSON.stringify(identity)) {
      identityDrift = { atSample: sample, seen };
    }
    proc.child.stdin.end();
    let exit = await proc.waitForExit(CRASH_DEADLINES.exitMs);
    const eofTimeouts = [];
    if (!exit) {
      // EOF 超时以前只记红、不收拾子进程——整条失败矩阵会一路漏进程。
      // 现在同样走有界 cleanup，杀完还要确认。
      eofTimeouts.push('eof');
      exit = await killAndConfirmInto(proc, CRASH_DEADLINES.killConfirmMs, eofTimeouts);
    }
    const warmup = sample < WARMUP;
    samples.push({
      sample,
      warmup,
      identity: seen,
      elapsedMs: round(elapsed, 2),
      eof: exit ?? { code: null, signal: null, timedOut: true },
      ...(eofTimeouts.length > 0 ? { timeouts: eofTimeouts } : {}),
    });
    if (!warmup) external.push(elapsed);
  }

  return {
    round: roundNumber,
    keptSamples: external.length,
    samples,
    identityDrift,
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

/** 只坏一处，并校验「确实坏到了」——改不动的是等价变异，须如实登记，不算覆盖。 */
let counterexample = null;
if (COUNTEREXAMPLE) {
  const before = JSON.stringify(observation);
  COUNTEREXAMPLES[COUNTEREXAMPLE](observation);
  const applied = JSON.stringify(observation) !== before;
  counterexample = { name: COUNTEREXAMPLE, applied, caught: null };
  if (!applied) counterexample.equivalentMutation = true;
}

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
  counterexample,
  runtimeBaseline: {
    'aarch64-apple-darwin': runtimeBaseline('arm64'),
    'x86_64-apple-darwin': runtimeBaseline('x64'),
  },
  ...observation,
  summary,
});
if (counterexample) {
  counterexample.caught = verdict.status === 'failed';
  verdict.counterexample = counterexample;
}

ensureDir(DIST_DIR);
fs.writeFileSync(path.join(DIST_DIR, 'coldstart-rounds.json'), `${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`\nstatus=${verdict.status} failures=${verdict.failureCount}\n`);
for (const failure of verdict.failures.slice(0, 40)) {
  process.stdout.write(`  ✗ ${failure.id} ${failure.check}: 期望 ${JSON.stringify(failure.expected)}，实测 ${JSON.stringify(failure.observed)}\n`);
}

if (counterexample) {
  process.stdout.write(`反例 ${COUNTEREXAMPLE}：applied=${counterexample.applied} caught=${counterexample.caught}\n`);
  // 抓住＝2（期望）；没抓住或压根没改动＝3（等价变异／补丁没生效，须如实登记）。
  process.exit(counterexample.applied && counterexample.caught ? 2 : 3);
}

if (verdict.status !== 'ok') process.exit(1);
