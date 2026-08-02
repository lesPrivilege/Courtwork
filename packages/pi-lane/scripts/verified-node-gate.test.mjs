/**
 * PI-HOST-LOOP-1R2 C4（独立复验 `427f4fa` 的 Blocker 4，三类注入转常驻）。
 *
 * 门 3/4 存在的理由是「证明本次跑的就是那枚冻结二进制」。1R 的 resolver 对 sealed CJS
 * 核 bytes+SHA，却对 runtime 只比 bytes；`requireFile()` 又用跟随 symlink 的 `statSync()`；
 * manifest 只被取出三四个字段，其余删改不问。于是三类篡改下门仍 10/10 exit 0。
 *
 * 反例一律注入**合成** app-layout：真实 snapshot 是 ignored 的 112 MiB 实物，
 * 「变异真实快照再还原」是验收会话的手法，常驻测试不得靠它维持。
 * 合成层里被判的是 manifest 与实物，判据是注入的冻结描述子——两者不同源。
 * 末尾另有一枚**不注入**的阳性对照：production 默认坐标（真 manifest + 真 snapshot）
 * 必须解析成功，否则上面全部反例都是恒红。
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  BUNDLE_BASENAME,
  RESOURCE_DIR_BASENAME,
  SIDECAR_BASENAME,
  SNAPSHOT_DIR,
} from './build-product-sidecar.mjs';
import { FROZEN_ROUTE, GateFailure, MANIFEST_FILE, resolveVerifiedRoute } from './verified-node-gate.mjs';

const TRIPLE = 'aarch64-apple-darwin';
const OTHER_TRIPLE = 'x86_64-apple-darwin';
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/** 合成 runtime 与 CJS：内容固定、可复算，不碰真实快照。 */
const RUNTIME_BYTES = Buffer.from('合成 runtime 实物：本枚只为让 resolver 有东西可核。\n', 'utf8');
const BUNDLE_BYTES = Buffer.from('合成 sealed CJS：同上。\n', 'utf8');

/** 合成冻结描述子。判据侧固定不动，注入只改被判的 manifest 或实物。 */
function syntheticFrozen() {
  return {
    schemaVersion: 1,
    routeId: 'synthetic-route-v1',
    nodeVersion: '22.23.1',
    useCodeCache: false,
    bundle: { resourceRelativePath: `${RESOURCE_DIR_BASENAME}/${BUNDLE_BASENAME}` },
    targets: [TRIPLE, OTHER_TRIPLE].map((targetTriple) => ({
      targetTriple,
      machoArch: targetTriple === TRIPLE ? 'arm64' : 'x86_64',
      sourceArchive: {
        filename: `synthetic-${targetTriple}.tar.gz`,
        bytes: 11,
        sha256: sha256(Buffer.from(`archive-${targetTriple}`, 'utf8')),
      },
      runtime: {
        externalBinBasename: SIDECAR_BASENAME,
        bytes: RUNTIME_BYTES.byteLength,
        sha256: sha256(RUNTIME_BYTES),
      },
    })),
  };
}

