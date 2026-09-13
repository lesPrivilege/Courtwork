import { boot } from '../../../../app/tests/helpers.mjs';
import { randomUUID } from 'node:crypto';
const h = await boot();
for (const [id,title] of [['att-independent-a','Independent acceptance · renewal reply'],['att-independent-b','Independent acceptance · schedules']]) {
 const r = await h.api('POST','/attention',{projectId:h.projectId,request:{schema_version:1,request_id:randomUUID(),attention_id:id,expected_revision:0,action:'create',payload:{descriptor:{title,summary:null},reason:'Synthetic decision awaiting a person.',next_action:{kind:'decide',label:'Review the recorded decision',trigger:'manual',due_at:null},source_refs:[],relation_refs:[]}}});
 if(r.status!==200)throw new Error(JSON.stringify(r));
}
console.log(JSON.stringify({url:h.runtime.url,dataDir:h.dataDir,projectId:h.projectId}));
