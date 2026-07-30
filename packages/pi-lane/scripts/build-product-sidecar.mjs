/**
 * PI-HOST-LOOP-1 §二.4 · Route A 产品 snapshot 生成器（独占命令，`pnpm -r build` 不碰它）。
 *
 * 产出恰三件，落在 ignored 的 `packages/pi-lane/dist/product-sidecar/`：
 *
 *   pi-sidecar-aarch64-apple-darwin   ← 官方 Node v22.23.1 darwin-arm64 的 bin/node
 *   pi-sidecar-x86_64-apple-darwin    ← 官方 Node v22.23.1 darwin-x64  的 bin/node
 *   sidecar.cjs                       ← `src/product-main.ts` 的 sealed CJS bundle
 *
 * 三条不肯让步的实现选择：
 *
 * 1. **正式名在校验通过前一次都不出现**。全部实物先落 sibling stage 目录
 *    `dist/.product-sidecar.stage-<SafeToken>`，逐文件 fsync、stage 目录 fsync、
 *    manifest↔stage 重验之后，才在正式根**不存在**时单次 `rename` + 父目录 fsync。
 *    正式根已存在时只接受 exact inventory 且三件与本轮 stage byte-identical，否则硬失败、
 *    零覆盖——换 source 必须显式 clean snapshot。
 * 2. **身份门是冻结表，不是自报值**。archive 的 name/bytes/SHA 与 runtime 的 bytes/SHA 都写死在
 *    {@link TARGETS}；同次下载的 `SHASUMS256.txt` 是第二个独立见证。`tar -tzf` 只证完整性，
 *    Mach-O magic/cputype 只证架构——三者都不能互相代替。
 * 3. **bundle 必须可复现**。同一份 source 连编两次、按字节比对；不一致即失败，
 *    不给「大概一样」的 SHA 留口子。`useCodeCache:false`、零 sourcemap 是路线裁定的一部分。
 *
 * 明确不做（与 R5 的 fetch 门同一条边界）：本门只证 **HTTPS 传输完整性 + 冻结身份**，
 * 不是 release-key 供应链认证——没有校验 nodejs.org 的签名密钥，也没有验证 `SHASUMS256.txt.sig`。
 *
 * 用法：`pnpm --filter @courtwork/pi-lane build:product-sidecar`
 */

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import * as esbuild from 'esbuild';

// ── 冻结真值（票面 §二.4 的表，逐字搬入；改任一枚都是契约变更）────────────────

export const ROUTE_ID = 'node22-runtime-sealed-cjs-v1';
export const NODE_VERSION = '22.23.1';
export const NODE_DIST_BASE = `https://nodejs.org/dist/v${NODE_VERSION}/`;
export const SHASUMS_NAME = 'SHASUMS256.txt';
export const SIDECAR_BASENAME = 'pi-sidecar';
export const BUNDLE_BASENAME = 'sidecar.cjs';
export const USE_CODE_CACHE = false;

