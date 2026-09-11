# Secondary host chrome review

Date: 2026-09-11
Reviewer: Luna
Candidate: `1ae17844fce9cc4b45c70787fcf4ddd2b63fec6c`
Scope: secondary review of native window-control reservation and previous visual-preview evidence. This is a source and browser-geometry review, not native-host acceptance.

## Contract consumed

The nearest implemented precedent is [`docs/interface-components.md`](../../../docs/interface-components.md) lines 7–21 and the source contract in [`evidence/home-composition-20260910/apple-window-controls.md`](../../../evidence/home-composition-20260910/apple-window-controls.md) lines 22–65. The contract has three owners:

| Owner | Owns | Web implication |
| --- | --- | --- |
| OS / desktop shell | Native close, minimise, zoom/full-screen controls, hit testing and dragging | The web document does not draw traffic lights and cannot turn geometry into a window action. |
| App shell | Sidebar toggle, Settings `Back to app`, navigation and product header | These controls occupy the product slot after the host's measured leading boundary. |
| Brand | One identity mark in the sidebar header | The mark is presentation only and has no action, permission or runtime meaning. |

[`app/web/shell-layout.mjs`](../../../app/web/shell-layout.mjs) is a presentation-only adapter. It accepts only schema 1, `platform: "macos"`, a boolean `overlay`, finite `controlsInsetLeft` in 0–256 CSS px and finite `toolbarHeight` in 40–96 CSS px. It applies `data-shell` and CSS variables; it does not expose the native controls or authority bridge. The host packet is supplied at document start and refreshed by `courtwork:native-chrome`.

With `overlay: true`, the protected rectangle is `[0, controlsInsetLeft) × [0, toolbarHeight)`. The design-preview query `?shell=desktop` uses an 80px leading fallback. With `overlay: false`, the content sits below the native titlebar and the web reservation is removed. The shared product band is 48px minimum and may grow to the measured toolbar height. The host must measure the WebView/titlebar relationship; `NSScreen.safeAreaInsets` is not a substitute.

## Candidate source findings

The old full-width shell strip and extra desktop row are gone. The current DOM has no web traffic-light controls: [`app/web/index.html`](../../../app/web/index.html) has the sidebar header and chat header, while the host adapter only conveys layout. The current work-surface contract puts the app's `Chat` return control on its own strip row, outside the work-surface `tablist`; `Back to app` occupies the app header's one leaving-action slot while Settings is open.

The expanded work-surface rules have two layers that must be read together:

* Base rules in [`app/web/styles.css`](../../../app/web/styles.css) lines 4639–4668 define the 1024px+ expanded panel and the old top band/gap values.
* Later rules in [`app/web/surface-layout.css`](../../../app/web/surface-layout.css) lines 36–50 set `.surface-panel.is-view-switch` to `top: 0; left: 0; right: 0; bottom: 0`, then give its header the 48px band and 24px inline padding. This later selector is the effective source for the 1024–1679 expanded view-switch. Treating the base declaration alone as the current geometry would report a false top gap.

The relevant DOM ownership is:

| State | Product geometry | Leaving control |
| --- | --- | --- |
| Home / ordinary session | Main chat panel with sidebar; `?shell=desktop` reserves the host inset in the leading header | App sidebar toggle after the safe area |
| Settings | Settings page replaces the main content; global sidebar is hidden and inert | `Back to app` after the same safe area |
| 1024–1679 expanded work surface | `.surface-panel.is-view-switch` fills the main area; chat is hidden/inert; no scrim or modal card frame | Work-surface `Chat` return on its own strip row, outside `tablist` |
| <1024 expanded sheet | Whole-area sheet with its own product header and focus/close behavior | Sheet close/back contract |
| ≥1680 three-pane surface | Navigation, chat and document tracks share the 48px chrome baseline | Product controls remain separate from native host controls |

## Browser geometry evidence

The previous geometry fixture [`evidence/chat-shell-proportion-20260910/serve.mjs`](../../../evidence/chat-shell-proportion-20260910/serve.mjs) is a narrow synthetic server used for shell proportions. Its after evidence includes 1280/1440/390 light/dark surface, Settings and workspace images plus `after/measurements.json`, `after/checks.json` and `after/full-test.txt`. It is not the all-surface runtime fixture and does not exercise an AppKit host.

I consumed the candidate in a loopback browser with `?shell=desktop` and a synthetic local fixture. At 1280, the expanded view-switch had classes `app-shell nav-collapsed surface-expanded surface-view-switch`; the effective panel measured x=0, y=0, width=1280, height=720. Its surface header measured x=0, y=0, height=48, with 24px inline padding; `#surface-back-button` began at x=24 and the surface tabs began after it. The strict safe-rectangle check was `[0,80) × [0,48)`: the product controls were tested by rectangle intersection, so a control whose top-left was outside the rectangle but whose box crossed it could not pass accidentally.

At 1280 Settings, the chat header occupied the same 48px band and its Back control began after the 80px preview inset. This confirms the app-side reservation is shared by the ordinary header and Settings. It does not show real AppKit traffic lights, hit testing or drag behavior. At 390, the sheet and Attention/Spark dialog layouts use the mobile surface rules; a narrow dialog that reaches the viewport edge must not be described as a native-toolbar inset proof.

The source contract's stronger test remains the right one for a native integration:

```js
const intersects = (rect, left, height) =>
  rect.left < left && rect.right > 0 &&
  rect.top < height && rect.bottom > 0;
```

Run it against Home, collapsed navigation, Settings, narrow layout and expanded work surface with a non-default packet such as `controlsInsetLeft=104, toolbarHeight=64`, then update to zero/full-screen and `overlay:false`. Also run an ordinary URL without `?shell=desktop`; it must have no reservation. Include both right and bottom edges in every assertion.

## Gap and handoff

The web seam is implemented as a validated presentation adapter and fallback preview. A real native host is still design/integration work. The next Claude Design package should show the host-safe slots and their wide/narrow behavior, preserve the one-leaving-action rule, and keep the OS controls visually and semantically outside the product DOM. It should include an explicit “host supplies geometry” note in its source inventory rather than drawing fake traffic lights.

The same package should cover the four states above alongside Spark/Attention glyph and header decisions. Any glyph proposal remains a product button asset with a semantic mapping; it must not be confused with the brand mark or used to claim a native host. A control that is unavailable because a real host or backend is absent should use the agreed red/grey unavailable grammar with text, state and focus equivalents.

No source change was made for this review. The evidence supports the layout seam and identifies the effective CSS override; it does not establish native AppKit compatibility, VoiceOver behavior, full-screen acceptance, publication readiness or deployment.
