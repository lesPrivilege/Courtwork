/* 06c production I1 · Settings → Agents → Runtimes, read only.
 *
 * Every case drives the production controller (runtime-inventory.mjs) and the
 * production view (runtime-inventory-view.mjs) under tiny-dom. The Host-backed
 * case at the end reads a real disposable Host's `runtime-info` before any
 * Session exists, through the same controller.
 *
 * tiny-dom does not move focus to <body> when the focused node is removed, as
 * a browser does; `page()` applies that rule to the mount's own re-render. */
import assert from "node:assert/strict";
import test from "node:test";
import { rm } from "node:fs/promises";
import { createRuntimeInventoryController, inventoryOf, NOT_REPORTED } from "../web/runtime-inventory.mjs";
import { createRuntimeInventoryView, runtimeName } from "../web/runtime-inventory-view.mjs";
import { withTinyDom, flush, press, deferred } from "./tiny-dom.mjs";
import { boot } from "./helpers.mjs";
import { MANAGED_EXECUTOR_ID, PI_EXECUTOR_ID } from "../server/executor-choice-state.mjs";

/* The shape the accepted I1 Host returns (evidence runtime-inventory-i1-final-20260927/live-api.json). */
const PI = {
  adapterId: PI_EXECUTOR_ID,
  configured: true,
  configurationOwner: "host",
  revision: "pi-agent-session-context-v1",
  configurationRef: `sha256:${"a".repeat(64)}`,
  capabilities: {
    start: { supported: true },
    continue: { supported: true },
    steer: { supported: true },
    cancel: { supported: true },
    compact: { supported: true },
    recover: { supported: false, reason: "Pi's loop runs inside the Host process" },
    submitToolResult: { supported: false, reason: "Pi executes the governed tools inside its own loop" },
  },
  availability: { status: "configured", reasonCode: null, reason: null },
  liveStatus: "not_checked",
};
const MANAGED = {
  adapterId: MANAGED_EXECUTOR_ID,
  configured: false,
  configurationOwner: "host",
  revision: null,
  configurationRef: null,
  capabilities: null,
  availability: { status: "unavailable", reasonCode: "not_configured", reason: "This execution runtime is not configured on this Host." },
  liveStatus: "not_checked",
};
const info = (items = [PI, MANAGED]) => ({
  adapterId: PI_EXECUTOR_ID,
  executionRuntimes: { schemaVersion: 1, defaultAdapterId: PI_EXECUTOR_ID, items: structuredClone(items) },
});

/* Each read waits for the test to answer it, in call order. */
function gatedRead() {
  const calls = [];
  const read = () => {
    const gate = deferred();
    calls.push(gate);
    return gate.promise;
  };
  return { read, calls };
}

function page(mount) {
  const replace = mount.replaceChildren.bind(mount);
  mount.replaceChildren = (...children) => {
    replace(...children);
    const active = document.activeElement;
    if (active && active !== document.body && !mount.contains(active)) document.activeElement = document.body;
  };
  const $ = (id) => mount.querySelectorAll("[data-testid]").find((node) => node.getAttribute("data-testid") === id) ?? null;
  const text = (id) => $(id)?.textContent ?? null;
  const focused = () => document.activeElement?.getAttribute?.("data-focus-key") ?? (document.activeElement === document.body ? "body" : null);
  async function activate(id) {
    const target = $(id);
    assert.ok(target, `${id} is on the page`);
    target.focus();
    press(target, "Enter");
    for (let i = 0; i < 4; i += 1) await flush();
  }
  const buttons = () => mount.querySelectorAll("button").map((button) => button.getAttribute("data-testid"));
  return { $, text, focused, activate, buttons };
}

async function mounted(mount, read) {
  const controller = createRuntimeInventoryController({ read });
  let renders = 0;
  createRuntimeInventoryView(mount, controller, { onRendered: () => { renders += 1; } });
  return { controller, renders: () => renders };
}

test("each runtime is one row: its name, Host default, configured versus unavailable with the Host's reason, and live not checked", () => withTinyDom(async (mount) => {
  const { controller } = await mounted(mount, async () => info());
  const p = page(mount);
  await controller.refresh();
  assert.equal(p.text(`runtime-row:${PI_EXECUTOR_ID}`).includes("Pi · Host default"), true);
  assert.equal(p.text(`row-state:${PI_EXECUTOR_ID}`), "Configured · live status not checked");
  assert.equal(p.text(`row-state:${MANAGED_EXECUTOR_ID}`), "Unavailable · live status not checked");
  assert.equal(p.text(`row-reason:${MANAGED_EXECUTOR_ID}`), MANAGED.availability.reason);
  assert.equal(p.$(`row-reason:${PI_EXECUTOR_ID}`), null, "a configured runtime has no reason line");
  // Read only: the page offers Refresh and one Details per row, nothing else.
  assert.deepEqual(p.buttons(), ["refresh", `row-action:${PI_EXECUTOR_ID}`, `row-action:${MANAGED_EXECUTOR_ID}`]);
  assert.doesNotMatch(mount.textContent, /Connect|Disable|Enable|Disconnect|Connected\b/);
}));

