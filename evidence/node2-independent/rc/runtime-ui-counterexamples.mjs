/* WO-RC · counterexamples for the runtime control UI.
 *
 * Evaluated in the real page (see runtime-ui-checks.mjs for the harness note).
 * Each case creates the failing condition through the app's own HTTP API and
 * then drives the product's own controls, so a pass means the rendered product
 * behaved, not that a unit was called. Results are saved beside it as
 * runtime-ui-counterexamples.json.
 */
globalThis.runCounterexamples = async function runCounterexamples() {
  const results = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (id) => document.getElementById(id);
  const record = (id, obligation, pass, detail) =>
    results.push({ id, obligation, pass: Boolean(pass), detail });
  // One broken case must not hide the verdict on the others.
  const step = async (id, fn) => {
    try {
      await fn();
    } catch (error) {
      record(id, "case did not complete", false, String(error));
    }
  };

  let token = null;
  const api = async (method, path, body) => {
    if (!token)
      token = (await (await fetch("/api/v5/bootstrap")).json()).sessionToken;
    const res = await fetch(`/api/v5${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "X-Work-Token": token,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };

  // Watch what the page actually puts on the wire, without changing it.
  const sent = [];
  const realFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url;
    if (init?.body && /\/api\/v5\/(runtime-control|mcp\/)/.test(url || ""))
      sent.push({
        url,
        method: init.method,
        body: JSON.parse(init.body),
        at: performance.now(),
      });
    return realFetch.apply(this, arguments);
  };
  const restore = () => {
    window.fetch = realFetch;
  };

  try {
    if (!document.querySelector(".session-button.active"))
      document.querySelector(".session-button")?.click();
    await wait(1200);
    // Start from a session with nothing running: the freeze case creates its
    // own active run and must not inherit one from an earlier pass.
    {
      const first = document.querySelector(".session-button.active");
      const id = (first?.dataset.navKey || "").split(":")[1];
      const detail = id ? (await api("GET", `/sessions/${id}`)).json : null;
      for (const r of detail?.runs || [])
        if (["created", "running", "waiting_user", "stopping"].includes(r.status))
          await api("POST", `/runs/${r.id}/cancel`, {});
      await wait(2500);
    }
    $("surface-runtime-tab").click();
    await wait(1200);
    const root = $("runtime-content");
    const sessionId = (
      root.querySelector(".runtime-scope-note")?.textContent || ""
    ).match(/·\s([0-9a-f-]{36})/)?.[1];
    const rowFor = (id) => root.querySelector(`[data-resource="${CSS.escape(id)}"]`);
    const snapshot = async () =>
      (await api("GET", `/runtime-control?sessionId=${sessionId}`)).json;
    const resource = (s, id) => s.resources.find((r) => r.id === id);

    // ---- 1. inherit removes this layer's override -----------------------
    const target = "tool:ws_grep";
    // Put an explicit session override in place through the API, then remove it
    // with the product's own text line.
    let live = await snapshot();
    await api("PUT", `/runtime-control?sessionId=${sessionId}`, {
      revision: live.revision,
      operation: "exposure",
      id: target,
      scope: { type: "session", id: sessionId },
      exposed: false,
    });
    $("surface-runtime-tab").click();
    await wait(200);
    root.querySelector(".runtime-scope-tab[data-scope='session']")?.click();
    await wait(200);
    // Reload the module so it holds the post-override revision.
    $("surface-preview-tab").click();
    await wait(300);
    $("surface-runtime-tab").click();
    await wait(1000);
    const beforeProvenance = rowFor(target)?.querySelector(".runtime-provenance")
      ?.textContent;
    sent.length = 0;
    const inheritButton = rowFor(target)?.querySelector(".runtime-inherit");
    inheritButton?.click();
    await wait(900);
    const inheritPut = sent.find((s) => s.body.operation === "exposure");
    const afterProvenance = rowFor(target)?.querySelector(".runtime-provenance")
      ?.textContent;
    live = await snapshot();
    record(
      "inherit-is-removal",
      "inherit sends exposed:null and the sentence follows the returned snapshot (RC-2)",
      Boolean(inheritButton) &&
        inheritPut?.body.exposed === null &&
        inheritPut?.body.scope?.type === "session" &&
        beforeProvenance !== afterProvenance &&
        !resource(live, target).provenance.some(
          (p) => p.scope.type === "session" && p.reason !== "source default",
        ),
      `button="${inheritButton?.textContent}" body=${JSON.stringify(inheritPut?.body)} before="${beforeProvenance}" after="${afterProvenance}"`,
    );

    // ---- 2. MCP lifecycle words come from the returned snapshot ---------
    const mcpId = root.querySelector(".runtime-row[data-kind='mcp_server']")
      ?.dataset.resource;
    const stateOf = () =>
      rowFor(mcpId)?.querySelector("[data-mcp-state]")?.dataset.mcpState || "";
    const before = stateOf();
    const buttons = () => [...rowFor(mcpId).querySelectorAll(".runtime-mcp-line button")];
    buttons().find((b) => b.textContent === "Disconnect").click();
    await wait(1200);
    const disconnected = stateOf();
    const afterDisconnect = resource(await snapshot(), mcpId).running;
    buttons().find((b) => b.textContent === "Connect").click();
    await wait(1500);
    const reconnected = stateOf();
    const afterConnect = resource(await snapshot(), mcpId).running;
    record(
      "mcp-lifecycle",
      "connect / disconnect change the state words only through the returned snapshot (RC-6)",
      before.includes("connected") &&
        !disconnected.includes("connected") &&
        afterDisconnect === false &&
        reconnected.includes("connected") &&
        afterConnect === true,
      `before="${before}" disconnected="${disconnected}" reconnected="${reconnected}"`,
    );

    // ---- 3. 409 runtime_conflict keeps the edit as a draft --------------
    // The module is holding revision R; move the server past it out of band.
    live = await snapshot();
    await api("PUT", `/runtime-control?sessionId=${sessionId}`, {
      revision: live.revision,
      operation: "exposure",
      id: "tool:ws_list",
      scope: { type: "workspace", id: resource(live, "sandbox:workspace") ? live.scopes.find((s) => s.type === "workspace").id : null },
      exposed: false,
    });
    sent.length = 0;
    const conflictSwitch = rowFor("tool:ws_read").querySelector(
      ".runtime-switch input",
    );
    conflictSwitch.click();
    await wait(1200);
    const draftBanner = root.querySelector("[data-banner='conflict-draft']");
    const conflictPuts = sent.filter((s) => s.body.operation === "exposure");
    record(
      "conflict-draft",
      "409 runtime_conflict refreshes, keeps the edit as a draft and never resends (RC-4)",
      Boolean(draftBanner) &&
        conflictPuts.length === 1 &&
        draftBanner.textContent.includes("kept here as a draft") &&
        [...draftBanner.querySelectorAll("button")].map((b) => b.textContent).join(",") ===
          "Submit this change,Discard the draft" &&
        draftBanner.textContent.includes("tool:ws_read"),
      `puts=${conflictPuts.length} banner="${draftBanner?.textContent?.slice(0, 160)}"`,
    );
    // Applying the kept draft explicitly is the user's act, and it succeeds.
    sent.length = 0;
    draftBanner
      ?.querySelector("button")
      ?.click();
    await wait(1200);
    record(
      "conflict-draft-apply",
      "the kept draft is applied only when the user asks, on the fresh revision",
      !root.querySelector("[data-banner='conflict-draft']") &&
        sent.length === 1 &&
        sent[0].body.revision === live.revision + 1,
      `resent revision=${sent[0]?.body.revision} (server was ${live.revision + 1})`,
    );

    // ---- 4. 409 active_run freezes the module --------------------------
    const run = await api("POST", `/sessions/${sessionId}/runs`, {
      commandId: `rc-counterexample-${Date.now()}`,
      input: '/fixture script [{"name":"ask_user","arguments":{"prompt":"hold"}}]',
    });
    if (!run.json?.run?.id)
      throw new Error(
        `the freeze case could not start a run: ${run.status} ${JSON.stringify(run.json)}`,
      );
    await wait(2500);
    // The page still holds a snapshot that says no run is active: the 409 is
    // what makes it read-only, not a local guess.
    sent.length = 0;
    const frozenSwitch = rowFor("tool:ws_read").querySelector(".runtime-switch input");
    const wasDisabled = frozenSwitch.disabled;
    frozenSwitch.click();
    await wait(1200);
    const banner = root.querySelector("[data-banner='active-run']");
    const disabledNow = [
      ...root.querySelectorAll(".runtime-switch input, .runtime-mcp-line button, .runtime-inherit"),
    ];
    const readableNow = root.querySelectorAll(".runtime-row-title:not([disabled])").length;
    record(
      "active-run-freeze",
      "409 active_run makes the whole module read-only, and it stays readable (RC-4)",
      Boolean(banner) &&
        banner.textContent ===
          "A run is active. Changes can be submitted after it ends." &&
        disabledNow.length > 0 &&
        disabledNow.every((n) => n.disabled) &&
        readableNow > 0,
      `switch was disabled before the attempt: ${wasDisabled}; ${disabledNow.length} controls disabled, ${readableNow} rows still open on click`,
    );
    await api("POST", `/runs/${run.json.run.id}/cancel`, {});
    await wait(2500);
    $("surface-preview-tab").click();
    await wait(300);
    $("surface-runtime-tab").click();
    await wait(1200);
    record(
      "freeze-lifts",
      "the freeze lifts from a fresh snapshot once the run ends",
      !root.querySelector("[data-banner='active-run']") &&
        root.querySelector(".runtime-switch input").disabled === false,
      `banner gone=${!root.querySelector("[data-banner='active-run']")}`,
    );

    // ---- 5. a prompt template only fills the composer -------------------
    const templateRow = root.querySelector(
      ".runtime-row[data-kind='prompt_template']",
    );
    const templateId = templateRow.dataset.resource;
    templateRow.querySelector(".runtime-row-title").click();
    await wait(300);
    const runsBefore = (await api("GET", `/sessions/${sessionId}`)).json.runs.length;
    const draftButton = [
      ...rowFor(templateId).querySelectorAll(".runtime-row-actions button"),
    ].find((b) => b.textContent === "Use as draft");
    draftButton.click();
    await wait(1200);
    const source = (
      await api("GET", `/runtime-resources/${encodeURIComponent(templateId)}?sessionId=${sessionId}`)
    ).json;
    const runsAfter = (await api("GET", `/sessions/${sessionId}`)).json.runs.length;
    record(
      "template-draft-only",
      "invoking a template fills the composer and starts nothing (RC-7)",
      $("composer-input").value === source.content &&
        runsAfter === runsBefore &&
        $("composer-input").value.length > 0,
      `runs ${runsBefore} -> ${runsAfter}; composer=${JSON.stringify($("composer-input").value.slice(0, 60))}`,
    );

    // ---- 6. the source inspector is administration, not model access ----
    const hidden = "tool:ws_grep";
    live = await snapshot();
    await api("PUT", `/runtime-control?sessionId=${sessionId}`, {
      revision: live.revision,
      operation: "exposure",
      id: "local:conventions",
      scope: { type: "session", id: sessionId },
      exposed: false,
    });
    $("surface-preview-tab").click();
    await wait(300);
    $("surface-runtime-tab").click();
    await wait(1200);
    rowFor("local:conventions").querySelector(".runtime-row-title").click();
    await wait(300);
    [...rowFor("local:conventions").querySelectorAll(".runtime-row-actions button")]
      .find((b) => b.textContent === "View source")
      ?.click();
    await wait(900);
    const inspector = rowFor("local:conventions").querySelector(".runtime-source");
    const body = (
      await api("GET", `/runtime-resources/local%3Aconventions?sessionId=${sessionId}`)
    ).json;
    record(
      "source-inspector",
      "a disabled resource still reads for the local user, and says the model may not (RC-8)",
      Boolean(inspector) &&
        inspector.textContent.includes(
          "The model is not authorized to read this. You are reading it as the local administrator.",
        ) &&
        inspector.querySelector(".file-text")?.textContent === body.content &&
        /^[0-9a-f]{12}$/.test(
          inspector.querySelector(".version-line code")?.textContent || "",
        ),
      `exposed=${body.resource.exposed} hash=${inspector?.querySelector(".version-line code")?.textContent}`,
    );

    // ---- 7. no retry control anywhere in the module ---------------------
    const retryish = [...root.querySelectorAll("button")].filter((b) =>
      /retry|try again|resend/i.test(b.textContent + " " + (b.getAttribute("aria-label") || "")),
    );
    record(
      "no-retry",
      "no control in the module replays an operation whose effect is unknown (RC-4)",
      retryish.length === 0,
      `${root.querySelectorAll("button").length} buttons, ${retryish.length} named like a retry`,
    );

    return { results, sent: sent.length };
  } catch (error) {
    record("harness", "every case ran to completion", false, String(error));
    return { results, error: String(error) };
  } finally {
    restore();
  }
};
