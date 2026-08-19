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
 * PI-FETCH-TIMEOUT-1（implementation-readiness 同名行）：下载路径统一改走
 * {@link fetchWithTimeoutRetry}——显式超时 + 有界重试 + 耗尽后具名报错（含 URL 与已试次数，
 * 不吞原始 cause）。修的是「裸 `fetch` 无超时无重试，网络失速即静默无限挂起」（验收环境实测
 * 两次各 14/16 分钟）；不改变下载后的 SHA/SHASUMS/tar 三重校验链。
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
/** 装包后 CJS 的 resource 前缀。与 tracked manifest、tauri.conf mapping、Rust `RESOURCE_DIR_NAME` 同源。 */
export const RESOURCE_DIR_BASENAME = 'pi-loop-resources';
export const USE_CODE_CACHE = false;
/** Tauri macOS externalBin 的现行 ad-hoc signing 选项；必须与 bundler 实际调用逐项相同。 */
export const TAURI_SIGNING_ARGS = ['--force', '--sign', '-', '--options', 'runtime'];

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
    /** 官方归档解出的、签名前 runtime 身份；只用于 source/archive 三重校验。 */
    sourceRuntime: {
      bytes: 112_928_848,
      sha256: '2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d',
    },
    /** 最终 Tauri externalBin sibling 的签后物理身份；由同名 pre-sign 实测并冻结。 */
    runtime: {
      bytes: 112_271_136,
      sha256: '54600689d8bce010c2c336ca320d016018fb5d4af6ea74f38c7ad786492ff51f',
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
    /** 官方归档解出的、签名前 runtime 身份；只用于 source/archive 三重校验。 */
    sourceRuntime: {
      bytes: 115_447_952,
      sha256: '03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b',
    },
    /** 最终 Tauri externalBin sibling 的签后物理身份；由同名 pre-sign 实测并冻结。 */
    runtime: {
      bytes: 115_446_688,
      sha256: 'd2cde31d078b01fb5244db4539ea63d84200349434fa68aee60655f316404371',
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
export const ROUTE_MANIFEST_FILE = path.resolve(
  PACKAGE_ROOT,
  '../../apps/desktop/src-tauri/pi-sidecar/route-manifest.json',
);

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
  const expected = target.sourceRuntime ?? target.runtime;
  return [
    observed.bytes === expected.bytes ? null : `runtime 字节 ${observed.bytes} ≠ ${expected.bytes}`,
    observed.sha256 === expected.sha256
      ? null
      : `runtime SHA-256 ${observed.sha256} ≠ ${expected.sha256}`,
    observed.machoArch === target.machoArch ? null : `Mach-O 架构 ${observed.machoArch} ≠ ${target.machoArch}`,
  ].filter(Boolean);
}

/** 签后 staged runtime 的三项判据；与 source/archive 身份门分开，禁止两种 digest 混用。 */
export function packagedRuntimeProblems(observed, target) {
  return [
    observed.bytes === target.runtime.bytes ? null : `packaged runtime 字节 ${observed.bytes} ≠ ${target.runtime.bytes}`,
    observed.sha256 === target.runtime.sha256
      ? null
      : `packaged runtime SHA-256 ${observed.sha256} ≠ ${target.runtime.sha256}`,
    observed.machoArch === target.machoArch ? null : `Mach-O 架构 ${observed.machoArch} ≠ ${target.machoArch}`,
  ].filter(Boolean);
}

/**
 * route manifest 的唯一生成形状。runtime bytes/SHA 只接受 staged signed sibling 的实测值；
 * schema、routeId、Node 版本、source archive、targetTriple 与 machoArch 均由冻结输入带入。
 */
export function renderRouteManifest({ targets, bundle }) {
  return {
    schemaVersion: 1,
    routeId: ROUTE_ID,
    nodeVersion: NODE_VERSION,
    useCodeCache: USE_CODE_CACHE,
    bundle: {
      resourceRelativePath: `${RESOURCE_DIR_BASENAME}/${BUNDLE_BASENAME}`,
      bytes: bundle.bytes,
      sha256: bundle.sha256,
    },
    targets: targets.map((target) => ({
      targetTriple: target.targetTriple,
      machoArch: target.machoArch,
      sourceArchive: {
        filename: target.archive.filename,
        bytes: target.archive.bytes,
        sha256: target.archive.sha256,
      },
      runtime: {
        externalBinBasename: SIDECAR_BASENAME,
        bytes: target.runtime.bytes,
        sha256: target.runtime.sha256,
      },
    })),
  };
}

export function routeManifestBytes(input) {
  return Buffer.from(`${JSON.stringify(renderRouteManifest(input), null, 2)}\n`, 'utf8');
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

/**
 * 先以 Tauri 最终使用的 basename `pi-sidecar` 对官方 runtime 做同参数 ad-hoc signing，
 * 再把签后实物移入 target-triple stage 名。Tauri 随后会在 `.app/Contents/MacOS/pi-sidecar`
 * 上重复同一 signing；macOS codesign 的结果因此保持 byte-identical，而 manifest 记录的是
 * 这枚签后 sibling 的物理 bytes/SHA，不是签名前 runtime 的 digest。
 */
export function signRuntimeForTauri(runtimeFile, target, stageDir) {
  const signingPath = path.join(stageDir, SIDECAR_BASENAME);
  const staged = path.join(stageDir, `${SIDECAR_BASENAME}-${target.targetTriple}`);
  if (fs.existsSync(signingPath) || fs.existsSync(staged)) {
    throw new Error(`${target.targetTriple} signing stage 已有同名实物，拒绝覆盖`);
  }

  fs.copyFileSync(runtimeFile, signingPath);
  fs.chmodSync(signingPath, 0o755);
  const signing = run('codesign', [...TAURI_SIGNING_ARGS, signingPath]);
  if (signing.status !== 0) {
    const detail = (signing.stderr || signing.stdout).trim().slice(0, 500);
    throw new Error(`${target.targetTriple} runtime ad-hoc signing 失败：${detail}`);
  }

  const observed = {
    bytes: fs.statSync(signingPath).size,
    sha256: sha256File(signingPath),
    machoArch: readMachoArchOfFile(signingPath),
  };
  const problems = packagedRuntimeProblems(observed, target);
  if (problems.length > 0) {
    throw new Error(`${target.targetTriple} 签后 runtime 不合冻结身份：${problems.join('；')}`);
  }

  fs.renameSync(signingPath, staged);
  fs.chmodSync(staged, 0o755);
  return observed;
}

/**
 * PI-FETCH-TIMEOUT-1 · 下载超时与重试的冻结真值。
 *
 * 依据（2026-08-09 本机实测，`curl -w time_total`，各 3 次独立探测，`nodejs.org` 官方 CDN，
 * 均为健康网络下的成功传输）：
 *   - darwin-arm64 归档（50,067,502 B）：7.522s / 7.334s / 7.441s
 *   - darwin-x64   归档（51,245,086 B）：7.490s / 7.198s / 6.736s
 *   - `SHASUMS256.txt`（3,777 B）：0.644s
 * 最大单文件实测 ≈7.5s。`DOWNLOAD_TIMEOUT_MS` 取 60s（≈8× 安全系数）：既远高于健康下载的
 * 真实耗时（容忍明显变慢但仍在工作的网络——60s 内传完 50MB 换算最低吞吐约 833 KB/s），
 * 又远低于验收环境登记的 14/16 分钟静默挂起，任何真实失速都会在分钟级内转成具名失败，
 * 不再无限等待。不采用「无负载基线 × 极大倍数」的写法——本场景不存在票面 PI-SCAN-TIMEOUT-1
 * 那种随负载非线性走高的真实工作量，健康值本身就是稳定读数，8× 已是充分安全系数。
 */
export const DOWNLOAD_TIMEOUT_MS = 60_000;
/** 有界重试次数：小而显式，兜住瞬时丢包/路由抖动，不掩盖持续性故障。 */
export const MAX_DOWNLOAD_ATTEMPTS = 3;
/** 重试间隔：固定值，不做指数退避——构建脚本非高频客户端，该复杂度非本质复杂度。 */
export const DOWNLOAD_RETRY_DELAY_MS = 5_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 有界重试＋显式超时的 fetch 封装。来源 origin 白名单由调用方（{@link download}）负责，
 * 这里只管传输可靠性：连不上、连上不回话（失速）、HTTP 层错误、**body 流式读取途中失速**，
 * 一律按同一套有界重试处置；耗尽后抛出具名错误——含 URL 与已试次数，且用 `{ cause }`
 * 保留原始错误，不吞。
 *
 * **`readBody` 必须与 `fetch()` 落在同一枚 try 里、共用同一枚 `AbortSignal`**：真实归档
 * 文件是 50MB 量级，多数传输耗时花在 body 流式阶段而非 header 阶段；若只保护 `fetch()`
 * 本身（headers 到达即算「成功」返回），之后单独 `await response.arrayBuffer()` 时同一枚
 * signal 到期照样会中止该 body 读取——但那次中止会绕过这层重试与具名包装，直接以裸
 * `TimeoutError` 冒泡给调用方（本票 2026-08-10 用真实 nodejs.org 网络实测复现过一次：
 * 63s 后拿到未包装的 `The operation was aborted due to timeout`，而非「下载失败（已尝试
 * N 次）…」——已改为下述形态修正）。
 *
 * `fetchImpl`/`sleepImpl` 仅供定向测试注入假实现；生产路径始终用默认的全局 `fetch`/真实计时。
 */
export async function fetchWithTimeoutRetry(
  url,
  {
    timeoutMs = DOWNLOAD_TIMEOUT_MS,
    maxAttempts = MAX_DOWNLOAD_ATTEMPTS,
    retryDelayMs = DOWNLOAD_RETRY_DELAY_MS,
    fetchImpl = fetch,
    sleepImpl = sleep,
    readBody = (response) => response.arrayBuffer(),
  } = {},
) {
  const href = typeof url === 'string' ? url : url.href;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await readBody(response);
      return { response, body };
    } catch (cause) {
      const detail =
        cause instanceof Error && cause.name === 'TimeoutError'
          ? `未在 ${timeoutMs}ms 内完成（连得上但静默无响应，或被失速丢包）`
          : cause instanceof Error
            ? cause.message
            : String(cause);
      if (attempt < maxAttempts) {
        process.stderr.write(
          `下载第 ${attempt}/${maxAttempts} 次尝试失败：${detail}，${retryDelayMs}ms 后重试：${href}\n`,
        );
        await sleepImpl(retryDelayMs);
        continue;
      }
      // 循环内的最后一次尝试恰好以此 throw 结束（不会跑到函数体末尾）；`cause` 直接是
      // 本次 catch 绑定的原始错误——`preserve-caught-error` 门禁要求 `cause` 字面即取自
      // 触发本次抛出的那个 catch 参数，不接受另开变量转手复制。
      throw new Error(`下载失败（已尝试 ${maxAttempts} 次）：${detail}：${href}`, { cause });
    }
  }
}

