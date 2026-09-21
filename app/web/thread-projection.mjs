export function normalizedType(type) {
  if (type === "user.message") return "message/user";
  if (type === "assistant.message") return "assistant/final";
  return String(type || "").replace(".", "/");
}
/* Notice kinds that close an earlier notice of the same Run. */
const noticePairs = {
  compaction_end: "compaction_start",
  auto_retry_end: "auto_retry_start",
};
export function projectThread(events, runs, sessionId) {
  const rows = [],
    assistants = new Map(),
    segments = new Map(),
    tools = new Map(),
    questions = new Map(),
    // 04 · the assistant row that currently stands as each Run's answer: the
    // last settled message with nothing after it but more of the same. Any
    // later output, tool, check or question takes the place away again.
    answers = new Map();
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
        row = { kind: "assistant", text: "", runId, id,
          startedAt: runs.find(run => run.id === runId && run.sessionId === sessionId)?.startedAt || null };
        assistants.set(id, row);
        rows.push(row);
      }
      row.text = data.text ?? data.delta ?? data.message ?? row.text;
      row.pending = type === "assistant/delta";
      // A message that ends in a tool call is narration on the way to work,
      // not the answer. An empty message shows nothing, so it neither is the
      // answer nor displaces the one before it.
      if (row.pending || data.stopReason === "toolUse") answers.delete(runId);
      else if (row.text.trim()) answers.set(runId, row);
      // A final closes this message. Later cumulative deltas/finals belong to
      // a new message even when no tool or question separates the outputs.
      if (type === "assistant/final") nextSegment(runId);
    } else if (["tool/start", "tool/update", "tool/result"].includes(type)) {
      nextSegment(runId);
      answers.delete(runId);
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
    } else if (type === "check/started" || type === "check/settled") {
      // DF-04 · the Host settles a check itself (check.settled) even when the
      // Run was cancelled and Pi's own tool/result never arrives; the row is
      // the same tool row, and the settlement is its authoritative outcome.
      const callId = data.callId, key = `${runId}:${callId}`;
      let row = tools.get(key);
      if (!row) {
        nextSegment(runId);
        answers.delete(runId);
        row = { kind: "tool", runId, callId, name: "check_run", id: key };
        tools.set(key, row);
        rows.push(row);
      }
      if (type === "check/started") {
        row.check = { status: "running", recipeId: data.recipeId, recipeVersion: data.recipeVersion, startedAt: data.startedAt };
        row.request ??= { recipeId: data.recipeId };
        row.phase ??= "started";
      } else {
        row.check = { ...(row.check ?? {}), ...data, status: data.status };
        row.phase = "result";
        if (["failed", "unknown"].includes(data.status)) row.isError = true;
      }
    } else if (type === "question/open" || type === "permission/open") {
      nextSegment(runId);
      answers.delete(runId);
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
        text: data.message || data.code || "Work failed.",
        id: `error:${event.seq}`,
      });
    else if (type === "artifact/written")
      rows.push({
        kind: "artifact",
        runId,
        file: data,
        id: `artifact:${event.seq}`,
      });
    /* 08 · a recorded presentation is a row of its own at its event position:
     * the same instance the work surface opens, never the model's retelling. */
    else if (type === "presentation/created" && data?.instanceId)
      rows.push({ kind: "presentation", runId, instance: data, id: `presentation:${data.instanceId}` });
    else if (type === "run/notice") {
      /* UX-10 · ordinary progress aggregates: once a paired notice ends, its
       * start line has said all it had to say and leaves; the outcome stands
       * at its own position. A start without an end still reads as the
       * current state. */
      const start = noticePairs[data.kind];
      const open = start && rows.findLastIndex((row) => row.kind === "notice" && row.runId === runId && row.data?.kind === start);
      if (open >= 0) rows.splice(open, 1);
      rows.push({ kind: "notice", runId, data, id: `notice:${event.seq}` });
    }
  }
  // 04 / UX-05 · only a Run that completed has a final answer. While it is
  // still running, waiting or stopping the standing row may yet be followed by
  // a tool; after failure, cancellation or an unknown end, the last text is
  // what arrived, not an answer the Run settled on. Those rows keep their body
  // and simply carry no final-answer footer; the run-status row says the rest.
  for (const [runId, row] of answers)
    if (statuses.get(runId) === "completed") row.final = true;
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
export function checkStateWord(check) {
  if (!check) return null;
  if (check.status === "running") return "Checking";
  if (check.status === "completed") return `Exit ${check.exitCode ?? "?"}`;
  if (check.status === "cancelled") return "Cancelled";
  if (check.status === "timed_out") return "Timed out";
  if (check.status === "unknown") return "Unknown";
  return "Failed";
}
export function toolStateWord(row, status) {
  if (row.check) return checkStateWord(row.check);
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

/* RD-006 / 02 · the private candidate this approval was actually asked about,
 * read only from the payload the Host recorded with the request.
 *
 * These are the exact values the Host will re-check before it acts: both
 * governed tools compare the whole approved context against the candidate at
 * execution time and refuse with `candidate_changed` if any of it has moved
 * (repository-candidate-tools.mjs, check-tools.mjs approvedCandidate). So this
 * is not decoration — it is the fence, shown to the person it protects.
 *
 * The transcript keeps a decided request, and reading it back is the question
 * the live candidate cannot answer: by then it may have taken further writes,
 * been stopped, or been replaced by one built from a different commit. The
 * current Session, the current binding and the current candidate are therefore
 * all wrong answers to "what did I approve?", and none of them is substituted
 * here. A field the Host did not record stays absent rather than becoming a
 * zero: `check_run` carries no candidateRevision and must not be shown one. */
export function approvalCandidate(payload) {
  const id = typeof payload?.candidateId === "string" && payload.candidateId ? payload.candidateId : null;
  if (!id) return null;
  return {
    id,
    revision: Number.isSafeInteger(payload.candidateRevision) ? payload.candidateRevision : null,
    writeRevision: Number.isSafeInteger(payload.candidateWriteRevision) ? payload.candidateWriteRevision : null,
  };
}

// Names are display facts from the permission and this Run's recorded binding.
// Never infer a file write from the shared path/hash envelope, or relabel an
// old request using the current (possibly replaced) runtime catalog.
export function permissionPresentation(payload, binding) {
  const write = payload?.tool === "ws_write" || payload?.tool === "repo_write";
  // RD-006 · a repo_write lands in the Host's private candidate, never in the
  // connected folder; the card says so and names the exact prior state.
  const candidate = payload?.tool === "repo_write";
  const priorHash = typeof payload?.expectedSha256 === "string" && payload.expectedSha256 ? payload.expectedSha256 : null;
  // DF-04 · a check runs one Host-owned recipe inside the private candidate;
  // the card names the recipe, what it executes and the limits, never a
  // model-supplied command.
  const check = payload?.tool === "check_run";
  if (check) {
    const command = String(payload.command ?? "").split("/").pop() || "recipe";
    const argv = Array.isArray(payload.argv) ? payload.argv.join(" ") : "";
    const seconds = Number.isFinite(payload.timeoutMs) ? Math.round(payload.timeoutMs / 1000) : null;
    const kib = Number.isFinite(payload.outputLimitBytes) ? Math.round(payload.outputLimitBytes / 1024) : null;
    return {
      title: "Approve this check?",
      glyph: null,
      noun: "check",
      label: "Check",
      target: payload.recipeId ? `${payload.recipeId}${payload.recipeVersion ? ` v${payload.recipeVersion}` : ""}` : "Recorded recipe identity unavailable",
      source: null,
      details: "Check details",
      candidate: approvalCandidate(payload),
      hashLabel: "Copy proposed arguments hash",
      scope: [`${command} ${argv}`.trim(), "in the private candidate", seconds ? `${seconds} s` : null, kib ? `${kib} KiB per stream` : null, "minimal environment"].filter(Boolean).join(" · "),
    };
  }
  const resource = binding?.resources?.find(
    (item) => item.id === `tool:${payload?.tool}`,
  );
  const remote = Boolean(resource?.mcp);
  return {
    /* WK-89 · 一次动作是 Approval，不是 permission：permission 属于持久策略。
       标题按事实区分三种调用，动作词统一为 Approve / Deny。 */
    title: write ? "Approve this file write?" : remote ? "Approve this remote tool call?" : "Approve this tool action?",
    // Approval is identified by its exact scope and target, without borrowing
    // the Activity or Connection identity glyphs.
    glyph: null,
    noun: write ? "write" : "action",
    label: write ? "Write" : "Action",
    target: write ? payload.path : remote
      ? `${resource.mcp.name} · ${resource.mcp.serverId}`
      : payload?.tool || "Recorded tool identity unavailable",
    source: remote ? resource.source?.uri || "Recorded remote source unavailable" : null,
    details: write ? "Write details" : "Action details",
    candidate: approvalCandidate(payload),
    hashLabel: write ? "Copy proposed content hash" : "Copy proposed arguments hash",
    scope: candidate
      ? (priorHash ? `Private candidate · replaces the file whose hash starts ${priorHash.slice(0, 12)}` : "Private candidate · new file")
      : null,
  };
}
