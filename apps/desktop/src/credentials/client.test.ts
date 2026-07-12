import { beforeEach, describe, expect, it } from 'vitest';
import {
  connectionLabel,
  credentialClient,
  FAIL_KIND_MESSAGES,
  FORMAT_FAIL_MESSAGE,
  installCredentialTestHooks,
  KEYCHAIN_FAIL_MESSAGE,
  KEYCHAIN_RECOVERY_GUIDE,
  messageForFailKind,
  validateEnvironmentName,
  validatePastedCredential,
  type CredentialFailKind,
} from './client';

describe('credential probe three-state', () => {
  beforeEach(() => {
    installCredentialTestHooks().clearOverride();
  });

  it('defaults to pending — never optimistic connected', async () => {
    const status = await credentialClient.status();
    expect(status.phase).toBe('pending');
    expect(connectionLabel(status)).toBe('待连接');
    expect(connectionLabel(undefined)).toBe('待连接');
  });

  it('rejects short pasted credentials as failed, not connected', async () => {
    const status = await credentialClient.save('pasted', 'short');
    expect(status.phase).toBe('failed');
    expect(status.failureMessage).toBe(FORMAT_FAIL_MESSAGE);
    expect(connectionLabel(status)).toBe('连接失败');
    const again = await credentialClient.status();
    expect(again.phase).toBe('failed');
  });

  it('accepts valid pasted credential as connected', async () => {
    const status = await credentialClient.save('pasted', 'valid-key-12');
    expect(status.phase).toBe('connected');
    expect(connectionLabel(status)).toBe('已连接');
  });

  it('test hooks can force failed phase without demo assembly', async () => {
    const hooks = installCredentialTestHooks();
    hooks.setStatus({
      phase: 'failed',
      failureMessage: '钥匙串授权未通过，请重试或重新填写',
    });
    const status = await credentialClient.status();
    expect(status.phase).toBe('failed');
    expect(status.failureMessage).toContain('钥匙串');
  });

  it('validate helpers reject empty and illegal env names', () => {
    expect(validatePastedCredential('')).toBeTruthy();
    expect(validateEnvironmentName('not-valid')).toBe(FORMAT_FAIL_MESSAGE);
    expect(validateEnvironmentName('COURTWORK_ACCESS')).toBeUndefined();
  });
});

describe('F4 failKind message mapping', () => {
  it('maps each kind to zero-tech Chinese copy', () => {
    const kinds: CredentialFailKind[] = [
      'user_canceled',
      'auth_failed',
      'acl_denied',
      'missing',
      'platform',
    ];
    for (const kind of kinds) {
      const msg = messageForFailKind(kind);
      expect(msg.length).toBeGreaterThan(4);
      expect(msg.toLowerCase()).not.toContain('keyring');
      expect(msg).not.toContain('OSStatus');
      expect(msg).not.toContain('ACL');
      expect(FAIL_KIND_MESSAGES[kind]).toBe(msg);
    }
  });

  it('fills failureMessage from failKind when forced without message', async () => {
    const hooks = installCredentialTestHooks();
    hooks.setStatus({ phase: 'failed', failKind: 'auth_failed' });
    const status = await credentialClient.status();
    expect(status.phase).toBe('failed');
    expect(status.failKind).toBe('auth_failed');
    expect(status.failureMessage).toBe(FAIL_KIND_MESSAGES.auth_failed);
    expect(status.failureMessage).toContain('钥匙串密码');
  });

  it('user_canceled and acl_denied have distinct copy', async () => {
    const hooks = installCredentialTestHooks();
    hooks.setStatus({ phase: 'failed', failKind: 'user_canceled' });
    expect((await credentialClient.status()).failureMessage).toContain('允许访问');
    hooks.setStatus({ phase: 'failed', failKind: 'acl_denied' });
    expect((await credentialClient.status()).failureMessage).toContain('删除旧凭证');
  });

  it('platform falls back to KEYCHAIN_FAIL_MESSAGE', () => {
    expect(messageForFailKind('platform')).toBe(KEYCHAIN_FAIL_MESSAGE);
    expect(messageForFailKind(undefined)).toBe(KEYCHAIN_FAIL_MESSAGE);
  });
});

describe('F5 recovery guide', () => {
  it('mentions keychain password desync and manual delete without embedding secrets', () => {
    expect(KEYCHAIN_RECOVERY_GUIDE).toContain('钥匙串');
    expect(KEYCHAIN_RECOVERY_GUIDE).toContain('cn.courtwork.desktop.provider');
    expect(KEYCHAIN_RECOVERY_GUIDE).toContain('credential');
    expect(KEYCHAIN_RECOVERY_GUIDE).toContain('active-source');
    expect(KEYCHAIN_RECOVERY_GUIDE).toContain('provider-secret');
    expect(KEYCHAIN_RECOVERY_GUIDE.toLowerCase()).not.toMatch(/sk-/);
    expect(KEYCHAIN_RECOVERY_GUIDE).not.toContain('password=');
  });
});
