/**
 * PI-SIDECAR-DIST-1R · 取官方 Node 22 发行包（partial → 全项校验 → 原子落名）。
 *
 * 为什么新增这一支：`9b8142f` 的拒绝理由第二条是「独立验收拿到的 archive 没过官方 SHA 门，
 * 双架构制品无法重建」。原装置要求人手 `curl` 下到 `dist/runtime/`，于是**半截下载会以
 * 正式文件名躺在磁盘上**，下一步只能事后发现。本支把取件本身做成门：
 *
 *   1. 只从冻结的 `https://nodejs.org/dist/v22.23.1/` 取，不接受任意 URL；
 *   2. 先写同目录唯一 partial（`<name>.partial`），fsync 后才开始校验——
 *      正式文件名在校验通过前**一次都不会出现**；
 *   3. 逐项核冻结文件名、冻结字节数、冻结 SHA-256、同次下载的 `SHASUMS256.txt` 同名记录、
 *      以及 `tar -tzf` 的完整性；
 *   4. 全过才 `rename` 并 fsync 父目录；任一项不过即删 partial、非零退出，**绝不覆盖**；
 *   5. 已存在的正式件先按同一套复核再复用；错件拒绝且原样保留，由人处置。
 *
 * 边界，写死在这里免得被引申：本门只证明 **HTTPS 传输完整性 + 冻结身份**。
 * 它**不是** release-key 供应链认证——没有校验 nodejs.org 的签名密钥，也没有验证
 * `SHASUMS256.txt.sig`。冻结值与下载回来的 SHASUMS 是两个独立见证，仅此而已。
 *
 * 用法：`node scripts/fetch-runtime.mjs`
 */

import fs from 'node:fs';
import path from 'node:path';

import { NODE_DIST_BASE, RUNTIME_ARCHIVES } from './lib/probe-verdict.mjs';
import { DIST_DIR, RUNTIME_DIR, byteSize, ensureDir, run, sha256File } from './lib/toolkit.mjs';

const SHASUMS_NAME = 'SHASUMS256.txt';

ensureDir(RUNTIME_DIR);

/** 落盘并 fsync。返回前数据已进磁盘，之后的校验读的是真正落下去的字节。 */
function writeSynced(file, buffer) {
  const fd = fs.openSync(file, 'w');
  try {
    fs.writeFileSync(fd, buffer);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

/** 原子落名后同步父目录，让「这个名字存在」本身也落到磁盘。 */
function syncDir(directory) {
  const fd = fs.openSync(directory, 'r');
  try {
    fs.fsyncSync(fd);
    return { synced: true, reason: null };
  } catch (cause) {
    // macOS 对目录 fd 的 fsync 正常可用；真失败要如实记，不吞。
    return { synced: false, reason: cause instanceof Error ? cause.message : String(cause) };
  } finally {
    fs.closeSync(fd);
  }
}

async function download(name) {
  const url = new URL(name, NODE_DIST_BASE);
  if (url.origin !== 'https://nodejs.org' || !url.pathname.startsWith(`/dist/`)) {
    throw new Error(`拒绝非官方来源：${url.href}`);
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url.href} → HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** `SHASUMS256.txt` 同样先 partial 再落名；解析出 name → sha 的表。 */
async function fetchShasums() {
  const official = path.join(RUNTIME_DIR, SHASUMS_NAME);
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
  syncDir(RUNTIME_DIR);
  return table;
}

/** 逐项核一份候选文件；返回观察值，由调用方决定落名还是拒绝。 */
function inspect(file, archive, shasums) {
  const bytes = byteSize(file);
  const sha256 = sha256File(file);
  const listing = run('tar', ['-tzf', file]);
  return {
    nodeArch: archive.nodeArch,
    name: path.basename(file).replace(/\.partial$/, ''),
    bytes,
    sha256,
    shasumsEntry: shasums.get(archive.name) ?? null,
    tarOk: listing.status === 0,
    tarStderr: listing.status === 0 ? null : listing.stderr.trim().slice(0, 300),
  };
}

function checks(observed, archive) {
  return [
    observed.name === archive.name ? null : `文件名 ${observed.name} ≠ ${archive.name}`,
    observed.bytes === archive.bytes ? null : `字节 ${observed.bytes} ≠ ${archive.bytes}`,
    observed.sha256 === archive.sha256 ? null : `SHA-256 ${observed.sha256} ≠ ${archive.sha256}`,
    observed.shasumsEntry === archive.sha256
      ? null
      : `SHASUMS256.txt 记录 ${observed.shasumsEntry} ≠ ${archive.sha256}`,
    observed.tarOk ? null : `tar 完整性失败：${observed.tarStderr}`,
  ].filter(Boolean);
}

const shasums = await fetchShasums();
const report = { base: NODE_DIST_BASE, sourceGate: 'https-transfer-integrity-only', targets: [] };
let rejected = 0;

for (const archive of RUNTIME_ARCHIVES) {
  const official = path.join(RUNTIME_DIR, archive.name);
  const partial = `${official}.partial`;

  if (fs.existsSync(official)) {
    // 现存正式件先验再复用；错件**原样保留**，不覆盖、不静默重下。
    const observed = inspect(official, archive, shasums);
    const problems = checks(observed, archive);
    if (problems.length > 0) {
      rejected += 1;
      report.targets.push({ ...observed, status: 'rejected', origin: 'pre-existing', problems });
      continue;
    }
    report.targets.push({ ...observed, status: 'ok', origin: 'reused' });
    continue;
  }

  fs.rmSync(partial, { force: true });
  writeSynced(partial, await download(archive.name));
  const observed = inspect(partial, archive, shasums);
  const problems = checks(observed, archive);
  if (problems.length > 0) {
    fs.rmSync(partial, { force: true });
    rejected += 1;
    report.targets.push({ ...observed, status: 'rejected', origin: 'downloaded', problems });
    continue;
  }
  fs.renameSync(partial, official);
  const dirSync = syncDir(RUNTIME_DIR);
  report.targets.push({ ...observed, status: 'ok', origin: 'downloaded', parentDirSynced: dirSync.synced });
  if (!dirSync.synced) {
    rejected += 1;
    report.targets.at(-1).problems = [`父目录 fsync 失败：${dirSync.reason}`];
    report.targets.at(-1).status = 'rejected';
  }
}

report.status = rejected === 0 ? 'ok' : 'failed';
report.rejectedCount = rejected;
ensureDir(DIST_DIR);
fs.writeFileSync(path.join(DIST_DIR, 'runtime-fetch.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

// 半截件、错件、来源不符一律非零；下游 extract 不得在无来源保证下开跑。
if (rejected > 0) process.exit(1);
