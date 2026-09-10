import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectCatalog } from '../reference/collect-catalog.mjs';
const item = name => ({ name });
const is = code => error => error.code === code;
test('reference: collects two pages before publishing a complete catalogue', async () => {
  const requests = [];
  const r = await collectCatalog(async p => { requests.push(p); return p.cursor ? { tools: [item('b')] } : { tools: [item('a')], nextCursor: '2' }; });
  assert.deepEqual(r.items.map(x => x.name), ['a', 'b']); assert.equal(r.complete, true); assert.deepEqual(requests, [{}, { cursor: '2' }]);
});
test('reference: a finite empty page is valid', async () => { assert.equal((await collectCatalog(async () => ({ tools: [] }))).items.length, 0); });
test('reference: repeated cursor is rejected', async () => { await assert.rejects(collectCatalog(async () => ({ tools: [], nextCursor: 'x' })), is('catalog_cursor_cycle')); });
test('reference: duplicate identity across pages is rejected', async () => { await assert.rejects(collectCatalog(async p => ({ tools: [item('a')], ...(p.cursor ? {} : { nextCursor: '2' }) })), is('catalog_duplicate_identity')); });
test('reference: total item cap applies across pages', async () => { await assert.rejects(collectCatalog(async p => p.cursor ? { tools: [item('b')] } : { tools: [item('a')], nextCursor: '2' }, { maxItems: 1 }), is('catalog_too_many_items')); });
test('reference: cumulative decoded byte cap applies', async () => { await assert.rejects(collectCatalog(async () => ({ tools: [item('a'.repeat(200))] }), { maxBytes: 50 }), is('catalog_too_large')); });
test('reference: cancellation before call makes zero reads', async () => { let calls = 0; const controller = new AbortController(); controller.abort(); await assert.rejects(collectCatalog(async () => { calls++; return { tools: [] }; }, { signal: controller.signal }), is('catalog_cancelled')); assert.equal(calls, 0); });
test('reference: cancellation after read prevents publication', async () => { const controller = new AbortController(); await assert.rejects(collectCatalog(async () => { controller.abort(); return { tools: [item('a')] }; }, { signal: controller.signal }), is('catalog_cancelled')); });
test('reference: malformed cursor is rejected', async () => { await assert.rejects(collectCatalog(async () => ({ tools: [], nextCursor: 1 })), is('catalog_invalid_cursor')); });
test('reference: page cap prevents an unbounded cursor chain', async () => { let n=0; await assert.rejects(collectCatalog(async () => ({ tools: [], nextCursor: String(++n) }), { maxPages: 2 }), is('catalog_too_many_pages')); });
