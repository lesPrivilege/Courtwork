/**
 * PI-SIDECAR-DIST-1 · 路线乙：Node SEA（single executable application）。
 *
 * 官方流程（nodejs.org SEA 文档，Node 22 该特性标 Stability 1.1 Active development）：
 *   1. 备一份**CommonJS** 入口；2. `node --experimental-sea-config` 产 blob；
 *   3. 复制 node 二进制；4. macOS 先 `codesign --remove-signature`；
 *   5. `postject` 注入 `NODE_SEA_BLOB`（`--macho-segment-name NODE_SEA`）；6. 重新签名。
 *
 * 第 1 步是本路线的真实关口：pi core 与 pi-ai 都是 `"type":"module"` 的 ESM，
 * SEA 不收 ESM 入口，故必须整图降编到 CJS。降不下来就是路线级阻断，不是打包参数问题。
 *
 * 两档 blob 都产：默认档与 `useCodeCache`。后者按官方文档与产 blob 的机器架构绑定，
 * 因此跨架构可用性须实测，不能按「配置项打开即可」推断。
 *
 * 用法：`node scripts/build-sea.mjs`
 */

import fs from 'node:fs';
import path from 'node:path';

import * as esbuild from 'esbuild';

import { SEA_STAGES, SEA_VARIANTS, conclude, verdictSeaBuild } from './lib/probe-verdict.mjs';
import {
  BUILD_DIR,
  DIST_DIR,
  FIXTURE_DIR,
  NODE_VERSION,
  REPO_ROOT,
  RUNTIME_DIR,
  SIDECAR_BASENAME,
  TARGETS,
  assemblyRouteDir,
  byteSize,
  ensureDir,
  rmrf,
  run,
  sha256File,
} from './lib/toolkit.mjs';

const ROUTE_DIR = assemblyRouteDir('b-node-sea');
const SCRATCH_DIR = path.join(BUILD_DIR, 'route-b');
const ENTRY = path.join(FIXTURE_DIR, 'scripts', 'sidecar-fixture.mjs');
const POSTJECT = path.join(REPO_ROOT, 'packages', 'pi-lane', 'node_modules', '.bin', 'postject');
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

/**
 * 反例注入面：**真让某个外部阶段失败**，不是改观察值。
 * `--fail-stage <stage>`（可选 `--fail-cell <triple>|<variant>` 限定只坏一格）。
 * 手法一律是给真命令一个必然失败的参数，故走的是真实失败路径：
 * 判据看到的非零退出与 stderr 都是 `codesign`/`postject` 自己吐的。
 */
const argv = process.argv.slice(2);
const flagValue = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
};
const FAIL_STAGE = flagValue('--fail-stage');
const FAIL_CELL = flagValue('--fail-cell');
if (FAIL_STAGE && !SEA_STAGES.includes(FAIL_STAGE)) {
  process.stderr.write(`未知阶段 ${FAIL_STAGE}；可选：${SEA_STAGES.join('、')}\n`);
  process.exit(3);
}
const shouldFail = (triple, variant, stage) =>
  FAIL_STAGE === stage && (FAIL_CELL === null || FAIL_CELL === `${triple}|${variant}`);

/**
 * 物理存在性。**不用 `existsSync`／`-f`**：那只答「有没有一个能 stat 通的常规文件」，
 * 断链 symlink 会被答成「不存在」，目录残留也漏。这里用 `lstat`，
 * file / dir / symlink / FIFO 任何一种都算残留。
 */
const pathPresent = (target) => {
  try {
    fs.lstatSync(target);
    return true;
  } catch {
    return false;
  }
};

rmrf(ROUTE_DIR);
ensureDir(ROUTE_DIR);
rmrf(SCRATCH_DIR);
ensureDir(SCRATCH_DIR);

const summary = { route: 'b-node-sea', node: NODE_VERSION, bundle: null, variants: [] };

