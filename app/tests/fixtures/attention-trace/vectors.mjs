// Synthetic trace vectors for a future contract owner.  This is intentionally
// a fixture vocabulary, not a production DTO, persistence format, or report.
const ref = (id, text) => ({ id, sha256: `synthetic:${id}`, text });

export const TRACE_VECTORS = Object.freeze([
  {
    id: "edit-draft-edit-effect",
    references: [ref("proposal-v1", "Reply: initial wording"), ref("proposal-v2", "Reply: edited wording"), ref("native-draft-v1", "Draft: edited wording"), ref("native-draft-v2", "Draft: person changed again")],
    events: [
      { phase: "P0", kind: "observation", observationId: "obs-1", presentedAt: "2026-09-09T00:00:00Z" },
      { phase: "P2", kind: "proposal", revision: 1, payloadRef: "proposal-v1" },
      { phase: "P3", kind: "edit", fromRef: "proposal-v1", toRef: "proposal-v2", delta: { remove: "initial", insert: "edited" } },
      { phase: "P4", kind: "native_draft", payloadRef: "native-draft-v1" },
      { phase: "P3", kind: "edit", fromRef: "native-draft-v1", toRef: "native-draft-v2", delta: { remove: "edited wording", insert: "person changed again" } },
      { phase: "P4", kind: "effect", status: "verified", payloadRef: "native-draft-v2", verifiedAt: "2026-09-09T00:02:00Z" },
    ],
    expected: { reconstructableEdits: 2, finalEffect: "verified" },
  },
  {
    id: "stale-and-duplicate-decisions",
    references: [ref("proposal-v1", "old target"), ref("proposal-v2", "new target")],
    events: [
      { phase: "P2", kind: "proposal", revision: 1, payloadRef: "proposal-v1" },
      { phase: "P3", kind: "approve", revision: 1, decisionId: "d-1", decidedAt: "2026-09-09T01:00:00Z" },
      { phase: "P2", kind: "proposal", revision: 2, payloadRef: "proposal-v2" },
      { phase: "P4", kind: "attempt", revision: 1, status: "stale_rejected" },
      { phase: "P3", kind: "approve", revision: 2, decisionId: "d-2", decidedAt: "2026-09-09T01:01:00Z" },
      { phase: "P3", kind: "approve", revision: 2, decisionId: "d-2", duplicate: true, decidedAt: "2026-09-09T01:01:00Z" },
    ],
    expected: { staleApprovalRejected: true, duplicateDecisionSurfaced: true },
  },
  {
    id: "unknown-and-missing-times",
    references: [],
    events: [
      { phase: "P0", kind: "observation", observationId: "obs-2", presentedAt: null },
      { phase: "P1", kind: "surface", observationId: "obs-2", surfacedAt: "unavailable" },
      { phase: "P4", kind: "effect", status: "unknown", verifiedAt: "unavailable" },
    ],
    expected: { unavailableTimesRemainUnavailable: true, effectUnknown: true },
  },
  {
    id: "duplicate-surfacing-and-unsurfaced-sample",
    references: [],
    events: [
      { phase: "P0", kind: "observation", observationId: "obs-3" },
      { phase: "P1", kind: "surface", observationId: "obs-3", surfaceId: "s-1" },
      { phase: "P1", kind: "surface", observationId: "obs-3", surfaceId: "s-2", duplicate: true },
      { phase: "P1", kind: "unsurfaced_sample", observationId: "obs-4", sampleId: "u-1", label: "needs_independent_review" },
      { phase: "P1", kind: "unsurfaced_sample", observationId: "obs-5", sampleId: "u-2", label: "missing" },
    ],
    expected: { duplicateSurfacingVisible: true, unlabeledSampleIsNotScored: true, noAccuracyOrCalibrationClaim: true },
  },
]);
