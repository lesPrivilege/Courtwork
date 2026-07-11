import { afterEach, describe, expect, it } from 'vitest';
import {
  __setSettingsStoreForTests,
  buildDiagnosticPayload,
  DEFAULT_SETTINGS,
  loadSettings,
  setBehaviorDataOptIn,
  setTelemetryEnabled,
  updateOutputDir,
  updateRuntimeGuard,
} from './settings-store';

afterEach(() => {
  __setSettingsStoreForTests(null);
});

describe('settings-store', () => {
  it('loads defaults', () => {
    expect(loadSettings().runtimeGuard.maxUsd).toBe(DEFAULT_SETTINGS.runtimeGuard.maxUsd);
    expect(loadSettings().privacy.telemetryEnabled).toBe(true);
    expect(loadSettings().privacy.behaviorDataOptIn).toBe(false);
  });

  it('persists maxUsd as RuntimeGuard config', () => {
    const next = updateRuntimeGuard(loadSettings(), { maxUsd: 12.5 });
    expect(next.runtimeGuard.maxUsd).toBe(12.5);
    expect(loadSettings().runtimeGuard.maxUsd).toBe(12.5);
  });

  it('opt-in records consent timestamp; opt-out clears it', () => {
    const on = setBehaviorDataOptIn(loadSettings(), true, () => new Date('2026-07-11T08:00:00.000Z'));
    expect(on.privacy.behaviorDataOptIn).toBe(true);
    expect(on.privacy.behaviorDataConsentedAt).toBe('2026-07-11T08:00:00.000Z');
    const off = setBehaviorDataOptIn(on, false);
    expect(off.privacy.behaviorDataOptIn).toBe(false);
    expect(off.privacy.behaviorDataConsentedAt).toBeUndefined();
  });

  it('telemetry toggle persists', () => {
    const next = setTelemetryEnabled(loadSettings(), false);
    expect(loadSettings().privacy.telemetryEnabled).toBe(false);
    expect(next.privacy.telemetryEnabled).toBe(false);
  });

  it('output dir persists', () => {
    updateOutputDir(loadSettings(), '/tmp/courtwork-output');
    expect(loadSettings().output.defaultOutputDir).toBe('/tmp/courtwork-output');
  });

  it('diagnostic payload never embeds secrets or absolute output path', () => {
    const snap = updateOutputDir(loadSettings(), '/Users/secret/path');
    const payload = buildDiagnosticPayload(snap, {
      appVersion: '0.1.0',
      credentialPhase: 'connected',
      modelConfig: { providerId: 'deepseek', modelId: 'deepseek-chat', reasoning: 'standard' },
    });
    expect(JSON.stringify(payload)).not.toMatch(/sk-|password|secret/i);
    expect(payload.output).toEqual({ defaultOutputDir: '[configured]' });
    expect(payload.credentialFailKind).toBeNull();
  });

  it('diagnostic payload carries credentialFailKind enum only', () => {
    const payload = buildDiagnosticPayload(loadSettings(), {
      appVersion: '0.1.0',
      credentialPhase: 'failed',
      credentialFailKind: 'auth_failed',
      modelConfig: { providerId: 'deepseek', modelId: 'deepseek-chat', reasoning: 'standard' },
    });
    expect(payload.credentialPhase).toBe('failed');
    expect(payload.credentialFailKind).toBe('auth_failed');
    const raw = JSON.stringify(payload);
    expect(raw).not.toMatch(/sk-/);
    expect(raw).not.toContain('无法解锁'); // 诊断包不夹带用户长文案密钥面
  });
});
