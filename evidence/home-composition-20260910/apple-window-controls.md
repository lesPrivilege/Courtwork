# macOS window-control seam review

Date: 2026-09-10

Scope: the Home composition native-window seam and the smallest web-side reservation contract.

Source checkout reviewed: the Home composition worktree based on `00b2f28`; this note records the bounded seam and does not claim that a native AppKit host has been built or accepted.

## Apple sources

The following are Apple primary sources read on 2026-09-10:

- [Human Interface Guidelines: Windows](https://developer.apple.com/design/human-interface-guidelines/windows) places the system window controls at the leading edge of a macOS toolbar and says toolbar items must be moved inward when controls could cover them. This supports keeping the close/minimize/full-screen buttons system-owned and moving the product's leading content after the measured control boundary.
- [Human Interface Guidelines: Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) places navigation controls at the leading edge, the title in the leading or center area, and actions at the trailing edge. The product's sidebar toggle or Settings Back action therefore remains an app action beside the host boundary, rather than replacing a system button.
- [`NSWindow.standardWindowButton(_:)`](https://developer.apple.com/documentation/appkit/nswindow/standardwindowbutton%28_%3A%29) documents the standard window-button lookup. The native host should use AppKit's standard button objects; the web layer must not draw a second traffic-light control.
- [`NSWindow.StyleMask.fullSizeContentView`](https://developer.apple.com/documentation/appkit/nswindow/stylemask-swift.struct/fullsizecontentview) says that full-size content consumes the whole window and directs callers to `contentLayoutRect` or `contentLayoutGuide` for content below the titlebar/toolbar area. A host that overlays the titlebar must therefore measure its actual WebView coordinate space before sending a reservation.
- [`NSWindow.contentLayoutGuide`](https://developer.apple.com/documentation/appkit/nswindow/contentlayoutguide) and the [NSWindow overview](https://developer.apple.com/documentation/appkit/nswindow) define `contentLayoutRect` as the non-obscured content area and expose titlebar accessory management. These are host layout facts; they are not a permission or action API for the page.
- [`NSView.safeAreaInsets`](https://developer.apple.com/documentation/appkit/nsview/safeareainsets) says that a view's safe area reflects portions covered by the window titlebar or ancestor views and also exposes `safeAreaRect`. This is the relevant view-level reference for a `WKWebView` embedded in an AppKit hierarchy.
- [`NSScreen.safeAreaInsets`](https://developer.apple.com/documentation/appkit/nsscreen/safeareainsets) describes the screen safe area, including camera housing and system full-screen handling. It is not a substitute for the WebView's titlebar/control rectangle.
- [`WKWebView`](https://developer.apple.com/documentation/webkit/wkwebview) documents that on macOS it is an `NSView` used to embed web content beside native UI. The host can therefore retain AppKit ownership of the `NSWindow` controls while sending the web document display geometry.

## Source facts and correction

Before this correction, the web shell had a `.shell-strip` child in [`app/web/index.html`](../../app/web/index.html) and a desktop two-row grid plus a full-width strip in [`app/web/styles.css`](../../app/web/styles.css). The old desktop rules were the `grid-template-rows: env(titlebar-area-height, 52px)` and `.shell-strip` block around the former `4294–4308` lines. That made the native reservation an extra full-width row above the product band.

The corrected composition removes that child and row. The brand and the product header occupy the same top band; the host controls remain outside the measured leading area. The current implementation adds the presentation-only adapter [`app/web/shell-layout.mjs`](../../app/web/shell-layout.mjs), which validates a versioned packet and applies only CSS variables and `data-shell`. It does not expose a window action, permission, credential, or authority bridge.

The affected web slots are:

- [`app/web/styles.css`](../../app/web/styles.css), `.sidebar-header` around lines 624–633: the brand begins after the host's measured leading boundary under the desktop signal.
- [`app/web/styles.css`](../../app/web/styles.css), `.chat-header` around lines 828–846: the collapsed-sidebar, Settings, and narrow layouts use the same leading boundary when the main header begins at the window's left edge.
- [`app/web/index.html`](../../app/web/index.html), the sidebar header and chat header around lines 90–208: the host controls are not represented as HTML controls.

## Minimal packet and update rules

The native host packet is intentionally display-only:

```json
{
  "schemaVersion": 1,
  "platform": "macos",
  "overlay": true,
  "controlsInsetLeft": 88,
  "toolbarHeight": 56
}
```

`controlsInsetLeft` and `toolbarHeight` are finite CSS-pixel values measured in the WebView's content viewport. With `overlay: true`, the web safe rectangle is `[0, controlsInsetLeft) × [0, toolbarHeight)`. The measured inset is authoritative for that host state; the design-preview query keeps its 80px fallback. A real host may report a smaller inset or zero when its control geometry changes, including full-screen states. With `overlay: false`, the content is below the native titlebar and the web reservation is removed.

The host provides `window.__CW_NATIVE_CHROME__` at document start so the first layout uses the correct shell signal. The host sends the same schema in a `courtwork:native-chrome` event after window-size, titlebar-overlay, or full-screen changes. The page validates the event and updates CSS variables; the event is a presentation update and is never treated as authority. A DOM `resize` event alone is insufficient for a native full-screen/titlebar transition, so the AppKit host must send the update for those transitions as well.

Chromium app-region CSS marks the header as draggable and product controls as no-drag. AppKit/WKWebView still needs native dragging and hit-testing; CSS alone does not implement those behaviors.

The shared product band remains at least 56px; a larger measured toolbar height may raise it with `max(56px, hostToolbarHeight)`. A host measurement must not shrink the product baseline or the 32/44px control hit-area rules. The host may use AppKit's `contentLayoutRect`/`contentLayoutGuide` and the embedded WebView's view coordinates to produce the CSS-pixel packet; the web code does not infer the value from `NSScreen.safeAreaInsets`.

## Verification boundary

The browser assertion should read the active CSS geometry instead of hard-coding the historical 80×52 values. For each rendered focusable/control node, test rectangle intersection with the active safe rectangle:

```js
const intersects = (rect, left, height) =>
  rect.left < left && rect.right > 0 && rect.top < height && rect.bottom > 0;
```

Run this for Home, collapsed navigation, Settings, narrow layout, and the expanded work surface. Use a custom fixture packet with a non-default value (for example 104×64), then update it to zero/full-screen and to `overlay: false`; also run an ordinary URL without `?shell=desktop`, which must report no reservation. The assertion must include `rect.right` and `rect.bottom` so it checks intersection rather than only the element's top-left point.

This review supports the seam and its source-backed contract. It does not provide native AppKit implementation, real-window hit-testing, VoiceOver, full-screen visual acceptance, or a release/publication claim.
