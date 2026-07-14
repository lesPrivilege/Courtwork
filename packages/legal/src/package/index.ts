import type { VerticalPackageManifest } from '@courtwork/registry';
import { LEGAL_PACKAGE_BINDINGS } from './bindings.js';
import { LEGAL_PACKAGE_DESCRIPTOR } from './descriptor.js';

export { LEGAL_PACKAGE_BINDINGS } from './bindings.js';
export { LEGAL_PACKAGE_DESCRIPTOR } from './descriptor.js';

/** 既有 composition 名保持不变；准入真源只有 descriptor + bindings 这一套。 */
export const LEGAL_PACKAGE: VerticalPackageManifest = Object.freeze({
  ...LEGAL_PACKAGE_DESCRIPTOR,
  bindings: LEGAL_PACKAGE_BINDINGS,
});
