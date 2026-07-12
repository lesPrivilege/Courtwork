import { invoke } from '@tauri-apps/api/core';

export type CredentialSource = 'pasted' | 'environment';

/**
 * 连接状态必须探针驱动三态（D-1）：
 * - pending：未配置
 * - connected：钥匙串/内存读取成功 + 格式校验通过
 * - failed：读取被拒 / 授权失败 / 格式非法
 * 任何路径不得默认或乐观显示已连接。
 */
export type ConnectionPhase = 'pending' | 'connected' | 'failed';

/**
 * F4 钥匙串失败分型（诊断导出 credentialFailKind；无密钥）。
 * 与 Rust KeychainFailKind.wire_name 对齐。
 */
export type CredentialFailKind =
  | 'user_canceled'
  | 'auth_failed'
  | 'acl_denied'
  | 'missing'
  | 'platform'
  | 'rate_limited'
  | 'endpoint'
  | 'model'
  | 'timeout'
  | 'network'
  | 'invalid_response';

export interface CredentialStatus {
  phase: ConnectionPhase;
  source?: CredentialSource;
  /** 仅 failed 时展示，零技术概念 */
  failureMessage?: string;
  /** F4 分型；仅钥匙串失败时有值 */
  failKind?: CredentialFailKind;
}

/** @deprecated 兼容旧断言；请用 phase */
export function isConfigured(status?: CredentialStatus | null): boolean {
  return status?.phase === 'connected';
}

export function connectionLabel(status?: CredentialStatus | null): string {
  if (!status || status.phase === 'pending') return '待连接';
  if (status.phase === 'connected') return '已连接';
  return '连接失败';
}

/** 默认/平台兜底（与 Rust platform 文案一致） */
export const KEYCHAIN_FAIL_MESSAGE = '钥匙串授权未通过，请重试或重新填写';
export const FORMAT_FAIL_MESSAGE = '凭证格式不正确，请检查后重新填写';
export const ENV_MISSING_MESSAGE = '电脑中未找到该凭证名称，请检查后重试';

/** F4 分型 → 对外零技术概念文案 */
export const FAIL_KIND_MESSAGES: Record<CredentialFailKind, string> = {
  user_canceled: '需要允许访问安全凭证库才能连接',
  auth_failed: '无法解锁电脑的安全凭证库，请确认钥匙串密码后重试',
  acl_denied: '凭证库访问未授权，请重新完成连接；若刚更新过应用，请删除旧凭证后重试',
  missing: KEYCHAIN_FAIL_MESSAGE,
  platform: KEYCHAIN_FAIL_MESSAGE,
  rate_limited: '服务商暂时限制了请求，请稍后重试',
  endpoint: '服务地址无法完成请求，请检查 Base URL',
  model: '当前模型不可用，请从模型列表选择或手动填写',
  timeout: '服务商响应超时，请稍后重试',
  network: '暂时无法连接服务商，请检查网络后重试',
  invalid_response: '服务商返回了无法识别的响应，请稍后重试',
};

export function messageForFailKind(kind?: CredentialFailKind | null): string {
  if (!kind) return KEYCHAIN_FAIL_MESSAGE;
  return FAIL_KIND_MESSAGES[kind] ?? KEYCHAIN_FAIL_MESSAGE;
}

/** F5：设置页连接失败辅助（H4 + 手动清条目） */
export const KEYCHAIN_RECOVERY_GUIDE = [
  '系统弹出的是「钥匙串」密码，不一定等于当前登录密码。若您曾修改过 Mac 登录密码，请打开「钥匙串访问」→ 登录钥匙串：若显示锁定，用旧密码解锁，或按系统提示更新钥匙串密码。也可退出登录钥匙串后重新登录 Mac 再试。',
  '若密码正确仍反复要求授权，请在「钥匙串访问」中删除服务 cn.courtwork.desktop.provider 下现行条目 credential；若还能看到旧版遗留的 active-source 或 provider-secret，也一并删除。然后回到 Courtwork 重新「完成连接」。开发构建的服务名带 .dev 后缀：cn.courtwork.desktop.provider.dev。',
].join('\n');

const MIN_PASTED_LENGTH = 8;

export function validatePastedCredential(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return '请先粘贴访问凭证';
  if (trimmed.length < MIN_PASTED_LENGTH) return FORMAT_FAIL_MESSAGE;
  return undefined;
}

