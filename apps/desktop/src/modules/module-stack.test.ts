import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { EMPTY_SESSION } from '../protocol/client';
import { ProgressModuleBody } from './ModuleStack';
import {
  applyModuleAutoExpand,
  collapseAllModules,
  DEFAULT_MODULE_OPEN,
  progressHeadCount,
  toggleModuleManual,
} from './module-stack';

describe('module stack (docs/decisions/ADR-006-ui-host.md ch.3)', () => {
  it('progress 面板头计数 frontier 形制 N/M', () => {
    expect(progressHeadCount(undefined)).toBe('—');
    expect(progressHeadCount([])).toBe('0/0');
    expect(progressHeadCount([
      { stepId: 'one', label: '第一步', status: 'done' },
      { stepId: 'two', label: '第二步', status: 'awaiting_confirmation' },
      { stepId: 'three', label: '第三步', status: 'pending' },
    ])).toBe('1/3');
    expect(progressHeadCount([
      { stepId: 'one', label: '第一步', status: 'done' },
      { stepId: 'two', label: '第二步', status: 'done' },
    ])).toBe('2/2');
  });

  it('宿主 renderer 提供的 module target 自动展开对应模块', () => {
    const open = applyModuleAutoExpand(DEFAULT_MODULE_OPEN, {}, 'revision');
    expect(open.revision).toBe(true);
    const timeline = applyModuleAutoExpand(DEFAULT_MODULE_OPEN, {}, 'timeline');
    expect(timeline.timeline).toBe(true);
  });

  it('用户手动折叠优先于自动展开', () => {
    const { open, override } = toggleModuleManual(DEFAULT_MODULE_OPEN, {}, 'revision');
    // 手动关
    const closed = { ...open, revision: false };
    const ov = { ...override, revision: false };
    const after = applyModuleAutoExpand(closed, ov, 'revision');
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
    const allOpen = applyModuleAutoExpand(
      applyModuleAutoExpand(DEFAULT_MODULE_OPEN, {}, 'revision'),
      {},
      'timeline',
    );
    const collapsed = collapseAllModules(allOpen);
    expect(Object.values(collapsed).every((v) => v === false)).toBe(true);
  });

  it('完整 projection 在双容器共享同一空态', () => {
    const html = renderToStaticMarkup(createElement(ProgressModuleBody, { projection: EMPTY_SESSION }));
    expect(html).toContain('尚无任务进展 · 开始一项工作后在此查看');
    expect(html).not.toMatch(/Waiting for task events|New case/);
  });

  it('持久失败与既有进度并存，技术旧文先过显示守门', () => {
    const html = renderToStaticMarkup(
      createElement(ProgressModuleBody, {
        projection: {
          ...EMPTY_SESSION,
          progress: ['已完成材料复验'],
          scenarioFailure: { reason: 'runtime_limit', message: 'Turn terminal exceeded maxSeconds' },
        },
      }),
    );
    expect(html).toContain('已完成材料复验');
    expect(html).toContain('本次审查已达到运行上限');
    expect(html).not.toMatch(/Turn terminal|maxSeconds/);
  });

  it('只读 Work Plan 逐条展示顺序、标签与非颜色状态，运行记录和失败并存', () => {
    const html = renderToStaticMarkup(
      createElement(ProgressModuleBody, {
        projection: {
          ...EMPTY_SESSION,
          todo: [
            { stepId: 'read-materials', label: '读取材料', status: 'done' },
            { stepId: 'write-draft', artifactType: 'generic.DraftDocument', label: '产出文稿', status: 'awaiting_confirmation' },
            { stepId: 'review', label: '回看结果', status: 'pending' },
          ],
          progress: ['已读取材料'],
          scenarioFailure: { reason: 'runtime_limit', message: 'Turn terminal exceeded maxSeconds' },
        },
      }),
    );

    expect(html).toContain('data-testid="progress-work-plan"');
    expect(html).toContain('data-testid="progress-plan-list"');
    expect(html).toContain('已完成');
    expect(html).toContain('等待确认');
    expect(html).toContain('待开始');
    expect(html.indexOf('读取材料')).toBeLessThan(html.indexOf('产出文稿'));
    expect(html.indexOf('产出文稿')).toBeLessThan(html.indexOf('回看结果'));
    expect(html).toContain('运行记录');
    expect(html).toContain('已读取材料');
    expect(html).toContain('本次审查已达到运行上限');
    expect(html).not.toMatch(/type="checkbox"|<input|<textarea|<button/);
  });

  it('无 snapshot 且无运行记录/失败时显示明确空态', () => {
    const html = renderToStaticMarkup(createElement(ProgressModuleBody, { projection: EMPTY_SESSION }));
    expect(html).toContain('尚无任务进展 · 开始一项工作后在此查看');
    expect(html).not.toContain('progress-work-plan');
  });
});
