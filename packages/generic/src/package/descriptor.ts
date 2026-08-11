import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';
import { GENERIC_ARTIFACTS, GENERIC_RENDERERS } from '../presentation/index.js';
import { GENERIC_PROMPT_SEGMENTS, GENERIC_SCENARIOS } from '../scenarios/index.js';

/**
 * 通用基线包的唯一可序列化声明面（ADR-023 决定一）。
 *
 * 与两枚垂类包**同一 ABI、同一准入、同一 descriptor/bindings 双平面**；差别只在宿主发行
 * 成熟度（`baseline`，住受信组合根的 `package-catalog.ts`，不进本 descriptor）。
 *
 * 词表逐字取底座中性供词（`NEUTRAL_VOCABULARY`）：基线包不给容器着色——着色是垂类加载
 * 带来的加法，基线是地（ADR-023 决定四）。
 */
export const GENERIC_PACKAGE_DESCRIPTOR: VerticalPackageDescriptorV1 = {
  abiVersion: 1,
  identity: { packageId: 'generic', version: '0.1.0', schemaVersion: 1 },
  artifacts: GENERIC_ARTIFACTS,
  scenarios: GENERIC_SCENARIOS,
  promptSegments: GENERIC_PROMPT_SEGMENTS,
  renderers: GENERIC_RENDERERS,
  vocabulary: {
    'container.noun': '工作区',
    'stage.noun': '阶段',
    'material.noun': '资料',
  },
};
