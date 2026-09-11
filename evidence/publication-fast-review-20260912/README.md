# Public surfaces · post-merge fast review

2026-09-12. User asked for Luna fast review of all public publishing surfaces and push readiness, explicitly moving real API verification to the next round. Candidate: `d62f6bb873db2b1d8753beed89ed166956bcb715`. Review uses an isolated checkout; the shared main checkout's existing uncommitted research is excluded.

## Scope

CourtWork README/generated copy, all eleven top-level Pages documents, offline specimen, product installation/CLI/data/model/release entries, figures, final product media, brand/license entries and Pages workflow. Linked Paper remains a separate publication and is not silently redeployed by this task. Historical source snapshots remain fixed; current product media is not relabelled as the old specimen.

The user-approved complete fictional commercial product framing remains in force. This review checks actual text/source consistency, working links, source integrity and rendered behavior; it does not reopen that editorial choice or pretend fictional positioning is evidence of runtime functionality.

## Author verification

| Check | Result |
|---|---|
| Current media publication gate | PASS; complete accepted batch, source `0768822` |
| Repeat build | 161/161 files byte-identical; [hash inventory](build-repro.json) |
| Local public links | 296 references, PASS |
| Material inheritance / figure registry | PASS; 21 registered figures |
| Public projection and capture policy tests | 5/5 PASS |
| Main/figures/preferences browser suite | 69/69 PASS; [results](browser-home.json), [raw log](browser-home.log) |
| Product pages browser suite | 36/36 PASS; [results](browser-product.json), [raw log](browser-product.log) |
| Documentation links after site README cleanup | 1038 documents / 5149 links, PASS |

Astra visually inspected fresh rendered Tour/Get/CLI/Changelog/Models/Data screens and the full home overview. The full-page screenshot is not proof that the lazy iframe was loaded at capture time; the browser suite separately scrolls to and verifies the specimen's seven steps. Browser preference/viewport emulations retain their tested scope and do not claim AppKit, physical zoom or assistive-technology acceptance.

Luna then identified internal implementation/test-status asides in the two Features architecture figures. Astra cleaned their visible/accessible text and the caption, updated registered source hashes, and retained planned/current/candidate distinctions required by the architecture contract. Geometry, App/Runtime/Core and media bytes remain unchanged. `site/README.md` also received current-state and repository-relative provenance clarification. Initial verification is retained under `before-copy-cleanup/`; final results above cover the cleaned public copy. Real API, paid providers, credentials and personal runtime data were not accessed.

## Push versus deployment

Observed remote `main` was `ec240e7a3ff06ba25d4d9e8d1bc82ad45786d0ab`, an ancestor of the candidate (41 commits behind at review time). The Pages workflow builds relevant main pushes; its deploy job requires `workflow_dispatch`. A source push is therefore distinct from manual Pages publication and from runtime acceptance.

The user subsequently explicitly instructed publication, cancelling the optional Spark data injection. Push/deployment outcome will be recorded separately after the final clean-copy checks. Existing 8804 validation service stays available for the user's next-round API verification.

Independent scopes and Paper alignment: [Luna review](luna-review.md). User-authorized RD-007 `cf9ce49` is merged with eight original-source hashes verified; it changes research only. The [next-node Harness index](../../engineering/release/harness-next-node-2026-09-12/README.md) is prepared for the user’s independent review/order decision and does not authorize runtime implementation.
