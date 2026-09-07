# Typography and control refinement

2026-09-07 · follows the user's approval of the local A/B/C study and four screenshots identifying flat hierarchy and unbalanced buttons.

## Decision

Choose B's typographic hierarchy with A's subtraction. Reject C's colored relation word: it can look like a link without adding useful information. The generated study is a visual hypothesis, not pixel or interaction evidence. It is saved in `evidence/ui-maturity/typography/image-study.png`; actual browser screenshots are alongside it.

- Remove intervention side rules and the provenance side rule. Preserve recorded decisions and provenance text; no new symbolic language or state.
- File title is 22px with a compact metadata row. Version details remains disclosed on demand; a single neutral horizontal separator introduces the document.
- Main prose is 15px / 1.7; contextual records and roles remain 12px. Message grouping uses compact 12px gaps, with additional separation before user input and assistant prose.
- Remove full-width run separators and the repeated visible Run label. Completion remains beside a small chevron that opens the same run inspector; the accessible Run label is retained.
- UI glyphs are 18px, response copy glyphs 16px, and run disclosure glyphs 14px. Their hit regions retain the existing 32px desktop / 44px narrow controls. Send becomes a dark circular arrow control with its accessible name and tooltip preserved.
- Narrow composer settings remain on one row where they fit and can wrap as needed. File permission control no longer forces its own short row; its narrow hit height is 44px.
- Markdown no longer inherits `white-space: pre-wrap` from the raw message container. This eliminates source-formatting newlines that had contributed false visual gaps. Preformatted code keeps its own whitespace rules.

## Image study

Built-in Image Gen, preview-only comparison board; no generated pixels are shipped in the UI. Prompt specification: three A/B/C columns and desktop 380px / mobile 390px rows, identical content and scale; modern white file inspector; Workspace / Run / File tabs; out/result.md, Current file, 108 B, Copy, Version details, workspace-at-load provenance, matching recorded/current hashes, Verification result table. A removes decorative lines and stacks metadata; B uses a prominent filename, aligned compact metadata and one horizontal document separator; C adds restrained blue only to the relationship word. Prohibit novel symbols, fake approval states, antique styling, paper textures, colored rails and new panels. The resulting comparison is not a validated responsive rendering; actual implementation is checked separately.

## Verification

JavaScript syntax and diff whitespace checks pass. Existing 14 surface/receipt counterexamples pass. Browser checks cover real session content, run disclosure opening its result, current-file provenance, full-hash disclosure and closing back to the session. 390px and 1440px screenshots were visually reviewed; the narrow composer controls measure 44px high. Markdown code/table layout remains readable. No backend or provider request behavior changed; no paid provider call was made. Assistive technology and physical touch remain untested.
