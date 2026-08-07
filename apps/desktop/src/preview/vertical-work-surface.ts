import type { ComponentType, MutableRefObject, ReactNode } from 'react';
import type { SessionEvent } from '@courtwork/core';
import type { SourceAnchor } from '@courtwork/schemas';
import type { CaseBinding } from '../case/case-scope';
import type { StoredMaterial } from '../material/material-ref';
import type { MaterialStore } from '../material/material-store';
import type { DemoWorkFixtureAdapter } from '../protocol/demo-fixture';
import type {
  ScenarioFlow,
  SessionProjection,
  WorkProjectionPhase,
  WorkSessionRef,
} from '../protocol/client';
import type { ReviewTelemetrySink } from '../telemetry/review-telemetry';
import type { PackageRegistries } from '@courtwork/registry';
import type { WorkRunLifecycleDeps } from '../work/work-session-lifecycle';

/**
 * 宿主交给垂类工作面驱动的**通用**输入面（GENERIC-PACK-1 ⑤）。
 *
 * 逐字都是壳本来就持有的领域无关量：matter 身份与绑定、会话投影、宿主端口、状态设值器与
 * 显式反馈通道。**不含任何垂类类型**——这正是「App 零 `RiskList` 持有」得以成立的接缝。
 * 垂类专属端口（如 `LegalWorkCommand`）不走本面，由受信组合根在构造驱动时注入。
 */
export interface VerticalWorkSurfaceHost {
  readonly caseBinding: CaseBinding;
  readonly selectedCaseId: string | null;
  readonly caseTitle: string;
  readonly isDemoCase: boolean;
  readonly flow: ScenarioFlow | null;
  readonly caseMaterials: readonly StoredMaterial[];
  /** 生效 registry（按 matter 绑定现算，GENERIC-PACK-1 ⑧）：renderer 经此读冻结声明。 */
  readonly registries: PackageRegistries;
  readonly session: SessionProjection;
  /** 仅显式 demo ref 在场；非 demo 恒 undefined（demo 与真实路径双向隔离）。 */
  readonly fixtureRef: WorkSessionRef | undefined;
  readonly workFixture: DemoWorkFixtureAdapter;
  /** 会话产出取数（账本优先，仅 demo ref 回落 fixture）；按 artifact type 动态取。 */
  readonly artifactPayload: (artifactType: string) => unknown;
  readonly workSessionId: string | null;
  readonly workRunning: boolean;
  readonly workPhase: WorkProjectionPhase | undefined;
  readonly workContractMaterialId: string | null;
  readonly modelRoute: WorkRunLifecycleDeps['modelRoute'];
  readonly outputDeps: WorkRunLifecycleDeps['outputDeps'];
  readonly materialStore: MaterialStore;
  readonly dispatch: (event: SessionEvent) => void;
  /** 逐条依据展开时刻的采样册（dwellMs）；壳持有以跨面存活。 */
  readonly openedAt: MutableRefObject<Record<string, number>>;
  readonly emitReviewTelemetry: ReviewTelemetrySink;
  readonly setWorkRunning: (running: boolean) => void;
  readonly setWorkSessionId: (id: string | null) => void;
  readonly setWorkContractMaterialId: (id: string | null) => void;
  readonly setWorkPhase: (phase: WorkProjectionPhase | undefined) => void;
  readonly setPreviewOpen: (open: boolean) => void;
  readonly showSystemFeedback: (message: string, ok: boolean, tone?: 'info') => void;
  readonly openSourceAnchor: (anchor: SourceAnchor) => void;
  readonly onCompleted: () => void;
  readonly onDemoOutputExists: (exists: boolean) => void;
  /** 样板案展品：原件 markdown、固定产物名与主合同显示名。非 demo 路径一律不读。 */
  readonly demoSourceMarkdown: string;
  readonly demoOutputFileName: string;
  readonly demoPrimaryFileName: string;
}

/**
 * 垂类工作面驱动的**读出面**：渲染链之外的消费者（ADR-015 修订记录 2026-08-06 裁定一点名
 * 三处）经此取用，壳不再从垂类编排 hook 直读。
 */
export interface VerticalWorkSurfaceState {
  /** 交给 blueprint renderer 的驱动值；**壳视其为不透明**，只原样递给驱动自己的 Provider。 */
  readonly value: unknown;
  /** 样板案进度计数（已处置条目数）。非 demo 相位由壳自行归零，与本值无关。 */
  readonly decisionCount: number;
  /** production 产物显示名——版本化命名由 coordinator 铸出，壳不拼固定名。 */
  readonly outputDisplayName: string | undefined;
  /**
   * 运行中取消控件的文案（LEGAL-FIVE-FACES-1 由静态字段迁入读出面）：可启动场景成闭集后，
   * 文案必须随**正在跑的那一枚**派生——静态一枚只能说对其中一个场景。
   */
  readonly runningControlCopy?: string;
  /** 无预检表单的场景由场景条按钮直接起跑（有表单者由面内表单起跑）。 */
  readonly startScenario: (scenarioId: string) => void;
  /** 停止当前运行（场景条控件）。 */
  readonly cancelRun: () => void;
  /**
   * 切案 / 切场景时重置本驱动的面态。壳按既有次序**同步**调用（不改为 effect：原实现在切换
   * 处理器里同步清空，改成渲染后清理会让新 matter 先看见上一枚的处置态一帧）。
   */
  readonly resetForContextSwitch: () => void;
  /** 是否有可继续的运行（work 语境段与起跑面共用同一事实）。 */
  readonly hasRecoverableRun: boolean;
}

/**
 * 垂类工作面驱动（GENERIC-PACK-1 ⑤ 新增概念，本票第二枚也是最后一枚）。
 *
 * **为何非加不可**：`revision` 面与前三枚不同——它的编排（风险清单、门禁投影、逐条处置、
 * 提交与交付、运行生命周期）此前住 `App.tsx`，且有三处**渲染链之外**的消费者。要让 App 零
 * 垂类类型持有，这套编排必须整体离开壳；而 blueprint renderer 的入参恒为
 * `{descriptor, payload}`，装不下它。本接口就是那条缺失的装配缝：**由受信组合根注入，
 * 壳只见通用形**（ADR-015 修订记录 2026-08-06 裁定一「受信组合根装配，循 S6 装配点先例」）。
 *
 * 边界：`use` 是 React hook，必须在壳的顶层无条件调用；实现体的身份由组合根一次构造后恒定。
 */
export interface VerticalWorkSurface {
  use(host: VerticalWorkSurfaceHost): VerticalWorkSurfaceState;
  readonly Provider: ComponentType<{ value: unknown; children: ReactNode }>;
  /** production 态可启动的场景 id 闭集（驱动声明；场景条据此过滤，壳不认识 id 语义）。 */
  readonly productionScenarioIds: readonly string[];
}
