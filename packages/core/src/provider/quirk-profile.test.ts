import { describe, expect, it } from 'vitest';
import * as quirks from './quirk-profile.js';
import { applyReasoningRoute, DEEPSEEK_QUIRK_PROFILE, OPENAI_COMPATIBLE_REASONING_ROUTE } from './quirk-profile.js';

describe('provider quirk profiles — DeepSeek-first', () => {
  it('DeepSeek: base URL 含 /v1，response_format 档位仅 json_object（docs/18 §3 表格）', () => {
    expect(DEEPSEEK_QUIRK_PROFILE.baseUrl).toBe('https://api.deepseek.com/v1');
    expect(DEEPSEEK_QUIRK_PROFILE.responseFormat.tier).toBe('json_object');
  });

  it('只内置 DeepSeek profile，Qwen/豆包等待 roadmap 适配器', () => {
    expect(quirks).not.toHaveProperty('QWEN_QUIRK_PROFILE');
    expect(quirks).not.toHaveProperty('DOUBAO_QUIRK_PROFILE');
  });

  it('DeepSeek 把 reasoning_content 列为已知归一化候选字段名', () => {
    expect(DEEPSEEK_QUIRK_PROFILE.reasoningFieldCandidates).toContain('reasoning_content');
  });
});

describe('reasoning route is profile-driven', () => {
  it('DeepSeek V4：thinking 请求字段开关（#41 照官方现值），模型名不被路由覆盖', () => {
    // 官方语义：思考模式经 thinking 字段控制，与 flash/pro 档位解耦；
    // V4 缺省即 enabled，所以 standard 必须显式发 disabled，否则 UI 档位会静默升级。
    expect(applyReasoningRoute(DEEPSEEK_QUIRK_PROFILE, 'deepseek-v4-flash', 'standard')).toEqual({
      model: 'deepseek-v4-flash', extraBody: { thinking: { type: 'disabled' } },
    });
    expect(applyReasoningRoute(DEEPSEEK_QUIRK_PROFILE, 'deepseek-v4-pro', 'deep')).toEqual({
      model: 'deepseek-v4-pro', extraBody: { thinking: { type: 'enabled' } },
    });
    // 用户所选模型永不被静默替换（#40 允许覆盖禁止静默的路由侧保证）
    expect(applyReasoningRoute(DEEPSEEK_QUIRK_PROFILE, 'deepseek-chat', 'standard').model).toBe('deepseek-chat');
  });

  it('保留 provider 无关的 OpenAI-compatible request-field 路由扩展点', () => {
    expect(OPENAI_COMPATIBLE_REASONING_ROUTE).toEqual({
      kind: 'request_field', field: 'reasoning_effort', values: { standard: 'low', deep: 'high' },
    });
  });

  it('DeepSeek standard 的 wire 必须显式携带 disabled，禁止依赖 provider 默认值', () => {
    const wire = JSON.stringify(applyReasoningRoute(DEEPSEEK_QUIRK_PROFILE, 'deepseek-v4-flash', 'standard').extraBody);
    expect(wire).toBe('{"thinking":{"type":"disabled"}}');
  });
});
