import { validPermission } from "./thread-projection.mjs";

/**
 * Plan one collapsed disclosure for each completed Run. Member rows remain at
 * their original indices; the presentation inserts one control at the first
 * member and hides the other member roots in place. This keeps assistant text,
 * artifacts, pending decisions and unresolved/failed tools in the Run timeline.
 */
export function projectExecutionDisclosures(rows, statuses) {
  const successfulCallsByRun = new Map();
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (
      row?.kind !== "tool" ||
      typeof row.runId !== "string" ||
      !row.runId ||
      statuses?.get?.(row.runId) !== "completed" ||
      typeof row.callId !== "string" ||
      !row.callId ||
      row.phase !== "result" ||
      row.isError !== false
    ) continue;
    let calls = successfulCallsByRun.get(row.runId);
    if (!calls) successfulCallsByRun.set(row.runId, (calls = []));
    calls.push({ row, index });
  }

  const plans = new Map();
  const members = new Map();
  for (const [runId, calls] of successfulCallsByRun) {
    const callIds = new Set(calls.map(({ row }) => row.callId));
    const approvals = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (
        row?.kind === "permission" &&
        row.runId === runId &&
        row.questionStatus === "resolved" &&
        row.decision === "allow" &&
        validPermission(row.payload) &&
        callIds.has(row.payload.toolCallId)
      ) approvals.push({ row, index });
    }

    const items = [...calls, ...approvals].sort((a, b) => a.index - b.index);
    const plan = {
      runId,
      callCount: calls.length,
      firstIndex: items[0].index,
      items,
    };
    plans.set(runId, plan);
    for (const item of items) members.set(item.row, { plan, index: item.index });
  }
  return { plans, members };
}

export function executionDisclosureMemberId(surface, sessionId, runId, rowId) {
  const part = (value) => encodeURIComponent(String(value ?? ""));
  return `execution-${part(surface)}-${part(sessionId)}-${part(runId)}-${part(rowId)}`;
}

export function executionDisclosureStateKey(sessionId, runId) {
  return JSON.stringify([sessionId ?? "", runId ?? ""]);
}
