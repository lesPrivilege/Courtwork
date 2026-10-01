import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {withTinyDom, flush} from './tiny-dom.mjs';
import {boot} from './helpers.mjs';
import {workPacket, candidateActions, decisionWords, shortRef} from '../web/surface-modules.mjs';

const packets = JSON.parse(await readFile(new URL('./fixtures/work-core/nda-packets.json', import.meta.url), 'utf8'));
const rendererPath = fileURLToPath(new URL('../extensions/inbound-nda/renderer.mjs', import.meta.url));

// WO-WK10b 第二段 · the delivered renderer keeps the trusted-renderer contract:
// it is reached only at the one declared path, and it holds no way of its own to
// reach data. Everything it shows arrives through the host's projection and its
// two typed callbacks.
test('the delivered NDA renderer is served at its declared path and carries no data channel of its own', async () => {
  const h = await boot();
  try {
    await h.api('POST', '/extensions/inbound-nda/lifecycle', {action: 'load'});
    const declared = h.runtime.registry.getRecord('inbound-nda').surface.module;
    assert.equal(declared, '/extensions/inbound-nda/renderer.mjs');
    const served = await fetch(h.runtime.url + declared);
    assert.equal(served.status, 200);
    assert.match(served.headers.get('content-type'), /^text\/javascript/);
    const bytes = await served.text();
    assert.equal(bytes, await readFile(rendererPath, 'utf8'));
    for (const forbidden of [
      'fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon',
      'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie',
      'import(', 'eval(', 'new Function', 'innerHTML', 'outerHTML',
      'insertAdjacentHTML', 'document.write',
    ]) assert.equal(bytes.includes(forbidden), false, forbidden);
    // Its only imports are the host's own UI kit, at fixed same-origin paths.
    const specifiers = [...bytes.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(specifiers.sort(), ['/web/surface-modules.mjs', '/web/ui-controls.mjs']);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, {recursive: true, force: true});
  }
});

test('the packet reading takes the rules, the status words and the lineage the packet actually carries', () => {
  const pending = workPacket(packets.pending.projection);
  assert.equal(pending.isReview, true);
  assert.equal(pending.readOnly, false);
  assert.equal(pending.candidates.length, 1);
  const review = pending.candidates[0].review;
  assert.deepEqual(
    review.findings.map((finding) => [finding.ruleId, finding.status]),
    packets.pending.projection.candidates[0].domain.findings.map((finding) => [finding.ruleId, finding.status]),
  );
  // Each finding keeps the anchors the candidate froze, not the Matter's
  // current source list.
  for (const [index, finding] of review.findings.entries())
    assert.deepEqual(finding.evidence, packets.pending.projection.candidates[0].domain.findings[index].evidence);
  assert.equal(review.unresolved, 0);
  assert.equal(review.playbookVersion, 'inbound-nda-playbook-v1');

  const revised = workPacket(packets.revised.projection);
  const child = revised.candidates.find((candidate) => candidate.id === 'packet-human-revision');
  assert.equal(child.supersedes, packets.accepted.projection.candidates[0].id);
  assert.equal(child.provenance.kind, 'human_revision');
  // The parent is still in the reading, still accepted: a revision revokes
  // nothing.
  assert.equal(revised.candidates.find((candidate) => candidate.supersedes === undefined || candidate.supersedes === null).status, 'accepted');
  assert.equal(revised.decisions.length, 1);
  assert.equal(decisionWords[revised.decisions[0].action], 'Accepted this version');
});

test('only the advertised decisions are readable as controls, and none in read-only history', () => {
  const pending = workPacket(packets.pending.projection);
  const pendingId = packets.pending.projection.candidates[0].id;
  const open = candidateActions(pending, pendingId);
  assert.deepEqual(open.decide.decisions, ['accept', 'reject', 'request_evidence']);
  assert.equal(open.decide.candidateId, pendingId);
  assert.equal(open.decide.baseVersion, 0);
  assert.equal(open.revise.baseVersion, 0);

  // An accepted candidate advertises no decision, only a revision at the
  // current work version.
  const accepted = workPacket(packets.accepted.projection);
  const closed = candidateActions(accepted, packets.accepted.projection.candidates[0].id);
  assert.equal(closed.decide, null);
  assert.equal(closed.revise.baseVersion, 1);

  // Producer-absent history advertises nothing at all.
  const history = workPacket(packets.history.projection);
  assert.equal(history.readOnly, true);
  assert.equal(history.isReview, true);
  assert.deepEqual(history.humanActions, []);
  for (const candidate of history.candidates)
    assert.deepEqual(candidateActions(history, candidate.id), {decide: null, revise: null});

  // An action whose descriptor version this build does not know stays
  // non-executable rather than being read as a known one.
  const future = structuredClone(packets.pending.projection);
  future.humanActions = future.humanActions.map((item) => ({...item, schemaVersion: 2}));
  const unknown = candidateActions(workPacket(future), pendingId);
  assert.deepEqual(unknown, {decide: null, revise: null});
});

