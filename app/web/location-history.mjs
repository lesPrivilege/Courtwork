/* FE-NAV-01…03 · the Shell's own trail of places.
 *
 * A place is a semantic location — Home, or one Chat (Session) — not a page
 * drawn over it: Settings, the Chat list and Attention are layers that close
 * first, and a Back command never reaches past them (navigation.md §3). The
 * browser's history and hash are untouched: the hash stays the Settings deep
 * link it already is, nothing is pushed there, so there is no second stack to
 * fall out of step with this one.
 *
 * An entry carries identity (kind, sessionId, projectId), a title for the
 * control's name, what the view owner wants restored on return (a scroll
 * anchor; drafts stay with the Session and are only referenced by id), and
 * whether the real reader last said the object is unavailable. Entries live
 * in memory for this window; nothing here is authorisation, and a stale
 * entry is resolved through the reader every time it is visited. */

export const HISTORY_LIMIT = 50;

export function sameLocation(a, b) {
  return Boolean(a && b) && a.kind === b.kind && (a.sessionId ?? null) === (b.sessionId ?? null);
}

/** The destination word for Back / Forward: a place, never a guess. */
export function describeLocation(entry) {
  if (!entry) return "";
  if (entry.kind === "home") return "Home";
  return entry.title?.trim() || "Untitled chat";
}

export function createLocationHistory({ limit = HISTORY_LIMIT } = {}) {
  const entries = [];
  let index = -1;
  const api = {
    get length() { return entries.length; },
    get index() { return index; },
    snapshot() { return entries.map((entry) => ({ ...entry })); },
    current() { return entries[index] ?? null; },
    canBack() { return index > 0; },
    canForward() { return index < entries.length - 1; },
    peekBack() { return entries[index - 1] ?? null; },
    peekForward() { return entries[index + 1] ?? null; },
    /** Arrival at a place. The same place refreshes the current entry (its
     * title, its availability) and pushes nothing; a different place cuts the
     * forward trail and is pushed; the trail is bounded from the far end. */
    arrive(location) {
      const current = entries[index];
      if (current && sameLocation(current, location)) {
        if (location.title) current.title = location.title;
        current.unavailable = false;
        current.reason = null;
        return { pushed: false, entry: current };
      }
      entries.splice(index + 1);
      entries.push({ kind: location.kind, sessionId: location.sessionId ?? null, projectId: location.projectId ?? null, title: location.title ?? null, restore: null, unavailable: false, reason: null });
      if (entries.length > limit) entries.splice(0, entries.length - limit);
      index = entries.length - 1;
      return { pushed: true, entry: entries[index] };
    },
    /** What the view owner wants back on return; references only. */
    remember(restore) {
      const current = entries[index];
      if (current) current.restore = restore ?? null;
    },
    /** Move the pointer. The caller resolves the entry through the real
     * reader; a move past either end changes nothing. */
    back() { if (!api.canBack()) return null; index -= 1; return entries[index]; },
    forward() { if (!api.canForward()) return null; index += 1; return entries[index]; },
    /** The reader could not open the place: it stays on the trail, marked,
     * so Back can continue past it; it is never rebuilt or swapped for a
     * same-named object. */
    markUnavailable(entry, reason = null) {
      const found = entries.includes(entry) ? entry : entries[index];
      if (!found) return;
      found.unavailable = true;
      found.reason = reason;
    },
    /** A renamed Chat keeps its identity; only the word on the control changes. */
    retitle(sessionId, title) {
      for (const entry of entries) if (entry.sessionId === sessionId) entry.title = title;
    },
    /** An object the app itself removed: every entry that refers to it is marked. */
    forget(sessionId) {
      for (const entry of entries) if (entry.sessionId === sessionId) { entry.unavailable = true; entry.reason = entry.reason ?? "deleted"; }
    },
  };
  return api;
}
