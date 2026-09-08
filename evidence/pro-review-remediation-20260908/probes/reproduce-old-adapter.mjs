// Run against a frozen checkout argument, with a fresh synthetic data directory.
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
const {createEvidenceMemo}=await import(pathToFileURL(path.resolve(root,'app/extensions/evidence-memo/index.mjs')));
const dir=await mkdtemp(path.join(tmpdir(),'cw-old-context-probe-'));
const extension=createEvidenceMemo({dataDir:dir});
const result={scope:'actual WorkExtension/Core, synthetic direct driver; no HTTP/provider'};
try {
  const binding=await extension.createBinding({title:'Old context boundary',sourceText:'Synthetic approved source'});
  const p=await extension.projection(binding),s=p.sources[0];
  const start=(runId,sessionId)=>extension.begin({runId,sessionId,binding,provider:{provider:'fake-openai-loopback',model:'fake',api:'openai-completions'},instruction:'Synthetic work'});
  const run=await start('first','session-a');
  const evidence=[{source_id:s.id,source_version:s.version,start:0,end:s.text.length,quote:s.text,digest:s.digest}];
  const submit=run.tools.find(t=>t.name==='se_submit_candidate');
  try {await submit.execute({artifact_text:'Reference https://example.invalid/',evidence,obligations:[]});result.url='accepted';}
  catch(e) {result.url={code:e.code,message:e.message};}
  await submit.execute({artifact_text:'A'.repeat(25000),evidence,obligations:[]});
  await run.finish({status:'succeeded'});
  const pending=await extension.projection(binding);
  const c=pending.candidates.find(c=>c.artifact_text.length===25000);
  await extension.humanAction({binding,actor:'local-user',action:'decide',payload:{request_id:'review-long',candidate_id:c.id,base_version:0,action:'accept',reason:'Synthetic review'}});
  result.acceptedCharacters=(await extension.projection(binding)).artifact.content.length;
  try {const next=await start('next','session-b');result.continuation='started';await next.finish({status:'succeeded'});}
  catch(e) {result.continuation={code:e.code,message:e.message};}
  console.log(JSON.stringify(result,null,2));
} finally {await extension.dispose();await rm(dir,{recursive:true,force:true});}
