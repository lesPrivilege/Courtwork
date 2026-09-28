# Dogfooding-informed code review and push receipt

2026-09-28 · User authorizes review, correction, merge and push. Review base is fetched `origin/main@1296b8d`; reviewed integration head `512f794a5f3aa0d6b79f0e4cfd56ba98c9b435d3` was134 commits ahead/0 behind. Fix candidate is2487374 (Astra transport830e328 plus original Claude Attention4935712/2487374). This packet records concrete findings/verification, not a claim that every repository behavior or product release gate is accepted.

## Referenced discussion and method

The referenced ChatGPT conversation “Dogfooding 工程技能探索” (`6ab9f0ad-a204-83ec-8a27-483fafbe5be8`) was fully read:2 turns,4 messages, no continuation and no attachments. It proposes review, simplification and Clean Code research, not a delivered code branch. The user’s current instruction authorizes this code review and push; proposed A/B/C experiments in the reference are not silently executed.

Official DSH master was resolved to21638c56315ae6a2b552d6091945d3144c9af32e. [Source manifest](external-manifest.json) retains exact raw URLs/hashes for code-review, find-simplifications, CI reliability, prose-standard and trim-cot-leakage. Sources were downloaded as read-only reference into scratch, not installed into the user's `.agents` tree. Primary [review guidance](https://github.com/deepseek-ai/deepseek-harness/blob/21638c56315ae6a2b552d6091945d3144c9af32e/.agents/skills/dsh-code-review/SKILL.md) and [simplification guidance](https://github.com/deepseek-ai/deepseek-harness/blob/21638c56315ae6a2b552d6091945d3144c9af32e/.agents/skills/dsh-find-simplifications/SKILL.md) inform the review; CourtWork's actual owner/architecture/verification contracts remain governing.

Adopt real base/head verification, complete producer→consumer/effect tracing, cancellation/resource ownership, source-of-truth distinction, meaningful negative controls and evidence thresholds. Reject transplantation of DSH-specific pnpm/package/plugin/locale/invariant rules. No giant standing skill or generic Clean Code checklist is created. No material net reduction of maintained obligations was demonstrated in this finite range: binding-versus-intent, partial-versus-settled text, and configured-versus-live runtime facts have different consumers. Do not erase these distinctions to shorten code or add wrappers to appear cleaner. This is one real review, not a controlled five-changeset A/B/C evaluation; it establishes no guidance-effectiveness percentage, model ranking or token-cost gain.

## Findings and disposition

| Finding | Before evidence and impact | Disposition / fixed source |
| --- | --- | --- |
| HPT-C1 · pre-aborted stream read | An already-aborted AbortSignal still opens1 HTTP request and yields12 frames; the new regression fails on512f794 | Adopt/fix830e328: refuse before opening the transport request |
| HPT-F1 · network chunk confused with frame limit |12 individually valid small SSE frames in one HTTP response are refused as frame_too_large; a split CRLF at an exact line limit also exposes terminator accounting | Adopt/fix830e328: bound each complete/incomplete line independently of chunk packing; preserve data-frame/total-stream/UTF8 limits |
| AT-META-R1 · stale Attention title/list | Actual Host rename commits but the loaded controller and explicit Refresh keep old titles if no new run event; exact1296b8d controller comparison updates correctly | Adopt/fix4935712: metadata refresh is default; only the running-conversation poll opts into cursor-only follow |

[Transport before](transport-before.log), [CRLF negative control](transport-crlf-before.log), [Attention before](attention-before.json) preserve failures. All transport cases use ordinary synthetic Node HTTP, not a native Hermes process, agent, real provider or credential. Original Hermes server-execution refusal was never rerouted.

## Independent review and checks

- Luna reviewed assigned backend changes across RuntimeService/Store/assistant stream/Pi/check/Runtime inventory, tracing actual producer/consumer, terminal failure/recovery and authority. No further actionable blocker;29/29 bounded stream/Host tests passed. It did not run a full suite or inspect private data.
- Sol reviewed all changed frontend modules and Pages sources;80/80 focused checks passed, but the additional actual-Host rename probe exposed AT-META-R1. [Original review](ui-review.md.txt) retains that distinction.
- Astra authored the transport correction:30/30 after tests. Sol independently reviewed fixed830e328 and passed30/30 plus8 separate real-HTTP probes, including already-aborted0requests, coalesced frames, multiline exact bound, multibyte/frame refusal, split CRLF, in-flight abort and early generator return. Both client and peer sockets were0 after cleanup. [Independent tests](transport-independent-tests.log), [probe results](transport-independent-probes.json).
- Original Claude authored Attention4935712 after reproducing failure on old source. Sol independently passed18/18 and repeated its own actual-Host probe: selected/list titles refresh, an unsent draft survives, the event cursor stays10 and running follow remains incremental. [Independent delta report](independent-delta-review.md.txt), [tests](attention-independent-tests.log). The author packet's `.mjs` is a preserved command capture with recording-local paths/placeholders; portable ongoing reproduction is the committed Attention tests, not executing that historical capture unchanged.
- Parent ran the final combined candidate's full default suite once, plus local-fake smoke and Pages/documentation checks; final totals and publication receipt follow below. Earlier full1801 and browser evidence retain their prior source identities; they are not relabelled new coverage. No new geometry change warrants another browser matrix for this metadata-only correction.

Publication preflight checked the517 tracked changed paths at the reviewed head for common credential patterns and oversized blobs; neither check flagged a path. This bounded scan is not proof of absence of all sensitive material. User-owned untracked `.agents/`, `.obsidian/` and `skills-lock.json` are not staged. Push is to configured origin/main, without force/history rewrite. The Pages workflow builds on push but deploys only on workflow_dispatch; no manual deploy is requested.

No paid provider, native Hermes server, personal credentials, user Host restart, skill installation, unrelated cleanup or release-gate closure is part of this review. Final acceptance and push identity are recorded below after actual results.


## Final combined acceptance

Astra accepts fixes830e328 and4935712/2487374 after the separate Sol delta reviews, original negative controls and final combined checks. On candidate2487374 with Node25.9.0, `npm test` (repository default concurrency4 plus historical-fixture precheck) passes **1808/1808**,6 suites,0 failed/cancelled/skipped,304.706s: [raw full output](full-suite.log). `npm run smoke` exits0 with realProvider:not_run. Pages build and its links/material/figures checks pass; repository documentation links and diff whitespace pass. No duplicate full run was performed. The UI and backend review coverage, independent30+8/18/29 results and prior80 UI results retain their exact attribution above.

The passed code is the combined candidate's app bytes; subsequent receipt/current updates are documentation only. These fixes improve already-registered standalone transport and current Attention metadata consumption without enabling native Hermes, changing schema, broadening permissions or changing public install/media pins. Initial134 pending commits retain their older bounded acceptance; this review adds cross-layer checks and fixes rather than relabelling all historical evidence as a new end-to-end production test.

The user has authorized merge/push. Final origin verification is recorded after the operation; no force push or deployment is authorized by this acceptance.


## Actual merge and push

Main fast-forwarded from512f794 to4c42ffd33e11101cb7b29053d03fe52653a593aa with the accepted fixes/evidence. `git push origin main:main` exited0, advancing origin from1296b8d; independent `git ls-remote origin refs/heads/main` returned exactly4c42ffd33e11101cb7b29053d03fe52653a593aa and tracking comparison was0 ahead/0 behind. [Machine-readable receipt](publication.json). This receipt's own follow-up commit changes documentation only and is pushed under the same authorization. No remote CI success, manual Pages deployment or user-service restart is inferred. User-owned untracked metadata stays local.
