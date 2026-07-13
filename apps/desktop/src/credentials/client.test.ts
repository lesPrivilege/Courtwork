import { beforeEach, describe, expect, it } from 'vitest';
import {
  connectionLabel, credentialClient, FAIL_KIND_MESSAGES, FORMAT_FAIL_MESSAGE,
  installCredentialTestHooks, KEYCHAIN_FAIL_MESSAGE, KEYCHAIN_RECOVERY_GUIDE,
  messageForFailKind, validateEnvironmentName, validatePastedCredential,
  type CredentialFailKind,
} from './client';

describe('orthogonal provider readiness', () => {
  beforeEach(() => installCredentialTestHooks().clearOverride());

  it('defaults to absent + unverified — never optimistic ready', async () => {
    const status = await credentialClient.status();
    expect(status).toEqual({ credential: { phase: 'absent' }, connection: { phase: 'unverified' } });
    expect(connectionLabel(status)).toBe('待验证');
  });

  it('rejects short pasted credentials without storing them', async () => {
    const status = await credentialClient.save('pasted', 'short');
    expect(status.credential.phase).toBe('absent');
    expect(status.connection).toMatchObject({ phase: 'failed', failureMessage: FORMAT_FAIL_MESSAGE });
  });

  it('save means stored + unverified, never ready', async () => {
    const status = await credentialClient.save('pasted', 'valid-key-12');
    expect(status).toEqual({ credential: { phase: 'stored', source: 'pasted' }, connection: { phase: 'unverified' } });
    expect(connectionLabel(status)).toBe('待验证');
  });

  it('test hooks use the exact nested wire shape', async () => {
    installCredentialTestHooks().setStatus({
      credential: { phase: 'stored', source: 'pasted' },
      connection: { phase: 'failed', failKind: 'platform' },
    });
    const status = await credentialClient.status();
    expect(status.connection.failureMessage).toBe(FAIL_KIND_MESSAGES.platform);
  });

  it('validate helpers reject empty and illegal env names', () => {
    expect(validatePastedCredential('')).toBeTruthy();
    expect(validateEnvironmentName('not-valid')).toBe(FORMAT_FAIL_MESSAGE);
    expect(validateEnvironmentName('COURTWORK_ACCESS')).toBeUndefined();
  });
});

describe('failure copy', () => {
  it('maps each closed failure kind to user-facing copy', () => {
    const kinds: CredentialFailKind[] = ['platform', 'auth', 'rate_limit', 'endpoint', 'model', 'timeout', 'network', 'protocol', 'invalid_response', 'canceled'];
    for (const kind of kinds) {
      const msg = messageForFailKind(kind);
      expect(msg.length).toBeGreaterThan(4);
      expect(msg.toLowerCase()).not.toContain('keyring');
      expect(msg).not.toContain('OSStatus');
      expect(msg).not.toContain('ACL');
    }
  });

  it('platform falls back to KEYCHAIN_FAIL_MESSAGE', () => {
    expect(messageForFailKind('platform')).toBe(KEYCHAIN_FAIL_MESSAGE);
    expect(messageForFailKind(undefined)).toBe(KEYCHAIN_FAIL_MESSAGE);
  });

  it('recovery guide names cleanup targets without secrets', () => {
    expect(KEYCHAIN_RECOVERY_GUIDE).toContain('cn.courtwork.desktop.provider');
    expect(KEYCHAIN_RECOVERY_GUIDE).toContain('credential');
    expect(KEYCHAIN_RECOVERY_GUIDE.toLowerCase()).not.toMatch(/sk-/);
  });
});
