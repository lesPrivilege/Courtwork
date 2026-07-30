/**
 * PI-SIDECAR-DIST-1R · 十件库存的功能实测：体积/SHA、身份、stdio、loop、abort、四类崩溃。
 *
 * 与 `70e6482` 的根本差别只有一条：**这里的每一格都会判红**。
 * 原件把失败序列化进 JSON 后仍从 `measure.mjs:207/246/279` 返回 `status:'ok'`，
 * 缺产物在 `:60/:74` 被静默 `continue`——`9b8142f` 因此判 REJECT。现在：
 *
 * - 库存恰十件闭集，少一、多一、重复、错名都令顶层 `status:'failed'` 且进程非零；
 * - 两枚 `esm-naive` 是**负控**，必须以既知 `Dynamic require of "process"` 非零失败；
 * - 其余八枚逐件锁身份三元组、pong、三 payload 的 byte/hash、exact 工具表、
 *   真实 read loop、干净 EOF、abort 四条与四类崩溃的 exact code/signal 及逐类复启；
 * - 判据全部住 `lib/probe-verdict.mjs`，本文件只负责采集观察值。
 *
 * 冷启动读数已整体移到 `coldstart-rounds.mjs`：单轮读数会被负载带偏（本票失败记录三），
 * 留在这里只会诱人引用一个自己都声明不作数的数字。
 *
 * 用法：
 *   `node scripts/measure.mjs`                          正式实测
 *   `node scripts/measure.mjs --counterexample <name>`   注入反例，验证判据确实拦得住
 *   `node scripts/measure.mjs --list-counterexamples`    列出全部反例名
 *
 * 退出码：0＝干净全过；1＝正式实测判红；2＝反例被判据抓住（期望结果）；
 * 3＝反例**没**被抓住或压根没改动观察值（等价变异，须如实登记，不得当作覆盖）。
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  CRASH_DEADLINES,
  PAYLOAD_SPECS,
  conclude,
  payloadText,
  verdictAbort,
  verdictAssembly,
  verdictCrash,
  verdictIdentity,
  verdictInventory,
  verdictNegativeControl,
  verdictStdio,
} from './lib/probe-verdict.mjs';
import {
  ASSEMBLY_DIR,
  COUNTEREXAMPLE_DIR,
  DIST_DIR,
  artifactPresent,
  byteSize,
  ensureDir,
  killAndConfirmInto,
  observeAssembly,
  resolveInventory,
  round,
  run,
  sha256File,
  spawnNdjson,
} from './lib/toolkit.mjs';

// —— 反例注入面 ————————————————————————————————————————————————————
//
// 被测 `sidecar-fixture.mjs` 由票面冻结，故反例只能落在**采集完成、判定之前**的观察值上：
// 真起进程、真跑一轮、真收包，然后只坏一处。这测的是判据的区分力，不是 fixture 的行为。
// 物理面的反例（删产物、截断 archive、预置错件）不走这里，直接动磁盘。

const COUNTEREXAMPLES = {
  'identity.node': { target: 'candidate', apply: (o) => (o.ready.node = 'v20.19.0') },
  'identity.arch': { target: 'candidate', apply: (o) => (o.ready.arch = 'ppc64') },
  'identity.sea': { target: 'sea-candidate', apply: (o) => (o.ready.sea = 'not-sea') },
  'stdio.pong': { target: 'candidate', apply: (o) => (o.stdio.pong.seen = false) },
  'stdio.payload.bytes': { target: 'candidate', apply: (o) => (o.stdio.payloads[0].observedBytes -= 1) },
  'stdio.payload.sha': { target: 'candidate', apply: (o) => (o.stdio.payloads[1].observedSha256 = '0'.repeat(64)) },
  'stdio.tools': { target: 'candidate', apply: (o) => (o.stdio.session.tools = ['read', 'grep']) },
  'stdio.loop.tools': { target: 'candidate', apply: (o) => (o.stdio.loop.toolsExecuted = []) },
  'stdio.loop.turns': { target: 'candidate', apply: (o) => (o.stdio.loop.turns = 1) },
  'stdio.eof': { target: 'candidate', apply: (o) => (o.stdio.eofExit = { code: 3, signal: null }) },
  'abort.ack': { target: 'candidate', apply: (o) => (o.abort.ack.seen = false) },
  'abort.wasRunning': { target: 'candidate', apply: (o) => (o.abort.ack.wasRunning = false) },
  'abort.stopReason': { target: 'candidate', apply: (o) => (o.abort.ended.stopReason = 'endTurn') },
  'abort.survived': { target: 'candidate', apply: (o) => (o.abort.pingAfterAbort = false) },
  'crash.throw': { target: 'candidate', apply: (o) => (crashRow(o, 'throw').exitCode = 0) },
  'crash.exit': { target: 'candidate', apply: (o) => (crashRow(o, 'exit').exitCode = 1) },
  'crash.hang': { target: 'candidate', apply: (o) => ((crashRow(o, 'hang').signal = 'SIGTERM')) },
  'crash.sigterm': { target: 'candidate', apply: (o) => ((crashRow(o, 'sigterm').signal = 'SIGKILL')) },
  'crash.respawn': { target: 'candidate', apply: (o) => (crashRow(o, 'exit').respawnReady = false) },
  'negativeControl.launched': { target: 'negative-control', apply: (o) => (o.negativeControl.launched = true) },
  'negativeControl.reason': {
    target: 'negative-control',
    apply: (o) => (o.negativeControl.errorLine = 'Error: unrelated failure'),
  },
  'inventory.extra': { target: 'inventory', apply: (ids) => ids.push('a/aarch64-apple-darwin/wasm') },

  // —— R2 新增：crash 上界。`f261347` 点名的「ack/exit 可无限等待」。
  //
  // 反例主体是一个**受控子进程**：它照发 `ready`、照答 `ping`，但对 `crash` 一概不理，
  // 也不退出。票面冻结了 `sidecar-fixture.mjs`，故这枚桩由本脚本在 `dist/counterexamples/`
  // 现生成——它是 gitignore 的 scratch，不是新增源文件，也不在 assembly 内。
  // 期望：整支 probe 在具名 deadline 内收束、写结构化 failure、非零退出，而不是挂死。
  'crash.ignored': { target: 'crash-stub' },
};

/** 能 ready、能 ping、但**忽略 crash/exit** 的桩。用它证明 probe 会在上界内失败。 */
function writeIgnoreCrashStub() {
  ensureDir(COUNTEREXAMPLE_DIR);
  const stub = path.join(COUNTEREXAMPLE_DIR, 'ignores-crash-sidecar.mjs');
  fs.writeFileSync(
    stub,
    [
      "process.stdout.write(JSON.stringify({ op: 'ready', node: process.version, arch: process.arch, sea: 'not-sea' }) + '\\n');",
      "process.stdin.on('data', () => {});",
      '// 既不 ack `crash`，也不退出，还压住 stdin EOF——正是会把裸 await 挂死的那种子进程。',
      'setInterval(() => {}, 1 << 30);',
    ].join('\n'),
  );
  return stub;
}

