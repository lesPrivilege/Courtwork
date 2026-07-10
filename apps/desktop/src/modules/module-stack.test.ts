import { describe, expect, it } from 'vitest';
import {
  applyArtifactAutoExpand,
  collapseAllModules,
  DEFAULT_MODULE_OPEN,
  progressHeadCount,
  toggleModuleManual,
} from './module-stack';

describe('module stack (docs/49 ch.3)', () => {
  it('progress 面板头计数 frontier 形制 N/M', () => {
    expect(progressHeadCount(0, 6)).toBe('0/6');
    expect(progressHeadCount(3, 6)).toBe('3/6');
    expect(progressHeadCount(9, 6)).toBe('6/6');
  });

  it('artifact_produced 自动展开对应模块', () => {
    const open = applyArtifactAutoExpand(DEFAULT_MODULE_OPEN, {}, 'RiskList');
    expect(open.revision).toBe(true);
    const timeline = applyArtifactAutoExpand(DEFAULT_MODULE_OPEN, {}, 'Timeline');
    expect(timeline.timeline).toBe(true);
  });

  it('用户手动折叠优先于自动展开', () => {
    const { open, override } = toggleModuleManual(DEFAULT_MODULE_OPEN, {}, 'revision');
    // 手动关
    const closed = { ...open, revision: false };
    const ov = { ...override, revision: false };
    const after = applyArtifactAutoExpand(closed, ov, 'RiskList');
    expect(after.revision).toBe(false);
  });

  it('用户手动展开后自动不会关掉', () => {
    const { open, override } = toggleModuleManual(
      { ...DEFAULT_MODULE_OPEN, revision: false },
      {},
      'revision',
    );
    expect(open.revision).toBe(true);
    expect(override.revision).toBe(true);
  });

  it('收缩态：全模块折叠', () => {
    const allOpen = applyArtifactAutoExpand(
      applyArtifactAutoExpand(DEFAULT_MODULE_OPEN, {}, 'RiskList'),
      {},
      'Timeline',
    );
    const collapsed = collapseAllModules(allOpen);
    expect(Object.values(collapsed).every((v) => v === false)).toBe(true);
  });
});
