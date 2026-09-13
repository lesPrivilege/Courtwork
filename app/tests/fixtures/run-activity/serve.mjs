// Isolated production-UI browser fixture; loopback fake provider only.
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startServer } from '../../../server/index.mjs';
import { FAKE_CREDENTIAL_KEY } from '../../../runtime/pi-session-runtime.mjs';
import { SYNTHETIC_SOURCES, NORMAL_FACTS } from '../../../domains/inbound-nda/fixtures.mjs';
const dataDir = await mkdtemp(path.join(tmpdir(), 'courtwork-activity-ui-'));
const runtime = await startServer({ dataDir, port: Number(process.env.ACTIVITY_FIXTURE_PORT || 8853), fakeResponder: ({mode, requestNumber}) => {
  if (mode.startsWith('/fixture slow')) return {kind:'text', id:`activity-${requestNumber}`,created:1,slow:true,
    text:'The revised draft limits disclosure to the agreed review. Each retained version keeps its source and scope.\n\n'.repeat(60)};
  if (mode === 'Review the scope') return {kind:'text',id:`activity-${requestNumber}`,created:1,
    text:'## A clearer scope\n\nThe revised draft limits disclosure to the agreed review. Broader use requires a separate decision.\n\nThe two retained versions preserve their own source and scope.'};
  return null;
}});
async function api(method, route, body) {
  const res = await fetch(`${runtime.url}/api/v5${route}`, {method, headers:{'content-type':'application/json','x-work-token':runtime.token},body:body===undefined?undefined:JSON.stringify(body)});
  if (!res.ok) throw new Error(`Fixture setup ${route}: ${res.status}`);
  return res.json();
}
await api('PUT','/provider-credential',{connectionId:'catalog-fake-openai-loopback',apiKey:FAKE_CREDENTIAL_KEY});
const {project} = await api('POST','/projects',{name:'Activity UI fixture'});
const {session} = await api('POST','/sessions',{projectId:project.id,title:'Scope review'});
if (process.env.ACTIVITY_FIXTURE_REVIEW === '1') {
  await api('POST','/extensions/inbound-nda/lifecycle',{action:'load'});
  await api('POST',`/sessions/${session.id}/extension`,{extensionId:'inbound-nda',input:{
    title:'Synthetic review focus',sourceText:SYNTHETIC_SOURCES[0].text,facts:NORMAL_FACTS}});
}
const {run} = await api('POST',`/sessions/${session.id}/runs`,{commandId:randomUUID(),input:'Review the scope'});
while (['created','running'].includes((await api('GET',`/runs/${run.id}`)).run.status)) await new Promise(resolve=>setTimeout(resolve,50));
const {session:attention} = await api('POST','/attention/conversations',{conversationId:randomUUID()});
console.log(JSON.stringify({url:runtime.url,dataDir,sessionId:session.id,attentionId:attention.id,provider:'loopback fake only'}));
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>void runtime.close());
