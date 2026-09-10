// The eight steps of the recorded matter, word for word from the publishing
// copy (public-copy-v2 §3). The same words are used by the specimen and by the
// no-script fallback, so they live in one place and neither may reword them.
//
// `layer` names which part of the recording backs each step. `events` gives the
// last event type the step's slice of the event log runs to, so each step shows
// the run as it stood at that moment rather than the finished run every time.
export const STEPS = [
  {
    id: "home",
    // The still this step falls back to when there is no scripting.
    still: "M1",
    seen: "Home",
    text: "写下要做的工作。选一个 Project，并决定文件如何被编辑：Ask before editing、Allow edits，或 Read only。",
    status: "runs locally",
    view: "session",
    key: "session",
    run: 0,
    upTo: "user.message",
  },
  {
    id: "run",
    // The still this step falls back to when there is no scripting.
    still: "M2",
    seen: "Run",
    text: "每一次工具调用在发生时显示，不藏在摘要后面。",
    status: "verified with synthetic data",
    view: "run",
    key: "events.<run A>",
    run: 0,
    upTo: "tool.start",
  },
  {
    id: "approval",
    // The still this step falls back to when there is no scripting.
    still: "M2",
    seen: "Approval",
    text: "写入之前，查看路径与具体内容，再批准这次行动。",
    status: "verified with synthetic data",
    view: "run",
    key: "permission",
    run: 0,
    upTo: "permission.open",
  },
  {
    id: "question",
    // The still this step falls back to when there is no scripting.
    still: "M3",
    seen: "Question",
    text: "需要补充信息时，直接回答 Agent 的提问。问答随 Run 一起保留。",
    status: "verified with synthetic data",
    view: "run",
    key: "question",
    run: 0,
    upTo: "question.open",
  },
  {
    id: "file",
    // The still this step falls back to when there is no scripting.
    still: "M4",
    seen: "File",
    text: "打开这次运行产生的文件，沿原始内容继续阅读与审阅。",
    status: "verified with synthetic data",
    view: "file",
    key: "workspaceFiles",
    run: 0,
  },
  {
    id: "stop",
    seen: "Stop · reconnect",
    text: "取消 Run，关掉页面，再回来：Chat 显示最后一次确认的状态。",
    status: "not recorded in this replay",
    view: "absent",
    key: "—",
    run: 0,
    // This recording holds two completed runs and no cancellation, so the step
    // has words but no recorded fact behind it. It says so rather than
    // borrowing another step's screen.
    absent:
      "此段回放未收录取消与重连。",
  },
  {
    id: "continue",
    // The still this step falls back to when there is no scripting.
    still: "M5",
    seen: "Continue in Work",
    text: "把会话接入 Matter，带着既有历史继续同一件工作。",
    status: "verified with synthetic data",
    view: "surface",
    key: "surface.bound",
    surface: "bound",
    run: 1,
  },
  {
    id: "candidate",
    // The still this step falls back to when there is no scripting.
    still: "M6",
    seen: "Candidate → Decision",
    text: "候选逐条附证据与来源。人接受、退回，或要求补证据；正式成果与候选分开。",
    status: "verified with synthetic data",
    view: "surface",
    key: "surface.pending",
    surface: "pending",
    run: 1,
    // The recorded states this step can be switched between, in the order the
    // capture produced them.
    surfaces: ["pending", "accepted", "revised", "history"],
  },
];

// The fixed sentence the specimen carries, in both languages (public-copy-v2 §3).
export const REPLAY_NOTE = [
  "Interactive replay · synthetic NDA",
  "逐步查看一次 NDA 工作的完整记录。",
];

export const LAYERS = [
  { id: "events", label: "Event log" },
  { id: "surface", label: "Work state" },
  { id: "context", label: "Compiled context" },
];
