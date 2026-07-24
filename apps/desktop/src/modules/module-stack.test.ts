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
    expect(progressHeadCount(0, 6)).toBe('0/6');
    expect(progressHeadCount(3, 6)).toBe('3/6');
    expect(progressHeadCount(9, 6)).toBe('6/6');
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
});
