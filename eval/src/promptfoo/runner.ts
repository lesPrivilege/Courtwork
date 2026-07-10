import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { access, readFile, writeFile } from 'node:fs/promises';
import type { EvalRunResultSet } from '../results.js';
import { mapResultsFileToRunResults } from './map-results.js';
import type { PromptfooResultsFile } from './raw-results.js';

const execFileAsync = promisify(execFile);

export interface RunEvalOptions {
  /** eval/ 包根目录的绝对路径。 */
  evalRoot: string;
  scenario: 'S3' | 'S4';
  /** 中性结果 JSON（EvalRunResultSet）的输出路径（绝对路径）。 */
  outputPath: string;
}

/**
 * 跑分脚本本体：调用 promptfoo CLI 对指定场景跑一次评测，把它的原始输出翻译成
 * 中性的 EvalRunResultSet 后写到 outputPath——本文件之外的任何调用方都只看得到
 * 中性格式。provider 列表完全来自 `promptfoo/<scenario>.promptfooconfig.yaml`——
 * 本函数不接受、也不允许传入任何 provider 覆盖参数，换 provider 只能改配置文件，
 * 呼应"provider 一律走配置"。
 */
export async function runEval(options: RunEvalOptions): Promise<EvalRunResultSet> {
  const configPath = join(options.evalRoot, 'promptfoo', `${options.scenario}.promptfooconfig.yaml`);
  const rawOutputPath = `${options.outputPath}.raw.json`;
  try {
    await execFileAsync(
      'npx',
      ['promptfoo', 'eval', '-c', configPath, '--no-cache', '-o', rawOutputPath],
      { cwd: options.evalRoot, maxBuffer: 1024 * 1024 * 64 },
    );
  } catch (err) {
    // promptfoo eval 在有用例未通过时以非零码退出——这是正常的评测结果，不是跑分器崩溃。
    // 区分方式：结果文件是否真的写出来了。写出来了就说明本次跑分已完整完成，只是有
    // 用例没过；没写出来才是真的执行失败，需要把原始错误往上抛。
    const resultFileExists = await access(rawOutputPath).then(
      () => true,
      () => false,
    );
    if (!resultFileExists) throw err;
  }

  const raw = JSON.parse(await readFile(rawOutputPath, 'utf-8')) as PromptfooResultsFile;
  const runResultSet: EvalRunResultSet = {
    scenario: options.scenario,
    runResults: mapResultsFileToRunResults(raw),
  };
  await writeFile(options.outputPath, JSON.stringify(runResultSet, null, 2));
  return runResultSet;
}
