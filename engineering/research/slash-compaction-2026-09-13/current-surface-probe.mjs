// A dated gap observation, not a regression test that endorses slash fallthrough.
// Run from any cwd with app dependencies installed. Local synthetic provider only.
import {boot} from '../../../app/tests/helpers.mjs';
import {rm} from 'node:fs/promises';

const requests = [];
const h = await boot({fakeResponder: ({body, requestNumber}) => {
  requests.push(body);
  return {kind: 'text', id: `slash-observation-${requestNumber}`, created: 1, text: 'Synthetic observation only.'};
}});
try {
  const observations = [];
  for (const input of ['/compact focus on constraints', '/unknown-courtwork-probe']) {
    const session = await h.createSession();
    const discovery = await h.api('GET', `/sessions/${session.id}/commands`);
    const typedCompact = await h.api('POST', `/sessions/${session.id}/commands/compact`, {focus: 'constraints'});
    const requestOffset = requests.length;
    const response = await h.api('POST', `/sessions/${session.id}/runs`, {input, commandId: `observe-${observations.length}`});
    if (response.status !== 200) throw new Error(`Unexpected Run admission: ${response.status}`);
    const run = await h.pollRun(response.json.run.id);
    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const wire = requests.slice(requestOffset);
    observations.push({
      input, discoveryStatus: discovery.status, typedCompactStatus: typedCompact.status,
      ordinaryRunCreated: true, runStatus: run.status,
      providerRequests: wire.length,
      literalInputObservedOnWire: wire.some(body => JSON.stringify(body.messages).includes(input)),
      compactionNotices: events.filter(e => e.type === 'run.notice' && e.data.kind?.startsWith('compaction_')).length,
    });
  }
  console.log(JSON.stringify({
    purpose: 'current unsupported slash surface observation', realProvider: false,
    observations,
    interpretation: 'The ordinary input channel does not implement Host slash commands. These are confirmed gaps, not successful command executions.',
  }, null, 2));
} finally {
  await h.runtime.close();
  await rm(h.dataDir, {recursive: true, force: true});
}