export function validateEnvironmentName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return '请填写电脑中的凭证名称';
  if (!/^[A-Z_][A-Z0-9_]*$/.test(trimmed)) return FORMAT_FAIL_MESSAGE;
  return undefined;
}

let browserStatus: CredentialStatus = { phase: 'pending' };

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Playwright / 非 demo 装配注入点：覆盖探针结果。
 * 主界面通过 `courtwork-credential-probe` 事件重新拉取。
 */
export type CredentialTestHooks = {
  setStatus: (status: CredentialStatus) => void;
  clearOverride: () => void;
  getStatus: () => CredentialStatus;
};

let testOverride: CredentialStatus | null = null;

export function installCredentialTestHooks(): CredentialTestHooks {
  const hooks: CredentialTestHooks = {
    setStatus(status) {
      testOverride = status;
      browserStatus = status;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('courtwork-credential-probe'));
      }
    },
    clearOverride() {
      testOverride = null;
      browserStatus = { phase: 'pending' };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('courtwork-credential-probe'));
      }
    },
    getStatus() {
      return testOverride ?? browserStatus;
    },
  };
  if (typeof window !== 'undefined') {
    (window as unknown as { __courtworkCredentials?: CredentialTestHooks }).__courtworkCredentials = hooks;
  }
  return hooks;
}

function readForcedProbe(): CredentialStatus | null {
  if (typeof window === 'undefined') return null;
  const forced = (window as unknown as { __CW_FORCE_CREDENTIAL__?: CredentialStatus }).__CW_FORCE_CREDENTIAL__;
  return forced ?? testOverride;
}

function normalizeStatus(raw: CredentialStatus): CredentialStatus {
  if (raw.phase !== 'failed') return raw;
  // 若仅有 failKind 无文案，补齐映射
  if (!raw.failureMessage && raw.failKind) {
    return { ...raw, failureMessage: messageForFailKind(raw.failKind) };
  }
  return raw;
}

/**
 * 浏览器模式只供 Playwright 回归；Tauri 成品走 Rust 钥匙串探针。
 * status() 每次都是探针，不缓存「已连接」乐观态。
 */
export const credentialClient = {
  async status(): Promise<CredentialStatus> {
    const forced = readForcedProbe();
    if (forced) return normalizeStatus(forced);

    if (!isTauriRuntime()) return normalizeStatus(browserStatus);

    try {
      return normalizeStatus(await invoke<CredentialStatus>('provider_credential_status'));
    } catch {
      return {
        phase: 'failed',
        failureMessage: KEYCHAIN_FAIL_MESSAGE,
        failKind: 'platform',
      };
    }
  },

  async save(source: CredentialSource, value: string): Promise<CredentialStatus> {
    const formatError =
      source === 'pasted' ? validatePastedCredential(value) : validateEnvironmentName(value);
    if (formatError) {
      const failed: CredentialStatus = {
        phase: 'failed',
        source,
        failureMessage: formatError,
      };
      if (!isTauriRuntime()) browserStatus = failed;
      return failed;
    }

    if (!isTauriRuntime()) {
      browserStatus = { phase: 'connected', source };
      return browserStatus;
    }

    try {
      return normalizeStatus(
        await invoke<CredentialStatus>('save_provider_credential', { source, value: value.trim() }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const friendly =
        message.includes('未找到') || message.includes('凭证名称')
          ? ENV_MISSING_MESSAGE
          : message.includes('格式')
            ? FORMAT_FAIL_MESSAGE
            : KEYCHAIN_FAIL_MESSAGE;
      return {
        phase: 'failed',
        source,
        failureMessage: friendly,
        failKind: friendly === KEYCHAIN_FAIL_MESSAGE ? 'platform' : undefined,
      };
    }
  },

  async clear(): Promise<CredentialStatus> {
    testOverride = null;
    if (!isTauriRuntime()) {
      browserStatus = { phase: 'pending' };
      return browserStatus;
    }
    try {
      return normalizeStatus(await invoke<CredentialStatus>('clear_provider_credential'));
    } catch {
      return {
        phase: 'failed',
        failureMessage: KEYCHAIN_FAIL_MESSAGE,
        failKind: 'platform',
      };
    }
  },
};
