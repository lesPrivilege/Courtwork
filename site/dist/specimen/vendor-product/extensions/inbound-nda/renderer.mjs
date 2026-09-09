/*
 * Trusted local renderer for the inbound NDA playbook review (WO-WK10b 第二段).
 *
 * The same contract the evidence-memo renderer already keeps: the module is
 * handed a projection and the host's typed callbacks, and nothing else. It has
 * no fetch, no URL, no storage, no provider and no Core access; the historical
 * source bytes it shows are read through the host's typed `query`, which is the
 * host's own GET route, not a channel this module can point anywhere (FN-21).
 * Every string that came from the packet is written with `textContent`.
 *
 * It draws exactly what the packet advertises. A decision button exists only
 * because `humanActions` carries a `decide` descriptor whose enum names that
 * decision; a revision form exists only because `revise_candidate` is
 * advertised for that candidate. The server revalidates all of it (FN-17), and
 * this module never computes whether a review is complete.
 *
 * The row anatomy, the per-rule reading and the words for a decision come from
 * the host's own kit, so the read-only fallback and this renderer cannot state
 * one work state two different ways.
 */
import { el, flowRow } from "../../web/ui-controls.mjs";
import {
  workPacket,
  renderWorkPacket,
  candidateActions,
  decisionActionWords,
  shortRef,
} from "../../web/surface-modules.mjs";

const REASON_REQUIRED = "A reason is required for this decision.";
const SENDING = "Sending…";
const NOT_ACKNOWLEDGED =
  "The decision was not acknowledged. Sending it again uses the same request.";

/* FN-19 · one request identity per (candidate, base version, decision, reason).
 * Retrying after a lost acknowledgement sends the same identity and the same
 * bytes, so Core answers with the one Decision it already recorded. Editing the
 * reason is a different request, and gets a new identity. */
function requestKey(payload) {
  return JSON.stringify([
    payload.candidate_id,
    payload.base_version,
    payload.action,
    payload.reason,
  ]);
}

