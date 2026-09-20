/* Preparing the place the work will happen, before any inference is paid for.
 *
 * Three Host commands in order — create the Chat, bind the folder, create the
 * private candidate — and nothing else. None of them needs a Run: the Host asks
 * a candidate for an active binding, no active Run and a real base commit
 * (service.mjs #changeRepositoryCandidate), and has never asked that a Run
 * happened. So this sequence sends no message, admits no Run and calls no
 * model.
 *
 * What makes it safe to retry is the marker. Every identity is minted once and
 * handed to `persist` *before* the command that uses it goes out, so a reply
 * lost to a refresh, a dropped connection or a closed tab is replayed against
 * the same ids: the Host answers the original receipt instead of creating a
 * second Chat, a second binding or a second candidate. The marker is the same
 * object the Home start already keeps in session storage, and each step is
 * skipped when the Session read back says it is already done — so a resumed
 * preparation finishes the part that is missing rather than starting over.
 *
 * This module holds no state, reads no DOM, and owns no draft: the caller keeps
 * the Home draft and its materials exactly where they were, and decides what to
 * show. Nearest precedent: app.mjs `submitHomeRun`, which already uses this
 * discipline for the Chat and the binding; the candidate is the third step it
 * never had a reason to take.
 */
import { activeRepositoryBinding, activeRepositoryCandidate } from "./workspace-card.mjs";

export const PREPARE_NO_FOLDER = "Connect a folder before preparing a chat for it.";
export const PREPARE_NO_RECEIPT = "Creating the chat returned no matching receipt.";
export const PREPARE_NOT_BOUND = "The folder is not connected to this chat.";
export const PREPARE_NO_GIT = "This folder has no Git commit to start from, so edits stay unavailable.";

const readSession = async (request, id) =>
  (await request(`/sessions/${encodeURIComponent(id)}`)).session;

/**
 * Bring `marker` up to "this Chat exists, reads that folder, and has a private
 * candidate", doing only the steps that are still missing.
 *
 * `marker` is mutated in place and is the caller's to persist: `persist` is
 * called after every identity is minted and after every receipt is adopted, and
 * must be synchronous and cheap. Returns the Session the Host last reported.
 */
export async function prepareChat({
  request,
  marker,
  rootPath,
  title,
  permissionMode,
  newId = () => crypto.randomUUID(),
  persist = () => {},
}) {
  if (typeof rootPath !== "string" || !rootPath) throw new Error(PREPARE_NO_FOLDER);
  const projectId = marker.projectId ?? null;

  if (!marker.session) {
    marker.sessionId ||= newId();
    persist();
    const result = await request("/sessions", {
      method: "POST",
      body: { projectId, sessionId: marker.sessionId, title, permissionMode },
    });
    /* The id was chosen here, so the receipt is checkable rather than
     * trustworthy: a Session that is not the one asked for is not adopted. */
    if (result?.session?.id !== marker.sessionId || (result.session.projectId ?? null) !== projectId)
      throw new Error(PREPARE_NO_RECEIPT);
    marker.session = result.session;
    persist();
  }

  const id = marker.session.id;

  if (activeRepositoryBinding(marker.session) === null) {
    marker.bindRequestId ||= newId();
    persist();
    await request(`/sessions/${encodeURIComponent(id)}/repository-binding`, {
      method: "PUT",
      body: {
        operation: "bind",
        requestId: marker.bindRequestId,
        expectedRevision: marker.session.repositoryBindingRevision ?? 0,
        rootPath,
      },
    });
    // The bind receipt is not a Session; the Session is read back so the next
    // step's expected revisions are the Host's, never this client's arithmetic.
    marker.session = await readSession(request, id);
    persist();
  }

  if (activeRepositoryCandidate(marker.session) === null) {
    const binding = activeRepositoryBinding(marker.session);
    if (!binding) throw new Error(PREPARE_NOT_BOUND);
    // The base commit is a live Host reading of the folder, never a guess.
    const inspection = await request(`/repositories/inspect?rootPath=${encodeURIComponent(binding.rootPath)}`);
    const head = inspection?.git?.head;
    if (typeof head !== "string" || !head) throw new Error(PREPARE_NO_GIT);
    marker.candidateRequestId ||= newId();
    marker.candidateId ||= newId();
    persist();
    await request(`/sessions/${encodeURIComponent(id)}/repository-candidate`, {
      method: "PUT",
      body: {
        operation: "create",
        requestId: marker.candidateRequestId,
        expectedRevision: marker.session.repositoryCandidateRevision ?? 0,
        expectedBindingRevision: binding.revision,
        candidateId: marker.candidateId,
        baseCommit: head,
      },
    });
    marker.session = await readSession(request, id);
    persist();
  }

  return marker.session;
}
