import { el, icon } from './ui-controls.mjs';
import { attentionLabels, toHomeAttention, toHomeAttentionDetail } from './presentation-adapters.mjs';

// A read-only consumer of the same Core queries used by Home. The independent agent is opened explicitly; reading never starts a Run.
export function createAttentionWorkspace(container, { request, onBack, onOpenAssistant }) {
  const state = { projects: [], projectId: null, filter: 'all', data: null, detail: null,
    selectedId: null, loading: false, error: null, detailError: null, detailLoading: false,
    generation: 0, detailGeneration: 0 };
  const time = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Not available';
  function button(text, fn, key, className='text-button') {
    const node = el('button', { text, className, attrs: {type:'button','data-attention-focus':key} });
    node.addEventListener('click',fn); return node;
  }
  function render() {
    const focused = container.contains(document.activeElement) ? document.activeElement?.dataset.attentionFocus : null;
    const root = el('div',{className:'attention-workspace-inner'});
    root.append(el('div',{className:'attention-workspace-heading'},
      el('div',{},el('p',{className:'attention-eyebrow',text:'YOUR WORKSPACE'}),el('h1',{text:'Attention items'}),
        el('p',{className:'form-help',text:'Keep the next human decision in view.'})),
      button('Back to workspace',onBack,'back')));
    const scope = el('select',{attrs:{'aria-label':'Attention workspace project','data-attention-focus':'project'}});
    scope.append(...state.projects.map(p=>el('option',{text:p.name,attrs:{value:p.id}})));scope.value=state.projectId??'';
    scope.disabled=!state.projects.length;
    scope.addEventListener('change',()=>{state.projectId=scope.value;void load();});
    const filter = el('select',{attrs:{'aria-label':'Attention state','data-attention-focus':'filter'}});
    filter.append(el('option',{text:'All states',attrs:{value:'all'}}),...Object.entries(attentionLabels).map(([value,text])=>el('option',{text,attrs:{value}})));
    filter.value=state.filter;filter.addEventListener('change',()=>{state.filter=filter.value;void load();});
    root.append(el('div',{className:'attention-toolbar'},scope,filter,button('Refresh',()=>load(),'refresh')));
    const columns=el('div',{className:`attention-columns ${state.selectedId?'has-selection':''}`});
    const list=el('section',{className:'attention-registry',attrs:{'aria-label':'Attention items'}});
    if(state.loading)list.append(el('p',{className:'form-help',text:'Loading items…',attrs:{role:'status'}}));
    if(state.error)list.append(el('p',{className:'form-help',text:`Items unavailable. ${state.error}`,attrs:{role:'status'}}));
    const page=toHomeAttention(state.data);
    if(page){
      list.append(el('p',{className:'attention-count',text:`${page.count} ${page.count===1?'item':'items'} · ${state.filter==='all'?'all states':attentionLabels[state.filter]}`}));
      if(!page.items.length)list.append(el('div',{className:'attention-empty'},icon('message-square',{size:24}),el('h3',{text:'Nothing in this view'}),el('p',{text:'Recorded attention items matching this project and state will appear here.'})));
      const rows=el('div',{attrs:{role:'list'}});
      for(const item of page.items){
        const row=button('',()=>select(item.id),`item-${item.id}`,'attention-registry-row');
        row.setAttribute('aria-pressed',String(state.selectedId===item.id));
        row.append(el('span',{text:item.title}),el('span',{className:`home-attention-state ${item.status==='needs_you'?'is-review':''}`,text:item.label}));
        rows.append(el('div',{attrs:{role:'listitem'}},row));
      }
      list.append(rows);
      if(page.offset>0||page.nextOffset!==null){
        const pages=el('div',{className:'attention-pagination'});
        if(page.offset>0)pages.append(button('Previous',()=>load(Math.max(0,page.offset-20)),'previous'));
        pages.append(el('span',{className:'form-help',text:`${page.items.length? page.offset+1:0}–${page.offset+page.items.length} of ${page.count}`}));
        if(page.nextOffset!==null)pages.append(button('Next',()=>load(page.nextOffset),'next'));
        list.append(pages);
      }
    }else if(!state.projectId)list.append(el('p',{className:'form-help',text:'Create a project to begin.'}));
    const detail=el('section',{className:'attention-reading',attrs:{'aria-label':'Attention details'}});
    if(state.selectedId)detail.append(button('Back to items',()=>{state.selectedId=null;state.detail=null;state.detailLoading=false;state.detailError=null;state.detailGeneration++;render();container.querySelector('[data-attention-focus="project"]')?.focus();},'list-back','text-button attention-list-back'));
    if(state.detailLoading)detail.append(el('p',{className:'form-help',text:'Loading item…',attrs:{role:'status'}}));
    if(state.detailError)detail.append(el('p',{className:'form-help',text:`Item unavailable. ${state.detailError}`}),button('Retry item',()=>select(state.selectedId),'detail-retry'));
    const d=toHomeAttentionDetail(state.detail);
    if(d){
      detail.append(el('div',{className:'attention-detail-head'},
        el('span',{className:`attention-detail-state ${d.status==='needs_you'?'is-review':''}`,text:attentionLabels[d.status]}),
        el('h2',{text:d.descriptor.title}),d.descriptor.summary?el('p',{text:d.descriptor.summary}):null));
      detail.append(el('div',{className:'attention-decision'},
        el('h3',{text:'Why this needs attention'}),el('p',{text:d.reason}),
        el('h3',{text:'Next step'}),el('p',{text:d.next_action?.label??'Not recorded'}),
        d.next_action?.due_at?el('p',{className:'form-help',text:`Recorded due time: ${time(d.next_action.due_at)}`}):null));
      const refs=el('details',{className:'attention-basis'},el('summary',{text:'Recorded context'}));
      refs.append(el('p',{text:`Revision ${d.revision} · Updated ${time(d.updated_at)}`}),
        el('p',{text:'This view reads the recorded item. Opening it does not acknowledge or resolve it.'}));
      for(const ref of (Array.isArray(state.detail.source_refs)?state.detail.source_refs:[]).filter(ref=>ref && typeof ref.locator==='string'))refs.append(el('p',{text:`${ref.kind==='core'?'Retained source':'External reference'} · ${ref.locator}`}));
      if (Array.isArray(state.detail.source_refs) && !state.detail.source_refs.length) refs.append(el('p',{text:'No source references recorded.'}));
      else if (!Array.isArray(state.detail.source_refs)) refs.append(el('p',{text:'Source references are not available in this view.'}));
      const basis = state.detail.basis;
      if (basis && Number.isSafeInteger(basis.revision) && typeof basis.event_id === 'string') refs.append(el('p',{text:`Recorded basis: revision ${basis.revision} · Event ${basis.event_id}. External availability is unconfirmed; execution references describe historical observations.`}));
      for (const ref of (Array.isArray(state.detail.relation_refs)?state.detail.relation_refs:[])) {
        if (ref && typeof ref.kind === 'string' && typeof ref.id === 'string') refs.append(el('p',{text:`Related ${ref.kind}: ${ref.id}`}));
      }
      detail.append(refs);
    }else if(!state.selectedId)detail.append(el('div',{className:'attention-empty'},icon('file-text',{size:28}),el('h2',{text:'A little context, before the next step.'}),el('p',{text:'Choose an item to read its reason, recorded next step and sources.'})));
    if (onOpenAssistant) detail.append(button('Open Attention', onOpenAssistant, 'open-assistant'));
    columns.append(list,detail);root.append(columns);container.replaceChildren(root);
    if(focused)(container.querySelector(`[data-attention-focus="${CSS.escape(focused)}"]`)??container.querySelector('[data-attention-focus="project"]'))?.focus();
  }
  async function load(offset=0, selectedId=null){
    const own=++state.generation;state.detailGeneration++;state.selectedId=null;state.detail=null;state.detailError=null;state.detailLoading=false;
    state.data=null;state.error=null;state.loading=Boolean(state.projectId);render();
    if(!state.projectId)return;
    const projectId=state.projectId;
    const query={schema_version:1,kind:state.filter==='all'?'registry':'exact',limit:20,offset,...(state.filter==='all'?{}:{field:'status',value:state.filter})};
    try{const data=await request('/attention/query',{method:'POST',body:{projectId,query}});if(own!==state.generation)return;if(!toHomeAttention(data))throw new Error("Unsupported attention records.");state.data=data;}
    catch(error){if(own===state.generation)state.error=error.message;}
    finally{if(own===state.generation){state.loading=false;render();}}
    if(own===state.generation&&selectedId)void select(selectedId);
  }
  async function select(id){
    const own=++state.detailGeneration;const projectId=state.projectId;
    state.selectedId=id;state.detail=null;state.detailError=null;state.detailLoading=true;render();
    container.querySelector('[data-attention-focus="list-back"]')?.focus();
    try{const data=await request(`/attention/${encodeURIComponent(id)}?${new URLSearchParams({projectId})}`);if(!toHomeAttentionDetail(data)||data.attention_id!==id)throw new Error("Unsupported attention item.");if(own===state.detailGeneration&&projectId===state.projectId)state.detail=data;}
    catch(error){if(own===state.detailGeneration)state.detailError=error.message;}
    finally{if(own===state.detailGeneration){state.detailLoading=false;render();}}
  }
  return {
    open({projects,projectId,attentionId=null}){state.projects=projects;state.projectId=projects.find(p=>p.id===projectId)?.id??projects[0]?.id??null;state.filter='all';return load(0,attentionId);},
    deactivate(){state.generation++;state.detailGeneration++;},
  };
}
