// WO-CS-01 · synthetic fixture for the chat shell proportion captures.
// Real product server and bytes; local fake responder only (no paid provider,
// no personal credentials). Port and data root are parameters:
//   CS_PORT (default 8883), CS_DATA_ROOT (default /private/tmp/se-agent-cs-data).
// Each start makes a fresh data directory under the root and writes
// fixture-config.json beside it, so a rerun never reuses or deletes old data.
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startServer } from '../../app/server/index.mjs';
import { FAKE_CREDENTIAL_KEY } from '../../app/runtime/pi-session-runtime.mjs';

const port = Number(process.env.CS_PORT || 8883);
const root = process.env.CS_DATA_ROOT || '/private/tmp/se-agent-cs-data';
await mkdir(root, { recursive: true });
const dataDir = await mkdtemp(path.join(root, 'run-'));

const note = 'Synthetic source note\n\nThe summary, disclosure and right panel refer to the same recorded run.\nReading this note does not accept a result.\n';
const answer = [
  'Synthetic demonstration. The source note is recorded in the workspace, and the Run summary on the right lists it.',
  'This paragraph is long on purpose: it runs the full reading measure so the left and right edges of the prose can be compared with the composer below. The composer and this text should share one content column, with the same left edge and the same right edge, at every width the shell supports.',
  'A third paragraph keeps the stream taller than one screen at narrow widths, so the composer docks at the foot while the conversation scrolls above it. Reading the note does not accept a result.',
].join('\n\n');
// Path per session title so one responder serves both sessions.
const paths = new Map();
const responder = ({ body, requestNumber }) => {
  const messages = body.messages || [];
  const lastUser = messages.findLastIndex((m) => m.role === 'user');
  const done = messages.slice(lastUser + 1).some((m) => m.role === 'tool');
  const text = JSON.stringify(messages[lastUser]?.content ?? '');
  const target = text.includes('LONG') ? paths.get('long') : paths.get('short');
  const common = { id: `cs-fixture-${requestNumber}`, created: Math.floor(Date.now() / 1000) };
  return done
    ? { ...common, kind: 'text', text: answer }
    : { ...common, kind: 'tool', toolCallId: `cs-tool-${requestNumber}`, name: 'ws_write', arguments: { path: target, text: note } };
};
paths.set('short', 'out/source-note.txt');
paths.set('long', 'out/' + 'source-version-'.repeat(12) + 'note.txt');

const runtime = await startServer({ dataDir, port, fakeResponder: responder, logger: () => {} });
const headers = { 'content-type': 'application/json', 'x-work-token': runtime.token };
async function api(method, p, body) {
  const res = await fetch(runtime.url + '/api/v5' + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
async function pollRun(id) {
  const start = Date.now();
  for (;;) {
    const run = (await api('GET', `/runs/${id}`)).json.run;
    if (['completed', 'failed', 'cancelled', 'unknown'].includes(run.status)) return run;
    if (Date.now() - start > 30000) throw Error('run timeout');
    await new Promise((r) => setTimeout(r, 50));
  }
}
await api('PUT', '/provider-credential', { connectionId: 'catalog-fake-openai-loopback', apiKey: FAKE_CREDENTIAL_KEY });
const projectId = (await api('POST', '/projects', { name: 'Synthetic review' })).json.project.id;
async function seed(title, input) {
  const session = (await api('POST', '/sessions', { projectId, title, permissionMode: 'draft' })).json.session;
  const made = await api('POST', `/sessions/${session.id}/runs`, { commandId: `cs-${session.id}`, input });
  if (made.status !== 200) throw Error(JSON.stringify(made));
  const run = await pollRun(made.json.run.id);
  return { sessionId: session.id, runId: run.id, status: run.status };
}
const long = await seed('Long file name · synthetic', 'LONG · Record a synthetic source note under a long path so I can check that the name wraps inside its card.');
const main = await seed('Source review · synthetic', 'Record a synthetic source note so I can inspect the run and its file.');
const config = {
  schemaVersion: 1,
  url: runtime.url,
  dataDir,
  main: { title: 'Source review · synthetic', ...main },
  long: { title: 'Long file name · synthetic', ...long },
  dataKind: 'synthetic local fake responder',
  provider: 'local-fake; no paid provider',
};
await writeFile(path.join(dataDir, 'fixture-config.json'), JSON.stringify(config, null, 2));
console.log(JSON.stringify(config));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await runtime.close(); process.exit(); });
