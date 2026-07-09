import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { access } from 'node:fs/promises';

const execFileAsync = promisify(execFile);

export interface RunEvalOptions {
  /** eval/ 包根目录的绝对路径。 */
  evalRoot: string;
  scenario: 'S3' | 'S4';
  /** promptfoo 结果 JSON 的输出路径（绝对路径）。 */
  outputPath: string;
}

/**
 * 跑分脚本本体：调用 promptfoo CLI 对指定场景跑一次评测。provider 列表完全来自
 * `promptfoo/<scenario>.promptfooconfig.yaml`——本函数不接受、也不允许传入任何
 * provider 覆盖参数，换 provider 只能改配置文件，呼应"provider 一律走配置"。
 */
export async function runEval(options: RunEvalOptions): Promise<void> {
  const configPath = join(options.evalRoot, 'promptfoo', `${options.scenario}.promptfooconfig.yaml`);
  try {
    await execFileAsync(
      'npx',
      ['promptfoo', 'eval', '-c', configPath, '--no-cache', '-o', options.outputPath],
      { cwd: options.evalRoot, maxBuffer: 1024 * 1024 * 64 },
    );
  } catch (err) {
    // promptfoo eval 在有用例未通过时以非零码退出——这是正常的评测结果，不是跑分器崩溃。
    // 区分方式：结果文件是否真的写出来了。写出来了就说明本次跑分已完整完成，只是有
    // 用例没过；没写出来才是真的执行失败，需要把原始错误往上抛。
    const resultFileExists = await access(options.outputPath).then(
      () => true,
      () => false,
    );
    if (!resultFileExists) throw err;
  }
}
