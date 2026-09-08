/* WO-WK10b 第二段 · the per-rule reading, the decisions, the revision, the
 * receipt and «continue existing», checked in a real browser against the real
 * server seeded by seed.mjs. Every assertion reads the product's own DOM or the
 * host's own state; none of them constructs a packet.
 *
 *   WK10B2_BASE=http://127.0.0.1:8874 WK10B2_CDP_PORT=19660 node checks.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, observations } from "./harness.mjs";

const seed = JSON.parse(await readFile(new URL("./seed.json", import.meta.url), "utf8"));
const ui = "window.__V5_UI__";
const state = `${ui}.state`;
const results = [];
let failures = 0;
function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
  if (!pass) failures += 1;
  const shown = detail === undefined ? "" : JSON.stringify(detail);
  console.log(pass ? "ok  " : "FAIL", name, shown.length > 600 ? `${shown.slice(0, 600)}…` : shown);
}
const json = (value) => JSON.stringify(value);

async function openSession(sessionId) {
  await ev(`${ui}.state.view = "session"`);
  await ev(`(async()=>{ await window.__V5_UI__.request; })()`).catch(() => {});
  await ev(
    `(async () => {
      const buttons = [...document.querySelectorAll('#project-list .project-toggle')];
      for (const button of buttons) if (button.getAttribute('aria-expanded') !== 'true') button.click();
      await new Promise(r => setTimeout(r, 500));
      const target = document.querySelector('[data-nav-key="session:' + ${json(sessionId)} + '"]');
      if (target) target.click();
      await new Promise(r => setTimeout(r, 900));
    })()`,
  );
  await waitFor(`${state}.activeSessionId === ${json(sessionId)}`);
}

/* The pane is what reads the packet; the rail card reads the same field the
 * pane filled. Both states are exercised, in that order. */
async function openSurface() {
  await ev(
    `(() => {
      const open = document.querySelector('#show-surface-button');
      if (open && !window.__V5_UI__.state.surface.open) open.click();
      if (!window.__V5_UI__.state.surface.expanded)
        document.querySelector('#surface-expand-button')?.click();
    })()`,
  );
  await waitFor(`${state}.surface.open === true && ${state}.surface.expanded === true`);
  await waitFor(`${state}.surface.projection !== null`);
  await sleep(500);
}

const mounted = () =>
  ev(`document.querySelectorAll('[data-extension="inbound-nda"]').length`);

