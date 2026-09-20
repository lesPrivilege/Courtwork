/* Preview wiring only. It builds the synthetic adapter, hands it to the same
 * controller and view the product would use, and exposes the scenario switches
 * this journey has to be looked at under. It contains no product behaviour: if
 * something here had to grow a rule, that rule belongs in the controller.
 */

import { installTooltips } from "/web/ui-controls.mjs";
import { createAgentProfilesController } from "/web/agent-profiles.mjs";
import { createAgentProfilesView } from "/web/agent-profiles-view.mjs";
import { createAgentProfilesFixture } from "./adapter.mjs";

let slow = false;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, slow ? ms * 6 : ms));

const adapter = createAgentProfilesFixture({ pause });
const controller = createAgentProfilesController({ adapter });
createAgentProfilesView(document.querySelector("#agent-profiles-mount"), controller);

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
