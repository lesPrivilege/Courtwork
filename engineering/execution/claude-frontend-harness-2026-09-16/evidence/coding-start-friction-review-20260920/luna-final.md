# Final 06b friction delta review

Date: 2026-09-20. Non-author review of `ef2b3c1dd1124252fedb523088cd0182ce32e106` in `/Users/lesprivilege/Projects/.worktrees/courtwork-friction-integration-20260920`, comparing `55bee59`. The only range changes are `app/web/workspace-card.mjs` and `app/tests/coding-start-friction.test.mjs`. The pre-existing dirty `06b-dogfood-friction-20260920.md` was not touched. The pre-existing `app/node_modules` symlink was preserved.

## Verification

Command run from `app/`:

```text
node --test tests/coding-start-friction.test.mjs tests/workspace-card.test.mjs tests/workspace.test.mjs tests/candidate-ui.test.mjs tests/candidate-visible-hash.test.mjs
exit=0
tests 45
pass 45
fail 0
```

This includes the focused 13 tests (the prior 12 plus the new three-mode/disclosure continuity test) and adjacent workspace, candidate UI, and visible-hash tests. No full suite, provider, or browser was run. `git diff --check 55bee59..ef2b3c1` exited 0. Output: `/tmp/cw-friction-final-luna.log`.

Source hashes:

```text
7f5843d53abca5deedf294bb399c3382f49fdd984a787bc0833150769e839a53  app/web/workspace-card.mjs
b50deb48421020c162b9085baa7850358b7ed1e201923f989252c9c00a7b367d  app/tests/coding-start-friction.test.mjs
```

## Findings

**Three-state explanation: correct.** `control-plane.mjs:31-37` defines the Host ceilings: `ask` mode asks for both `repo_write` and `check_run`; `draft`/Allow edits allows `repo_write` but still sets `check_run` to `ask`; `read_only` denies writes and checks. `control-tools.mjs:72-98` enforces those effects before execution. The new copy accurately states: Ask before editing shows each exact write and check for approval; Allow edits permits writes without asking while checks still require approval; Read only blocks both.

**Disclosure and focus continuity: pass.** `rolesOpen` is held in the card closure, restored onto the new `<details>` during render, and updated by its `toggle` listener. The new seam test verifies expanded state survives a Host event render, explicit collapse remains collapsed on a later render, and focus outside the card is not stolen. The existing change-folder and keyboard seams also pass.

**Disposition: adopt.** No actionable blocker found in this delta. The remaining dirty delivery record belongs to the parent integration work and was left unchanged.
