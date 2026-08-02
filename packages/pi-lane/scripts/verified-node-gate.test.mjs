/**
 * PI-HOST-LOOP-1R2 C4 + PI-HOST-LOOP-1R3 D2（复验 `427f4fa` Blocker 4 与 `23f8339`
 * Blocker 2，全部转常驻）。
 *
 * 门 3/4 存在的理由是「证明本次跑的就是那两枚冻结二进制 × 那一枚 sealed CJS」。
 * 1R 的 resolver 对 runtime 只比 bytes、`requireFile()` 跟随 symlink、manifest 只取三四个
 * 字段；1R2 补上这三类之后仍留着更深的一条——bundle 的 expected 取自**被判 manifest 的自报
 * 值**，于是「实物与 layout manifest 同步篡改」照样 exit 0。
 *
 * 1R3 的收口是族级的：期望侧只剩一处——按 repo 路径读到的 tracked manifest（与 Rust
 * `include_bytes!` 同源）；layout 自带的 manifest 只是被判物，须先与 tracked bytes 逐字节
 * 相同；两枚 runtime 与 sealed CJS 的 bytes+SHA 一律锚回 tracked。本文件因此有三层判据：
 *
 *   一、单独漂移（不碰 manifest）——逐类值各自落在**对应**判据上，证明每一枚比较都有牙；
 *   二、同步漂移（实物与 layout manifest 同改）——被判物不得升格为期望侧；
 *   三、清单核对——逐条指名每个 expected 的锚点，出现第三类来源（被判物自取）即红。
 *
 * 合成 app-layout 的三件实物用 CoW 克隆自真快照、manifest 复制 tracked 原件：注入前与产品
 * 坐标逐值相同，注入才有区分力，而那份 ignored 的真快照零改动
 * （还原式变异是验收会话的手法，不是常驻测试该靠的东西）。
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

import {
  BUNDLE_BASENAME,
  RESOURCE_DIR_BASENAME,
  SIDECAR_BASENAME,
  SNAPSHOT_DIR,
  SNAPSHOT_INVENTORY,
} from './build-product-sidecar.mjs';
import {
  ARTIFACT_CHECKS,
  FROZEN_ROUTE,
  GateFailure,
  MANIFEST_FILE,
  assertManifestFrozen,
  readTrackedRoute,
  resolveVerifiedRoute,
} from './verified-node-gate.mjs';

const TRIPLE = 'aarch64-apple-darwin';
const OTHER_TRIPLE = 'x86_64-apple-darwin';
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/** 换实物用的小 buffer：尺寸与两枚真件都不同，故足以打断 bytes 那一类判据。 */
const FORGED = Buffer.from('// 合成实物：只为让 bytes 与 SHA 同时漂移。\n', 'utf8');

function requireSnapshot() {
  assert.ok(
    fs.existsSync(SNAPSHOT_DIR),
    `缺 snapshot：${SNAPSHOT_DIR}\n  先跑 pnpm --filter @courtwork/pi-lane build:product-sidecar`,
  );
}

/** 本文件亲手建出来的临时根，收尾时逐条按**精确路径**删；不对共享临时目录用通配。 */
const scratchRoots = [];
function newScratchRoot(prefix) {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  scratchRoots.push(root);
  return root;
}
after(() => {
  for (const root of scratchRoots) fs.rmSync(root, { recursive: true, force: true });
});

