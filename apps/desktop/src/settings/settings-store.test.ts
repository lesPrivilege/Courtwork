import { afterEach, describe, expect, it } from 'vitest';
import {
  __setSettingsStoreForTests,
  buildDiagnosticPayload,
  DEFAULT_SETTINGS,
  loadSettings,
  setBehaviorDataOptIn,
  setTelemetryEnabled,
  setThemeMode,
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
    expect(loadSettings().appearance.themeMode).toBe('system');
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

  it('persists themeMode inside the versioned settings key and falls malformed values back to system', () => {
    const writes: Array<[string, string]> = [];
    let stored = JSON.stringify({ appearance: { themeMode: 'sepia' } });
    __setSettingsStoreForTests({
      getItem: () => stored,
      setItem: (key, value) => {
        writes.push([key, value]);
        stored = value;
      },
    });

    expect(loadSettings().appearance.themeMode).toBe('system');
    const next = setThemeMode(loadSettings(), 'dark');
    expect(next.appearance.themeMode).toBe('dark');
    expect(loadSettings().appearance.themeMode).toBe('dark');
    expect(writes).toHaveLength(1);
    expect(writes[0]?.[0]).toBe('courtwork.settings.v1');
  });

  it('settings snapshot has no retired output config', () => {
    expect(loadSettings()).not.toHaveProperty('output');
  });

  it('diagnostic payload never embeds secrets or removed output config', () => {
    const snap = loadSettings();
    const payload = buildDiagnosticPayload(snap, {
      appVersion: '0.1.1',
      credentialPhase: 'connected',
      modelConfig: { providerId: 'deepseek', modelId: 'deepseek-chat', reasoning: 'standard' },
    });
    expect(JSON.stringify(payload)).not.toMatch(/sk-|password|secret/i);
    expect(payload).not.toHaveProperty('output');
    expect(payload.credentialFailKind).toBeNull();
  });

  it('diagnostic payload carries credentialFailKind enum only', () => {
    const payload = buildDiagnosticPayload(loadSettings(), {
      appVersion: '0.1.1',
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
