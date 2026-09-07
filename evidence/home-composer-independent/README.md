# Home composer independent acceptance

This directory contains VM based acceptance evidence for the new Home composer flow. It injects the request, draft persistence, session selection, run admission, and DOM seams; it does not start the UI or use a personal-data service.

Run:

```text
node --test evidence/home-composer-independent/home-composer-counterexamples.mjs
```

The probe covers:

- one session creation and one run admission despite duplicate submit events;
- a late creation receipt after navigation away from Home, which must save the instruction without navigating or sending;
- normal creation failure and uncertain creation behavior, including no automatic retry;
- an empty project list opening project creation while retaining the typed instruction;
- Home and session draft isolation;
- active, waiting, stopping/cancel, failed, and disconnected Send/draft states;
- the existing IME Enter guard through the actual `wireEvents()` handler.

## Historical counterexample and recheck

The initial probe reported **7/8 passing**. That failing run is preserved in [home-composer-counterexamples.before-fix.txt](./home-composer-counterexamples.before-fix.txt):

1. Start on Home with projects `p1` and `p2`, select `p1`, and type an instruction.
2. Submit; make the `/sessions` request return a normal `400` failure.
3. Select `p2` and submit the retained instruction again.
4. The second `/sessions` body still contains `projectId: "p1"`; the expected project is `p2`.

The source path was `app/web/app.mjs:3470-3473`: `submitHomeRun()` computed the current `projectId`, then reused an existing `state.homeStart` object without replacing its stale `operation.projectId`. The normal failure left that object in place for retry, so a later project selection was ignored. The failing test was `normal creation failure does not keep a stale project when the user changes the project`.

The parent fix makes `homeProjectId()` honor the current selection after a normal failure and only reuses `state.homeStart` when it already contains a known session. The recheck now reports **10/10 passing**, with output preserved in [home-composer-counterexamples.after-fix.txt](./home-composer-counterexamples.after-fix.txt). The added cases verify that a known session receipt is reused after session detail failure without a second create, and that a retry uses the latest permission mode.

The 10 passing cases cover one create plus one run, duplicate submit admission, late-receipt navigation fencing, known-session reuse, permission refresh, uncertain receipt blocking, empty-project draft retention, project-selection and draft isolation, active/waiting/stopping/failed/disconnected Send behavior, and IME handling. No product source was modified by this evidence pass.
