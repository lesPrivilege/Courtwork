import { evaluateS3DemoGolden, runS3Demo } from '../src/acceptance/run-s3-demo.js';
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
// GOAL-2 接缝对照：真模型下内容可变（风险数量/文本），事件结构骨架不变——
// 与 scripted golden（s3-flow.integration.test）同一序列即为"接缝不漂移"的实证。
const golden = evaluateS3DemoGolden({
  eventTypes: result.eventTypes,
  riskList: result.replay.artifacts.RiskList as Parameters<typeof evaluateS3DemoGolden>[0]['riskList'],
});
console.log(`  golden 骨架对照：${golden.structureMatches ? 'PASS（与 scripted golden 一致）' : 'DIFF'}`);
console.log(`  预埋考点命中：${golden.matchedPreloadedFindings}/7`);
console.log(`  产出 artifact 类型：${Object.keys(result.replay.artifacts).join(', ')}`);
console.log(`  确认记录：${Object.keys(result.replay.confirmations).length} 条`);
console.log(`  RevisionEvent 记录：${result.replay.revisionEventIds.length} 条`);
console.log(`  场景完成：${result.replay.completed}`);
if (!golden.pass) {
  for (const issue of golden.issues) console.error(`  GOLDEN FAIL: ${issue}`);
  process.exitCode = 1;
}
