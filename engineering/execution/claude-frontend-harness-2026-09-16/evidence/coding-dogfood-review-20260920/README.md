# Coding dogfood readiness — independent review and bounded return

2026-09-20 · Astra integration decision: **hold local integration pending the original author's bounded correction**. The deterministic positive path passes; operator preparation and failure cleanup are not ready for handoff. This is a review of original slice 11 / N-02, not a new implementation track.

## Fixed candidate and attribution

- Main at review: `95ed9cfb068300d154dca9643bf754beebe1d295`.
- Author source: `3f04f76fa4ffaa742598b19703195575f537c708`; packet/candidate: `94d60d228c525ff1bc80de0d4e97deacd7afff8a`, branch `claude-coding-dogfood-20260920`.
- Astra checked all four declared source hashes and byte counts against the detached review tree; [verified source manifest](verified-source-sha256.json).
- [Author delivery](author-delivery.txt) retains the forwarded transcript unchanged. Its 79/79 and 1244/1244 claims remain author evidence; this review did not rerun the full suite.
- Luna independently ran the separate-process public-HTTP rehearsal: **14/14**, both normal-path Hosts exited cleanly. [Process review](luna-process.md), [console](independent-rehearsal.log), [structured report](independent-rehearsal.json).
- Luna independently ran preparation/startup tests: **8/8**, then bounded synthetic guard probes. [Preparation review](luna-preparation.md). Path/manifest probes are documented observations; no probe source or full test log was delivered with that report. No printed startup command was executed by the probes.
- No real provider, browser interaction or personal credential/configuration read was performed. The user-reserved preparation was not opened or modified. Raw evidence retains original local paths; active reproduction uses the checked-out candidate and newly generated scratch paths.

## Owner dispositions and exact return scope

Claude remains the implementation owner. Astra adopts the following bounded corrections; implementation and delta evidence are pending. All source locations refer to the fixed candidate, not files already integrated into main.

| ID / disposition | Finding and consequence | Required correction and exit evidence |
| --- | --- | --- |
| DF11-R1 · adopt | `prepare-coding-dogfood.mjs:44–52`: `startsWith("..")` accepts a normal in-repository child named `..name`; an external symlink ancestor also permits actual writes inside the checkout. The latter was executed against disposable review scratch. | Check path components and canonical filesystem ancestry before creating source/data; reject both bypasses. Cover an existing symlink and a not-yet-created leaf below a symlink. Invalid roots must create no preparation files. Stay within the preparation utility; no new product filesystem policy. |
| DF11-R2 · adopt | `prepare-coding-dogfood.mjs:147–161`: JSON encoding is not shell quoting. `$()`, backticks and other shell syntax survive in the pasteable command, including double-quoted paths containing spaces. | Print a correctly escaped command for the documented shell and preserve literal argv. Add safe synthetic argument round-trip checks for spaces, quotes, newlines and metacharacters; never invoke arbitrary manifest commands. |
| DF11-R3 · adopt with portability adjustment | `inspectPreparation` trusts mutable manifest root/source/data and executable/argv after only a schema-version check. A synthetic altered manifest was accepted. | Validate canonical instance identity and scenario/source/data ownership before reading referenced paths or printing a launch command. Derive or strictly validate the Node/Host launch contract from trusted checked-out source, rather than executing arbitrary manifest instructions. Preserve preparation provenance separately: requiring the original author's absolute checkout forever would break cleanup/portability. Reject unexplained mismatches without resetting data. Cover redirected paths, altered launch fields and legitimate inspect/reuse. |
| DF11-R4 · adopt | `coding-dogfood-rehearsal.mjs:44–64`: `spawn` inherits the parent environment despite the contrary comment; startup failure before `startHost` returns can leave a live child outside caller cleanup. Normal-path teardown passed, but that does not cover startup timeout. | Supply an explicit environment sufficient for this synthetic fixture, excluding provider credentials/native configuration injection. Own the child from spawn through readiness and every startup failure; bounded termination must also handle a non-cooperative child. Add a small synthetic failure check proving the child exits and scratch locks are released. Test without personal environment values or a paid provider. |
| DF11-R5 · adjust | `durableShape()` compares only seq/run/type/call/status, while the README claims byte-identical check/repository events. Full write-effect receipts are compared separately. | Compare the complete persisted `check.*`/`repository.*` event objects across the clean restart, then describe exactly that assertion (parsed-object equality, not raw storage byte identity). Preserve receipt comparison. Rerun the changed rehearsal once on fresh independent scratch; retain prior evidence as prior evidence. |

### Packet corrections under the same owner

1. **Approval prerequisite:** explicitly select and record `Ask before editing` and the actual Run permission binding before the browser exercise. `app/runtime/control-plane.mjs:34–37` allows candidate writes in draft mode while checks still ask. Therefore, absence of a write card alone does not prove absence of a write. Use authoritative effects/diff/check receipts to assess execution; remove the contrary sentence in `real-model-prompt.md`.
2. **Stop versus interruption:** `app/server/service.mjs:2457–2467` drains active Runs through cancellation, and `cancelRun` awaits the active execution. A clean Ctrl-C may persist a cancelled/settled result before close. Reserve `unknown` for an unresolved execution at recovery (or another explicitly documented unknown outcome); do not claim every in-flight check becomes unknown on the next open. Correct instructions to follow the actual receipt and prohibit implicit reruns. No production change is requested to force the old prose to become true.
3. **Call identity:** use `(Run, call)` throughout. Remove the categorical claim that real providers cannot repeat call IDs; the fixture observation does not establish a cross-provider uniqueness guarantee.
4. **Write-effect presentation:** the positive-path diff and check display are sufficient for this narrow rehearsal. They do not independently close slice 02's prepared/failed/unknown write-effect presentation or the browser watch item. Keep that remaining scope with its existing owner.

## Return and integration boundary

Correct only the new preparation/rehearsal utilities, their targeted tests and the order 11 packet. Reuse existing Host/service behavior; no schema, frontend, Settings, native runtime or credential-manager expansion. Record exact new commits/source hashes, executed targeted commands, the new rehearsal result and writer release. Retain the previous 14/14 as a passing bounded observation, not final readiness acceptance.

Astra/Luna will recheck only the correction delta and any affected startup/reopen seam. Do not repeat accepted GUI/Core work or a full G4 campaign. After those corrections pass, existing authorization permits local integration and a WebUI handoff without another permission round; real-model N-02 remains a separate exercise.

The active `claude-agents-frontend-20260920` tree remains independently owned and was not modified. Its current implementation is observed, not accepted. Claude should sequence this small return within its own writer schedule; this record does not launch another competing frontend writer. Keep the untouched user instance, author tree and pinned review tree until the corrected candidate is accepted and a recoverable cleanup/launch plan is recorded. The paused heartbeat remains paused; no push or deployment.

## Record validation

Documentation-only review registration: `node tools/check-doc-links.mjs` passes (1,440 documents / 8,167 links), and `git diff --check` passes. Product scripts remain solely in the unmerged candidate; no unrelated product suite was rerun.

## Evidence integrity

[SHA-256 manifest](sha256.json) covers this review and the retained evidence files (excluding itself). Raw author/Luna records are not rewritten to match the ruling; the dispositions above are authoritative for this return.

## Superseding acceptance

The bounded return above is closed by [the final independent readiness acceptance](../coding-dogfood-final-20260920/README.md). Historical review evidence and its original hashes remain unchanged; the added pointer is covered by the final completion commit rather than the earlier review manifest.
