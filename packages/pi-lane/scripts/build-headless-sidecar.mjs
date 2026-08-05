/**
 * PI-HEADLESS-HARNESS-1 组件B · headless 合成 sidecar 的 bundle 生成器（dev/acceptance-only）。
 *
 * 复用 production snapshot 生成器**同一份** esbuild 配方（`buildDeterministicBundle` /
 * `bundleOptions`，从 `build-product-sidecar.mjs` 导入），只把 entry 换成 headless 入口，
 * outfile 换成一枚**独立**制品——production 的 `sidecar.cjs`、route-manifest 与 sealed CJS
 * 身份表一字未碰。产出落在 ignored 的 `dist/headless-sidecar/headless-sidecar.cjs`，
 * 由 Rust 侧 headless harness（`for_lifecycle_test` pair）以冻结 Node runtime 拉起。
 *
 * 与 production 门的唯一交集是 esbuild 配方；身份、下载、fsync-then-rename 那套只属 production。
 * 本 bundle 不进任何冻结 manifest，不宣称任何供应链身份——它只是一枚可跑的合成件。
 *
 * 用法：`pnpm --filter @courtwork/pi-lane build:headless-sidecar`
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { buildDeterministicBundle, DIST_DIR, PACKAGE_ROOT, sha256Of } from './build-product-sidecar.mjs';

export const HEADLESS_ENTRY = path.join(PACKAGE_ROOT, 'headless', 'headless-main.ts');
export const HEADLESS_DIR = path.join(DIST_DIR, 'headless-sidecar');
export const HEADLESS_BUNDLE = path.join(HEADLESS_DIR, 'headless-sidecar.cjs');
export const HEADLESS_BUILD_DIR = path.join(DIST_DIR, 'headless-sidecar-build');

export async function main() {
  fs.mkdirSync(HEADLESS_DIR, { recursive: true });
  const bundle = await buildDeterministicBundle({
    entryPoint: HEADLESS_ENTRY,
    scratchDir: HEADLESS_BUILD_DIR,
  });
  fs.writeFileSync(HEADLESS_BUNDLE, bundle.content);
  const report = {
    entry: HEADLESS_ENTRY,
    bundle: HEADLESS_BUNDLE,
    bytes: bundle.bytes,
    sha256: bundle.sha256,
    reproducible: bundle.reproducible,
    // 自证：落盘后重算 SHA 与内存一致，杜绝「大概一样」。
    landedSha256: sha256Of(fs.readFileSync(HEADLESS_BUNDLE)),
  };
  if (report.landedSha256 !== report.sha256) {
    throw new Error('headless bundle 落盘后 SHA 漂移，拒绝产出');
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report;
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await main().catch((cause) => {
    process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exit(1);
  });
}
