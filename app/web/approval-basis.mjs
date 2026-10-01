/* The basis of one approval: what is being approved, as the Host recorded it
 * with the request. One presentation for every surface that can answer or read
 * back an approval (the Chat card and the Attention assistant), so no surface
 * offers Approve with less than another shows (UX-02).
 *
 * Everything here is a function of the request payload, the Session's events
 * and the Run's recorded binding. Buttons, answer wiring and disclosure state
 * stay with the surface. */
import { el as element, copyAction } from "./ui-controls.mjs";
import { formatBytes } from "./inspector.mjs";
import {
  normalizedType,
  validPermission,
  permissionPresentation,
  candidateAuthoredFiles,
  checkAuthoredFilesSentence,
} from "./thread-projection.mjs";

// The binding the Host recorded for this Run, never the current catalog.
export function runBinding(events, runId) {
  return (events || []).find((event) => event.runId === runId && normalizedType(event.type) === "runtime/bound")?.data;
}

/* RD-006 / 02 · which private candidate an approval was asked about, and the
 * revision it was bound to, exactly as the Host recorded them with the request.
 *
 * It is drawn in both places a request is read: on the card while the decision
 * is open, and inside the record the transcript keeps after it is decided. The
 * second is where it earns its keep — looking back at what you approved is the
 * question the current candidate cannot answer, because by then it may have
 * taken more writes, been stopped, or been replaced by one built from a
 * different commit. Nothing here reads the Session, the binding or the live
 * candidate, and a revision the Host did not record is not drawn at all. */
function recordedApprovalIdentity(candidate) {
  if (!candidate) return [];
  const recorded = element("dl", { className: "data-list" });
  const line = (term, value) =>
    recorded.append(element("dt", { text: term }), element("dd", {}, value));
  line("Private candidate", element("code", { text: candidate.id }));
  if (candidate.revision !== null) line("Candidate revision", String(candidate.revision));
  if (candidate.writeRevision !== null) line("Write revision", String(candidate.writeRevision));
  return [
    recorded,
    element("p", { className: "form-help", text: "As recorded when this approval was requested." }),
  ];
}
/* Review D4 · a check executes the files the model wrote into the private
 * candidate, inside the Host's OS sandbox, not only the recipe's command. Both
 * the open card and the decided record name those files from the Host's
 * confirmed-write receipts, bounded by the write revision the request was
 * bound to (candidateAuthoredFiles). R30-2 · only the open request states what
 * this Host will do now; a decided record names the files and nothing more. */
function checkAuthoredFiles(events, payload, { live = false } = {}) {
  if (payload?.tool !== "check_run") return [];
  const files = candidateAuthoredFiles(events, payload);
  if (!files.length)
    return [element("p", { className: "form-help", text: "The Host has no record of the model writing files into this candidate." })];
  const shown = files.slice(0, 20);
  const list = element("dl", { className: "data-list" });
  for (const file of shown)
    list.append(element("dt", {}, element("code", { text: file.path })), element("dd", {}, file.sha256 ? element("code", { text: file.sha256.slice(0, 12) }) : "Write outcome unknown"));
  return [
    element("p", {
      className: "form-help",
      text: checkAuthoredFilesSentence(files.length, { live }),
    }),
    list,
    ...(files.length > shown.length
      ? [element("p", { className: "form-help", text: `And ${files.length - shown.length} more.` })]
      : []),
  ];
}

/* The request while its decision is open. A payload the Host's envelope does
 * not validate still names what it can; the surface decides whether that is
 * enough to offer an answer (it is not: see validPermission). */
export function openApprovalBasis(payload, events, binding) {
  const display = permissionPresentation(payload, binding);
  const nodes = [
    element("h3", { text: display.title }),
    element("p", {
      className: "file-name",
      text: display.target,
    }),
  ];
  if (display.scope) nodes.push(element("p", { className: "form-help", text: display.scope }));
  if (display.source) nodes.push(element("p", { className: "form-help", text: `Recorded source: ${display.source}` }));
  nodes.push(...checkAuthoredFiles(events, payload, { live: true }));
  if (validPermission(payload)) {
    nodes.push(
      element("p", {
        className: "form-help",
        text: `${formatBytes(payload.bytes)} · Approval for this exact ${display.noun} only`,
      }),
      element("pre", {
        className: "permission-preview",
        text: payload.preview,
      }),
      element(
        "details",
        {},
        element("summary", { text: display.details }),
        ...recordedApprovalIdentity(display.candidate),
        element("code", { text: payload.contentSha256 }),
        copyAction(payload.contentSha256, display.hashLabel),
      ),
    );
  }
  return { display, nodes };
}

/* The decided request, read back. It keeps every fact it had and states only
 * what was recorded; `meta` is the decision word for the surface's own row. */
export function recordedApprovalBasis(payload, events, binding, decision) {
  const display = permissionPresentation(payload, binding);
  const nodes = [
    element("p", {
      className: "intervention-scope",
      text:
        decision === "allow"
          ? `Approval recorded for this exact ${display.noun}. Review acceptance is not recorded here.`
          : decision === "deny"
            ? `Approval denied for this exact ${display.noun}.`
            : "This request closed without a recorded decision.",
    }),
    element("pre", {
      className: "permission-preview",
      text: payload.preview,
    }),
  ];
  if (display.scope) nodes.push(element("p", { className: "form-help", text: display.scope }));
  if (display.source) nodes.push(element("p", { className: "form-help", text: `Recorded source: ${display.source}` }));
  nodes.push(...checkAuthoredFiles(events, payload));
  nodes.push(...recordedApprovalIdentity(display.candidate));
  return {
    display,
    meta: `${display.label} ${decision === "allow" ? "approved" : decision === "deny" ? "denied" : "closed"}`,
    nodes,
  };
}
