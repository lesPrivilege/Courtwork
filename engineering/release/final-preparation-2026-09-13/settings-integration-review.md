# Settings integration review · 2026-09-14

## Scope and result

Bounded non-author source review of `509bf14` (`feat(settings): register context resources through shared intake`) and `26a86bf9d0cf16908f56af49f6222eb72b77c0a2` (`fix(settings): prevent exposure switch overlap and show owner states`), against the Settings resource-management contract and its recorded evidence. The review used the candidate source range ending at `26a86bf`; current checkout is `codex/release-final-20260913` at `9cc8cdf24777433b5d4f6a23d6f4319bd7b3e59c`.

The non-author review found one integration blocker: after a CAS conflict, an explicit banner retry could be accepted by the Host while leaving the original intake draft open. I was authorized to implement the bounded follow-up below and authored that repair; I do not claim independent acceptance of my own patch. Root has reviewed the full production diff and eight new real-Host UI tests and accepted this code direction. Root's final GUI check of the combined Models/context freeze is still pending; this report is not product acceptance.

## Findings

- The `509bf14` intake shares the existing inline resolver and Host runtime-control CAS. A resource is reviewed as `inspect-only`, then saved only on an explicit action; new resources start unexposed. Type-specific drafts, source-token/session-epoch checks, and preview identity checks keep a stale validation result from authorizing edited or cross-Session content. The resolver does not import or admit a resource by itself. This matches the contract recorded in `engineering/design/settings-resource-management-2026-09-13/README.md` and the resolver/runtime-control tests.
- `26a86bf` renders Host-owned exposure (`configurable: false`) as the Host's reported fact rather than a disabled switch. Configurable resources retain the shared switch and narrow-screen target geometry; the patch removes the private narrow-screen track/thumb sizing and negative margin. It changes neither exposure ownership nor execution permission. `settings-plugins.test.mjs` verifies the read-only profile row and retained switch; the existing runtime/control-plane tests continue to cover source-of-truth and CAS behavior.
- Cross-increment review found one receipt gap: after an initial CAS conflict, a successful explicit banner retry replaced the Host snapshot but did not finish the original local intake draft. The follow-up now carries a local success receipt through active-run/CAS retry storage. It clears only the exact draft, token, preview, and intake epoch that produced the accepted write; a newer edit or Session is preserved. Focus/announcement runs only when the same scope and type are still active. The Host's accepted snapshot remains authoritative, and retry is still an explicit human action.
- The same bounded `runtime-view.mjs` follow-up puts active-run/unknown-effect guidance once in each relevant Tools and Skills group, routes tool/MCP CAS drafts to Tools and context-resource drafts to Skills, and surfaces the existing read/mutation error with the last confirmed Host revision in those groups. Overview and Plugins keep their existing error presentation; their settings-view code was not changed.

## UI continuity

Nearest implemented precedents are the existing type-specific intake and focus behavior in `runtime-intake.mjs`, the shared active-run/CAS draft pattern in `runtime-view.mjs` `banners()`, and the existing stale-read message in Runtime Overview/Plugins. The new notices reuse those facts and wording patterns, changing placement only. No new state vocabulary, control pattern, token, or grammar/index entry was introduced; the continuity map still marks a universal empty/error-state grammar as deferred (`engineering/design/agent-interface-2026-09-10/precedent-map.md`, coverage note).

## Implementation and evidence

The authored follow-up is uncommitted and limited to `app/web/runtime-intake.mjs`, `app/web/runtime-view.mjs`, `app/tests/runtime-intake.test.mjs`, and `app/tests/runtime-intake-retry.test.mjs`. Relevant implementation coordinates are `runtime-intake.mjs:36-47,70-94` and `runtime-view.mjs:341-388,1274-1354,1807-1820,1931-1943`. The integration tests construct the actual `createSettingsPage`, mount the real Tools/Skills groups, and use `boot()` against the local Host HTTP fixture with fake local configuration only.

Final bounded checks passed on Node v22.19.0:

- `node --test app/tests/runtime-intake-retry.test.mjs app/tests/runtime-intake.test.mjs app/tests/settings-plugins.test.mjs app/tests/local-extension-view.test.mjs app/tests/control-plane.test.mjs app/tests/runtime-projection.test.mjs app/tests/runtime-source-service.test.mjs app/tests/governance-http.test.mjs` — 50/50 passed.
- `node tools/lint-interaction.mjs` — passed, 48 files, 0 registered exceptions.
- The new integration cases cover ordinary Save, same/different scope receipts and focus, changed drafts, repeated CAS conflict/retry, late receipt across Session change, active-run notice visibility in Tools and Skills, a real Host HTTP 503 read failure with the last confirmed revision visible in both groups, and an explicit Tools CAS retry.

The existing check log preserves the earlier 42/42 baseline and its standalone TinyDOM focus probe. That probe stopped at a null harness selector before invoking the application click; it is recorded as a probe setup failure, not a product test failure. The final 50/50 result and probe clarification are appended in `checks/settings-review.log`.

The original Settings increments have non-author review; their author-run screenshots and checks remain identified as such in `engineering/design/settings-resource-management-2026-09-13/README.md`. The follow-up is my authored repair, separately source-reviewed by root; final combined GUI verification remains pending.
