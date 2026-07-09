import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEval } from '../src/runner.js';
import { summarizeByProvider, formatComparisonReportMarkdown, type PromptfooResultsFile } from '../src/report.js';

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseScenarioArg(): 'S3' | 'S4' {
  const idx = process.argv.indexOf('--scenario');
  const value = idx >= 0 ? process.argv[idx + 1] : undefined;
  if (value !== 'S3' && value !== 'S4') {
    throw new Error('用法: tsx scripts/run-eval.ts --scenario S3|S4');
  }
  return value;
}

async function main() {
  const scenario = parseScenarioArg();
  const reportsDir = join(evalRoot, 'reports');
  await mkdir(reportsDir, { recursive: true });
  const resultsPath = join(reportsDir, `${scenario}-results.json`);
  const reportPath = join(reportsDir, `${scenario}-comparison.md`);

  console.log(`跑 ${scenario} 评测（provider 列表见 promptfoo/${scenario}.promptfooconfig.yaml）...`);
  await runEval({ evalRoot, scenario, outputPath: resultsPath });

  const resultsFile = JSON.parse(await readFile(resultsPath, 'utf-8')) as PromptfooResultsFile;
  const summaries = summarizeByProvider(resultsFile);
  const markdown = formatComparisonReportMarkdown(summaries, scenario);

  await writeFile(reportPath, markdown);
  console.log(`\n对比报告已写入 ${reportPath}\n`);
  console.log(markdown);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
