// Explicit synthetic HTTP/Pi/Core visual fixture. No personal data or remote providers.
// Run from any checkout: node evidence/semantic-polish-20260911/fixture.mjs
import { boot } from '../../app/tests/helpers.mjs';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const h = await boot();
const checked = async (method, route, body) => {
  const result = await h.api(method, route, body);
  if (result.status !== 200) throw new Error(`${method} ${route}: ${JSON.stringify(result)}`);
  return result.json;
};
try {
  const project = (await checked('POST', '/projects', {name:'Studio · synthetic review'})).project;
  const chat = await h.createSession({projectId:project.id,title:'Research notes',permissionMode:'draft'});
  const written = await checked('POST', `/sessions/${chat.id}/runs`, {commandId:randomUUID(),input:h.scriptInput([{name:'ws_write',arguments:{path:'out/research-notes.md',text:'# Research notes\n\nA synthetic review of three sources.\n\n## Findings\n\n- Keep sources separate from decisions.\n- Use the same words across the product.\n- Inspect precise records when needed.\n'}}])});
  await h.pollRun(written.run.id,{timeoutMs:20000});
  await checked('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
  const work = await h.createSession({projectId:project.id,title:'Launch brief',permissionMode:'draft'});
  await checked('POST',`/sessions/${work.id}/extension`,{extensionId:'evidence-memo',input:{title:'Launch brief',sourceText:'Synthetic launch brief. The website should use consistent words and show the product before implementation details.'}});
  const question = await h.createSession({projectId:project.id,title:'Choose the review scope'});
  const waiting = await checked('POST',`/sessions/${question.id}/runs`,{commandId:randomUUID(),input:h.scriptInput([{name:'ask_user',arguments:{prompt:'Which part should we review first?',options:['The product flow','The source records']}}])});
  await h.pollRun(waiting.run.id,{until:status=>status==='waiting_user',timeoutMs:20000});
  const made = await checked('POST','/attention',{projectId:project.id,request:{schema_version:1,attention_id:'vs01-attention',request_id:'vs01-create',expected_revision:0,action:'create',payload:{descriptor:{title:'Review the launch brief',summary:'Two source notes are ready for a decision.'},reason:'Confirm the scope before preparing the next version.',next_action:{kind:'inspect',label:'Read the brief',trigger:'manual',due_at:null},source_refs:[],relation_refs:[{kind:'session',id:work.id,relation:'origin'}]}}});
  const manifest={schemaVersion:1,dataClass:'synthetic · real HTTP/Pi loopback/Core',url:h.runtime.url,dataDir:h.dataDir,projectId:project.id,chatId:chat.id,workId:work.id,waitingId:question.id,completedRunId:written.run.id,waitingRunId:waiting.run.id,attentionId:made.attention_id??'vs01-attention'};
  await writeFile('/tmp/courtwork-vs01-preview.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify(manifest));
  for(const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{await h.runtime.close();process.exit(0);});
} catch(error) {await h.runtime.close();throw error;}
