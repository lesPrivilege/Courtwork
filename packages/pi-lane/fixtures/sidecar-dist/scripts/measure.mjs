/**
 * PI-SIDECAR-DIST-1 · 六项实测：体积/SHA、冷启动、stdin/stdout、abort、崩溃回收、双架构。
 *
 * 纪律三条，写在最前面免得读数被误读：
 * 1. **失败也是数据**：任一格失败按原样记 code/signal/stderr，不重试到绿、不抹平。
 * 2. **Rosetta 先热身**：x86_64 首跑含翻译代价，热身后再取样；两类数字分别标注，不混为
 *    「x86_64 就是这么慢」。
 * 3. **本机只能实证本机**：Intel 真机、Windows、Linux、Developer ID/公证一律不外推，
 *    在报告里记 blocked。
 *
 * 用法：`node scripts/measure.mjs [--samples N]`
 * 结果同时写 `dist/measurements.json`（机器面）与 stdout 摘要（人面）。
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  DIST_DIR,
  NODE_VERSION,
  RUNTIME_DIR,
  SIDECAR_BASENAME,
  byteSize,
  ensureDir,
  median,
  round,
  run,
  sha256File,
  spawnNdjson,
} from './lib/toolkit.mjs';

const argv = process.argv.slice(2);
const samplesFlag = argv.indexOf('--samples');
const SAMPLES = samplesFlag >= 0 ? Number(argv[samplesFlag + 1]) : 20;
const WARMUP = 3;

const CORPUS = path.join(DIST_DIR, 'corpus');
ensureDir(CORPUS);
fs.writeFileSync(path.join(CORPUS, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n違約金 3%\n');
fs.writeFileSync(path.join(CORPUS, '附件.md'), '# 附件\n交付期 2026-09-30\n');

const TRIPLES = ['aarch64-apple-darwin', 'x86_64-apple-darwin'];
const ROUTE_A_VARIANTS = [
  { name: 'esm-naive', bundle: 'sidecar.mjs' },
  { name: 'esm-createrequire', bundle: 'sidecar.mjs' },
  { name: 'cjs', bundle: 'sidecar.cjs' },
];
const ROUTE_B_VARIANTS = ['default', 'code-cache'];

/** 被测集合：路线甲三档 bundle 形态、路线乙两档 blob 形态，各跨两个 triple。 */
function artifacts() {
  const list = [];
  for (const triple of TRIPLES) {
    for (const variant of ROUTE_A_VARIANTS) {
      const dir = path.join(DIST_DIR, 'route-a', `${triple}--${variant.name}`);
      const executable = path.join(dir, `${SIDECAR_BASENAME}-${triple}`);
      const carried = path.join(dir, variant.bundle);
      if (!fs.existsSync(executable) || !fs.existsSync(carried)) continue;
      list.push({
        id: `a/${triple}/${variant.name}`,
        route: 'a-sealed-bundle',
        triple,
        variant: variant.name,
        command: executable,
        args: [carried],
        files: [executable, carried],
      });
    }
    for (const variant of ROUTE_B_VARIANTS) {
      const executable = path.join(DIST_DIR, 'route-b', `${triple}--${variant}`, `${SIDECAR_BASENAME}-${triple}`);
      if (!fs.existsSync(executable)) continue;
      list.push({
        id: `b/${triple}/${variant}`,
        route: 'b-node-sea',
        triple,
        variant,
        command: executable,
        args: [],
        files: [executable],
      });
    }
  }
  return list;
}

/**
 * 一次启动探针：先判「这枚产物到底跑不跑得起来」。
 * 跑不起来就不必再花二十次冷启样本，直接把 stderr 首行留成红证。
 */
