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

import { SEA_VARIANTS } from './lib/probe-verdict.mjs';
import {
  DIST_DIR,
  FIXTURE_DIR,
  NODE_VERSION,
  REPO_ROOT,
  RUNTIME_DIR,
  SIDECAR_BASENAME,
  TARGETS,
  byteSize,
  ensureDir,
  rmrf,
  run,
  sha256File,
} from './lib/toolkit.mjs';

const ROUTE_DIR = path.join(DIST_DIR, 'route-b');
const ENTRY = path.join(FIXTURE_DIR, 'scripts', 'sidecar-fixture.mjs');
const POSTJECT = path.join(REPO_ROOT, 'packages', 'pi-lane', 'node_modules', '.bin', 'postject');
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

rmrf(ROUTE_DIR);
ensureDir(ROUTE_DIR);

const summary = { route: 'b-node-sea', node: NODE_VERSION, bundle: null, variants: [] };

// —— 第 1 步：ESM 整图 → CJS。失败即路线阻断，如实记 message 全文。
const cjsFile = path.join(ROUTE_DIR, 'sidecar.cjs');
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
    const workDir = path.join(ROUTE_DIR, `${target.triple}--${variant.name}`);
    ensureDir(workDir);
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

    const executable = path.join(workDir, `${SIDECAR_BASENAME}-${target.triple}`);
    fs.copyFileSync(hostNode, executable);
    fs.chmodSync(executable, 0o755);

    const removed = run('codesign', ['--remove-signature', executable]);
    const injected = run(POSTJECT, [
      executable,
      'NODE_SEA_BLOB',
      blobFile,
      '--sentinel-fuse',
      FUSE,
      '--macho-segment-name',
      'NODE_SEA',
    ]);
    if (injected.status !== 0) {
      summary.variants.push({
        triple: target.triple,
        variant: variant.name,
        status: 'failed',
        stage: 'postject',
        exit: injected.status,
        stderr: (injected.stderr || injected.stdout).trim().slice(0, 1200),
      });
      continue;
    }

    // 开发态 ad-hoc 签名。这**不是** Developer ID，也未公证——两者的差别属 PI-SIDECAR-RELEASE-1。
    const signed = run('codesign', ['--sign', '-', executable]);

    summary.variants.push({
      triple: target.triple,
      variant: variant.name,
      status: 'ok',
      executable,
      blobBytes: byteSize(blobFile),
      executableBytes: byteSize(executable),
      executableSha256: sha256File(executable),
      shippedBytes: byteSize(executable),
      removeSignatureExit: removed.status,
      signExit: signed.status,
      codesign: run('codesign', ['-dv', '--verbose=2', executable]).stderr.trim().split('\n').slice(0, 6),
      codesignVerify: run('codesign', ['--verify', '--strict', executable]).status,
      macho: run('file', ['-b', executable]).stdout.trim(),
    });
  }
}

summary.expectedVariants = TARGETS.length * VARIANTS.length;
summary.status =
  summary.variants.filter((variant) => variant.status === 'ok').length === summary.expectedVariants
    ? 'ok'
    : 'failed';

fs.writeFileSync(path.join(DIST_DIR, 'build-sea.json'), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== 'ok') process.exit(1);
