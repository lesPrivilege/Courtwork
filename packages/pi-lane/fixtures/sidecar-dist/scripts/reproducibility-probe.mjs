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
  NODE_VERSION,
  SEALED_VARIANTS,
  SIDECAR_BASENAME,
  TARGETS,
  conclude,
  verdictReproducibility,
} from './lib/probe-verdict.mjs';
import {
  DIST_DIR,
  FIXTURE_DIR,
  REPO_ROOT,
  RUNTIME_DIR,
  ensureDir,
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
const COUNTEREXAMPLES = {
  // `default` 档两次 SHA 漂移＝可复现性断言失效。
  'default.sha': (o) => {
    o.seaDefault[0].shas[1] = `${o.seaDefault[0].shas[1]}-drifted`;
    o.seaDefault[0].identical = false;
  },
  // `code-cache` 竟然两次一致＝误报可复现，不许当好消息收。
  'codeCache.identical': (o) => {
    o.seaCodeCache[0].shas[1] = o.seaCodeCache[0].shas[0];
    o.seaCodeCache[0].identical = true;
  },
  // 跨架构注入没看见 warning＝静默降级，零容忍。
  'crossArch.warning': (o) => {
    o.crossArchCodeCache.warningSeen = false;
    o.crossArchCodeCache.warning = null;
  },
  'sealed.sha': (o) => {
    o.sealedBundles[2].shas[1] = `${o.sealedBundles[2].shas[1]}-drifted`;
    o.sealedBundles[2].identical = false;
  },
};

const argv = process.argv.slice(2);
const ceFlag = argv.indexOf('--counterexample');
const COUNTEREXAMPLE = ceFlag >= 0 ? argv[ceFlag + 1] : null;
if (COUNTEREXAMPLE && !COUNTEREXAMPLES[COUNTEREXAMPLE]) {
  process.stderr.write(`未知反例 ${COUNTEREXAMPLE}；可选：\n${Object.keys(COUNTEREXAMPLES).join('\n')}\n`);
  process.exit(3);
}

const SCRIPTS = path.join(FIXTURE_DIR, 'scripts');
const POSTJECT = path.join(REPO_ROOT, 'packages', 'pi-lane', 'node_modules', '.bin', 'postject');
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

/** 跑一个完整 cycle：先清空两条 route 目录，再逐支装配，回报本轮全部 SHA。 */
function cycle(index) {
  process.stderr.write(`· cycle ${index}：清空 route 目录并重建\n`);
  rmrf(path.join(DIST_DIR, 'route-a'));
  rmrf(path.join(DIST_DIR, 'route-b'));
  mustRun(process.execPath, [path.join(SCRIPTS, 'build-sealed.mjs')], { cwd: FIXTURE_DIR });
  mustRun(process.execPath, [path.join(SCRIPTS, 'build-sea.mjs')], { cwd: FIXTURE_DIR });

  const sealed = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'build-sealed.json'), 'utf8'));
  const sea = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'build-sea.json'), 'utf8'));
  return {
    sealedMinified: Object.fromEntries(
      SEALED_VARIANTS.map((variant) => [variant.name, sealed.bundles[variant.name].minified.sha256]),
    ),
    seaExecutables: Object.fromEntries(
      sea.variants.map((entry) => [`${entry.triple}|${entry.variant}`, entry.executableSha256 ?? null]),
    ),
  };
}

const cycles = [cycle(1), cycle(2)];

const pair = (first, second) => ({ shas: [first, second], identical: first === second });

const observation = {
  cycles: cycles.length,
  buildPath: FIXTURE_DIR,
  sealedBundles: SEALED_VARIANTS.map((variant) => ({
    variant: variant.name,
    ...pair(cycles[0].sealedMinified[variant.name], cycles[1].sealedMinified[variant.name]),
  })),
  seaDefault: TARGETS.map((target) => ({
    triple: target.triple,
    ...pair(cycles[0].seaExecutables[`${target.triple}|default`], cycles[1].seaExecutables[`${target.triple}|default`]),
  })),
  seaCodeCache: TARGETS.map((target) => ({
    triple: target.triple,
    ...pair(
      cycles[0].seaExecutables[`${target.triple}|code-cache`],
      cycles[1].seaExecutables[`${target.triple}|code-cache`],
    ),
  })),
};

// —— 跨架构 code cache：arm64 的 blob 注进 x64 二进制 ————————————————

const crossDir = path.join(DIST_DIR, 'cross-arch');
rmrf(crossDir);
ensureDir(crossDir);

const armBlob = path.join(DIST_DIR, 'route-b', 'aarch64-apple-darwin--code-cache', 'sea-prep.blob');
const x64Node = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-x64`, 'bin', 'node');

if (!fs.existsSync(armBlob) || !fs.existsSync(x64Node)) {
  observation.crossArchCodeCache = {
    launched: false,
    warningSeen: false,
    warning: null,
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

  const proc = spawnNdjson(executable, []);
  const ready = await proc.waitFor((packet) => packet.op === 'ready', 60_000);
  if (ready) proc.child.stdin.end();
  else proc.child.kill('SIGKILL');
  const exit = await proc.exited;
  const stderr = proc.stderr();

  observation.crossArchCodeCache = {
    injection: 'aarch64 blob → x86_64 binary',
    postjectExit: injected.status,
    executableSha256: sha256File(executable),
    launched: Boolean(ready),
    exit,
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
