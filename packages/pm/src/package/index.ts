import type { VerticalPackageManifest } from '@courtwork/registry';
import { PM_PACKAGE_BINDINGS } from './bindings.js';
import { PM_PACKAGE_DESCRIPTOR } from './descriptor.js';

export { PM_PACKAGE_BINDINGS } from './bindings.js';
export { PM_PACKAGE_DESCRIPTOR } from './descriptor.js';

export const PM_PACKAGE: VerticalPackageManifest = {
  ...PM_PACKAGE_DESCRIPTOR,
  bindings: PM_PACKAGE_BINDINGS,
};
