# Coding dogfood preparation review

Date: 2026-09-20. Review scope: `app/scripts/prepare-coding-dogfood.mjs` and its preparation/startup guard tests only. Reviewtree: `/Users/lesprivilege/Projects/.worktrees/courtwork-coding-dogfood-review-20260920`, detached candidate `94d60d228c525ff1bc80de0d4e97deacd7afff8a` (the requested source baseline was `3f04f76`). No source or test files were changed. The review used only synthetic temporary paths and inert Node probes; no personal keys/configuration, real model, provider, or printed startup command was used.

## Verification

`node --test app/tests/coding-dogfood-preparation.test.mjs app/tests/startup.test.mjs` passed 8/8. Existing tests cover clean creation, manifest omission of credentials/fix, non-empty/refusal behavior, ordinary in-repository roots, `--reuse` on a genuine manifest, crash-hook inertness, and Python lock startup failure (`app/tests/coding-dogfood-preparation.test.mjs:24-123`, `app/tests/startup.test.mjs:8-72`). They do not cover the three path/printing guards below or manifest tampering.

## Minimal blockers

1. **Lexical boundary accepts an in-repository `..name` directory.**

   `resolveRoot` uses `path.relative` and treats any relative value beginning with `..` as outside (`app/scripts/prepare-coding-dogfood.mjs:44-52`). A synthetic calculation with the candidate `<repo>/..name` returned `relative === "..name"` and `acceptedByCurrentGuard: true`; `..name` is a normal child name, not the parent traversal component `..`. The existing ordinary child test (`app/tests/coding-dogfood-preparation.test.mjs:97-100`) does not catch this.

   Minimal guard requirement: classify only `..` or `..${path.sep}` prefixes as outside; a component beginning with `..` must remain an in-repository path and be rejected. Keep the check before any `mkdir`.

2. **Symlink ancestor bypasses the repository guard.**

   `resolveRoot` canonicalizes with `path.resolve` only (`app/scripts/prepare-coding-dogfood.mjs:45-48`). A synthetic symlink outside the reviewtree pointed to a unique scratch directory inside it. Passing `/tmp/.../alias/instance` was lexically outside, so `createPreparation` accepted it; the actual resolved destination was inside the reviewtree scratch directory and received `source/`, `runtime-data/`, and the manifest. The probe removed both the symlink and scratch afterward.

   This violates the script's promise that the destination must be outside the product repository (`app/scripts/prepare-coding-dogfood.mjs:29-41`). Minimal guard requirement: resolve the nearest existing ancestor (and the final existing path when present) before the boundary check, reject a canonical destination under the product root, and recheck around creation if the destination can be raced. Do not rely on lexical `path.resolve` for this boundary.

3. **Printed startup instructions are not shell-safe.**

   `instructions()` applies `JSON.stringify` only when a token contains whitespace, double quotes, or single quotes, then joins tokens into a shell-looking command (`app/scripts/prepare-coding-dogfood.mjs:147-161`). An inert Node evaluation of the exact expression rendered `/tmp/cw-safe/$(X)` and `/tmp/cw-safe/`X`` unchanged, so both remained unquoted. A path with spaces became JSON double-quoted (`"/tmp/cw safe/$(X)"`), which still leaves `$()` active in a POSIX shell. No shell or printed command was executed.

   Minimal guard requirement: print a structured executable plus argv (or use a proven shell-quoting routine appropriate to the documented shell). `JSON.stringify` is JSON encoding, not shell escaping. Add a regression test for `$()`, backticks, quotes, spaces, and newlines; do not test by executing the resulting command.

4. **`--reuse` trusts mutable manifest paths and startup fields.**

   `inspectPreparation` validates only that a manifest exists and has schema version 1, then uses `manifest.sourcePath` for `gitFact` and `manifest.dataDir` for `readdir` (`app/scripts/prepare-coding-dogfood.mjs:60-95`). The CLI later prints `manifest.host.startup.command` and `args` through `instructions` (`:177-201`). It does not verify `manifest.root` equals the requested root, that source/data paths are descendants of that root, that `host.appDir`/entry match this checkout, or that startup argv is the expected Node/server command.

   A synthetic two-instance probe altered the first manifest to point at the second instance and set startup to `/synthetic/marker$(X)` with a synthetic argument. `inspectPreparation(firstRoot)` accepted it, returned the alternate source/data paths, and returned the altered startup fields; no startup command was run. This is a trust-boundary blocker for a “reprint an instance this script created” claim. Minimal guard requirement: validate the manifest's canonical root, source/data descendants, current app entry, executable/argv shape, scenario and repository identity before reading paths or printing instructions. A tampered manifest should fail closed.

## Owner/acceptance boundary

These are operator-preparation guards, not Runtime or provider behavior. The preparation script may create synthetic Git/source and empty Host data, but it must not claim that a manifest is trustworthy merely because its JSON schema parses. No recommendation here advances product implementation, provider support, real-model dogfood, or acceptance. No full suite was run.
