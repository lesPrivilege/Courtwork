/**
 * PI-SIDECAR-DIST-1R · 双 cycle 可复现性与跨架构 code cache 探针。
 *
 * `70e6482` 的报告第十节曾断言「`default` 可复现、`code-cache` 不可复现、跨架构静默降级」，
 * 但装置里**没有任何一支脚本会因这三条不成立而判红**——那是人工叙述，不是门。本支补上：
 *
 * 1. 从**空** `route-a/` 与 `route-b/` 连做两个完整 cycle；
 * 2. sealed 三档 minified bundle 与 SEA `default` 必须两次逐字节相同；
 * 3. `code-cache` 必须两次**不同**——它若碰巧一致就是误报，同样判红，不许当好消息收；
 * 4. 把 arm64 生成的 blob 注入 x64 二进制，必须在 stderr 观察到
 *    `Code cache data rejected.` 原句。静默降级零容忍即锁这一句。
 *
 * 已知边界，写在这里免得被引申为「SEA 完全可复现」：SEA blob 内含**入口 CJS 的绝对路径**，
 * 故 `default` 的字节一致只在**同一构建路径**下成立。换目录重建 SHA 必变，这不是非确定性，
 * 是路径进了产物。发行票若要跨机比对 SHA，须先把构建路径固定或规范化。
 *
 * 本支是全流程里的**装配步**：它自己跑两轮 `build-sealed` + `build-sea`，跑完磁盘上留的是
 * 第二个 cycle 的产物，`measure` / `coldstart-rounds` / `sign-probe` 接着用即可。
 *
 * 用法：
 *   `node scripts/reproducibility-probe.mjs`                         正式实测
 *   `node scripts/reproducibility-probe.mjs --counterexample <name>`  注入反例验判据
 *
 * 退出码与 `measure.mjs` 同：0＝干净全过；1＝正式实测判红；2＝反例被抓住（期望）；
 * 3＝反例没被抓住或压根没改动观察值（等价变异，须如实登记）。
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  CODE_CACHE_REJECT_WARNING,
  CRASH_DEADLINES,
  NODE_VERSION,
  SEALED_VARIANTS,
  SIDECAR_BASENAME,
  TARGETS,
  conclude,
  verdictReproducibility,
} from './lib/probe-verdict.mjs';
import {
  ASSEMBLY_DIR,
  BUILD_DIR,
  DIST_DIR,
  FIXTURE_DIR,
  REPO_ROOT,
  RUNTIME_DIR,
  ensureDir,
  fileFingerprint,
  mustRun,
  rmrf,
  run,
  sha256File,
  spawnNdjson,
} from './lib/toolkit.mjs';

/**
 * 反例注入面：落在采集完成、判定之前的观察值上。三枚分别对应报告第十节的三条断言，
 * 也正是 `70e6482` 只用人工叙述、没有任何一处会判红的三条。
 */
/** 换成另一枚合法的 64 位小写 hex——「漂移」要测的是不相等，不是格式非法。 */
const OTHER_VALID_SHA = 'f'.repeat(64);

