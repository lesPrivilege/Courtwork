/**
 * Evidence capture for AM-B-T3 (async task view projection + packets).
 *
 * Boots a real `startServer` on port 0 with the synthetic in-process adapter
 * from app/tests/fixtures/async-task-view/, drives the local Pi loop through
 * two ordinary Runs (primary: doc-alpha + doc-beta; foreign: doc-gamma), then
 * records the ACTUAL HTTP packets a UI would consume. No real provider, no
 * external adapter, no credential store.
 *
 * Run from the Courtwork checkout root:
 *   node evidence/async-loop-20260910/task-view/capture-packets.mjs
 *
 * Output: packets/*.json (raw responses) + a run log.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootScenario } from '../../../app/tests/fixtures/async-task-view/scenario.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'packets');
await mkdir(OUT, { recursive: true });

const h = await bootScenario();
const log = [];
const save = async (name, packet) => {
  await writeFile(path.join(OUT, name), JSON.stringify(packet.body ?? packet, null, 2) + '\n');
  log.push(`${name}\tHTTP ${packet.status}\t${JSON.stringify(packet.body ?? packet).slice(0, 120)}...`);
};

try {
  const alpha = h.taskOf('doc-alpha');
  const gamma = h.taskOf('doc-gamma');

  // List/detail surface before any destructive probe.
  await save('01-list-primary.json', await h.api('GET', `/async-tasks?projectId=${h.primary.id}`));
  await save('02-list-primary-page1.json', await h.api('GET', `/async-tasks?projectId=${h.primary.id}&offset=0&limit=1`));
  await save('03-list-primary-page2.json', await h.api('GET', `/async-tasks?projectId=${h.primary.id}&offset=1&limit=1`));
  await save('04-detail-alpha-current.json', await h.api('GET', `/async-tasks/${alpha.id}?projectId=${h.primary.id}`));
  await save('05-list-foreign.json', await h.api('GET', `/async-tasks?projectId=${h.foreign.id}`));
  await save('06-detail-cross-project-404.json', await h.api('GET', `/async-tasks/${alpha.id}?projectId=${h.foreign.id}`));
  await save('07-list-unauthorized-401.json', await h.api('GET', `/async-tasks?projectId=${h.primary.id}`, undefined, 'wrong-token'));

  // Orphaned: delete the origin Session; the retained task stays queryable.
  await h.api('DELETE', `/sessions/${h.sessionP.id}`);
  await save('08-detail-alpha-orphaned.json', await h.api('GET', `/async-tasks/${alpha.id}?projectId=${h.primary.id}`));

  // adapter_unavailable: drop the adapter registration.
  h.host.service.asyncTasks.adapters.clear();
  await save('09-detail-gamma-adapter-unavailable.json', await h.api('GET', `/async-tasks/${gamma.id}?projectId=${h.foreign.id}`));

  // historical: re-register the adapter with a stale source digest.
  const { digestOf, ADAPTER_ID, ADAPTER_VERSION } = await import('../../../app/tests/fixtures/async-task-view/synthetic.mjs');
  h.host.service.asyncTasks.adapters.set(ADAPTER_ID, { version: ADAPTER_VERSION, sources: [{ id: 'doc-gamma', version: 'v1', digest: digestOf('beta') }] });
  await save('10-detail-gamma-historical.json', await h.api('GET', `/async-tasks/${gamma.id}?projectId=${h.foreign.id}`));

  const summary = [
    'packet capture: task-view (AM-B-T3)',
    `primary project: ${h.primary.id}`,
    `foreign project: ${h.foreign.id}`,
    `adapter starts (one per launch): ${h.reader.starts}`,
    ...log,
  ].join('\n');
  await writeFile(path.join(OUT, '..', 'capture-summary.txt'), summary + '\n');
  console.log(summary);
} finally {
  await h.close();
}
