import { beforeEach, describe, expect, it } from 'vitest';
import {
  connectionLabel,
  credentialClient,
  FORMAT_FAIL_MESSAGE,
  installCredentialTestHooks,
  validateEnvironmentName,
  validatePastedCredential,
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
