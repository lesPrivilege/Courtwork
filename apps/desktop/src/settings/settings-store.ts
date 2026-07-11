/**
 * 设置页本地持久化（SET-1）。
 * 与 RuntimeGuard / model-config 同族：写配置即真路由，无假开关。
 * 同意态带时间戳（docs/28 审计语义）。
 */

export interface RuntimeGuardSettings {
  /** RuntimeLimits.maxUsd；undefined = 不限额 */
  maxUsd?: number;
}

export interface OutputSettings {
  /** 默认产出根目录（绝对路径或浏览器虚拟路径） */
  defaultOutputDir?: string;
}

export interface PrivacySettings {
  /** 使用遥测；docs/28 桌面默认开启（仅本机） */
  telemetryEnabled: boolean;
  /**
   * 脱敏行为数据 opt-in。
   * consentedAt 有值 = 已同意；关闭时清空时间戳（不溯及既往）。
   */
  behaviorDataOptIn: boolean;
  behaviorDataConsentedAt?: string;
}

export interface SettingsSnapshot {
  runtimeGuard: RuntimeGuardSettings;
  output: OutputSettings;
  privacy: PrivacySettings;
}

export const DEFAULT_SETTINGS: SettingsSnapshot = {
  runtimeGuard: { maxUsd: 5 },
  output: {},
  privacy: {
    telemetryEnabled: true,
    behaviorDataOptIn: false,
  },
};

const STORAGE_KEY = 'courtwork.settings.v1';

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
  return Math.round(n * 100) / 100;
}

export function loadSettings(): SettingsSnapshot {
  try {
    const raw = backend.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw) as Partial<SettingsSnapshot>;
    const maxUsd = clampMaxUsd(parsed.runtimeGuard?.maxUsd ?? DEFAULT_SETTINGS.runtimeGuard.maxUsd);
    return {
      runtimeGuard: { maxUsd },
      output: {
        defaultOutputDir:
          typeof parsed.output?.defaultOutputDir === 'string' && parsed.output.defaultOutputDir.trim()
            ? parsed.output.defaultOutputDir.trim()
            : undefined,
      },
      privacy: {
        telemetryEnabled: parsed.privacy?.telemetryEnabled !== false,
        behaviorDataOptIn: Boolean(parsed.privacy?.behaviorDataOptIn),
        behaviorDataConsentedAt:
          typeof parsed.privacy?.behaviorDataConsentedAt === 'string'
            ? parsed.privacy.behaviorDataConsentedAt
            : undefined,
      },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(snapshot: SettingsSnapshot): void {
  backend.setItem(STORAGE_KEY, JSON.stringify(snapshot));
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

export function updateOutputDir(current: SettingsSnapshot, dir: string | undefined): SettingsSnapshot {
  const next: SettingsSnapshot = {
    ...current,
    output: { defaultOutputDir: dir?.trim() || undefined },
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
    output: {
      defaultOutputDir: snapshot.output.defaultOutputDir ? '[configured]' : null,
    },
    privacy: {
      telemetryEnabled: snapshot.privacy.telemetryEnabled,
      behaviorDataOptIn: snapshot.privacy.behaviorDataOptIn,
      behaviorDataConsentedAt: snapshot.privacy.behaviorDataConsentedAt ?? null,
    },
  };
}