test('a domain payload this build cannot decode is not read as findings', () => {
  const bumped = structuredClone(packets.pending.projection);
  bumped.candidates[0].domain.schemaVersion = 2;
  const packet = workPacket(bumped);
  assert.equal(packet.isReview, false);
  assert.equal(packet.candidates[0].review, null);
  assert.equal(packet.candidates[0].domainSchemaVersion, 2);
  // The envelope stays identifiable: identity, versions and the recorded text.
  assert.equal(packet.candidates[0].id, bumped.candidates[0].id);
  assert.equal(packet.candidates[0].status, 'pending');
  assert.equal(packet.candidates[0].artifactText, bumped.candidates[0].artifact_text);
  assert.equal(shortRef(packet.candidates[0].id).length, 21);
});

// The module names the host's kit by its served paths; point those at the same
// files on disk so the delivered bytes themselves are mounted, not a stand-in.
async function loadRenderer(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-nda-renderer-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const web = new URL('../web/', import.meta.url).href;
  const file = path.join(dir, 'renderer.mjs');
  await writeFile(file, (await readFile(rendererPath, 'utf8')).replaceAll('from "/web/', `from "${web}`));
  return import(pathToFileURL(file).href);
}
const saveButton = (container) => container.querySelectorAll('button').find((button) => button.textContent === 'Save this revision');
async function save(container) { saveButton(container).click(); await flush(); }
const lost = () => Object.assign(new Error('Failed to fetch'), {name: 'TypeError'});
const coded = (status, code) => Object.assign(new Error(code), {status, body: {error: {code}}});

test('a revision keeps its identity until the Host settles it: a lost reply resends it, a refusal or an edit starts another', (t) => withTinyDom(async (container) => {
  const {mount} = await loadRenderer(t);
  const sent = [];
  let answer = () => { throw lost(); };
  mount({container, projection: structuredClone(packets.pending.projection), dispatch: async (action, payload) => {
    sent.push(structuredClone({action, payload}));
    return answer(payload);
  }});
  assert.ok(saveButton(container), 'the revision form is drawn');

  // No reply at all, then a 503 whose outcome is unknown: both leave the
  // revision possibly saved, so the next attempt is the same request.
  await save(container);
  answer = () => { throw Object.assign(coded(503, 'CORE_TIMEOUT'), {outcome: 'unknown'}); };
  await save(container);
  answer = () => { throw coded(500, 'internal'); };
  await save(container);
  assert.equal(sent.length, 3);
  assert.equal(sent[0].action, 'revise_candidate');
  assert.match(sent[0].payload.new_candidate_id, /^revision-/);
  assert.equal(sent[1].payload.new_candidate_id, sent[0].payload.new_candidate_id, 'a retry after a lost reply reuses the revision identity');
  assert.deepEqual(sent[1], sent[0]);
  assert.deepEqual(sent[2], sent[0]);
  // The unknown outcome reads as it does for a decision, not as a raw transport error.
  const notices = () => container.querySelectorAll('.inline-error').map((node) => node.textContent);
  assert.deepEqual(notices(), ['The decision was not acknowledged. Sending it again uses the same request.']);
  assert.equal(container.textContent.includes('internal'), false);
  assert.equal(saveButton(container).disabled, false);

  // An edited payload is another revision.
  const status = container.querySelectorAll('input').find((input) => input.getAttribute('name')?.startsWith('status-'));
  status.value = 'needs_review';
  status.dispatchEvent({type: 'input', target: status});
  answer = () => { throw lost(); };
  await save(container);
  assert.notEqual(sent[3].payload.new_candidate_id, sent[0].payload.new_candidate_id);
  assert.equal(sent[3].payload.proposal.domain.findings[0].status, 'needs_review');

  // A coded refusal settles the request: nothing was saved under that id.
  answer = () => { throw coded(409, 'REVIEW_INVALID'); };
  await save(container);
  assert.deepEqual(sent[4], sent[3], 'the retry after the lost reply was still the same request');
  assert.deepEqual(notices(), ['REVIEW_INVALID'], 'a coded refusal shows the server message');
  answer = () => { throw lost(); };
  await save(container);
  assert.notEqual(sent[5].payload.new_candidate_id, sent[4].payload.new_candidate_id, 'a refused revision does not keep its identity');
  assert.deepEqual(sent[5].payload.proposal, sent[4].payload.proposal);

  // Success settles it too: the same content saved again is a new revision.
  answer = () => ({});
  await save(container);
  assert.equal(sent[6].payload.new_candidate_id, sent[5].payload.new_candidate_id);
  assert.equal(new Set(sent.map((entry) => entry.payload.new_candidate_id)).size, 3);
}));
