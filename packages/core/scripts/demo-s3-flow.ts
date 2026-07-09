import { runS3Demo } from '../src/acceptance/run-s3-demo.js';

const result = await runS3Demo();

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