// —— 第 1 步：ESM 整图 → CJS。失败即路线阻断，如实记 message 全文。
// 入口 CJS 住 scratch：它是构建输入，不随包。
const cjsFile = path.join(SCRATCH_DIR, 'sidecar.cjs');
try {
  const result = await esbuild.build({
    entryPoints: [ENTRY],
    outfile: cjsFile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    minify: true,
    sourcemap: false,
    metafile: true,
    logLevel: 'silent',
  });
  summary.bundle = {
    format: 'cjs',
    bytes: byteSize(cjsFile),
    sha256: sha256File(cjsFile),
    inputs: Object.keys(result.metafile.inputs).length,
    warnings: result.warnings.map((warning) => warning.text),
  };
} catch (cause) {
  summary.bundle = {
    format: 'cjs',
    failed: true,
    message: cause instanceof Error ? cause.message : String(cause),
    errors: (cause?.errors ?? []).map((error) => ({
      text: error.text,
      file: error.location?.file ?? null,
      line: error.location?.line ?? null,
      note: error.notes?.[0]?.text ?? null,
    })),
  };
  summary.status = 'failed';
  fs.writeFileSync(path.join(DIST_DIR, 'build-sea.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  // 降编不下来是路线级阻断，不是「也算一种数据」：非零退出。
  process.exit(1);
}

/** 档位取自库存闭集，不再另写一份。 */
const VARIANTS = SEA_VARIANTS;

for (const target of TARGETS) {
  const hostNode = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-${target.nodeArch}`, 'bin', 'node');
  if (!fs.existsSync(hostNode)) {
    summary.variants.push({ triple: target.triple, status: 'blocked', reason: 'runtime-missing' });
    continue;
  }

  for (const variant of VARIANTS) {
    // scratch 里放 config/blob/staging；assembly 里最终只落一件 executable。
    const workDir = path.join(SCRATCH_DIR, `${target.triple}--${variant.name}`);
    rmrf(workDir);
    ensureDir(workDir);
    const publishDir = path.join(ROUTE_DIR, `${target.triple}--${variant.name}`);
    // 每格开工先清掉旧成品：任一阶段失败时 assembly 里零该 variant 件，
    // 「先成功后失败」也就不可能复用上一轮的 stale executable。
    rmrf(publishDir);
    const configFile = path.join(workDir, 'sea-config.json');
    const blobFile = path.join(workDir, 'sea-prep.blob');
    fs.writeFileSync(
      configFile,
      `${JSON.stringify(
        { main: cjsFile, output: blobFile, disableExperimentalSEAWarning: true, useCodeCache: variant.useCodeCache },
        null,
        2,
      )}\n`,
    );

    // blob 由**目标架构的** node 产出：x86_64 在本机经 Rosetta 2 执行。
    const blob = run(hostNode, ['--experimental-sea-config', configFile], { cwd: workDir });
    if (blob.status !== 0 || !fs.existsSync(blobFile)) {
      summary.variants.push({
        triple: target.triple,
        variant: variant.name,
        status: 'failed',
        stage: 'sea-config',
        exit: blob.status,
        stderr: blob.stderr.trim().slice(0, 1200),
      });
      continue;
    }

    // —— 干净 staging：copy → remove-signature → postject → ad-hoc sign → strict verify → publish。
    //    四个外部阶段逐个记 exit/stderr，任一非零就此打住，**不发布**。
    const staging = path.join(workDir, 'staging');
    rmrf(staging);
    ensureDir(staging);
    const staged = path.join(staging, `${SIDECAR_BASENAME}-${target.triple}`);
    fs.copyFileSync(hostNode, staged);
    fs.chmodSync(staged, 0o755);

    const stages = {};
    const record = (name, result) => {
      stages[name] = {
        exit: result.status,
        stderr: (result.stderr || result.stdout || '').trim().slice(0, 1200),
      };
      return result.status === 0;
    };

    // 反例注入点：给真命令一个必然失败的实参，走的仍是真实失败路径。
    const missing = path.join(staging, 'no-such-file-for-counterexample');
    const failed = (() => {
      if (!record('removeSignature', run('codesign', [
        '--remove-signature',
        shouldFail(target.triple, variant.name, 'removeSignature') ? missing : staged,
      ]))) return 'removeSignature';

      if (!record('postject', run(POSTJECT, [
        staged,
        'NODE_SEA_BLOB',
        shouldFail(target.triple, variant.name, 'postject') ? missing : blobFile,
        '--sentinel-fuse',
        FUSE,
        '--macho-segment-name',
        'NODE_SEA',
      ]))) return 'postject';

      // 开发态 ad-hoc 签名。这**不是** Developer ID，也未公证——差别属 PI-SIDECAR-RELEASE-1。
      if (!record('sign', run('codesign', [
        '--force',
        '--sign',
        shouldFail(target.triple, variant.name, 'sign') ? 'no-such-signing-identity-for-counterexample' : '-',
        staged,
      ]))) return 'sign';

      // 注入 verify 失败的手法：签完之后截去一字节，签名与内容对不上，
      // `--verify --strict` 于是真的非零——这正是「签完还得逐件复验」要拦的形状。
      if (shouldFail(target.triple, variant.name, 'verifyStrict')) {
        const handle = fs.openSync(staged, 'r+');
        fs.ftruncateSync(handle, byteSize(staged) - 1);
        fs.closeSync(handle);
      }
      if (!record('verifyStrict', run('codesign', ['--verify', '--strict', staged]))) return 'verifyStrict';
      return null;
    })();

    if (failed) {
      // staging 连同半成品一起丢弃：assembly 里本就没有它，磁盘上也不留。
      rmrf(staging);
      summary.variants.push({
        triple: target.triple,
        variant: variant.name,
        status: 'failed',
        stage: failed,
        stages,
        published: false,
        publishedPath: null,
        // 物理复核，不是 `-f`：整个 publishDir 用 `lstat` 问一遍，
        // file / dir / symlink 任何一种存在都算残留。
        publishDirPresent: pathPresent(publishDir),
        stagingPresent: pathPresent(staging),
      });
      continue;
    }

    // 全过才发布：整目录 rename 进 assembly，原子且不经过「半个目录」的中间态。
    ensureDir(path.dirname(publishDir));
    fs.renameSync(staging, publishDir);
    const executable = path.join(publishDir, `${SIDECAR_BASENAME}-${target.triple}`);

    summary.variants.push({
      triple: target.triple,
      variant: variant.name,
      status: 'ok',
      stage: null,
      stages,
      published: true,
      publishedPath: path.relative(DIST_DIR, executable),
      publishDirPresent: pathPresent(publishDir),
      stagingPresent: pathPresent(staging),
      executable,
      blobBytes: byteSize(blobFile),
      executableBytes: byteSize(executable),
      executableSha256: sha256File(executable),
      shippedBytes: byteSize(executable),
      codesign: run('codesign', ['-dv', '--verbose=2', executable]).stderr.trim().split('\n').slice(0, 6),
      macho: run('file', ['-b', executable]).stdout.trim(),
    });
  }
}

summary.expectedVariants = TARGETS.length * VARIANTS.length;

// 判定住 shared verdict：四阶段与 `published` 由 `verdictSeaBuild` 统一判，
// 本文件不再自算 `status`——`f261347` 拒绝的正是「收了退出码却不让它决定状态」。
const verdict = conclude(verdictSeaBuild(summary), { probe: 'build-sea', ...summary });
fs.writeFileSync(path.join(DIST_DIR, 'build-sea.json'), `${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`\nstatus=${verdict.status} failures=${verdict.failureCount}\n`);
for (const failure of verdict.failures) {
  process.stdout.write(`  ✗ ${failure.id} ${failure.check}: 期望 ${JSON.stringify(failure.expected)}，实测 ${JSON.stringify(failure.observed)}\n`);
}
if (verdict.status !== 'ok') process.exit(1);
