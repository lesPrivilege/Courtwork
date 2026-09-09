/* WO-WK11 · adapted from evidence/final-integration-20260908/rc/runtime-ui-checks.mjs.
 *
 * The assertions are the WO-RC ones, unchanged in substance. What changed is
 * the way in: the runtime catalogue is no longer an L2 surface pane, it is the
 * Runtime group of the Settings page (WO-WK11 / WK-82), so the suite opens
 * `#settings/runtime` instead of `#surface-runtime-tab` and reads
 * `#settings-runtime` instead of `#runtime-content`. Two element-level
 * assertions follow the same move: a kind heading is now an `h5` inside a
 * settings block, and a kind note uses the page's `.settings-row-help`. Every
 * obligation being tested is the same one.
 */
/* WO-RC · in-page assertions for the runtime control UI.
 *
 * This file is evaluated inside the real page served at http://127.0.0.1:8850
 * (Browser pane -> javascript_tool), because every obligation in
 * docs/runtime-control/acceptance.md "New frontend contract" is a statement
 * about rendered DOM, not about a module in isolation. It drives the product's
 * own controls and reads the product's own DOM; it never writes UI state
 * directly. Results are saved beside it as runtime-ui-checks.json.
 *
 * Usage: read this file, evaluate its text in the page, then `await runChecks()`.
 */
