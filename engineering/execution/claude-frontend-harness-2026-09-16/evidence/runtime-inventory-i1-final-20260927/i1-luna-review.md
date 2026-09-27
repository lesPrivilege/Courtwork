# I1 Luna independent review

Date: 2026-09-27

Reviewed tree: /Users/lesprivilege/Projects/.worktrees/courtwork-runtime-inventory-i1-20260926

Reviewed commit: 2a4326930009eb526b2a248b163abc9e6e5c5733

Contract base: 5c22c02

## Review scope

The delivery is limited to the additive Host projection in app/server/service.mjs, its API documentation, four focused tests, and the original I1 handoff subsection. No Store/schema, runtime constructor, provider, credential, UI, browser, or main checkout change is present. The tree had only the pre-existing untracked app/node_modules dependency link.

## Source findings

The service keeps existing runtime-info fields and adds executionRuntimes at service.mjs:1031-1057. The new helper at service.mjs:1060-1099:

- enumerates configured runtimePorts plus the existing Pi/managed candidate IDs exactly once;
- puts the Host default first and sorts remaining IDs;
- reports unconfigured rows with null revision/ref/capabilities and not_configured;
- calls only the existing synchronous port.describe() for configured rows;
- rejects identity/revision drift as descriptor_changed;
- validates cloned live capabilities with the existing validateExecutorDescriptor;
- isolates throws/invalid descriptors as descriptor_unavailable;
- applies the existing managed/non-fake provider route fence as provider_unsupported;
- keeps every row liveStatus not_checked.

The existing validator at app/server/executor-choice-state.mjs:34-49 constrains descriptor identity, sha256 configurationRef, and the closed ExecutorCapabilities operation set. This makes configurationRef a bounded non-secret fingerprint and prevents raw descriptor data from bypassing the existing shape gate.

The service does not create Sessions/Runs, open native sessions, query credentials, call a provider, or mutate the Store from this read. The four author tests cover the contract's sentinel, row-local failure, detached capability copy, and default-versus-selected Session semantics at runtime-inventory.test.mjs:14-129. No additional probe was needed.

## Verification

Command:

node --test --test-concurrency=1 app/tests/runtime-inventory.test.mjs app/tests/runtime-selection-http.test.mjs app/tests/runtime-selection-store.test.mjs app/tests/runtime-foundation.test.mjs

Result: 25 passed, 0 failed, 0 cancelled, 0 skipped; exit code 0; duration 10.801s. Raw stdout is in i1-luna-tests.stdout.txt.

The run includes the four I1 inventory tests, the R1 HTTP choice/lineage suite, Store choice/reopen/fence tests, and Runtime foundation checks. In particular:

- unauthenticated runtime-info is denied; repeated authenticated reads leave state files, directories, Sessions, Runs, and fake-provider requests unchanged;
- managed loopback descriptors are read without live posts, and provider incompatibility is row-local;
- descriptor throw, invalid capabilities, identity drift, revision drift, and sentinel strings are bounded;
- default runtime-info stays Pi while a selected Session reports managed capabilities, with executionRuntimes detached and equal;
- caller mutation of returned capabilities does not mutate configured descriptors.

## Disposition

Adopt for parent integration. No blocking source or verification finding was found in this bounded scope. The Sol delivery matches the fixed I1 contract and preserves existing runtime-info/session semantics.

No provider call, browser action, main product edit, push, deployment, commit, or cleanup of the original Sol tree was performed.
