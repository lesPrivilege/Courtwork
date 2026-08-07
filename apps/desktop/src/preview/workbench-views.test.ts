import { describe, expect, it } from 'vitest';
import { buildPackageRegistries } from '@courtwork/registry';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import { createHostRendererRegistry } from './HostRendererRegistry.js';
import { createCourtworkHostRendererRegistry } from './courtwork-host-renderers.js';
import {
  preferredWorkbenchView,
  resolveWorkbenchViews,
  workbenchViewLabel,
} from './workbench-views.js';

/** 零垂类加载态：registry 准入零包，一切具名面随之缺席。 */
const noPackages = () => buildPackageRegistries([]);

describe('工作面集由「已准入 artifact × 在册 blueprint」派生（GENERIC-PACK-1 ①）', () => {
  it('加载态：次序与标题逐字取自宿主注册表声明，壳不另抄一份', () => {
    const runtime = createDesktopPackageRuntime();

    expect(resolveWorkbenchViews(runtime.packageRegistries, runtime.hostRenderers, false))
      .toEqual([
        { id: 'timeline', label: '时间线' },
        { id: 'graph', label: '关系图谱' },
        { id: 'matrix', label: '矩阵审阅' },
        { id: 'revision', label: '修订预览' },
        { id: 'draft', label: '起草画布' },
      ]);
  });

  it('有结构化产出时通用 artifact 页签落末位', () => {
    const runtime = createDesktopPackageRuntime();

    expect(resolveWorkbenchViews(runtime.packageRegistries, runtime.hostRenderers, true).at(-1))
      .toEqual({ id: 'artifact', label: '结构化产出' });
  });

  it('卸载态（零垂类准入）：具名面归零，只余通用面，零垂类词表泄漏', () => {
    const views = resolveWorkbenchViews(noPackages(), createCourtworkHostRendererRegistry(), false);

    expect(views).toEqual([{ id: 'draft', label: '起草画布' }]);
    // 零泄漏的运行时半边：页签条上不得出现任一垂类工作面的名字。
    for (const leaked of ['时间线', '关系图谱', '矩阵审阅', '修订预览']) {
      expect(views.map((entry) => entry.label)).not.toContain(leaked);
    }
  });

  it('卸载态仍有通用结构化产出席位——通用产出不随垂类走', () => {
    const views = resolveWorkbenchViews(noPackages(), createCourtworkHostRendererRegistry(), true);

    expect(views).toEqual([
      { id: 'draft', label: '起草画布' },
      { id: 'artifact', label: '结构化产出' },
    ]);
  });

  it('默认落点：加载态取在册 preferred，卸载态落通用起草画布', () => {
    const runtime = createDesktopPackageRuntime();

    expect(preferredWorkbenchView(runtime.packageRegistries, runtime.hostRenderers)).toBe('revision');
    expect(preferredWorkbenchView(noPackages(), createCourtworkHostRendererRegistry())).toBe('draft');
  });

  it('具名 blueprint 缺 label 即整条派生显式失败，不回落到 id', () => {
    const runtime = createDesktopPackageRuntime();
    const unlabelled = createHostRendererRegistry([
      { uiTemplateId: 'courtwork.timeline.v1', kind: 'route', view: 'timeline', autoOpen: true },
    ]);

    expect(() => resolveWorkbenchViews(runtime.packageRegistries, unlabelled, false))
      .toThrow(/without a label/);
  });

  it('两枚 preferred 同时在册即拒载，不静默取其一', () => {
    expect(() => createHostRendererRegistry([
      { uiTemplateId: 'a.v1', kind: 'route', view: 'timeline', label: 'A', preferred: true },
      { uiTemplateId: 'b.v1', kind: 'route', view: 'graph', label: 'B', preferred: true },
    ])).toThrow(/duplicate preferred host view/);
  });

  it('标题查询对不在集内的面返回空串，不猜名', () => {
    const runtime = createDesktopPackageRuntime();
    const views = resolveWorkbenchViews(runtime.packageRegistries, runtime.hostRenderers, false);

    expect(workbenchViewLabel(views, 'timeline')).toBe('时间线');
    expect(workbenchViewLabel(views, 'artifact')).toBe('');
  });
});
