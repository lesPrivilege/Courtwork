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

export interface CredentialStatus {
  phase: ConnectionPhase;
  source?: CredentialSource;
  /** 仅 failed 时展示，零技术概念 */
  failureMessage?: string;
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

export const KEYCHAIN_FAIL_MESSAGE = '钥匙串授权未通过，请重试或重新填写';
export const FORMAT_FAIL_MESSAGE = '凭证格式不正确，请检查后重新填写';
export const ENV_MISSING_MESSAGE = '电脑中未找到该凭证名称，请检查后重试';

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

/**
 * 浏览器模式只供 Playwright 回归；Tauri 成品走 Rust 钥匙串探针。
 * status() 每次都是探针，不缓存「已连接」乐观态。
 */
export const credentialClient = {
  async status(): Promise<CredentialStatus> {
    const forced = readForcedProbe();
    if (forced) return forced;

    if (!isTauriRuntime()) return browserStatus;

    try {
      return await invoke<CredentialStatus>('provider_credential_status');
    } catch {
      return {
        phase: 'failed',
        failureMessage: KEYCHAIN_FAIL_MESSAGE,
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
      return await invoke<CredentialStatus>('save_provider_credential', { source, value: value.trim() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const friendly =
        message.includes('未找到') || message.includes('凭证名称')
          ? ENV_MISSING_MESSAGE
          : message.includes('格式')
            ? FORMAT_FAIL_MESSAGE
            : KEYCHAIN_FAIL_MESSAGE;
      return { phase: 'failed', source, failureMessage: friendly };
    }
  },

  async clear(): Promise<CredentialStatus> {
    testOverride = null;
    if (!isTauriRuntime()) {
      browserStatus = { phase: 'pending' };
      return browserStatus;
    }
    try {
      return await invoke<CredentialStatus>('clear_provider_credential');
    } catch {
      return { phase: 'failed', failureMessage: KEYCHAIN_FAIL_MESSAGE };
    }
  },
};
