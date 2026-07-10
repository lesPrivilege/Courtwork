import { resolveSmokeTargets, runSmokeTest } from '../src/provider/smoke.js';

async function main(): Promise<void> {
  const resolved = resolveSmokeTargets(process.env);
  let ranAny = false;

  for (const { target, apiKey, modelId } of resolved) {
    if (!apiKey) {
      console.log(`[${target.name}] 跳过：未设置环境变量 ${target.envKey}`);
      continue;
    }
    ranAny = true;
    console.log(`\n[${target.name}] 使用模型 ${modelId} ...`);
    try {
      const result = await runSmokeTest(target, apiKey, modelId);
      console.log(`  内容：${result.greeting}`);
      if (result.usage) {
        console.log(`  token 用量：输入 ${result.usage.inputTokens} / 输出 ${result.usage.outputTokens}`);
      }
      if (result.costUsd !== undefined) {
        console.log(`  估算成本：$${result.costUsd.toFixed(6)}`);
      }
      if (result.reasoningLength) {
        console.log(`  推理内容长度：${result.reasoningLength} 字符`);
      }
      console.log(`  [${target.name}] 冒烟测试通过`);
    } catch (error) {
      console.error(`  [${target.name}] 冒烟测试失败：`, error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }

  if (!ranAny) {
    console.log('未检测到任何 provider 的 API key 环境变量，全部跳过。');
    console.log('设置以下任一环境变量后重新运行以验证对应 provider（也可用 *_MODEL_ID 覆盖默认模型）：');
    for (const { target } of resolved) {
      console.log(`  ${target.envKey}（${target.name}，默认模型 ${target.defaultModel}）`);
    }
  }
}

await main();
