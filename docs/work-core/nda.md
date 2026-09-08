# Inbound NDA v1 adapter seam

The `inbound-nda` catalog entry consumes shared Work Core and the same Pi/host control plane as plain Chat and evidence-memo. The domain module imports no model, GUI, host or evaluation fixtures. The shared extension adapter owns lifecycle/tool wiring; it does not interpret NDA rules.

New binding input is `{title,sourceText,facts}` where `facts` is a JSON object (or JSON text for the existing binding form). Facts and `inbound-nda-playbook-v1` are persisted as the immutable work domain envelope. This v1 slice accepts synthetic plaintext only; fact correction requiring a different transaction starts a new work binding. Source revisions can be replaced through the existing action.

`se_read_source` retains the generic source query. `se_submit_candidate` takes exactly `{domain: review}`. Review schema 1 carries `contractVersion:'inbound-nda-v1'`, `playbookVersion`, `facts`, one finding per rule with `ruleId/status/evidence/reason`, and `reconciliation`. The adapter verifies the whole domain payload against the trusted source set/facts before deriving `artifact_text`, evidence and obligations. The model cannot supply a separate conflicting artifact or reviewer identity. Rule checks are synthetic experiment predicates, not legal standards.

Human `revise_candidate` uses `{candidate_id,new_candidate_id,base_version,proposal:{domain:review}}`. It saves a new version with lineage and human provenance, and never rewrites an earlier candidate/Decision. For a pending current candidate with unresolved findings, the packet advertises only `reject` and `request_evidence`; an attempted `accept` is rejected. A complete verified review may be accepted as a review Artifact. This is not execution of an NDA, external signing or sending.

Each Core Run stores the selected Contract/source/playbook, public provider descriptor and work Context with selected/omitted inputs. Context provenance references the host control-plane revision/hash/composition; it can be joined by run ID to the host's frozen runtime snapshot. Reusing a healthy host Session retains Pi history; a new Session receives current formal work state and pending obligations/candidates. Core does not infer efficacy from compressed history.

The renderer is not implemented in this backend delivery (`manifest.surface:null`). Fable owns the frontend and can render the same versioned packet for inline/detail. Producer absence and generation mismatch provide only read-only history, never legal actions. API/field/error details are in [the shared contract](contract.md). Synthetic runtime test: `app/tests/nda-runtime.test.mjs`; development and holdout fixtures/hashes remain in the separate domain fixture module.

Real provider evaluation, human Review usability and the new-Session GUI remain G1/G2/G3 work. A synthetic loopback route with a non-fake provider identity only verifies descriptor propagation; it is not real model evidence.
