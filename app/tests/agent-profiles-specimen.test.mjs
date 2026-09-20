/* Seam tests for the Agent profile journey. They exercise the controller against
 * the synthetic adapter — the transitions a backend will later have to satisfy —
 * and deliberately do not mirror the DOM the view builds. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentProfilesController, projectProfile } from '../web/agent-profiles.mjs';
import { createAgentProfilesFixture } from './fixtures/agent-profiles/adapter.mjs';
import { startAgentProfilesPreview } from '../scripts/agent-profiles-preview.mjs';

const fast = (overrides = {}) => createAgentProfilesFixture({ pause: async () => {}, ...overrides });
const deferred = () => { let resolve; const promise = new Promise(r => (resolve = r)); return { promise, resolve }; };
const gated = () => {
  const gates = [];
  const adapter = createAgentProfilesFixture({ pause: () => { const g = deferred(); gates.push(g); return g.promise; } });
  return { adapter, gates };
};
async function openedProfile(id, adapter = fast()) {
  const c = createAgentProfilesController({ adapter });
  await c.openList();
  await c.openProfile(id);
  return c;
}

test('an empty host states that nothing is configured instead of an error', async () => {
  const adapter = fast();
  adapter.configure('empty');
  const c = createAgentProfilesController({ adapter });
  await c.openList();
  const { list } = c.getState();
  assert.equal(list.status, 'ready');
  assert.deepEqual(list.rows, []);
});

test('every row opens its own profile, including one whose runtime is down', async () => {
  const adapter = fast();
  const c = createAgentProfilesController({ adapter });
  await c.openList();
  for (const row of c.getState().list.rows) assert.equal(row.nextAction.targetId, row.id);
  adapter.configure('runtime-unavailable');
  await c.openList();
  const rows = c.getState().list.rows;
  const pi = rows.filter(row => row.runtimeName === 'Pi');
  assert.equal(pi.length, 2);
  for (const row of pi) {
    assert.equal(row.runtimeAvailability, 'unavailable', 'the row still says the executor is down');
    assert.equal(row.nextAction.targetId, row.id, 'and the way in is still this profile');
  }
});

test('an unavailable runtime can be replaced from inside the profile it blocks', async () => {
  const adapter = fast();
  adapter.configure('runtime-unavailable');
  const c = await openedProfile('ap-work', adapter);
  assert.match(c.getState().profile.projection.blockers.join(' '), /Pi is unavailable/);
  c.setRuntime('rt-hermes');
  assert.deepEqual(c.getState().profile.projection.blockers, []);
  assert.equal(c.canSave(), true);
  assert.equal(await c.save(), true);
  assert.equal(c.getState().profile.detail.profile.runtimeId, 'rt-hermes');
});

test('an opened profile reports requested, supported and granted as three separate facts', async () => {
  const c = await openedProfile('ap-coding');
  const { projection } = c.getState().profile;
  const write = projection.requests.find(r => r.action === 'candidate.write');
  assert.deepEqual(
    { supported: write.supported, effect: write.effect, kitNames: write.kitNames },
    { supported: true, effect: 'ask', kitNames: ['Coding review'] },
  );
  // Moving the same Kit to an executor that cannot do the work reports it as
  // unsupported. It must never be reported as a denial by the permission owner.
  c.setRuntime('rt-hermes');
  const moved = c.getState().profile.projection.requests.find(r => r.action === 'candidate.write');
  assert.equal(moved.supported, false);
  assert.equal(moved.effect, null);
});

test('an incompatible Kit and runtime pair is explained and blocks the save', async () => {
  const c = await openedProfile('ap-attention');
  assert.equal(c.canSave(), false, 'an untouched profile has nothing to save');
  c.toggleKit('kit-coding');
  const { profile } = c.getState();
  assert.equal(profile.dirty, true);
  assert.deepEqual(profile.projection.incompatibleKitIds, ['kit-coding']);
  assert.match(profile.projection.blockers.join(' '), /Coding review is not supported on Hermes/);
  assert.equal(c.canSave(), false);
  // The same pair becomes savable by changing the other half of it.
  c.setRuntime('rt-pi');
  assert.deepEqual(c.getState().profile.projection.blockers, []);
  assert.equal(c.canSave(), true);
});

test('an unavailable runtime cannot be saved as an execution choice', async () => {
  const adapter = fast();
  adapter.configure('runtime-unavailable');
  const c = await openedProfile('ap-attention', adapter);
  c.setRuntime('rt-pi');
  assert.equal(c.canSave(), false);
  assert.match(c.getState().profile.projection.blockers.join(' '), /Pi is unavailable/);
  // Codex is offered in the list, so the page can say why, and refused all the same.
  c.setRuntime('rt-codex');
  assert.match(c.getState().profile.projection.blockers.join(' '), /Codex is unavailable/);
  assert.equal(c.canSave(), false);
  assert.deepEqual(adapter.operations(), []);
});

test('a saved draft returns the owner-confirmed revision and clears the draft', async () => {
  const adapter = fast();
  const c = await openedProfile('ap-attention', adapter);
  c.toggleKit('kit-praxis');
  assert.equal(c.getState().profile.dirty, true);
  assert.equal(await c.save(), true);
  const { profile } = c.getState();
  assert.equal(profile.save.status, 'saved');
  assert.equal(profile.save.revision, 3, 'the receipt names the revision the owner confirmed');
  assert.equal(profile.detail.profile.revision, 3);
  assert.equal(profile.dirty, false);
  assert.deepEqual(profile.detail.profile.kitIds, ['kit-attention']);
  assert.deepEqual(adapter.operations(), [
    { kind: 'save', id: 'ap-attention', revision: 3, draft: { roleId: 'role-attention', kitIds: ['kit-attention'], runtimeId: 'rt-hermes' } },
  ]);
  // Returning to the list shows the confirmed revision, not the draft.
  await c.openList();
  assert.equal(c.getState().list.rows.find(row => row.id === 'ap-attention').revision, 3);
});

test('a failed save keeps the draft exactly as composed and saves nothing', async () => {
  const adapter = fast();
  adapter.configure('save-error');
  const c = await openedProfile('ap-work', adapter);
  c.toggleKit('kit-praxis');
  c.setRole('role-coding');
  assert.equal(await c.save(), false);
  const { profile } = c.getState();
  assert.equal(profile.save.status, 'failed');
  assert.match(profile.save.message, /Nothing was saved/);
  assert.deepEqual(profile.draft, { roleId: 'role-coding', kitIds: ['kit-praxis'], runtimeId: 'rt-pi' });
  assert.equal(profile.detail.profile.revision, 4);
  assert.deepEqual(profile.detail.profile.kitIds, []);
  assert.equal(c.canSave(), true, 'the same save can be attempted again');
});

test('a revision saved elsewhere is refused, kept beside the draft, and reloaded on request', async () => {
  const adapter = fast();
  adapter.configure('stale-revision');
  const c = await openedProfile('ap-work', adapter);
  c.setRole('role-coding');
  assert.equal(await c.save(), false);
  let profile = c.getState().profile;
  assert.equal(profile.save.status, 'conflict');
  assert.match(profile.save.message, /revision 5.*revision 4/s);
  assert.equal(profile.detail.profile.revision, 4, 'the stale snapshot is not silently replaced');
  assert.equal(c.canSave(), false, 'a conflict cannot be resolved by pressing Save again');
  // Reload shows the other writer's values; the draft is untouched and unmerged.
  await c.reloadSaved();
  profile = c.getState().profile;
  assert.equal(profile.detail.profile.revision, 5);
  assert.equal(profile.detail.profile.runtimeId, 'rt-hermes');
  assert.deepEqual(profile.detail.profile.kitIds, ['kit-praxis']);
  assert.equal(profile.draft.roleId, 'role-coding');
  assert.equal(profile.draft.runtimeId, 'rt-pi', 'the draft is not overwritten by the reload');
  assert.match(profile.notice, /Your draft is unchanged/);
  assert.equal(c.canSave(), true);
  assert.equal(await c.save(), true);
  assert.equal(c.getState().profile.save.revision, 6);
});

test('a run holding the profile freezes saving without claiming a queue', async () => {
  const adapter = fast();
  const c = await openedProfile('ap-coding', adapter);
  const { profile } = c.getState();
  assert.deepEqual(profile.detail.profile.activeRun, { runId: 'synthetic-run-311', revision: 7 });
  assert.equal(profile.projection.frozen, true);
  c.toggleKit('kit-praxis');
  assert.equal(c.getState().profile.dirty, true, 'the draft is still kept while frozen');
  assert.equal(c.canSave(), false);
  assert.equal(await c.save(), false);
  assert.deepEqual(adapter.operations(), [], 'nothing reaches the owner while a run holds it');
});

test('a draft survives leaving for the list and reopening the same profile', async () => {
  const c = await openedProfile('ap-work');
  c.setRole('role-coding');
  await c.openList();
  await c.openProfile('ap-attention');
  assert.equal(c.getState().profile.dirty, false, 'another profile does not inherit the draft');
  await c.openProfile('ap-work');
  const { profile } = c.getState();
  assert.equal(profile.draft.roleId, 'role-coding');
  assert.equal(profile.dirty, true);
  c.discardDraft();
  assert.equal(c.getState().profile.draft.roleId, 'role-work');
  await c.openList();
  await c.openProfile('ap-work');
  assert.equal(c.getState().profile.dirty, false, 'a discarded draft does not come back');
});

test('a late reply cannot land on another profile or on a newer draft', async () => {
  const { adapter, gates } = gated();
  const c = createAgentProfilesController({ adapter });
  gates.at(-1)?.resolve();
  const listing = c.openList();
  gates[0].resolve();
  await listing;

  // A slow open for one profile must not paint over the profile now on screen.
  const slow = c.openProfile('ap-work');
  const quick = c.openProfile('ap-attention');
  gates[2].resolve();
  await quick;
  gates[1].resolve();
  await slow;
  assert.equal(c.getState().profile.id, 'ap-attention');
  assert.equal(c.getState().profile.detail.profile.id, 'ap-attention');

  // A save reply that arrives after the draft moved on still happened: the
  // confirmed revision is adopted and named, and the newer draft is measured
  // against it rather than reported clean.
  c.toggleKit('kit-praxis');
  const saving = c.save();
  c.setRole('role-work');
  gates[3].resolve();
  assert.equal(await saving, false, 'the draft on screen is not the one that was saved');
  const { profile } = c.getState();
  assert.equal(profile.detail.profile.revision, 3, 'the owner-confirmed record is adopted');
  assert.equal(profile.save.status, 'saved');
  assert.equal(profile.save.revision, 3, 'the receipt names what the owner actually confirmed');
  assert.equal(profile.draft.roleId, 'role-work');
  assert.equal(profile.dirty, true, 'the newer draft is still unsaved and says so');
});

test('discarding is refused while a save is in flight, and the reply stays coherent', async () => {
  const { adapter, gates } = gated();
  const c = createAgentProfilesController({ adapter });
  const listing = c.openList();
  gates[0].resolve();
  await listing;
  const open = c.openProfile('ap-work');
  gates[1].resolve();
  await open;
  c.toggleKit('kit-praxis');
  const saving = c.save();
  c.discardDraft();
  assert.deepEqual(c.getState().profile.draft.kitIds, ['kit-praxis'], 'discard is a no-op mid-flight');
  gates[2].resolve();
  assert.equal(await saving, true);
  const { profile } = c.getState();
  assert.deepEqual(profile.detail.profile.kitIds, ['kit-praxis']);
  assert.equal(profile.detail.profile.revision, 5);
  assert.equal(profile.dirty, false);
  assert.equal(profile.save.revision, 5);
});

test('a draft that moves under an in-flight save is never reported clean', async () => {
  const { adapter, gates } = gated();
  const c = createAgentProfilesController({ adapter });
  const listing = c.openList();
  gates[0].resolve();
  await listing;
  const open = c.openProfile('ap-work');
  gates[1].resolve();
  await open;
  c.toggleKit('kit-praxis');
  const saving = c.save();
  c.toggleKit('kit-praxis'); // back to no Kit while the request is out
  gates[2].resolve();
  assert.equal(await saving, false);
  const { profile } = c.getState();
  assert.deepEqual(profile.detail.profile.kitIds, ['kit-praxis'], 'the write did happen');
  assert.deepEqual(profile.draft.kitIds, []);
  assert.equal(profile.dirty, true, 'and the draft still differs from it');
  assert.equal(c.canSave(), true);
});

test('a save reply for a profile you have left does not follow you to the next one', async () => {
  const { adapter, gates } = gated();
  const c = createAgentProfilesController({ adapter });
  const listing = c.openList();
  gates[0].resolve();
  await listing;
  const open = c.openProfile('ap-attention');
  gates[1].resolve();
  await open;
  c.toggleKit('kit-praxis');
  const saving = c.save();
  const moved = c.openProfile('ap-work');
  gates[3].resolve();
  await moved;
  gates[2].resolve();
  assert.equal(await saving, false);
  const { profile } = c.getState();
  assert.equal(profile.id, 'ap-work');
  assert.equal(profile.detail.profile.id, 'ap-work');
  assert.equal(profile.save.status, 'idle');
});

test('a runtime detail reply cannot land after the surface that asked for it is gone', async () => {
  const { adapter, gates } = gated();
  const c = createAgentProfilesController({ adapter });
  const listing = c.openList();
  gates[0].resolve();
  await listing;
  const open = c.openProfile('ap-work');
  gates[1].resolve();
  await open;
  // Leaving for the list while the detail read is out.
  const detail = c.openRuntimeDetail('rt-pi');
  const back = c.openList();
  gates[3].resolve();
  await back;
  gates[2].resolve();
  await detail;
  assert.equal(c.getState().view, 'list');
  assert.equal(c.getState().runtimeDetail.status, 'closed', 'no modal reopens over the list');

  // And the same when the detour is abandoned for another profile.
  const second = c.openProfile('ap-attention');
  gates[4].resolve();
  await second;
  const detail2 = c.openRuntimeDetail('rt-hermes');
  const moved = c.openProfile('ap-work');
  gates[6].resolve();
  await moved;
  gates[5].resolve();
  await detail2;
  assert.equal(c.getState().runtimeDetail.status, 'closed');
});

test('a host that cannot save says so instead of offering a dead control', async () => {
  const adapter = fast();
  adapter.configure('read-only');
  const c = await openedProfile('ap-work', adapter);
  assert.equal(c.getState().capabilities.canSave, false);
  assert.match(c.getState().capabilities.reason, /cannot save an agent profile yet/);
  c.setRole('role-coding');
  assert.equal(c.getState().profile.dirty, true, 'the draft is still composable');
  assert.deepEqual(c.getState().profile.projection.blockers, [], 'nothing is wrong with the draft');
  assert.equal(c.canSave(), false, 'but the owner does not offer the write');
  assert.equal(await c.save(), false);
  assert.deepEqual(adapter.operations(), []);
});

test('a supported action with no reported effect is not a missing runtime', async () => {
  const adapter = fast();
  adapter.configure('grant-unreported');
  const c = await openedProfile('ap-attention', adapter);
  const read = c.getState().profile.projection.requests.find(r => r.action === 'reference.read');
  assert.equal(read.supported, true, 'Hermes can do it');
  assert.equal(read.effect, null, 'the permission owner reported nothing');
  const queue = c.getState().profile.projection.requests.find(r => r.action === 'attention.read');
  assert.equal(queue.effect, 'allow', 'the other effects are unaffected');
});

test('the runtime read view reports unobserved facts as unobserved', async () => {
  const c = await openedProfile('ap-work');
  await c.openRuntimeDetail('rt-codex');
  const { runtimeDetail } = c.getState();
  assert.equal(runtimeDetail.status, 'ready');
  assert.equal(runtimeDetail.record.observedVersion, null);
  assert.equal(runtimeDetail.record.protocol, null);
  assert.equal(runtimeDetail.record.availability, 'unavailable');
  assert.match(runtimeDetail.record.managementNote, /no backend yet/);
  c.closeRuntimeDetail();
  assert.equal(c.getState().runtimeDetail.status, 'closed');
});

test('model ownership stays with its owner in the projection', async () => {
  const c = await openedProfile('ap-work');
  const pi = c.getState().profile.projection.runtime;
  assert.equal(pi.modelOwner, 'courtwork');
  assert.equal(pi.model.requested, null, 'this agent has no model binding of its own');
  assert.match(pi.model.source, /All chats · future runs/);
  c.setRuntime('rt-hermes');
  const hermes = c.getState().profile.projection.runtime;
  assert.equal(hermes.modelOwner, 'runtime-native');
  assert.match(hermes.model.note, /does not set it/);
});

test('the projection is pure and invents nothing for an unknown id', () => {
  const detail = {
    profile: { id: 'x', roleId: 'gone', kitIds: [], runtimeId: 'gone', revision: 1, activeRun: null },
    roles: [], kits: [], runtimes: [],
  };
  const projection = projectProfile(detail, { roleId: 'gone', kitIds: ['gone'], runtimeId: 'gone' });
  assert.equal(projection.role, null);
  assert.equal(projection.runtime, null);
  assert.deepEqual(projection.selectedKits, []);
  assert.deepEqual(projection.requests, []);
  assert.equal(projection.blockers.length, 2);
});

test('the preview host serves the fixture page and the product assets, and mutates nothing', async () => {
  const preview = await startAgentProfilesPreview({ port: 0 });
  try {
    const page = await fetch(preview.url);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Interactive synthetic preview/);
    assert.equal((await fetch(new URL('/web/agent-profiles.mjs', preview.url))).status, 200);
    assert.equal((await fetch(new URL('/api/anything', preview.url))).status, 404);
    assert.equal((await fetch(preview.url, { method: 'POST' })).status, 405);
    assert.equal((await fetch(new URL('/web/../../package.json', preview.url))).status, 404);
  } finally {
    await preview.close();
  }
});
