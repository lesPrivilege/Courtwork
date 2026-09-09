import { el } from './ui-controls.mjs';

// Explicit local communication. This surface never starts a Run.
export function createCoordinationView({request,onOpenSession}) {
  const root=el('details',{className:'coordination-view'},el('summary',{text:'Threads & messages'}));
  const body=el('div',{className:'coordination-body'}); root.append(body);
  const feedback=el('p',{attrs:{role:'status'}});
  const source=el('select',{attrs:{'aria-label':'Working conversation'}});
  const title=el('input',{attrs:{'aria-label':'New Thread title',placeholder:'Thread title',maxlength:'200'}});
  const target=el('select',{attrs:{'aria-label':'Message destination Thread'}});
  const message=el('textarea',{attrs:{'aria-label':'Message another Thread',rows:'2',maxlength:'16000'}});
  const join=el('select',{attrs:{'aria-label':'Thread to continue'}});
  const list=el('div',{attrs:{'aria-label':'Thread mailbox'}});
  let mailOffset=0,generation=0,busy=false,threads=[],sessions=[],current=null,receipt=null,createReceipt=null,active=false;
  const drafts=new Map();
  const button=(text,fn)=>{const b=el('button',{text,attrs:{type:'button'}});b.addEventListener('click',fn);return b;};
  const refresh=button('Refresh',()=>load());
  const create=button('Create Thread',()=>mutate(async()=>{
    createReceipt ??= {threadId:crypto.randomUUID(),sessionId:source.value,title:title.value};
    const response=await request('/coordination/threads',{method:'POST',body:createReceipt});
    if(response.schemaVersion!==1 || response.thread?.id!==createReceipt.threadId || response.thread.creation?.sessionId!==createReceipt.sessionId)throw new Error('Thread receipt unavailable; retry the same creation');
    createReceipt=null;feedback.textContent='Thread created.';
  }));
  const attach=button('Continue in Thread',()=>mutate(async()=>{
    const t=threads.find(t=>t.id === join.value); if (!t) throw new Error('Choose a Thread');
    const sessionId=source.value;
    const response=await request(`/coordination/threads/${encodeURIComponent(t.id)}/attach`,{method:'POST',body:{sessionId,expectedRevision:t.revision}});
    if(response.schemaVersion!==1 || response.thread?.id!==t.id || !response.thread.sessionIds?.includes(sessionId))throw new Error('Membership receipt unavailable; refresh to reconcile');
    feedback.textContent='Conversation attached to Thread.';
  }));
  const send=button('Send message',()=>mutate(async()=>{
    const t=threads.find(t=>t.id === target.value); if (!receipt && (!t || !current)) throw new Error('Choose a destination');
    receipt ??= {messageId:crypto.randomUUID(),sourceThreadId:current.id,targetThreadId:t.id,sourceSessionId:source.value,expectedTargetRevision:t.revision,kind:'request',text:message.value,replyTo:null};
    const response=await request('/coordination/messages',{method:'POST',body:receipt});
    if(response.schemaVersion !== 1 || response.message?.id !== receipt.messageId) throw new Error('Message receipt unavailable; retry the same message');
    feedback.textContent=`Message ${response.message.status}. This does not start a Run.`;
    receipt=null;message.value='';drafts.delete(source.value);
  }));
  const registration=el('div',{},title,create,join,attach);
  const composer=el('div',{},target,message,send);
  body.append(el('p',{text:'Create a durable working thread or continue one with another conversation. Members share its inbox. Sending does not wake an agent or import conversation history.'}),
    source,refresh,registration,composer,feedback,list,
    el('p',{className:'form-help',text:'Explore execution, ownership handoff and Workflow are not connected to this surface yet.'}));
  function controls() {
    for(const node of [source,refresh,title,create,join,attach,target,message,send]) node.disabled=busy;
    source.disabled ||= Boolean(receipt || createReceipt);
    title.disabled ||= Boolean(createReceipt);message.readOnly=Boolean(receipt);target.disabled ||= Boolean(receipt);
    registration.hidden=Boolean(current) && !createReceipt;composer.hidden=!current && !receipt;
    create.disabled ||= !source.value || !title.value.trim(); attach.disabled ||= !join.value;
    if(!receipt) send.disabled ||= !current?.available || !target.value || !message.value.trim();
    send.textContent=receipt ? 'Retry same message' : 'Send message';
  }
  async function mutate(fn) {
    if(busy)return;busy=true;generation++;feedback.textContent='Saving…';controls();
    try {await fn();}
    catch(e){feedback.textContent=e.message;if(e.status>=400 && e.status<500){receipt=null;createReceipt=null;}}
    finally{busy=false;await load();controls();}
  }
  async function load() {
    if(busy || !active)return;const own=++generation,sourceId=source.value;refresh.disabled=true;
    try {
      const [directory,conversations]=await Promise.all([request('/coordination'),request('/sessions')]);
      if(own!==generation || !active)return;
      if(directory.schemaVersion!==1 || !Array.isArray(directory.threads) || !Array.isArray(conversations.sessions))throw new Error('Unsupported Thread directory');
      threads=directory.threads;sessions=conversations.sessions;
      if(createReceipt && threads.some(t=>t.id===createReceipt.threadId&&t.creation?.sessionId===createReceipt.sessionId&&t.creation?.title===createReceipt.title)){createReceipt=null;feedback.textContent='Thread creation confirmed.';}
      source.replaceChildren(el('option',{text:'Choose working conversation',attrs:{value:''}}),...sessions.map(s=>el('option',{text:`${s.title} · ${s.scope === 'global' ? 'Attention' : 'Project'} · ${s.id.slice(0,8)}`,attrs:{value:s.id}})));
      if(sessions.some(s=>s.id===sourceId))source.value=sourceId;
      current=threads.find(t=>t.sessionIds.includes(source.value)) ?? null;
      const previousTarget=target.value;
      target.replaceChildren(el('option',{text:'Choose destination',attrs:{value:''}}),...threads.filter(t=>t.available&&t.id!==current?.id).map(t=>el('option',{text:`${t.title} · ${t.id.slice(0,8)}`,attrs:{value:t.id}})));
      if(threads.some(t=>t.id===previousTarget&&t.available))target.value=previousTarget;
      const s=sessions.find(s=>s.id===source.value);
      join.replaceChildren(el('option',{text:'Choose existing Thread',attrs:{value:''}}),...threads.filter(t=>t.status==='open' && t.scope.kind===s?.scope&&t.scope.projectId===s?.projectId&&t.scope.matterId===(s?.extensionBinding?.binding?.matterId??null)).map(t=>el('option',{text:t.title,attrs:{value:t.id}})));
      list.replaceChildren();
      if(current) {
        const mailbox=await request(`/coordination/threads/${encodeURIComponent(current.id)}?offset=${mailOffset}&limit=20`);
        if(own!==generation || !active)return;
        if(mailbox.schemaVersion!==1 || mailbox.thread?.id!==current.id || !Array.isArray(mailbox.messages))throw new Error('Unsupported mailbox');
        list.append(el('h3',{text:current.title}));
        if(!mailbox.messages.length)list.append(el('p',{text:'No messages yet.'}));
        list.append(el('p',{className:'form-help',text:`${mailbox.total} retained messages${mailbox.total ? ` · showing ${mailbox.offset+1}–${mailbox.offset+mailbox.messages.length}` : ''}`}));
        if(mailOffset>0)list.append(button('Previous messages',()=>{mailOffset=Math.max(0,mailOffset-20);void load();}));
        if(mailbox.nextOffset!==null)list.append(button('More messages',()=>{mailOffset=mailbox.nextOffset;void load();}));
        for(const m of mailbox.messages) {
          const outgoing=m.sourceThreadId===current.id,other=threads.find(t=>t.id===(outgoing?m.targetThreadId:m.sourceThreadId));
          const item=el('article',{},el('strong',{text:`${outgoing?'To':'From'} ${other?.title??'Retained Thread'} · ${m.status}`}),el('p',{text:m.text}));
          const retained=other?.sessionIds.find(id=>sessions.some(s=>s.id===id));
          if(retained)item.append(button('Open conversation',()=>onOpenSession(retained)));
          list.append(item);
        }
      }
    } catch(e){if(own===generation) {feedback.textContent=e.message; current=null;list.replaceChildren();}}
    finally{if(own===generation)controls();}
  }
  source.addEventListener('change',()=>{feedback.textContent='';mailOffset=0;message.value=drafts.get(source.value)??'';void load();});
  message.addEventListener('input',()=>{drafts.set(source.value,message.value);controls();});
  for(const n of [title,target,join])n.addEventListener('input',controls);
  root.addEventListener('toggle',()=>{active=root.open;if(active)void load();else generation++;});
  controls();
  return {root,deactivate(){active=false;generation++;root.open=false;},};
}
