# H0 closure reproduction and media handoff

This is a prepared guide, not a recorded/timed public demo. Use the installed/authorized model connection; do not copy credentials from another instance. Product: `2af932a` (NDA domain and Core are byte-equivalent to the tested `846c304`; EC-1 changes only the generic memo declaration).

1. Start CourtWork using README with an independent data directory. In the browser create a synthetic project and a Chat. The observed path uses a short no-tool first message to materialize the Chat before binding; do not edit that step out of a usability assessment.
2. Settings → Developer → Host Extensions: load Inbound NDA Playbook Review and choose Continue in Matter. Use a clearly synthetic title, `nda-fixture.json.sources[0].text` and its `facts` as JSON. Verify the source SHA-256 before proceeding.
3. Send the existing first-work prompt: “Review this synthetic NDA using the bound playbook and producer contract. Read the approved source with se_read_source. Submit one complete domain proposal through se_submit_candidate. Preserve missing, conflicting or unknown findings. Do not accept the candidate.”
4. After the Run completes, open Work review. Show the pending Candidate and four rule findings; compare evidence and reconciliation to the fixed gold. State plainly that successful execution has not yet accepted anything.
5. Enter a review reason and choose Accept this version only after the fixed synthetic facts match. Show the separately recorded Decision and Accepted version. This is a software-test Artifact decision, never execution/signature of an NDA.
6. Create another Chat in the same project. In the same extension entry select the existing Matter, then ask `se_read_artifact` to read its accepted Artifact. Show identity and source continuity; do not regenerate the packet and call that recovery.
7. Retain the Session/Run/Matter/Candidate/Artifact IDs, exact source digest and any failures or interventions. A demo cut must not turn waiting, rejection or a failed model call into silent success.

For a future G4 media batch, capture these actual UI steps at a known viewport and record timing. `nda-accepted.png` is an actual browser screenshot, not a mockup; `nda-gold-comparison.json` and `core-receipts.json` are the corresponding checks. Do not claim this document itself is a 2–4 minute recording.

For G5, permitted facts are limited to configured real-model execution, scoped synthetic source/evidence validation, operator-mediated formal decisions, immutable accepted text and observed continuation/restart. Keep development-extension status and unverified installation/accessibility/professional-quality boundaries explicit. Existing README/Pages/media ownership is preserved; this packet does not dispatch or publish on their behalf.
