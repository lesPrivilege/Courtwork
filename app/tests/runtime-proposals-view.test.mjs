/* "Proposed by the agent" (BE-6/BE-7) · the Runtime Workbench's Instructions
 * block. As with runtime-workbench.test.mjs, this covers the pure row
 * projection plus source drift guards; the rendered DOM (open/close, the
 * fetch-on-open, Apply/Reject) is exercised in the browser suites, not here.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { proposalRows } from '../web/runtime-view.mjs';

const root = path.join(import.meta.dirname, '..', '..');
const source = readFileSync(path.join(root, 'app', 'web', 'runtime-view.mjs'), 'utf8');

function proposal(id, status, { revision = 1, at, title = `Proposal ${id}`, resourceId = `local:${id}`, runId = `run-${id}-00000000` } = {}) {
  return {
    id, title, revision, status,
    target: { resourceId },
    author: { origin: 'agent', sessionId: 's1', runId, at },
    createdAt: at, updatedAt: at,
  };
}

test('proposalRows: proposed/applying sort first (newest first), then decided (also newest first); each row names its object, run and state word', () => {
  const proposals = [
    proposal('a', 'applied', { at: '2026-09-14T00:00:00Z' }),
    proposal('b', 'proposed', { revision: 2, at: '2026-09-15T00:00:00Z' }),
    proposal('c', 'rejected', { at: '2026-09-16T00:00:00Z' }),
    proposal('d', 'applying', { at: '2026-09-13T00:00:00Z' }),
  ];
  const rows = proposalRows(proposals);
  assert.deepEqual(rows.map(r => r.id), ['b', 'd', 'c', 'a'], 'pending (newest first) precedes decided (newest first)');
  assert.deepEqual(rows.map(r => r.stateWord), ['Awaiting review', 'Applying', 'Rejected', 'Applied']);
  assert.deepEqual(rows[0], { id: 'b', title: 'Proposal b', resourceId: 'local:b', runShort: 'run-b-00', revision: 2, stateWord: 'Awaiting review' });
});

test('proposalRows: an empty or missing list is an empty list, not a hidden one; an unrecognised status still surfaces its own word', () => {
  assert.deepEqual(proposalRows([]), []);
  assert.deepEqual(proposalRows(undefined), []);
  const [row] = proposalRows([proposal('x', 'future-status', { at: '2026-09-10T00:00:00Z' })]);
  assert.equal(row.stateWord, 'future-status', 'an unmapped status is shown as itself rather than invented');
});

test('proposalRows: runShort is the first 8 characters of the authoring run id', () => {
  const [row] = proposalRows([proposal('x', 'proposed', { runId: 'run-abcdefgh-rest-of-the-id', at: '2026-09-10T00:00:00Z' })]);
  assert.equal(row.runShort, 'run-abcd');
});

/* ── Source drift guards ──────────────────────────────────────────────
 * Mirrors the guard style in runtime-workbench.test.mjs: these assert the
 * wiring this brief specified stays in the source, without re-driving the
 * DOM this module builds. */

test('drift: the Instructions block reads the session-scoped proposal ledger', () => {
  assert.match(source, /\/runtime-proposals\?sessionId=\$\{encodeURIComponent\(id\)\}/, 'GET /runtime-proposals?sessionId= is fetched');
  assert.match(source, /getSessionId\(\)/, 'the block reads the current session id');
});

test('drift: opening a row reads its review once and the Change section renders through parseUnifiedPatch/renderDiff', () => {
  assert.match(source, /\/runtime-proposals\/\$\{encodeURIComponent\(id\)\}`\)/, 'GET /runtime-proposals/:id is fetched');
  assert.match(source, /import \{ parseUnifiedPatch, renderDiff \} from ["']\.\/diff-view\.mjs["']/, 'the shared diff renderer is imported, not reimplemented');
  assert.match(source, /parseUnifiedPatch\(effectiveDiff\.patch \|\| ""\)/, 'the Host patch already carries the git-style header the reader expects');
  assert.match(source, /renderDiff\(proposalDiff\(effectiveDiff\)/, 'the parsed lines are handed to renderDiff');
  assert.match(source, /effectiveDiff\.unchanged\s*\n?\s*\?\s*note\("Identical to the current version\."\)/, 'an identical proposal shows the identical note instead of an empty diff');
});

test('drift: Apply sends the read approvalSha256 and is refused once a run is active or the review carries a blocker', () => {
  assert.match(source, /\/runtime-proposals\/\$\{encodeURIComponent\(proposal\.id\)\}\/apply`/, 'apply posts to the proposal id');
  assert.match(source, /body:\s*\{\s*revision:\s*review\.proposal\.revision,\s*approvalSha256:\s*review\.approvalSha256,\s*requestId\s*\}/, 'the apply body carries the read approvalSha256, not a recomputed one');
  assert.match(source, /applyButton\.disabled = busy \|\| activeRun \|\| blocked \|\| Boolean\(entry\.applying\) \|\| Boolean\(entry\.rejecting\)/, 'Apply is disabled while a run is active or the review has a blocker');
});

test('drift: a 409 from apply/reject re-reads the review rather than trusting the local guess', () => {
  assert.match(source, /\["approval_stale", "runtime_conflict", "proposal_conflict"\]\.includes\(code\)/, 'apply treats a stale/conflicting approval as a re-read, not a silent failure');
  assert.match(source, /The configuration or proposal changed\. Review again before applying\./);
  assert.match(source, /Applied at configuration revision \$\{result\.receipt\.configRevisionAfter\}/, 'a successful apply names the configuration revision it landed at');
});
