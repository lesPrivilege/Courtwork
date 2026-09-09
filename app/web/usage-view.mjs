import {el,action} from './ui-controls.mjs';
import {usageValue,modelSeries,quantileLevels,validUsageDetails} from './usage-projection.mjs';
const count=value=>value.toLocaleString();
export function createUsageView({request,getProjects,onOpenRun}) {
  const dialog=el('dialog',{className:'usage-dialog',attrs:{'aria-labelledby':'usage-title'}});document.body.append(dialog);
  let visible=false,opener,generation=0,detailGeneration=0,data=null,error='',loading=false,days=30,projectId='',view='overview',metric='total',drill=null;
  dialog.addEventListener('close',()=>{visible=false;generation++;detailGeneration++;if(opener?.isConnected)opener.focus();});
  async function load(clear=true){
    const own=++generation;detailGeneration++;loading=true;error='';drill=null;if(clear)data=null;render();
    try{const value=await request(`/work-usage-details?${new URLSearchParams({days,...(projectId?{projectId}:{})})}`);
      if(own!==generation)return;if(!validUsageDetails(value))throw new Error('Usage response is unavailable');data=value;
    }catch(e){if(own===generation)error=e.message;}finally{if(own===generation){loading=false;render();}}
  }
  async function inspect(filter,offset=0){
    if(!data)return;const snapshot=data,own=++detailGeneration;drill={filter,loading:true,error:'',result:null};render();
    try{const result=await request('/work-usage-runs',{method:'POST',body:{days,...(projectId?{projectId}:{}),snapshotId:snapshot.snapshotId,...filter,offset,limit:25}});
      if(own!==detailGeneration||snapshot!==data)return;
      if(result.schemaVersion!==1 || result.snapshotId!==snapshot.snapshotId || !Array.isArray(result.items))throw new Error('Usage run list is unavailable');
      drill={filter,loading:false,error:'',result};
    }catch(e){if(own===detailGeneration)drill={filter,loading:false,error:e.message,result:null};}
    if(own===detailGeneration){render();dialog.querySelector('.usage-drilldown')?.focus();}
  }
  function label(model){return model.identity?`${model.identity.provider} / ${model.identity.model} · ${model.identity.api}${model.identity.route==='custom'?` · route ${model.key.slice(0,6)}`:''}`:'Unknown configured model';}
  function button(text,fn,attrs={}){const node=el('button',{text,attrs:{type:'button',...attrs}});node.addEventListener('click',fn);return node;}
  function render(){
    if(!visible)return;
    const focus=document.activeElement?.dataset.usageFocus;
    const header=el('header',{className:'usage-header'},el('div',{},el('h2',{text:'Usage',attrs:{id:'usage-title'}}),el('p',{className:'form-help',text:'Retained runs · reported tokens'})),action('x','Close usage',()=>dialog.close()));
    const controls=el('div',{className:'usage-controls'});
    const scope=el('select',{attrs:{'aria-label':'Usage project','data-usage-focus':'project'}});
    scope.append(el('option',{text:'All retained work',attrs:{value:''}}),...getProjects().map(p=>el('option',{text:p.name,attrs:{value:p.id}})));scope.value=projectId;
    scope.addEventListener('change',()=>{projectId=scope.value;void load();});
    const period=el('select',{attrs:{'aria-label':'Usage period','data-usage-focus':'period'}});
    for(const day of [7,30,84,366])period.append(el('option',{text:`${day} days`,attrs:{value:day}}));period.value=String(days);period.addEventListener('change',()=>{days=Number(period.value);void load();});
    const metricSelect=el('select',{attrs:{'aria-label':'Usage metric','data-usage-focus':'metric'}});
    for(const [key,title]of [['total','Input + output'],['input','Input'],['output','Output']])metricSelect.append(el('option',{text:title,attrs:{value:key}}));metricSelect.value=metric;
    metricSelect.addEventListener('change',()=>{metric=metricSelect.value;render();});
    const refresh=button('Refresh',()=>load(false),{'data-usage-focus':'refresh'});refresh.disabled=loading;
    controls.append(scope,period,metricSelect,refresh);
    const tabs=el('div',{className:'usage-tabs',attrs:{role:'tablist','aria-label':'Usage view'}});
    for(const key of ['overview','models']){
      const tab=button(key==='overview'?'Overview':'Models',()=>{view=key;render();},{role:'tab','aria-selected':String(view===key),tabindex:view===key?'0':'-1','data-usage-focus':key,id:`usage-tab-${key}`,'aria-controls':'usage-panel'});
      tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();view=event.key==='Home'?'overview':event.key==='End'?'models':view==='overview'?'models':'overview';render();dialog.querySelector(`#usage-tab-${view}`).focus();}});tabs.append(tab);
    }
    const panel=el('section',{attrs:{id:'usage-panel',role:'tabpanel','aria-labelledby':`usage-tab-${view}`}});
    dialog.replaceChildren(header,controls,tabs,panel);
    if(loading)panel.append(el('p',{text:'Loading usage…',attrs:{role:'status'}}));
    if(error)panel.append(el('p',{text:error+(data?' Showing the last loaded observation.':''),attrs:{role:'alert'}}));
    if(data){
      panel.append(el('p',{className:'usage-total',text:`${data.missing?'≥ ':''}${count(usageValue(data,metric))} reported tokens`}),
        el('p',{className:'form-help',text:`${data.recordedRunCount} retained runs · ${data.reportedRunCount} complete, ${data.missingRunCount} incomplete · UTC start-day allocation`}));
      if(!data.recordedRunCount)panel.append(el('p',{text:'No retained runs in this period.'}));
      else if(view==='overview'){
        const values=data.buckets.map(day=>usageValue(day,metric)),scale=quantileLevels(values),grid=el('div',{className:'usage-heatmap',attrs:{'aria-label':'Daily reported tokens'}});
        const pad=new Date(data.buckets[0].date+'T00:00:00Z').getUTCDay();for(let i=0;i<pad;i++)grid.append(el('span'));
        data.buckets.forEach((day,i)=>{
          const tile=button('',()=>inspect({date:day.date}),{title:`${day.date} · ${values[i]} reported tokens${day.missingRunCount?' · incomplete':''}`,'aria-label':`${day.date}, ${values[i]} reported tokens, ${day.missingRunCount} incomplete runs`,'data-usage-focus':`day-${i}`,tabindex:i===0?'0':'-1'});
          tile.className=`usage-heat level-${scale.levels[i]}${day.missingRunCount?' is-incomplete':''}`;
          tile.addEventListener('keydown',e=>{const step={ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7}[e.key];if(step!==undefined||['Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?0:e.key==='End'?values.length-1:Math.min(values.length-1,Math.max(0,i+step));for(const n of grid.querySelectorAll('button'))n.tabIndex=-1;const next=grid.querySelector(`[data-usage-focus="day-${target}"]`);next.tabIndex=0;next.focus();}});grid.append(tile);
        });
        const exactDay = el('p',{className:'form-help',text:'Focus a day to inspect its exact recorded value.',attrs:{role:'status'}});
        grid.addEventListener('focusin',event=>{if(event.target.matches('button'))exactDay.textContent=event.target.getAttribute('aria-label');});
        panel.append(grid,exactDay,el('p',{className:'form-help',text:`Relative scale over positive reported days. Thresholds: ${scale.thresholds.length?scale.thresholds.join(' / '):'none'}. Dotted outline means incomplete accounting; zero is retained zero, not historical inactivity.`}));
      }else{
        const series=modelSeries(data,metric),max=Math.max(1,...data.buckets.map(day=>usageValue(day,metric))),chart=el('div',{className:'usage-stacked-chart',attrs:{'aria-label':'Daily model usage'}});
        data.buckets.forEach((day,i)=>{const col=el('div',{className:'usage-chart-day'}),bar=el('div',{className:'usage-stacked-bar'});
          series.forEach((item,j)=>{if(!item.values[i])return;const segment=button('',()=>inspect({date:day.date,modelKeys:item.modelKeys}),{'aria-label':`${day.date}, ${item.label}, ${count(item.values[i])} reported tokens`,title:`${day.date} · ${item.label} · ${count(item.values[i])}`});segment.className=`usage-series series-${j+1}`;segment.style.height=`${item.values[i]/max*100}%`;bar.append(segment);});
          col.append(bar,el('span',{text:i%7===0||i===data.buckets.length-1?day.date.slice(5):''}));chart.append(col);});
        const legend=el('div',{className:'usage-legend'});series.forEach((item,i)=>{const entry=button(item.label,()=>inspect({modelKeys:item.modelKeys}));entry.className=`usage-series-label series-${i+1}`;legend.append(entry);});
        panel.append(el('p',{className:'form-help',text:`Daily scale: 0–${count(max)} reported tokens`}),chart,legend,el('p',{className:'form-help',text:'Top four configured models plus Other, ranked over this interval. Model identity and Other membership stay fixed for this observation.'}));
      }
      const table=el('table',{className:'usage-table'}),thead=el('thead'),heading=el('tr');
      for(const title of ['Configured model at run start','Input','Output','Cache read','Cache write','Complete / runs'])heading.append(el('th',{text:title,attrs:{scope:'col'}}));thead.append(heading);const body=el('tbody');
      for(const model of [...data.models].sort((a,b)=>usageValue(b,metric)-usageValue(a,metric)||a.key.localeCompare(b.key))){const row=el('tr');row.append(el('th',{attrs:{scope:'row'}},button(label(model),()=>inspect({modelKeys:[model.key]}))));for(const key of ['input','output','cacheRead','cacheWrite'])row.append(el('td',{text:`${model.missingRunCount?'≥ ':''}${count(model.tokens[key])}`}));row.append(el('td',{text:`${model.reportedRunCount} / ${model.recordedRunCount}`}));body.append(row);}
      const daysDetail=el('details',{},el('summary',{text:'Exact daily values'}));
      const dayTable=el('table',{className:'usage-table'});
      const dayHead=el('tr');for(const title of ['UTC start day','Input','Output','Incomplete / runs'])dayHead.append(el('th',{text:title,attrs:{scope:'col'}}));
      dayTable.append(el('thead',{},dayHead));const dayBody=el('tbody');
      for(const day of data.buckets){const row=el('tr',{},el('th',{attrs:{scope:'row'}},button(day.date,()=>inspect({date:day.date}))));for(const key of ['input','output'])row.append(el('td',{text:`${day.missingRunCount?'≥ ':''}${count(day.tokens[key])}`}));row.append(el('td',{text:`${day.missingRunCount} / ${day.recordedRunCount}`}));dayBody.append(row);}
      dayTable.append(dayBody);daysDetail.append(el('div',{className:'usage-table-scroll'},dayTable));panel.append(daysDetail);
      table.append(el('caption',{text:'Exact model totals · reported counts'}),thead,body);panel.append(el('div',{className:'usage-table-scroll'},table));
      panel.append(el('p',{className:'form-help',text:`${data.interval.start.slice(0,10)} — ${new Date(Date.parse(data.interval.endExclusive)-1).toISOString().slice(0,10)} · historical coverage unknown; deleted chats remove records. Cache fields may overlap input. These are not billing records.`}));
    }
    if(drill){const detail=el('section',{className:'usage-drilldown',attrs:{tabindex:'-1','aria-label':'Matching usage runs'}});detail.append(el('h3',{text:'Matching runs'}));
      if(drill.loading)detail.append(el('p',{text:'Loading matching runs…'}));if(drill.error)detail.append(el('p',{text:drill.error,attrs:{role:'alert'}}));
      if(drill.result){detail.append(el('p',{text:`${drill.result.total} runs in this exact observation`}));for(const run of drill.result.items)detail.append(button(`${run.sessionTitle} · ${run.startedAt} · ${run.status} · ${count(run.usage.input+run.usage.output)} reported tokens`,()=>{dialog.close();onOpenRun(run.id,run.sessionId);}));
        if(drill.result.offset>0)detail.append(button('Previous',()=>inspect(drill.filter,Math.max(0,drill.result.offset-25))));if(drill.result.nextOffset!==null)detail.append(button('Next',()=>inspect(drill.filter,drill.result.nextOffset)));}
      panel.append(detail);
    }
    if(focus)dialog.querySelector(`[data-usage-focus="${CSS.escape(focus)}"]`)?.focus();
  }
  return {open(){if(visible)return;opener=document.activeElement;visible=true;dialog.showModal();render();void load();}};
}
