/**
 * PI-SIDECAR-DIST-1 · 路线甲：Node 22 LTS runtime + sealed JS bundle。
 *
 * 装配形态按 Tauri `bundle.externalBin`：产物名必须是 `<name>-<target-triple>`，
 * Tauri 打包时只挑与目标 triple 相符的那一枚复制进 `Contents/MacOS/<name>`。
 * 本路线的 externalBin 是**官方 Node 二进制改名**，sealed bundle 是它的入参——
 * 故这条路线天然是两件产物，报告须如实记这笔装配代价，不能只报一个体积数。
 *
 * 三档 bundle 都产，因为「打得出来」不等于「跑得起来」（本票实测教训）：
 * - `esm-naive`：最直觉的 `format:'esm'`。esbuild **零 warning 打包成功，但运行即死**——
 *   `yaml@2.9.0`（pi core 的直接依赖）是 CJS 且 `require("process")`，
 *   esbuild 在 ESM 产物里把它降成 `__require()` 抛错垫片。留档作可复现红证。
 * - `esm-createrequire`：同上加 `createRequire(import.meta.url)` banner，喂活那道垫片。
 * - `cjs`：直接产 CJS，`require` 是原生的，不需要垫片；与路线乙同格式，便于同条件对比。
 *
 * 用法：`node scripts/build-sealed.mjs`
 */

import fs from 'node:fs';
import path from 'node:path';

import * as esbuild from 'esbuild';

import { SEALED_VARIANTS } from './lib/probe-verdict.mjs';
import {
  DIST_DIR,
  FIXTURE_DIR,
  NODE_VERSION,
  RUNTIME_DIR,
  SIDECAR_BASENAME,
  TARGETS,
  byteSize,
  ensureDir,
  rmrf,
  run,
  sha256File,
} from './lib/toolkit.mjs';

const ROUTE_DIR = path.join(DIST_DIR, 'route-a');
const ENTRY = path.join(FIXTURE_DIR, 'scripts', 'sidecar-fixture.mjs');

/** esbuild 官方给 ESM 产物补 CJS `require` 的做法；不是自研垫片。 */
const CREATE_REQUIRE_BANNER = [
  "import { createRequire as __cwCreateRequire } from 'node:module';",
  'const require = __cwCreateRequire(import.meta.url);',
].join('\n');

/** 档位与身份取自库存闭集；本文件只补各档的打包参数，不再另写一份档位表。 */
const BANNERS = { 'esm-createrequire': CREATE_REQUIRE_BANNER };
const VARIANTS = SEALED_VARIANTS.map((variant) => ({ ...variant, banner: BANNERS[variant.name] ?? null }));

rmrf(ROUTE_DIR);
ensureDir(ROUTE_DIR);

async function bundle(variant, minify) {
  // 中间件名带 variant，避免三档互相覆盖；`cjs` 档的 name 与 extension 同名，去重一次。
  const stem = variant.name === variant.extension ? 'sidecar' : `sidecar.${variant.name}`;
  const outfile = path.join(ROUTE_DIR, `${stem}${minify ? '.min' : ''}.${variant.extension}`);
  const result = await esbuild.build({
    entryPoints: [ENTRY],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: variant.format,
    minify,
    sourcemap: false,
    metafile: true,
    logLevel: 'silent',
    ...(variant.banner ? { banner: { js: variant.banner } } : {}),
  });
  return {
    outfile,
    bytes: byteSize(outfile),
    sha256: sha256File(outfile),
    inputs: Object.keys(result.metafile.inputs).length,
    warnings: result.warnings.map((warning) => warning.text),
  };
}

const summary = { route: 'a-sealed-bundle', node: NODE_VERSION, bundles: {}, targets: [] };

for (const variant of VARIANTS) {
  summary.bundles[variant.name] = {};
  for (const minify of [false, true]) {
    const key = minify ? 'minified' : 'plain';
    try {
      summary.bundles[variant.name][key] = await bundle(variant, minify);
    } catch (cause) {
      summary.bundles[variant.name][key] = {
        failed: true,
        message: cause instanceof Error ? cause.message : String(cause),
      };
    }
  }
}

for (const target of TARGETS) {
  const source = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-${target.nodeArch}`, 'bin', 'node');
  if (!fs.existsSync(source)) {
    summary.targets.push({ triple: target.triple, status: 'blocked', reason: 'runtime-missing' });
    continue;
  }

  for (const variant of VARIANTS) {
    const built = summary.bundles[variant.name].minified;
    if (!built || built.failed) continue;
    const targetDir = path.join(ROUTE_DIR, `${target.triple}--${variant.name}`);
    ensureDir(targetDir);

    // externalBin 形态：官方 node 原样改名，不改一个字节。
    const executable = path.join(targetDir, `${SIDECAR_BASENAME}-${target.triple}`);
    fs.copyFileSync(source, executable);
    fs.chmodSync(executable, 0o755);

    // 随行 bundle：Tauri 侧须另走 `bundle.resources`（或第二条 externalBin），本票只记形态与体积。
    const carried = path.join(targetDir, `sidecar.${variant.extension}`);
    fs.copyFileSync(built.outfile, carried);

    summary.targets.push({
      triple: target.triple,
      variant: variant.name,
      status: 'ok',
      executable,
      executableBytes: byteSize(executable),
      executableSha256: sha256File(executable),
      carriedBundle: carried,
      carriedBundleBytes: byteSize(carried),
      carriedBundleSha256: sha256File(carried),
      shippedBytes: byteSize(executable) + byteSize(carried),
      // 改名不动 Mach-O 字节，官方签名理应仍验得过；实测记录之。
      codesign: run('codesign', ['-dv', '--verbose=2', executable]).stderr.trim().split('\n').slice(0, 6),
      codesignVerify: run('codesign', ['--verify', '--strict', executable]).status,
      macho: run('file', ['-b', executable]).stdout.trim(),
    });
  }
}

// 装配失败不得静默：少一件产物会在 `measure.mjs` 的库存闭集处判红，但那时已浪费一整轮。
// 这里就地拦下，且把 blocked 与 build failure 一起算成非零。
const blocked = summary.targets.filter((target) => target.status !== 'ok');
const brokenBundles = Object.entries(summary.bundles).filter(([, forms]) => forms.minified?.failed);
summary.status = blocked.length === 0 && brokenBundles.length === 0 ? 'ok' : 'failed';
summary.expectedTargets = TARGETS.length * VARIANTS.length;
if (summary.targets.filter((target) => target.status === 'ok').length !== summary.expectedTargets) {
  summary.status = 'failed';
}

fs.writeFileSync(path.join(DIST_DIR, 'build-sealed.json'), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== 'ok') process.exit(1);
