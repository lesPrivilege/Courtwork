import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRegressions } from '../src/regression.js';
import type { EvalRunResultSet } from '../src/results.js';

/**
 * 回归模式：core / 提示词 / 场景定义变更后，跑一次 `run-eval.ts` 产出新的
 * `<scenario>-results.json`，再用本脚本与基线对比。建立/更新基线：
 *   cp reports/S3-results.json reports/S3-baseline.json
 */

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs() {
  const argAt = (flag: string) => {
    const idx = process.argv.indexOf(flag);
    return idx >= 0 ? process.argv[idx + 1] : undefined;
  };
  const scenario = argAt('--scenario');
  if (scenario !== 'S3' && scenario !== 'S4') {
    throw new Error('用法: tsx scripts/regression-check.ts --scenario S3|S4 [--baseline path] [--current path] [--threshold 0.05]');
  }
  const reportsDir = join(evalRoot, 'reports');
  return {
    scenario,
    baselinePath: argAt('--baseline') ?? join(reportsDir, `${scenario}-baseline.json`),
    currentPath: argAt('--current') ?? join(reportsDir, `${scenario}-results.json`),
    threshold: argAt('--threshold') ? Number(argAt('--threshold')) : 0.05,
  };
}

async function main() {
  const { scenario, baselinePath, currentPath, threshold } = parseArgs();
  const baseline = JSON.parse(await readFile(baselinePath, 'utf-8')) as EvalRunResultSet;
  const current = JSON.parse(await readFile(currentPath, 'utf-8')) as EvalRunResultSet;

  const findings = findRegressions(baseline, current, threshold);
  const regressed = findings.filter((f) => f.regressed);

  console.log(`${scenario}：对比了 ${findings.length} 个基线/当次均存在的用例（阈值 Δ${threshold}）。`);
  for (const f of regressed) {
    console.log(
      `  回归 [${f.providerId}] ${f.caseId}: ${f.baselineScore.toFixed(3)} -> ${f.currentScore.toFixed(3)} (Δ${f.delta.toFixed(3)})`,
    );
  }

  if (regressed.length > 0) {
    console.error(`\n发现 ${regressed.length} 处回归。`);
    process.exitCode = 1;
  } else {
    console.log('\n未发现回归。');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
