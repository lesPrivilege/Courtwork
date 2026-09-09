export function normalizedType(type) {
  if (type === "user.message") return "message/user";
  if (type === "assistant.message") return "assistant/final";
  return String(type || "").replace(".", "/");
}
export function projectThread(events, runs, sessionId) {
  const rows = [],
    assistants = new Map(),
    segments = new Map(),
    tools = new Map(),
    questions = new Map();
  const statuses = new Map(
    runs.filter((r) => r.sessionId === sessionId).map((r) => [r.id, r.status]),
  );
  const nextSegment = (id) => segments.set(id, (segments.get(id) || 0) + 1);
  for (const event of events) {
    if (event.sessionId && event.sessionId !== sessionId) continue;
    const type = normalizedType(event.type),
      data = event.data || {},
      runId = event.runId;
    if (type === "message/user")
      rows.push({
        kind: "user",
        text: data.text || "",
        startedAt:
          runs.find((run) => run.id === runId && run.sessionId === sessionId)
            ?.startedAt || null,
        runId,
        id: `user:${event.seq}`,
      });
    else if (type === "assistant/delta" || type === "assistant/final") {
      const id = `${runId}:${segments.get(runId) || 0}`;
      let row = assistants.get(id);
      if (!row) {
        row = { kind: "assistant", text: "", runId, id };
        assistants.set(id, row);
        rows.push(row);
      }
      row.text = data.text ?? data.delta ?? data.message ?? row.text;
      row.pending = type === "assistant/delta";
      // A final closes this message. Later cumulative deltas/finals belong to
      // a new message even when no tool or question separates the outputs.
      if (type === "assistant/final") nextSegment(runId);
    } else if (["tool/start", "tool/update", "tool/result"].includes(type)) {
      nextSegment(runId);
      const callId = data.callId || data.id || data.name || event.seq,
        key = `${runId}:${callId}`;
      let row = tools.get(key);
      if (!row) {
        row = {
          kind: "tool",
          runId,
          callId,
          name: data.name || "Tool",
          id: key,
        };
        tools.set(key, row);
        rows.push(row);
      }
      row.request =
        data.request ??
        data.args ??
        data.arguments ??
        data.input ??
        row.request;
      row.result = data.result ?? data.text ?? data.error ?? row.result;
      row.isError = Boolean(data.isError || data.error);
      row.phase = type === "tool/result" ? "result" : "started";
    } else if (type === "question/open" || type === "permission/open") {
      nextSegment(runId);
      const id = data.id || data.questionId || event.seq,
        key = `${runId}:${id}`;
      const row = {
        kind: type === "permission/open" ? "permission" : "question",
        runId,
        id,
        prompt: data.prompt || "Input requested",
        payload: data,
        answer: null,
        questionStatus: "pending",
      };
      questions.set(key, row);
      rows.push(row);
    } else if (type === "question/resolved" || type === "permission/resolved") {
      const row = questions.get(`${runId}:${data.id || data.questionId}`);
      if (row) {
        row.questionStatus = data.status || "resolved";
        row.answer = data.answer ?? null;
        row.decision = data.decision ?? null;
      }
    } else if (type === "run/status" && data.status)
      statuses.set(runId, data.status);
    else if (type === "run/error")
      rows.push({
        kind: "error",
        runId,
        text: data.message || data.code || "Run failed.",
        id: `error:${event.seq}`,
      });
    else if (type === "artifact/written")
      rows.push({
        kind: "artifact",
        runId,
        file: data,
        id: `artifact:${event.seq}`,
      });
    else if (type === "run/notice")
      rows.push({ kind: "notice", runId, data, id: `notice:${event.seq}` });
  }
  const ordered = [],
    seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    ordered.push(row);
    if (row.runId && row.runId !== rows[i + 1]?.runId) {
      ordered.push({
        kind: "run-status",
        runId: row.runId,
        status: statuses.get(row.runId),
        id: `status:${row.runId}`,
      });
      seen.add(row.runId);
    }
  }
  for (const [runId, status] of statuses)
    if (!seen.has(runId))
      ordered.push({
        kind: "run-status",
        runId,
        status,
        id: `status:${runId}`,
      });
  return { rows: ordered, statuses };
}
/* WK-57 · a tool row's state is a word in its own slot, never a lower-case
 * suffix glued to the tool's name. A finished tool carries no state word: the
 * run's own state already says how the run ended. Both chat presentations read
 * this one function so the vocabulary cannot drift between them. */
export const unfinishedToolWord = (status) =>
  status === "cancelled" || status === "failed" ? "Interrupted" : "Unknown";
export function toolStateWord(row, status) {
  if (row.isError) return "Failed";
  if (row.phase === "result") return null;
  if (["created", "running", "waiting_user", "stopping"].includes(status))
    return status === "waiting_user" ? "Waiting for you" : status === "stopping" ? "Stopping" : "Working";
  return unfinishedToolWord(status);
}
export function canAnswer(row, run) {
  return Boolean(
    row &&
      run &&
      row.runId === run.id &&
      ["running", "waiting_user"].includes(run.status) &&
      run.admissionOpen !== false &&
      row.questionStatus === "pending",
  );
}
export function validPermission(payload) {
  return Boolean(
    payload &&
      typeof payload.path === "string" &&
      payload.path &&
      typeof payload.toolCallId === "string" &&
      Number.isSafeInteger(payload.bytes) &&
      payload.bytes >= 0 &&
      /^[a-f0-9]{64}$/.test(payload.contentSha256) &&
      typeof payload.preview === "string",
  );
}

// Names are display facts from the permission and this Run's recorded binding.
// Never infer a file write from the shared path/hash envelope, or relabel an
// old request using the current (possibly replaced) runtime catalog.
export function permissionPresentation(payload, binding) {
  const write = payload?.tool === "ws_write";
  const resource = binding?.resources?.find(
    (item) => item.id === `tool:${payload?.tool}`,
  );
  const remote = Boolean(resource?.mcp);
  return {
    /* WK-89 · 一次动作是 Approval，不是 permission：permission 属于持久策略。
       标题按事实区分三种调用，动作词统一为 Approve / Deny。 */
    title: write ? "Approve this file write?" : remote ? "Approve this remote tool call?" : "Approve this tool action?",
    /* IC-1 · the glyph states the kind of call the row records; it never stands
     * in for the authorisation words, which stay as text. A remote call and a
     * local file write are not allowed to share one glyph. */
    glyph: write ? "square-pen" : remote ? "plug" : "activity",
    noun: write ? "write" : "action",
    label: write ? "Write" : "Action",
    target: write ? payload.path : remote
      ? `${resource.mcp.name} · ${resource.mcp.serverId}`
      : payload?.tool || "Recorded tool identity unavailable",
    source: remote ? resource.source?.uri || "Recorded remote source unavailable" : null,
    details: write ? "Write details" : "Action details",
    hashLabel: write ? "Copy proposed content hash" : "Copy proposed arguments hash",
  };
}
