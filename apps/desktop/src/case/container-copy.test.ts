import { describe, expect, it } from 'vitest';
import {
  fileCountLabel,
  originalsZoneTitle,
  scopeCommitTitle,
  scopeCommittedLabel,
  scopeConfirmBody,
} from './container-copy';

describe('container-copy dual vocabulary', () => {
  it('cases use 卷宗; workspaces use 资料', () => {
    expect(fileCountLabel('case', 20)).toBe('卷宗 20 件');
    expect(fileCountLabel('workspace', 3)).toBe('资料 3 件');
    expect(originalsZoneTitle('case')).toBe('卷宗原件');
    expect(originalsZoneTitle('workspace')).toBe('资料原件');
    expect(scopeCommitTitle('case')).toBe('存入卷宗');
    expect(scopeCommitTitle('workspace')).toBe('存入资料');
    expect(scopeCommittedLabel('workspace')).toBe('已存入资料');
    expect(scopeConfirmBody('case', '甲诉乙')).toContain('卷宗清单');
    expect(scopeConfirmBody('workspace', '项目甲')).toContain('资料清单');
  });
});
