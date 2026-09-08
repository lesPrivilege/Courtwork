/* WO-WK10b 第二段 · the counterexamples: a decision refused by a state this
 * reading no longer knows (FE-T06's third fact), the three absences injected
 * separately (FE-T08), and an old candidate read after its source set was
 * replaced (FE-T11). Runs after checks.mjs, against the same server and the
 * same seeded work.
 *
 *   WK10B2_BASE=http://127.0.0.1:8874 WK10B2_CDP_PORT=19662 node fallbacks.mjs
 */
import { readFile, writeFile, rename } from "node:fs/promises";
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, observations } from "./harness.mjs";

const seed = JSON.parse(await readFile(new URL("./seed.json", import.meta.url), "utf8"));
const rendererFile = new URL("../../app/extensions/inbound-nda/renderer.mjs", import.meta.url);
const parkedFile = new URL("../../app/extensions/inbound-nda/renderer.parked", import.meta.url);
const ui = "window.__V5_UI__";
const state = `${ui}.state`;
const results = [];
let failures = 0;
function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
  if (!pass) failures += 1;
  const shown = detail === undefined ? "" : JSON.stringify(detail);
  console.log(pass ? "ok  " : "FAIL", name, shown.length > 700 ? `${shown.slice(0, 700)}…` : shown);
}
const json = (value) => JSON.stringify(value);

async function openSession(sessionId) {
  await ev(
    `(async () => {
      for (const button of document.querySelectorAll('#project-list .project-toggle'))
        if (button.getAttribute('aria-expanded') !== 'true') button.click();
      await new Promise(r => setTimeout(r, 500));
      document.querySelector('[data-nav-key="session:' + ${json(sessionId)} + '"]')?.click();
      await new Promise(r => setTimeout(r, 900));
    })()`,
  );
  await waitFor(`${state}.activeSessionId === ${json(sessionId)}`);
}
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
async function reload() {
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor("window.__V5_UI__?.state.projects.length > 0");
}

