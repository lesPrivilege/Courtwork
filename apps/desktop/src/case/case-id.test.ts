import { describe, expect, it } from 'vitest';
import { LEGACY_CASE_SCENARIO_COPY, WORK_SAFE_CASE_ID_RE, isWorkSafeCaseId, mintCaseId } from './case-id';

/**
 * WORK-TURN-1 G：caseId 去标题化。
 * 旧铸号 `case-${Date.now()}-${title}` 把标题原文拼进 caseId——work_state.rs safe_token 只认
 * ASCII 字母数字与 `-_.`，中文标题案首次 commit 即 InvalidRef（真机红条根因，复核坐实）。
 * 本模块：铸号只出安全 token（UUID），标题只作展示字段；WORK_SAFE_CASE_ID_RE 是 Rust
 * safe_token 的只读镜像（parity mirror，不得放宽——路径穿越红线在 Rust 侧强制）。
 */
describe('mintCaseId', () => {
  it('铸号恒过 work_state 安全 token 镜像（与标题无关，中文标题不再进 id）', () => {
    const id = mintCaseId();
    expect(id).toMatch(WORK_SAFE_CASE_ID_RE);
    expect(id.length).toBeLessThanOrEqual(128);
  });

  it('两次铸号不同（无时间戳碰撞窗口）', () => {
    expect(mintCaseId()).not.toBe(mintCaseId());
  });
});

describe('isWorkSafeCaseId（存量案守卫）', () => {
  it('旧版中文标题 id 判不安全（原位容忍：场景运行前显式引导而非红条）', () => {
    expect(isWorkSafeCaseId('case-1752736000000-合成卷宗案')).toBe(false);
  });

  it('旧版 ASCII 标题 id 判安全（存量可继续跑场景，零迁移成本）', () => {
    expect(isWorkSafeCaseId('case-1752736000000-Contract')).toBe(true);
  });

  it('穿越形态判不安全（镜像 Rust 语义：`..`/分隔符/空串）', () => {
    expect(isWorkSafeCaseId('..')).toBe(false);
    expect(isWorkSafeCaseId('a/../b')).toBe(false);
    expect(isWorkSafeCaseId('')).toBe(false);
  });
});

describe('LEGACY_CASE_SCENARIO_COPY（voice：发生了什么+下一步，零技术措辞）', () => {
  it('不含技术概念（引用/token/InvalidRef/id），含下一步指引', () => {
    for (const banned of ['引用', 'token', 'Invalid', 'id', 'ID']) {
      expect(LEGACY_CASE_SCENARIO_COPY).not.toContain(banned);
    }
    expect(LEGACY_CASE_SCENARIO_COPY).toContain('新建案件');
  });
});