globalThis.runChecks = async function runChecks() {
  const results = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (id) => document.getElementById(id);
  const record = (id, obligation, pass, detail) =>
    results.push({ id, obligation, pass: Boolean(pass), detail });

  // The page owns its own token; the checks read a fresh one for the API-side
  // conditions (an active run, an out-of-band revision bump).
  const api = async (method, path, body) => {
    const boot = await (
      await fetch("/api/v5/bootstrap", { headers: { Accept: "application/json" } })
    ).json();
    const res = await fetch(`/api/v5${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "X-Work-Token": boot.sessionToken,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };

  // ---- open a session and the Runtime group through the product's own path
  if (!document.querySelector(".session-button.active"))
    document.querySelector(".session-button")?.click();
  await wait(1200);
  const sessionId = document.querySelector(".session-button.active")
    ? true
    : false;
  location.hash = "#settings/runtime";
  await wait(1800);
  const root = $("settings-runtime");
  const snapshotOf = async () => {
    const id = new URLSearchParams(location.search);
    const active = await api("GET", "/sessions");
    return active;
  };

  /* WO-WK11 · the catalogue is a group of the Settings page, reached by the
     page's own tab; the five intent blocks are its mount points (WK-82). */
  record(
    "surface",
    "runtime is a group of the Settings page, with five intent blocks (WK-82)",
    $("settings-tab-runtime").getAttribute("aria-selected") === "true" &&
      $("settings-tab-runtime").getAttribute("aria-controls") === "settings-runtime" &&
      root.getAttribute("role") === "tabpanel" &&
      !root.hidden &&
      ["overview", "composition", "instructions-and-context", "capabilities-and-connections", "permissions-and-environment"]
        .every((name) => root.querySelector(`[data-wk11-mount="${name}"]`)),
    `blocks=${root.querySelectorAll("[data-wk11-mount]").length}`,
  );

  // The snapshot the page is showing, read again from the server.
  const sid = document
    .querySelector("[data-resource='sandbox:workspace']")
    ?.querySelector(".runtime-provenance")
    ? null
    : null;
  const scopeNote = root.querySelector(".runtime-scope-note")?.textContent || "";
  const sessionGuess = scopeNote.match(/·\s([0-9a-f-]{36})/)?.[1] || null;
  const live = (await api("GET", `/runtime-control?sessionId=${sessionGuess}`)).json;

  record(
    "precedence",
    "a static precedence sentence sits above the scope tabs (RC-3 revision)",
    /Session overrides workspace, and workspace overrides user\. A narrower scope cannot loosen a deny or ask that a wider one set\./.test(
      root.querySelector(".runtime-precedence")?.textContent || "",
    ),
    root.querySelector(".runtime-precedence")?.textContent,
  );

  const tabs = [...root.querySelectorAll(".runtime-scope-tab")];
  record(
    "scopes-from-server",
    "scope tabs and revision come from the server, not from the page",
    tabs.map((t) => t.dataset.scope).join(",") ===
      live.scopes.map((s) => s.type).join(",") &&
      scopeNote.includes(`Revision ${live.revision}`),
    `tabs=${tabs.map((t) => t.dataset.scope).join(",")} note=${scopeNote}`,
  );

  const rows = [...root.querySelectorAll(".runtime-row")];
  const labelsOf = (row) =>
    [...row.querySelectorAll(".runtime-dimensions .runtime-dimension-label")].map(
      (n) => n.textContent,
    );
  const fourColumns = rows.every((row) => {
    const l = labelsOf(row);
    return (
      l.length === 4 &&
      l[0] === "Installed" &&
      (l[1] === "Running" || l[1] === "Connected") &&
      l[2] === "Exposed" &&
      l[3] === "Permitted"
    );
  });
  record(
    "four-dimensions",
    "installed / running / exposed / permitted stay separate (RC-2, acceptance)",
    fourColumns && rows.length > 0,
    `${rows.length} rows`,
  );

  const naRows = rows.filter((row) =>
    [...row.querySelectorAll(".runtime-dimension")].some(
      (d) =>
        ["Running", "Connected"].includes(
          d.querySelector(".runtime-dimension-label")?.textContent,
        ) && d.querySelector(".runtime-dimension-value")?.textContent === "n/a",
    ),
  );
  /* WO-WK11 · the group no longer draws one flat catalogue. Provider, model,
     secret, sandbox, host policy and session context are environment facts and
     are stated read-only in Permissions & environment, so they are not object
     rows. The obligation is unchanged for the rows that exist, and the check
     also proves nothing simply vanished: every resource that is not a row is
     one of those six kinds, and it is named in that block. */
  const ENVIRONMENT_ROWS = {
    provider: "Provider",
    model: "Model",
    secret: "API key",
    sandbox: "Filesystem boundary",
    permission_policy: "Host permission mode",
    session_context: "Session history",
  };
  const ENVIRONMENT_KINDS = Object.keys(ENVIRONMENT_ROWS);
  const drawn = new Set(rows.map((row) => row.dataset.resource));
  // Packages are read on the Inventory tab of Capabilities & connections.
  root.querySelector('[data-subtab="inventory"]')?.click();
  await wait(400);
  const inventoryDrawn = new Set(
    [...root.querySelectorAll(".runtime-inventory-row")].map((r) => r.dataset.package),
  );
  root.querySelector('[data-subtab="configurable"]')?.click();
  await wait(400);
  const nulls = live.resources.filter((r) => r.running === null && drawn.has(r.id));
  const undrawn = live.resources.filter(
    (r) => !drawn.has(r.id) && !inventoryDrawn.has(r.id),
  );
  const environmentText = root.querySelector(".runtime-environment")?.innerText || "";
  record(
    "running-null",
    "running:null renders as n/a, not as disconnected; nothing is silently dropped",
    naRows.length === nulls.length &&
      nulls.length > 0 &&
      undrawn.every((r) => ENVIRONMENT_KINDS.includes(r.kind)) &&
      undrawn.every((r) => environmentText.includes(ENVIRONMENT_ROWS[r.kind])),
    `n/a rows ${naRows.length}, contract nulls among rows ${nulls.length}; not rows: ${undrawn.map((r) => `${r.kind}:${r.id}`).join(", ") || "none"}`,
  );

  // Authority is never inferred from a checked switch: each switch equals the
  // authoritative `exposed` of its resource in the snapshot just fetched.
  const mismatches = [];
  for (const row of rows) {
    const id = row.dataset.resource;
    const resource = live.resources.find((r) => r.id === id);
    const input = row.querySelector(".runtime-switch input");
    if (!resource || !input) continue;
    if (input.checked !== Boolean(resource.exposed))
      mismatches.push(`${id}: ui=${input.checked} server=${resource.exposed}`);
  }
  record(
    "no-inferred-authority",
    "no switch shows a value the server did not report (acceptance)",
    mismatches.length === 0,
    mismatches.join("; ") || `${rows.length} switches agree with the snapshot`,
  );

  // Permission trace on a tool, on disclosure. The module re-renders on every
  // toggle, so each row is looked up again after the click.
  const rowFor = (id) => root.querySelector(`[data-resource="${CSS.escape(id)}"]`);
  const toggle = async (id) => {
    rowFor(id).querySelector(".runtime-row-title").click();
    await wait(250);
    return rowFor(id);
  };
  const openTool = await toggle("tool:ws_write");
  const traceTerms = [...openTool.querySelectorAll(".runtime-detail-block dt")].map(
    (n) => n.textContent,
  );
  record(
    "permission-trace",
    "a tool's permission effect and trace read as a DataList on disclosure",
    openTool.querySelector(".runtime-detail").hidden === false &&
      traceTerms.includes("Effect") &&
      traceTerms.some((t) => t.startsWith("Step 1 ·")),
    traceTerms.join(" | "),
  );
  record(
    "source-identity",
    "source type, owning scope and hash or URI are shown",
    traceTerms.includes("Source") && traceTerms.includes("Owning scope"),
    traceTerms.join(" | "),
  );
  await toggle("tool:ws_write");

  // Unsupported kinds are labelled rather than drawn as controls.
  /* WO-WK11 · the Planned rows now sit in the group each absent kind would
     have belonged to, rather than in one list at the end. The obligation is
     unchanged: labelled, and with no interactive descendant. */
  const unsupported = [...root.querySelectorAll("[data-kind='unsupported']")];
  const adapterRequired = live.kinds
    .filter((k) => k.support !== "available")
    .map((k) => k.kind);
  const plannedInteractiveHere = unsupported.reduce(
    (n, node) => n + node.querySelectorAll("button,input,select,textarea,a[href]").length,
    0,
  );
  record(
    "unsupported-kinds",
    "adapter-required kinds are labelled, with no controls",
    unsupported.length > 0 &&
      plannedInteractiveHere === 0 &&
      adapterRequired.length > 0 &&
      unsupported.some((node) => node.textContent.includes("Backend pending")),
    `${adapterRequired.join(", ")} · sections=${unsupported.length} · interactive=${plannedInteractiveHere}`,
  );

  // Profile compatibility and declarative UI slots.
  record(
    "profile-compatibility",
    "the selected profile's compatibility is shown (acceptance)",
    (root.querySelector("[data-composition]")?.textContent || "").includes(
      live.composition.status,
    ),
    root.querySelector("[data-composition]")?.textContent,
  );
  let uiSlotText = null;
  if (rowFor(live.composition.id)) {
    const openProfile = await toggle(live.composition.id);
    uiSlotText = [...openProfile.querySelectorAll(".runtime-detail-block dd")]
      .map((n) => n.textContent)
      .join(" | ");
    await toggle(live.composition.id);
  }
  record(
    "ui-slots-declarative",
    "profile UI slots are declared, not executed (acceptance)",
    Boolean(uiSlotText && uiSlotText.includes("declared, not executed")),
    uiSlotText,
  );
  record(
    "selection-not-exposure",
    "selecting a profile is distinguished from generic exposure (acceptance)",
    (
      root.querySelector("[data-kind='agent_profile'] .settings-row-help")?.textContent || ""
    ).includes("different act from exposing"),
    root.querySelector("[data-kind='agent_profile'] .settings-row-help")?.textContent,
  );

  // MCP: three states, lifecycle text buttons, indented remote tools.
  const mcpRow = root.querySelector(".runtime-row[data-kind='mcp_server']");
  const stateWords = mcpRow?.querySelector(".runtime-mcp-state")?.textContent || "";
  const lifecycleLabels = [
    ...(mcpRow?.querySelectorAll(".runtime-mcp-line button") || []),
  ].map((b) => b.textContent);
  record(
    "mcp-states",
    "configured / connected / exposed are separate words from the snapshot (RC-6)",
    /configured/.test(stateWords) &&
      /connected/.test(stateWords) === Boolean(
        live.resources.find((r) => r.id === mcpRow.dataset.resource).running,
      ) &&
      lifecycleLabels.join(",") === "Connect,Disconnect,Restart",
    `${stateWords} · buttons ${lifecycleLabels.join(",")}`,
  );
  const gatedChildren = live.resources.filter(r => r.mcp && r.provenance.some(p => p.parentId && p.value === false));
  record("parent-gate-readonly", "a parent gate disables the child switch and does not pretend it is a removable override",
    gatedChildren.length > 0 && gatedChildren.every(r => {
      const row = root.querySelector(`[data-resource="${CSS.escape(r.id)}"]`);
      return row?.querySelector('input[role="switch"]')?.disabled === true
        && row.textContent.includes("Expose and connect the parent resource")
        && !row.textContent.includes("The switch overrides it");
    }), `${gatedChildren.length} parent-gated remote children`);
  const childRows = [...root.querySelectorAll(".runtime-row.is-child")];
  const remoteChildren = childRows.filter(
    (row) => live.resources.find((r) => r.id === row.dataset.resource)?.mcp,
  );
  const remoteExpected = live.resources.filter((r) => r.mcp).length;
  record(
    "remote-tools",
    "remote tools are indented under their server and marked remote + hash",
    remoteChildren.length === remoteExpected &&
      remoteExpected > 0 &&
      remoteChildren.every(
        (row) =>
          row.querySelector(".runtime-row-tag")?.textContent === "remote" &&
          /^[0-9a-f]{12}$/.test(
            row.querySelector(".runtime-row-hash")?.textContent || "",
          ),
      ),
    `${remoteChildren.length} of ${childRows.length} indented rows are remote; contract expects ${remoteExpected}`,
  );

  // The character note is literal, and no token count is claimed.
  // WO-WK11 · the context reading lives in the group's own Overview block.
  const contextText = $("runtime-context-summary").innerText;
  const contextPayload = (
    await api("GET", `/runtime-context?sessionId=${sessionGuess}`)
  ).json;
  record(
    "characters-not-tokens",
    "context sizes say characters, not tokens (RC-5)",
    contextText.includes("characters, not tokens") &&
      !/token count|tokens:/i.test(contextText),
    contextText.split("\n").filter((l) => l.includes("characters")).join(" / "),
  );
  record(
    "token-usage-null",
    "tokenUsage null shows no token line at all",
    contextPayload.tokenUsage === null &&
      !contextText.includes("Token usage"),
    `tokenUsage=${JSON.stringify(contextPayload.tokenUsage)}`,
  );
  const deferredKinds = new Set(
    contextPayload.context
      .filter((i) => (i.admittedCharacters ?? (i.admission === "instructions" ? i.characters : 0)) === 0)
      .map((i) => i.kind),
  );
  const dashRows = [
    ...$("runtime-context-summary").querySelectorAll(".context-characters dt"),
  ]
    .map((dt) => [dt.textContent, dt.nextElementSibling.textContent])
    .filter(([, dd]) => dd === "—");
  record(
    "deferred-dash",
    "zero-contribution kinds are dashes; catalog contributions count without admitting deferred bodies",
    dashRows.length === deferredKinds.size && dashRows.length > 0,
    dashRows.map(([dt]) => dt).join(", "),
  );
  const segments = [
    ...$("runtime-context-summary").querySelectorAll(".context-bar-segment"),
  ];
  record(
    "bar-no-limit",
    "the bar shows composition only: no percentage, free space or quota line",
    segments.length === (new Set(contextPayload.context.filter(i => (i.admittedCharacters ?? (i.admission === "instructions" ? i.characters : 0)) > 0).map(i => i.kind)).size >= 2
      ? new Set(contextPayload.context.filter(i => (i.admittedCharacters ?? (i.admission === "instructions" ? i.characters : 0)) > 0).map(i => i.kind)).size : 0)
      && !/%|free space|limit|remaining/i.test(contextText),
    `${segments.length} segments`,
  );

  // The Planned list has no controls. It is a block of the Developer group.
  $("settings-tab-developer").click();
  await wait(500);
  const planned = $("planned-capabilities");
  const plannedInteractive = planned.querySelectorAll(
    "button,input,select,textarea,a[href],[role='button'],[role='switch'],[tabindex]",
  ).length;
  /* WK-78 turned Settings into a page, so the Planned list is a block of the
     Developer group rather than a closed disclosure at the bottom of a dialog.
     The obligation is the same one: text rows, no interactive descendant, and
     not on any path a normal reader is walked down. */
  record(
    "planned-inert",
    "the Planned section carries text rows and zero interactive descendants (WK-27)",
    plannedInteractive === 0 &&
      planned.textContent.includes("Backend pending") &&
      planned.querySelectorAll(".planned-row").length > 0 &&
      planned.closest("#settings-developer") !== null,
    `interactive=${plannedInteractive}, rows=${planned.querySelectorAll(".planned-row").length}, group=${planned.closest(".settings-section")?.id}`,
  );
  $("settings-back-button").click();
  await wait(500);

  return { results, sessionGuess };
};
