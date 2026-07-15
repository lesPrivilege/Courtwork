import { resolveSmokeTargets, runSmokeTest } from '@courtwork/provider/smoke';

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
        const u = result.usage;
        const show = (value?: number): string => (value === undefined ? '未知' : String(value));
        console.log(
          `  token 用量：输入 ${show(u.inputTokens)} / 输出 ${show(u.outputTokens)}` +
            ` / 缓存命中 ${show(u.cacheHitInputTokens)} / 缓存未命中 ${show(u.cacheMissInputTokens)}` +
            ` / 推理 ${show(u.reasoningOutputTokens)}`,
        );
        // 最小 usage 捕获路径（USAGE-LEDGER-1）：打印原始 usage 对象——纯 token 计数、无 PII，
        // 运行人核对脱敏后可存为 DeepSeek 原始响应 fixture（真实捕获需 DEEPSEEK_API_KEY）。
        console.log(`  原始 usage（脱敏后可存为 fixture）：${JSON.stringify(u.rawUsage)}`);
      }
      if (result.costEstimate) {
        const e = result.costEstimate;
        console.log(`  估算成本：$${e.usd.toFixed(6)}（价目表 ${e.priceTableVersion} @ ${e.effectiveAt}）`);
      }
      if (result.reasoningLength) {
        console.log(`  推理内容长度：${result.reasoningLength} 字符`);
      }
      console.log(`  [${target.name}] 冒烟测试通过`);
    } catch (error) {
      const detail =
        error instanceof Error
          ? `${error.message}${error.cause ? `（原因：${error.cause instanceof Error ? error.cause.message : error.cause}）` : ''}`
          : String(error);
      console.error(`  [${target.name}] 冒烟测试失败：${detail}`);
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
