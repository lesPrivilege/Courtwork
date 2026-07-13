import { DEEPSEEK_QUIRK_PROFILE, type ProviderQuirkProfile } from './quirk-profile.js';
import { DEEPSEEK_CATALOG } from './catalog.generated.js';

export const PRODUCT_PROVIDER_IDS = [DEEPSEEK_CATALOG.id] as const;
export type ProviderId = (typeof PRODUCT_PROVIDER_IDS)[number];

export interface ProviderDescriptor extends ProviderQuirkProfile {
  readonly id: ProviderId;
  readonly label: string;
}

export const DEEPSEEK_PROVIDER_DESCRIPTOR: ProviderDescriptor = {
  ...DEEPSEEK_QUIRK_PROFILE,
  id: DEEPSEEK_CATALOG.id,
  label: DEEPSEEK_CATALOG.label,
};

export const PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[] = [DEEPSEEK_PROVIDER_DESCRIPTOR];

export function isProviderId(value: string): value is ProviderId {
  return (PRODUCT_PROVIDER_IDS as readonly string[]).includes(value);
}

export function getProviderDescriptor(value: string): ProviderDescriptor {
  if (!isProviderId(value)) {
    throw new Error(`provider "${value}" 未登记；不得从任意端点猜测 provider 能力`);
  }
  return DEEPSEEK_PROVIDER_DESCRIPTOR;
}
