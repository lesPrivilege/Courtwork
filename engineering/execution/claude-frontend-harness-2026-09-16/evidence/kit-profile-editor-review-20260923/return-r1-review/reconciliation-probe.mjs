import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {createProfileEditor}=await import(pathToFileURL(resolve(process.argv[2], 'app/web/profile-editor.mjs')));
const sha=s=>createHash('sha256').update(s).digest('hex');
const S='synthetic-chat', P='local:profile';
let content='{"version":"1"}', revision=7;
const resource=()=>({id:P,kind:'agent_profile',title:'Profile',scope:{type:'user',id:'local'},source:{type:'local-config',hash:sha(content)}});
const pending=[];
const editor=createProfileEditor({adapter:{
 source:async()=>({revision,resource:resource(),content}),
 control:async()=>({revision,activeRuns:0}),
 save:async(_s,body)=>{assert.equal(body.revision,revision); content=body.resource.content;revision++;const reply={revision,resources:[resource()]};await new Promise(resolve=>pending.push(resolve));return reply;},
}});
editor.observe(S,{revision,activeRuns:0,editableId:P}); editor.open(S,P);
await new Promise(r=>setTimeout(r,0));
editor.setText(S,P,'{"version":"2"}');
const first=editor.save(S,P);
while(pending.length<1) await new Promise(r=>setTimeout(r,1));
editor.setText(S,P,'{"version":"3"}');
// Returning to Settings reads the Host revision after the first write, while its response is delayed.
editor.observe(S,{revision,activeRuns:0,editableId:P});
await editor.check(S,P);
const before=editor.reading(S,P);
editor.keepMine(S,P);
const after=editor.reading(S,P);
const second=editor.save(S,P);
while(pending.length<2) await new Promise(r=>setTimeout(r,1));
console.log(JSON.stringify({sourceSha:'991a0c600d5abc6a8fdd6d13adc1ac0a1b137da1',before:{status:before.save.status,freshRevision:before.fresh?.revision},after:{status:after.save.status,saveEnabled:after.save.gate.enabled},requestsBeforeAnyResponse:pending.length,hostRevision:revision,content},null,2));
for(const resolve of pending)resolve(); await Promise.all([first,second]);
assert.equal(pending.length,2,'reproduced overlapping saves after reconciliation');
