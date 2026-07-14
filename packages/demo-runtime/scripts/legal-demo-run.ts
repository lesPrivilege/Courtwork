import { runLegalDemo } from '../src/acceptance/run-legal-demo.js';
import { resolveSmokeTargets } from '@courtwork/provider/smoke';

/**
 * LEGAL-DEMO-RUN 全链穿越（合成卷宗 → 带修订 Word）：
 *   Scripted 档（缺省）：pnpm --filter @courtwork/demo-runtime demo:legal
 *   真 key 档：COURTWORK_S3_REAL=DeepSeek DEEPSEEK_API_KEY=sk-… pnpm --filter @courtwork/demo-runtime demo:legal
 * 黄金对照（事件骨架/预埋考点/锚点复算/六段标记/修订命中）任一不符即非零退出。
 */

const realTarget = process.env.COURTWORK_S3_REAL;
let provider;
if (realTarget) {
  const resolved = resolveSmokeTargets(process.env).find((item) => item.target.name.includes(realTarget));
  if (!resolved?.apiKey) {
    console.error(`COURTWORK_S3_REAL=${realTarget} 但未找到对应 API key 环境变量，退出（无 key 无全文）。`);
    process.exit(1);
  }
  provider = resolved.target.create({ apiKey: resolved.apiKey, modelId: resolved.modelId });
  console.log(`真 key 档：${resolved.target.name} · ${resolved.modelId}`);
}

const result = await runLegalDemo({ provider, qccApiKey: process.env.QCC_API_KEY });

console.log(`LEGAL-DEMO 全链穿越完成（${result.tier} 档），产物：${result.workDir}`);
console.log('');
console.log('逐站目击：');
for (const record of result.stations) {
  console.log(`  [${record.station}] ${JSON.stringify(record.detail)}`);
}
console.log('');
console.log(`事件骨架：${result.eventTypes.join(' -> ')}`);
console.log(`锚点观测：${JSON.stringify(result.citationStats)}`);
console.log(`修订处置：${result.outcomes.map((o) => `${o.id}:${o.status}`).join('  ')}`);
console.log(`产物：redline.docx（${result.docx.length} bytes）+ revision-instruction-set.json + events.jsonl + legal-demo-evidence.json`);
if (result.goldenIssues.length > 0) {
  for (const issue of result.goldenIssues) console.error(`GOLDEN FAIL: ${issue}`);
  process.exitCode = 1;
} else {
  console.log('黄金对照：PASS（骨架/考点/锚点复算/六段标记/修订命中全符）');
}
