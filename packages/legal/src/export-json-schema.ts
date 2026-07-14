import { exportPackageJsonSchemas } from '@courtwork/registry';
import { LEGAL_PACKAGE_BINDINGS, LEGAL_PACKAGE_DESCRIPTOR } from './package/index.js';

/** 法律包 descriptor 的全部 final/draft schema 契约面；文件名仅是逻辑 id 的本包短名。 */
export function toJSONSchemaRecord(): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const exported = exportPackageJsonSchemas(LEGAL_PACKAGE_DESCRIPTOR, LEGAL_PACKAGE_BINDINGS);
  for (const [schemaId, document] of exported) {
    record[schemaId.slice('legal.'.length)] = document;
  }
  return record;
}
