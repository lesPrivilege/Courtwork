/**
 * PI-SIDECAR-DIST-1R · 残留清点与清理。
 *
 * 本实验的全部产物都落 `fixtures/sidecar-dist/dist/`——该目录被仓库根 `.gitignore` 的
 * `dist/` 一条覆盖，故实验残留**不入库**。但它体积不小，跑完须显式清理，不留在开发机上过夜。
 *
 * `--report-only` 是 R1 返修新增的：返修票要求原始 JSON **保全到独立验收之后再清**，
 * 所以必须有一个只清点、不删除的姿势——残留体积这个数字本身也要有出处，不能靠估算
 * （`3207b27` 当初订正掉的正是「约 1.4 GiB」这个低报近一倍的估算值）。
 *
 * **口径（ADR-022 六-E 冻结）**：`3207b27` 的 2.27 GiB、R1 的 2.35 GiB 与 R2 的实测值是
 * **三个并列的保全范围，互不取代**——不是同一个量的三次修正。本脚本只报「此刻磁盘上有多少」，
 * 范围差异由报告第十八节逐项求和说明。
 *
 * 用法：
 *   `node scripts/clean.mjs --report-only`    只清点，逐子目录报字节，**不删**
 *   `node scripts/clean.mjs`                  清全部（含已核过来源的 Node 发行包）
 *   `node scripts/clean.mjs --keep-runtime`   只清产物，留下发行包备复跑
 */

import fs from 'node:fs';
import path from 'node:path';

import { DIST_DIR, RUNTIME_DIR, byteSize, treeSize } from './lib/toolkit.mjs';

const keepRuntime = process.argv.includes('--keep-runtime');
const reportOnly = process.argv.includes('--report-only');

if (!fs.existsSync(DIST_DIR)) {
  process.stdout.write('dist/ 不存在，无残留。\n');
} else {
  const before = treeSize(DIST_DIR);
  const entries = [];
  for (const entry of fs.readdirSync(DIST_DIR, { withFileTypes: true })) {
    const absolute = path.join(DIST_DIR, entry.name);
    const skipped = keepRuntime && absolute === RUNTIME_DIR;
    const size = entry.isDirectory() ? treeSize(absolute) : byteSize(absolute);
    if (!reportOnly && !skipped) fs.rmSync(absolute, { recursive: true, force: true });
    entries.push({ name: entry.name, bytes: size, removed: !reportOnly && !skipped });
  }
  entries.sort((a, b) => b.bytes - a.bytes);
  const after = fs.existsSync(DIST_DIR) ? treeSize(DIST_DIR) : 0;
  process.stdout.write(
    `${JSON.stringify(
      {
        dist: DIST_DIR,
        mode: reportOnly ? 'report-only' : keepRuntime ? 'keep-runtime' : 'full',
        totalBytes: before,
        totalGiB: Number((before / 1024 ** 3).toFixed(2)),
        afterBytes: after,
        entries,
      },
      null,
      2,
    )}\n`,
  );
}
