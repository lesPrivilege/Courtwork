import assert from 'node:assert/strict';
import test, {describe, before, after} from 'node:test';
import {rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {boot, reopen} from './helpers.mjs';
import {SYNTHETIC_SOURCES, NORMAL_FACTS} from '../domains/inbound-nda/fixtures.mjs';
import {buildReview, PLAYBOOK_VERSION} from '../domains/inbound-nda/index.mjs';

// Architecture "Minimum delivery": one person works on one Matter, accepts a
// candidate, and continues after restarting the Host or replacing the Session;
// the next Run must receive the next context. Each domain runs the same story
// through the real HTTP Host and the deterministic fake provider:
//   accept A -> reject C (with reason) -> request evidence on D (with reason)
//   -> leave one candidate pending -> close Host -> reopen the same data dir
//   -> NEW Session, same Matter, one more Run -> inspect what the provider got.
// Every decision bumps Matter.version, so a candidate that stays pending is
// submitted last, after the reasoned decisions.

const REASONS = {
  accept: 'ACCEPT-REASON-7f3a: figures tie to the source',
  reject: 'REJECT-REASON-91bc: cites the wrong clause, do not repeat',
  evidence: 'EVIDENCE-REASON-c40d: need the signed annex before any conclusion',
};

const poll = async (api, runId, timeoutMs = 15000) => {
  const start = Date.now();
  for (;;) {
    const run = (await api('GET', `/runs/${runId}`)).json.run;
    if (['completed', 'failed', 'cancelled', 'unknown'].includes(run.status)) return run;
    if (Date.now() - start > timeoutMs) throw new Error(`run ${runId} stuck at ${run.status}`);
    await new Promise(r => setTimeout(r, 25));
  }
};
const surface = async (api, sessionId) => (await api('GET', `/sessions/${sessionId}/surface`)).json;
const script = calls => `/fixture script ${JSON.stringify(calls)}`;

async function submit(api, session, arguments_, commandId) {
  const created = await api('POST', `/sessions/${session.id}/runs`, {commandId, input: script([{name: 'se_submit_candidate', arguments: arguments_}])});
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const run = await poll(api, created.json.run.id);
  assert.equal(run.status, 'completed', JSON.stringify(run));
}

async function decide(api, session, extensionId, candidate, action, reason, requestId) {
  const s = await surface(api, session.id);
  return api('POST', `/sessions/${session.id}/actions`, {
    extensionId, generation: s.extension.generation, action: 'decide',
    payload: {request_id: requestId, candidate_id: candidate.id, base_version: candidate.base_version, action, reason},
  });
}

function newest(projection, knownBefore) {
  const fresh = projection.candidates.filter(c => !knownBefore.has(c.id));
  assert.equal(fresh.length, 1, `exactly one new candidate expected, got ${fresh.length}`);
  return fresh[0];
}

const DOMAINS = {
  'Evidence Memo': {
    extensionId: 'evidence-memo',
    bind: () => ({title: 'Restart memo', sourceText: 'Synthetic dated source for the restart story'}),
    // Blocking obligation proposed by the first candidate. Later candidates
    // carry it forward unchanged, as the Core requires of any accept.
    obligation: {id: 'blocking-1', text: 'Confirm the counterparty owner before relying on the memo', status: 'open', blocking: true, evidence_refs: []},
    proposal(p, text, obligations) {
      const s = p.sources[0];
      return {artifact_text: text, evidence: [{source_id: s.id, source_version: s.version, start: 0, end: s.text.length, quote: s.text, digest: s.digest}], obligations};
    },
  },
  'Inbound NDA': {
    extensionId: 'inbound-nda',
    bind: () => ({title: 'Restart NDA', sourceText: SYNTHETIC_SOURCES[0].text, facts: NORMAL_FACTS}),
    // A complete NDA review has no non-pass finding, hence no obligation; the
    // adapter refuses to accept anything else (see the NDA-specific tests).
    obligation: null,
    proposal(p) {return {domain: buildReview({sources: p.sources, facts: p.domain.facts})};},
  },
};

async function runScenario(name) {
  const d = DOMAINS[name];
  const h = await boot();
  const out = {name, d, h, current: h, api: h.api, host: null};
  await h.api('POST', `/extensions/${d.extensionId}/lifecycle`, {action: 'load'});
  const a = await h.createSession();
  const bound = await h.api('POST', `/sessions/${a.id}/extension`, {extensionId: d.extensionId, input: d.bind()});
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  let p = (await surface(h.api, a.id)).projection;
  const obligations = d.obligation ? [d.obligation] : [];
  // 1. candidate A proposes the obligation; accepted by the human with a reason.
  await submit(h.api, a, d.proposal(p, 'Accepted memo body', obligations), 'cand-accept');
  let known;
  p = (await surface(h.api, a.id)).projection;
  const A = newest(p, new Set());
  const accepted = await decide(h.api, a, d.extensionId, A, 'accept', REASONS.accept, 'req-accept');
  assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
  out.accepted = accepted.json;
  out.artifact = accepted.json.projection.artifact;
  // 2. candidate C rejected WITH a reason (bumps Matter.version).
  p = (await surface(h.api, a.id)).projection;
  known = new Set(p.candidates.map(c => c.id));
  await submit(h.api, a, d.proposal(p, 'Rejected memo body', obligations), 'cand-reject');
  p = (await surface(h.api, a.id)).projection;
  const C = newest(p, known);
  const rejected = await decide(h.api, a, d.extensionId, C, 'reject', REASONS.reject, 'req-reject');
  assert.equal(rejected.status, 200, JSON.stringify(rejected.json));
  // 3. candidate D: human requests evidence WITH a reason.
  p = (await surface(h.api, a.id)).projection;
  known = new Set(p.candidates.map(c => c.id));
  await submit(h.api, a, d.proposal(p, 'Needs-evidence memo body', obligations), 'cand-evidence');
  p = (await surface(h.api, a.id)).projection;
  const D = newest(p, known);
  const requested = await decide(h.api, a, d.extensionId, D, 'request_evidence', REASONS.evidence, 'req-evidence');
  assert.equal(requested.status, 200, JSON.stringify(requested.json));
  // 4. the candidate that stays pending.
  p = (await surface(h.api, a.id)).projection;
  known = new Set(p.candidates.map(c => c.id));
  let pendingProposal = d.proposal(p, 'Pending memo body', obligations);
  if (name === 'Inbound NDA') {
    // A pending NDA candidate that is still incomplete: drop the term clause so
    // one finding is `missing`. This is the domain-legal way to leave open work.
    const old = p.sources[0];
    const text = old.text.split('\n').filter(line => !line.startsWith('4. Term.')).join('\n');
    const replaced = await h.api('POST', `/sessions/${a.id}/actions`, {extensionId: d.extensionId, generation: (await surface(h.api, a.id)).extension.generation, action: 'replace_sources', payload: {revision: 2, sources: [{...old, version: 2, text, digest: createHash('sha256').update(text).digest('hex')}]}});
    assert.equal(replaced.status, 200, JSON.stringify(replaced.json));
    p = (await surface(h.api, a.id)).projection;
    pendingProposal = d.proposal(p);
  }
  await submit(h.api, a, pendingProposal, 'cand-pending');
  p = (await surface(h.api, a.id)).projection;
  const B = newest(p, known);
  out.ids = {A: A.id, B: B.id, C: C.id, D: D.id};
  out.matterId = p.matter.id;
  out.before = p;
  out.pending = B;
  // 3. restart the Host on the same data directory.
  await h.runtime.close();
  const resumed = await reopen(h.dataDir);
  out.current = resumed;
  out.api = resumed.api;
  // 4. NEW Session in the same project, continue the same Matter, start a Run.
  const created = await resumed.api('POST', '/sessions', {projectId: h.projectId, title: 'after-restart'});
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const b = created.json.session;
  out.sessionB = b;
  const attach = await resumed.api('POST', `/sessions/${b.id}/extension`, {extensionId: d.extensionId, input: {existingMatterId: out.matterId}});
  assert.equal(attach.status, 200, JSON.stringify(attach.json));
  const sent = resumed.runtime.fakeProvider.requests.length;
  const next = await resumed.api('POST', `/sessions/${b.id}/runs`, {commandId: 'continue', input: 'Continue reviewing the current work.'});
  assert.equal(next.status, 200, JSON.stringify(next.json));
  out.nextRun = await poll(resumed.api, next.json.run.id);
  assert.equal(out.nextRun.status, 'completed', JSON.stringify(out.nextRun));
  out.wire = resumed.runtime.fakeProvider.requests.slice(sent).at(0).body;
  out.messages = JSON.stringify(out.wire.messages);
  const view = (await surface(resumed.api, b.id)).projection;
  out.stored = view.runs.find(r => r.id === next.json.run.id).workContext;
  out.context = JSON.parse(out.stored.text);
  return out;
}

async function cleanup(out) {
  if (!out) return;
  await out.current?.runtime?.close().catch(() => {});
  await out.h?.runtime?.close().catch(() => {});
  await rm(out.h.dataDir, {recursive: true, force: true});
}

for (const name of Object.keys(DOMAINS)) {
  describe(`next context after restart: ${name}`, () => {
    let s;
    before(async () => {s = await runScenario(name);});
    after(async () => {await cleanup(s);});

    test('(a) accepted Artifact id, content digest and accepted version are in the next context', () => {
      const art = s.context.artifact;
      assert.ok(art, 'next context has no artifact block');
      assert.equal(art.id, s.artifact.id);
      assert.equal(art.contentDigest, s.artifact.content_digest);
      assert.equal(art.acceptedVersion, s.accepted.result.version);
      // and it is what the provider actually saw, not only what was stored
      assert.ok(s.messages.includes(s.artifact.id), 'artifact id absent from the wire messages');
      assert.ok(s.messages.includes(s.artifact.content_digest), 'artifact digest absent from the wire messages');
    });

    test('(b) the open obligation proposed by the accepted candidate is in the next context', () => {
      if (name === 'Inbound NDA') {
        // Domain rule: an NDA accept requires a complete review, i.e. no
        // non-pass finding, so an accept can never create an obligation. The
        // NDA analogue of open work is the unresolved finding proposed by the
        // pending candidate; it must reach the next Run.
        assert.deepEqual(s.context.matter.obligations, []);
        const domain = JSON.stringify(s.context.pending.find(c => c.id === s.ids.B)?.domain ?? null);
        assert.ok(domain.includes('term-duration'), 'unresolved term-duration finding is not in the context');
        assert.ok(domain.includes('missing'), 'the missing status is not in the context');
        return;
      }
      const wanted = DOMAINS[name].obligation;
      const got = s.context.matter.obligations.find(o => o.id === wanted.id);
      assert.ok(got, `obligation ${wanted.id} absent from next context`);
      assert.equal(got.status, 'open');
      assert.equal(got.blocking, true);
      assert.ok(s.messages.includes(wanted.id), 'obligation id absent from the wire messages');
    });

    test('(c) the pending candidate is in the next context', () => {
      const pending = s.context.pending.find(c => c.id === s.ids.B);
      assert.ok(pending, `pending candidate ${s.ids.B} absent; pending=${JSON.stringify(s.context.pending.map(c => c.id))}`);
      assert.deepEqual(pending.basis, {current: true, reasons: []});
      assert.ok(!s.context.pending.some(c => [s.ids.A, s.ids.C, s.ids.D].includes(c.id)), 'closed candidates must not be listed as pending');
      assert.ok(s.messages.includes(s.ids.B), 'pending candidate id absent from the wire messages');
    });

    test('(d) the reason the human gave when rejecting is available to the next Run', () => {
      const inWire = s.messages.includes(REASONS.reject);
      const inStored = s.stored.text.includes(REASONS.reject);
      const tools = (s.wire.tools ?? []).map(t => t.function?.name);
      assert.ok(inWire || inStored, `reject reason is neither in the context nor in the wire messages; omitted=${JSON.stringify(s.stored.provenance.omitted)} tools=${JSON.stringify(tools)}`);
    });

    test('(e) the request-evidence reason is available to the next Run', () => {
      const inWire = s.messages.includes(REASONS.evidence);
      const inStored = s.stored.text.includes(REASONS.evidence);
      const tools = (s.wire.tools ?? []).map(t => t.function?.name);
      assert.ok(inWire || inStored, `request-evidence reason is neither in the context nor in the wire messages; omitted=${JSON.stringify(s.stored.provenance.omitted)} tools=${JSON.stringify(tools)}`);
    });

    test('(h) the context lists the rejected and evidence-requested decisions newest first, without the accept, and the wrapper points at them', () => {
      assert.equal(s.context.schemaVersion, 3);
      assert.deepEqual(s.context.decisions.map(d => [d.candidateId, d.action, d.reason]), [
        [s.ids.D, 'request_evidence', REASONS.evidence],
        [s.ids.C, 'reject', REASONS.reject],
      ]);
      assert.ok(s.context.decisions[0].matterVersion > s.context.decisions[1].matterVersion);
      assert.ok(s.context.decisions[1].matterVersion > s.context.artifact.acceptedVersion);
      assert.equal(s.context.decisionsOmitted, 0);
      assert.equal(s.stored.provenance.decisionsOmitted, 0);
      assert.ok(!s.stored.text.includes(REASONS.accept), 'the accept is history: the active Artifact already represents it');
      assert.ok(s.messages.includes('decisions list in the context'), 'the wrapper does not tell the model what the decisions are for');
    });

    test('(f) after the restart a further accept is refused while an obligation blocks it (OBLIGATION_OPEN)', async () => {
      const b = s.sessionB;
      const before = (await surface(s.api, b.id)).projection;
      const pending = before.candidates.find(c => c.id === s.ids.B);
      assert.equal(pending.status, 'pending');
      const res = await decide(s.api, b, DOMAINS[name].extensionId, pending, 'accept', 'try to accept past the open obligation', 'req-after-restart');
      assert.equal(res.status, 409, JSON.stringify(res.json));
      assert.equal(res.json.error.code, 'OBLIGATION_OPEN');
      const after = (await surface(s.api, b.id)).projection;
      assert.equal(after.matter.version, before.matter.version, 'a refused accept must not advance the Matter');
      assert.equal(after.artifact.id, s.artifact.id, 'a refused accept must not move the active Artifact');
    });

    test('(g) domain instruction / context accompanying the generic context (characterisation)', t => {
      const text = s.wire.messages.filter(m => JSON.stringify(m).includes(s.matterId)).map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n---\n');
      const tail = text.slice(text.indexOf('This is the'));
      t.diagnostic(`context-bearing message roles=${JSON.stringify(s.wire.messages.filter(m => JSON.stringify(m).includes(s.matterId)).map(m => m.role))}`);
      t.diagnostic(`text following the JSON block (${tail.length} chars): ${tail.slice(0, 1400).replace(/\s+/g, ' ')}`);
      t.diagnostic(`stored context domain=${JSON.stringify(s.context.domain)?.slice(0, 200)}`);
      assert.ok(text.includes('development extension'), 'extension wrapper sentence missing');
      assert.ok(text.includes(`Matter: ${s.matterId}`), 'Matter line missing');
      assert.ok(text.includes('se_submit_candidate'), 'candidate-submission guidance missing');
      if (name === 'Inbound NDA') {
        assert.ok(text.includes(PLAYBOOK_VERSION), 'NDA playbook absent');
        assert.ok(text.includes('Unresolved findings cannot be accepted'), 'NDA domain instruction absent');
        assert.notEqual(s.context.domain, null);
      } else {
        assert.equal(s.context.domain, null, 'Evidence Memo has no domain block');
        assert.ok(!text.includes('playbook'), 'Evidence Memo unexpectedly carries a playbook');
      }
    });
  });
}
