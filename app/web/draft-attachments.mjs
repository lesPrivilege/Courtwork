import { el, action, setAction, anchorPopover } from './ui-controls.mjs';

// Draft materials have no Session or workspace authority until send. Uploads
// replay the existing retained-source command, including an uncertain receipt.
export function createDraftAttachments({ changed = () => {}, restored = [], locked = () => false } = {}) {
  let entries = restored, stopFollowing = null, signature = "";
  const trigger = action('paperclip', 'Attachments', () => {
    if (locked()) return;
    render(); popover.showPopover(); upload.focus();
  }, {className:'quiet-button'});
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  const popover = el('div', {className:'draft-attachments-popover', attrs:{popover:'auto', role:'dialog', 'aria-label':'Attachments'}});
  const upload = el('input', {attrs:{type:'file', multiple:'', 'aria-label':'Add text files'}});
  const list = el('div', {className:'draft-attachment-list'});
  const error = el('p', {className:'inline-error', attrs:{role:'status'}});
  const close = action('x', 'Close attachments', () => {popover.hidePopover(); trigger.focus();});
  popover.append(el('div', {className:'section-heading'}, el('h3',{text:'Attachments'}),close),
    el('p',{className:'form-help',text:'Add UTF-8 text files, up to 1 MB each. Files are saved with the chat when you send.'}),upload,list,error);
  popover.addEventListener('toggle', e => {
    stopFollowing?.(); stopFollowing = null;
    const open = e.newState === 'open'; trigger.setAttribute('aria-expanded',String(open));
    if (open) stopFollowing = anchorPopover(trigger,popover,{placement:'top-start'});
  });
  popover.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();popover.hidePopover();trigger.focus();}});
  function render() {
    const next = JSON.stringify([locked(), entries.map(item=>[item.name,item.commandId,Boolean(item.attempted)])]);
    if (next === signature) return;
    signature = next;
    const focused = list.contains(document.activeElement) ? document.activeElement?.dataset.attachmentName : null;
    list.replaceChildren();
    for (const item of entries) {
      const remove=action('x', `Remove ${item.name}`,()=>{if(locked() || item.attempted)return;entries=entries.filter(e=>e!==item);render();changed();}, {attrs:{"data-attachment-name":item.name}});
      remove.disabled=locked() || Boolean(item.attempted);
      list.append(el('div',{className:'section-heading'},el('span',{text:item.name}),remove));
    }
    setAction(trigger, 'paperclip', entries.length ? `Attachments (${entries.length})` : 'Attachments', {visible: entries.length ? String(entries.length) : false});
    trigger.disabled=locked(); upload.disabled=locked();
    if (focused && document.activeElement === document.body) (Array.from(list.querySelectorAll("button")).find(button=>button.dataset.attachmentName === focused) || upload).focus();
  }
  upload.addEventListener('change',async()=>{
    const files=[...(upload.files||[])]; error.textContent='';
    try {
      const additions=[];
      for(const file of files){
        if(!/^[A-Za-z0-9._-]{1,200}$/.test(file.name))throw new Error('Use a filename with letters, numbers, dots, underscores or hyphens.');
        if(file.size>1_000_000)throw new Error(`${file.name} exceeds 1 MB.`);
        const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
        const item={name:file.name,text,commandId:crypto.randomUUID(),expectedRevision:0};
        if(new TextEncoder().encode(JSON.stringify(item)).length>1_048_576)throw new Error(`${file.name} exceeds the upload request limit.`);
        if(entries.some(e=>e.name===item.name)||additions.some(e=>e.name===item.name))throw new Error(`Remove ${item.name} before adding a replacement.`);
        additions.push(item);
      }
      if(locked())throw new Error('The chat is starting. Add these files after it opens.');
      if(new TextEncoder().encode(JSON.stringify([...entries,...additions])).length>4_000_000)throw new Error('Draft attachments exceed 4 MB. Send these files first.');
      entries=entries.concat(additions); changed();
    } catch(e){error.textContent=e.message;}
    upload.value='';render();
  });
  render();
  return {trigger,popover, render, snapshot:()=>structuredClone(entries),
    restore(value){entries=Array.isArray(value)?value.filter(e=>typeof e?.name==='string'&&typeof e.text==='string'&&typeof e.commandId==='string'&&e.expectedRevision===0):[];render();},
    async flush(request,sessionId){
      for(const entry of [...entries]){
        entry.attempted = true; changed();
        const {name,text,commandId,expectedRevision} = entry;
        let result;
        try { result=await request(`/sessions/${encodeURIComponent(sessionId)}/materials`,{method:'POST',body:{name,text,commandId,expectedRevision}}); }
        catch(error){
          if(Number.isFinite(error.status) && error.status >= 400 && error.status < 500){entry.attempted=false;changed();}
          throw error;
        }
        if(result.workspaceState!=='written')throw new Error('Attachment is retained but not yet linked. Send again to retry the same upload.');
        entries=entries.filter(e=>e!==entry);changed();render();
      }
    },
  };
}