const crashRow = (observation, kind) => observation.crash.terminations.find((entry) => entry.kind === kind);

const argv = process.argv.slice(2);
if (argv.includes('--list-counterexamples')) {
  process.stdout.write(`${Object.keys(COUNTEREXAMPLES).join('\n')}\n`);
  process.exit(0);
}
const ceFlag = argv.indexOf('--counterexample');
const COUNTEREXAMPLE = ceFlag >= 0 ? argv[ceFlag + 1] : null;
if (COUNTEREXAMPLE && !COUNTEREXAMPLES[COUNTEREXAMPLE]) {
  process.stderr.write(`未知反例 ${COUNTEREXAMPLE}；可选：\n${Object.keys(COUNTEREXAMPLES).join('\n')}\n`);
  process.exit(3);
}

const CORPUS = path.join(DIST_DIR, 'corpus');
ensureDir(CORPUS);
fs.writeFileSync(path.join(CORPUS, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n違約金 3%\n');
fs.writeFileSync(path.join(CORPUS, '附件.md'), '# 附件\n交付期 2026-09-30\n');

// —— 采集 ————————————————————————————————————————————————————————

/** 一次启动探针：只回报「起没起来、起来了是什么身份、没起来是死在哪句」。 */
async function launchProbe(artifact) {
  const proc = spawnNdjson(artifact.command, artifact.args);
  const ready = await proc.waitFor((packet) => packet.op === 'ready', 30_000);
  if (!ready) {
    proc.child.kill('SIGKILL');
    const exited = await proc.exited;
    const lines = proc.stderr().split('\n').filter(Boolean);
    return {
      launched: false,
      exit: exited,
      // 首条 `XxxError`/`XxxException` 行才是归因所在。不整段回灌 stderr——
      // esm-naive 的失败会先吐出整行 852 KB 的 bundle 源码。
      errorLine: lines.find((line) => /^[A-Za-z]*(?:Error|Exception)\b/.test(line.trim()))?.slice(0, 300) ?? null,
      stderrTail: lines.slice(-3),
    };
  }
  proc.child.stdin.end();
  const exited = await proc.exited;
  return { launched: true, ready: { node: ready.node, arch: ready.arch, sea: ready.sea }, exit: exited };
}

/** stdio：pong、三类大 payload 的 byte/hash 往返、工具表、真跑一轮 loop、EOF。 */
async function stdio(artifact) {
  const proc = spawnNdjson(artifact.command, artifact.args);
  const ready = await proc.waitFor((packet) => packet.op === 'ready', 30_000);
  if (!ready) {
    proc.child.kill('SIGKILL');
    return { unreachable: 'no-ready', stderr: proc.stderr().slice(0, 1200) };
  }

  const started = process.hrtime.bigint();
  proc.send({ op: 'ping', id: 'p1' });
  const pong = await proc.waitFor((packet) => packet.op === 'pong' && packet.id === 'p1', 15_000);
  const roundTripMs = Number(process.hrtime.bigint() - started) / 1e6;

  const payloads = [];
  for (const spec of PAYLOAD_SPECS) {
    const text = payloadText(spec);
    const sentBytes = Buffer.byteLength(text, 'utf8');
    const sentSha256 = createHash('sha256').update(text, 'utf8').digest('hex');
    proc.send({ op: 'echo', id: spec.label, text });
    const echoed = await proc.waitFor((packet) => packet.op === 'echoed' && packet.id === spec.label, 60_000);
    payloads.push({
      label: spec.label,
      sentBytes,
      sentSha256,
      observedBytes: echoed ? echoed.byteLength : null,
      observedSha256: echoed ? echoed.sha256 : null,
    });
  }

  // 真跑一轮 loop：证明打进去的是能用的 pi core，不是「能启动的空壳」。
  proc.send({ op: 'init', id: 'i1', root: CORPUS });
  const inited = await proc.waitFor((packet) => packet.op === 'inited' && packet.id === 'i1', 60_000);
  proc.send({ op: 'run', id: 'r1', file: '备忘.md' });
  const ran = await proc.waitFor((packet) => packet.op === 'ran' && packet.id === 'r1', 60_000);

  proc.child.stdin.end();
  const eofExit = await proc.exited;

  return {
    pong: { seen: Boolean(pong), roundTripMs: pong ? round(roundTripMs, 2) : null },
    payloads,
    session: inited ? { tools: inited.tools, setupMs: round(inited.sessionSetupMs) } : null,
    loop: ran ? { toolsExecuted: ran.toolsExecuted, turns: ran.turns, lastRole: ran.lastRole } : null,
    eofExit,
    stderr: proc.stderr().slice(0, 600),
  };
}

/** abort：在途回合被打断、以 `aborted` 收束、进程仍能服务、随后 EOF 干净退 0。 */
async function abort(artifact) {
  const proc = spawnNdjson(artifact.command, artifact.args);
  const ready = await proc.waitFor((packet) => packet.op === 'ready', 30_000);
  if (!ready) {
    proc.child.kill('SIGKILL');
    return { unreachable: 'no-ready', stderr: proc.stderr().slice(0, 1200) };
  }
  proc.send({ op: 'slow', id: 's1', root: CORPUS, tokensPerSecond: 2, text: `${'词 '.repeat(600)}` });
  const running = await proc.waitFor((packet) => packet.op === 'running' && packet.id === 's1', 60_000);
  if (!running) {
    proc.child.kill('SIGKILL');
    return { unreachable: 'slow-never-started', stderr: proc.stderr().slice(0, 1200) };
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  // 两个监听都要在 send 之前挂上：`waitFor` 只看得见挂上之后到达的行，
  // 先 await ack 再挂 slow-ended 会漏掉抢先到达的收束包。
  const ackPromise = proc.waitFor((packet) => packet.op === 'aborted' && packet.id === 'a1', 30_000);
  const endedPromise = proc.waitFor((packet) => packet.op === 'slow-ended' && packet.id === 's1', 60_000);
  const abortStarted = process.hrtime.bigint();
  proc.send({ op: 'abort', id: 'a1' });
  const ack = await ackPromise;
  const ended = await endedPromise;
  const abortLatencyMs = Number(process.hrtime.bigint() - abortStarted) / 1e6;

  proc.send({ op: 'ping', id: 'after' });
  const alive = await proc.waitFor((packet) => packet.op === 'pong' && packet.id === 'after', 15_000);

  proc.child.stdin.end();
  const eofExit = await proc.exited;
  return {
    ack: { seen: Boolean(ack), wasRunning: ack ? ack.wasRunning : null },
    ended: ended ? { stopReason: ended.stopReason ?? null, elapsedMs: round(ended.elapsedMs) } : null,
    pingAfterAbort: Boolean(alive),
    abortLatencyMs: ended ? round(abortLatencyMs) : null,
    eofExit,
  };
}

/**
 * 四类崩溃：各记 exact code/signal，并**逐类**复启一次证明产物字节未受影响。
 *
 * `f261347` 的失败闭口之二：R1 只 `await crashing`（不判有没有收到）再裸 `await proc.exited`。
 * 子进程若既不 ack 也不退出，整支 probe 永久挂起——既不写 failed verdict 也不非零退出，
 * 连超时都没有。R2 把每一步都套上具名 deadline，超时写进 `timeouts`、杀掉残留、照常收束，
 * 由 `verdictCrash` 判红。**`command`/`args` 可外部指定**，好让「忽略 crash 的子进程」
 * 这枚反例不必去改被票面冻结的 `sidecar-fixture.mjs`。
 */
async function crashes(artifact, command = artifact.command, args = artifact.args) {
  const terminations = [];
  for (const kind of ['throw', 'exit', 'hang', 'sigterm']) {
    const timeouts = [];
    const proc = spawnNdjson(command, args);
    const ready = await proc.waitFor((packet) => packet.op === 'ready', CRASH_DEADLINES.respawnReadyMs);
    if (!ready) {
      // cleanup 的返回值必须被消费：杀完确认不了，就再记一条 `kill-confirm`。
      const readyTimeouts = ['ready'];
      await killAndConfirmInto(proc, CRASH_DEADLINES.killConfirmMs, readyTimeouts);
      terminations.push({
        kind,
        ackSeen: false,
        exitCode: null,
        signal: null,
        respawnReady: false,
        respawnEofClean: false,
        timeouts: readyTimeouts,
        reason: 'no-ready',
      });
      continue;
    }

    let ackSeen = null;
    if (kind === 'sigterm') {
      proc.child.kill('SIGTERM'); // 外部信号，不要求 ack
    } else {
      proc.send({ op: 'crash', id: kind, kind });
      const ack = await proc.waitFor((packet) => packet.op === 'crashing' && packet.id === kind, CRASH_DEADLINES.ackMs);
      ackSeen = Boolean(ack);
      if (!ack) timeouts.push('ack');
      if (kind === 'hang') {
        await new Promise((resolve) => setTimeout(resolve, 300));
        proc.child.kill('SIGKILL');
      }
    }

    // 有上界地等退出；超时就杀，杀完还要**确认**它真的走了，确认本身也有上界。
    let exited = await proc.waitForExit(CRASH_DEADLINES.exitMs);
    if (!exited) {
      timeouts.push('exit');
      exited = await killAndConfirmInto(proc, CRASH_DEADLINES.killConfirmMs, timeouts);
    }

    const again = spawnNdjson(command, args);
    const respawn = await again.waitFor((packet) => packet.op === 'ready', CRASH_DEADLINES.respawnReadyMs);
    let respawnExit = null;
    if (respawn) {
      again.child.stdin.end();
      respawnExit = await again.waitForExit(CRASH_DEADLINES.respawnEofMs);
      if (!respawnExit) {
        timeouts.push('respawn-eof');
        await killAndConfirmInto(again, CRASH_DEADLINES.killConfirmMs, timeouts);
      }
    } else {
      timeouts.push('respawn-ready');
      await killAndConfirmInto(again, CRASH_DEADLINES.killConfirmMs, timeouts);
    }

    terminations.push({
      kind,
      ackSeen,
      exitCode: exited ? exited.code : null,
      signal: exited ? exited.signal : null,
      respawnReady: Boolean(respawn),
      respawnEofClean: Boolean(respawnExit && respawnExit.code === 0 && respawnExit.signal === null),
      timeouts,
      stderrHead: proc.stderr().split('\n').filter(Boolean).slice(0, 2),
    });
  }
  return { terminations };
}

// —— 主流程 ——————————————————————————————————————————————————————

const report = {
  probe: 'measure',
  generatedOn: new Date().toISOString(),
  counterexample: COUNTEREXAMPLE
    ? { name: COUNTEREXAMPLE, appliedTo: null, applied: false, caught: null }
    : null,
  host: {
    platform: process.platform,
    release: os.release(),
    arch: process.arch,
    cpu: os.cpus()[0]?.model ?? null,
    cores: os.cpus().length,
    harnessNode: process.version,
    rosetta: run('arch', ['-x86_64', '/usr/bin/true']).status === 0 ? 'available' : 'unavailable',
  },
  artifacts: [],
};

/** 只坏一处，并验证「确实坏到了」——改不动的变异是等价变异，必须如实登记，不算覆盖。 */
function injectInto(scope, subject, payload) {
  if (!COUNTEREXAMPLE) return false;
  const spec = COUNTEREXAMPLES[COUNTEREXAMPLE];
  if (spec.target !== scope) return false;
  if (report.counterexample.applied) return false;
  const before = JSON.stringify(payload);
  spec.apply(payload);
  const changed = JSON.stringify(payload) !== before;
  report.counterexample.applied = changed;
  report.counterexample.appliedTo = subject;
  if (!changed) report.counterexample.equivalentMutation = true;
  return changed;
}

const inventory = resolveInventory();
const observedIds = [];
const failures = [];

/**
 * **物理**闭集先判。`f261347` 的 blocker 1：R1 只由常量 `INVENTORY` 推坐标再问「在不在」，
 * 于是磁盘上真多出 `route-a/unexpected-physical/proof.txt` 也照报 `status:'ok' failures:0`
 * （本票已实测复现，红证留档在报告与回执）。
 *
 * 现在 observation 由 `readdir` + `lstat` 从 assembly 实物构造，与冻结的期望闭集**双向**比对。
 * 读数 JSON、构建 scratch、runtime、corpus 与反例留档都在 assembly 之外，故不会被误伤。
 */
const assembly = observeAssembly();
report.assembly = { root: path.relative(DIST_DIR, ASSEMBLY_DIR), exists: assembly.exists, entries: assembly.entries };
if (COUNTEREXAMPLE === 'crash.ignored') {
  // 桩不是随包件，故这枚反例只跑崩溃面，不进十件库存的常规量测。
  const stub = writeIgnoreCrashStub();
  process.stderr.write('· 反例 crash.ignored：对忽略 crash 的受控子进程跑崩溃探针\n');
  const started = Date.now();
  const observation = await crashes({ id: 'counterexample/ignores-crash' }, process.execPath, [stub]);
  report.counterexample.applied = true;
  report.counterexample.appliedTo = 'counterexample/ignores-crash';
  report.counterexample.elapsedMs = Date.now() - started;
  report.crashStub = { stub: path.relative(DIST_DIR, stub), deadlines: CRASH_DEADLINES, ...observation };
  const stubVerdict = conclude(verdictCrash('counterexample/ignores-crash', observation), report);
  ensureDir(DIST_DIR);
  fs.writeFileSync(path.join(DIST_DIR, 'measurements.json'), `${JSON.stringify(stubVerdict, null, 2)}\n`);
  const caught = stubVerdict.status === 'failed';
  process.stdout.write(`\nstatus=${stubVerdict.status} failures=${stubVerdict.failureCount} elapsedMs=${report.counterexample.elapsedMs}\n`);
  for (const failure of stubVerdict.failures.slice(0, 40)) {
    process.stdout.write(`  ✗ ${failure.id} ${failure.check}: 期望 ${JSON.stringify(failure.expected)}，实测 ${JSON.stringify(failure.observed)}\n`);
  }
  process.stdout.write(`反例 crash.ignored：applied=true caught=${caught}\n`);
  process.exit(caught ? 2 : 3);
}
failures.push(...verdictAssembly(assembly));

for (const artifact of inventory) {
  process.stderr.write(`· 量 ${artifact.id}\n`);
  const present = artifactPresent(artifact);
  const entry = {
    id: artifact.id,
    route: artifact.route,
    triple: artifact.triple,
    variant: artifact.variant,
    role: artifact.role,
    present,
    executable: path.relative(DIST_DIR, artifact.command),
  };

  if (!present) {
    entry.missingFiles = artifact.files.filter((file) => !fs.existsSync(file)).map((file) => path.relative(DIST_DIR, file));
    report.artifacts.push(entry);
    continue; // 不进 observedIds → 由 verdictInventory 判红，不再静默。
  }
  observedIds.push(artifact.id);

  entry.files = artifact.files.map((file) => ({
    name: path.basename(file),
    bytes: byteSize(file),
    sha256: sha256File(file),
  }));
  entry.shippedBytes = entry.files.reduce((total, file) => total + file.bytes, 0);
  entry.fileCount = entry.files.length;

  const probe = await launchProbe(artifact);

  if (artifact.role === 'negative-control') {
    const observation = { negativeControl: probe };
    injectInto('negative-control', artifact.id, observation);
    entry.negativeControl = observation.negativeControl;
    failures.push(...verdictNegativeControl(artifact.id, observation.negativeControl));
    report.artifacts.push(entry);
    continue;
  }

  if (!probe.launched) {
    // 候选起不来即整枚不可用：留红证，不再耗后续探针。
    entry.launchProbe = probe;
    failures.push({
      id: artifact.id,
      check: 'candidate.launched',
      expected: true,
      observed: false,
      errorLine: probe.errorLine,
    });
    report.artifacts.push(entry);
    continue;
  }

  const observation = {
    ready: { ...probe.ready },
    stdio: await stdio(artifact),
    abort: await abort(artifact),
    crash: await crashes(artifact),
  };
  injectInto('candidate', artifact.id, observation);
  if (artifact.route === 'b-node-sea') injectInto('sea-candidate', artifact.id, observation);

  entry.ready = observation.ready;
  entry.stdio = observation.stdio;
  entry.abort = observation.abort;
  entry.crash = observation.crash;

  failures.push(...verdictIdentity(artifact.id, observation.ready));
  failures.push(...verdictStdio(artifact.id, observation.stdio));
  failures.push(...verdictAbort(artifact.id, observation.abort));
  failures.push(...verdictCrash(artifact.id, observation.crash));
  report.artifacts.push(entry);
}

injectInto('inventory', 'inventory', observedIds);
failures.unshift(...verdictInventory(observedIds));

const verdict = conclude(failures, report);
ensureDir(DIST_DIR);
fs.writeFileSync(path.join(DIST_DIR, 'measurements.json'), `${JSON.stringify(verdict, null, 2)}\n`);

const rows = verdict.artifacts.map((entry) => ({
  id: entry.id,
  role: entry.role,
  present: entry.present,
  MiB: entry.shippedBytes ? round(entry.shippedBytes / 1024 / 1024, 2) : '—',
  files: entry.fileCount ?? '—',
  sea: entry.ready?.sea ?? (entry.negativeControl ? 'n/a (negative control)' : '—'),
  payloads: entry.stdio?.payloads ? entry.stdio.payloads.length : '—',
  loop: entry.stdio?.loop ? entry.stdio.loop.toolsExecuted.join('+') : '—',
  abortMs: entry.abort?.abortLatencyMs ?? '—',
  crashes: entry.crash ? entry.crash.terminations.map((row) => row.exitCode ?? row.signal).join('/') : '—',
}));
process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
process.stdout.write(`\nstatus=${verdict.status} failures=${verdict.failureCount}\n`);
for (const failure of verdict.failures.slice(0, 40)) {
  process.stdout.write(`  ✗ ${failure.id} ${failure.check}: 期望 ${JSON.stringify(failure.expected)}，实测 ${JSON.stringify(failure.observed)}\n`);
}
process.stdout.write(`写入 ${path.join(DIST_DIR, 'measurements.json')}\n`);

if (COUNTEREXAMPLE) {
  const caught = verdict.status === 'failed';
  verdict.counterexample.caught = caught;
  fs.writeFileSync(path.join(DIST_DIR, 'measurements.json'), `${JSON.stringify(verdict, null, 2)}\n`);
  const applied = verdict.counterexample.applied;
  process.stdout.write(`反例 ${COUNTEREXAMPLE}：applied=${applied} caught=${caught}\n`);
  // 抓住＝2（期望）；没抓住或压根没改动＝3（等价变异／补丁没生效，须如实登记）。
  process.exit(applied && caught ? 2 : 3);
}

if (verdict.status !== 'ok') process.exit(1);
