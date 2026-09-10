/* R2-SD01 · Run summary projection.
 *
 * This is deliberately a small adapter over `surfaceFacts`.  It owns no read,
 * cache, or navigation state.  A Run identity is valid only when the selected
 * Run is present and belongs to the selected Session; otherwise there is no
 * summary to render.  Files are content versions, never mutable workspace
 * paths and never evidence of review acceptance.
 */
import { runLabels } from "./inspector.mjs";

const HASH = /^[a-f0-9]{64}$/;
const PHASES = new Set([
  "ready",
  "loading",
  "empty",
  "unknown",
  "error",
  "unavailable",
  "incompatible",
]);

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const identityPart = (value) => typeof value === "string" && value.length > 0;
const generationValue = (value) => Number.isSafeInteger(value) && value >= 0;

/* Keep this path rule aligned with the existing recorded-file reader.  The
 * server stores a normalized relative path up to 4000 characters and accepts
 * spaces and Unicode names.  The summary only rejects control/absolute/parent
 * traversal forms; the digest is checked separately because both are part of
 * the file's immutable locator. */
export function validSummaryPath(value) {
  return typeof value === "string" &&
    value.length > 0 && value.length <= 4000 &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    !value.startsWith("/") &&
    !/^[A-Za-z]:[\\/]/.test(value) &&
    !value.split(/[\\/]+/).includes("..");
}

const validHash = (value) => typeof value === "string" && HASH.test(value);

function phaseOf(value) {
  return PHASES.has(value) ? value : "incompatible";
}

function phaseLabel(phase) {
  return {
    loading: "Loading",
    error: "Unavailable",
    unknown: "Unknown",
    unavailable: "Unavailable",
    incompatible: "Unsupported",
  }[phase] || null;
}

function messageFor(phase, error, files, filesKnown) {
  if (phase === "loading") return "Loading run details…";
  if (phase === "error") return error || "Work details are unavailable.";
  if (phase === "unknown") return "Work status is unknown; recorded details are unavailable.";
  if (phase === "unavailable") return "The Run reader is unavailable.";
  if (phase === "incompatible") return "This Run summary uses an unsupported format.";
  if (!filesKnown) return "Recorded files are unavailable.";
  if (files.length === 0) return "No files were recorded for this run.";
  return null;
}

function projectFile(file, sessionId, runId) {
  if (!object(file) || file.kind !== "content-version" ||
      !validSummaryPath(file.path) || !validHash(file.sha256)) return null;
  /* A future API may include scope on an artifact.  If it does, do not let a
   * mismatched locator cross the selected Run's boundary. */
  if (file.sessionId !== undefined && file.sessionId !== sessionId) return null;
  if (file.runId !== undefined && file.runId !== runId) return null;
  const projected = {
    kind: "content-version",
    sessionId,
    runId,
    path: file.path,
    sha256: file.sha256,
  };
  if (Number.isSafeInteger(file.bytes) && file.bytes >= 0) projected.bytes = file.bytes;
  if (typeof file.writtenAt === "string" && file.writtenAt.length > 0)
    projected.writtenAt = file.writtenAt;
  return projected;
}

/**
 * Project one selected Run from the host's facts.
 *
 * `phase`, `error`, `readerAvailable`, and `generation` describe this UI read;
 * they are not persisted Run facts.  Invalid or cross-Session identities
 * return null so a late response cannot leave an old Run card visible.
 */
export function projectRunSummary(
  facts,
  { phase = "ready", error = null, readerAvailable = true, generation = 0 } = {},
) {
  if (!object(facts) || !identityPart(facts.sessionId) || !identityPart(facts.runId) ||
      !Array.isArray(facts.runs) || !Array.isArray(facts.events) ||
      !generationValue(generation) || typeof readerAvailable !== "boolean") return null;
  const sessionId = facts.sessionId;
  const runId = facts.runId;
  const matching = facts.runs.filter((run) => object(run) && run.id === runId);
  if (matching.length !== 1) return null;
  const run = matching[0];
  if (!identityPart(run.sessionId) || run.sessionId !== sessionId) return null;

  const readPhase = phaseOf(phase);
  const status = typeof run.status === "string" && Object.hasOwn(runLabels, run.status)
    ? run.status
    : "unknown";
  const runStatusLabel = runLabels[status] || runLabels.unknown;
  const statusLabel = phaseLabel(readPhase) || runStatusLabel;
  const readError = typeof error === "string" && error.length > 0 ? error : null;

  const artifacts = run.artifacts;
  const projectedArtifacts = Array.isArray(artifacts)
    ? artifacts.map((file) => projectFile(file, sessionId, runId))
    : [];
  /* A malformed artifact set is not the same fact as an empty artifact set.
   * Keep valid entries useful, but expose `filesKnown: false` so the card never
   * describes a filtered malformed response as a complete zero-file result. */
  const filesKnown = Array.isArray(artifacts) && projectedArtifacts.every(Boolean);

  /* A non-ready response is not permission to repeat old file facts.  Empty
   * and ready are the only phases that expose the exact recorded versions. */
  const files = readPhase === "ready" || readPhase === "empty"
    ? projectedArtifacts
      .filter(Boolean)
    : [];

  return {
    schemaVersion: 1,
    identity: { sessionId, runId },
    generation,
    phase: readPhase,
    status,
    statusLabel,
    runStatusLabel,
    readerAvailable,
    canOpen: readerAvailable && (readPhase === "ready" || readPhase === "empty"),
    error: readError,
    message: messageFor(readPhase, readError, files, filesKnown),
    filesKnown,
    files,
  };
}
