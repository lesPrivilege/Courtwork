import { exportPackageJsonSchemas } from '@courtwork/registry';
import { PM_PACKAGE_BINDINGS, PM_PACKAGE_DESCRIPTOR } from './manifest.js';

/** PM descriptor 引用面的四份自包含 Draft 2020-12 schema。 */
export function toJSONSchemaRecord(): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const exported = exportPackageJsonSchemas(PM_PACKAGE_DESCRIPTOR, PM_PACKAGE_BINDINGS);
  for (const [schemaId, document] of exported) {
    record[schemaId.slice('pm.'.length)] = document;
  }
  return record;
}
