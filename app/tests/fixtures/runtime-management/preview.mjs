/* Preview wiring only. It builds the synthetic adapter, hands it to the same
 * controller and view the product would use, and exposes the scenario switches
 * this journey has to be looked at under. It contains no product behaviour: a
 * rule that had to grow here would belong in the controller.
 */

import { installTooltips } from "/web/ui-controls.mjs";
import { createRuntimeManagementController } from "/web/runtime-management.mjs";
import { createRuntimeManagementView } from "/web/runtime-management-view.mjs";
import { createRuntimeManagementFixture } from "./adapter.mjs";

let slow = false;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, slow ? ms * 6 : ms));

const adapter = createRuntimeManagementFixture({ pause });
const controller = createRuntimeManagementController({ adapter });
createRuntimeManagementView(document.querySelector("#runtimes-mount"), controller);

/* The adapter's own record of calls and effects, for evidence capture. It is
 * read-only and lists nothing a production page would hold. */
globalThis.__runtimeManagementPreview = { trace: () => adapter.trace() };

const variant = document.querySelector("#variant-select");
variant.addEventListener("change", () => {
  adapter.configure(variant.value);
  void controller.reset();
});
document.querySelector("#slow-toggle").addEventListener("change", (event) => {
  slow = event.target.checked;
});
document.querySelector("#theme-select").addEventListener("change", (event) => {
  document.documentElement.dataset.theme = event.target.value;
});
document.querySelector("#reset-preview").addEventListener("click", () => {
  adapter.reset();
  variant.value = "normal";
  void controller.reset();
});

installTooltips();
void controller.openList();
