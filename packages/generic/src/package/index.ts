import type { VerticalPackageManifest } from '@courtwork/registry';
import { GENERIC_PACKAGE_BINDINGS } from './bindings.js';
import { GENERIC_PACKAGE_DESCRIPTOR } from './descriptor.js';

export { GENERIC_PACKAGE_BINDINGS } from './bindings.js';
export { GENERIC_PACKAGE_DESCRIPTOR } from './descriptor.js';

export const GENERIC_PACKAGE: VerticalPackageManifest = {
  ...GENERIC_PACKAGE_DESCRIPTOR,
  bindings: GENERIC_PACKAGE_BINDINGS,
};
