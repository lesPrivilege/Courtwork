import { describe, expect, it } from 'vitest';
import { applyReasoningRoute, DEEPSEEK_QUIRK_PROFILE, DOUBAO_QUIRK_PROFILE, QWEN_QUIRK_PROFILE } from './quirk-profile.js';

describe('provider quirk profiles — docs/18 §6.3 已拍板的三家差异', () => {
  it('DeepSeek: base URL 含 /v1，response_format 档位仅 json_object（docs/18 §3 表格）', () => {
    expect(DEEPSEEK_QUIRK_PROFILE.baseUrl).toBe('https://api.deepseek.com/v1');
    expect(DEEPSEEK_QUIRK_PROFILE.responseFormat.tier).toBe('json_object');
  });

  it('Qwen: base URL 是百炼兼容模式端点，response_format 档位为 json_schema_strict', () => {
    expect(QWEN_QUIRK_PROFILE.baseUrl).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(QWEN_QUIRK_PROFILE.responseFormat.tier).toBe('json_schema_strict');
  });

  it('豆包: base URL 是 /api/v3（不是 /v1！这是 docs/18 quirk① 的真实案例），response_format 为 json_schema（beta，非 strict）', () => {
    expect(DOUBAO_QUIRK_PROFILE.baseUrl).toBe('https://ark.cn-beijing.volces.com/api/v3');
    expect(DOUBAO_QUIRK_PROFILE.baseUrl).not.toMatch(/\/v1$/);
    expect(DOUBAO_QUIRK_PROFILE.responseFormat.tier).toBe('json_schema');
  });

  it('三家都把 reasoning_content 列为已知归一化候选字段名（docs/18 quirk③，未验证的字段名不编造）', () => {
    expect(DEEPSEEK_QUIRK_PROFILE.reasoningFieldCandidates).toContain('reasoning_content');
    expect(QWEN_QUIRK_PROFILE.reasoningFieldCandidates).toContain('reasoning_content');
    expect(DOUBAO_QUIRK_PROFILE.reasoningFieldCandidates).toContain('reasoning_content');
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

  it('maps Qwen and OpenAI-compatible profiles to declared request fields', () => {
    expect(applyReasoningRoute(QWEN_QUIRK_PROFILE, 'qwen3.5-plus', 'deep')).toEqual({
      model: 'qwen3.5-plus', extraBody: { enable_thinking: true },
    });
    expect(applyReasoningRoute(DOUBAO_QUIRK_PROFILE, 'doubao-seed-1.6', 'standard')).toEqual({
      model: 'doubao-seed-1.6', extraBody: { reasoning_effort: 'low' },
    });
  });

  it('DeepSeek standard 的 wire 必须显式携带 disabled，禁止依赖 provider 默认值', () => {
    const wire = JSON.stringify(applyReasoningRoute(DEEPSEEK_QUIRK_PROFILE, 'deepseek-v4-flash', 'standard').extraBody);
    expect(wire).toBe('{"thinking":{"type":"disabled"}}');
  });
});
