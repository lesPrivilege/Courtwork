import { pathToFileURL } from 'node:url';
import path from 'node:path';
if (!process.argv[2]) throw new Error('Pass the candidate checkout path');
const root = path.resolve(process.argv[2]);
const { createOpenAiAgentsTransport } = await import(pathToFileURL(path.join(root, 'app/runtime/openai-agents-transport.mjs')));
const { createWireFixture } = await import(pathToFileURL(path.join(root, 'app/tests/fixtures/agents-api-wire.mjs')));

async function run(label, customHeaders, eventReply) {
  const wire = await createWireFixture();
  let n=0;
  wire.respond((attempt) => {
    n++;
    if (attempt.path.endsWith('/events')) return eventReply;
    return wire.json(200, {id:'sess_probe', status:'idle'});
  });
  const old = process.env.OPENAI_CUSTOM_HEADERS;
  if (customHeaders === undefined) delete process.env.OPENAI_CUSTOM_HEADERS; else process.env.OPENAI_CUSTOM_HEADERS = customHeaders;
  try {
    let t; try { t = createOpenAiAgentsTransport({apiKey:'sk-synthetic', baseURL:wire.baseURL, fetch:globalThis.fetch, timeoutMs:2000}); } catch (e) { console.log(JSON.stringify({label, constructorError:{name:e.name,message:e.message}})); return; }
    const s = await t.createSession({environment:{type:'none'}, input:'x', agent:{model:'m'}});
    let result, error;
    try { result = await t.sendEvents(s.id, [{type:'agent.session.input.message', text:'x'}], {requestId:'req_probe'}); }
    catch (e) { error = {name:e.name, code:e.code, delivery:e.delivery, message:e.message}; }
    console.log(JSON.stringify({label, result, error, attempts:wire.attempts.map(wire.wire)}, null, 2));
  } finally {
    if (old === undefined) delete process.env.OPENAI_CUSTOM_HEADERS; else process.env.OPENAI_CUSTOM_HEADERS=old;
    await wire.close();
  }
}
await run('ambient-allowlisted-json', JSON.stringify({Authorization:'Bearer ambient', 'User-Agent':'ambient-agent', 'Idempotency-Key':'ambient-key'}), undefined);
await run('ambient-allowlisted-header-format', 'Authorization: Bearer ambient\nUser-Agent: ambient-agent\nIdempotency-Key: ambient-key', undefined);
await run('event-200-json-empty', undefined, {status:200, headers:{'content-type':'application/json'}, body:'{}'});
await run('event-204', undefined, {status:204, headers:{}, body:''});
await run('event-200-empty', undefined, {status:200, headers:{}, body:''});
