# K3 author delivery — frozen ordinary-Chat Kit context

2026-09-22. Base `678d71c58acc6968569a8850d39be404b19d4dfd`; isolated branch `codex/kit-run-binding-20260922`. Parent Arch retains architecture acceptance/main integration. This packet proves the bounded backend path and separately attributes non-author checks; it does not accept E1 UI or real-model capability.

## Source and ownership

- `a1d0998`: concrete K3-A contract before product edits.
- `eb32011`: Sol-authored Store/schema21/typed binding validation and migration tests.
- `76d91d6`: Astra-authored Runtime Control profile v2, Host retention/consumption/readback, explicit Pi revision, E1 admission expectation and actual HTTP/Pi tests.
- `d29697c`: merges parent documentation `294ebb5`; the one K3 append conflict preserves both contract sections. Other writers' dirty tests were retained.
- `ef60383`: public API/DTO/schema references and old-reader pin to pushed `678d71c`.
- `be5a2ed`: Sol-authored schema fixture maintenance in 19 existing tests; frozen historical source/fixtures are unchanged.
- `b99900771db008da505b2450bf382bf378dd3be3`: optional author capture of the actual synthetic provider request. This is the full-suite source.

The [original K3 order](../../kit-run-binding-20260922.md) contains exact keys, limits, authority/migration rules, early review dispositions and the E1 endpoint contract. Runtime Control remains the profile/source/configuration-CAS owner. Run/Store owns the immutable summary and equal bound projection; ArtifactHistory owns exact bytes. K1 stays unchanged, including module SHA-256 `c37e811ea5cd7081c6f92527f1d6985f586a95db2d5dd86ac480138757696a07`. Pi packages and lockfiles are unchanged. Core4/bridge5 do not migrate.

## Actual consumer evidence

The authenticated test imports instruction/reference/Skill/profile-v2 sources, selects the profile at an explicit Session scope, starts an ordinary Chat Run through the production Host and unchanged in-process Pi SDK, and observes the Host-owned deterministic HTTP provider. It later explicitly uses `runtime_load` and inspects its retained receipt. The first request makes one provider call; the load Run makes two more. No real provider, personal key or native configuration participates.

[Received request body](actual-provider-request.json), [exact context bytes](context.txt), [source inputs](source-inputs.json), [recorded Run context](recorded-context.json), and [separate artifact hash/count calculation](request-verification.json) make the first request reviewable. The request file is the parsed received HTTP body, not a raw transport-byte capture; authorization headers are omitted. Its Runtime Control contribution occurs exactly once: 242 UTF-8 bytes / 240 UTF-16 units, SHA-256 `b0b64043f010e5a89e57542659eb445f81cd6160fecd20038ccce6e06ad66158`. Both deferred body sentinels are absent until loading. The complete plan is 5157 bytes in this sample; its identity/ref are in the receipt. Session-dependent binding/plan hashes legitimately vary across test runs.

Compatibility remains `unchecked`, with explicit `reference-only-pi-unchecked-v1` policy. No profile or Kit creates supported evidence or a tool grant. The denied-write test executes the real governed tool path, keeps the denied requirement reading and writes no file. Binding payloads never enter `run.artifacts` as Work results.

## Failure, change and recovery matrix

