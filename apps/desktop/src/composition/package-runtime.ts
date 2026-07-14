import { LEGAL_PACKAGE } from '@courtwork/legal';
import { PM_PACKAGE } from '@courtwork/pm';
import {
  admitPackages,
  buildPackageRegistries,
  type PackageRegistries,
} from '@courtwork/registry';
import { createCourtworkHostRendererRegistry } from '../preview/courtwork-host-renderers.js';
import type { HostRendererRegistry } from '../preview/HostRendererRegistry.js';

export interface DesktopPackageRuntime {
  packageIds: string[];
  packageRegistries: PackageRegistries;
  hostRenderers: HostRendererRegistry;
}

export function createDesktopPackageRuntime(): DesktopPackageRuntime {
  const admission = admitPackages([LEGAL_PACKAGE, PM_PACKAGE]);
  if (admission.rejected.length > 0) {
    const details = admission.rejected
      .map((item) => `${item.packageId}: ${item.issues.join('; ')}`)
      .join(' | ');
    throw new Error(`desktop package admission failed: ${details}`);
  }
  return {
    packageIds: admission.admitted.map((manifest) => manifest.identity.packageId),
    packageRegistries: buildPackageRegistries(admission.admitted),
    hostRenderers: createCourtworkHostRendererRegistry(),
  };
}
