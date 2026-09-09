import { TRACE_VECTORS } from "./vectors.mjs";

const acceptedPhases = new Set(["P0", "P1", "P2", "P3", "P4"]);
const isUnavailable = (value) => value === null || value === undefined || value === "unavailable";

export function validateTraceVector(vector) {
  const errors = [];
  if (!vector?.id || !Array.isArray(vector.references) || !Array.isArray(vector.events) || !vector.expected) return ["missing trace fixture fields"];
  const refs = new Map(vector.references.map((item) => [item.id, item]));
  const decisions = new Set();
  const revisions = new Set();
  for (const event of vector.events) {
    if (!acceptedPhases.has(event.phase)) errors.push(`invalid phase: ${event.phase}`);
    for (const key of ["payloadRef", "fromRef", "toRef"]) if (event[key] && !refs.has(event[key])) errors.push(`unknown reference: ${event[key]}`);
    if (event.kind === "proposal") revisions.add(event.revision);
    if (event.kind === "approve" && !revisions.has(event.revision)) errors.push(`approval precedes proposal revision ${event.revision}`);
    if (event.kind === "approve" && decisions.has(event.decisionId) && !event.duplicate) errors.push(`duplicate decision must be surfaced: ${event.decisionId}`);
    if (event.kind === "approve") decisions.add(event.decisionId);
    if (event.kind === "effect" && !["verified", "unknown"].includes(event.status)) errors.push(`invalid effect status: ${event.status}`);
    if (event.kind === "effect" && event.status === "unknown" && !isUnavailable(event.verifiedAt)) errors.push("unknown effect cannot claim verification time");
    if (event.kind === "unsurfaced_sample" && !["needs_independent_review", "missing"].includes(event.label)) errors.push("unsurfaced sample requires an explicit non-score label");
    if (event.kind === "edit") {
      const from = refs.get(event.fromRef);
      const to = refs.get(event.toRef);
      if (!event.delta?.remove || !event.delta?.insert || !from?.text?.includes(event.delta.remove) || !to?.text?.includes(event.delta.insert)) {
        errors.push("edit lacks reconstructable delta");
      }
    }
  }
  return errors;
}

export function validateTraceVectors(vectors = TRACE_VECTORS) {
  return vectors.map((vector) => ({ id: vector.id, errors: validateTraceVector(vector) }));
}

export function assertValidTraceVectors(vectors = TRACE_VECTORS) {
  const failures = validateTraceVectors(vectors).filter(({ errors }) => errors.length);
  if (failures.length) throw new Error(`invalid synthetic trace vectors: ${JSON.stringify(failures)}`);
  return { vectorCount: vectors.length, valid: true };
}
