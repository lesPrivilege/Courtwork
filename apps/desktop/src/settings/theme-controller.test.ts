import { describe, expect, it } from 'vitest';
import { installThemeController, resolveTheme } from './theme-controller';
import type { ThemeMode } from './settings-store';

describe('theme-controller', () => {
  it('resolves system from the OS while explicit modes ignore it', () => {
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('exposes only the resolved data-theme and reacts to settings/OS changes', () => {
    const root = { dataset: {} as Record<string, string> };
    let mode: ThemeMode = 'system';
    let prefersDark = false;
    let osListener = () => {};
    let settingsListener = () => {};
    const cleanup = installThemeController({
      root,
      readMode: () => mode,
      media: {
        get matches() { return prefersDark; },
        addEventListener: (_event, listener) => { osListener = listener; },
        removeEventListener: () => {},
      },
      addSettingsListener: (listener) => { settingsListener = listener; return () => {}; },
    });

    expect(root.dataset).toEqual({ theme: 'light' });
    prefersDark = true;
    osListener();
    expect(root.dataset).toEqual({ theme: 'dark' });
    mode = 'light';
    settingsListener();
    expect(root.dataset).toEqual({ theme: 'light' });
    prefersDark = false;
    osListener();
    expect(root.dataset).toEqual({ theme: 'light' });
    cleanup();
  });
});
