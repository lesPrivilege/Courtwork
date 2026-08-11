import { GENERIC_PACKAGE } from '@courtwork/generic/package';
import { PRODUCTION_SCENARIO_IDS as LEGAL_PRODUCTION_SCENARIO_IDS } from '../verticals/legal/legal-s3-binding';

/**
 * production 可启动场景闭集的**受信组合根声明**（ADR-023 决定三/五 · 票面裁定 B4）。
 *
 * 此前这枚闭集住在 `verticals/legal/legal-s3-binding.ts`——那是「production 只跑垂类」时期的
 * 归宿。基线场景经**同一条** production work command 链接入后，闭集必须住在两条线都够得着的
 * 地方；受信组合根是唯一既可 import 垂类又可 import 基线的层（零泄漏静态门的绑定族）。
 *
 * 命令端口只问「在不在闭集内」，不认识任何 id 语义（循 LEGAL-FIVE-FACES-1 闭集先例）。
 */

/**
 * 基线包声明的全部场景启动式（随包声明派生，不在此另抄一份 id 字面量）。
 * 这是**声明面**，不等于当期可启动面——后者还要过下面那道起跑链在册判据。
 */
export const BASELINE_DECLARED_SCENARIO_IDS: readonly string[] = GENERIC_PACKAGE.scenarios
  .filter((scenario) => scenario.launch?.kind === 'scenario')
  .map((scenario) => scenario.id);

/**
 * 当期可启动的基线场景。
 *
 * 曾因 production 命令端口无通用预检值槽而临时排除 `generic.draft`（放进闭集即多一枚点了
 * 什么也不会发生的死钮）；票面 §六 二批裁定一落地通用槽 `startParams` 后，该临时收口**解除**，
 * 声明面与可启动面自此逐字相等（反向红证在 `baseline-scenario-run.test.ts`）。
 */
export const BASELINE_SCENARIO_IDS: readonly string[] = BASELINE_DECLARED_SCENARIO_IDS;

/**
 * 垂类可启动子集。**续行侧的 fail-closed 判据只认这一枚**：基线恒在生效 registry 内，
 * 若拿全集去问「这枚 matter 有没有任何可执行场景」，答案恒为真，垂类续行授权就被基线顶穿了。
 */
export const VERTICAL_PRODUCTION_SCENARIO_IDS: readonly string[] = [...LEGAL_PRODUCTION_SCENARIO_IDS];

/** 全集＝垂类 ∪ 基线（次序：垂类在前，与 registry 并集次序同律）。 */
export const PRODUCTION_LAUNCHABLE_SCENARIO_IDS: readonly string[] = [
  ...VERTICAL_PRODUCTION_SCENARIO_IDS,
  ...BASELINE_SCENARIO_IDS,
];
