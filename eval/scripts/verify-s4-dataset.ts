import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataset } from '../src/dataset-loader.js';
import { evaluateCase } from '../src/rules/evaluate.js';

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const datasetsRoot = join(evalRoot, 'datasets');

const cases = loadDataset(datasetsRoot, 'S4');
console.log(`已加载 ${cases.length} 个 S4 案例。`);

let failures = 0;
for (const c of cases) {
  const result = evaluateCase(c.expectedAnswer, {
    scoringRules: c.scoringRules,
    expectedAnswer: c.expectedAnswer,
    input: c.task.input,
  });
  const mark = result.pass ? 'OK  ' : 'FAIL';
  if (!result.pass) failures += 1;
  console.log(`${mark} ${c.id.padEnd(36)} score=${result.score.toFixed(2)} ${result.pass ? '' : result.reason}`);
}

console.log(`\n${failures === 0 ? '全部通过' : `${failures} 个案例未通过健全性检查`}`);
process.exit(failures === 0 ? 0 : 1);
