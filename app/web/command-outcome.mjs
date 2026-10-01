/* What a command's answer settled (review N6, 2026-10-01).
 *
 * A sent command is in one of three states and the client keeps them apart: the
 * Host returned its receipt (committed), the Host said it was not admitted (a
 * definite refusal: settle it, keep the input, send again as a new command),
 * or the outcome is not known (keep the exact identity and payload, and only
 * read back or replay that same identity). These are classifiers only: they
 * hold no state and send nothing.
 *
 * Which answers prove "not admitted" differs between the first send and a
 * replay, and that difference is the point:
 *   · first send — the answer is about this very request, so a coded Host
 *     refusal settles it (`isUncertainCommandError`, the V7-01 guard);
 *   · replay — the first request may have been admitted before its reply was
 *     lost, so a refusal proves nothing by itself. Only the Host's own
 *     statement that this command has no receipt (`commandAdmitted: false`,
 *     app/docs/api-v6.md «Runs») does, or a 404 for a Session that no longer
 *     exists. `command_conflict`, a refusal raised before the Host looked the
 *     command up, a network error and a 5xx all stay unknown. The client does
 *     not infer the answer from its knowledge of the Host's check order. */

/* Uncertain means the outcome is not known: no response, a network error,
 * or a 5xx without a Host code (or with `internal_error`, or a code that
 * itself says the outcome is unknown, or a Core error the Host marked
 * `outcome: "unknown"`, whatever its code). A coded Host refusal is settled. */
export function isUncertainCommandError(error) {
  if (!Number.isFinite(error?.status)) return true;
  if (error.body?.error?.outcome === "unknown") return true;
  if (error.status < 500) return false;
  const code = error.body?.error?.code;
  return !code || code === "internal_error" || code.endsWith("_unknown");
}

/** One `POST /sessions/:id/runs` attempt for `operation` (`{ commandId, … }`).
 * Pass `result` or `error`; `sent: false` when the failure happened before the
 * request left; `replay: true` when this commandId was sent before.
 * Returns `{ kind: "receipt", run }`, `{ kind: "not-admitted", error }` or
 * `{ kind: "unknown", error }`. */
export function runAttemptOutcome({ operation, sessionId, replay = false, sent = true, result = null, error = null }) {
  if (!error) {
    const run = result?.run;
    if (run?.id && run.sessionId === sessionId && run.commandId === operation.commandId) return { kind: "receipt", run };
    // A 2xx that is not this command's receipt proves neither outcome.
    return { kind: "unknown", error: new Error(replay ? "The returned run does not match this instruction." : "The runtime did not return a matching run receipt.") };
  }
  if (!sent) return { kind: "not-admitted", error };
  if (!replay) return { kind: isUncertainCommandError(error) ? "unknown" : "not-admitted", error };
  const answer = error.body?.error;
  const refused = Number.isFinite(error.status) && answer?.outcome !== "unknown"
    && (answer?.commandAdmitted === false || (error.status === 404 && answer?.code === "not_found"));
  return { kind: refused ? "not-admitted" : "unknown", error };
}