async function launchProbe(artifact) {
  const proc = spawnNdjson(artifact.command, artifact.args);
  const ready = await proc.waitFor((p) => p.op === 'ready', 30_000);
  if (!ready) {
    proc.child.kill('SIGKILL');
    const exited = await proc.exited;
    const lines = proc.stderr().split('\n').filter(Boolean);
    return {
      launches: false,
      exit: exited,
      // 首条 Error/异常行才是归因所在；栈尾只说明它死在 ESM loader，不说明死于什么。
      // 只取行首的 `XxxError`/`XxxException`；不整段回灌 stderr——esm-naive 的失败会先吐出
      // 整行 852 KB 的 bundle 源码，塞进读数文件毫无用处。
      errorLine: lines.find((line) => /^[A-Za-z]*(?:Error|Exception)\b/.test(line.trim()))?.slice(0, 300) ?? null,
      stderrTail: lines.slice(-3),
    };
  }
  proc.child.stdin.end();
  await proc.exited;
  return { launches: true, node: ready.node, arch: ready.arch, sea: ready.sea };
}

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

async function coldStart(artifact) {
  const external = [];
  const internal = [];
  let ready = null;
  for (let index = 0; index < SAMPLES; index += 1) {
    const started = process.hrtime.bigint();
    const proc = spawnNdjson(artifact.command, artifact.args);
    const packet = await proc.waitFor((p) => p.op === 'ready', 30_000);
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    if (!packet) {
      proc.child.kill('SIGKILL');
      return { status: 'failed', reason: 'no-ready', stderr: proc.stderr().slice(0, 1200), atSample: index };
    }
    ready = packet;
    proc.child.stdin.end();
    await proc.exited;
    if (index >= WARMUP) {
      external.push(elapsed);
      internal.push(packet.uptimeMs);
    }
  }
  return {
    status: 'ok',
    samples: external.length,
    warmupDropped: WARMUP,
    externalMedianMs: round(median(external)),
    externalMinMs: round(Math.min(...external)),
    externalMaxMs: round(Math.max(...external)),
    inProcessMedianMs: round(median(internal)),
    node: ready.node,
    arch: ready.arch,
    sea: ready.sea,
  };
}

/** stdin/stdout：往返、超大行、多字节。sha256 比对保证「没被改字节、没被截断」。 */
async function stdio(artifact) {
  const proc = spawnNdjson(artifact.command, artifact.args);
  const ready = await proc.waitFor((p) => p.op === 'ready', 30_000);
  if (!ready) {
    proc.child.kill('SIGKILL');
    return { status: 'failed', reason: 'no-ready', stderr: proc.stderr().slice(0, 1200) };
  }

  const started = process.hrtime.bigint();
  proc.send({ op: 'ping', id: 'p1' });
  const pong = await proc.waitFor((p) => p.op === 'pong' && p.id === 'p1', 15_000);
  const roundTripMs = Number(process.hrtime.bigint() - started) / 1e6;

  const cases = [];
  for (const [label, text] of [
    ['ascii-1MiB', 'a'.repeat(1024 * 1024)],
    ['utf8-multibyte', '契約書𝒜😀'.repeat(50_000)],
    // C0 控制字符 + 引号 + 反斜杠：JSON 编码后单字符最坏膨胀到六字节，
    // 正是 ADR-022 六-B.1 点名的 encoded-packet worst case。
    ['c0-worst-escape', '\u0001"\\'.repeat(80_000)],
  ]) {
    const expectedBytes = Buffer.byteLength(text, 'utf8');
    const expectedSha = createHash('sha256').update(text, 'utf8').digest('hex');
    proc.send({ op: 'echo', id: label, text });
    const echoed = await proc.waitFor((p) => p.op === 'echoed' && p.id === label, 30_000);
    cases.push({
      label,
      sentBytes: expectedBytes,
      ok: Boolean(echoed) && echoed.byteLength === expectedBytes && echoed.sha256 === expectedSha,
      observed: echoed ? { byteLength: echoed.byteLength, shaMatch: echoed.sha256 === expectedSha } : null,
    });
  }

  // 真跑一轮 loop：证明打进去的确实是能用的 pi core，不是「能启动的空壳」。
  proc.send({ op: 'init', id: 'i1', root: CORPUS });
  const inited = await proc.waitFor((p) => p.op === 'inited' && p.id === 'i1', 30_000);
  proc.send({ op: 'run', id: 'r1', file: '备忘.md' });
  const ran = await proc.waitFor((p) => p.op === 'ran' && p.id === 'r1', 30_000);

  proc.child.stdin.end();
  const exited = await proc.exited;

  return {
    status: 'ok',
    pingRoundTripMs: pong ? round(roundTripMs, 2) : null,
    payloads: cases,
    session: inited ? { tools: inited.tools, setupMs: round(inited.sessionSetupMs) } : null,
    loop: ran ? { toolsExecuted: ran.toolsExecuted, turns: ran.turns, lastRole: ran.lastRole } : null,
    eofExit: exited,
    stderr: proc.stderr().slice(0, 600),
  };
}

