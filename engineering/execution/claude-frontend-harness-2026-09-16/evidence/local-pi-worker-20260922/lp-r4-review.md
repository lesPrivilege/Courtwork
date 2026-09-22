# LP-R4 bounded non-author review

Date: 2026-09-22. Review target: `6c87b7d17242ac2f67bb7dacb69f37af48a65e36`, limited to the LP-R4 diff and adjacent local-Pi state/Store paths. The original `l3-luna-review.md` is preserved unchanged. No product source files were edited.

## Focused verification

Command:

    node --test --test-concurrency=1 --test-name-pattern='forged Run status|late explicit cancellation|actual Host crashes' app/tests/local-pi-host.test.mjs

Result: **7/7, exit 0**:

- dispatch, spawn, retained-result, and terminal crash fences;
- forged final Run status rejection;
- late explicit Host cancellation after known native completion, including closed PID, retained bytes, cancelled Run/attempt, retry refusal, and explicit new work proceeding.

Raw output: [lp-r4-review-tests.log](lp-r4-review-tests.log).

## Review disposition

**Adopt the correction.** `localPiRunUnresolved()` now remembers a recorded Host `unknown` status even if a later mutation attempts to alter the Run field. `validateLocalPiEvents()` now requires the latest Host `run.status` event to match the Run field, makes Host terminal transitions immutable, and checks terminal evidence for completed, failed, cancelled, and unknown outcomes. `RuntimeStore._mutate()` invokes this family validation before every persist, closing the prior gap where a generic Run/assignment mutation could bypass the local receipt writer.

The correction preserves the required distinction between native and Host state. A retained native completion followed by a publication crash remains Host `unknown` and fenced; native completion is not forced to equal Host completion. A genuine late cancellation may end the Host Run as `cancelled` after the native process is already complete and closed, provided Host stopping intent is recorded; the focused test covers that path and prevents retry while allowing separately created new work.

No blocking finding remains within this bounded LP-R4 scope. Parent Arch retains final independent acceptance and writer-release decisions.
