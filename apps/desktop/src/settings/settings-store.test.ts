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

  it('keeps an explicitly cleared runtime budget unlimited across reload', () => {
    const next = updateRuntimeGuard(loadSettings(), {});
    expect(next.runtimeGuard.maxUsd).toBeUndefined();
    expect(loadSettings().runtimeGuard.maxUsd).toBeUndefined();
  });

  it('defaults a readable top-level object that lacks its own runtimeGuard key', () => {
    __setSettingsStoreForTests({
      getItem: () => JSON.stringify({ privacy: { telemetryEnabled: false } }),
      setItem: () => undefined,
    });
    expect(loadSettings().runtimeGuard.maxUsd).toBe(5);
  });

  it.each([
    ['own empty runtimeGuard', { runtimeGuard: {} }],
    ['own null maxUsd', { runtimeGuard: { maxUsd: null } }],
  ])('keeps %s explicitly unlimited', (_label, value) => {
    __setSettingsStoreForTests({
      getItem: () => JSON.stringify(value),
      setItem: () => undefined,
    });
    expect(loadSettings().runtimeGuard.maxUsd).toBeUndefined();
  });

  it.each([null, [], 'settings', 7])('falls a non-plain top-level value %j back to complete defaults', (value) => {
    __setSettingsStoreForTests({
      getItem: () => JSON.stringify(value),
      setItem: () => undefined,
    });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it.each([
    ['null runtimeGuard', { runtimeGuard: null }],
    ['array runtimeGuard', { runtimeGuard: [] }],
    ['string maxUsd', { runtimeGuard: { maxUsd: '5' } }],
    ['negative maxUsd', { runtimeGuard: { maxUsd: -1 } }],
  ])('fails damaged budget partition safe for %s', (_label, value) => {
    __setSettingsStoreForTests({
      getItem: () => JSON.stringify(value),
      setItem: () => undefined,
    });
    expect(loadSettings().runtimeGuard.maxUsd).toBe(5);
  });

  it('fails a JSON numeric overflow safe instead of treating it as unlimited', () => {
    __setSettingsStoreForTests({
      getItem: () => '{"runtimeGuard":{"maxUsd":1e400}}',
      setItem: () => undefined,
    });
    expect(loadSettings().runtimeGuard.maxUsd).toBe(5);
  });

  it('preserves valid sibling partitions when only runtimeGuard is damaged', () => {
    __setSettingsStoreForTests({
      getItem: () => JSON.stringify({
        runtimeGuard: [],
        privacy: { telemetryEnabled: false, behaviorDataOptIn: true },
        appearance: { themeMode: 'dark' },
      }),
      setItem: () => undefined,
    });
    expect(loadSettings()).toMatchObject({
      runtimeGuard: { maxUsd: 5 },
      privacy: { telemetryEnabled: false, behaviorDataOptIn: true },
      appearance: { themeMode: 'dark' },
    });
  });

  it('normalizes Number.MAX_VALUE without overflowing to unlimited', () => {
    const next = updateRuntimeGuard(loadSettings(), { maxUsd: Number.MAX_VALUE });
    expect(next.runtimeGuard.maxUsd).toBe(Number.MAX_VALUE);
    expect(loadSettings().runtimeGuard.maxUsd).toBe(Number.MAX_VALUE);
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