const COUNTEREXAMPLES = {
  // `default` 档两次 SHA 漂移＝可复现性断言失效。
  'default.sha': (o) => {
    o.seaDefault[0].cycles[1].sha256 = OTHER_VALID_SHA;
    o.seaDefault[0].identical = false;
  },
  // `code-cache` 竟然两次一致＝误报可复现，不许当好消息收。
  'codeCache.identical': (o) => {
    o.seaCodeCache[0].cycles[1].sha256 = o.seaCodeCache[0].cycles[0].sha256;
    o.seaCodeCache[0].identical = true;
  },
  // 跨架构注入没看见 warning＝静默降级，零容忍。
  'crossArch.warning': (o) => {
    o.crossArchCodeCache.warningSeen = false;
    o.crossArchCodeCache.warning = null;
  },
  'sealed.sha': (o) => {
    o.sealedBundles[2].cycles[1].sha256 = OTHER_VALID_SHA;
    o.sealedBundles[2].identical = false;
  },

  // —— R2 新增：SHA 有效性门。四枚分别对应 `f261347` blocker 3 的四种「无效读数」。
  //    R1 的 `deterministic()` 只做 `===`，故 null/null、''/''、占位/占位都能自洽通过。
  'default.shaNull': (o) => {
    for (const row of o.seaDefault) {
      row.cycles[0].sha256 = null;
      row.cycles[1].sha256 = null;
      row.identical = true;
    }
  },
  'default.shaEmpty': (o) => {
    o.seaDefault[0].cycles[0].sha256 = '';
    o.seaDefault[0].cycles[1].sha256 = '';
    o.seaDefault[0].identical = true;
  },
  // 正是 R1 测试 fixture 里那类占位值：像个名字，不是 SHA。
  'default.shaPlaceholder': (o) => {
    o.seaDefault[0].cycles[0].sha256 = 'sea-arm';
    o.seaDefault[0].cycles[1].sha256 = 'sea-arm';
    o.seaDefault[0].identical = true;
  },
  // 大写 hex 不是本判据认的形态（64 位**小写**）。
  'default.shaUppercase': (o) => {
    const upper = o.seaDefault[0].cycles[0].sha256.toUpperCase();
    o.seaDefault[0].cycles[0].sha256 = upper;
    o.seaDefault[0].cycles[1].sha256 = upper;
  },
  // 文件缺失：两份都「不存在」，SHA 自然也没有。
  'default.missingFile': (o) => {
    o.seaDefault[0].cycles = o.seaDefault[0].cycles.map(() => ({
      exists: false,
      regularFile: false,
      bytes: null,
      sha256: null,
    }));
    o.seaDefault[0].identical = true;
  },
  // 零字节成品：SHA 合法且两次相同，但那是空文件，不能算「可复现的产物」。
  'default.zeroBytes': (o) => {
    for (const cycle of o.seaDefault[0].cycles) cycle.bytes = 0;
  },
  // 目录冒充成品：exists 为真但不是 regular file。
  'default.notRegularFile': (o) => {
    for (const cycle of o.seaDefault[0].cycles) cycle.regularFile = false;
  },

  // —— 缺口一：path 没绑库存项。三枚都**保持两枚 fingerprint 完全有效**，
  //    只把坐标换掉——「非空字符串」那种判法对它们零区分力。
  'path.wrongCell': (o) => {
    o.seaDefault[0].path = o.seaDefault[1].path; // 指向另一个合格 cell
  },
  'path.escapesAssembly': (o) => {
    o.seaDefault[0].path = '../outside/pi-sidecar-aarch64-apple-darwin';
  },
  'path.wrongExtension': (o) => {
    // cjs 档的随包件是 sidecar.cjs，这里写成 .mjs。
    o.sealedBundles[2].path = o.sealedBundles[2].path.replace(/\.cjs$/, '.mjs');
  },
};

const argv = process.argv.slice(2);
const ceFlag = argv.indexOf('--counterexample');
const COUNTEREXAMPLE = ceFlag >= 0 ? argv[ceFlag + 1] : null;
if (COUNTEREXAMPLE && !COUNTEREXAMPLES[COUNTEREXAMPLE]) {
  process.stderr.write(`未知反例 ${COUNTEREXAMPLE}；可选：\n${Object.keys(COUNTEREXAMPLES).join('\n')}\n`);
  process.exit(3);
}

/** 跨架构注入的 ready 门。由 R5 契约冻结为 60,000 ms——注入件启动本就比常态慢。 */
const CROSS_ARCH_READY_MS = 60_000;

const SCRIPTS = path.join(FIXTURE_DIR, 'scripts');
const POSTJECT = path.join(REPO_ROOT, 'packages', 'pi-lane', 'node_modules', '.bin', 'postject');
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