let parked = false;
try {
  await cdp("Network.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await reload();

  /* ------------------------------------------------------------ FE-T11 · the
   * source set is replaced under a candidate that was already proposed. The old
   * candidate stays readable, its finding is not re-judged, and its quote is
   * still the revision it was frozen against. */
  await openSession(seed.sessions.unresolved);
  await openSurface();
  const before = await ev(`({
    statuses: window.__V5_UI__.state.surface.projection.candidates[0].domain.findings.map(f => [f.ruleId, f.status]),
    sourceVersion: window.__V5_UI__.state.surface.projection.matter.source_version,
    decide: window.__V5_UI__.state.surface.projection.humanActions.some(a => a.action === 'decide'),
  })`);
  await ev(`(() => {
    const area = document.querySelector('.candidate-actions textarea');
    area.value = 'A reason typed before the source changed';
    area.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  /* The replacement is made through the product's own client, so the open
   * reading becomes stale exactly the way a second window would make it stale.
   * The host is not told; it finds out from the refusal. */
  const replaced = await ev(`(async () => {
    const p = window.__V5_UI__.state.surface.projection;
    const source = p.sources[0];
    const text = source.text.split('\\n').filter(line => !line.startsWith('4. Term.')).join('\\n');
    const bytes = new TextEncoder().encode(text);
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map(b => b.toString(16).padStart(2, '0')).join('');
    await window.__V5_UI__.request('/sessions/' + window.__V5_UI__.state.activeSessionId + '/actions', {
      method: 'POST',
      body: { extensionId: 'inbound-nda', generation: 0, action: 'replace_sources',
        payload: { revision: 2, sources: [{ id: source.id, version: 2, text, digest }] } },
    });
    return { oldHadTerm: source.text.includes('4. Term.'), newHasTerm: text.includes('4. Term.') };
  })()`);
  const stale = await ev(`(async () => {
    document.querySelector('.candidate-actions button[data-decision="reject"]').click();
    await new Promise(r => setTimeout(r, 2500));
    const p = window.__V5_UI__.state.surface.projection;
    return {
      error: document.querySelector('.candidate-actions .inline-error')?.textContent
        ?? document.querySelector('.work-packet .inline-error')?.textContent ?? null,
      toast: document.querySelector('.toast')?.textContent ?? null,
      matterSourceVersion: p.matter.source_version,
      candidateSourceVersion: p.candidates[0].source_version,
      decide: p.humanActions.some(a => a.action === 'decide'),
      decisions: p.decisions.length,
      controls: document.querySelectorAll('.candidate-actions').length,
      statuses: p.candidates[0].domain.findings.map(f => [f.ruleId, f.status]),
      quoteStillFrozen: document.querySelector('.work-packet').textContent.includes('4. Term.')
        || p.candidates[0].domain.findings.some(f => f.evidence.some(e => e.quote.startsWith('4. Term.'))),
      currentSourceHasTerm: p.sources[0].text.includes('4. Term.'),
    };
  })()`);
  check(
    "a decision on a stale reading is refused, the host reads the authoritative state, and no Decision is recorded",
    stale.matterSourceVersion === 2 &&
      stale.candidateSourceVersion === 1 &&
      stale.decide === false &&
      stale.decisions === 0 &&
      stale.controls === 0,
    stale,
  );
  check(
    "the old candidate is not re-judged by the new source: its status words are the ones it was proposed with",
    json(stale.statuses) === json(before.statuses) &&
      stale.quoteStillFrozen === true &&
      stale.currentSourceHasTerm === false &&
      replaced.oldHadTerm === true &&
      replaced.newHasTerm === false,
    { before: before.statuses, after: stale.statuses, replaced },
  );
  const historical = await ev(`(async () => {
    const rows = [...document.querySelectorAll('.rule-row')];
    const term = rows.find(row => row.querySelector('.flow-title')?.textContent === 'term-duration');
    term.querySelector('summary').click();
    await new Promise(r => setTimeout(r, 200));
    const button = [...term.querySelectorAll('button')].find(b => b.textContent === 'Read the recorded source');
    button.click();
    await new Promise(r => setTimeout(r, 1500));
    const shown = term.querySelector('.rule-source-text')?.textContent ?? null;
    return {
      shownHasTerm: shown ? shown.includes('4. Term.') : null,
      currentHasTerm: window.__V5_UI__.state.surface.projection.sources[0].text.includes('4. Term.'),
      ref: term.querySelector('.rule-anchor-ref')?.textContent,
    };
  })()`);
  check(
    "the quote of an old candidate is read from its own frozen revision, not back-filled from the current sources",
    historical.shownHasTerm === true && historical.currentHasTerm === false && historical.ref.endsWith(":1 [672, 765]"),
    historical,
  );

  /* ------------------------------------------------------------ the host
   * freezes actions while a Run holds the work. The refusal is prevented, not
   * raced: the packet comes back read only and carries no control. */
  await openSession(seed.sessions.conflicting);
  await openSurface();
  const duringRun = await ev(`(async () => {
    const sessionId = window.__V5_UI__.state.activeSessionId;
    const candidate = window.__V5_UI__.state.surface.projection.candidates[0].id;
    const created = await window.__V5_UI__.request('/sessions/' + sessionId + '/runs',
      { method: 'POST', body: { commandId: 'slow', input: '/fixture slow' } });
    for (let i = 0; i < 60; i++) {
      const run = await window.__V5_UI__.request('/runs/' + created.run.id);
      if (run.run.status === 'running') break;
      await new Promise(r => setTimeout(r, 100));
    }
    const surface = await window.__V5_UI__.request('/sessions/' + sessionId + '/surface');
    let refused = null;
    try {
      await window.__V5_UI__.request('/sessions/' + sessionId + '/actions', {
        method: 'POST', body: { extensionId: 'inbound-nda', generation: 0, action: 'decide',
          payload: { request_id: 'during-run', candidate_id: candidate,
            base_version: 0, action: 'reject', reason: 'While a run holds the work' } } });
    } catch (error) { refused = { status: error.status, code: error.body?.error?.code }; }
    await window.__V5_UI__.request('/runs/' + created.run.id + '/cancel', { method: 'POST', body: {} });
    for (let i = 0; i < 80; i++) {
      const run = await window.__V5_UI__.request('/runs/' + created.run.id);
      if (['completed', 'cancelled', 'failed', 'unknown'].includes(run.run.status)) break;
      await new Promise(r => setTimeout(r, 100));
    }
    return { readOnly: surface.projection.readOnly, actions: surface.projection.humanActions.length, refused };
  })()`);
  check(
    "while a Run holds the work the packet is read only and the action is refused by the host",
    duringRun.readOnly === true &&
      duringRun.actions === 0 &&
      duringRun.refused?.status === 409 &&
      duringRun.refused?.code === "active_run",
    duringRun,
  );

  /* ------------------------------------------------------------ FE-T08 (1) ·
   * the renderer bytes are removed while the producer stays loaded. The
   * declared module 404s; the packet is still read, read-only. */
  await rename(rendererFile, parkedFile);
  parked = true;
  await reload();
  await openSession(seed.sessions.conflicting);
  await openSurface();
  const rendererAbsent = await ev(`({
    reason: window.__V5_UI__.slot().reason,
    mount: window.__V5_UI__.slot().mount,
    status: window.__V5_UI__.state.surface.info.extension.status,
    line: [...document.querySelectorAll('#surface-content .surface-note')].map(n => n.textContent),
    rules: document.querySelectorAll('.rule-row').length,
    reads: document.querySelectorAll('.work-packet button').length,
    controls: document.querySelectorAll('.candidate-actions, .candidate-revision').length,
    packetText: document.querySelector('.work-packet')?.textContent.slice(0, 60) ?? null,
  })`);
  const rendererStatus = await ev(
    `(async () => (await fetch('/extensions/inbound-nda/renderer.mjs')).status)()`,
  );
  check(
    "renderer absent: the declared module 404s, the producer stays loaded, and the packet is read read-only",
    rendererStatus === 404 &&
      rendererAbsent.reason === "renderer-absent" &&
      rendererAbsent.mount === false &&
      rendererAbsent.status === "loaded" &&
      rendererAbsent.line.some((line) => line.endsWith("renderer not loaded")) &&
      rendererAbsent.line.includes("Read-only. An action needs the extension's own renderer.") &&
      rendererAbsent.rules === 4 &&
      rendererAbsent.controls === 0,
    { rendererStatus, ...rendererAbsent },
  );

  /* FE-T08 (3) · the payload declares a schema this build does not know. The
   * envelope stays identifiable; no finding is reconstructed from field names. */
  const undecodable = await ev(`(async () => {
    /* The packet arrives from the server declaring a domain schema this build
     * does not know. The rewrite happens in the transport, so the host reads it
     * exactly as it reads any other answer. */
    const original = window.fetch;
    window.fetch = async (...args) => {
      const response = await original(...args);
      if (!String(args[0]).includes('/surface')) return response;
      const body = await response.clone().json();
      for (const candidate of body.projection?.candidates ?? [])
        if (candidate.domain) candidate.domain.schemaVersion = 2;
      return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
    };
    document.querySelector('#surface-expand-button').click();
    await new Promise(r => setTimeout(r, 400));
    document.querySelector('#surface-expand-button').click();
    await new Promise(r => setTimeout(r, 1500));
    const p = window.__V5_UI__.state.surface.projection;
    const text = document.querySelector('#surface-content').textContent;
    const out = {
      declared: p.candidates[0].domain.schemaVersion,
      rules: document.querySelectorAll('.rule-row').length,
      says: text.includes('domain schema 2 · not readable by this build'),
      identity: text.includes(p.candidates[0].id.slice(0, 20)),
      version: text.includes('source revision ' + p.matter.source_version),
      controls: document.querySelectorAll('.candidate-actions, .candidate-revision').length,
    };
    window.fetch = original;
    return out;
  })()`);
  check(
    "an undecodable domain payload is named as such: no rules are reconstructed, the identifiable envelope stays",
    undecodable.declared === 2 &&
      undecodable.rules === 0 &&
      undecodable.says === true &&
      undecodable.identity === true &&
      undecodable.version === true &&
      undecodable.controls === 0,
    undecodable,
  );

  await rename(parkedFile, rendererFile);
  parked = false;

  /* FE-T08 (2) · the producer is unloaded. This is a different absence from the
   * one above and is reported as its own: the extension record is there and its
   * state word is «unloaded», Core history is still readable, and there is no
   * legal action. */
  await ev(
    `(async () => window.__V5_UI__.request('/extensions/inbound-nda/lifecycle', { method: 'POST', body: { action: 'unload' } }))()`,
  );
  await reload();
  await openSession(seed.sessions.conflicting);
  await openSurface();
  const producerAbsent = await ev(`({
    reason: window.__V5_UI__.slot().reason,
    mount: window.__V5_UI__.slot().mount,
    status: window.__V5_UI__.state.surface.info.extension.status,
    readOnly: window.__V5_UI__.state.surface.projection.readOnly,
    compatibility: window.__V5_UI__.state.surface.projection.compatibility,
    actions: window.__V5_UI__.state.surface.projection.humanActions.length,
    stateRow: document.querySelector('.surface-state-row')?.textContent ?? null,
    facts: [...document.querySelectorAll('#surface-content .surface-note')].map(n => n.textContent),
    rules: document.querySelectorAll('.rule-row').length,
    reads: document.querySelectorAll('.work-packet button').length,
    controls: document.querySelectorAll('.candidate-actions, .candidate-revision').length,
    candidates: window.__V5_UI__.state.surface.projection.candidates.length,
  })`);
  check(
    "producer absent is its own absence: the state word is unloaded, the history is readable, and nothing is actionable",
    producerAbsent.reason === "producer-unloaded" &&
      producerAbsent.mount === false &&
      producerAbsent.status === "unloaded" &&
      producerAbsent.readOnly === true &&
      producerAbsent.actions === 0 &&
      producerAbsent.rules === 4 &&
      producerAbsent.controls === 0 &&
      producerAbsent.stateRow.includes("unloaded") &&
      /* and it does not borrow the missing-renderer reason, which is not the
       * reason here (WO-WK10b 第二段 ablation S-10). */
      !producerAbsent.facts.includes("Read-only. An action needs the extension's own renderer."),
    producerAbsent,
  );
  check(
    "an unloaded producer is not reported as a missing renderer, and the compatibility word is stated as the server sent it",
    producerAbsent.reason !== "renderer-absent" &&
      producerAbsent.facts.some((line) => line.includes(producerAbsent.compatibility.replaceAll("_", " "))),
    { reason: producerAbsent.reason, compatibility: producerAbsent.compatibility, facts: producerAbsent.facts },
  );
  const historyRead = await ev(`(async () => {
    const term = [...document.querySelectorAll('.rule-row')]
      .find(row => row.querySelector('.flow-title')?.textContent === 'purpose-limitation');
    term.querySelector('summary').click();
    await new Promise(r => setTimeout(r, 200));
    const button = [...term.querySelectorAll('button')].find(b => b.textContent === 'Read the recorded source');
    button.click();
    await new Promise(r => setTimeout(r, 1500));
    return { bytes: (term.querySelector('.rule-source-text')?.textContent ?? '').length };
  })()`);
  check(
    "historical source bytes stay readable with no producer at all",
    historyRead.bytes > 0,
    historyRead,
  );

  await ev(
    `(async () => window.__V5_UI__.request('/extensions/inbound-nda/lifecycle', { method: 'POST', body: { action: 'load' } }))()`,
  );
  await reload();
  await openSession(seed.sessions.conflicting);
  await openSurface();
  const restored = await ev(`({
    mount: window.__V5_UI__.slot().mount,
    buttons: [...document.querySelectorAll('.candidate-actions button')].map(b => b.textContent),
    enum: window.__V5_UI__.state.surface.projection.humanActions
      .find(a => a.action === 'decide').payloadSchema.properties.action.enum,
  })`);
  check(
    "reloading the producer restores the renderer and exactly the decisions the packet advertises",
    restored.mount === true &&
      json(restored.buttons) === json(restored.enum.map((word) =>
        ({ accept: "Accept this version", reject: "Reject", request_evidence: "Request evidence" })[word])),
    restored,
  );

  check("no page exception", observations.exceptions.length === 0, observations.exceptions);
  await writeFile(new URL("./fallbacks.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length}`);
} finally {
  if (parked) await rename(parkedFile, rendererFile);
  await sleep(400);
  await close();
}
if (failures) process.exit(1);
