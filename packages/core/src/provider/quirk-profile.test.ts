import { describe, expect, it } from 'vitest';
import { DEEPSEEK_QUIRK_PROFILE, DOUBAO_QUIRK_PROFILE, QWEN_QUIRK_PROFILE } from './quirk-profile.js';

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
