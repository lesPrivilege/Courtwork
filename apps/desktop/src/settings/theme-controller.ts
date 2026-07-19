import {
  loadSettings,
  SETTINGS_CHANGED_EVENT,
  type ThemeMode,
} from './settings-store';

export type ResolvedTheme = 'light' | 'dark';

type ThemeRoot = { dataset: { theme?: string } };
type ChangeListener = () => void;
type ThemeMedia = {
  readonly matches: boolean;
  addEventListener(event: 'change', listener: ChangeListener): void;
  removeEventListener(event: 'change', listener: ChangeListener): void;
};

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') return mode;
  return prefersDark ? 'dark' : 'light';
}

export function installThemeController({
  root,
  readMode,
  media,
  addSettingsListener,
}: {
  root: ThemeRoot;
  readMode: () => ThemeMode;
  media: ThemeMedia;
  addSettingsListener: (listener: ChangeListener) => () => void;
}): () => void {
  const apply = () => {
    root.dataset.theme = resolveTheme(readMode(), media.matches);
  };
  media.addEventListener('change', apply);
  const removeSettingsListener = addSettingsListener(apply);
  apply();
  return () => {
    media.removeEventListener('change', apply);
    removeSettingsListener();
  };
}

export function installDesktopThemeController(): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  return installThemeController({
    root: document.documentElement,
    readMode: () => loadSettings().appearance.themeMode,
    media,
    addSettingsListener: (listener) => {
      window.addEventListener(SETTINGS_CHANGED_EVENT, listener);
      return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, listener);
    },
  });
}
