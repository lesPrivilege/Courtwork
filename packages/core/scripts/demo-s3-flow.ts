import { runS3Demo } from '../src/acceptance/run-s3-demo.js';
import { resolveSmokeTargets } from '../src/provider/smoke.js';

// GOAL-1 真模型首跑：COURTWORK_S3_REAL=DeepSeek|Qwen|豆包 + 对应 *_API_KEY 环境变量
// （形制同 smoke:provider）；未设置时保持 demo ScriptedProvider 缺省。
const realTarget = process.env.COURTWORK_S3_REAL;
let overrides: Parameters<typeof runS3Demo>[1];
if (realTarget) {
  const resolved = resolveSmokeTargets(process.env).find((item) => item.target.name.includes(realTarget));
  if (!resolved?.apiKey) {
    console.error(`COURTWORK_S3_REAL=${realTarget} 但未找到对应 API key 环境变量，退出。`);
    process.exit(1);
  }
  overrides = { provider: resolved.target.create({ apiKey: resolved.apiKey, modelId: resolved.modelId }) };
  console.log(`S3 真模型首跑：${resolved.target.name} · ${resolved.modelId}`);
}

const result = await runS3Demo(undefined, overrides);

console.log(`S3 演示完成，产物写入：${result.workDir}`);
console.log(`  - redline.docx（${result.docx.length} bytes）`);
console.log('  - revision-instruction-set.json');
console.log('  - events.jsonl（事件流，可回放）');
console.log('');
console.log('指令处理结果：');
for (const outcome of result.outcomes) {
  console.log(`  ${outcome.id}: ${outcome.status}${outcome.detail ? ` (${outcome.detail})` : ''}`);
}
console.log('');
console.log('事件流回放摘要：');
console.log(`  事件类型序列：${result.eventTypes.join(' -> ')}`);
console.log(`  产出 artifact 类型：${Object.keys(result.replay.artifacts).join(', ')}`);
console.log(`  确认记录：${Object.keys(result.replay.confirmations).length} 条`);
console.log(`  RevisionEvent 记录：${result.replay.revisionEventIds.length} 条`);
console.log(`  场景完成：${result.replay.completed}`);
