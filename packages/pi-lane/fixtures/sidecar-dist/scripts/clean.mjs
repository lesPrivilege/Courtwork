/**
 * PI-SIDECAR-DIST-1 · 残留清理。
 *
 * 本实验的全部产物都落 `fixtures/sidecar-dist/dist/`——该目录被仓库根 `.gitignore` 的
 * `dist/` 一条覆盖，故实验残留**不入库**。但它体积不小：跑完整套（含 sign-probe 的六份
 * 重签副本）实测 **2,436,991,750 B（约 2.27 GiB）**，跑完须显式清理，不留在开发机上过夜。
 *
 * 用法：
 *   `node scripts/clean.mjs`            清全部（含已下载的 Node 发行包）
 *   `node scripts/clean.mjs --keep-runtime`  只清产物，留下已核过 SHA 的发行包备复跑
 */

import fs from 'node:fs';
import path from 'node:path';

import { DIST_DIR, RUNTIME_DIR, byteSize, treeSize } from './lib/toolkit.mjs';

const keepRuntime = process.argv.includes('--keep-runtime');

if (!fs.existsSync(DIST_DIR)) {
  process.stdout.write('dist/ 不存在，无残留。\n');
} else {
  const before = treeSize(DIST_DIR);
  const removed = [];
  for (const entry of fs.readdirSync(DIST_DIR, { withFileTypes: true })) {
    const absolute = path.join(DIST_DIR, entry.name);
    if (keepRuntime && absolute === RUNTIME_DIR) continue;
    const size = entry.isDirectory() ? treeSize(absolute) : byteSize(absolute);
    fs.rmSync(absolute, { recursive: true, force: true });
    removed.push({ name: entry.name, bytes: size });
  }
  const after = fs.existsSync(DIST_DIR) ? treeSize(DIST_DIR) : 0;
  process.stdout.write(
    `${JSON.stringify({ dist: DIST_DIR, keepRuntime, beforeBytes: before, afterBytes: after, removed }, null, 2)}\n`,
  );
}