test("loading, empty, failed and refreshing are four different readings", () => withTinyDom(async (mount) => {
  const { read, calls } = gatedRead();
  const { controller } = await mounted(mount, read);
  const p = page(mount);

  const first = controller.refresh();
  assert.equal(p.$("reading-status").getAttribute("data-status"), "loading");
  assert.equal(p.text("reading-status"), "Reading this Host's runtimes…");
  assert.equal(p.$("runtime-list").getAttribute("aria-busy"), "true");
  calls[0].reject(new Error("The local runtime could not be reached."));
  await first;
  assert.equal(p.text("reading-error"), "The local runtime could not be reached.", "a failed first read says only what failed");
  assert.equal(p.$("list-empty"), null, "a failed read is not an empty list");

  const empty = controller.refresh();
  calls[1].resolve(info([]));
  await empty;
  assert.equal(p.text("list-empty"), "This Host reports no execution runtimes.");
  assert.equal(p.$("reading-error"), null);

  const filled = controller.refresh();
  calls[2].resolve(info());
  await filled;
  const again = controller.refresh();
  assert.equal(p.text("reading-status"), "Reading again… the rows below are the previous reading.");
  assert.ok(p.$(`runtime-row:${PI_EXECUTOR_ID}`), "the previous rows stay while a refresh is out");
  calls[3].reject(new Error("Request failed (503)."));
  await again;
  assert.equal(p.text("reading-error"), "Request failed (503). The rows below are the last reading that succeeded.");
  assert.ok(p.$(`runtime-row:${MANAGED_EXECUTOR_ID}`), "a failed refresh keeps the last good rows");
}));

test("a Host that does not report the inventory is a failed read, not an empty one", () => withTinyDom(async (mount) => {
  const { controller } = await mounted(mount, async () => ({ adapterId: PI_EXECUTOR_ID }));
  const p = page(mount);
  await controller.refresh();
  assert.equal(p.text("reading-error"), NOT_REPORTED);
  assert.equal(p.$("list-empty"), null);
  assert.equal(inventoryOf({ executionRuntimes: { schemaVersion: 2, items: [] } }), null, "an unknown schema is not read as a known one");
}));

test("Details opens the runtime with the keyboard on Back; Back returns to the same row", () => withTinyDom(async (mount) => {
  const { controller } = await mounted(mount, async () => info());
  const p = page(mount);
  await controller.refresh();
  await p.activate(`row-action:${MANAGED_EXECUTOR_ID}`);
  assert.equal(p.focused(), "back");
  assert.equal(p.text("runtime-name"), "Agents API");
  await p.activate("back");
  assert.equal(p.focused(), `row:${MANAGED_EXECUTOR_ID}`);
  assert.ok(p.$("runtime-list"));
}));

test("a configured runtime's detail keeps configured, availability, live status and default apart, and lists its declared operations with their reasons", () => withTinyDom(async (mount) => {
  const { controller } = await mounted(mount, async () => info());
  const p = page(mount);
  await controller.refresh();
  await p.activate(`row-action:${PI_EXECUTOR_ID}`);
  assert.equal(p.text("status:configured"), "Configured on this Host");
  assert.equal(p.text("status:owner"), "This Host's configuration. Settings reads it and cannot change it.");
  assert.equal(p.text("status:availability"), "Described by this Host for the current provider");
  assert.equal(p.text("status:live"), "Not checked. Nothing here connects to it, signs in or runs anything.");
  assert.equal(p.text("status:default"), "Yes");
  assert.equal(p.text("operations:start"), "Supported");
  assert.equal(p.text("operations:recover"), `Not supported. ${PI.capabilities.recover.reason}`);
  assert.equal(p.text("operations:submitToolResult"), `Not supported. ${PI.capabilities.submitToolResult.reason}`);
  const terms = p.$("operations").querySelectorAll("dt").map((node) => node.textContent);
  assert.deepEqual(terms, ["Start a run", "Continue a chat", "Steer a run in progress", "Cancel a run", "Compact the context", "Recover a run after a restart", "Answer a tool call"]);
  // Identifiers are technical detail, on demand.
  assert.equal(p.$("disclosure:technical").open, false);
  assert.equal(p.text("technical:id"), PI_EXECUTOR_ID);
  assert.equal(p.text("technical:revision"), PI.revision);
  assert.equal(p.text("technical:ref"), PI.configurationRef);
  assert.equal(p.text("technical:reason-code"), "None");
  assert.deepEqual(p.buttons(), ["back", "refresh"], "the detail offers no action on the runtime");
}));

test("an unavailable runtime says why beside the fact, and reports no operations rather than inventing them", () => withTinyDom(async (mount) => {
  const { controller } = await mounted(mount, async () => info());
  const p = page(mount);
  await controller.refresh();
  await p.activate(`row-action:${MANAGED_EXECUTOR_ID}`);
  assert.equal(p.text("status:configured"), "Not configured on this Host");
  assert.equal(p.text("status:availability"), `Unavailable. ${MANAGED.availability.reason}`);
  assert.equal(p.text("status:live"), "Not checked. Nothing here connects to it, signs in or runs anything.");
  assert.equal(p.text("status:default"), "No");
  assert.equal(p.$("operations"), null);
  assert.equal(p.text("operations-absent"), "Not reported: the Host has no current description of this runtime.");
  assert.equal(p.text("technical:revision"), "None");
  assert.equal(p.text("technical:reason-code"), "not_configured");
}));

