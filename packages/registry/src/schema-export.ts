import { ArtifactTypeIdSchema, toDraft202012JsonSchema } from '@courtwork/schemas';
import type { VerticalPackageBindings, VerticalPackageDescriptorV1 } from './package-manifest.js';

export function packageSchemaUrn(logicalSchemaId: string, schemaVersion: number): string {
  if (!ArtifactTypeIdSchema.safeParse(logicalSchemaId).success) {
    throw new Error(`invalid logical schema id: ${logicalSchemaId}`);
  }
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error(`invalid schemaVersion: ${schemaVersion}`);
  }
  return `urn:courtwork:schema:${logicalSchemaId}:v${schemaVersion}`;
}

/** 只允许当前文档内 fragment；外部文件、HTTP 与其他远程 resolver 一律禁用。 */
export function assertNoRemoteSchemaRefs(document: unknown, path = '$'): void {
  if (document === null || typeof document !== 'object') return;
  if (Array.isArray(document)) {
    document.forEach((item, index) => assertNoRemoteSchemaRefs(item, `${path}[${index}]`));
    return;
  }
  for (const [key, value] of Object.entries(document as Record<string, unknown>)) {
    if (
      (key === '$ref' || key === '$dynamicRef' || key === '$recursiveRef')
      && (typeof value !== 'string' || !value.startsWith('#'))
    ) {
      throw new Error(`${path}.${key} 指向 remote/外部 schema，Courtwork 禁止解析：${String(value)}`);
    }
    assertNoRemoteSchemaRefs(value, `${path}.${key}`);
  }
}

/** descriptor 引用面 → 自包含 Draft 2020-12 文档；只导出显式引用，不猜 typeId。 */
export function exportPackageJsonSchemas(
  descriptor: VerticalPackageDescriptorV1,
  bindings: VerticalPackageBindings,
): ReadonlyMap<string, Record<string, unknown>> {
  const exported = new Map<string, Record<string, unknown>>();
  for (const artifact of descriptor.artifacts) {
    for (const schemaId of [artifact.schemaId, artifact.draftSchemaId]) {
      if (schemaId === undefined) continue;
      if (exported.has(schemaId)) throw new Error(`duplicate schema id reference: ${schemaId}`);
      if (!schemaId.startsWith(`${descriptor.identity.packageId}.`)) {
        throw new Error(`schema id outside package namespace: ${schemaId}`);
      }
      const schema = bindings.schemas.get(schemaId);
      if (schema === undefined) throw new Error(`missing schema binding: ${schemaId}`);
      const document: Record<string, unknown> = {
        ...toDraft202012JsonSchema(schema),
        $id: packageSchemaUrn(schemaId, descriptor.identity.schemaVersion),
      };
      assertNoRemoteSchemaRefs(document);
      exported.set(schemaId, Object.freeze(document));
    }
  }
  return exported;
}