async function download(name) {
  const url = new URL(name, NODE_DIST_BASE);
  if (url.origin !== 'https://nodejs.org' || !url.pathname.startsWith('/dist/')) {
    throw new Error(`拒绝非官方来源：${url.href}`);
  }
  const { body } = await fetchWithTimeoutRetry(url);
  return Buffer.from(body);
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

      const signed = signRuntimeForTauri(runtimeFile, target, stageDir);
      report.targets.push({
        targetTriple: target.targetTriple,
        machoArch: target.machoArch,
        archive: { ...target.archive, origin: archive.origin },
        sourceRuntime: { ...observed, versionProbe: version },
        runtime: signed,
      });
    }

    const bundle = await buildDeterministicBundle();
    writeSynced(path.join(stageDir, BUNDLE_BASENAME), bundle.content, 0o644);
    report.bundle = {
      resourceRelativePath: `${RESOURCE_DIR_BASENAME}/${BUNDLE_BASENAME}`,
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
      const stagedObserved = {
        bytes: fs.statSync(staged).size,
        sha256: sha256File(staged),
        machoArch: readMachoArchOfFile(staged),
      };
      const stagedProblems = packagedRuntimeProblems(stagedObserved, target);
      if (stagedProblems.length > 0) {
        throw new Error(`${target.targetTriple} 落盘后签后 runtime 漂移，拒绝落名：${stagedProblems.join('；')}`);
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

    const manifestBytes = routeManifestBytes({ targets: report.targets, bundle: report.bundle });
    writeSynced(ROUTE_MANIFEST_FILE, manifestBytes, 0o644);
    report.routeManifest = {
      file: ROUTE_MANIFEST_FILE,
      bytes: manifestBytes.byteLength,
      sha256: sha256Of(manifestBytes),
    };
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
