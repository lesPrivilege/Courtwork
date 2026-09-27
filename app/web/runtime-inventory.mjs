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
/* A supported version whose contents this page cannot read is a failed read
   too, said as such (RFS-R1). */
export const UNREADABLE = "This Host's runtime report could not be read.";

/* RFS-R1 · every field the view reads is checked before a reading is kept, so
   a malformed row is a failed read, never a half-drawn page or a poisoned
   "last good" reading. Unknown but well-shaped ids, operation names and reason
   codes are data and pass; nothing is repaired or inferred. */
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.length > 0;
const isTextOrNull = (value) => value === null || typeof value === "string";

function validOperation(support) {
  return isObject(support) && typeof support.supported === "boolean" &&
    (support.reason === undefined || isTextOrNull(support.reason));
}

function validItem(item) {
  if (!isObject(item) || !isText(item.adapterId) || typeof item.configured !== "boolean") return false;
  if (item.configurationOwner !== "host" || item.liveStatus !== "not_checked") return false;
  if (!isTextOrNull(item.revision) || !isTextOrNull(item.configurationRef)) return false;
  if (item.capabilities !== null && !(isObject(item.capabilities) && Object.values(item.capabilities).every(validOperation))) return false;
  const { availability } = item;
  return isObject(availability) && ["configured", "unavailable"].includes(availability.status) &&
    isTextOrNull(availability.reasonCode) && isTextOrNull(availability.reason);
}

/** `{ inventory }` for a reading this page can show, else `{ error }`. */
export function readInventory(info) {
  const inventory = info?.executionRuntimes;
  if (!isObject(inventory) || inventory.schemaVersion !== 1) return { error: NOT_REPORTED };
  const { items } = inventory;
  if (!isText(inventory.defaultAdapterId) || !Array.isArray(items) || !items.every(validItem) ||
    new Set(items.map((item) => item.adapterId)).size !== items.length) return { error: UNREADABLE };
  return { inventory: { defaultAdapterId: inventory.defaultAdapterId, items } };
}

export const inventoryOf = (info) => readInventory(info).inventory ?? null;

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
        const result = readInventory(await read());
        next = result.inventory
          ? { status: "ready", inventory: result.inventory, error: "" }
          : { status: "error", inventory: reading.inventory, error: result.error };
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
