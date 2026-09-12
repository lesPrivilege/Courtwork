// Isolated browser acceptance fixture: no personal data or real credentials.
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.mjs';
import { FAKE_CREDENTIAL_KEY } from '../runtime/pi-session-runtime.mjs';
const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-model-adaptation-'));
const runtime = await startServer({ dataDir, port: Number(process.env.CW_MODEL_FIXTURE_PORT || 8899) });
await runtime.service.putProviderCredential({ connectionId: 'catalog-fake-openai-loopback', apiKey: FAKE_CREDENTIAL_KEY });
await runtime.service.replaceProviderConnection('catalog-fake-openai-loopback', { models: [
  { id: 'synthetic-exact-low-high', contextWindow: 8192, reasoningEfforts: ['low', 'high'] },
  { id: 'synthetic-high-only', contextWindow: 8192, reasoningEfforts: ['high'] },
  { id: 'synthetic-legacy-unknown', contextWindow: 8192, reasoning: true },
] });
await runtime.service.setProviderConfig({ provider: 'fake-openai-loopback', model: 'synthetic-exact-low-high', api: 'openai-completions', expectedVersion: runtime.service.getProviderConfig().version });
console.log(JSON.stringify({ url: runtime.url, dataDir, scope: 'synthetic-only' }));
let closing;
const close = () => { closing ??= runtime.close().finally(() => { process.removeListener('SIGINT', close); process.removeListener('SIGTERM', close); }); };
process.on('SIGINT', close); process.on('SIGTERM', close);
