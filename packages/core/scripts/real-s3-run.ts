import { runS3Real } from '../src/acceptance/run-s3-real.js';
import { resolveSmokeTargets } from '../src/provider/smoke.js';

/**
 * LEGAL-REAL 真卷宗真跑（用户执行）：
 *   COURTWORK_S3_REAL=DeepSeek DEEPSEEK_API_KEY=sk-… COURTWORK_S3_CONTRACT=/路径/合同.pdf \
 *     pnpm --filter @courtwork/core real:s3
 * 无 key 无全文：provider 缺席即拒跑，材料不读。防 Demo 污染断言违规即非零退出。
 * 产出：workDir/real-run-evidence.json（真机证据七项，docs/66 观测原始数据）。
 */

const targetName = process.env.COURTWORK_S3_REAL;
const contractPath = process.env.COURTWORK_S3_CONTRACT;

if (!contractPath) {
  console.error('缺 COURTWORK_S3_CONTRACT（真卷宗合同文件路径），退出。');
  process.exit(1);
}

let provider;
if (targetName) {
  const resolved = resolveSmokeTargets(process.env).find((item) => item.target.name.includes(targetName));
  if (!resolved?.apiKey) {
    console.error(`COURTWORK_S3_REAL=${targetName} 但未找到对应 API key 环境变量，退出（无 key 无全文）。`);
    process.exit(1);
  }
  provider = resolved.target.create({ apiKey: resolved.apiKey, modelId: resolved.modelId });
  console.log(`S3 真卷宗真跑：${resolved.target.name} · ${resolved.modelId}`);
}

const result = await runS3Real({ contractPath, provider, qccApiKey: process.env.QCC_API_KEY });

console.log(`状态：${result.status}${result.requestId ? `（门禁暂停，requestId=${result.requestId}）` : ''}`);
console.log(`证据文件：${result.workDir}/real-run-evidence.json`);
console.log('真机证据七项：');
console.log(`  1. 素材 hash：${JSON.stringify(result.evidence.materialSha256)}`);
console.log(`  2. prompt hash：${result.evidence.promptSha256}`);
console.log(`  3. 版本三元：${JSON.stringify(result.evidence.versionTriple)}`);
console.log(`  4. 模型事件：${JSON.stringify(result.evidence.modelEvents)}`);
console.log(`  5. 锚点命中：${JSON.stringify(result.evidence.citationStats)}`);
console.log(`  6. 门禁暂停：${result.evidence.gatePaused}`);
console.log(`  7. 防 Demo 污染：${result.evidence.noDemoViolations.length === 0 ? '零违规' : '违规'}`);
if (result.evidence.noDemoViolations.length > 0) {
  for (const violation of result.evidence.noDemoViolations) console.error(`  VIOLATION: ${violation}`);
  process.exitCode = 1;
}
