import { describe, expect, it } from 'vitest';
import { WORK_MODEL_FAILURE_FALLBACK_COPY, workFailureDisplayCopy } from './work-failure-copy';

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

  it('中文产品语透传（provider 归一报文已是显示形态）', () => {
    expect(workFailureDisplayCopy('服务商请求失败（HTTP 429）')).toBe('服务商请求失败（HTTP 429）');
    expect(workFailureDisplayCopy('服务商响应未通过结构化校验（2 次尝试）')).toBe('服务商响应未通过结构化校验（2 次尝试）');
  });

  it('缺省报文兜底；兜底文案含下一步指引', () => {
    expect(workFailureDisplayCopy(undefined)).toBe(WORK_MODEL_FAILURE_FALLBACK_COPY);
    expect(WORK_MODEL_FAILURE_FALLBACK_COPY).toContain('重试');
  });
});