/** 由冻结描述子铺一层与之逐值相符的 app-layout。 */
function layout() {
  const root = mkdtempSync(path.join(tmpdir(), 'pi-verified-node-gate-test-'));
  const snapshotDir = path.join(root, 'product-sidecar');
  fs.mkdirSync(snapshotDir);
  const frozen = syntheticFrozen();
  const runtime = path.join(snapshotDir, `${SIDECAR_BASENAME}-${TRIPLE}`);
  fs.writeFileSync(runtime, RUNTIME_BYTES);
  fs.writeFileSync(path.join(snapshotDir, BUNDLE_BASENAME), BUNDLE_BYTES);

  const manifestFile = path.join(root, 'route-manifest.json');
  const manifest = {
    schemaVersion: frozen.schemaVersion,
    routeId: frozen.routeId,
    nodeVersion: frozen.nodeVersion,
    useCodeCache: frozen.useCodeCache,
    bundle: {
      resourceRelativePath: frozen.bundle.resourceRelativePath,
      bytes: BUNDLE_BYTES.byteLength,
      sha256: sha256(BUNDLE_BYTES),
    },
    targets: frozen.targets.map((target) => ({
      targetTriple: target.targetTriple,
      machoArch: target.machoArch,
      sourceArchive: { ...target.sourceArchive },
      runtime: { ...target.runtime },
    })),
  };
  const writeManifest = (value) =>
    fs.writeFileSync(manifestFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  writeManifest(manifest);

  return {
    root,
    runtime,
    manifest,
    writeManifest,
    resolve: () => resolveVerifiedRoute({ snapshotDir, manifestFile, frozen, triple: TRIPLE }),
  };
}

function expectGateFailure(fixture, what) {
  assert.throws(
    () => fixture.resolve(),
    (error) => {
      assert.ok(error instanceof GateFailure, `${what} 须以 GateFailure 停下，实得 ${error}`);
      return true;
    },
    what,
  );
}

test('对照：未经注入的合成 app-layout 必须解析通过', () => {
  const fixture = layout();
  const route = fixture.resolve();
  assert.equal(route.triple, TRIPLE);
  assert.equal(route.bundleSha, sha256(BUNDLE_BYTES));
});

test('注入一：runtime 尾字节 XOR——尺寸不变、SHA 已漂移，门必须红', () => {
  const fixture = layout();
  const before = fs.readFileSync(fixture.runtime);
  const after = Buffer.from(before);
  after[after.length - 1] ^= 0xff;
  fs.writeFileSync(fixture.runtime, after);

  // 篡改后尺寸逐字节相同——1R 只比 bytes，故这一枚正是它放行的那一形态。
  assert.equal(fs.statSync(fixture.runtime).size, before.byteLength);
  assert.notEqual(sha256(after), sha256(before));
  expectGateFailure(fixture, 'runtime 尾字节 XOR');
});

test('注入二：runtime 换成 symlink——即便指向同 bytes，门也必须红', () => {
  const fixture = layout();
  const real = path.join(fixture.root, 'real-runtime');
  fs.writeFileSync(real, RUNTIME_BYTES);
  fs.rmSync(fixture.runtime);
  fs.symlinkSync(real, fixture.runtime);

  // 跟随 symlink 的 statSync 看到的是「非空 regular file、尺寸对、SHA 也对」。
  assert.equal(fs.statSync(fixture.runtime).size, RUNTIME_BYTES.byteLength);
  assert.ok(fs.lstatSync(fixture.runtime).isSymbolicLink());
  expectGateFailure(fixture, 'runtime 是 symlink');
});

test('注入三：manifest 冻结字段删改——逐字段都必须红', () => {
  const drifts = [
    ['删 schemaVersion', (manifest) => delete manifest.schemaVersion],
    ['改 schemaVersion', (manifest) => (manifest.schemaVersion = 2)],
    ['删 routeId', (manifest) => delete manifest.routeId],
    ['改 routeId', (manifest) => (manifest.routeId = 'node22-runtime-sealed-cjs-v2')],
    ['删 nodeVersion', (manifest) => delete manifest.nodeVersion],
    ['改 nodeVersion', (manifest) => (manifest.nodeVersion = '22.23.2')],
    ['删 useCodeCache', (manifest) => delete manifest.useCodeCache],
    ['改 useCodeCache', (manifest) => (manifest.useCodeCache = true)],
    ['删 bundle.resourceRelativePath', (manifest) => delete manifest.bundle.resourceRelativePath],
    [
      '改 bundle.resourceRelativePath',
      (manifest) => (manifest.bundle.resourceRelativePath = `${SIDECAR_BASENAME}/${BUNDLE_BASENAME}`),
    ],
    ['删掉另一枚 target 行', (manifest) => manifest.targets.splice(1, 1)],
    [
      '改 target.machoArch',
      (manifest) => (manifest.targets.find((row) => row.targetTriple === TRIPLE).machoArch = 'x86_64'),
    ],
    [
      '改 target.runtime.externalBinBasename',
      (manifest) =>
        (manifest.targets.find((row) => row.targetTriple === TRIPLE).runtime.externalBinBasename =
          'pi-sidecar-2'),
    ],
    [
      '改 target.sourceArchive.sha256',
      (manifest) =>
        (manifest.targets.find((row) => row.targetTriple === TRIPLE).sourceArchive.sha256 =
          '0'.repeat(64)),
    ],
    ['多一枚闭集外顶层字段', (manifest) => (manifest.extra = 'x')],
  ];

  for (const [label, drift] of drifts) {
    const fixture = layout();
    const mutated = JSON.parse(JSON.stringify(fixture.manifest));
    drift(mutated);
    fixture.writeManifest(mutated);
    expectGateFailure(fixture, `manifest ${label}`);
  }
});

test('阳性对照：production 默认坐标（真 manifest + 真 snapshot）解析通过', () => {
  assert.ok(
    fs.existsSync(SNAPSHOT_DIR),
    `缺 snapshot：${SNAPSHOT_DIR}\n  先跑 pnpm --filter @courtwork/pi-lane build:product-sidecar`,
  );
  // 默认坐标就是 CLI 走的那一条：真冻结表 × tracked manifest × ignored snapshot。
  const route = resolveVerifiedRoute();
  assert.equal(route.bundleSha, JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')).bundle.sha256);
  assert.equal(FROZEN_ROUTE.bundle.resourceRelativePath, `${RESOURCE_DIR_BASENAME}/${BUNDLE_BASENAME}`);
});