/** 由真快照 + tracked manifest 铺一层与产品坐标逐值相同的合成 app-layout。 */
function layout() {
  requireSnapshot();
  const root = newScratchRoot('pi-verified-node-gate-test-');
  const snapshotDir = path.join(root, 'product-sidecar');
  fs.mkdirSync(snapshotDir);
  for (const name of SNAPSHOT_INVENTORY) {
    fs.copyFileSync(
      path.join(SNAPSHOT_DIR, name),
      path.join(snapshotDir, name),
      fs.constants.COPYFILE_FICLONE,
    );
  }
  const layoutManifestFile = path.join(root, 'route-manifest.json');
  fs.copyFileSync(MANIFEST_FILE, layoutManifestFile);

  return {
    root,
    snapshotDir,
    layoutManifestFile,
    bundle: path.join(snapshotDir, BUNDLE_BASENAME),
    runtime: (triple) => path.join(snapshotDir, `${SIDECAR_BASENAME}-${triple}`),
    readManifest: () => JSON.parse(fs.readFileSync(layoutManifestFile, 'utf8')),
    writeManifest: (value) =>
      fs.writeFileSync(layoutManifestFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8'),
    /** 携带 layout manifest 的判定（装包形态）。 */
    resolve: () =>
      resolveVerifiedRoute({
        snapshotDir,
        layoutManifestFile,
        triple: TRIPLE,
      }),
    /** 不携带 layout manifest 的判定（门 3/4 的快照形态）。 */
    resolveSnapshotOnly: () => resolveVerifiedRoute({ snapshotDir, triple: TRIPLE }),
  };
}

/** 整件替换：尺寸与内容同时变。 */
function replaceArtifact(file, buffer) {
  fs.rmSync(file);
  fs.writeFileSync(file, buffer);
}

/** 原地翻末字节：尺寸逐字节不变、SHA 已漂移。112 MiB 的实物也只写一个字节。 */
function flipLastByte(file) {
  const { size } = fs.statSync(file);
  const handle = fs.openSync(file, 'r+');
  try {
    const tail = Buffer.alloc(1);
    fs.readSync(handle, tail, 0, 1, size - 1);
    tail[0] ^= 0xff;
    fs.writeSync(handle, tail, 0, 1, size - 1);
  } finally {
    fs.closeSync(handle);
  }
}

function expectGateFailure(run, what, expectedFragment) {
  let message = null;
  assert.throws(
    run,
    (error) => {
      assert.ok(error instanceof GateFailure, `${what} 须以 GateFailure 停下，实得 ${error}`);
      message = error.message;
      return true;
    },
    what,
  );
  if (expectedFragment !== undefined) {
    assert.ok(
      message.includes(expectedFragment),
      `${what} 红在了别的判据上：期望含「${expectedFragment}」，实得「${message}」`,
    );
  }
}

test('对照：未经注入的合成 app-layout 必须解析通过', () => {
  const fixture = layout();
  const route = fixture.resolve();
  assert.equal(route.triple, TRIPLE);
  assert.equal(route.bundleSha, JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')).bundle.sha256);
  // 不带 layout manifest 的快照形态同样必须通过——否则下面的反例全是恒红。
  assert.equal(fixture.resolveSnapshotOnly().bundleSha, route.bundleSha);
});

test('注入一：runtime 尾字节 XOR——尺寸不变、SHA 已漂移，门必须红', () => {
  const fixture = layout();
  const runtime = fixture.runtime(TRIPLE);
  const before = fs.statSync(runtime).size;
  flipLastByte(runtime);

  // 篡改后尺寸逐字节相同——1R 只比 bytes，故这一枚正是它放行的那一形态。
  assert.equal(fs.statSync(runtime).size, before);
  expectGateFailure(
    () => fixture.resolve(),
    'runtime 尾字节 XOR',
    `runtime ${TRIPLE} sha256 漂移`,
  );
});

test('注入二：runtime 换成 symlink——即便指向同 bytes，门也必须红', () => {
  const fixture = layout();
  const runtime = fixture.runtime(TRIPLE);
  const real = path.join(fixture.root, 'real-runtime');
  fs.renameSync(runtime, real);
  fs.symlinkSync(real, runtime);

  // 跟随 symlink 的 statSync 看到的是「非空 regular file、尺寸对、SHA 也对」。
  assert.equal(fs.statSync(runtime).size, fs.statSync(real).size);
  assert.ok(fs.lstatSync(runtime).isSymbolicLink());
  expectGateFailure(() => fixture.resolve(), 'runtime 是 symlink', '是 symlink，不是实物');
});

test('注入三：manifest 冻结字段删改——逐字段都必须红', () => {
  requireSnapshot();
  const tracked = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
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
    [
      '改 target.runtime.sha256',
      (manifest) =>
        (manifest.targets.find((row) => row.targetTriple === TRIPLE).runtime.sha256 = '0'.repeat(64)),
    ],
    ['多一枚闭集外顶层字段', (manifest) => (manifest.extra = 'x')],
  ];

  const root = newScratchRoot('pi-verified-node-gate-manifest-');
  // 对照：原样复制的 tracked manifest 必须过——上面每一枚才是真区分力。
  const control = path.join(root, 'control.json');
  fs.copyFileSync(MANIFEST_FILE, control);
  assert.equal(readTrackedRoute({ manifestFile: control }).manifest.routeId, tracked.routeId);

  for (const [label, drift] of drifts) {
    const mutated = JSON.parse(JSON.stringify(tracked));
    drift(mutated);
    const file = path.join(root, 'mutated.json');
    fs.writeFileSync(file, `${JSON.stringify(mutated, null, 2)}\n`, 'utf8');
    expectGateFailure(() => readTrackedRoute({ manifestFile: file }), `manifest ${label}`);
  }
});

test('注入四：实物与 layout manifest 同步漂移——被判物不得升格为期望侧', () => {
  const drifts = [
    [
      'sealed CJS',
      (fixture) => {
        replaceArtifact(fixture.bundle, FORGED);
        const manifest = fixture.readManifest();
        manifest.bundle.bytes = FORGED.byteLength;
        manifest.bundle.sha256 = sha256(FORGED);
        fixture.writeManifest(manifest);
      },
    ],
    ...[TRIPLE, OTHER_TRIPLE].map((triple) => [
      `runtime ${triple}`,
      (fixture) => {
        replaceArtifact(fixture.runtime(triple), FORGED);
        const manifest = fixture.readManifest();
        const row = manifest.targets.find((entry) => entry.targetTriple === triple);
        row.runtime.bytes = FORGED.byteLength;
        row.runtime.sha256 = sha256(FORGED);
        fixture.writeManifest(manifest);
      },
    ]),
    [
      'manifest 冻结字段 routeId',
      (fixture) => {
        const manifest = fixture.readManifest();
        manifest.routeId = 'node22-runtime-sealed-cjs-v2';
        fixture.writeManifest(manifest);
      },
    ],
  ];

  for (const [label, drift] of drifts) {
    const fixture = layout();
    drift(fixture);
    // layout 自带的 manifest 与实物已互相自洽——1R2 的门正是在这一形态下 exit 0。
    expectGateFailure(
      () => fixture.resolve(),
      `同步漂移 ${label}`,
      'layout manifest 与 tracked manifest 不是逐字节相同',
    );
  }
});

test('注入五：实物单独漂移——每一类值各自落在对应判据上', () => {
  const drifts = [
    ['sealed CJS bytes', (fixture) => replaceArtifact(fixture.bundle, FORGED), 'sealed CJS bytes 漂移'],
    ['sealed CJS sha256', (fixture) => flipLastByte(fixture.bundle), 'sealed CJS sha256 漂移'],
    ...[TRIPLE, OTHER_TRIPLE].flatMap((triple) => [
      [
        `runtime ${triple} bytes`,
        (fixture) => replaceArtifact(fixture.runtime(triple), FORGED),
        `runtime ${triple} bytes 漂移`,
      ],
      [
        `runtime ${triple} sha256`,
        (fixture) => flipLastByte(fixture.runtime(triple)),
        `runtime ${triple} sha256 漂移`,
      ],
    ]),
  ];

  for (const [label, drift, fragment] of drifts) {
    const fixture = layout();
    drift(fixture);
    // 不递 layout manifest：判据只能来自 tracked，落点必须恰是该类值自己那一条。
    expectGateFailure(() => fixture.resolveSnapshotOnly(), `单独漂移 ${label}`, fragment);
  }
});

test('清单核对：每个 expected 都锚在独立锚点上，出现被判物自取即红', () => {
  // 期望侧手写字面量：label → 锚点。多一行、少一行、换锚点都红。
  const expectedAnchors = [
    ['sealed CJS bytes', 'tracked'],
    ['sealed CJS sha256', 'tracked'],
    ['runtime aarch64-apple-darwin bytes', 'tracked'],
    ['runtime aarch64-apple-darwin sha256', 'tracked'],
    ['runtime x86_64-apple-darwin bytes', 'tracked'],
    ['runtime x86_64-apple-darwin sha256', 'tracked'],
    ['bundle resourceRelativePath', 'frozen'],
  ];
  assert.deepEqual(
    ARTIFACT_CHECKS.map((check) => [check.label, check.anchor]),
    expectedAnchors,
    '实物逐值比对表漂移：新增一类比较就得同时补清单并指名锚点',
  );

  // 每个 expected 必须整枚写成「以自身声明的锚点为根的一条属性路径」。
  // 改成从被判 probe / layout manifest 自取，这条正则就对不上——那正是 D2 的病灶形状。
  const rootedPath = /^\((tracked|frozen)\) => \1(\.[A-Za-z0-9_]+|\['[A-Za-z0-9_-]+'\])+$/;
  for (const check of ARTIFACT_CHECKS) {
    const source = String(check.expected);
    assert.match(source, rootedPath, `${check.label} 的 expected 不是纯锚点路径：${source}`);
    assert.ok(
      source.startsWith(`(${check.anchor}) =>`),
      `${check.label} 自称锚点 ${check.anchor}，实际取自别处：${source}`,
    );
  }

  // manifest 冻结字段那一类：`assertManifestFrozen` 的每一次 `frozenEqual`，
  // 期望位（第二枚实参）只允许 `frozen.*` 或 `expected.*`（后者是 frozen.targets 的行）；
  // 被判位（第一枚）只允许 `manifest.*` 或 `row.*`。两侧任一互换即红。
  const source = String(assertManifestFrozen).replace(/\s+/g, ' ');
  const calls = [...source.matchAll(/frozenEqual\( *([^,]+), *([^,]+),/g)];
  assert.equal(calls.length, 9, `frozenEqual 调用数漂移：实得 ${calls.length}`);
  for (const [, observed, expected] of calls) {
    assert.match(expected, /^(frozen|expected)\./, `期望位取自被判物：${expected}`);
    assert.match(observed, /^(manifest|row)\./, `被判位不是被判物：${observed}`);
  }
});

test('阳性对照：production 默认坐标（真 manifest + 真 snapshot）解析通过', () => {
  requireSnapshot();
  // 默认坐标就是 CLI 走的那一条：真冻结表 × tracked manifest × ignored snapshot。
  const route = resolveVerifiedRoute();
  assert.equal(route.bundleSha, JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')).bundle.sha256);
  assert.equal(FROZEN_ROUTE.bundle.resourceRelativePath, `${RESOURCE_DIR_BASENAME}/${BUNDLE_BASENAME}`);
});
