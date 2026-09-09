// Presentation geometry only. A native host injects the initial snapshot at
// document start, then dispatches courtwork:native-chrome after layout changes.
// Nothing in this packet is an action, permission or proof of native authority.
export function nativeChromeGeometry(value) {
  if (!value || value.schemaVersion !== 1 || value.platform !== 'macos' ||
      typeof value.overlay !== 'boolean') return null;
  if (!value.overlay) return { overlay: false, controlsInsetLeft: 0, toolbarHeight: 56 };
  const { controlsInsetLeft, toolbarHeight } = value;
  if (!Number.isFinite(controlsInsetLeft) || controlsInsetLeft < 0 || controlsInsetLeft > 256 ||
      !Number.isFinite(toolbarHeight) || toolbarHeight < 40 || toolbarHeight > 96) return null;
  return { overlay: true, controlsInsetLeft, toolbarHeight };
}
export function installShellLayout({ window: hostWindow, document: hostDocument, navigator: hostNavigator }) {
  const root = hostDocument.documentElement;
  const preview = new URLSearchParams(hostWindow.location.search).get('shell') === 'desktop';
  const overlay = hostNavigator.windowControlsOverlay;
  let native = nativeChromeGeometry(hostWindow.__CW_NATIVE_CHROME__);
  function apply() {
    const desktop = native ? native.overlay : preview || overlay?.visible === true;
    if (desktop) root.dataset.shell = 'desktop';
    else if (native || overlay) delete root.dataset.shell;
    if (native?.overlay) {
      root.style.setProperty('--native-controls-inset', `${native.controlsInsetLeft}px`);
      root.style.setProperty('--native-toolbar-height', `${native.toolbarHeight}px`);
    } else {
      root.style.removeProperty('--native-controls-inset');
      root.style.removeProperty('--native-toolbar-height');
    }
  }
  hostWindow.addEventListener('courtwork:native-chrome', event => {
    const next = nativeChromeGeometry(event.detail);
    if (!next) return;
    native = next;
    apply();
  });
  overlay?.addEventListener('geometrychange', apply);
  apply();
}
