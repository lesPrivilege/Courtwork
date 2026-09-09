import { el, action } from './ui-controls.mjs';
import { effortSelectable, projectProviderConfig, supportedEffortsOf } from './settings-view.mjs';

// Shared native modal. It saves the existing host provider configuration;
// choosing a model never performs generation or discovers credentials.
export function createModelPicker({ request, onSaved }) {
  const dialog = el('dialog', { className:'model-picker-dialog', attrs:{'aria-labelledby':'model-picker-title'} });
  document.body.append(dialog);
  let epoch = 0, opener;
  dialog.addEventListener('close', () => { epoch++; if (opener?.isConnected) opener.focus(); });
  return { async open() {
    if (dialog.open) return;
    let busy = false, matchesCurrent = true;
    const own = ++epoch; opener = document.activeElement;
    const close = action('x', 'Close model picker', () => dialog.close());
    const header = el('header', {className:'model-picker-header'}, el('h2',{text:'Model & effort',attrs:{id:'model-picker-title'}}), close);
    const status = el('p', {className:'form-help',text:'Loading installed models…',attrs:{role:'status'}});
    dialog.replaceChildren(header,status); dialog.showModal(); close.focus();
    try {
      const [catalog, current] = await Promise.all([request('/provider-models'),request('/provider-config')]);
      if (own !== epoch) return;
      if (!Array.isArray(catalog.models)) throw new Error('Model catalog unavailable');
      const models = catalog.models;
      let selected = models.find(m=>m.provider===current.config.provider && m.id===current.config.model);
      let effort = current.config.reasoningEffort ?? selected?.defaultEffort ?? 'off';
      const search = el('input',{attrs:{type:'search','aria-label':'Find installed model',placeholder:'Find a model…'}});
      const select = el('select',{attrs:{'aria-label':'Installed model',size:'7'}});
      const effortSelect = el('select',{attrs:{'aria-label':'Reasoning effort'}});
      /* PV-27 · 目录没声明档位时不出选择器：一个只有 `Off` 一项的下拉是在暗示
       * 别处还有别的档位可选。那里只出一行字，说明这条目录报的就是没有。 */
      const effortFixed = el('span',{className:'form-help'});
      const effortControl = el('div',{className:'model-picker-effort'});
      const effortRow = el('label',{},el('span',{text:'Reasoning effort'}),effortControl);
      const route = el('p',{className:'form-help'});
      const capability = el('p',{className:'form-help'});
      const save = el('button',{text:'Use for next runs',className:'primary-button',attrs:{type:'button'}});
      const renderSelection = () => {
        const declared = selected ? supportedEffortsOf(catalog, selected.provider, selected.id) : null;
        const supported = declared || selected?.supportedEfforts || ['off'];
        if (!supported.includes(effort)) effort = selected?.defaultEffort ?? supported[0];
        if (effortSelectable(supported)) {
          effortSelect.replaceChildren(...supported.map(level=>el('option',{text:level==='off'?'Off':level,attrs:{value:level}})));
          effortSelect.value=effort; effortSelect.disabled=busy;
          effortControl.replaceChildren(effortSelect);
        } else {
          effortFixed.textContent = selected
            ? 'Off. The catalogue for this connection reports no reasoning levels for this model.'
            : 'Off.';
          effortControl.replaceChildren(effortFixed);
        }
        const sameProvider=selected?.provider===current.config.provider;
        /* PV-27 · 未报窗口就写 `unknown`，不写 `unavailable` 也不套用同名模型的目录值。 */
        route.textContent=selected ? `${selected.provider} · ${sameProvider?current.config.api:selected.api}${sameProvider && current.config.baseUrl?' · custom endpoint':''}. Context window: ${Number.isSafeInteger(selected.contextWindow)?`${selected.contextWindow.toLocaleString()} tokens`:'unknown'}.` : 'Select an installed model.';
        /* 后端为**已生效**的那条配置给出的能力原话，逐字呈现，不改写（PV-30）。 */
        const isInForce = selected && selected.provider===current.config.provider && selected.id===current.config.model;
        const notice = isInForce ? current.capability?.notice : null;
        const source = isInForce && current.capability?.contextWindowSource === 'user'
          ? 'The context window above came from your entry on this connection.' : '';
        capability.textContent = notice || source || '';
        capability.hidden = !capability.textContent;
        save.disabled=busy || !selected || !matchesCurrent;
      };
      const renderOptions = () => {
        const q=search.value.trim().toLowerCase();
        const filtered=models.filter(m=>`${m.provider} ${m.name} ${m.id}`.toLowerCase().includes(q));
        select.replaceChildren();
        for(const provider of [...new Set(filtered.map(m=>m.provider))]) {
          const group=el('optgroup',{attrs:{label:provider}});
          for(const model of filtered.filter(m=>m.provider===provider)) group.append(el('option',{text:model.name || model.id,attrs:{value:String(models.indexOf(model))}}));
          select.append(group);
        }
        select.value=selected ? String(models.indexOf(selected)) : '';
        matchesCurrent=filtered.includes(selected);
        save.disabled=busy || !selected || !matchesCurrent;
        status.textContent=filtered.length ? '' : 'No installed model matches.';
      };
      search.addEventListener('input',renderOptions);
      select.addEventListener('change',()=>{selected=select.value===''?null:models[Number(select.value)];matchesCurrent=!!selected;renderSelection();});
      effortSelect.addEventListener('change',()=>{effort=effortSelect.value;});
      save.addEventListener('click',async()=>{
        if(busy || !selected || !matchesCurrent) return;
        busy=true; save.disabled=true; select.disabled=true; effortSelect.disabled=true; status.textContent='Saving…';
        const sameProvider=selected.provider===current.config.provider;
        /* PV-M-1 · 这里不再自己拼请求体。本处只说明改了什么（身份、模型、格式、档位），
         * 端点等未提及的字段由投影从同一份快照带过去，于是选一次模型不会清掉别处存的
         * 字段，正如保存连接不再清掉这里选的档位。 */
        const config=projectProviderConfig(current.config,
          {provider:selected.provider,model:selected.id,api:sameProvider?current.config.api:selected.api,reasoningEffort:effort},
          catalog);
        try {
          const result=await request('/provider-config',{method:'PUT',body:config});
          onSaved(result);
          if(own===epoch) dialog.close();
        } catch(error) {if(own===epoch) status.textContent=error.message;}
        finally {busy=false; if(own===epoch){select.disabled=false;renderSelection();}}
      });
      dialog.append(search,select,effortRow,route,capability,
        el('p',{className:'form-help',text:'Applies to all chats for future runs. Current runs keep their recorded configuration. Credentials and connection settings stay in Models.'}),save);
      renderOptions();renderSelection();search.focus();
    } catch(error) {if(own===epoch)status.textContent=error.message;}
  }};
}
