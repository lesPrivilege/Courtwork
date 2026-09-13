import { el } from './ui-controls.mjs';
const reasons={restart_requires_explicit_review:'The host restarted. Inspect the interrupted attempt before retrying.',spark_provider_changed:'The model configuration changed. Start a new task to use it.',spark_source_policy:'Source access changed. Check the current permissions.',assigned_source_coverage_incomplete:'Some assigned source versions were not read. The findings show partial coverage.',findings_publication_failed:'The run ended, but its findings could not be retained. Retry after storage is available.',missing_or_oversized_findings:'The run did not return findings within the output limit.',run_unknown:'The attempt ended without a confirmed outcome. Inspect it before retrying.',run_failed:'The exploration failed. Inspect the attempt details before retrying.',spark_budget:'This task has used its execution budget.',agent_disabled:'Spark is disabled.'};
const labels={queued:'Queued',active:'Exploring',blocked:'Needs attention',resolved:'Findings ready',cancelled:'Stopped'};
export function createSubagentView({request,getSession,onMaintenance,onOpenSession}) {
 const aside=el('section',{className:'rail-card subagent-card',attrs:{'aria-label':'Subagents',hidden:true}});
 const dialog=el('dialog',{className:'spark-dialog',attrs:{'aria-label':'Spark Explore'}});document.body.append(dialog);
 let owner=null,data=null,epoch=0,opener=null,timer=null,selected=null,expanded=new Set(),busy=false,pendingCreate=null,pendingSessionId=null,railSignature=null;
 const pendingCommands=new Map(),pendingMounts=new Map();
 const pendingKey='courtwork.spark.pending-create.v1';
 try{const saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');pendingCreate=saved?.create??null;pendingSessionId=saved?.sessionId??null;}catch{/* An invalid local draft never changes Host state. */}
 const keepPending=()=>{try{if(pendingCreate||pendingSessionId)sessionStorage.setItem(pendingKey,JSON.stringify({create:pendingCreate,sessionId:pendingSessionId}));else sessionStorage.removeItem(pendingKey);}catch{/* Host idempotency still applies within this page. */}};
 async function submitPending(){
  try{const response=await request('/subagents',{method:'POST',body:{id:pendingCreate.id,...pendingCreate.payload}});if(response?.assignment?.id!==pendingCreate.id)throw Error('The task receipt was incomplete. Retry to recover it.');pendingCreate=null;pendingSessionId=null;keepPending();await refresh();await detail(response.assignment.id);}
  catch(e){if(e.status&&e.status<500){pendingCreate=null;keepPending();}throw e;}
 }

 const button=(text,fn)=>{const b=el('button',{text,className:'quiet-button',attrs:{type:'button'}});b.addEventListener('click',()=>void fn());return b;};
 const taskButton=(a,fn)=>{const b=button(a.available?`${labels[a.status]??'Unknown'} · ${a.brief}`:'Assignment unavailable',fn);b.dataset.assignmentId=a.id;return b;};
 const notice=el('p',{className:'form-help',attrs:{role:'status'}});
 const content=el('div',{className:'observation-dialog-body'});
 dialog.append(el('header',{className:'spark-header'},el('h2',{text:'Spark · Explore'}),button('Close',()=>dialog.close())),notice,content);
 dialog.addEventListener('close',()=>{epoch++;selected=null;expanded.clear();if(opener?.isConnected)opener.focus();else if(aside.isConnected)aside.querySelector('button')?.focus();});
 async function guarded(fn){if(busy)return;busy=true;notice.textContent='';try{await fn();}catch(e){notice.textContent=e.message||'Spark unavailable. Refresh to retry.';}finally{busy=false;}}
 function renderRail(){const signature=JSON.stringify([owner?.id,data?.agents?.[0]?.status,(data?.assignments??[]).filter(a=>a.parentSessionId===owner?.id&&!a.archived).map(a=>[a.id,a.status,a.brief,a.available])]);if(signature===railSignature)return;railSignature=signature;aside.replaceChildren(el('h3',{text:'Subagents'}),el('p',{text:'Spark · Explore',className:'rail-card-title'}),el('p',{text:'Read-only research and source checks.',className:'form-help'}),button('Ask Spark',()=>open(owner)));
  const tasks=(data?.assignments??[]).filter(a=>a.parentSessionId===owner?.id&&!a.archived);
  for(const a of tasks.slice(-3).reverse())aside.append(taskButton({...a,brief:a.brief?.slice(0,60)},async()=>{await open(owner);await guarded(()=>detail(a.id));}));
 }
 async function refresh(){const mine=++epoch;const d=await request('/subagents');if(mine!==epoch)return;data=d;renderRail();}
 function schedule(){clearTimeout(timer);if(aside.hidden&&!dialog.open)return;timer=setTimeout(async()=>{try{await refresh();}catch{/* Next explicit open reports transport failure. */}schedule();},2000);}
 function sync(session,visible){const hidden=!visible||!session||Boolean(session.extensionBinding);if(owner?.id===session?.id&&aside.hidden===hidden)return;owner=session;aside.hidden=hidden;if(!aside.hidden){renderRail();void refresh().catch(()=>{});}schedule();}
 async function directory(){
  content.replaceChildren();selected=null;expanded.clear();
  const sessions=await request('/sessions');
  const choices=(sessions.sessions??[]).filter(s=>!s.extensionBinding && !data?.assignments.some(a=>a.attempts?.some(t=>t.sessionId===s.id)));
  const select=el('select',{attrs:{'aria-label':'Task conversation'}});
  for(const s of choices){const option=el('option',{text:s.title||'Untitled chat',attrs:{value:s.id}});select.append(option);}
  if(owner&&choices.some(s=>s.id===owner.id))select.value=owner.id;
  const brief=el('textarea',{attrs:{'aria-label':'Explore brief',rows:'3',maxlength:'16000',placeholder:'What should Spark investigate?'}});
  const sourceBox=el('fieldset');sourceBox.append(el('legend',{text:'Exact sources'}));let sources=[];
  let sourceEpoch=0;
  async function sourceOptions(){
   const mine=++sourceEpoch,sessionId=select.value;sourceBox.replaceChildren(el('legend',{text:'Exact sources'}));sources=[];
   if(!sessionId)return;
   let offset=0;
   do {
    const page=await request(`/subagents/source-directory?sessionId=${encodeURIComponent(sessionId)}&offset=${offset}`);
    if(mine!==sourceEpoch||!sourceBox.isConnected||select.value!==sessionId)return;
    for(const {ref,freshness} of page.entries){const checkbox=el('input',{attrs:{type:'checkbox'}});sources.push({checkbox,ref});sourceBox.append(el('label',{},checkbox,el('span',{text:`${ref.path} · ${ref.revision?`v${ref.revision}`:ref.sha256.slice(0,8)} · ${freshness==='historical-version'?'historical version':freshness==='workspace-freshness-unchecked'?'retained snapshot':'latest retained version'}`})));}
    offset=page.nextOffset;
    // Keep this picker bounded; the Agent directory tool exposes further pages.
    if(offset!==null&&sources.length>=100){sourceBox.append(el('p',{text:'Showing the first 100 permitted versions.',className:'form-help'}));break;}
   }while(offset!==null);
   if(!sources.length)sourceBox.append(el('p',{text:'No retained sources are available in this chat.',className:'form-help'}));
  }
  select.addEventListener('change',()=>void guarded(sourceOptions));
  const start=button('Start exploration',()=>guarded(async()=>{
   if(!brief.value.trim())throw Error('Enter a brief.');
   const chosen=sources.filter(s=>s.checkbox.checked).map(s=>s.ref);if(chosen.length>16)throw Error('Choose up to 16 source versions.');
   let parentSessionId=select.value;
   if(!parentSessionId){pendingSessionId??=crypto.randomUUID();keepPending();const created=await request('/sessions',{method:'POST',body:{sessionId:pendingSessionId,title:'Spark tasks'}});parentSessionId=created.session.id;}
   const payload={parentSessionId,brief:brief.value,sources:chosen};
   if(pendingCreate&&JSON.stringify(pendingCreate.payload)!==JSON.stringify(payload))throw Error('The previous request has an uncertain receipt. Retry the unchanged brief and sources first.');
   pendingCreate??={id:crypto.randomUUID(),payload};keepPending();
   await submitPending();
  }));
  start.disabled=data?.agents?.[0]?.status!=='active';
  content.append(el('p',{text:'A separate agent context checks only the brief and selected source versions. Your current model is used.',className:'form-help'}),select,brief,sourceBox,start);
  await sourceOptions();
  if(pendingCreate)content.append(el('p',{text:'A previous task request has no confirmed receipt.',className:'form-help'}),button('Recover previous request',()=>guarded(submitPending)));
  content.append(el('h3',{text:'Tasks'}));
  for(const a of [...(data?.assignments??[])].filter(a=>!a.archived).reverse())content.append(taskButton(a,()=>guarded(()=>detail(a.id))));
  content.append(button(data?.agents?.[0]?.status==='disabled'?'Enable Spark':'Disable Spark',()=>guarded(async()=>{await request('/subagents/agent',{method:'PUT',body:{status:data?.agents?.[0]?.status==='disabled'?'active':'disabled'}});await refresh();await directory();})));
  content.append(button('Source maintenance',()=>{dialog.close();onMaintenance();}));
 }
 async function detail(id){selected=id;expanded.clear();const a=data?.assignments.find(a=>a.id===id);if(!a?.available)throw Error('Assignment unavailable.');content.replaceChildren(button('Back to tasks',()=>guarded(directory)),el('h3',{text:a.brief}),el('p',{text:labels[a.status]??'Unknown'}));
  if(a.reason)content.append(el('p',{text:reasons[a.reason]??'This task needs attention. Inspect its execution details.',className:'form-help'}));
  const resultArea=el('div');content.append(resultArea);
  async function act(action){
   const key=`${id}/${action}`;let command=pendingCommands.get(key);
   if(!command){command={action,expectedRevision:a.revision,commandId:crypto.randomUUID(),reason:`User ${action}`,expandedSources:[...expanded]};pendingCommands.set(key,command);}
   try{await request(`/subagents/${encodeURIComponent(id)}/actions`,{method:'POST',body:command});pendingCommands.delete(key);}catch(e){if(e.status===409)pendingCommands.delete(key);throw e;}
   selected=null;await refresh();await detail(id);
  }
  if(['queued','active','blocked'].includes(a.status))content.append(button(a.cancelRequested?'Stop requested':'Stop',()=>guarded(()=>act('cancel'))));
  if(a.status==='blocked'&&a.attempts.at(-1)?.status==='unknown')content.append(button('Reconcile interrupted read-only attempt',()=>guarded(()=>act('reconcile'))));
  if(a.status==='blocked'&&!a.attempts.some(t=>t.status==='unknown'))content.append(button('Retry in a new context',()=>guarded(()=>act('retry'))));
  content.append(button('Refresh',()=>guarded(async()=>{selected=null;await refresh();await detail(id);})));
  if(a.result){const result=await request(`/subagents/${encodeURIComponent(id)}/result`);resultArea.append(el('pre',{className:'subagent-result',text:result.text}));
   const sourceArea=el('div');for(const [i,s] of a.sources.entries())sourceArea.append(button(`Read source ${i+1} · ${s.path}`,()=>guarded(async()=>{const read=await request(`/subagents/${encodeURIComponent(id)}/sources/${i}`);expanded.add(i);sourceArea.append(el('pre',{className:'subagent-result',text:read.text}));})));resultArea.append(sourceArea);for(const note of result.notes??[])resultArea.append(button(`Read local note · ${note.title}`,()=>guarded(async()=>{const read=await request(`/subagents/${encodeURIComponent(id)}/notes/${encodeURIComponent(note.id)}`);resultArea.append(el('pre',{className:'subagent-result',text:read.text}));})));
   content.append(button('Return to main chat',()=>{dialog.close();onOpenSession(a.parentSessionId);}));
  }
  const projects=await request('/projects'),mountData=await request('/subagents/mounts');
  const target=el('select',{attrs:{'aria-label':'Mount data in project'}});for(const p of projects.projects??[])target.append(el('option',{text:p.name,attrs:{value:p.id}}));
  const mounts=mountData.mounts.filter(m=>m.assignmentId===id&&m.enabled);
  for(const m of mounts)content.append(button(`Remove project access · ${projects.projects.find(p=>p.id===m.target.id)?.name??m.target.id}`,()=>guarded(async()=>{await request(`/subagents/mounts/${encodeURIComponent(m.id)}/revoke`,{method:'POST',body:{expectedRevision:m.revision}});await detail(id);})));
  if(target.options.length)content.append(target,button('Make available in project',()=>guarded(async()=>{
   if(mounts.some(m=>m.target.kind==='project'&&m.target.id===target.value)){notice.textContent='This project already has access.';return;}
   const key=`${id}/${target.value}`;if(!pendingMounts.has(key))pendingMounts.set(key,crypto.randomUUID());
   await request('/subagents/mounts',{method:'POST',body:{id:pendingMounts.get(key),assignmentId:id,target:{kind:'project',id:target.value}}});pendingMounts.delete(key);
   await detail(id);notice.textContent='Project agents can discover this reference and expand permitted data.';
  })));
  if(!['queued','active'].includes(a.status))content.append(button('Archive task',()=>guarded(async()=>{await act('archive');await directory();})));
  const disclosure=el('details',{},el('summary',{text:'Assignment and execution'}),el('pre',{className:'subagent-result',text:JSON.stringify({agentId:a.agentId,definition:a.definition,scope:a.scope,origin:a.origin,attempts:a.attempts,reason:a.reason,providerSelection:a.providerSelection,budget:a.budget,consumption:a.consumption},null,2)}));content.append(disclosure);
 }
 async function open(session=getSession()){owner=session;opener=document.activeElement;selected=null;if(!dialog.open)dialog.showModal();await guarded(async()=>{await refresh();await directory();});schedule();}
 return {sync,open,element:aside};
}
