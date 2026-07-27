import { createModels, fauxAssistantMessage, fauxProvider } from '@earendil-works/pi-ai';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDeepSeekLane, PI_LANE_API_KEY_ENV, PI_LANE_MODEL_ID, PI_LANE_PROVIDER_ID } from './provider.js';

/**
 * 本组**不触网、不消耗额度**：只核实目录、价目、凭据判定与 usage 契约。
 * 真 key 的端到端跑通属人工步骤，另在 SPEC 登记，不混写进自动化门。
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('甜点档在册', () => {
  it('绿证一：deepseek-v4-flash 是 pi-ai 原生目录条目，走 openai-completions 通道', async () => {
    vi.stubEnv(PI_LANE_API_KEY_ENV, 'sk-构造值-不触网');
    const lane = await createDeepSeekLane();
    expect(lane.model?.id).toBe(PI_LANE_MODEL_ID);
    expect(lane.model?.api).toBe('openai-completions');
    expect(lane.model?.provider).toBe(PI_LANE_PROVIDER_ID);
  });

  it('绿证二：价目在册——预算面的 usd 换算依赖它，缺价目等于没有预算', async () => {
    vi.stubEnv(PI_LANE_API_KEY_ENV, 'sk-构造值-不触网');
    const lane = await createDeepSeekLane();
    expect(lane.model?.cost.input).toBeGreaterThan(0);
    expect(lane.model?.cost.output).toBeGreaterThan(0);
  });

  it('绿证三：有凭据即报就绪，且说明里带模型与端点', async () => {
    vi.stubEnv(PI_LANE_API_KEY_ENV, 'sk-构造值-不触网');
    const lane = await createDeepSeekLane();
    expect(lane.configured).toBe(true);
    expect(lane.detail).toContain(PI_LANE_MODEL_ID);
  });
});

describe('缺配置显式', () => {
  it('红证一：没有 DEEPSEEK_API_KEY 时不就绪，且说明点名该环境变量', async () => {
    vi.stubEnv(PI_LANE_API_KEY_ENV, '');
    const lane = await createDeepSeekLane();
    expect(lane.configured).toBe(false);
    expect(lane.detail).toContain(PI_LANE_API_KEY_ENV);
  });

  it('红证二：不就绪时不给可用模型的假象——configured 与可用性同源', async () => {
    vi.stubEnv(PI_LANE_API_KEY_ENV, '');
    const lane = await createDeepSeekLane();
    expect(lane.configured).toBe(false);
  });
});

describe('usage 契约（rawUsage 可获取性核实，供 C3-4 消费）', () => {
  it('绿证四：公开 usage 是归一化结构，带 cost；**不存在** rawUsage 公开字段', async () => {
    const faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1' }] });
    const models = createModels();
    models.setProvider(faux.provider);
    faux.setResponses([fauxAssistantMessage('收到。')]);

    const message = await models.completeSimple(faux.getModel(), {
      systemPrompt: '',
      messages: [{ role: 'user', content: '你好', timestamp: 0 }],
    });

    expect(Object.keys(message.usage).sort()).toEqual(
      ['cacheRead', 'cacheWrite', 'cost', 'input', 'output', 'totalTokens'].sort(),
    );
    expect(message.usage).not.toHaveProperty('rawUsage');
    expect(Object.keys(message.usage.cost).sort()).toEqual(
      ['cacheRead', 'cacheWrite', 'input', 'output', 'total'].sort(),
    );
  });
});
