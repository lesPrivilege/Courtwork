/**
 * PI-SIDECAR-DIST-1R · 展开官方 Node 22 发行包，并把来源门收在共享判定里。
 *
 * 取件本身（partial → 全项校验 → 原子落名）已前移到 `fetch-runtime.mjs`；本支只做
 * 「解包 + 解包后的身份复核」，再把下载侧与解包侧的观察合成一份，交
 * `verdictRuntimeSource` 判——报告引的是那条判据名，不是本文件的行号。
 *
 * 与 `70e6482` 的差别，逐条对应 `9b8142f` 的拒绝理由第二条：
 * - 原件只比 SHA，且期望**完全取自同目录那份可被一起替换的 `SHASUMS256.txt`**；
 *   现在冻结值是第一见证，SHASUMS 是第二见证，两者都要过；
 * - 原件 archive 缺失记 `blocked` 后**继续往下跑**；现在 blocked 即判红、进程非零；
 * - 原件不核字节数、不核 tar 完整性、不核解包后的 `node --version` 与 Mach-O 架构。
 *
 * 用法：`node scripts/fetch-runtime.mjs && node scripts/extract-runtime.mjs`
 * 归档件不入库（`dist/` 已被根 .gitignore 覆盖）；清理见 scripts/clean.mjs。
 */

import fs from 'node:fs';
import path from 'node:path';

import { NODE_VERSION, RUNTIME_ARCHIVES, conclude, normalizeMachoArch, verdictRuntimeSource } from './lib/probe-verdict.mjs';
import { DIST_DIR, RUNTIME_DIR, byteSize, ensureDir, mustRun, run, sha256File } from './lib/toolkit.mjs';

const FETCH_REPORT = path.join(DIST_DIR, 'runtime-fetch.json');
if (!fs.existsSync(FETCH_REPORT)) {
  process.stderr.write(`缺 ${FETCH_REPORT}：先跑 node scripts/fetch-runtime.mjs，不接受来路不明的发行包。\n`);
  process.exit(1);
}
const fetched = JSON.parse(fs.readFileSync(FETCH_REPORT, 'utf8'));

const targets = [];

for (const archive of RUNTIME_ARCHIVES) {
  const downloaded = fetched.targets?.find((entry) => entry.nodeArch === archive.nodeArch) ?? null;
  const file = path.join(RUNTIME_DIR, archive.name);

  if (!downloaded || downloaded.status !== 'ok' || !fs.existsSync(file)) {
    targets.push({
      nodeArch: archive.nodeArch,
      name: archive.name,
      status: downloaded?.status ?? 'blocked',
      reason: downloaded ? 'fetch-rejected' : 'archive-missing',
    });
    continue;
  }

  const extractRoot = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-${archive.nodeArch}`);
  fs.rmSync(extractRoot, { recursive: true, force: true });
  mustRun('tar', ['-xf', file, '-C', RUNTIME_DIR]);

  const binary = path.join(extractRoot, 'bin', 'node');
  if (!fs.existsSync(binary)) {
    targets.push({ nodeArch: archive.nodeArch, name: archive.name, status: 'blocked', reason: 'binary-missing' });
    continue;
  }

  // 解包后必须自证：跑出来的版本、Mach-O 架构。x64 在本机经 Rosetta 2 执行。
  const version = run(binary, ['--version']);
  const macho = run('file', ['-b', binary]);

  targets.push({
    status: 'ok',
    nodeArch: archive.nodeArch,
    name: archive.name,
    bytes: byteSize(file),
    sha256: sha256File(file),
    shasumsEntry: downloaded.shasumsEntry,
    tarOk: downloaded.tarOk,
    origin: downloaded.origin,
    binary,
    binaryBytes: byteSize(binary),
    binarySha256: sha256File(binary),
    nodeVersion: version.status === 0 ? version.stdout.trim() : `exit ${version.status}`,
    macho: macho.stdout.trim(),
    machoArch: normalizeMachoArch(macho.stdout),
  });
}

const observation = { targets };
const verdict = conclude(verdictRuntimeSource(observation), { probe: 'extract-runtime', ...observation });

ensureDir(DIST_DIR);
fs.writeFileSync(path.join(DIST_DIR, 'runtime-source.json'), `${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);

if (verdict.status !== 'ok') process.exit(1);
