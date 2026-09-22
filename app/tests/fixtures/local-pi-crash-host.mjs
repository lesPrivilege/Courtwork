import { writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { localPiHost } from './local-pi-host-harness.mjs';

// Actual Host crash windows; injection stays entirely in this test process.
const [dataDir, crashAt] = process.argv.slice(2);
const h = await localPiHost({ dataDir, respond: () => {
  appendFileSync(path.join(dataDir, 'provider-requests.log'), 'request\n');
  return { kind: 'text', id: 'fixture', created: 1, text: 'Retained before publication.' };
} });
const original = h.runtime.store.recordLocalPiEvent.bind(h.runtime.store);
h.runtime.store.recordLocalPiEvent = async (runId, type, data) => {
  if (crashAt === 'spawn' && type === 'local_pi.spawn') {
    writeFileSync(path.join(dataDir, 'owned-pid.json'), JSON.stringify({ pid: data.pid }));
    process.exit(72);
  }
  const result = await original(runId, type, data);
  if (type === 'local_pi.' + crashAt) process.exit(crashAt === 'dispatch' ? 71 : crashAt === 'result' ? 73 : 74);
  return result;
};
await h.create([await h.source()]);
setTimeout(() => process.exit(99), 15000);
