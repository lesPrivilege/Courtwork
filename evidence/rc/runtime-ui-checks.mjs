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

  // ---- open a session and the runtime module through the product's own path
  if (!document.querySelector(".session-button.active"))
    document.querySelector(".session-button")?.click();
  await wait(1200);
  const sessionId = document.querySelector(".session-button.active")
    ? true
    : false;
  $("surface-runtime-tab").click();
  await wait(1200);
  const root = $("runtime-content");
  const snapshotOf = async () => {
    const id = new URLSearchParams(location.search);
    const active = await api("GET", "/sessions");
    return active;
  };

  record(
    "surface",
    "runtime is a surface kind beside workspace / run / file (RC-1)",
    $("surface-runtime-tab").getAttribute("aria-selected") === "true" &&
      $("surface-runtime-tab").getAttribute("aria-controls") === "runtime-content" &&
      $("runtime-content").getAttribute("role") === "tabpanel" &&
      !$("runtime-content").hidden,
    `title=${$("surface-title").textContent}`,
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
  const naExpected = live.resources.filter((r) => r.running === null).length;
  record(
    "running-null",
    "running:null renders as n/a, not as disconnected",
    naRows.length === naExpected && naExpected > 0,
    `n/a rows ${naRows.length}, contract nulls ${naExpected}`,
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
  const unsupported = root.querySelector("[data-kind='unsupported']");
  const adapterRequired = live.kinds
    .filter((k) => k.support !== "available")
    .map((k) => k.kind);
  record(
    "unsupported-kinds",
    "adapter-required kinds are labelled, with no controls",
    Boolean(unsupported) &&
      unsupported.querySelectorAll("button,input,select,textarea,a[href]").length === 0 &&
      adapterRequired.length > 0,
    `${adapterRequired.join(", ")} · interactive=${unsupported ? unsupported.querySelectorAll("button,input,select,textarea,a[href]").length : "n/a"}`,
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
      root.querySelector("[data-kind='agent_profile'] .form-help")?.textContent || ""
    ).includes("different act from exposing"),
    root.querySelector("[data-kind='agent_profile'] .form-help")?.textContent,
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
  const settingsOpen = () => {
    $("runtime-setup-button").click();
    return wait(900);
  };
  await settingsOpen();
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
      .filter((i) => i.admission !== "instructions")
      .map((i) => i.kind),
  );
  const dashRows = [
    ...$("runtime-context-summary").querySelectorAll(".context-characters dt"),
  ]
    .map((dt) => [dt.textContent, dt.nextElementSibling.textContent])
    .filter(([, dd]) => dd === "—");
  record(
    "deferred-dash",
    "deferred and user-invoked kinds are dashes outside the bar (intake §6)",
    dashRows.length === deferredKinds.size && dashRows.length > 0,
    dashRows.map(([dt]) => dt).join(", "),
  );
  const segments = [
    ...$("runtime-context-summary").querySelectorAll(".context-bar-segment"),
  ];
  record(
    "bar-no-limit",
    "the bar shows composition only: no percentage, free space or quota line",
    segments.length > 0 && !/%|free space|limit|remaining/i.test(contextText),
    `${segments.length} segments`,
  );

  // The Planned list has no controls.
  const planned = $("planned-capabilities");
  const plannedInteractive = planned.querySelectorAll(
    "button,input,select,textarea,a[href],[role='button'],[role='switch'],[tabindex]",
  ).length;
  record(
    "planned-inert",
    "the Planned section carries text rows and zero interactive descendants (WK-27)",
    plannedInteractive === 0 &&
      planned.textContent.includes("Backend pending") &&
      planned.closest("details").querySelectorAll("summary").length === 1 &&
      planned.closest("details").open === false,
    `interactive=${plannedInteractive}, rows=${planned.querySelectorAll(".planned-row").length}, disclosure summary=1`,
  );
  $("close-runtime-button").click();
  await wait(500);

  return { results, sessionGuess };
};
