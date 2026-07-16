import type { ContainerKind } from './container-copy';

export interface CaseSummary {
  id: string;
  title: string;
  caseNumber?: string;
  fileCount: number;
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
}