try {
  await cdp("Network.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor("window.__V5_UI__?.state.projects.length > 0");

  /* ---------------------------------------------------------------- A: the
   * per-rule reading. One row per finding, the packet's own status word, the
   * anchor and the frozen quote in the expanded state. */
  await openSession(seed.sessions.complete);
  await openSurface();
  check("renderer mounts at its declared path", (await mounted()) === 1 && (await ev(`${ui}.slot().mount`)) === true);
  const rules = await ev(`(() => {
    const rows = [...document.querySelectorAll('.rule-row')];
    return rows.map(row => ({
      title: row.querySelector('.flow-title')?.textContent,
      meta: row.querySelector('.flow-meta')?.textContent,
      glyphs: row.querySelectorAll('summary > svg').length,
      glyphBox: (() => { const g = row.querySelector('summary > svg'); return g ? [g.getBoundingClientRect().width, g.getBoundingClientRect().height] : null; })(),
      metas: row.querySelectorAll('summary > .flow-meta').length,
    }));
  })()`);
  const packetStatuses = await ev(
    `${state}.surface.projection.candidates[0].domain.findings.map(f => [f.ruleId, f.status])`,
  );
  check(
    "one row per finding, with the packet's own rule id and status word",
    rules.length === packetStatuses.length &&
      rules.every((row, i) => row.title === packetStatuses[i][0] && row.meta === packetStatuses[i][1]),
    { rules: rules.map((r) => [r.title, r.meta]), packet: packetStatuses },
  );
  check(
    "each rule row is the one anatomy: one 16 glyph, one title, at most one metadata word",
    rules.every((row) => row.glyphs === 1 && row.metas <= 1 && row.glyphBox[0] === 16 && row.glyphBox[1] === 16),
    rules.map((r) => r.glyphBox),
  );
  const expanded = await ev(`(async () => {
    const row = document.querySelector('.rule-row');
    row.querySelector('summary').click();
    await new Promise(r => setTimeout(r, 150));
    const finding = window.__V5_UI__.state.surface.projection.candidates[0].domain.findings[0];
    const anchor = finding.evidence[0];
    return {
      reason: row.querySelector('.rule-reason')?.textContent,
      packetReason: finding.reason,
      ref: row.querySelector('.rule-anchor-ref')?.textContent,
      expectedRef: anchor.source_id + ':' + anchor.source_version + ' [' + anchor.start + ', ' + anchor.end + ']',
      quote: row.querySelector('.rule-quote')?.textContent,
      packetQuote: anchor.quote,
    };
  })()`);
  check(
    "the expanded rule shows the packet's reason, its Unicode anchor and its frozen quote",
    expanded.reason === expanded.packetReason &&
      expanded.ref === expanded.expectedRef &&
      expanded.quote === expanded.packetQuote,
    expanded,
  );
  const once = await ev(`(() => {
    const text = document.querySelector('.work-packet').textContent;
    const playbook = window.__V5_UI__.state.surface.projection.candidates[0].domain.playbookVersion;
    return {
      playbookCount: text.split(playbook).length - 1,
      reconciliationBlocks: document.querySelectorAll('.work-facts-block').length,
      candidates: document.querySelectorAll('.work-candidate').length,
    };
  })()`);
  check(
    "the playbook version and the recorded facts are stated once per candidate, not once per rule",
    once.playbookCount === once.candidates && once.reconciliationBlocks === once.candidates,
    once,
  );

  /* Inline and detail read one packet: the collapsed card's state word is the
   * same stateVersion the pane is showing (FE-T07 discipline). */
  const sameVersion = await ev(`(async () => {
    const before = window.__V5_UI__.state.surface.projection.stateVersion;
    const paneText = document.querySelector('.work-packet').textContent;
    window.__V5_UI__.state.surface.expanded = false;
    window.__V5_UI__.renderAll();
    await new Promise(r => setTimeout(r, 300));
    const card = [...document.querySelectorAll('#surface-rail .rail-card')].find(n => n.dataset.module === 'preview');
    const rows = card ? [...card.querySelectorAll('.rail-row')].map(r => r.textContent) : [];
    return { before, paneHasState: paneText.includes(before.slice(0, 12)), rows };
  })()`);
  check(
    "the collapsed card and the expanded pane state one stateVersion",
    sameVersion.paneHasState &&
      sameVersion.rows.some((row) => row.includes(sameVersion.before.slice(0, 12))),
    sameVersion,
  );

  /* ---------------------------------------------------------------- B: the
   * decisions. Only what the descriptor's enum names, object-named, with a
   * required reason. */
  await openSurface();
  const buttons = await ev(`[...document.querySelectorAll('.candidate-actions button')].map(b => b.textContent)`);
  check(
    "the complete review offers exactly the three decisions its descriptor names",
    json(buttons) === json(["Accept this version", "Reject", "Request evidence"]),
    { buttons, enum: seed.enums.complete },
  );
  const names = await ev(`[...document.querySelectorAll('.surface-content button, .surface-content summary')]
    .map(n => (n.getAttribute('aria-label') || n.textContent || '').trim()).filter(t => t.length === 0).length`);
  check("every control in the work surface has a non-empty accessible name", names === 0, { empty: names });

  const emptyReason = await ev(`(async () => {
    const posted = [];
    const original = window.fetch;
    window.fetch = (...args) => { posted.push(String(args[0])); return original(...args); };
    document.querySelector('.candidate-actions button[data-decision="accept"]').click();
    await new Promise(r => setTimeout(r, 250));
    window.fetch = original;
    return {
      actionPosts: posted.filter(u => u.includes('/actions')).length,
      error: document.querySelector('.candidate-actions .inline-error')?.textContent,
      focused: document.activeElement?.tagName,
    };
  })()`);
  check(
    "a decision with no reason is not sent, and says so where the reason is typed",
    emptyReason.actionPosts === 0 &&
      emptyReason.error === "A reason is required for this decision." &&
      emptyReason.focused === "TEXTAREA",
    emptyReason,
  );

  /* FE-T06 · an acknowledgement that never arrives. The transport is cut at the
   * browser, not faked at the server: the client sees a network failure, keeps
   * its draft and its request identity, promotes nothing, and replays nothing
   * by itself. The person clicks again, and Core answers with the one Decision
   * it recorded. */
  await ev(`(() => {
    const area = document.querySelector('.candidate-actions textarea');
    area.value = 'Reviewed against the recorded source';
    area.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await cdp("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await ev(`document.querySelector('.candidate-actions button[data-decision="accept"]').click()`);
  await sleep(1200);
  const lost = await ev(`({
    notice: document.querySelector('.candidate-actions .inline-error')?.textContent,
    draft: document.querySelector('.candidate-actions textarea')?.value,
    stillPending: window.__V5_UI__.state.surface.projection.candidates[0].status,
    decisions: window.__V5_UI__.state.surface.projection.decisions.length,
    receipts: document.querySelectorAll('.decision-receipt').length,
  })`);
  check(
    "a lost acknowledgement is neither a success nor a refusal: no receipt, no promotion, the draft stays",
    lost.notice?.startsWith("The decision was not acknowledged") &&
      lost.draft === "Reviewed against the recorded source" &&
      lost.stillPending === "pending" &&
      lost.decisions === 0 &&
      lost.receipts === 0,
    lost,
  );
  await cdp("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  const posted = await ev(`(async () => {
    const bodies = [];
    const original = window.fetch;
    window.fetch = (...args) => { if (args[1]?.body) bodies.push(String(args[1].body)); return original(...args); };
    document.querySelector('.candidate-actions button[data-decision="accept"]').click();
    await new Promise(r => setTimeout(r, 2500));
    window.fetch = original;
    return bodies.filter(b => b.includes('"decide"'));
  })()`);
  const retryId = posted.length ? JSON.parse(posted[0]).payload.request_id : null;
  await sleep(800);
  const accepted = await ev(`({
    status: window.__V5_UI__.state.surface.projection.candidates[0].status,
    decisions: window.__V5_UI__.state.surface.projection.decisions.map(d => [d.action, d.request_id]),
    version: window.__V5_UI__.state.surface.projection.matter.version,
    artifact: Boolean(window.__V5_UI__.state.surface.projection.artifact),
  })`);
  check(
    "the retry uses the same request identity and Core records exactly one Decision",
    accepted.decisions.length === 1 &&
      accepted.decisions[0][0] === "accept" &&
      accepted.decisions[0][1] === retryId &&
      accepted.status === "accepted" &&
      accepted.artifact === true,
    { retryId, accepted },
  );

  /* ---------------------------------------------------------------- D: the
   * receipt. One read-only row after the Run the decision belongs to, drawn
   * only because the request query returned a committed result. */
  const receipt = await ev(`(() => {
    const rows = [...document.querySelectorAll('.decision-receipt')];
    return rows.map(row => ({
      title: row.querySelector('.flow-title')?.textContent,
      meta: row.querySelector('.flow-meta')?.textContent,
      note: row.querySelector('.work-note')?.textContent,
      buttons: row.querySelectorAll('button').length,
      afterRunStatus: Boolean(row.previousElementSibling?.classList.contains('run-status-card')),
    }));
  })()`);
  const stateVersion = await ev(`${state}.surface.projection.stateVersion.slice(0, 12)`);
  check(
    "the accepted decision becomes one read-only row after its Run, naming the version and the work state",
    receipt.length === 1 &&
      receipt[0].meta === "Accepted this version" &&
      receipt[0].buttons === 0 &&
      receipt[0].afterRunStatus === true &&
      receipt[0].note === `version 1 · state ${stateVersion}` &&
      seed.candidates.complete.startsWith(receipt[0].title.replace("…", "")),
    { receipt, stateVersion },
  );
  const nullReceipt = await ev(`(async () => {
    const store = window.__V5_UI__.state.work;
    const id = [...store.receipts.keys()][0];
    const kept = store.receipts.get(id);
    store.receipts.set(id, null);
    window.__V5_UI__.renderAll();
    await new Promise(r => setTimeout(r, 200));
    const rows = document.querySelectorAll('.decision-receipt').length;
    store.receipts.set(id, kept);
    window.__V5_UI__.renderAll();
    await new Promise(r => setTimeout(r, 200));
    return { withNull: rows, restored: document.querySelectorAll('.decision-receipt').length };
  })()`);
  check(
    "a null receipt draws no success row",
    nullReceipt.withNull === 0 && nullReceipt.restored === 1,
    nullReceipt,
  );

  /* ---------------------------------------------------------------- C: the
   * revision. Advertised for the accepted parent at the current version; the
   * extension re-verifies it, and the parent and its Decision are untouched. */
  const reviseOffered = await ev(`(() => ({
    revise: document.querySelectorAll('.candidate-revision').length,
    decide: document.querySelectorAll('.candidate-actions').length,
    advertised: window.__V5_UI__.state.surface.projection.humanActions.map(a => a.action),
  }))()`);
  check(
    "an accepted candidate advertises a revision and no decision",
    reviseOffered.revise === 1 &&
      reviseOffered.decide === 0 &&
      json(reviseOffered.advertised) === json(["revise_candidate"]),
    reviseOffered,
  );
  const refused = await ev(`(async () => {
    document.querySelector('.candidate-revision summary').click();
    await new Promise(r => setTimeout(r, 200));
    const status = document.querySelector('.revision-rule input');
    status.value = 'pass-but-edited';
    status.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.revision-body .work-actions button').click();
    await new Promise(r => setTimeout(r, 2000));
    return {
      error: document.querySelector('.revision-body .inline-error')?.textContent,
      candidates: window.__V5_UI__.state.surface.projection.candidates.length,
      parentStatus: window.__V5_UI__.state.surface.projection.candidates[0].status,
      decisions: window.__V5_UI__.state.surface.projection.decisions.length,
    };
  })()`);
  check(
    "a hand-edited finding is refused by the extension, and nothing is saved",
    Boolean(refused.error) &&
      refused.candidates === 1 &&
      refused.parentStatus === "accepted" &&
      refused.decisions === 1,
    refused,
  );
  const saved = await ev(`(async () => {
    const status = document.querySelector('.revision-rule input');
    const packetStatus = window.__V5_UI__.state.surface.projection.candidates[0].domain.findings[0].status;
    status.value = packetStatus;
    status.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.revision-body .work-actions button').click();
    await new Promise(r => setTimeout(r, 2500));
    const p = window.__V5_UI__.state.surface.projection;
    const child = p.candidates.find(c => c.supersedes);
    return {
      candidates: p.candidates.length,
      parent: (() => { const parent = p.candidates.find(c => !c.supersedes); return { id: parent.id, status: parent.status }; })(),
      childId: child?.id ?? null,
      childProvenance: child?.provenance ?? null,
      decisions: p.decisions.length,
      artifact: p.artifact?.candidate_id ?? null,
      lineageShown: document.querySelector('.work-packet').textContent.includes('supersedes'),
    };
  })()`);
  check(
    "the saved revision is a new candidate with lineage; the old candidate, its Decision and the accepted version stay",
    saved.candidates === 2 &&
      saved.parent.status === "accepted" &&
      saved.childProvenance?.kind === "human_revision" &&
      saved.decisions === 1 &&
      saved.artifact === saved.parent.id &&
      saved.lineageShown === true,
    saved,
  );

  /* The earlier decision is not re-opened by the revision: replaying its
   * request identity returns the same one Decision, and a fresh decision built
   * on the old base is refused. */
  const oldDecision = await ev(`(async () => {
    const p = window.__V5_UI__.state.surface.projection;
    const decision = p.decisions[0];
    const replay = await window.__V5_UI__.request(
      '/sessions/' + window.__V5_UI__.state.activeSessionId + '/actions',
      { method: 'POST', body: { extensionId: 'inbound-nda', generation: 0, action: 'decide',
        payload: { request_id: decision.request_id, candidate_id: decision.candidate_id,
          base_version: decision.scope.base_version, action: 'accept', reason: decision.reason } } });
    let stale = null;
    try {
      await window.__V5_UI__.request('/sessions/' + window.__V5_UI__.state.activeSessionId + '/actions',
        { method: 'POST', body: { extensionId: 'inbound-nda', generation: 0, action: 'decide',
          payload: { request_id: 'stale-base-' + Date.now(), candidate_id: decision.candidate_id,
            base_version: decision.scope.base_version, action: 'reject', reason: 'A second decision on the old base' } } });
    } catch (error) { stale = { status: error.status, code: error.body?.error?.code }; }
    const after = await window.__V5_UI__.request('/sessions/' + window.__V5_UI__.state.activeSessionId + '/surface');
    return { replay: replay.result, stale, decisions: after.projection.decisions.length };
  })()`);
  check(
    "after the revision the earlier decision is neither re-opened nor duplicated, and a new decision on the old base is refused",
    oldDecision.replay?.action === "accept" &&
      oldDecision.stale?.status === 409 &&
      oldDecision.decisions === 1,
    oldDecision,
  );

  /* ---------------------------------------------------------------- B2: the
   * unresolved review offers no accept, because its descriptor's enum does not
   * name one. */
  await openSession(seed.sessions.unresolved);
  await openSurface();
  const unresolved = await ev(`({
    buttons: [...document.querySelectorAll('.candidate-actions button')].map(b => b.textContent),
    enum: window.__V5_UI__.state.surface.projection.humanActions.find(a => a.action === 'decide').payloadSchema.properties.action.enum,
    statuses: [...document.querySelectorAll('.rule-row .flow-meta')].map(n => n.textContent),
    metaColours: [...document.querySelectorAll('.rule-row .flow-meta')].map(n => getComputedStyle(n).color),
  })`);
  check(
    "an unresolved review offers no accept anywhere on the surface",
    json(unresolved.buttons) === json(["Reject", "Request evidence"]) &&
      !unresolved.enum.includes("accept"),
    unresolved,
  );
  check(
    "an unknown status word is grey like the rest: unknown is not failed",
    new Set(unresolved.metaColours).size === 1 && unresolved.statuses.includes("unknown"),
    unresolved,
  );

  /* The one word this product colours, on a real conflicting packet, with the
   * word itself always present (FN-28: never colour alone). */
  await openSession(seed.sessions.conflicting);
  await openSurface();
  const conflicting = await ev(`(() => {
    const metas = [...document.querySelectorAll('.rule-row .flow-meta')];
    const conflict = metas.find(n => n.textContent === 'conflict');
    const other = metas.find(n => n.textContent !== 'conflict');
    return {
      words: metas.map(n => n.textContent),
      conflictColour: conflict ? getComputedStyle(conflict).color : null,
      otherColour: other ? getComputedStyle(other).color : null,
      flagged: conflict ? conflict.closest('.rule-row').classList.contains('is-flagged') : false,
    };
  })()`);
  check(
    "a conflict is the one coloured status word, and the word carries it too",
    conflicting.words.includes("conflict") &&
      conflicting.flagged &&
      conflicting.conflictColour !== conflicting.otherColour,
    conflicting,
  );

  /* ---------------------------------------------------------------- E: continue
   * existing. The panel is two segments; the list is this project's work only. */
  await openSession(seed.sessions.continuation);
  const panel = await ev(`(async () => {
    document.querySelector('#runtime-setup-button')?.click();
    await new Promise(r => setTimeout(r, 600));
    document.querySelector('.developer-settings').open = true;
    await new Promise(r => setTimeout(r, 300));
    const row = [...document.querySelectorAll('.extension-row')]
      .find(node => node.textContent.includes('inbound-nda'));
    [...row.querySelectorAll('button')].find(b => b.textContent === 'Bind to session').click();
    await new Promise(r => setTimeout(r, 1200));
    const segments = [...document.querySelectorAll('#binding-panel .binding-segment h4')].map(n => n.textContent);
    const entries = [...document.querySelectorAll('#binding-panel .binding-entry')].map(node => ({
      label: node.querySelector('button')?.getAttribute('aria-label'),
      meta: node.querySelector('.flow-meta')?.textContent,
      note: node.querySelector('.work-note')?.textContent,
    }));
    return { segments, entries, fields: [...document.querySelectorAll('#binding-panel .binding-field')].map(n => n.textContent.split('Maximum')[0].trim()) };
  })()`);
  check(
    "the binding panel is two segments: create new keeps the manifest fields, continue existing lists this project's work",
    json(panel.segments) === json(["Create new", "Continue existing"]) &&
      panel.entries.length === 3 &&
      panel.entries.every((entry) => entry.note.startsWith("inbound-nda")) &&
      panel.fields.length === 3,
    panel,
  );
  const crossProject = await ev(
    `(async () => (await window.__V5_UI__.request('/projects/' + ${json(seed.otherProjectId)} + '/work')).matters.length)()`,
  );
  check("another project's work is not in this project's list", crossProject === 0, { crossProject });

  await ev(`(async () => {
    const entry = [...document.querySelectorAll('#binding-panel .binding-entry button')]
      .find(b => b.getAttribute('aria-label') === 'Continue ' + ${json(seed.matterId)});
    entry.click();
    await new Promise(r => setTimeout(r, 2500));
  })()`);
  await openSurface();
  const continued = await ev(`(async () => {
    const session = window.__V5_UI__.state.session;
    const p = window.__V5_UI__.state.surface.projection;
    return {
      bound: session.extensionBinding?.binding?.matterId ?? null,
      candidates: p.candidates.map(c => [c.id, c.status]),
      decisions: p.decisions.map(d => d.action),
      panelHidden: document.querySelector('#binding-panel').hidden,
      rules: document.querySelectorAll('.rule-row').length,
    };
  })()`);
  check(
    "a new Session that continues the work shows the original candidates and the decision made in the other Session",
    continued.bound === seed.matterId &&
      continued.candidates.length === 2 &&
      json(continued.decisions) === json(["accept"]) &&
      continued.panelHidden === true &&
      continued.rules > 0,
    continued,
  );
  const bindingExists = await ev(`(async () => {
    try {
      await window.__V5_UI__.request('/sessions/' + window.__V5_UI__.state.activeSessionId + '/extension',
        { method: 'POST', body: { extensionId: 'inbound-nda', input: { existingMatterId: ${json(seed.matterId)} } } });
      return { refused: false };
    } catch (error) { return { refused: true, status: error.status, code: error.body?.error?.code }; }
  })()`);
  check(
    "a second binding on a bound Session is refused by the server, not by a guess here",
    bindingExists.refused && bindingExists.status === 409 && bindingExists.code === "binding_exists",
    bindingExists,
  );

  const released = await ev(`(async () => {
    document.querySelector('#runtime-setup-button')?.click();
    await new Promise(r => setTimeout(r, 600));
    document.querySelector('.developer-settings').open = true;
    await new Promise(r => setTimeout(r, 300));
    const row = [...document.querySelectorAll('.extension-row')].find(n => n.textContent.includes('inbound-nda'));
    [...row.querySelectorAll('button')].find(b => b.textContent === 'Release').click();
    await new Promise(r => setTimeout(r, 2000));
    const work = await window.__V5_UI__.request('/projects/' + ${json(seed.projectId)} + '/work');
    return {
      binding: window.__V5_UI__.state.session.extensionBinding,
      matters: work.matters.length,
      stillOwned: work.matters.some(m => m.matter.id === ${json(seed.matterId)}),
    };
  })()`);
  check(
    "releasing the binding returns the Session to plain chat and leaves the work with the project",
    released.binding === null && released.matters === 3 && released.stillOwned === true,
    released,
  );

  check("no page exception", observations.exceptions.length === 0, observations.exceptions);
  await writeFile(new URL("./checks.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length}`);
} finally {
  await sleep(400);
  await close();
}
if (failures) process.exit(1);
