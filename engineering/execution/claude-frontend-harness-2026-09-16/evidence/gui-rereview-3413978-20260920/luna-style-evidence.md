# GUI style/G4 delta rereview

**Candidate:** 34139788b16f60866e4c7abc947f428ccdc1c8f5, compared with fc6eccf4fa29a34edebd17f524cc9b59437f4a46. Read/test only. No browser capture, app server, provider, credentials, or full suite was run. The worktree had only the pre-existing untracked app/node_modules symlink.

## Checks

- node tools/lint-spacing.mjs: pass; 4 CSS files, 60 spacing registrations and 16 font registrations.
- Focused app/tests/spacing-governance.test.mjs and app/tests/home-scope.test.mjs: 12/12 pass.
- git diff --check fc6eccf..3413978: pass.
- Manifest/file parity is now 19 cells, 19 PNG references, 19 PNG files, with no missing or extra file. The empty cell records projectRows=0, sessionCandidates only, and no example badge.
- The three original negative cases now have meaningful tests: no-semicolon declarations (spacing-governance.test.mjs:71-75), undefined tokens (77-83), and property-scoped registrations (85-90).

## Findings

1. **Capture source provenance is still under-specified and internally stale.** The packet says capture HEAD was fc8dd6182bb990fba8d383508ccdd4e902ef0867 (evidence/gui-grammar-20260920/README.md:10-15), but the recapture commit 3413978 changes app/web/app.mjs and app/web/home-view.mjs as well as the evidence. The packet note says the recapture used the working tree carrying those fixes. capture.mjs writes only Chrome version and user agent to manifest.env (capture.mjs:21,35-36,512); it records no app/source commit, source hash, or capture-script hash. Thus the current PNGs cannot be reproduced or attributed to an exact source tree from the packet alone. Add an exact source tree hash (and preferably capture script hash) to the manifest, or make the README pin the actual bytes used. This is an evidence-integrity blocker, separate from the functional fixes.

2. **An off-scale fallback remains a lint bypass.** The new contract deliberately allows var(--space-7, 8px), and the test records that as valid (tools/lint-spacing.mjs:201-215; app/tests/spacing-governance.test.mjs:77-83). But var(--space-7, 7px) also exits 0 in a focused probe: the checker skips unknown names when a fallback exists, then isDerivedOrRelative accepts the whole var() expression. If G3 means that effective spacing must stay on the token scale, this is a remaining blocker: require a token/relative/registered fallback or add a narrowly documented exception. If raw fallbacks are intentionally allowed, the owner contract must say so explicitly; the current test only proves an on-scale fallback.

3. **Required G4 omissions remain open and are not waived by the recapture.** The packet still lists Waiting/approval, live event burst, and native 200% zoom as unexecuted (evidence/gui-grammar-20260920/README.md:108-121). The owner record still assigns unexecuted cells to the G4 reviewer (gui-grammar-convergence-20260919.md:295-298). The corrected labels and empty precondition improve evidence truth, but they do not supply those observations. This rereview does not supersede the authoritative main independent-review section or turn these cells into acceptance.

## Disposition

The original three lint bypasses are closed by implementation and focused tests. The 3413978 delta adds no stylesheet snap changes; prior snap-impact evidence remains as recorded. Manifest/file parity and empty-state precondition are corrected. Hold style/evidence scope acceptance until source provenance is pinned and the fallback policy is either enforced or explicitly ruled. Keep the native-zoom, approval, and burst gaps as open G4 evidence residuals. No broad GUI/product acceptance is recommended.
