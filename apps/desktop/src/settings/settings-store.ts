/**
 * 设置页本地持久化（SET-1）。
 * 与 RuntimeGuard / model-config 同族：写配置即真路由，无假开关。
 * 同意态带时间戳（docs/decisions/ADR-005-data-security.md 审计语义）。
 */

export interface RuntimeGuardSettings {
  /** RuntimeLimits.maxUsd；undefined = 不限额 */
  maxUsd?: number;
}

export interface PrivacySettings {
  /** 使用遥测；docs/decisions/ADR-005-data-security.md 桌面默认开启（仅本机） */
  telemetryEnabled: boolean;
  /**
   * 脱敏行为数据 opt-in。
   * consentedAt 有值 = 已同意；关闭时清空时间戳（不溯及既往）。
   */
  behaviorDataOptIn: boolean;
  behaviorDataConsentedAt?: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppearanceSettings {
  themeMode: ThemeMode;
}

export interface SettingsSnapshot {
  runtimeGuard: RuntimeGuardSettings;
  privacy: PrivacySettings;
  appearance: AppearanceSettings;
}

export const DEFAULT_SETTINGS: SettingsSnapshot = {
  runtimeGuard: { maxUsd: 5 },
  privacy: {
    telemetryEnabled: true,
    behaviorDataOptIn: false,
  },
  appearance: { themeMode: 'system' },
};

const STORAGE_KEY = 'courtwork.settings.v1';
export const SETTINGS_CHANGED_EVENT = 'courtwork:settings-changed';

export type SettingsStoreBackend = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const memory = new Map<string, string>();
const defaultBackend: SettingsStoreBackend = {
  getItem: (key) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      try {
        return localStorage.getItem(key);
      } catch {
        /* fall through */
      }
    }
    return memory.get(key) ?? null;
  },
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        /* fall through */
      }
    }
    memory.set(key, value);
  },
};

let backend: SettingsStoreBackend = defaultBackend;

export function __setSettingsStoreForTests(store?: SettingsStoreBackend | null) {
  if (!store) {
    memory.clear();
    backend = defaultBackend;
    return;
  }
  backend = store;
}

function clampMaxUsd(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  const rounded = Number(n.toFixed(2));
  return Number.isFinite(rounded) ? rounded : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function loadSettings(): SettingsSnapshot {
  try {
    const raw = backend.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return structuredClone(DEFAULT_SETTINGS);
    let runtimeGuard: RuntimeGuardSettings;
    if (!hasOwn(parsed, 'runtimeGuard') || !isPlainObject(parsed.runtimeGuard)) {
      runtimeGuard = structuredClone(DEFAULT_SETTINGS.runtimeGuard);
    } else if (!hasOwn(parsed.runtimeGuard, 'maxUsd') || parsed.runtimeGuard.maxUsd === null) {
      runtimeGuard = {};
    } else {
      const value = parsed.runtimeGuard.maxUsd;
      runtimeGuard = typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? { maxUsd: clampMaxUsd(value) }
        : structuredClone(DEFAULT_SETTINGS.runtimeGuard);
    }
    const privacy = isPlainObject(parsed.privacy) ? parsed.privacy : {};
    const appearance = isPlainObject(parsed.appearance) ? parsed.appearance : {};
    return {
      runtimeGuard,
      privacy: {
        telemetryEnabled: privacy.telemetryEnabled !== false,
        behaviorDataOptIn: Boolean(privacy.behaviorDataOptIn),
        behaviorDataConsentedAt:
          typeof privacy.behaviorDataConsentedAt === 'string'
            ? privacy.behaviorDataConsentedAt
            : undefined,
      },
      appearance: {
        themeMode: normalizeThemeMode(appearance.themeMode),
      },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(snapshot: SettingsSnapshot): void {
  backend.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

export function updateRuntimeGuard(
  current: SettingsSnapshot,
  patch: RuntimeGuardSettings,
): SettingsSnapshot {
  const next: SettingsSnapshot = {
    ...current,
    runtimeGuard: { maxUsd: clampMaxUsd(patch.maxUsd) },
  };
  saveSettings(next);
  return next;
}

/** 打开 opt-in：写入同意时间戳；关闭：清空时间戳（不溯及既往）。 */
export function setBehaviorDataOptIn(
  current: SettingsSnapshot,
  enabled: boolean,
  now: () => Date = () => new Date(),
): SettingsSnapshot {
  const next: SettingsSnapshot = {
    ...current,
    privacy: {
      ...current.privacy,
      behaviorDataOptIn: enabled,
      behaviorDataConsentedAt: enabled ? now().toISOString() : undefined,
    },
  };
  saveSettings(next);
  return next;
}

export function setTelemetryEnabled(current: SettingsSnapshot, enabled: boolean): SettingsSnapshot {
  const next: SettingsSnapshot = {
    ...current,
    privacy: { ...current.privacy, telemetryEnabled: enabled },
  };
  saveSettings(next);
  return next;
}

export function setThemeMode(current: SettingsSnapshot, themeMode: ThemeMode): SettingsSnapshot {
  const next: SettingsSnapshot = {
    ...current,
    appearance: { themeMode: normalizeThemeMode(themeMode) },
  };
  saveSettings(next);
  return next;
}

/** 诊断导出：无密钥、无案件实质内容。F4 增 credentialFailKind 枚举字段。 */
export function buildDiagnosticPayload(
  snapshot: SettingsSnapshot,
  extras: {
    appVersion: string;
    credentialPhase: string;
    /** F4：user_canceled | auth_failed | acl_denied | missing | platform；非钥匙串失败为 null */
    credentialFailKind?: string | null;
    modelConfig: { providerId: string; modelId: string; reasoning: string };
  },
): Record<string, unknown> {
  return {
    exportedAt: new Date().toISOString(),
    appVersion: extras.appVersion,
    credentialPhase: extras.credentialPhase,
    credentialFailKind: extras.credentialFailKind ?? null,
    modelConfig: extras.modelConfig,
    runtimeGuard: snapshot.runtimeGuard,
    appearance: snapshot.appearance,
    privacy: {
      telemetryEnabled: snapshot.privacy.telemetryEnabled,
      behaviorDataOptIn: snapshot.privacy.behaviorDataOptIn,
      behaviorDataConsentedAt: snapshot.privacy.behaviorDataConsentedAt ?? null,
    },
  };
}
