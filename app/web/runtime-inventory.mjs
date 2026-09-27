/* Settings → Agents → Runtimes · the Host's execution runtime inventory,
 * read only (06c production I1).
 *
 * The Host reports `executionRuntimes` inside `GET /runtime-info` (see
 * app/docs/runtime-foundation.md). This controller holds the last reading of
 * it and which runtime is on screen; it adds no fact of its own. The whole
 * inventory arrives in one read, so a list and a detail are two views of the
 * same reading, and a refresh from either re-reads everything.
 *
 * Kept from the accepted synthetic journey (runtime-management.mjs):
 *   - the previous reading stays on screen while a refresh is out, and is
 *     named as the previous reading;
 *   - a failed read is not an empty list, and it keeps the last good reading;
 *   - only the newest read lands, so a slow reply cannot overwrite a newer one;
 *   - a reply never navigates: leaving a runtime is the person's move only.
 * Nothing here connects, checks, selects or changes a runtime.
 */

const clone = (value) => structuredClone(value);

/* A Host that does not report the inventory — older than I1, or a shape this
   page does not know — has not reported "no runtimes". It is a failed read. */
export const NOT_REPORTED = "This Host did not report its execution runtimes.";

export function inventoryOf(info) {
  const inventory = info?.executionRuntimes;
  if (!inventory || inventory.schemaVersion !== 1 || !Array.isArray(inventory.items)) return null;
  return { defaultAdapterId: inventory.defaultAdapterId ?? null, items: inventory.items };
}

/** `read()` resolves to the Host's `runtime-info` answer. */
export function createRuntimeInventoryController({ read }) {
  const listeners = new Set();
  let view = "list";
  let selectedId = null;
  /* The row the list returns to. */
  let anchorId = null;
  let reading = { status: "idle", inventory: null, error: "" };
  let epoch = 0;

  const getState = () => clone({ view, selectedId, anchorId, reading });
  const emit = () => {
    const state = getState();
    for (const listener of listeners) listener(state);
  };

  const api = {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },

    /** Read the inventory again. Whatever is on screen stays until it answers. */
    async refresh() {
      const own = ++epoch;
      reading = { ...reading, status: "loading", error: "" };
      emit();
      let next;
      try {
        const inventory = inventoryOf(await read());
        next = inventory
          ? { status: "ready", inventory, error: "" }
          : { status: "error", inventory: reading.inventory, error: NOT_REPORTED };
      } catch (error) {
        next = { status: "error", inventory: reading.inventory, error: error?.message || "The runtimes could not be read." };
      }
      if (own !== epoch) return;
      reading = next;
      emit();
    },

    openRuntime(id) {
      view = "runtime";
      selectedId = id;
      anchorId = id;
      emit();
    },

    /** Back to the list, returning to the runtime that was open. */
    openList() {
      view = "list";
      selectedId = null;
      emit();
    },
  };
  return api;
}
