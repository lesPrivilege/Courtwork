import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadDataset } from '../dataset-loader.js';
import { generateTests, type PromptfooTestCase } from './generate-tests.js';

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const datasetsRoot = join(evalRoot, 'datasets');

/** promptfoo 的 `tests: file://.../tests-entry.ts:s3Tests` 动态测试生成入口。 */
export function s3Tests(): PromptfooTestCase[] {
  return generateTests(loadDataset(datasetsRoot, 'S3'), { evalRoot });
}

/** promptfoo 的 `tests: file://.../tests-entry.ts:s4Tests` 动态测试生成入口。 */
export function s4Tests(): PromptfooTestCase[] {
  return generateTests(loadDataset(datasetsRoot, 'S4'), { evalRoot });
}
