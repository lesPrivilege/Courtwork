/* The one fixed sample the Settings preview shows. It is a display sample of a
 * file change, not a recorded artifact comparison: no file-diff request backs
 * it and no decision is attached to it. The same rows feed the Pages figure of
 * this change language so both surfaces speak from one fixture. */
export const DIFF_PREVIEW = Object.freeze({
  file: "notice.md",
  label: "Sample change in notice.md",
  lines: Object.freeze([
    { kind: "context", oldNo: 12, newNo: 12, text: "## Termination" },
    { kind: "context", oldNo: 13, newNo: 13, text: "" },
    { kind: "del", oldNo: 14, text: "Either party may end this agreement at will." },
    { kind: "add", newNo: 14, text: "Either party may end this agreement on 30 days' written notice." },
    { kind: "context", oldNo: 15, newNo: 15, text: "Notice is effective when received." },
    { kind: "add", newNo: 16, text: "Obligations accrued before the end date survive termination." },
  ]),
});
