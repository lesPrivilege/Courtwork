# M1 Runtime Settings rhythm — Luna independent review

Review commit: b8cd54f4d2e3d142ed367d49e08297170394495d
Branch: codex/m1-runtime-rhythm-20260922
Review date: 2026-09-22
Base commit: aa765ede3d008c80cc9e4e6dcd50704cfa95db61

## Scope and hashes

The committed product diff is limited to:

- app/web/runtime-management-view.mjs: 19 additions and 4 deletions (23 changed lines), view SHA-256 a9a86c855b086e8c1f3b7ae417e9b65c1990f21ff4fcd44b9ce9f968755e7c61.
- app/tests/runtime-management.test.mjs: 14 added lines.

The baseline view SHA-256 is 99f942109cd669614b0ce7ea129a1b1544ec7db6695e95e28d614744c5f5367a. The baseline test SHA-256 is cf52724ba7386fd087a786c8df354ca14783494ba23cdf9d50304cdba7bf38b5; the candidate test SHA-256 is 69d2bfa919d1d804c2208481f3659626cd330ce3dda83886b48cbffea773ac0d.

The author worktree is clean for product paths at review time. The only remaining untracked paths are migration evidence directories, including this Luna directory and the existing Astra/Sol evidence. No styles.css, markdown-reader.css, settings-view.mjs, app.mjs, Preview/profile module, controller, adapter or shared Design file changed in the M1 commit.

## Structural review

The source change collects the existing detail nodes into detailNodes and places them beneath one plain div with data-testid runtime-detail-rhythm and the inline inherited property:

    --settings-group-gap: var(--space-4)

The wrapper has no class, role, tabindex, border, padding, visible text or new landmark. It is created only after the detail path has a page.detail. The list path returns its existing list nodes before this code, so the list has no wrapper or local override. Back removes the wrapper when the controller returns to list view.

The existing inner settings-block nodes remain direct children of the wrapper. The reviewed CSS family has no settings-section > settings-block rule that would be broken by the extra ancestor. The relevant existing selectors continue to apply:

- settings-block:last-child still matches the final technical block within the wrapper.
- settings-block > .section-heading and settings-block > .settings-row:last-child still match their existing inner descendants.
- Settings section focus and multi-section heading selectors operate on settings-section elements, which remain in their original DOM position.
- Search/filter selectors query descendants of settings-section and continue to reach runtime rows.

Focus restoration remains descendant-based through data-focus-key. The wrapper is not focusable, so Back, command status, reload, draft/caret, disclosure and action focus continue to resolve to their original keyed controls. The added test checks list → detail → list wrapper isolation; the existing focus tests exercise the keyed controls through the same production view/controller.

The only structural limitation left for the parent rendered pass is computed geometry: this static review cannot prove the 40px-to-16px inherited value, boundary-to-heading gap, first field position or total scroll extent.

## Independent checks

Commands run after the author commit:

    node --test app/tests/runtime-management.test.mjs
    node --test app/tests/settings-navigation.test.mjs
    node tools/lint-spacing.mjs
    node tools/lint-interaction.mjs
    git diff --check b8cd54f4d2e3d142ed367d49e08297170394495d^ b8cd54f4d2e3d142ed367d49e08297170394495d

Results:

- Runtime Management: 35/35 passed, including the new local-scope test, list loading/error isolation, Back focus, draft retention, unknown outcomes, stale read-back, unrelated runtime identity, refusal focus and disconnect focus.
- Settings navigation: 7/7 passed, including the existing settings-group-gap: 40px source contract and unrelated Settings navigation geometry.
- lint-spacing: passed; 4 files checked, registered spacing/font exceptions unchanged.
- lint-interaction: passed; 64 files checked, 0 interaction exceptions.
- git diff --check: passed.

No full suite, browser/CDP run or product process was started by Luna. Parent Astra owns the rendered 1280/1440/390 matrix and has reported the initial 60px-to-36px gap and unchanged 28px controls/scroll behavior. This review does not independently claim visual acceptance, 200% text/reflow/text-spacing conformance, native zoom, forced-colors, or coarse/hybrid input coverage.

Parent-owned rendered evidence is present under the same migration packet: Astra’s matched baseline/candidate captures and DOM measurements are in astra/01-base-1280-normal.json through astra/11-large-narrow-keyboard.jpg; the list-isolation check is astra/list-isolation.json. The 1280 baseline/candidate records show scroll height 1353 → 1233 with the same 642.5px visible panel height and 28px controls. These records remain parent/Astra evidence; Luna did not operate the browser or promote them independently.

## Disposition

Independent source/test review: structurally clear within the M1 lease. Keep the candidate pending parent’s rendered evidence and final choice between the existing 16px hypothesis and an explicitly measured 24px fallback. No additional product changes are requested by this review.
