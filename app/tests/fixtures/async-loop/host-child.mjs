import { startServer } from '../../../server/index.mjs';
import { FAKE_CREDENTIAL_KEY } from '../../../runtime/pi-session-runtime.mjs';
import { createFixtureHostAdapter } from './host-adapter.mjs';

const [dataDir, origin, crashPoint] = process.argv.slice(2);
const adapter = createFixtureHostAdapter(origin);
function response({ kind, name, arguments: args, index }) {
  return kind === 'tool'
    ? { kind, id: `recovery-response-${index}`, created: 1, toolCallId: `recovery-call-${index}`, name, arguments: args }
    : { kind: 'text', id: `recovery-response-${index}`, created: 1, text: 'Synthetic recovery completion.' };
}
const host = await startServer({ dataDir, port: 0, asyncTaskAdapters: [adapter], logger: (line) => process.stdout.write(`LOG ${line}\n`), responder: ({ body }) => {
  const messages = body.messages ?? [];
  const userIndex = messages.map((message) => message.role).lastIndexOf('user');
  const results = messages.slice(userIndex + 1).filter((message) => message.role === 'tool');
  if (!results.length) return response({ kind: 'tool', name: 'async_launch', arguments: { adapterId: adapter.id, sourceId: adapter.sources[0].id }, index: 0 });
  if (crashPoint === 'async_delivery' && results.length === 1) return response({ kind: 'tool', name: 'async_get', arguments: { taskId: JSON.parse(results[0].content).id }, index: 1 });
  return response({ kind: 'text', index: results.length });
} });
const headers = { 'content-type': 'application/json', 'x-work-token': host.token };
async function api(method, pathname, body) {
  const response = await fetch(host.url + '/api/v5' + pathname, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); return { status: response.status, json: text ? JSON.parse(text) : null };
}
await api('PUT', '/provider-credential', { provider: 'fake-openai-loopback', apiKey: FAKE_CREDENTIAL_KEY });
const project = await api('POST', '/projects', { name: 'recovery-independent' });
const session = await api('POST', '/sessions', { projectId: project.json.project.id, title: 'crash-window' });
process.stdout.write(`HOST ${JSON.stringify({ stage: 'ready', projectId: project.json.project.id, sessionId: session.json.session.id, source: adapter.sources[0] })}\n`);
await api('POST', `/sessions/${session.json.session.id}/runs`, { input: `crash-window-${crashPoint}`, commandId: `crash-${crashPoint}` });
process.stdout.write('HOST ' + JSON.stringify({ stage: 'unexpected-survival' }) + '\n');
await new Promise(() => {});
