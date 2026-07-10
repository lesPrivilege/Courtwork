import { invoke } from '@tauri-apps/api/core';

export type CredentialSource = 'pasted' | 'environment';

export interface CredentialStatus {
  configured: boolean;
  source?: CredentialSource;
}

let browserStatus: CredentialStatus = { configured: false };

function isTauriRuntime() {
  return '__TAURI_INTERNALS__' in window;
}

/**
 * 浏览器模式只供 Playwright 回归，状态只留在页面内存；
 * Tauri 成品始终走 Rust 命令与系统凭证库。
 */
export const credentialClient = {
  async status(): Promise<CredentialStatus> {
    if (!isTauriRuntime()) return browserStatus;
    return invoke<CredentialStatus>('provider_credential_status');
  },

  async save(source: CredentialSource, value: string): Promise<CredentialStatus> {
    if (!isTauriRuntime()) {
      browserStatus = { configured: true, source };
      return browserStatus;
    }
    return invoke<CredentialStatus>('save_provider_credential', { source, value });
  },

  async clear(): Promise<CredentialStatus> {
    if (!isTauriRuntime()) {
      browserStatus = { configured: false };
      return browserStatus;
    }
    return invoke<CredentialStatus>('clear_provider_credential');
  },
};