/** abort：慢流在途 → abort → 回合以 aborted 收尾，且**进程仍活着能继续服务**。 */
async function abort(artifact) {
  const proc = spawnNdjson(artifact.command, artifact.args);
  const ready = await proc.waitFor((p) => p.op === 'ready', 30_000);
  if (!ready) {
    proc.child.kill('SIGKILL');
    return { status: 'failed', reason: 'no-ready', stderr: proc.stderr().slice(0, 1200) };
  }
  proc.send({ op: 'slow', id: 's1', root: CORPUS, tokensPerSecond: 2, text: `${'词 '.repeat(600)}` });
  const running = await proc.waitFor((p) => p.op === 'running' && p.id === 's1', 30_000);
  if (!running) {
    proc.child.kill('SIGKILL');
    return { status: 'failed', reason: 'slow-never-started', stderr: proc.stderr().slice(0, 1200) };
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  const abortStarted = process.hrtime.bigint();
  proc.send({ op: 'abort', id: 'a1' });
  const ended = await proc.waitFor((p) => p.op === 'slow-ended' && p.id === 's1', 30_000);
  const abortLatencyMs = Number(process.hrtime.bigint() - abortStarted) / 1e6;

  // 关键判据：abort 不得把 sidecar 打死——宿主要能继续用同一进程。
  proc.send({ op: 'ping', id: 'after' });
  const alive = await proc.waitFor((p) => p.op === 'pong' && p.id === 'after', 15_000);

  proc.child.stdin.end();
  const exited = await proc.exited;
  return {
    status: ended ? 'ok' : 'failed',
    abortLatencyMs: ended ? round(abortLatencyMs) : null,
    stopReason: ended?.stopReason ?? null,
    turnElapsedMs: ended ? round(ended.elapsedMs) : null,
    survivedAbort: Boolean(alive),
    eofExit: exited,
  };
}

/** 崩溃回收：四类终止各记 code/signal，再复启一次证明产物本身没坏。 */
async function crashes(artifact) {
  const results = [];
  for (const kind of ['throw', 'exit', 'hang', 'sigterm']) {
    const proc = spawnNdjson(artifact.command, artifact.args);
    const ready = await proc.waitFor((p) => p.op === 'ready', 30_000);
    if (!ready) {
      proc.child.kill('SIGKILL');
      results.push({ kind, status: 'failed', reason: 'no-ready' });
      continue;
    }
    if (kind === 'sigterm') {
      proc.child.kill('SIGTERM');
    } else {
      proc.send({ op: 'crash', id: kind, kind });
      await proc.waitFor((p) => p.op === 'crashing' && p.id === kind, 15_000);
      if (kind === 'hang') {
        await new Promise((resolve) => setTimeout(resolve, 300));
        proc.child.kill('SIGKILL');
      }
    }
    const exited = await proc.exited;
    results.push({
      kind,
      status: 'ok',
      exitCode: exited.code,
      signal: exited.signal,
      stderrHead: proc.stderr().split('\n').filter(Boolean).slice(0, 2),
    });
  }

  // 回收后复启：产物字节未被崩溃影响，宿主可无条件重来。
  const proc = spawnNdjson(artifact.command, artifact.args);
  const ready = await proc.waitFor((p) => p.op === 'ready', 30_000);
  proc.child.stdin.end();
  await proc.exited;
  return { terminations: results, respawnReady: Boolean(ready) };
}

const report = {
  generatedOn: new Date().toISOString(),
  host: {
    platform: process.platform,
    release: os.release(),
    arch: process.arch,
    cpu: os.cpus()[0]?.model ?? null,
    cores: os.cpus().length,
    harnessNode: process.version,
    rosetta: run('arch', ['-x86_64', '/usr/bin/true']).status === 0 ? 'available' : 'unavailable',
  },
  runtime: NODE_VERSION,
  samples: SAMPLES,
  runtimeBaseline: {
    'aarch64-apple-darwin': runtimeBaseline('arm64'),
    'x86_64-apple-darwin': runtimeBaseline('x64'),
  },
  artifacts: [],
};

// Rosetta 首跑含一次性翻译代价。先跑热，再取样，否则 x86_64 的冷启读数是翻译时间不是启动时间。
const rosettaWarmup = run(
  path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-x64`, 'bin', 'node'),
  ['-e', 'process.stdout.write("warm")'],
);
report.host.rosettaWarmup = rosettaWarmup.status === 0 ? 'ok' : `exit ${rosettaWarmup.status}`;

for (const artifact of artifacts()) {
  process.stderr.write(`· 量 ${artifact.id}\n`);
  const entry = {
    id: artifact.id,
    route: artifact.route,
    triple: artifact.triple,
    variant: artifact.variant,
    executable: path.relative(DIST_DIR, artifact.command),
    files: artifact.files.map((file) => ({
      name: path.basename(file),
      bytes: byteSize(file),
      sha256: sha256File(file),
    })),
    shippedBytes: artifact.files.reduce((total, file) => total + byteSize(file), 0),
    fileCount: artifact.files.length,
  };

  entry.launchProbe = await launchProbe(artifact);
  if (!entry.launchProbe.launches) {
    // 起不来的产物不再耗二十轮样本：失败本身已经是结论，红证留在 launchProbe。
    entry.coldStart = { status: 'skipped', reason: 'does-not-launch' };
    entry.stdio = { status: 'skipped', reason: 'does-not-launch' };
    entry.abort = { status: 'skipped', reason: 'does-not-launch' };
    entry.crash = { status: 'skipped', reason: 'does-not-launch' };
    report.artifacts.push(entry);
    continue;
  }

  entry.coldStart = await coldStart(artifact);
  entry.stdio = await stdio(artifact);
  entry.abort = await abort(artifact);
  entry.crash = await crashes(artifact);
  report.artifacts.push(entry);
}

fs.writeFileSync(path.join(DIST_DIR, 'measurements.json'), `${JSON.stringify(report, null, 2)}\n`);

const rows = report.artifacts.map((entry) => ({
  id: entry.id,
  launches: entry.launchProbe.launches,
  files: entry.fileCount,
  MiB: round(entry.shippedBytes / 1024 / 1024, 2),
  coldMs: entry.coldStart.externalMedianMs ?? entry.coldStart.status,
  inProcMs: entry.coldStart.inProcessMedianMs ?? '—',
  sea: entry.coldStart.sea ?? '—',
  loop: entry.stdio.loop ? entry.stdio.loop.toolsExecuted.join('+') : entry.stdio.status,
  payloadOk: entry.stdio.payloads ? entry.stdio.payloads.every((c) => c.ok) : '—',
  abortMs: entry.abort.abortLatencyMs ?? entry.abort.status,
  survived: entry.abort.survivedAbort ?? '—',
  respawn: entry.crash.respawnReady ?? '—',
}));
process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
process.stdout.write(`\n写入 ${path.join(DIST_DIR, 'measurements.json')}\n`);
