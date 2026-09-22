# M1 · Runtime detail rhythm · Sol author record

Task / scope: M1 runtime-detail-only vertical rhythm. Change only the detail composition in `app/web/runtime-management-view.mjs`; add one focused scoping regression if necessary. No list, sibling Settings, controller, adapter, CSS, app shell, or semantic change.
Base SHA / branch / isolated checkout: `aa765ede3d008c80cc9e4e6dcd50704cfa95db61` / `codex/m1-runtime-rhythm-20260922` / this task's repository root.
Writer / reviewer: Sol implementation author; Luna bounded non-author source/test check; Fresh Astra visual and keyboard coordinator; parent Arch final acceptance and integration authority.

Owner fact + contract: Runtime controller/owner facts remain in `app/web/runtime-management.mjs` and the runtime owner adapter. This view only maps their detail projection. The finite lease is `engineering/design/grammar-convergence-20260921/disposition-20260922.md` § Finite write lease M1.
Semantic / projection / control / placement: No semantic, projection, control, string, or placement change. Add one plain detail container whose only authored property is inherited `--settings-group-gap: var(--space-4)`.
Surface role: Settings detail mixes compact workbench controls with action/decision state. The change affects only vertical grouping between existing detail blocks.
Pattern + canonical grammar owner / base-to-semantic token mapping: Existing `.settings-block` consumes `--settings-group-gap`; M1 maps that existing consumer locally from root `40px` to existing `var(--space-4)` (`16px`). No new token or global default.
Pointer mode / CSS viewport / actual zoom + DPR / text scale: parent matrix: 1280 normal light, 1440 large dark, 390 normal light, 390 large dark. Pointer/zoom/DPR and rendered measurements belong to parent browser evidence.
Measured visible control + hit target + glyph / type-leading / stacked chrome + content start: Parent's four paired scenes measured `60px → 36px` boundary-to-heading gap, first input and Reconnect `48px` earlier, and total detail scroll extent `120px` shorter in every pair. Controls remained `28px` desktop / `44px` narrow; large text retained the existing `1.143` scale. This source change does not alter glyph/type/control geometry.
Density exception / long-text-reflow / preserved focus-scroll owner: local Runtime detail exception only. `createRuntimeManagementView` continues to own focus restoration, caret retention, disclosure state, and scroll movement.
Affected UX rule IDs / persistent text purpose / disclosure level: UX-01/02/07/09. All persistent text and disclosure levels stay byte-identical.
Action result / feedback / recovery / draft and scope identity: unchanged; unknown/check-status/read-back/refusal/reload/draft identities remain controller-owned.
Nearest precedent: `app/web/runtime-management-view.mjs:createRuntimeManagementView` and its accepted `settings-block` composition, verified by `app/tests/runtime-management.test.mjs`, at base SHA above. Agent Profiles remains an adjacent Settings precedent, not a changed consumer.
Evidence type: accepted baseline plus scoped candidate.
Governance status: candidate until parent independent acceptance.
Kept relationships: block order, separators, inner padding, headings, controls, receipt placement, list rows, Settings siblings, focus/caret/scroll behavior.
Intentional changes: Runtime detail block-to-block margin inherits `16px` instead of the root `40px`.

New terms / roles / tokens / primitives / dependencies: none.
Reuse / variant / grammar gap decision: scoped variant using an existing base token; no grammar gap.
Skin / review / deterministic semantic color impact: none.
Exceptions: UX-07 local density mapping; Runtime detail only; owner parent Astra; remove or revise if measured hierarchy becomes too tight.

Fixture and setup command (synthetic; no personal data): existing `app/scripts/runtime-management-preview.mjs`, served from pinned baseline and candidate archives on free loopback ports. Harness-only text-size query/control may be added only under this evidence directory or `/tmp`.
Affected scene + nearest adjacent scene + full composition: Pi Runtime detail; adjacent Runtime list and a sibling Settings consumer remain at root mapping.
Viewport / scheme / keyboard / failure / zoom / fallback coverage: Parent browser matrix: 1280 normal/light, 1440 large/dark, 390 normal/light, 390 large/dark. Unknown plus newer draft survived reconcile to revision 4; stale revision 3 versus receipt 4 stayed locked until Read again returned revision 4; Hermes refusal returned focus to Connect and retained draft; revision conflict 4 → Reload 5 focused the notice; unsupported reasons and empty list remained explicit. Parent also executed a 320 CSS px normal-text reflow probe as bounded field/action reachability; it is not a full WCAG reflow claim. Native zoom, real 200% text resize, text-spacing, forced colors and coarse/hybrid input remain unexecuted.
Checks: `cd app && node --test tests/runtime-management.test.mjs` 35/35; `node tools/lint-spacing.mjs` pass; targeted interaction lint pass; diff check pass. Exact record: `checks.md`.
Visual change: Parent's 1280×900 normal/light pair measured boundary-to-next-heading `60px → 36px`, total Runtime detail scroll height `1353px → 1233px`, and first input `48px` earlier. Across the full four-pair matrix, the same gap and `-120px` scroll delta held and the first input/Reconnect moved up `48px`. Child Astra recommends the 16px candidate; final parent Arch acceptance remains pending.
Author checks: Source/test bytes frozen in candidate commit `b8cd54f4d2e3d142ed367d49e08297170394495d`, binary diff SHA-256 `d4ab4a38e4b236fff963a0e2229379e384ad80e9d3e024ed4b31038983dcb26e`; process/reproduction and limitations recorded in this directory. Product write lease released after this commit.
Independent review: Luna review and final parent Arch acceptance remain outside author evidence.
Remaining work / accepted-baseline decision: Child Astra recommends the measured 16px mapping. Parent Arch retains final acceptance and integration authority.
