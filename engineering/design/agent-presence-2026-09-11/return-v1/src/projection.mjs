// Agent presence · host facts → presence display (pure; return-v1 specimen).
//
// The input is a Design fixture shaped after the Run/tool/question vocabulary
// (engineering/mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md
// §1–2). It is NOT a production DTO: the host's own projection would feed the
// same decisions. This function creates no fact — every label below restates
// a fact that is present in the input, and absence stays absence:
//   no tool fact     → no tool words
//   no thinking fact → no ambient words ("Working", never "Thinking")
//   connection unknown → no "Ready", run state unknown
// No clock, no fetch, no Date.now(); elapsed time is added by the caller.

/** Presence poses (visual only; they are not runtime states). */
export const POSES = ["rest", "think", "look", "hold", "settle", "dim"];

const TERMINAL = new Set(["completed", "cancelled", "failed", "unknown"]);

/* The tool's own name and target, as the tool row shows them (app.mjs renders
 * row.name). No verb is guessed from the name: a mapping such as ws_read →
 * "Reading" would need a registered source first (see decision.md, gap G-3). */
const toolLabel = (tool) => {
  const name = tool.name || "Tool";
  return tool.target ? `${name} · ${tool.target}` : name;
};

/**
 * @param {object} facts design-fixture facts (see fixtures/states.json)
 * @returns {{
 *   key: string, pose: string, tone: string, label: string|null,
 *   ambient: boolean, announce: string, elapsedFrom: number|null,
 *   scope: string|null, detail: Array<{term: string, value: string}>, note: string|null
 * }}
 */
export function projectPresence(facts = {}) {
  const run = facts.run || null;
  const tools = (facts.tools || []).filter((t) => t.status === "running");
  const detail = [];
  const base = { ambient: false, elapsedFrom: null, scope: run ? run.id : null, note: null };

  if (facts.connection !== "connected") {
    return {
      ...base,
      key: "connection:unknown",
      pose: "dim",
      tone: "unknown",
      label: "Connection unknown",
      announce: "Connection unknown",
      detail: [
        { term: "Connection", value: "Unknown — the host has not confirmed it" },
        { term: "Run", value: run ? "State unknown until the host reconnects" : "No run known" },
      ],
      note: "Nothing on this line is live until the host reports again.",
    };
  }

  if (!run) {
    return {
      ...base,
      key: "idle",
      pose: "rest",
      tone: "quiet",
      label: null,
      announce: "No active work",
      detail: [{ term: "Run", value: "No active run in this chat" }],
    };
  }

  detail.push({ term: "Run", value: run.id });
  detail.push({ term: "Host status", value: run.status });

  if (TERMINAL.has(run.status)) {
    const word = { completed: "Completed", cancelled: "Cancelled", failed: "Failed", unknown: "Unknown" }[run.status];
    return {
      ...base,
      key: `terminal:${run.id}:${run.status}`,
      pose: run.status === "completed" ? "settle" : run.status === "failed" ? "hold" : run.status === "unknown" ? "dim" : "rest",
      tone: run.status === "failed" ? "danger" : run.status === "unknown" ? "unknown" : "quiet",
      label: word,
      announce: `Work ${word.toLowerCase()}`,
      detail,
      note:
        run.status === "completed"
          ? "Completed is the Run's end state. It does not mean the result was reviewed or accepted."
          : run.status === "unknown"
            ? "The host could not say how this Run ended. Unknown is not failed."
            : null,
    };
  }

  // Active from here on: running | waiting_user | stopping.
  const active = { ...base, elapsedFrom: run.startedAtMs ?? null };
  const toolDetail = tools.map((t) => ({ term: t.scope ? `Tool · ${t.scope}` : "Tool", value: toolLabel(t) }));

  if (run.status === "waiting_user") {
    const permission = facts.pending?.kind === "permission";
    const label = permission ? "Waiting for your approval" : "Waiting for you";
    if (facts.pending?.summary) detail.push({ term: permission ? "Request" : "Question", value: facts.pending.summary });
    return { ...active, key: `wait:${run.id}:${facts.pending?.id || facts.pending?.kind || "user"}`, pose: "hold", tone: "attention", label, announce: label, detail: [...detail, ...toolDetail] };
  }

  if (run.status === "stopping") {
    return { ...active, key: `stopping:${run.id}`, pose: "hold", tone: "quiet", label: "Stopping", announce: "Stopping", detail: [...detail, ...toolDetail], note: "The host has taken the stop request. Work ends when it reports a final state." };
  }

  // run.status === "running"
  if (facts.blocked) {
    const label = `Blocked · ${facts.blocked.reason}`;
    return { ...active, key: `blocked:${run.id}:${facts.blocked.reason}`, pose: "hold", tone: "attention", label, announce: label, detail: [...detail, { term: "Blocked", value: facts.blocked.reason }, ...toolDetail] };
  }

  if (facts.cancel === "requested") {
    return {
      ...active,
      key: `cancel-requested:${run.id}`,
      pose: "hold",
      tone: "quiet",
      label: "Stop requested · still working",
      announce: "Stop requested",
      detail: [...detail, { term: "Stop", value: "Requested — not yet taken by the host" }, ...toolDetail],
      note: "A stop request is not a stop. The Run stays active until the host reports it.",
    };
  }

  if (tools.length === 1) {
    const label = toolLabel(tools[0]);
    return { ...active, key: `tool:${run.id}:${tools[0].id}`, pose: "look", tone: "active", label, announce: label, detail: [...detail, ...toolDetail] };
  }
  if (tools.length > 1) {
    const label = `${tools.length} tools running`;
    return {
      ...active,
      key: `tools:${run.id}:${tools.map((t) => t.id).join("+")}`,
      pose: "look",
      tone: "active",
      label,
      announce: label,
      detail: [...detail, ...toolDetail],
      note: "These tools run side by side. Their order here is not progress.",
    };
  }

  if (facts.activity?.kind === "thinking") {
    return { ...active, key: `thinking:${run.id}`, pose: "think", tone: "active", label: "Thinking", ambient: true, announce: "Thinking", detail: [...detail, { term: "Activity", value: "Thinking (reported by the host)" }] };
  }

  return { ...active, key: `working:${run.id}`, pose: "rest", tone: "active", label: "Working", announce: "Working", detail, note: "The host reports the Run as running with no finer activity." };
}

/* ---- ambient words ------------------------------------------------------ */

/** Seeded order: the first slot is always words[0]; the rest are shuffled. */
export function ambientOrder(words, seed) {
  const rest = words.slice(1);
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [words[0], ...rest];
}

/** The ambient word shown `elapsedInStateMs` after a thinking fact began. */
export function ambientWord(words, elapsedInStateMs, intervalMs, seed) {
  const order = ambientOrder(words, seed);
  const slot = Math.floor(Math.max(0, elapsedInStateMs) / intervalMs);
  return { word: order[slot % order.length], slot, nextAtMs: (slot + 1) * intervalMs };
}

/** Elapsed text in the app's existing format (app.mjs formatElapsed). */
export function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
