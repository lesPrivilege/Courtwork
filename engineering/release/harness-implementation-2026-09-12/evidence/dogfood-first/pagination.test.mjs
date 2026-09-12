// Tests for out/pagination.mjs. Not executed in this run (no shell/test executor).
import test from 'node:test';
import assert from 'node:assert/strict';

import { pageForOffset } from './pagination.mjs';

test('empty collection: any offset is out of range', () => {
  assert.equal(pageForOffset(0, 1, 0), null);
  assert.equal(pageForOffset(0, 10, 0), null);
});

test('offset equal to totalItems is out of range (the fixed boundary)', () => {
  assert.equal(pageForOffset(3, 2, 3), null);
  assert.equal(pageForOffset(5, 2, 5), null);
  assert.equal(pageForOffset(1, 1, 1), null);
});

test('last legal item maps to the last page', () => {
  assert.equal(pageForOffset(1, 1, 0), 0);
  assert.equal(pageForOffset(3, 2, 2), 1);
  assert.equal(pageForOffset(5, 2, 4), 2);
  assert.equal(pageForOffset(6, 3, 5), 1);
});

test('page boundaries: first item of each page and page transitions', () => {
  assert.equal(pageForOffset(6, 2, 0), 0);
  assert.equal(pageForOffset(6, 2, 1), 0);
  assert.equal(pageForOffset(6, 2, 2), 1);
  assert.equal(pageForOffset(6, 2, 3), 1);
  assert.equal(pageForOffset(6, 2, 4), 2);
  assert.equal(pageForOffset(6, 2, 5), 2);
  assert.equal(pageForOffset(6, 6, 0), 0);
  assert.equal(pageForOffset(6, 6, 5), 0);
});

test('pageSize larger than totalItems yields page 0', () => {
  assert.equal(pageForOffset(3, 100, 0), 0);
  assert.equal(pageForOffset(3, 100, 2), 0);
});

test('invalid totalItems throws RangeError', () => {
  assert.throws(() => pageForOffset(-1, 2, 0), RangeError);
  assert.throws(() => pageForOffset(1.5, 2, 0), RangeError);
  assert.throws(() => pageForOffset(NaN, 2, 0), RangeError);
});

test('invalid pageSize throws RangeError', () => {
  assert.throws(() => pageForOffset(5, 0, 0), RangeError);
  assert.throws(() => pageForOffset(5, -1, 0), RangeError);
  assert.throws(() => pageForOffset(5, 1.5, 0), RangeError);
});

test('invalid offset throws RangeError', () => {
  assert.throws(() => pageForOffset(5, 2, -1), RangeError);
  assert.throws(() => pageForOffset(5, 2, 1.5), RangeError);
  assert.throws(() => pageForOffset(5, 2, NaN), RangeError);
});
