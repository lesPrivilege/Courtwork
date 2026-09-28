# First UX simplification · 2026-09-28

Original Claude e7ffd04 / author record d79c1c7 implements Astra's [current-capture scope](scope.md), following the independently accepted candidate aggregate fix. This is a finite Models/Runtime slice of the user's broader direction: retain controls and text that serve each subpage's actual task.

## Current browser checks

1. **Models — passed.** [Before default-expanded host information](07-models-bottom-before.png) → [after one closed disclosure](08-models-bottom-after.png). Keyboard expansion still exposes adapter identity, explanation, three links and saved model/Host facts. Opening the disclosure, visiting Agents and returning preserves its open state. The separate “In force” heading is gone. Provider/model choices, key status and save/test controls remain intact. [Desktop1440×900](13-models-desktop-bottom-after.png) shows the same retained choices and compact disclosure; body width equals viewport.
2. **Runtime detail — passed.** [Before](04-runtime-before.png) → [after](10-runtime-after.png). Configuration, availability, live Not checked, default, declared operations and unsupported reasons remain. Constant Owner text moves into Technical detail; keyboard expansion reveals it alongside existing technical facts, and refresh retains that open disclosure. [390×844](11-runtime-narrow-after.png) preserves content without body overflow. Original-window captures are538×762; normal text scale. Temporary viewport overrides were reset.
3. **Developer — deferred.** [Current screenshot](05-developer-before.png) records the diagnostics page. No product changes here; scope/diagnostic facts are purposeful on this page. Wider controls, save-flow consolidation and density changes require their own concrete continuation, not silent deletion.

The saved screenshot files shown here were inspected. A transient clipped desktop Runtime screenshot was rejected and is not evidence. This is a targeted visual/keyboard check, not whole-product, screen-reader, forced-colour, dark-theme,200% zoom or full responsive-matrix acceptance. Error/last-good-reading/unknown variants are covered by tests, not newly injected browser failures.

## Verification and ownership

- Parent [37/37 tests](parent-tests.log), provider-registration + runtime-inventory-settings, exit0. These observe disclosure loading/default/open persistence and runtime state/unknown/retry behavior.
- Original Claude [155/155](author-targeted-tests.log) Settings/Models/runtime/profile checks, including existing headless browser fixture; the author records the preliminary zsh file-list invocation error separately. Its UI lints pass; parent docs and whitespace are checked before merge.
- Parent screenshot review uses the actual owned acceptance Host with the new frontend served from a clean fast-forwarded clone. Backend process/data are retained; no key entered, read or transferred, no new model call. Safe provider/model/credential-status/Run/candidate projections are byte-equivalent before and after the UI exercise.
- Astra reviews the fixed source and screenshot result; independent Luna source review is recorded in the original owner disposition. No CSS/token or authority changes, no claim that all UX simplification is complete.

The user's first-principles direction remains the rule for later slices: a true technical statement is not automatically necessary in the default view, and necessary action/state/error information must stay available. Original Claude retains the frontend lane.
