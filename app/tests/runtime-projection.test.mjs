import assert from 'node:assert/strict';
import { test } from 'node:test';
import { overrideAt, inheritSource, provenanceSentence, admittedCharacters, hasParentGate } from '../web/runtime-view.mjs';

test('runtime projection: parent/profile gates are explanations, not removable overrides', () => {
  const user = { type: 'user', id: 'local' }, session = { type: 'session', id: 's' };
  const row = { provenance: [{ scope: user, value: true, reason: 'source default' },
    { scope: session, value: false, reason: 'parent not exposed', parentId: 'local:server' }] };
  assert.equal(overrideAt(row, session), false);
  assert.equal(hasParentGate(row), true);
  assert.equal(hasParentGate({ provenance: row.provenance.slice(0, 1) }), false);
  assert.equal(inheritSource(row, 2), 'user');
  assert.equal(provenanceSentence(row, [{ id: 'local:server', title: 'Docs server' }]), 'Exposure: Docs server is not exposed.');
  row.provenance.splice(1, 0, { scope: session, value: true, reason: 'explicit override' });
  assert.equal(overrideAt(row, session), true);
  row.provenance.push({ scope: { type: 'agent', id: 'reader' }, value: false, reason: 'profile capability ceiling' });
  assert.equal(provenanceSentence(row), 'Exposure: limited by the selected profile.');
});

test('runtime projection: historical counts stay partial; new catalogs count admitted text only', () => {
  assert.equal(admittedCharacters({ admission: 'catalog-only', characters: 68 }), 0);
  assert.equal(admittedCharacters({ admission: 'instructions', characters: 60 }), 60);
  assert.equal(admittedCharacters({ admission: 'catalog-only', characters: 68, admittedCharacters: 123, deferredCharacters: 400 }), 123);
  assert.equal(admittedCharacters({ admission: 'user-invoked', characters: 30, admittedCharacters: 0, deferredCharacters: 300 }), 0);
});
