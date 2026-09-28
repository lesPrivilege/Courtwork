// DF-04 model tool (RD-009). The model chooses a recipe id only -- never a
// command, argv, cwd or environment. Settlement is recorded by the Host
// directly (recordStarted/recordSettled), independent of Pi's own
// tool.result path, because a cancel closes Run admission before a late
// tool.* event would otherwise arrive.
import { lstatSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { Type } from "@earendil-works/pi-ai";
import { getCheckRecipe } from "./check-recipes.mjs";
import { runCheckRecipe } from "./check-runner.mjs";

function checkError(message, code = "check_failed") {
  const error = new Error(message);
  error.code = code;
  return error;
}

/* A fixed recipe's path arguments must all be present in the candidate. Node's
 * test runner reads each path as a glob and silently skips one that matches
 * nothing while others run, which would settle a missing target as a pass. */
function assertFixedTargets(recipe, candidatePath) {
  for (const target of recipe.argv.filter(argument => !argument.startsWith("-"))) {
    let file = null;
    try { file = lstatSync(path.join(candidatePath, target)); } catch { /* reported below */ }
    if (!file?.isFile()) throw checkError(`Fixed check target is missing from the candidate: ${target}`, "missing_target");
  }
}

export function createCheckTools({ candidate, resolveCandidate, runId: _runId, recordStarted, recordSettled, isOpen } = {}) {
  if (!candidate || candidate.status !== "active") return [];
  const candidateId = candidate.id;
  function currentCandidate() {
    const current = resolveCandidate?.();
    if (!current || current.status !== "active"
      || ["id", "revision", "sourceBindingId", "sourceBindingRevision", "candidatePath"]
        .some(key => current[key] !== candidate[key])) {
      throw checkError("Check candidate or binding changed", "candidate_changed");
    }
    return current;
  }
  function descriptor(recipe, current) {
    return {
      recipeId: recipe.id, recipeVersion: recipe.version,
      command: recipe.command, argv: [...recipe.argv], cwd: "private candidate",
      candidateId, candidateWriteRevision: current.writeRevision,
      timeoutMs: recipe.timeoutMs, outputLimitBytes: recipe.outputLimitBytes, env: recipe.env,
    };
  }
  function approvedCandidate(recipe, approvedContext) {
    const current = currentCandidate();
    if (!isDeepStrictEqual(approvedContext, descriptor(recipe, current))) {
      throw checkError("Check approval no longer matches the candidate or recipe", "candidate_changed");
    }
    return current;
  }

  const checkRunTool = {
    name: "check_run",
    label: "Run a Host check recipe",
    description: "Run one Host-owned check recipe inside the private candidate worktree. The model selects a recipe id only; the Host fixes the exact command, arguments, working directory, environment, timeout and output limits. A completed run (including a non-zero exit code) is not Work acceptance.",
    parameters: Type.Object({ recipeId: Type.String({ minLength: 1, maxLength: 200 }) }),
    permissionContext(params) {
      // Thrown here (not returned as a partial context) so an unknown recipe
      // never reaches requestPermission at all: no question is opened and no
      // process starts. governTools has no try/catch around this call, so the
      // throw propagates exactly like an execute() failure would.
      const recipe = getCheckRecipe(params.recipeId);
      if (!recipe) throw checkError("Unknown check recipe", "unknown_recipe");
      return descriptor(recipe, currentCandidate());
    },
    async execute(callId, params, signal, _onUpdate, approvedContext) {
      const recipe = getCheckRecipe(params.recipeId);
      if (!recipe) throw checkError("Unknown check recipe", "unknown_recipe");
      if (signal?.aborted || !isOpen()) throw checkError("Run admission is closed", "run_closed");

      const current = approvedCandidate(recipe, approvedContext);
      const candidateWriteRevision = current.writeRevision;
      const startedAt = new Date().toISOString();
      await recordStarted({ callId, recipeId: recipe.id, recipeVersion: recipe.version, candidateId, candidateWriteRevision, startedAt });

      let result;
      try {
        result = await runCheckRecipe({ recipe, cwd: current.candidatePath, signal,
          // Store persistence and temporary HOME creation both yield. Recheck
          // after those awaits, at the actual synchronous spawn boundary.
          beforeSpawn: () => {
            if (signal?.aborted || !isOpen()) throw checkError("Run admission is closed", "run_closed");
            assertFixedTargets(recipe, approvedCandidate(recipe, approvedContext).candidatePath);
          },
        });
      } catch (error) {
        const endedAt = new Date().toISOString();
        await recordSettled({
          callId, status: error.code === "run_closed" ? "cancelled" : "failed", exitCode: null, signal: null,
          durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
          stdout: "", stderr: "", truncated: { stdout: false, stderr: false },
          startedAt, endedAt, failure: error.code === "run_closed" ? null : { code: error.code ?? "spawn_failed" },
        });
        throw checkError("check recipe failed to start: " + error.message, error.code ?? "spawn_failed");
      }

      const status = result.cancelled ? "cancelled" : result.timedOut ? "timed_out" : "completed";
      // Once Host cancellation wins, whether the child reports exit 1 after
      // handling SIGTERM or closes from SIGTERM is process scheduling detail,
      // not a different check settlement. Keep one stable Host/tool result.
      const exitCode = status === "cancelled" ? null : result.exitCode;
      const closeSignal = status === "cancelled" ? null : result.signal;
      await recordSettled({
        callId, status, exitCode, signal: closeSignal, durationMs: result.durationMs,
        stdout: result.stdout, stderr: result.stderr, truncated: result.truncated,
        startedAt: result.startedAt, endedAt: result.endedAt,
      });

      const summary = {
        recipeId: recipe.id, status, exitCode, signal: closeSignal,
        durationMs: result.durationMs, truncated: result.truncated, stdout: result.stdout, stderr: result.stderr,
      };
      const { stdout: _stdout, stderr: _stderr, ...details } = summary;
      return { content: [{ type: "text", text: JSON.stringify(summary) }], details: { ...details, candidateId } };
    },
  };

  return [checkRunTool];
}
