import assert from 'node:assert/strict';
import test from 'node:test';
import { checkLedger } from '../scripts/dependency-ledger.mjs';

test('dependency ledger matches package-lock.json', async () => {
  // checkLedger() compares without writing and throws the command to run when they differ.
  const { packages, written } = await checkLedger();
  assert.ok(packages > 0);
  assert.equal(written, false);
});
