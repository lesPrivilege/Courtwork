import { afterEach, describe, expect, it } from 'vitest';
import {
  __setSettingsStoreForTests,
  DEFAULT_SETTINGS,
  loadSettings,
} from './settings-store';
import { resolveTheme } from './theme-controller';

afterEach(() => {
  __setSettingsStoreForTests(null);
});

describe('WORK-AGENT-SHOWCASE-1 · theme default/fallback semantics', () => {
  it('new install with no stored settings falls back to light', () => {
    __setSettingsStoreForTests({ getItem: () => null, setItem: () => undefined });
    expect(loadSettings().appearance.themeMode).toBe('light');
    expect(DEFAULT_SETTINGS.appearance.themeMode).toBe('light');
  });

  it('old snapshot without appearance falls back to light', () => {
    __setSettingsStoreForTests({
      getItem: () => JSON.stringify({ privacy: { telemetryEnabled: false } }),
      setItem: () => undefined,
    });
    expect(loadSettings().appearance.themeMode).toBe('light');
  });

  it('malformed theme value falls back to light', () => {
    __setSettingsStoreForTests({
      getItem: () => JSON.stringify({ appearance: { themeMode: 'sepia' } }),
      setItem: () => undefined,
    });
    expect(loadSettings().appearance.themeMode).toBe('light');
  });

  it('explicit system still follows the OS', () => {
    __setSettingsStoreForTests({
      getItem: () => JSON.stringify({ appearance: { themeMode: 'system' } }),
      setItem: () => undefined,
    });
    expect(loadSettings().appearance.themeMode).toBe('system');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('existing light and dark preferences are preserved exactly', () => {
    for (const mode of ['light', 'dark'] as const) {
      __setSettingsStoreForTests({
        getItem: () => JSON.stringify({ appearance: { themeMode: mode } }),
        setItem: () => undefined,
      });
      expect(loadSettings().appearance.themeMode).toBe(mode);
    }
  });
});
