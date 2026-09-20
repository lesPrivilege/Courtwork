# Real-model coding dogfood and serial integration

2026-09-20 · Astra browser run at main `6191733`, through OpenAI computer use in the user's in-app browser. The user explicitly authorized using the CW connection they had configured, then authorized Astra-led serial integration with Luna exploration and Sol/CW workers. No credential was read, copied or included in this packet. The configured model identifies as `deepseek-v4-flash`, through Pi 0.85.1 / openai-completions. This records observed execution, not an independent vendor model-identity attestation.

## Initial outcome

Autonomous coding completion is **not yet accepted**. Real reads/diagnosis work, but the first candidate write exposes a tool contract blocker: `candidate_read` places the old SHA-256 only in local `details`, while the provider consumes `content`. The model cannot obtain the required old-file hash from its read result. Both attempted permissions have `expectedSha256: null`, their cards describe a new file, and the approved first write rejects with `write_conflict`. Astra cancels the second pending attempt to stop repetition. [Initial receipts](host-receipts-initial.json) and [unchanged source/candidate evidence](file-integrity.json) show no write effects and write revision 0.

A separate explicitly assisted continuation supplies the independently measured old-file hash through a user message. It confirms one private-candidate replacement at revision 1 and `node-test` exit 0, 2/2 tests, in that same Run. The [Host receipts](host-receipts-assisted.json) establish this independently of model prose. It does **not** close autonomous N-02. A browser reload restores the completed transcript; a Host process restart will be recorded separately.

Session: `695443cc-abb4-4dfd-8800-090d95c33314`. Read/diagnosis Run `c41f11bb-e260-4890-b397-6b2cb4c6a4a2`; cancelled unassisted write Run `a2937313-4ecc-4239-9c01-a4ff6d571935`; assisted write/check Run `1903f34d-7dda-4166-b33f-dc29b88f25d5`.

## Observed journey and UI queue

1. **Folder selection — works with friction.** Home's existing folder card has Remove, then another path disclosure/Connect journey to change folder. Project selects organizational ownership, not filesystem access. User reports confusion across folder, permissions and coding start.
2. **First send — diagnosis works; preparation gap.** Home can stage a folder but cannot start a candidate. New chat returns to Home; a real first Run is needed before a candidate can be created. The initial diagnostic prompt deliberately forbids writing/checks.
3. **Candidate creation — succeeds.** Chat overview → source → Start private candidate creates the isolated worktree. Focus falls to the page after this command. Source access remains read-only while candidate edits obey the separate permission mode, which the current adjacent labels do not explain.
4. **Unassisted write — blocked by Core contract.** One approved write conflicts; the next same-class pending request is cancelled. This is not a frontend field-name mismatch. [Approval screenshot](03-write-approval.png), [failure transcript](04-write-conflict.txt).
5. **Assisted write/check — completes.** The explicit hash produces the correct replacement description, exact-write approval and check approval. [Write](05-assisted-write.png), [check](06-check-approval.png), [result transcript](07-assisted-result.txt).
6. **Review changes — real diff, stale count.** Host diff shows one removed/one added line, but the modal title still says **0 writes** after revision 1. Count freshness belongs to Claude's existing candidate surface/projection owner. [Screenshot](08-host-diff.png).
7. **Reload — transcript restored.** [Reload screenshot](09-reloaded.png) and saved state retain the completed assisted run. No screen-reader, native zoom or full G4 claim.

Other bounded findings for the later Claude batch: `Nothing is read before then` overstates the boundary because staged folder/Git metadata is inspected; `Nothing is uploaded` needs wording review because repository text can enter the selected model context; pending tool disclosure reports no request/result detail, and Check details exposes only an argument hash rather than the recorded candidate revision. Preserve legitimate separate owners rather than flattening permissions or inventing writable source access. These items are queued, not all accepted defects or implementation claims. Prioritize UX-02/04/06 and existing Workspace/permission/Review surfaces; no redesign or new backend authority.

## Immediate bounded correction

Astra adopts Luna's source trace: candidate-read `content` contains only source text; Pi's installed `dist/api/openai-completions.js` creates tool messages from `toolMsg.content` and does not include `details`. Fix the runtime result contract, retain metadata, full-file hash semantics on ranged reads and all Host compare-and-swap checks. Sol owns the isolated correction under [order 11](../../11-coding-dogfood-handoff-20260920.md); Luna independently reviews, then Astra restarts the idle Host and performs a fresh unassisted trial. No accepted GUI/Core work is reopened beyond this demonstrated gap.

The separate 06a return `aca21c8` (six corrections, merged main `066be48`, historical `0f76407` retained) is received but queued for independent review after this dogfood blocker. Author-reported 22 seam tests and 1260 suite summary remain author evidence; no next frontend journey starts and both 06a trees/8899 preview remain intact. The earlier order-11 **prepared handoff** is independently accepted; real autonomous execution remains a separate open condition.
