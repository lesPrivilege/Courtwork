// Regenerate Fable's packet using the actual HTTP/Pi/SQLite synthetic path.
import {writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {boot} from '../tests/helpers.mjs';
import {NORMAL_FACTS,SYNTHETIC_SOURCES} from '../domains/inbound-nda/fixtures.mjs';
import {buildReview} from '../domains/inbound-nda/index.mjs';
const h=await boot();
try {
 await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'load'});
 const session=await h.createSession();
 const bound=await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'inbound-nda',input:{title:'Synthetic inbound NDA',sourceText:SYNTHETIC_SOURCES[0].text,facts:NORMAL_FACTS}});
 if(bound.status!==200) throw new Error(JSON.stringify(bound.json));
 const initial=(await h.api('GET',`/sessions/${session.id}/surface`)).json;
 const domain=buildReview({sources:initial.projection.sources,facts:initial.projection.domain.facts});
 const submitted=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'packet-fixture',input:h.scriptInput([{name:'se_submit_candidate',arguments:{domain}}])});
 await h.pollRun(submitted.json.run.id);
 const pending=(await h.api('GET',`/sessions/${session.id}/surface`)).json;
 const decision={extensionId:'inbound-nda',generation:pending.extension.generation,action:'decide',payload:{request_id:'packet-human-accept',candidate_id:pending.projection.candidates[0].id,base_version:0,action:'accept',reason:'Synthetic human fixture decision'}};
 const receipt=await h.api('POST',`/sessions/${session.id}/actions`,decision);
 if(receipt.status!==200) throw new Error(JSON.stringify(receipt.json));
 const accepted=(await h.api('GET',`/sessions/${session.id}/surface`)).json;
 const revisionAction=accepted.projection.humanActions.find(action=>action.action==='revise_candidate');
 if(revisionAction?.schemaVersion!==1) throw new Error('versioned revision action missing');
 const properties=revisionAction.payloadSchema.properties;
 const revision={extensionId:'inbound-nda',generation:accepted.extension.generation,action:revisionAction.action,payload:{candidate_id:properties.candidate_id.const,new_candidate_id:'packet-human-revision',base_version:properties.base_version.const,proposal:{domain}}};
 const revisedResult=await h.api('POST',`/sessions/${session.id}/actions`,revision);
 if(revisedResult.status!==200) throw new Error(JSON.stringify(revisedResult.json));
 const revised=(await h.api('GET',`/sessions/${session.id}/surface`)).json;
 await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'unload'});
 const history=(await h.api('GET',`/sessions/${session.id}/surface`)).json;
 if(h.runtime.registry.instances.has('inbound-nda')) throw new Error('producer retained after unload');
 const fixture={schemaVersion:1,fixtureVersion:2,dataClass:'synthetic; actual HTTP/Pi loopback/Core; no real provider',decision,revision,pending,accepted,revised,history};
 const bytes=JSON.stringify(fixture,null,2)+'\n';
 const target=new URL('../tests/fixtures/work-core/nda-packets.json',import.meta.url);
 await writeFile(target,bytes);
 console.log(JSON.stringify({file:'app/tests/fixtures/work-core/nda-packets.json',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:Buffer.byteLength(bytes)}));
} finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