function newId(prefix) {
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

/* The vocabulary of finding statuses is not advertised anywhere in the packet,
 * so the revision form suggests the words this packet actually uses and lets a
 * person write another one. The adapter verifies the whole proposal against the
 * current sources and facts before anything is saved; the frontend does not
 * decide which words are legal (NDA seam, FN-17). */
function observedStatuses(packet) {
  const seen = new Set();
  for (const candidate of packet.candidates)
    for (const finding of candidate.review?.findings || [])
      if (typeof finding.status === "string") seen.add(finding.status);
  return [...seen].sort();
}

export function mount({ container, projection, dispatch, signal, query } = {}) {
  if (!container || typeof container.replaceChildren !== "function")
    throw new TypeError("container is required");
  if (typeof dispatch !== "function") throw new TypeError("dispatch is required");

  /* Everything a person has typed or opened survives a projection update: a
   * 409 refresh must not eat the reason draft, and opening a rule must not be
   * undone by the next read (FN-23, WO-WK10b 第二段「保留 reason 草稿」). */
  const reasons = new Map();
  const expanded = new Set();
  const revisions = new Map();
  const requestIds = new Map();
  const notices = new Map();
  const busy = new Set();

  let disposed = false;
  let current = projection ?? null;
  const onAbort = () => {
    disposed = true;
  };
  signal?.addEventListener?.("abort", onAbort, { once: true });
  const live = () => !disposed && !signal?.aborted;

  function notice(candidateId, kind, text) {
    if (text === null) notices.delete(candidateId);
    else notices.set(candidateId, { kind, text });
  }

  function decisionControls(candidate, advertised) {
    const section = el("section", { className: "candidate-actions" });
    const field = el("label", { className: "work-field", text: "Reason" });
    const reason = el("textarea", {
      attrs: {
        rows: 2,
        name: `reason-${candidate.id}`,
        placeholder: "Why this decision",
      },
    });
    reason.value = reasons.get(candidate.id) || "";
    reason.addEventListener("input", () => reasons.set(candidate.id, reason.value));
    field.append(reason);
    section.append(field);
    section.append(
      el("p", {
        className: "work-note",
        text: "The reason is recorded with the decision.",
      }),
    );
    const actions = el("div", { className: "work-actions" });
    for (const decision of advertised.decisions) {
      const label = decisionActionWords[decision] || decision.replaceAll("_", " ");
      const button = el("button", {
        className: decision === "accept" ? "primary-button" : "secondary-button",
        attrs: { type: "button", "data-decision": decision },
        text: label,
      });
      button.disabled = busy.has(candidate.id);
      button.addEventListener("click", () => void decide(candidate, advertised, decision));
      actions.append(button);
    }
    section.append(actions);
    const held = notices.get(candidate.id);
    if (held)
      section.append(
        el("p", {
          className: held.kind === "error" ? "inline-error" : "work-note",
          text: held.text,
        }),
      );
    return section;
  }

  async function decide(candidate, advertised, decision) {
    const text = (reasons.get(candidate.id) || "").trim();
    if (!text) {
      notice(candidate.id, "error", REASON_REQUIRED);
      render();
      container.querySelector(`textarea[name="reason-${CSS.escape(candidate.id)}"]`)?.focus();
      return;
    }
    /* The payload is built to the descriptor the packet carries: the candidate
     * and the base version are the descriptor's own constants, never this
     * view's idea of the current version. */
    const payload = {
      request_id: "",
      candidate_id: advertised.candidateId,
      base_version: advertised.baseVersion,
      action: decision,
      reason: text,
    };
    const key = requestKey(payload);
    if (!requestIds.has(key)) requestIds.set(key, newId("decide"));
    payload.request_id = requestIds.get(key);
    busy.add(candidate.id);
    notice(candidate.id, "info", SENDING);
    render();
    try {
      await dispatch("decide", payload);
      if (!live()) return;
      /* Confirmed: the draft and the request identity are done. The receipt is
       * the host's to show; this view does not announce a success of its own. */
      reasons.delete(candidate.id);
      requestIds.delete(key);
      notice(candidate.id, null, null);
    } catch (error) {
      if (!live()) return;
      /* Three outcomes are kept apart (FE-T06): refused by the current state,
       * refused for a stated reason, and not acknowledged at all. Only the last
       * keeps the same request identity for a retry, and none of them is
       * replayed automatically (FN-19). */
      const refused = Number.isFinite(error?.status) && error.status < 500;
      if (refused) requestIds.delete(key);
      notice(candidate.id, "error", refused ? error.message : NOT_ACKNOWLEDGED);
    } finally {
      busy.delete(candidate.id);
      if (live()) render();
    }
  }

  function revisionForm(candidate, advertised, packet) {
    const details = el("details", { className: "candidate-revision" });
    details.open = revisions.has(candidate.id);
    details.append(
      flowRow("summary", { glyph: "square-pen", title: "Propose a revision" }),
    );
    const body = el("div", { className: "revision-body" });
    body.append(
      el("p", {
        className: "work-note",
        text: "A revision is saved as a new candidate at the current version. The earlier candidate and any decision on it stay as they are.",
      }),
      el("p", {
        className: "work-note",
        text: "The extension re-checks every finding against the current sources and facts before saving.",
      }),
    );
    const draft = revisions.get(candidate.id) || {
      findings: (candidate.review?.findings || []).map((finding) => ({
        ruleId: finding.ruleId,
        status: finding.status ?? "",
        reason: finding.reason ?? "",
      })),
    };
    const statuses = observedStatuses(packet);
    const listId = `nda-statuses-${candidate.id}`;
    if (statuses.length) {
      const list = el("datalist", { attrs: { id: listId } });
      for (const status of statuses) list.append(el("option", { attrs: { value: status } }));
      body.append(list);
    }
    for (const finding of draft.findings) {
      const row = el("div", { className: "revision-rule" });
      row.append(el("p", { className: "revision-rule-id", text: finding.ruleId || "Rule" }));
      const statusField = el("label", { className: "work-field", text: "Status" });
      const status = el("input", {
        attrs: {
          type: "text",
          name: `status-${candidate.id}-${finding.ruleId}`,
          ...(statuses.length ? { list: listId } : {}),
        },
      });
      status.value = finding.status;
      status.addEventListener("input", () => {
        finding.status = status.value;
        revisions.set(candidate.id, draft);
      });
      statusField.append(status);
      const reasonField = el("label", { className: "work-field", text: "Reason" });
      const reason = el("textarea", {
        attrs: { rows: 2, name: `revision-reason-${candidate.id}-${finding.ruleId}` },
      });
      reason.value = finding.reason;
      reason.addEventListener("input", () => {
        finding.reason = reason.value;
        revisions.set(candidate.id, draft);
      });
      reasonField.append(reason);
      row.append(statusField, reasonField);
      body.append(row);
    }
    const save = el("button", {
      className: "secondary-button",
      attrs: { type: "button" },
      text: "Save this revision",
    });
    save.disabled = busy.has(`revision:${candidate.id}`);
    save.addEventListener("click", () => void revise(candidate, advertised, draft));
    body.append(el("div", { className: "work-actions" }, save));
    const held = notices.get(`revision:${candidate.id}`);
    if (held)
      body.append(
        el("p", {
          className: held.kind === "error" ? "inline-error" : "work-note",
          text: held.text,
        }),
      );
    details.append(body);
    details.addEventListener("toggle", () => {
      if (details.open) revisions.set(candidate.id, draft);
      else revisions.delete(candidate.id);
    });
    return details;
  }

  async function revise(candidate, advertised, draft) {
    const key = `revision:${candidate.id}`;
    if (!candidate.domainRaw) {
      notice(key, "error", "This candidate carries no readable review to revise.");
      render();
      return;
    }
    /* The proposal starts from the parent's own bytes and changes only what a
     * person edited. Nothing is recomputed here: reconciliation, facts and the
     * versions travel unchanged, and the extension decides whether the result
     * verifies. */
    const domain = structuredClone(candidate.domainRaw);
    domain.findings = (Array.isArray(domain.findings) ? domain.findings : []).map((finding) => {
      const edited = draft.findings.find((item) => item.ruleId === finding.ruleId);
      return edited ? { ...finding, status: edited.status, reason: edited.reason } : finding;
    });
    const payload = {
      candidate_id: advertised.candidateId,
      /* A fresh identity per attempt: Core refuses a reused id whose content
       * changed, and a revision has no idempotent receipt to replay. */
      new_candidate_id: newId("revision"),
      base_version: advertised.baseVersion,
      proposal: { domain },
    };
    busy.add(key);
    notice(key, "info", SENDING);
    render();
    try {
      await dispatch("revise_candidate", payload);
      if (!live()) return;
      revisions.delete(candidate.id);
      notice(key, null, null);
    } catch (error) {
      if (!live()) return;
      notice(key, "error", error.message);
    } finally {
      busy.delete(key);
      if (live()) render();
    }
  }

  function hooks(packet) {
    return {
      expanded,
      onToggle(candidateId, ruleId, open) {
        const memory = `${candidateId}|${ruleId}`;
        if (open) expanded.add(memory);
        else expanded.delete(memory);
      },
      onReadSource:
        typeof query === "function"
          ? (request) => query("source", request)
          : null,
      candidateControls(candidate) {
        if (packet.readOnly) return null;
        const advertised = candidateActions(packet, candidate.id);
        if (!advertised.decide && !advertised.revise) return null;
        const wrap = el("div", { className: "candidate-controls" });
        if (advertised.decide && advertised.decide.decisions.length)
          wrap.append(decisionControls(candidate, advertised.decide));
        if (advertised.revise)
          wrap.append(revisionForm(candidate, advertised.revise, packet));
        return wrap;
      },
    };
  }

  function render() {
    if (!live()) return;
    const packet = workPacket(current);
    const root = el("div", { className: "se-extension nda-review" });
    root.dataset.extension = "inbound-nda";
    root.append(
      flowRow("div", {
        glyph: "plug",
        title: packet?.title || "Inbound NDA Review",
        meta: packet?.readOnly ? "Read only" : null,
        className: "surface-state-row",
      }),
    );
    if (!packet) {
      root.append(
        el("p", {
          className: "work-note",
          text: "No read-only projection is available yet.",
        }),
      );
      container.replaceChildren(root);
      return;
    }
    const envelope = [];
    if (packet.contractVersion) envelope.push(packet.contractVersion);
    if (packet.compatibility && packet.compatibility !== "supported")
      envelope.push(String(packet.compatibility).replaceAll("_", " "));
    if (envelope.length)
      root.append(el("p", { className: "work-note", text: envelope.join(" · ") }));
    /* The sentence the host already uses for a reading that carries no legal
     * action. There is one wording for this fact in the product, not two. */
    if (packet.readOnly || !packet.humanActions.length)
      root.append(
        el("p", {
          className: "work-note",
          text: "No action is declared on this reading.",
        }),
      );
    root.append(renderWorkPacket(packet, hooks(packet)));
    container.replaceChildren(root);
  }

  const update = (next) => {
    if (!live()) return;
    current = next ?? null;
    render();
  };

  update(projection ?? null);
  return {
    update,
    dispose() {
      disposed = true;
      signal?.removeEventListener?.("abort", onAbort);
    },
  };
}