/**
 * 被比对的**随包件**在 assembly 内的相对路径。取实际发布的那一份，而不是构建摘要里
 * 自报的 SHA——摘要可能压根没记下 SHA（`f261347` 的 blocker 3 就是两个 `null` 互证）。
 * sealed 三档取 aarch64 那一份随包 bundle；两 triple 的随包件是同一 bundle 的副本。
 */
const SEALED_PATHS = SEALED_VARIANTS.map((variant) => ({
  variant: variant.name,
  path: `route-a/${TARGETS[0].triple}--${variant.name}/sidecar.${variant.extension}`,
}));
const seaPath = (triple, variant) => `route-b/${triple}--${variant}/${SIDECAR_BASENAME}-${triple}`;

/** 跑一个完整 cycle：先清空 assembly 与构建 scratch，再逐支装配，回报本轮实物指纹。 */
function cycle(index) {
  process.stderr.write(`· cycle ${index}：清空 assembly 与 scratch 并重建\n`);
  rmrf(ASSEMBLY_DIR);
  rmrf(BUILD_DIR);
  mustRun(process.execPath, [path.join(SCRIPTS, 'build-sealed.mjs')], { cwd: FIXTURE_DIR });
  mustRun(process.execPath, [path.join(SCRIPTS, 'build-sea.mjs')], { cwd: FIXTURE_DIR });

  // 指纹一律现读磁盘：exists / regular-file / bytes / SHA 四项同源同刻。
  const fingerprint = (relative) => fileFingerprint(path.join(ASSEMBLY_DIR, relative));
  return {
    sealed: Object.fromEntries(SEALED_PATHS.map((entry) => [entry.variant, fingerprint(entry.path)])),
    sea: Object.fromEntries(
      TARGETS.flatMap((target) =>
        ['default', 'code-cache'].map((variant) => [
          `${target.triple}|${variant}`,
          fingerprint(seaPath(target.triple, variant)),
        ]),
      ),
    ),
  };
}

const cycles = [cycle(1), cycle(2)];

const pair = (first, second) => ({
  cycles: [first, second],
  identical: first.sha256 !== null && first.sha256 === second.sha256,
});

const observation = {
  cycles: cycles.length,
  buildPath: FIXTURE_DIR,
  assembly: ASSEMBLY_DIR,
  sealedBundles: SEALED_PATHS.map((entry) => ({
    variant: entry.variant,
    path: entry.path,
    ...pair(cycles[0].sealed[entry.variant], cycles[1].sealed[entry.variant]),
  })),
  seaDefault: TARGETS.map((target) => ({
    triple: target.triple,
    path: seaPath(target.triple, 'default'),
    ...pair(cycles[0].sea[`${target.triple}|default`], cycles[1].sea[`${target.triple}|default`]),
  })),
  seaCodeCache: TARGETS.map((target) => ({
    triple: target.triple,
    path: seaPath(target.triple, 'code-cache'),
    ...pair(cycles[0].sea[`${target.triple}|code-cache`], cycles[1].sea[`${target.triple}|code-cache`]),
  })),
};

// —— 跨架构 code cache：arm64 的 blob 注进 x64 二进制 ————————————————

const crossDir = path.join(DIST_DIR, 'cross-arch');
rmrf(crossDir);
ensureDir(crossDir);

