import { invoke } from '@tauri-apps/api/core';

export type CredentialSource = 'pasted' | 'environment';
export type CredentialPhase = 'absent' | 'stored';
export type ConnectionPhase = 'unverified' | 'verifying' | 'ready' | 'failed';

export type CredentialFailKind =
  | 'platform' | 'auth' | 'rate_limit' | 'endpoint' | 'model' | 'timeout' | 'network'
  | 'protocol' | 'invalid_response' | 'canceled';

export interface ProviderReadiness {
  credential: { phase: CredentialPhase; source?: CredentialSource };
  connection: {
    phase: ConnectionPhase;
    failureMessage?: string;
    failKind?: CredentialFailKind;
    models?: string[];
    modelDiscovery?: 'available' | 'unsupported';
  };
}

/** @deprecated 名称仅为渐进迁移；形状已经是正交 ProviderReadiness。 */
export type CredentialStatus = ProviderReadiness;

export function isConfigured(status?: ProviderReadiness | null): boolean {
  return status?.connection.phase === 'ready';
}

export function connectionLabel(status?: ProviderReadiness | null): string {
  if (!status || status.connection.phase === 'unverified') return '待验证';
  if (status.connection.phase === 'verifying') return '验证中';
  if (status.connection.phase === 'ready') return '已连接';
  return '连接失败';
}

export const KEYCHAIN_FAIL_MESSAGE = '钥匙串授权未通过，请重试或重新填写';
export const FORMAT_FAIL_MESSAGE = '凭证格式不正确，请检查后重新填写';
export const ENV_MISSING_MESSAGE = '电脑中未找到该凭证名称，请检查后重试';

export const FAIL_KIND_MESSAGES: Record<CredentialFailKind, string> = {
  platform: KEYCHAIN_FAIL_MESSAGE,
  auth: '访问凭证未通过服务商验证，请检查后重试',
  rate_limit: '服务商暂时限制了请求，请稍后重试',
  endpoint: 'DeepSeek 服务地址暂时无法完成请求，请稍后重试',
  model: '当前模型不可用，请重新选择',
  timeout: '服务商响应超时，请稍后重试',
  network: '暂时无法连接服务商，请检查网络后重试',
  protocol: '服务商返回了无法识别的响应，请稍后重试',
  invalid_response: '服务商返回了无法识别的响应，请稍后重试',
  canceled: '请求已取消',
};

export function messageForFailKind(kind?: CredentialFailKind | null): string {
  return kind ? FAIL_KIND_MESSAGES[kind] ?? KEYCHAIN_FAIL_MESSAGE : KEYCHAIN_FAIL_MESSAGE;
}

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

const ABSENT: ProviderReadiness = { credential: { phase: 'absent' }, connection: { phase: 'unverified' } };
let browserStatus: ProviderReadiness = ABSENT;
let testOverride: ProviderReadiness | null = null;

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export type CredentialTestHooks = {
  setStatus: (status: ProviderReadiness) => void;
  clearOverride: () => void;
  getStatus: () => ProviderReadiness;
};

export function installCredentialTestHooks(): CredentialTestHooks {
  const hooks: CredentialTestHooks = {
    setStatus(status) {
      testOverride = status;
      browserStatus = status;
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('courtwork-credential-probe'));
    },
    clearOverride() {
      testOverride = null;
      browserStatus = ABSENT;
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('courtwork-credential-probe'));
    },
    getStatus: () => testOverride ?? browserStatus,
  };
  if (typeof window !== 'undefined') {
    (window as unknown as { __courtworkCredentials?: CredentialTestHooks }).__courtworkCredentials = hooks;
  }
  return hooks;
}

function readForcedProbe(): ProviderReadiness | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { __CW_FORCE_CREDENTIAL__?: ProviderReadiness }).__CW_FORCE_CREDENTIAL__ ?? testOverride;
}

function normalizeStatus(raw: ProviderReadiness): ProviderReadiness {
  if (raw.connection.phase !== 'failed' || raw.connection.failureMessage || !raw.connection.failKind) return raw;
  return { ...raw, connection: { ...raw.connection, failureMessage: messageForFailKind(raw.connection.failKind) } };
}

function localFailure(source: CredentialSource, message: string, failKind?: CredentialFailKind): ProviderReadiness {
  return {
    credential: { phase: 'absent', source },
    connection: { phase: 'failed', failureMessage: message, failKind },
  };
}

export const credentialClient = {
  async status(): Promise<ProviderReadiness> {
    const forced = readForcedProbe();
    if (forced) return normalizeStatus(forced);
    if (!isTauriRuntime()) return normalizeStatus(browserStatus);
    try {
      return normalizeStatus(await invoke<ProviderReadiness>('provider_credential_status'));
    } catch {
      return localFailure('pasted', KEYCHAIN_FAIL_MESSAGE, 'platform');
    }
  },

  async save(source: CredentialSource, value: string): Promise<ProviderReadiness> {
    const formatError = source === 'pasted' ? validatePastedCredential(value) : validateEnvironmentName(value);
    if (formatError) return localFailure(source, formatError);
    if (!isTauriRuntime()) {
      browserStatus = { credential: { phase: 'stored', source }, connection: { phase: 'unverified' } };
      return browserStatus;
    }
    try {
      return normalizeStatus(await invoke<ProviderReadiness>('save_provider_credential', { source, value: value.trim() }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const friendly = message.includes('未找到') || message.includes('凭证名称') ? ENV_MISSING_MESSAGE
        : message.includes('格式') ? FORMAT_FAIL_MESSAGE : KEYCHAIN_FAIL_MESSAGE;
      return localFailure(source, friendly, friendly === KEYCHAIN_FAIL_MESSAGE ? 'platform' : undefined);
    }
  },

  async clear(): Promise<ProviderReadiness> {
    testOverride = null;
    if (!isTauriRuntime()) {
      browserStatus = ABSENT;
      return browserStatus;
    }
    try {
      return normalizeStatus(await invoke<ProviderReadiness>('clear_provider_credential'));
    } catch {
      return localFailure('pasted', KEYCHAIN_FAIL_MESSAGE, 'platform');
    }
  },
};
