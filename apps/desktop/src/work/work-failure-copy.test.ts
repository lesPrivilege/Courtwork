import { describe, expect, it } from 'vitest';
import {
  WORK_MODEL_FAILURE_FALLBACK_COPY,
  workFailureDisplayCopy,
  workScenarioFailureDisplayCopy,
} from './work-failure-copy';

/**
 * PROVIDER-STREAM-1 ③：UI 守卫文本过 voice——协议外守卫与英文技术报文零裸透（发生了什么+下一步），
 * provider 归一后的中文产品语原样透传（其报文已是显示形态）。
 */
describe('workFailureDisplayCopy', () => {
  it('协议外守卫报文改写为产品语（真机 I 项裸透文本）', () => {
    expect(workFailureDisplayCopy('#lt: Provider stream threw outside the closed failure protocol')).toBe(
      WORK_MODEL_FAILURE_FALLBACK_COPY,
    );
    expect(workFailureDisplayCopy('Provider stream threw outside the closed failure protocol')).toBe(
      WORK_MODEL_FAILURE_FALLBACK_COPY,
    );
  });

  it('英文技术报文一律兜底改写（零裸透）', () => {
    expect(workFailureDisplayCopy('Provider emitted an unknown stream event')).toBe(WORK_MODEL_FAILURE_FALLBACK_COPY);
    expect(workFailureDisplayCopy('TypeError: cannot read properties of undefined')).toBe(WORK_MODEL_FAILURE_FALLBACK_COPY);
  });

  it('夹带单个中文字的技术报文仍兜底，不得借启发式裸透', () => {
    expect(workFailureDisplayCopy('TypeError: 读 cannot read properties of undefined')).toBe(
      WORK_MODEL_FAILURE_FALLBACK_COPY,
    );
  });

  it('注入含模型输出片段的 InvalidResponse 技术报文时 UI 边界不透片段', () => {
    const fragment = 'CASE-FRAGMENT-INVALID-9X';
    const displayed = workFailureDisplayCopy(
      `provider "deepseek" 结构化输出在 1 次尝试后仍未通过 schema 校验：${fragment}`,
    );
    expect(displayed).toBe(WORK_MODEL_FAILURE_FALLBACK_COPY);
    expect(displayed).not.toContain(fragment);
  });

  it('中文产品语透传（provider 归一报文已是显示形态）', () => {
    expect(workFailureDisplayCopy('服务商请求失败（HTTP 429）')).toBe('服务商请求失败（HTTP 429）');
    expect(workFailureDisplayCopy('服务商响应未通过结构化校验（2 次尝试）')).toBe('服务商响应未通过结构化校验（2 次尝试）');
  });

  it('缺省报文兜底；兜底文案含下一步指引', () => {
    expect(workFailureDisplayCopy(undefined)).toBe(WORK_MODEL_FAILURE_FALLBACK_COPY);
    expect(WORK_MODEL_FAILURE_FALLBACK_COPY).toContain('重试');
  });
});

describe('workScenarioFailureDisplayCopy', () => {
  it('passes safe durable budget copy through unchanged', () => {
    const message = '预算配置无法继续本次审查 · 当前已知估算 $0.100000 · 当前成本覆盖不完整';
    expect(workScenarioFailureDisplayCopy({ reason: 'configuration', message })).toBe(message);
  });

  it.each([
    ['configuration' as const, 'paid Turn providerId=deepseek maxUsd'],
    ['runtime_limit' as const, 'Turn terminal exceeded maxSeconds'],
  ])('replaces legacy technical %s copy without inventing details', (reason, message) => {
    const displayed = workScenarioFailureDisplayCopy({ reason, message });
    expect(displayed).not.toMatch(/paid Turn|Turn terminal|providerId|maxUsd|maxSeconds/);
    expect(displayed).not.toMatch(/\$\d|complete|partial/);
  });
});