export const TARGETS = [
  {
    targetTriple: 'aarch64-apple-darwin',
    machoArch: 'arm64',
    nodeArch: 'arm64',
    cpuType: 0x0100000c,
    archive: {
      filename: `node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
      bytes: 50_067_502,
      sha256: 'ef28d8fab2c0e4314522d4bb1b7173270aa3937e93b92cb7de79c112ac1fa953',
    },
    runtime: {
      bytes: 112_928_848,
      sha256: '2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d',
    },
  },
  {
    targetTriple: 'x86_64-apple-darwin',
    machoArch: 'x86_64',
    nodeArch: 'x64',
    cpuType: 0x01000007,
    archive: {
      filename: `node-v${NODE_VERSION}-darwin-x64.tar.gz`,
      bytes: 51_245_086,
      sha256: 'b8da981b8a0b1241b70249204916da76c63573ddf5814dbd2d1e41069105cb81',
    },
    runtime: {
      bytes: 115_447_952,
      sha256: '03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b',
    },
  },
];

/** 正式根的 exact inventory。多一件少一件都不算同一份 snapshot。 */
export const SNAPSHOT_INVENTORY = [
  ...TARGETS.map((target) => `${SIDECAR_BASENAME}-${target.targetTriple}`),
  BUNDLE_BASENAME,
].sort();

// ── 坐标 ─────────────────────────────────────────────────────────────────────

export const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..');
export const DIST_DIR = path.join(PACKAGE_ROOT, 'dist');
/** 正式根：ignored immutable snapshot。 */
export const SNAPSHOT_DIR = path.join(DIST_DIR, 'product-sidecar');
/** 下载物落这里，与 R5 fixture 的 `dist/runtime/` 布局同惯例。 */
export const ARCHIVE_DIR = path.join(DIST_DIR, 'runtime');
/** 构建 scratch（解包、双次 bundle 比对）。不随包。 */
export const BUILD_DIR = path.join(DIST_DIR, 'product-sidecar-build');
export const PRODUCT_ENTRY = path.join(PACKAGE_ROOT, 'src', 'product-main.ts');
export const REPORT_FILE = path.join(DIST_DIR, 'product-sidecar-build.json');

/** wire 与 stage 目录共用的 SafeToken 形状。 */
export const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

// ── 纯件（可单测，零 I/O 或只读 I/O）────────────────────────────────────────

export function assertSafeToken(token) {
  if (typeof token !== 'string' || !SAFE_TOKEN_PATTERN.test(token)) {
    throw new Error(`stage token 不满足 SafeToken 形状：${JSON.stringify(token)}`);
  }
  return token;
}

/** stage 目录必须是正式根的 **sibling**，且名字带 SafeToken。 */
export function stageDirPath(token) {
  return path.join(DIST_DIR, `.product-sidecar.stage-${assertSafeToken(token)}`);
}

export function newStageToken() {
  return `b${process.pid}-${randomBytes(8).toString('hex')}`;
}

export function sha256Of(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function sha256File(file) {
  return sha256Of(fs.readFileSync(file));
}

/**
 * Mach-O 架构判定。只收 thin 64-bit little-endian（官方 darwin tarball 就是这一种）；
 * fat/universal 与 32-bit 一律返回 null，由调用方按失败处置。
 */
export function readMachoArch(head) {
  if (!head || head.length < 8) return null;
  const magic = head.readUInt32LE(0);
  if (magic !== 0xfeedfacf) return null;
  const cpuType = head.readUInt32LE(4);
  const target = TARGETS.find((candidate) => candidate.cpuType === cpuType);
  return target ? target.machoArch : null;
}

export function readMachoArchOfFile(file) {
  const handle = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(8);
    fs.readSync(handle, head, 0, 8, 0);
    return readMachoArch(head);
  } finally {
    fs.closeSync(handle);
  }
}

/**
 * 正式根已存在时的**唯一**放行条件：exact inventory 且三件与本轮 stage byte-identical。
 * 任一条不成立都返回 problems——调用方据此硬失败，绝不原地覆盖。
 */
export function snapshotReuseProblems(existingDir, stageDir, hashOf = sha256File) {
  const problems = inventoryProblems(inventoryOf(existingDir)).map((problem) => `正式根：${problem}`);
  if (problems.length > 0) return problems;
  for (const name of SNAPSHOT_INVENTORY) {
    let existing;
    let staged;
    try {
      existing = hashOf(path.join(existingDir, name));
      staged = hashOf(path.join(stageDir, name));
    } catch (cause) {
      problems.push(`${name} 无法比对：${cause instanceof Error ? cause.message : String(cause)}`);
      continue;
    }
    if (existing !== staged) {
      problems.push(`${name} 与本轮 stage 不 byte-identical——换 source 须显式 clean snapshot`);
    }
  }
  return problems;
}

/** 目录实物枚举：`readdir` 取名 + `lstat` 定类型（不跟随 symlink）。 */
export function inventoryOf(directory) {
  let stats;
  try {
    stats = fs.lstatSync(directory);
  } catch {
    return { exists: false, rootType: null, entries: [] };
  }
  const rootType = stats.isSymbolicLink() ? 'symlink' : stats.isDirectory() ? 'dir' : 'file';
  if (rootType !== 'dir') return { exists: true, rootType, entries: [] };
  const entries = fs.readdirSync(directory).map((name) => {
    const child = fs.lstatSync(path.join(directory, name));
    return {
      name,
      type: child.isSymbolicLink() ? 'symlink' : child.isDirectory() ? 'dir' : 'file',
      bytes: child.isFile() ? child.size : null,
    };
  });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { exists: true, rootType, entries };
}

/** 冻结 inventory 判定：恰三件普通文件，名字逐字相同。 */
export function inventoryProblems(inventory) {
  if (!inventory.exists) return ['snapshot 根不存在'];
  if (inventory.rootType !== 'dir') return [`snapshot 根不是目录（实为 ${inventory.rootType}）`];
  const names = inventory.entries.map((entry) => entry.name);
  const problems = [];
  if (JSON.stringify(names) !== JSON.stringify(SNAPSHOT_INVENTORY)) {
    problems.push(`inventory 不是冻结三件：${JSON.stringify(names)}`);
  }
  for (const entry of inventory.entries) {
    if (entry.type !== 'file') problems.push(`${entry.name} 不是普通文件（实为 ${entry.type}）`);
  }
  return problems;
}

/** archive 的五项判据。任一不过即拒，且**不**覆盖已有实物。 */
export function archiveProblems(observed, target) {
  return [
    observed.name === target.archive.filename ? null : `文件名 ${observed.name} ≠ ${target.archive.filename}`,
    observed.bytes === target.archive.bytes ? null : `字节 ${observed.bytes} ≠ ${target.archive.bytes}`,
    observed.sha256 === target.archive.sha256 ? null : `SHA-256 ${observed.sha256} ≠ ${target.archive.sha256}`,
    observed.shasumsEntry === target.archive.sha256
      ? null
      : `${SHASUMS_NAME} 记录 ${observed.shasumsEntry} ≠ ${target.archive.sha256}`,
    observed.tarOk ? null : `tar 完整性失败：${observed.tarStderr}`,
  ].filter(Boolean);
}

/** 解出来的 runtime 的三项判据。 */
export function runtimeProblems(observed, target) {
  return [
    observed.bytes === target.runtime.bytes ? null : `runtime 字节 ${observed.bytes} ≠ ${target.runtime.bytes}`,
    observed.sha256 === target.runtime.sha256
      ? null
      : `runtime SHA-256 ${observed.sha256} ≠ ${target.runtime.sha256}`,
    observed.machoArch === target.machoArch ? null : `Mach-O 架构 ${observed.machoArch} ≠ ${target.machoArch}`,
  ].filter(Boolean);
}

/**
 * bundle 选项的**唯一**真源。定向测试与本命令共用同一份，免得两谱各抄一次后各自漂移。
 */
export function bundleOptions(entryPoint, outfile) {
  return {
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'silent',
    metafile: true,
  };
}

/** 连编两次并按字节比对。返回正本 bytes/SHA——H2 的 route-manifest 就写这两个值。 */
export async function buildDeterministicBundle({ entryPoint = PRODUCT_ENTRY, scratchDir = BUILD_DIR } = {}) {
  fs.mkdirSync(scratchDir, { recursive: true });
  const first = path.join(scratchDir, 'bundle-a.cjs');
  const second = path.join(scratchDir, 'bundle-b.cjs');
  const firstResult = await esbuild.build(bundleOptions(entryPoint, first));
  await esbuild.build(bundleOptions(entryPoint, second));
  const a = fs.readFileSync(first);
  const b = fs.readFileSync(second);
  if (!a.equals(b)) {
    throw new Error('同一份 source 连编两次不 byte-identical，拒绝产出 snapshot');
  }
  return {
    content: a,
    bytes: a.byteLength,
    sha256: sha256Of(a),
    metafile: firstResult.metafile,
    reproducible: true,
  };
}

// ── I/O 助手 ─────────────────────────────────────────────────────────────────

function writeSynced(file, buffer, mode) {
  const handle = fs.openSync(file, 'w', mode);
  try {
    fs.writeFileSync(handle, buffer);
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
  if (mode !== undefined) fs.chmodSync(file, mode);
}

function syncDir(directory) {
  const handle = fs.openSync(directory, 'r');
  try {
    fs.fsyncSync(handle);
    return { synced: true, reason: null };
  } catch (cause) {
    return { synced: false, reason: cause instanceof Error ? cause.message : String(cause) };
  } finally {
    fs.closeSync(handle);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

async function download(name) {
  const url = new URL(name, NODE_DIST_BASE);
  if (url.origin !== 'https://nodejs.org' || !url.pathname.startsWith('/dist/')) {
    throw new Error(`拒绝非官方来源：${url.href}`);
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url.href} → HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchShasums() {
  const official = path.join(ARCHIVE_DIR, SHASUMS_NAME);
  const partial = `${official}.partial`;
  writeSynced(partial, await download(SHASUMS_NAME));
  const text = fs.readFileSync(partial, 'utf8');
  const table = new Map();
  for (const line of text.split('\n')) {
    const [sha, entry] = line.trim().split(/\s+/);
    if (sha && entry) table.set(entry, sha);
  }
  if (table.size === 0) {
    fs.rmSync(partial, { force: true });
    throw new Error(`${SHASUMS_NAME} 解析为空，拒绝继续`);
  }
  fs.renameSync(partial, official);
  syncDir(ARCHIVE_DIR);
  return table;
}

function inspectArchive(file, target, shasums) {
  const listing = run('tar', ['-tzf', file]);
  return {
    name: path.basename(file).replace(/\.partial$/, ''),
    bytes: fs.statSync(file).size,
    sha256: sha256File(file),
    shasumsEntry: shasums.get(target.archive.filename) ?? null,
    tarOk: listing.status === 0,
    tarStderr: listing.status === 0 ? null : listing.stderr.trim().slice(0, 300),
  };
}

/** 取件：正式名只在全项通过后出现（partial → 校验 → rename）。 */
async function ensureArchive(target, shasums) {
  const official = path.join(ARCHIVE_DIR, target.archive.filename);
  const partial = `${official}.partial`;
  if (fs.existsSync(official)) {
    const observed = inspectArchive(official, target, shasums);
    const problems = archiveProblems(observed, target);
    if (problems.length > 0) throw new Error(`已有 archive 不合冻结身份，原样保留：${problems.join('；')}`);
    return { file: official, origin: 'reused', observed };
  }
  fs.rmSync(partial, { force: true });
  writeSynced(partial, await download(target.archive.filename));
  const observed = inspectArchive(partial, target, shasums);
  const problems = archiveProblems(observed, target);
  if (problems.length > 0) {
    fs.rmSync(partial, { force: true });
    throw new Error(`下载的 archive 不合冻结身份：${problems.join('；')}`);
  }
  fs.renameSync(partial, official);
  const dirSync = syncDir(ARCHIVE_DIR);
  if (!dirSync.synced) throw new Error(`archive 目录 fsync 失败：${dirSync.reason}`);
  return { file: official, origin: 'downloaded', observed };
}

function extractRuntime(archiveFile, target, scratchDir) {
  const member = `node-v${NODE_VERSION}-darwin-${target.nodeArch}/bin/node`;
  const outDir = path.join(scratchDir, target.targetTriple);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const extraction = run('tar', ['-xzf', archiveFile, '-C', outDir, member]);
  if (extraction.status !== 0) {
    throw new Error(`解包 ${member} 失败：${extraction.stderr.trim().slice(0, 300)}`);
  }
  return path.join(outDir, member);
}

/**
 * 只有与本机架构相同的 runtime 才能真跑 `--version`。跨架构那一枚如实登记为
 * `cross-arch-not-executed`——冻结 SHA 与 Mach-O 已独立锚定它的身份，不假装跑过。
 */
function probeRuntimeVersion(runtimeFile, target) {
  if (target.nodeArch !== process.arch) {
    return { checked: false, reason: 'cross-arch-not-executed', observed: null };
  }
  const probe = run(runtimeFile, ['--version']);
  const observed = probe.stdout.trim();
  if (probe.status !== 0 || observed !== `v${NODE_VERSION}`) {
    throw new Error(`runtime --version 不是 v${NODE_VERSION}（实得 ${JSON.stringify(observed)}）`);
  }
  return { checked: true, reason: null, observed };
}

// ── 主流程 ───────────────────────────────────────────────────────────────────

export async function main() {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  const shasums = await fetchShasums();
  const token = newStageToken();
  const stageDir = stageDirPath(token);
  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });

  const report = {
    routeId: ROUTE_ID,
    nodeVersion: NODE_VERSION,
    useCodeCache: USE_CODE_CACHE,
    sourceGate: 'https-transfer-integrity-only',
    stageDir,
    targets: [],
    bundle: null,
    snapshot: null,
  };

  try {
    for (const target of TARGETS) {
      const archive = await ensureArchive(target, shasums);
      const runtimeFile = extractRuntime(archive.file, target, BUILD_DIR);
      const observed = {
        bytes: fs.statSync(runtimeFile).size,
        sha256: sha256File(runtimeFile),
        machoArch: readMachoArchOfFile(runtimeFile),
      };
      const problems = runtimeProblems(observed, target);
      if (problems.length > 0) throw new Error(`${target.targetTriple} runtime 不合冻结身份：${problems.join('；')}`);
      const version = probeRuntimeVersion(runtimeFile, target);

      const staged = path.join(stageDir, `${SIDECAR_BASENAME}-${target.targetTriple}`);
      writeSynced(staged, fs.readFileSync(runtimeFile), 0o755);
      report.targets.push({
        targetTriple: target.targetTriple,
        machoArch: target.machoArch,
        archive: { ...target.archive, origin: archive.origin },
        runtime: { ...observed, versionProbe: version },
      });
    }

    const bundle = await buildDeterministicBundle();
    writeSynced(path.join(stageDir, BUNDLE_BASENAME), bundle.content, 0o644);
    report.bundle = {
      resourceRelativePath: `${SIDECAR_BASENAME}/${BUNDLE_BASENAME}`,
      bytes: bundle.bytes,
      sha256: bundle.sha256,
      reproducible: bundle.reproducible,
    };

    const stageSync = syncDir(stageDir);
    if (!stageSync.synced) throw new Error(`stage 目录 fsync 失败：${stageSync.reason}`);

    // 重验：比对的是**落到 stage 上的字节**，不是内存里那一份。
    const stageProblems = inventoryProblems(inventoryOf(stageDir));
    if (stageProblems.length > 0) throw new Error(`stage inventory 不合冻结三件：${stageProblems.join('；')}`);
    for (const target of TARGETS) {
      const staged = path.join(stageDir, `${SIDECAR_BASENAME}-${target.targetTriple}`);
      if (sha256File(staged) !== target.runtime.sha256) {
        throw new Error(`${target.targetTriple} 落盘后 SHA 漂移，拒绝落名`);
      }
    }
    if (sha256File(path.join(stageDir, BUNDLE_BASENAME)) !== bundle.sha256) {
      throw new Error('sidecar.cjs 落盘后 SHA 漂移，拒绝落名');
    }

    if (fs.existsSync(SNAPSHOT_DIR)) {
      const reuseProblems = snapshotReuseProblems(SNAPSHOT_DIR, stageDir);
      if (reuseProblems.length > 0) {
        throw new Error(`正式根已存在且与本轮不一致，拒绝原地覆盖：${reuseProblems.join('；')}`);
      }
      report.snapshot = { dir: SNAPSHOT_DIR, action: 'reused-identical' };
      fs.rmSync(stageDir, { recursive: true, force: true });
    } else {
      fs.renameSync(stageDir, SNAPSHOT_DIR);
      const parentSync = syncDir(DIST_DIR);
      if (!parentSync.synced) throw new Error(`dist 父目录 fsync 失败：${parentSync.reason}`);
      report.snapshot = { dir: SNAPSHOT_DIR, action: 'created' };
    }
  } catch (cause) {
    fs.rmSync(stageDir, { recursive: true, force: true });
    report.snapshot = { dir: SNAPSHOT_DIR, action: 'failed', reason: cause instanceof Error ? cause.message : String(cause) };
    fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
    process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
    throw cause;
  }

  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
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
