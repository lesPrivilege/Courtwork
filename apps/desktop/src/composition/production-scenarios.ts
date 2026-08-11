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
 * **起跑链未接通的基线场景**（GENERIC-SCENARIOS-1 如实登记，非豁免）。
 *
 * `generic.draft` 声明了一枚必填 `text` 预检字段，而 production 命令端口当前**没有通用的
 * 预检值槽位**——`StartWorkCommand` 无 preflight slot，S3 的主体输入走的是垂类专属入口
 * `startWithPreflight`。槽位形制属跨层拍板（SPEC §7.4 拍板项一），实现会话不自裁。
 *
 * 在槽位定谳前把它放进可启动闭集，产品上就多一枚**点了什么也不会发生**的按钮——那正是
 * LEGAL-FIVE-FACES-1 要消灭的死钮。故当期显式排除；拍板落地后从本表删行即自动在册。
 */
const LAUNCH_CHAIN_PENDING_SCENARIO_IDS: readonly string[] = ['generic.draft'];

/** 当期真正可启动的基线场景＝声明面减去起跑链未接通者。 */
export const BASELINE_SCENARIO_IDS: readonly string[] = BASELINE_DECLARED_SCENARIO_IDS
  .filter((id) => !LAUNCH_CHAIN_PENDING_SCENARIO_IDS.includes(id));

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
