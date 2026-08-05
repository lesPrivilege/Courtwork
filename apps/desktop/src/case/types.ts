import type { ContainerKind } from './container-copy';

export interface CaseSummary {
  id: string;
  title: string;
  caseNumber?: string;
  /**
   * DEBT-DOSSIER-1 件二：卷宗件数**不在此**。它是 `MaterialStore.listForCase` 的清单长度，
   * 挂在案件摘要上就是第二份真源——而第二份数字漂移的那一刻没人会发现。
   * 件数派生与三态（未读取 / N 件）见 `case/material-count.ts`。
   */
  archived: boolean;
  /**
   * CASE-ROOT-1：案件根的 opaque 宿主引用（= HOST-AUTH-LITE 的 grantId）。绝对路径与授权只住宿主，
   * renderer/wire 只见此 id；未绑定文件夹的案件为 undefined。**永不携带绝对路径。**
   */
  grantId?: string;
  /** 已绑定文件夹的展示名（宿主给出的 basename）；纯展示，不参与寻址。 */
  label?: string;
  /** 样板案·演示容器标记——demo 语料只属于 isDemo 案件（D-1） */
  isDemo?: boolean;
  /**
   * 容器语义（docs/decisions/ADR-006-ui-host.md + docs/design/principles.md）：
   * case = 法律事项容器（卷宗 N 件）；workspace = 通用工作区（资料 N 件）。
   * 缺省按案件处理，兼容既有 demo。
   */
  kind?: ContainerKind;
  /**
   * matter ↔ 垂类包绑定（ADR-015 决定三）。缺席＝未声明，取全局可用集；`[]`＝显式不加载任何
   * 垂类；`['<packageId>']`＝显式绑定一枚。持久形制与 fail-closed 判据见
   * {@link import('./case-store').PersistedCase.packBinding}。
   */
  packBinding?: readonly string[];
}