// blob 是构建中间件，住 scratch——它不随包，故不在 assembly 里。
const armBlob = path.join(BUILD_DIR, 'route-b', 'aarch64-apple-darwin--code-cache', 'sea-prep.blob');
const x64Node = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-x64`, 'bin', 'node');

if (!fs.existsSync(armBlob) || !fs.existsSync(x64Node)) {
  observation.crossArchCodeCache = {
    launched: false,
    warningSeen: false,
    warning: null,
    // 缺件也交出可判形状：`launched:false` 已是硬红，这两格不留 undefined。
    exit: { code: null, signal: null },
    timeouts: [],
    reason: !fs.existsSync(armBlob) ? 'arm64-blob-missing' : 'x64-runtime-missing',
  };
} else {
  const executable = path.join(crossDir, `${SIDECAR_BASENAME}-x86_64-apple-darwin`);
  fs.copyFileSync(x64Node, executable);
  fs.chmodSync(executable, 0o755);
  run('codesign', ['--remove-signature', executable]);
  const injected = run(POSTJECT, [
    executable,
    'NODE_SEA_BLOB',
    armBlob,
    '--sentinel-fuse',
    FUSE,
    '--macho-segment-name',
    'NODE_SEA',
  ]);
  run('codesign', ['--sign', '-', executable]);

  // R5 闭口一：ready 门保留 60,000 ms；ready 后发 EOF，退出固定用既有
  // `CRASH_DEADLINES.exitMs`，失败再用 `killConfirmMs` 收束。**不再裸 `await proc.exited`**
  // ——那一处正是「既不 ack 也不退出」时整支 probe 永久挂起的口子（R3 第十三节如实登记过，
  // R5 把它收窄）。三段等待各自超时都写进 `timeouts`，判定侧只接受 `timeouts:[]`。
  const proc = spawnNdjson(executable, []);
  const timeouts = [];
  const ready = await proc.waitFor((packet) => packet.op === 'ready', CROSS_ARCH_READY_MS);
  // 不给初值：两条分支都必赋值，写 `= null` 会被 `no-useless-assignment` 判死赋值。
  let exit;
  if (!ready) {
    timeouts.push('ready');
    exit = await proc.killAndConfirm(CRASH_DEADLINES.killConfirmMs);
    if (!exit) timeouts.push('kill-confirm');
  } else {
    proc.child.stdin.end();
    exit = await proc.waitForExit(CRASH_DEADLINES.exitMs);
    if (!exit) {
      timeouts.push('exit');
      exit = await proc.killAndConfirm(CRASH_DEADLINES.killConfirmMs);
      if (!exit) timeouts.push('kill-confirm');
    }
  }
  const stderr = proc.stderr();

  observation.crossArchCodeCache = {
    injection: 'aarch64 blob → x86_64 binary',
    postjectExit: injected.status,
    executableSha256: sha256File(executable),
    launched: Boolean(ready),
    // 显式携 `{code,signal}`：确认不了退出时也要留下一个可判的形状，不留 undefined。
    exit: exit ?? { code: null, signal: null },
    timeouts,
    // 「照常启动、只在 stderr 留一句」正是静默降级的形状：读数必须逐字锁那一句。
    warningSeen: stderr.includes(CODE_CACHE_REJECT_WARNING),
    warning:
      stderr
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.includes(CODE_CACHE_REJECT_WARNING)) ?? null,
    stderrHead: stderr.split('\n').filter(Boolean).slice(0, 4),
  };
}

let counterexample = null;
if (COUNTEREXAMPLE) {
  const before = JSON.stringify(observation);
  COUNTEREXAMPLES[COUNTEREXAMPLE](observation);
  const applied = JSON.stringify(observation) !== before;
  counterexample = { name: COUNTEREXAMPLE, applied, caught: null };
  if (!applied) counterexample.equivalentMutation = true;
}

const verdict = conclude(verdictReproducibility(observation), {
  probe: 'reproducibility',
  note: 'SEA blob 内含入口绝对路径，byte-identical 只在同一构建路径下成立',
  counterexample,
  ...observation,
});
if (counterexample) counterexample.caught = verdict.status === 'failed';

fs.writeFileSync(path.join(DIST_DIR, 'reproducibility.json'), `${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`\nstatus=${verdict.status} failures=${verdict.failureCount}\n`);
for (const failure of verdict.failures) {
  process.stdout.write(`  ✗ ${failure.id} ${failure.check}: 期望 ${JSON.stringify(failure.expected)}，实测 ${JSON.stringify(failure.observed)}\n`);
}

if (counterexample) {
  process.stdout.write(`反例 ${COUNTEREXAMPLE}：applied=${counterexample.applied} caught=${counterexample.caught}\n`);
  process.exit(counterexample.applied && counterexample.caught ? 2 : 3);
}

if (verdict.status !== 'ok') process.exit(1);
