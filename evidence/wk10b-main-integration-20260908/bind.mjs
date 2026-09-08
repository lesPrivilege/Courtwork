import {SYNTHETIC_SOURCES,NORMAL_FACTS} from '../../app/domains/inbound-nda/fixtures.mjs';
const base=process.env.WK10B_BASE || 'http://127.0.0.1:8891'; let token;
async function api(method,path,body){const r=await fetch(base+'/api/v5'+path,{method,headers:{Origin:base,...token?{'x-work-token':token}:{},'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(JSON.stringify(j));return j;}
token=(await api('GET','/bootstrap')).sessionToken;
const project=(await api('GET','/projects')).projects[0];
for(const [extensionId,title] of [['evidence-memo','Memo review'],['inbound-nda','NDA review']]){await api('POST',`/extensions/${extensionId}/lifecycle`,{action:'load'}); const s=(await api('POST','/sessions',{projectId:project.id,title})).session; await api('POST',`/sessions/${s.id}/extension`,{extensionId,input:{title,sourceText:SYNTHETIC_SOURCES[0].text,...extensionId==='inbound-nda'?{facts:NORMAL_FACTS}:{}}});}
