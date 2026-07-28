/**
 * PI-SIDECAR-DIST-1 · 展开官方 Node 22 LTS 发行包。
 *
 * 只做三件事：核 SHA-256（官方 SHASUMS256.txt）、解包、留下 `bin/node` 的坐标。
 * 校验不过一律抛——分发实验的第一块砖如果来源不明，后面全部读数都不作数。
 *
 * 用法：`node scripts/extract-runtime.mjs`
 * 归档件不入库（`dist/` 已被根 .gitignore 覆盖）；清理见 scripts/clean.mjs。
 */

import fs from 'node:fs';
import path from 'node:path';

import { NODE_VERSION, RUNTIME_DIR, TARGETS, byteSize, ensureDir, mustRun, run, sha256File } from './lib/toolkit.mjs';

const CANDIDATE_EXTENSIONS = ['tar.gz', 'tar.xz'];

function findArchive(nodeArch) {
  for (const extension of CANDIDATE_EXTENSIONS) {
    const file = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-${nodeArch}.${extension}`);
    if (fs.existsSync(file)) return { file, extension };
  }
  return null;
}

function expectedSha(name) {
  const sums = path.join(RUNTIME_DIR, 'SHASUMS256.txt');
  if (!fs.existsSync(sums)) throw new Error(`缺 ${sums}：官方校验和未下载，拒绝在无来源校验的情况下解包`);
  for (const line of fs.readFileSync(sums, 'utf8').split('\n')) {
    const [sha, entry] = line.trim().split(/\s+/);
    if (entry === name) return sha;
  }
  throw new Error(`SHASUMS256.txt 里没有 ${name}`);
}

const report = [];

for (const target of TARGETS) {
  const archive = findArchive(target.nodeArch);
  if (!archive) {
    report.push({ triple: target.triple, status: 'blocked', reason: 'archive-missing' });
    continue;
  }
  const name = path.basename(archive.file);
  const actual = sha256File(archive.file);
  const expected = expectedSha(name);
  if (actual !== expected) {
    throw new Error(`${name} SHA-256 不符：期望 ${expected}，实测 ${actual}`);
  }

  const extractRoot = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-${target.nodeArch}`);
  fs.rmSync(extractRoot, { recursive: true, force: true });
  ensureDir(RUNTIME_DIR);
  mustRun('tar', ['-xf', archive.file, '-C', RUNTIME_DIR]);

  const binary = path.join(extractRoot, 'bin', 'node');
  if (!fs.existsSync(binary)) throw new Error(`解包后找不到 ${binary}`);

  // Mach-O 架构必须与目标 triple 相符；错架构的读数会静默把结论带偏。
  const file = run('file', ['-b', binary]);
  report.push({
    triple: target.triple,
    status: 'ok',
    archive: name,
    archiveBytes: byteSize(archive.file),
    archiveSha256: actual,
    binary,
    binaryBytes: byteSize(binary),
    binarySha256: sha256File(binary),
    macho: file.stdout.trim(),
  });
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
