# Correction round · browser and seam checks

Author: Claude. Applied against the returns in
[the independent review](../agents-profile-review-20260920/README.md). Preview served by
`node app/scripts/agent-profiles-preview.mjs` on `127.0.0.1:8899`, driven in the Claude Code in-app
browser — the same provenance limit as the first round, and the same one Astra's own OpenAI
computer-use run does not transfer to the author.

All readings are synthetic. Nothing outside the tab was touched.

## AP-R3 · focus through a save

Readings are `document.activeElement`'s `data-focus-key` at each moment.

| Moment | Before the correction | Now |
|---|---|---|
| Save pressed, request out | `BODY` | `BODY` — the button is genuinely disabled, so nothing can hold focus; the destination is remembered rather than lost |
| Failed save settled | `BODY`; the next Tab went to `back` at the top of the form | `save` — the retry itself. The next real `Tab` goes to `discard`, the control after it |
| Successful save settled | `BODY` | `save-receipt`, reading *"Saved. This host confirmed revision 3; it applies to the next run."* |
| Focus moved to `back` during a slow save, then the save settles | — | `back`. The pending restore is abandoned as soon as anything else takes focus; completion does not steal it back |

The failed-save receipt read back verbatim: `The host did not accept the change. Nothing was saved,
and your draft is kept here.` with Save re-enabled.

## AP-R4 · an unavailable runtime is recoverable from inside its profile

Scenario `Pi unavailable`, profile `Work` (runtime Pi):

```text
row action                 → "Open"                     (was: "Why is Pi unavailable?")
profile opens              → true
blocker before             → "Pi is unavailable: The Pi process is not running on this device.
                              An unavailable runtime cannot be saved as this agent's execution choice."
runtime → Hermes           → blockers: []
Save enabled               → true
receipt                    → "Saved. This host confirmed revision 5; it applies to the next run."
```

The reason did not disappear with the detour: it is in the row's own text (`Pi · unavailable`), in
the Runtime row's explanation, and in the Runtime detail still reachable from inside the profile.

## AP-R5 · capability reason and unreported permission effect

Scenario `Host cannot save` (`capabilities() → {canSave:false, reason}`), profile `Work`, Role
changed to Coding:

```text
capability reason → "This host cannot save an agent profile yet. You can read and compare the
                     composition; the change is not kept."
Save disabled     → true
draft summary     → "Requested: role Coding. Effective is still what revision 5 holds."
```

The draft is still composable and still says it is not applied; what is withdrawn is the write, with
its reason beside it.

Scenario `Permission effect not reported`, profile `Attention` on Hermes:

```text
Read the Attention queue        → Allowed · asked for by Attention triage
Read connected reference material → Permission effect not reported · asked for by Praxis
Produce a decision material     → Asks each time · asked for by Praxis
```

`reference.read` stays in `supportedActions`; only the permission owner's answer is absent. Three
silences now read differently: *Unknown until a runtime is chosen*, *Not supported by X*, and
*Permission effect not reported*.

## AP-R1 / AP-R2 · seam regressions

Not reachable by hand; covered by gated-reply tests in
`app/tests/agent-profiles-specimen.test.mjs`:

- a detail read released after leaving for the list, and again after moving to another profile,
  leaves `runtimeDetail.status === 'closed'`;
- save → `discardDraft()` → reply: the discard is refused mid-flight and the reply lands coherently
  (`revision 5`, `dirty:false`);
- save → edit → reply: the write happened, the receipt names revision 5, and the newer draft is
  still `dirty` rather than reported clean.

## Checks on the corrected tree

See [checks.txt](checks.txt) for the commands and their output.

## Still not executed

Native 200% browser zoom, screen-reader operation, and a long-label stress case beyond the
fixture's own strings. Escape-to-close remains unexecutable from this author's driver; Astra's
independent run covered it. The list-refresh staleness Luna noted as a follow-up is unchanged and
still open.
