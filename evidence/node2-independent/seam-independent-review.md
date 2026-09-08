# Astra node 2 seam review

Scope: read-only review of `/private/tmp/cw-astra-node2` at
`0a307802b61a6847ee88bfea870bdf340647caee`. The worktree contains the node 2
runtime-control/UI changes plus the surrounding integration evidence and docs;
no product files were edited by this review.

## Verification

- `git diff --check`: pass.
- `node --test app/tests/control-plane.test.mjs app/tests/runtime-projection.test.mjs`:
  18 tests, 18 pass, 0 fail.
- The new backend fields preserve the existing compiled prompt bytes. The
  added test checks UTF-16 additive counts, deferred source bodies, draft-only
  templates, and a recorded binding after a later resource replacement.
- Parent-gate provenance is now emitted by
  `app/runtime/control-plane.mjs:164-173` with `parentId`, and the projection
  test covers a child override that cannot defeat the gate.

## Finding

**P2 — parent-gated child row says its switch overrides the value.**

In `app/web/runtime-view.mjs:392-403`, a remote MCP child whose effective
`exposed` value is false because its parent is not exposed or not running now
has the gate recorded as the final provenance entry. Therefore
`provenanceValue(resource) === resource.exposed`, `overrideAt(resource, scope)`
is false, and the code appends:

> The switch overrides it for this session.

The switch remains enabled (`:331-348`). Clicking it sends an explicit true
override, but `control-plane.mjs:168-171` immediately reapplies the parent
gate and returns the child as not exposed. The text promises an effect the
control plane cannot provide. A child with an explicit override should retain
that override for when the parent becomes available, but the no-override case
needs a parent-gate explanation and a disabled switch or wording that the
setting is queued until the parent is exposed/running.

This is a semantic/UI issue only; no P1 was found and it does not invalidate
the backend lifecycle or count tests. It is safe to defer if the merge is
time-sensitive, but should be tracked before calling the runtime inspector
fully clear.

## No additional blocking seam

The additive `admittedCharacters` implementation in
`app/runtime/control-plane.mjs:225-244` counts the exact serialized
instruction/catalog parts, using JavaScript string length (UTF-16 code units),
while `compileControlContext` still returns the same text. Historical bindings
correctly fall back to the old partial `characters` field in
`app/web/runtime-view.mjs:1147-1167`. MCP connect/disconnect remains an API
transport projection; this review found no new replay, permission, or active-run
freeze regression.

## Delta recheck

The follow-up delta closes the P2 above. `runtime-view.mjs:331-348` now calls
`hasParentGate(resource)` and disables the exposure switch whenever the
authoritative provenance includes a false parent gate. `runtime-view.mjs:401-407`
adds the parent-gate instruction and no longer appends the claim that the child
switch overrides the value. A child with a stored explicit override still gets
the `Inherit` action at `:409-417`; removing that override remains available
without pretending that the parent gate can be bypassed. The exact previous
counterexample is therefore closed. No new P1/P2 was found in this delta.
