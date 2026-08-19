/**
 * PI-BASE-GUI-ACCEPT-PACKAGE-1 · packaged Route A direct test.
 *
 * 只接受验收/实现命令显式提供的最终 `.app`，不启动应用、不读取任何凭证。
 * `COURTWORK_PACKAGED_APP` 未提供时跳过；提供后会把包内 runtime 的物理
 * bytes/SHA 与同包 route manifest、tracked manifest 逐字核对。
 *
 * 用法：
 *   COURTWORK_PACKAGED_APP=/path/to/Courtwork.app \
 *     node --test apps/desktop/scripts/assert-pi-route-package.test.mjs
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const TRACKED_MANIFEST = path.join(
  REPO_ROOT,
  'apps/desktop/src-tauri/pi-sidecar/route-manifest.json',
);
const PACKAGED_APP = process.env.COURTWORK_PACKAGED_APP;
const RESOURCE_RELATIVE_DIR = path.join('Contents', 'Resources', 'pi-loop-resources');
const RUNTIME_BASENAME = 'pi-sidecar';

function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function requireRegularFile(file, label) {
  const stat = fs.lstatSync(file);
  assert.equal(stat.isSymbolicLink(), false, `${label} 不得是 symlink`);
  assert.equal(stat.isFile(), true, `${label} 必须是 regular file`);
  assert.ok(stat.size > 0, `${label} 必须为正字节`);
  return stat;
}

function targetTripleForHost() {
  if (process.platform !== 'darwin') {
    throw new Error(`direct packaging test 只接受 macOS，当前平台为 ${process.platform}`);
  }
  if (process.arch === 'arm64') return 'aarch64-apple-darwin';
  if (process.arch === 'x64') return 'x86_64-apple-darwin';
  throw new Error(`不支持的 macOS process.arch：${process.arch}`);
}

test(
  '最终 packaged runtime 与 tracked route manifest exact-match',
  { skip: !PACKAGED_APP },
  () => {
    const app = path.resolve(PACKAGED_APP);
    const packagedManifestPath = path.join(app, 'Contents', 'Resources', 'pi-loop-resources', 'route-manifest.json');
    const runtimePath = path.join(app, 'Contents', 'MacOS', RUNTIME_BASENAME);

    requireRegularFile(packagedManifestPath, '包内 route manifest');
    const runtimeStat = requireRegularFile(runtimePath, '包内 runtime');
    const trackedManifestBytes = fs.readFileSync(TRACKED_MANIFEST);
    const packagedManifestBytes = fs.readFileSync(packagedManifestPath);
    assert.deepEqual(
      packagedManifestBytes,
      trackedManifestBytes,
      '包内 route manifest 必须与 tracked manifest byte-identical',
    );

    const manifest = JSON.parse(packagedManifestBytes.toString('utf8'));
    const targetTriple = targetTripleForHost();
    const target = manifest.targets.find((candidate) => candidate.targetTriple === targetTriple);
    assert.ok(target, `manifest 缺少当前 target ${targetTriple}`);

    const observed = {
      bytes: runtimeStat.size,
      sha256: sha256File(runtimePath),
    };
    assert.deepEqual(
      observed,
      {
        bytes: target.runtime.bytes,
        sha256: target.runtime.sha256,
      },
      '最终 packaged runtime 必须与 manifest runtime exact-match',
    );

    assert.equal(manifest.bundle.resourceRelativePath, 'pi-loop-resources/sidecar.cjs');
    const bundlePath = path.join(app, 'Contents', 'Resources', RESOURCE_RELATIVE_DIR, 'sidecar.cjs');
    const bundleStat = requireRegularFile(bundlePath, '包内 sidecar.cjs');
    assert.equal(bundleStat.size, manifest.bundle.bytes);
    assert.equal(sha256File(bundlePath), manifest.bundle.sha256);
  },
);