| Case | Observed boundary |
| --- | --- |
| Required source outside profile allowlist; stale descriptor/body; malformed descriptor | Refusal before Run creation and zero provider calls |
| Unbound unavailable Extension tool required by profile | `profile_incompatible`; zero Run/call; bound available Extension tool and v1 catalog remain intact in owner projection |
| Missing Adapter revision; unsupported selection scope | Explicit runtime/scope refusal, no fallback |
| Matching unsupported or conflicting owner evidence | Compiler refusal before inference; absent evidence stays unchecked |
| Exact100000-character contribution vs one over | Exact limit reaches provider unchanged; one over refuses with zero calls |
| Configuration edit queued while payload retention is held | Admission freezes the earlier revision; subsequent active-Run edit is409 |
| Active Run edits and concurrent same-command requests | Edit refused, one Run/one request; cancellation retains summary |
| Lost admission reply / same command after newer invalid config | Original Run returned without recompilation, retention writes or another request |
| E1 stale `{revision,profileId,sourceHash}` Send expectation | New command409 `runtime_selection_conflict`; no new Run/call. Original command still returns old Run |
| Payload persistence failure | No authoritative Run or provider call; already saved unreferenced bytes are allowed |
| Retained read failure / wrong returned bytes | Admitted Run becomes failed with exact history/`kit_payload_invalid` code; zero provider calls and no current-context fallback |
| Actual Git history reference corruption | Recorded read refuses; replay returns the receipt without inference |
| SIGKILL while waiting for user, then reopen | Original Kit facts/context retained, unresolved Run becomes unknown, zero automatic/replay calls |
| v1 and empty-Kit v2 | Existing compiler text is unchanged, Run summary is null |
| Multiple/repeated Kit declarations | K1's sorted unique pins preserved; actual request still succeeds |
|20→21 upgrade / old20 reader | Exact backup, original event values preserved, legacy Run gains null; pinned old20 refuses21 without writing and can open its separate backup |

## Verification attribution

Luna's bounded non-author checks target fixed product `d29697c` (`76d91d6` and `eb32011`). [Command manifest](luna-command-manifest.txt), [23 Host tests](luna-kit-run-binding.log), [4 Store tests](luna-kit-binding-store.log), [51 accepted planner regressions](luna-kit-context.log), and [4 independent adversarial probes](luna-adversarial.log) all pass, exit0. [Probe source](luna-adversarial.mjs.txt) and [product hashes](luna-product-sha256.txt) are preserved verbatim. The raw probe's absolute imports identify its executed checkout; reproduction elsewhere substitutes that checkout prefix. Its cross-record/scope/retention probes are helper-boundary checks, separate from the actual HTTP/Pi tests. The seven product hashes were rechecked against `b999007` with all matches. Concurrent later commits changed evidence/tests/docs, not those product bytes.

Sol's existing schema-fixture subset is author evidence: 147/147 across 19 suites. Astra's [single full regression](author-full-tests.log) passes **1565/1565**, zero failed/skipped, [exit0](author-full-tests.exit), source `b999007`. The [deterministic smoke](author-smoke.log) also passes, [exit0](author-smoke.exit), covering public-service material read/write, retained artifact/history, restart and continuation. The non-author counts above do not imply an independent full application run. [Document links](doc-links.json) pass. Source and documentation pass whitespace checks. The exact `context.txt` fixture deliberately retains its CRLF core line, which Git flags as trailing whitespace; normalizing it would destroy the tested bytes/hash. Historical parent-imported logs also retain their original whitespace/provenance.

## Availability and handoff limits

The backend is available through the existing authenticated Runtime Control import/select/read APIs and normal Run creation. E1 may use the optional selection expectation; it must retain draft/caret/materials locally on refusal. A page-local draft is not Host-persisted selection intent or reload recovery: that G1 remainder is not implemented here. Claude owns live UI wiring, Settings return and its visual/accessibility checks; parent owns the combined user journey and final acceptance. No Kit chooser UI, remote/native Runtime switch, arbitrary hooks, new catalog/registry, deployment or automatic recovery permission is claimed.

All checks use independent synthetic directories and ports. The existing installed locked dependencies were used through a temporary link; no package installation/upgrade or paid provider occurred. User8787/8899, user data, credentials, native configuration, other worktrees, web files and local-worker implementation remain untouched. Do not open upgraded data with an old Host; restore exact backups only into separate directories under their matching old version.

The finite K3 writer is released after this packet commit. No next runtime/UI slice, push, deployment or cleanup of another worktree is started. Source/test identities are in [source hashes](source-files.sha256), packet identities in [SHA256SUMS](SHA256SUMS); parent receives the exact final packet commit separately. Claude/parent may consume the fixed E1 contract while backend acceptance proceeds.
