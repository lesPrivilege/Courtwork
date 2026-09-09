import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startServer } from '../../app/server/index.mjs';
import { FAKE_CREDENTIAL_KEY } from '../../app/runtime/pi-session-runtime.mjs';
const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-home-preview-'));
const runtime = await startServer({ dataDir, port: Number(process.env.HOME_PREVIEW_PORT || 0), logger: () => {} });
const api = async (method, p, body) => {
  const r = await fetch(runtime.url + '/api/v5' + p, { method, headers: { 'content-type':'application/json', 'x-work-token':runtime.token }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await r.json(); if (!r.ok) throw new Error(JSON.stringify(json)); return json;
};
await api('PUT','/provider-credential',{provider:'fake-openai-loopback',apiKey:FAKE_CREDENTIAL_KEY});
await api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
const projects = [];
for (const name of ['NDA review', 'Northside Housing']) projects.push((await api('POST','/projects',{name})).project);
for (const [index,title] of ['Exhibit index rebuild','Side letter — open points','Counterparty summary','Rent ledger reconciliation'].entries()) {
 const session = (await api('POST','/sessions',{projectId:projects[index === 3 ? 1 : 0].id,title})).session;
 const input = index === 3 ? '/fixture script '+JSON.stringify([{name:'ask_user',arguments:{prompt:'Which effective date should the side letter use?'}}]) : 'Summarize this synthetic fixture.';
 const run = (await api('POST',`/sessions/${session.id}/runs`,{commandId:crypto.randomUUID(),input})).run;
 for(let i=0;i<200;i++) {const r=(await api('GET',`/runs/${run.id}`)).run;if(['completed','failed','waiting_user'].includes(r.status))break;await new Promise(r=>setTimeout(r,25));}
}
for (const title of ['Disclosure schedule','Signature packet','Amendment comparison','Closing checklist','Counsel comments','Definitions review']) await api('POST','/sessions',{projectId:projects[0].id,title});
for (const [index,title] of ['Confirm the effective date','Compare the liability clauses','Await the revised exhibit','Check signature authority'].entries()) {
 const id = 'home-example-'+index;
 await api('POST','/attention',{projectId:projects[0].id,request:{schema_version:1,request_id:'create-'+id,attention_id:id,expected_revision:0,action:'create',payload:{descriptor:{title,summary:'Synthetic review item for the Home layout preview.'},reason:'The review needs a recorded human decision before the next step.',next_action:{kind:'inspect',label:'Read the recorded comparison',trigger:'manual',due_at:null},source_refs:[{kind:'external',matter_id:null,source_id:'synthetic-reference',version:1,locator:'Example side letter · clause 4',role:'supports',digest:null}],relation_refs:[{kind:'external',id:'review-notebook',relation:'about'}]}}});
 if(index===0)await api('POST',`/attention/${id}/actions`,{projectId:projects[0].id,request:{schema_version:1,request_id:'resume-'+id,attention_id:id,expected_revision:1,action:'resume',payload:{reason:'Ready for your review',status:'needs_you'}}});
}
console.log(JSON.stringify({url:runtime.url+'/?shell=desktop',dataDir,projects:projects.map(({id,name})=>({id,name})),dataClass:'synthetic; local loopback only'}));
process.on('SIGTERM',async()=>{await runtime.close();process.exit(0)});
