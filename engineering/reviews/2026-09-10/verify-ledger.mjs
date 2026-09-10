import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('./', import.meta.url);
const source = new URL('courtwork-implementation-plan-20260910/', root);
const read = (path, base = root) => readFile(new URL(path, base), 'utf8');
const original = JSON.parse(await read('tickets.json', source));
const dispatch = JSON.parse(await read('dispatch.json'));
function validate(tickets) {
  const byId = new Map(tickets.map(t => [t.id, t]));
  assert.equal(byId.size, tickets.length, 'duplicate dispatch identity');
  const visited = new Set();
  function visit(id, active = new Set()) {
    assert(byId.has(id), `missing dependency ${id}`);
    assert(!active.has(id), `dependency cycle ${id}`);
    if (visited.has(id)) return;
    for (const dep of byId.get(id).depends_on) visit(dep, new Set([...active, id]));
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
}
validate(original.tickets);
validate(dispatch.tickets);
assert.deepEqual(dispatch.tickets.map(t => t.id), original.tickets.map(t => t.id));
for (const [i, task] of dispatch.tickets.entries()) {
  assert.deepEqual(task.depends_on, original.tickets[i].depends_on);
  assert.deepEqual(task.maps_to, original.tickets[i].maps_to);
  assert(task.architecture_owner && task.implementation_owner && task.reviewer);
}
assert.throws(() => validate([...dispatch.tickets, dispatch.tickets[0]]), /duplicate/);
assert.throws(() => validate([{id:'cycle',depends_on:['cycle']}]), /cycle/);
let hashes = 0;
for (const line of (await read('SHA256SUMS.txt', source)).trim().split('\n')) {
  const [, expected, path] = /^(\S+)\s+(.+)$/.exec(line);
  const actual = createHash('sha256').update(await readFile(new URL(path, source))).digest('hex');
  assert.equal(actual, expected, `source byte drift: ${path}`);
  hashes++;
}
const backend = await read('../../mvp/execution/work-surface-kit/backend-requests.md');
assert(!/^\| BE-40 \|/m.test(backend), 'ambiguous BE-40 row');
assert.equal((backend.match(/^\| BE-40@Provider \|/gm) ?? []).length, 1);
assert.equal((backend.match(/^\| BE-40@Attention \|/gm) ?? []).length, 1);
console.log(JSON.stringify({pass:true,tickets:dispatch.tickets.length,sourceHashes:hashes,negativeCases:['duplicate identity','cycle'],qualifiedBE40:true},null,2));
