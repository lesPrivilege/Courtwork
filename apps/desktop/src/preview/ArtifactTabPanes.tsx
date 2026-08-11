import type { PackageRegistries } from '@courtwork/registry';
import { ArtifactHostView } from './ArtifactHostView.js';
import { UnsupportedArtifactView } from './ArtifactTableRenderer.js';
import type { HostRendererRegistry } from './HostRendererRegistry.js';
import { VerticalArtifactUnloadedView } from './vertical-artifact-unloaded.js';
import type { ArtifactSeatTab } from './workbench-views.js';

/**
 * 产出页签的格栈（PREVIEW-TAB-1 · ADR-014 决定一「多 artifact 并列共存，tab 间切换不销毁
 * 彼此状态」）。
 *
 * **为何整栈常驻而不是只渲活动格**：只渲活动格的话，切页签就是卸载——被切走那一格的 DOM 态
 * （表格横向滚动位置、纵向偏移）随之消失，回来时是一枚新挂载的空白基线。「不销毁状态」这句话
 * 在那种实现里没有任何可落地的含义。故非活动格留在 DOM 里、只加 `hidden`（同时退出可访问性
 * 树与命中测试），切换只翻这枚属性。
 *
 * 格数＝本 matter 已产出且无具名工作面收留的产物数（ADR-014 席位条款：当期一枚 matter 至多
 * 绑一枚包，产物数量本就是个位数），故常驻的代价是有界的。
 */
export function ArtifactTabPanes({
  seat,
  activeTab,
  payloadFor,
  matterRegistries,
  hostRenderers,
  packageLabelFor,
  handoff,
}: {
  seat: readonly ArtifactSeatTab[];
  activeTab: string;
  payloadFor: (artifactType: string) => unknown;
  matterRegistries: PackageRegistries;
  hostRenderers: HostRendererRegistry;
  /** packageId → 用户可见包名（宿主目录取词，不透出 packageId 字面量）。 */
  packageLabelFor: (packageId: string) => string;
  /**
   * 产出席位上的显式移交动作（GENERIC-SCENARIOS-1 收尾件一）：由宿主装配声明**地址＋文案＋
   * 处理器**，席位件只把它落到被点名的那一格上——席位件不认识任何具体产物，也不据形状认亲。
   * 缺席即该席位零动作。
   */
  handoff?: { artifactType: string; label: string; onSend: () => void };
}) {
  return (
    <>
      {seat.map((tab) => (
        <div
          key={tab.id}
          className="artifact-tab-pane"
          data-testid={`artifact-pane-${tab.artifactType}`}
          hidden={tab.id !== activeTab}
        >
          {tab.status === 'ready' && handoff?.artifactType === tab.artifactType && (
            <div className="batch-bar">
              <button type="button" className="primary-button" data-testid="artifact-handoff-action" onClick={handoff.onSend}>{handoff.label}</button>
            </div>
          )}
          {tab.status === 'ready' && (
            <ArtifactHostView
              artifactType={tab.artifactType}
              payload={payloadFor(tab.artifactType)}
              packageRegistries={matterRegistries}
              hostRenderers={hostRenderers}
            />
          )}
          {/* ADR-015 决定四：产物在册而包未加载——诚实提示加载，不伪装通用产物、不假装没有。 */}
          {tab.status === 'unloaded' && (
            <VerticalArtifactUnloadedView title={tab.label} packageLabel={packageLabelFor(tab.packageId)} />
          )}
          {tab.status === 'unsupported' && <UnsupportedArtifactView title={tab.label} />}
        </div>
      ))}
    </>
  );
}
