import { batchReportSchemaFor } from '@courtwork/generic';
import type { PackageRegistries, RuntimeArtifactDescriptor } from '@courtwork/registry';

/**
 * 会话作用域的 registry 收窄（ADR-023 决定六 · 票面 A3）。
 *
 * 批处理的「每份就绪材料恰一行」是**系统**裁决，而闭集只有到起跑那一刻才知道。把闭集编进
 * 本次运行的 `generic.BatchReport` schema，裁决于是落在**产物成形之前**：编造地址与重复行在
 * envelope 校验层即整面拒（零 effect），缺行由系统补出显式 `missing` 行进产物本体与账本。
 *
 * 收窄只发生在受信组合根，且**只覆盖那一枚 artifact 的 schema**——其余条目原样透传，
 * 垂类路径零行为变化（`scopeRegistriesForRun` 不注入时命令端口恒等）。
 */
const BATCH_REPORT_TYPE = 'generic.BatchReport';

export function scopeRegistriesForRun(
  registries: PackageRegistries,
  context: { scenarioId: string; materialIds: readonly string[] },
): PackageRegistries {
  const scenario = registries.scenarios.get(context.scenarioId);
  if (scenario === undefined || !scenario.outputArtifacts.includes(BATCH_REPORT_TYPE)) return registries;
  const entry = registries.artifactSchemas.get(BATCH_REPORT_TYPE);
  if (entry === undefined) return registries;

  const scopedDescriptor: RuntimeArtifactDescriptor = {
    ...(entry.descriptor as RuntimeArtifactDescriptor),
    schema: batchReportSchemaFor(context.materialIds),
  };
  const scopedEntry = { ...entry, descriptor: scopedDescriptor };
  const base = registries.artifactSchemas;
  return {
    ...registries,
    artifactSchemas: {
      get: (typeId) => (typeId === BATCH_REPORT_TYPE ? scopedEntry : base.get(typeId)),
      normalizeTypeId: (value) => base.normalizeTypeId(value),
      list: () => base.list().map((item) => (item.descriptor.typeId === BATCH_REPORT_TYPE ? scopedEntry : item)),
    },
  };
}
