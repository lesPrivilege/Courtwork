import path from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { createSessionRun, compactSessionJournal, mapSessionEvent } from "./pi-session-runtime.mjs";

/**
 * P03-B · the Pi implementation of the Host's Runtime Port.
 *
 * The port owns Pi's native session journal (where it lives, opening,
 * creating, reading it) and execution control of Pi's own loop. The Host keeps
 * admission, Run identity and status, tool governance, permission decisions,
 * effects, credentials and final settlement: tools arrive here already
 * governed, observations leave here already translated to the Host's
 * {type,data} shape, and an outcome is only what Pi reported — never a Run
 * status.
 *
 * Vocabulary follows RD-001's minimum Runtime Port lifecycle. An operation Pi
 * cannot perform is refused by name; nothing falls back to another runtime.
 */
export const PI_RUNTIME_ADAPTER_ID = "pi-coding-agent@0.85.1/agent-session";
// Interface identity is declared by this Adapter, independent of its display
// label, provider/model and Kit-specific compatibility evidence.
export const PI_RUNTIME_ADAPTER_REVISION = "pi-agent-session-context-v1";

export class RuntimePortError extends Error {
  constructor(adapterId, operation, reason) {
    super(`${adapterId} does not support ${operation}: ${reason}`);
    this.name = "RuntimePortError";
    this.code = "runtime_capability_unsupported";
    this.adapterId = adapterId;
    this.operation = operation;
  }
}

const CAPABILITIES = Object.freeze({
  start: Object.freeze({ supported: true }),
  continue: Object.freeze({ supported: true }),
  steer: Object.freeze({ supported: true }),
  cancel: Object.freeze({ supported: true }),
  compact: Object.freeze({ supported: true }),
  recover: Object.freeze({ supported: false, reason: "Pi's loop runs inside the Host process; a Run this process is not driving cannot be re-attached" }),
  submitToolResult: Object.freeze({ supported: false, reason: "Pi executes the governed tools inside its own loop; there is no pending call to answer" }),
});

export function createPiRuntimePort({ dataDir, modelRuntime }) {
  if (typeof dataDir !== "string" || !dataDir.trim()) throw new TypeError("dataDir is required");
  if (!modelRuntime) throw new TypeError("modelRuntime is required");
  const id = PI_RUNTIME_ADAPTER_ID;
  const agentDir = path.join(dataDir, "pi-agent");
  const refuse = (operation) => () => { throw new RuntimePortError(id, operation, CAPABILITIES[operation].reason); };

  return Object.freeze({
    id,
    describe: () => ({ id, revision: PI_RUNTIME_ADAPTER_REVISION, protocol: "pi-session-manager",
      configurationIdentity: null, capabilities: CAPABILITIES,
      kitContext: { format: 'reference-only-v1', compatibilityEvidence: [] } }),

    /**
     * Open the native session a CW Session is bound to, or create its journal
     * when `nativeRef` is null. The caller persists the returned `nativeRef`
     * and must already own the Run: this constructs a journal writer.
     */
    openSession({ sessionId, workspaceDir, nativeRef = null }) {
      const manager = nativeRef
        ? SessionManager.open(nativeRef.path)
        : SessionManager.create(workspaceDir, path.join(dataDir, "pi-sessions", sessionId));
      return {
        nativeRef: nativeRef ?? { id: manager.getSessionId(), path: manager.getSessionFile() },
        historyIsEmpty: () => manager.getEntries().length === 0,
        /** Start or continue Pi's loop on this journal with one input. */
        async start({ tools, onObservation, ...options }) {
          const { session, abort, run, getUsage } = await createSessionRun({
            ...options,
            cwd: workspaceDir, agentDir, modelRuntime,
            sessionManager: manager,
            customTools: tools,
            onEvent: (event) => {
              const observation = mapSessionEvent(event);
              return observation ? onObservation(observation) : undefined;
            },
          });
          // Extra input goes through createSessionRun's wrapped method, so the
          // Host's beforeExtraInput hook sees it before Pi does.
          return { abort, run, getUsage, steer: (text) => session.steer(text) };
        },
      };
    },

    /** Summarize one journal outside any Run; reports only what Pi returned. */
    async compact({ nativeRef, workspaceDir, ...options }) {
      return compactSessionJournal({
        ...options,
        cwd: workspaceDir, agentDir, modelRuntime,
        sessionManager: SessionManager.open(nativeRef.path),
      });
    },

    recover: refuse("recover"),
    submitToolResult: refuse("submitToolResult"),
  });
}
