import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';
import { PM_ARTIFACTS, PM_RENDERERS } from '../presentation/index.js';

/**
 * PM 垂类包的唯一可序列化声明面。ABI-2B 只上架 schema/catalog，
 * 不虚构尚无执行链的 scenario、prompt 或 demo workflow。
 */
export const PM_PACKAGE_DESCRIPTOR: VerticalPackageDescriptorV1 = {
  abiVersion: 1,
  identity: { packageId: 'pm', version: '0.1.1', schemaVersion: 1 },
  artifacts: PM_ARTIFACTS,
  scenarios: [],
  promptSegments: [],
  renderers: PM_RENDERERS,
  vocabulary: {
    'container.noun': '项目空间',
    'stage.noun': '阶段',
    'material.noun': '项目材料',
  },
};
