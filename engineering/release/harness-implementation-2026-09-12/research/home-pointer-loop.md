# DF-UI-01 · Home row pointer/rerender experiment

2026-09-12 · read-only diagnostic

## Conclusion

The asynchronous replacement mechanism is reproducible in a real browser with the production Home renderer: if Home redraws after mouse-down but before mouse-up, the original row is detached, mouse-up lands on the replacement row, Chrome emits no `click`, and `onSession` is not called. A settled row activates once by physical mouse and once by native Enter on the same button.

This proves a possible mechanism, not the cause of the recorded user failure. The test forced the response precisely inside the down/up interval. It did not run the full app or observe a real Home response schedule; no evidence establishes that a Home response coincided with the user's failed click. Field attribution remains unconfirmed.

## Fixture and limits

I used the isolated `codex/harness-release-20260912` worktree at HEAD `366c1ac26a6ea0ce4a452551ad83b420d1fd3661`. The worktree was clean before this report.

A disposable in-memory localhost server exposed `app/web/*` as `/web/*` and a synthetic page importing the actual `app/web/home-view.mjs`. The row used one synthetic project/session, and its `onSession` callback only incremented a counter. Chrome `152.0.7977.83` ran headless with a fresh temporary user-data directory and loopback-only DevTools connection. No product server, provider endpoint, credentials, host GUI, or persisted app data was used. The fixture source and response were in memory; no test code or product code was written.

This is a browser/component integration experiment, not an end-to-end app test: the “Home response” is a deferred synthetic promise whose completion calls the production renderer. The timing and DOM replacement are real browser behavior; the scheduling of a response inside a real app pointer gesture was deliberately forced.

## Results

| Scenario | Browser evidence | Activation |
| --- | --- | --- |
| Settled-page mouse | `pointerdown → mousedown → focusin → pointerup → mouseup → click`; all six events target connected `row-1`. | `onSession` once |
| Same button, Enter | CDP `keyDown/keyUp` with Enter dispatches a native button click on `row-1`. | One additional `onSession` call |
| Delayed-response race | Down and focus land on `row-1`; resolving the deferred response invokes `renderHome`, changes render count from 1 to 2, disconnects `row-1`, creates `row-2`, and restores focus to it. Up events target `row-2`; no click event is observed. | `onSession` zero times |

Raw result excerpt (the stable Enter click is cumulative with the preceding mouse click):

```json
{
  "stableMouse": {
    "clickCount": 1,
    "events": [
      "pointerdown row-1 connected",
      "mousedown row-1 connected",
      "focusin row-1 connected (active row-1)",
      "pointerup row-1 connected",
      "mouseup row-1 connected",
      "click row-1 connected"
    ]
  },
  "stableEnter": { "clickCount": 2, "sameNode": "row-1" },
  "race": {
    "afterDown": ["pointerdown row-1", "mousedown row-1", "focusin row-1"],
    "afterResponse": {
      "renderCount": 2,
      "oldConnected": false,
      "currentNode": "row-2",
      "activeNode": "row-2"
    },
    "afterMouseUp": ["pointerup row-2", "mouseup row-2"],
    "clickEventCount": 0,
    "clickCount": 0
  }
}
```

The stable mouse result rules out an unconditional failure in the Home row's directly bound click listener in this fixture. The race result confirms that replacement during an in-flight pointer sequence can produce the exact no-op shape. It does not show that this race occurred in the operator trace.

## Reproduction recipe

Run from the repository root. The temporary Node harness started an HTTP server on `127.0.0.1`, serving the production web modules without writing a fixture file, then launched Chrome as follows (choose unused ephemeral loopback ports and a fresh temporary profile):

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-background-networking --disable-extensions \
  --no-first-run --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=<devtools-port> --user-data-dir=<fresh-temp-dir> \
  about:blank
```

The in-memory page imports `/web/home-view.mjs`, calls `renderHome(stream, {summary, projects, onSession})`, and records capture-phase pointer, mouse, focus, and click events plus a MutationObserver on `stream`. The controlled response is:

```js
let resolveResponse;
const response = new Promise((resolve) => { resolveResponse = resolve; });
response.then(() => renderHome(stream, { summary, projects, onSession }));
```

Using Chrome DevTools Protocol on the button center:

```js
// Stable mouse case
mouseMoved(point);
mousePressed(point);
mouseReleased(point);

// Controlled response race
mouseMoved(point);
mousePressed(point);             // dispatches pointerdown, mousedown, focusin
resolveResponse();
await response;                  // allow renderHome's replacement to finish
mouseReleased(point);             // pointerup/mouseup now hit replacement row
```

Here `mousePressed`/`mouseReleased` are CDP `Input.dispatchMouseEvent` calls with `type: "mousePressed"`/`"mouseReleased"`; Chrome produces the observed pointer events. Enter uses CDP `Input.dispatchKeyEvent` `keyDown` then `keyUp`, with `key: "Enter"`, `code: "Enter"`, `windowsVirtualKeyCode: 13`, and `text: "\r"` on keyDown. An initial `rawKeyDown` probe did not activate the button and was discarded as an invalid keyboard stimulus.

## Source path and remaining evidence gap

- `app/web/home-view.mjs:321-350`: the Continue row is a native button with a direct click listener.
- `app/web/home-view.mjs:630-634`: every Home render replaces the message-stream children, then restores focus by `data-focus-key`.
- `app/web/app.mjs:5510-5520, 5533-5555, 5589-5619`: Home Activity, Attention, and work-summary state transitions can request Home redraws.
- `app/web/app.mjs:6517-6519`: generic `focusin` only bumps the focus-intent epoch; it does not render Home. `app/web/ui-controls.mjs:379` capture-phase `pointerdown` only hides the tooltip.

To attribute the original failure, the missing evidence is an event/DOM log from that failing click: whether `click` reaches the original or replacement button, whether a relevant Home render occurs between down/up, and whether `onSession` begins. No cache fix or speculative product patch is supported by this experiment.