test("an unknown runtime id and an unnamed operation are shown as the Host reports them", () => withTinyDom(async (mount) => {
  const other = { ...structuredClone(PI), adapterId: "future-runtime", capabilities: { ...PI.capabilities, pause: { supported: false, reason: "Not yet" } } };
  const { controller } = await mounted(mount, async () => info([PI, other]));
  const p = page(mount);
  await controller.refresh();
  assert.equal(runtimeName("future-runtime"), "future-runtime");
  await p.activate("row-action:future-runtime");
  assert.equal(p.text("runtime-name"), "future-runtime");
  assert.equal(p.text("operations:pause"), "Not supported. Not yet");
}));

test("Refresh from a runtime stays on it with the keyboard on Refresh, and keeps the technical detail open", () => withTinyDom(async (mount) => {
  const { read, calls } = gatedRead();
  const { controller } = await mounted(mount, read);
  const p = page(mount);
  const first = controller.refresh();
  calls[0].resolve(info());
  await first;
  await p.activate(`row-action:${PI_EXECUTOR_ID}`);
  const details = p.$("disclosure:technical");
  details.open = true;
  details.dispatchEvent({ type: "toggle" });

  await p.activate("refresh");
  assert.equal(p.text("reading-status"), "Reading again… the values below are the previous reading.");
  assert.equal(p.text("status:configured"), "Configured on this Host", "the previous values stay while the read is out");
  calls[1].resolve(info());
  for (let i = 0; i < 4; i += 1) await flush();
  assert.equal(p.focused(), "refresh");
  assert.equal(p.text("runtime-name"), "Pi");
  assert.equal(p.$("disclosure:technical").open, true, "a re-render does not close what the person opened");

  await p.activate("refresh");
  calls[2].reject(new Error("Request failed (503)."));
  for (let i = 0; i < 4; i += 1) await flush();
  assert.equal(p.text("reading-error"), "Request failed (503). The values below are the last reading that succeeded.");
  assert.equal(p.text("status:configured"), "Configured on this Host");
  assert.equal(p.focused(), "refresh");
}));

test("only the newest read lands, and no reply navigates", () => withTinyDom(async (mount) => {
  const { read, calls } = gatedRead();
  const { controller } = await mounted(mount, read);
  const p = page(mount);
  const seed = controller.refresh();
  calls[0].resolve(info());
  await seed;

  const older = controller.refresh();
  const newer = controller.refresh();
  await p.activate(`row-action:${MANAGED_EXECUTOR_ID}`);
  const changed = structuredClone(MANAGED);
  changed.availability.reason = "Newer reason.";
  calls[2].resolve(info([PI, changed]));
  await newer;
  calls[1].resolve(info([PI, MANAGED]));
  await older;
  assert.equal(p.focused(), "back", "the replies left the person where they were");
  assert.equal(p.text("status:availability"), "Unavailable. Newer reason.", "the older reply did not overwrite the newer one");
}));

test("a runtime the latest reading no longer includes says so, and Back lands on Refresh", () => withTinyDom(async (mount) => {
  let items = [PI, MANAGED];
  const { controller } = await mounted(mount, async () => info(items));
  const p = page(mount);
  await controller.refresh();
  await p.activate(`row-action:${MANAGED_EXECUTOR_ID}`);
  items = [PI];
  await p.activate("refresh");
  assert.equal(p.text("runtime-missing"), "The latest reading does not include Agents API.");
  await p.activate("back");
  assert.equal(p.focused(), "refresh");
}));

test("the Settings search is re-applied after every render", () => withTinyDom(async (mount) => {
  const { controller, renders } = await mounted(mount, async () => info());
  const before = renders();
  await controller.refresh();
  assert.ok(renders() >= before + 2, "loading and ready each re-apply the page filter");
}));

test("a real Host before any Session: Pi configured and default, Agents API unavailable, nothing written", async () => {
  const h = await boot();
  try {
    const read = async () => (await h.api("GET", "/runtime-info")).json;
    const controller = createRuntimeInventoryController({ read });
    await controller.refresh();
    await controller.refresh();
    const { reading } = controller.getState();
    assert.equal(reading.status, "ready");
    assert.equal(reading.inventory.defaultAdapterId, PI_EXECUTOR_ID);
    const [pi, managed] = reading.inventory.items;
    assert.deepEqual([pi.adapterId, pi.configured, pi.availability.status, pi.liveStatus], [PI_EXECUTOR_ID, true, "configured", "not_checked"]);
    assert.deepEqual([managed.adapterId, managed.configured, managed.availability.reasonCode, managed.liveStatus], [MANAGED_EXECUTOR_ID, false, "not_configured", "not_checked"]);
    assert.deepEqual([h.runtime.store.listSessions().length, h.runtime.store.listRuns().length], [0, 0]);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});
