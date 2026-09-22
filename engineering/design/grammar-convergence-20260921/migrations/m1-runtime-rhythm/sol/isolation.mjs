import { el } from "/web/ui-controls.mjs";
import { settingsRow } from "/web/settings-view.mjs";
import { createRuntimeManagementController } from "/web/runtime-management.mjs";
import { createRuntimeManagementView } from "/web/runtime-management-view.mjs";
import { createRuntimeManagementFixture } from "/adapter.mjs";

const sibling = document.querySelector("#sibling-mount");
const choice = el("select", { attrs: { "aria-label": "Synthetic sibling setting" } },
  el("option", { text: "Synthetic value" }));
sibling.append(
  el("div", { className: "settings-block", attrs: { "data-testid": "sibling-settings-block" } },
    el("h4", { className: "settings-block-title", text: "Unrelated setting" }),
    settingsRow("Synthetic sibling setting", "Evidence-only control outside the Runtime mount.", choice)),
  el("div", { className: "settings-block" }, el("h4", { className: "settings-block-title", text: "Next sibling group" })),
);

const listMount = document.querySelector("#list-mount");
const listController = createRuntimeManagementController({ adapter: createRuntimeManagementFixture({ pause: async () => {} }) });
createRuntimeManagementView(listMount, listController);
await listController.openList();

const detailMount = document.querySelector("#detail-mount");
const detailController = createRuntimeManagementController({ adapter: createRuntimeManagementFixture({ pause: async () => {} }) });
createRuntimeManagementView(detailMount, detailController);
await detailController.openList();
await detailController.openRuntime("rt-pi");

const read = (target) => getComputedStyle(target).getPropertyValue("--settings-group-gap").trim();
document.querySelector("#sibling-readout").textContent = `Inherited --settings-group-gap: ${read(sibling)}`;
document.querySelector("#list-readout").textContent = `Inherited --settings-group-gap: ${read(listMount)}`;
const boundary = detailMount.querySelector('[data-testid="runtime-detail-rhythm"]');
document.querySelector("#detail-readout").textContent = `Inherited --settings-group-gap: ${read(boundary)}`;
