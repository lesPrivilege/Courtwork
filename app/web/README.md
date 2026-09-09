# V6 generic UI handoff

This directory contains the native same-origin `/api/v5` Web UI. Projects and sessions remain the navigation authority; the name filter only searches names already loaded in the browser. The UI restores non-secret project/session selection and expanded projects from a guarded UI marker. Malformed or unavailable browser storage is ignored, and the first real project/session is used when a saved id no longer exists.

Development extension lifecycle, binding, and provider descriptor controls remain available under the keyboard-accessible **Runtime setup** dialog. The dialog does not add credentials, provider routes, browser tools, downloads, or permissions. Provider descriptors remain labelled local fake execution. The bootstrap token stays in memory and is never written to browser storage. The right work-surface shell continues to load the existing extension renderer through its guarded same-origin module path.

The right-hand surface is one generic same-origin **Preview** tab with a matching tabpanel. Closing it hides the panel and returns focus to the show button; reopening returns focus to Preview and keeps the current renderer mount alive. Each mount receives a dedicated child container through the unchanged V5 renderer ABI; identity changes detach that child before awaiting renderer disposal, while same-identity refresh and close/reopen reuse it. Session changes, extension unload/reload/invalidation, generation changes, status changes, or module-path changes dispose the old mount. A same-identity surface refresh compares the JSON projection and calls the existing V5 `mounted.update(nextProjection)` only when it changed. Fetch cancellation is separate from the renderer lifecycle signal, and surface actions invalidate in-flight reads so a late `/surface` response cannot overwrite a committed projection.

Message rendering is projected from the existing events and runs. User messages have no run completion badge; assistant status and standalone run status cards use the actual run status. Empty terminal assistant messages are omitted, tool request/result details are nested behind stable session/run/call details, and long assistant text can be expanded in full. Tool expansion, question input, and reading position stay scoped to the active session. The stream follows new events only when the reader is near the bottom; otherwise it preserves the viewport and exposes **Back to latest**.

Ask-user submissions are scoped by session/run/question. While a request is pending, the control cannot be submitted again. Accepted answers remain in a waiting state until the `question.resolved` event arrives; failed requests keep the draft and expose the error for retry. The renderer loader still validates same-origin `/extensions/` paths and keeps its existing request/epoch/session lifecycle fence.

Author checks:

```sh
node --check <isolated-checkout>/app/web/app.mjs
node --test <isolated-checkout>/deferred/structural-checks/ui-v6-source-contract.test.mjs
node --test <isolated-checkout>/deferred/structural-checks/ui-v6-behavior.test.mjs
```

These checks are source-level contracts and do not simulate mounted renderer behavior, lifecycle races, or late responses. The independent browser harness separately exercises the existing V5 auth boundary, navigation, question flow, tool details, surface close/reopen gate, reading continuity, and stale navigation response fence. Renderer lifecycle and independent accessibility review remain Astra's validation scope.

The files below are the complete UI-author handoff hashes after the V6 changes:

```text
index.html  455c540cc8317d928785169f45af779e3b22051aa3a2b995b459276f326c9076
styles.css  a382d4213d9e0c79e9f30b65f8b7dfd756d3a7c8d67c5686e7b931fb1da81e30
app.mjs     ea234992379898d4a90347a184210ab6b1afd7f25ae2308a758131dab1c6a9b0
deferred/structural-checks/ui-v6-source-contract.test.mjs  3226184c4a30893bf2973ad577891bbb76736a39d2431bbe41789cfaf7dd3013
deferred/structural-checks/ui-v6-behavior.test.mjs  436f2b478ef66894e522719ecc58e06553fe609fcfd1dcd9e654e7a9a498b5b6
```
