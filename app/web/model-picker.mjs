import { el, action } from './ui-controls.mjs';
import {
  connectionLabel,
  connectionPathOfKind,
  verifyDetailLine,
  verifyFailureLine,
  verifySuccessLine,
} from './settings-view.mjs';
import { effortSelectable, projectProviderConfig, reasoningCapabilityOf } from './provider-config.mjs';

// Shared native modal. It saves the existing host provider configuration;
// choosing a model never performs generation or discovers credentials.
export function createModelPicker({ request, onSaved }) {
  const dialog = el('dialog', { className:'model-picker-dialog', attrs:{id:'model-picker-dialog','aria-labelledby':'model-picker-title'} });
  document.body.append(dialog);
  let epoch = 0, opener;
  dialog.addEventListener('close', () => { epoch++; if (opener?.isConnected) opener.focus(); });
  return { async open() {
    if (dialog.open) return;
    let busy = false, matchesCurrent = true, conflict = false, versionAligned = true, selectionCanSave = false;
    const own = ++epoch; opener = document.activeElement;
    const close = action('x', 'Close model picker', () => dialog.close());
    const header = el('header', {className:'model-picker-header'}, el('h2',{text:'Model & effort',attrs:{id:'model-picker-title'}}), close);
    const status = el('p', {className:'form-help',text:'Loading installed models…',attrs:{role:'status'}});
    dialog.replaceChildren(header,status); dialog.showModal(); close.focus();
    try {
      /* PV-53 · 分组标签多取一次连接注册表。用户连接在目录里的身份就是它的
       * `conn-<hex>` id，那串东西对用户没有意义；它的名字用它自己填过的端点
       * 主机名（与 Connections 列同一处 `connectionLabel`）。取不到注册表时
       * 这份表为空，标签退回原始 id —— 不猜，也不在前端造一个显示名。 */
      let [catalog, current, connections] = await Promise.all([
        request('/provider-models'),
        request('/provider-config'),
        request('/provider-connections').then(r=>r.connections||[]).catch(()=>[]),
      ]);
      if (own !== epoch) return;
      if (!Array.isArray(catalog.models)) throw new Error('Model catalog unavailable');
      let models = catalog.models;
      const groupLabels = new Map(connections.filter(c=>c.kind==='compatible').map(c=>[c.providerIdentity,connectionLabel(c)]));
      let selected = models.find(m=>m.provider===current.config.provider && m.id===current.config.model);
      let effort = selected ? current.config.reasoningEffort : undefined;
      versionAligned = Number.isSafeInteger(current.version) && current.version===catalog.version;
      const search = el('input',{attrs:{type:'search','aria-label':'Find installed model',placeholder:'Find a model…'}});
      const select = el('select',{attrs:{'aria-label':'Installed model',size:'7'}});
      const effortSelect = el('select',{attrs:{'aria-label':'Reasoning effort'}});
      const effortFixed = el('span',{className:'form-help'});
      const effortControl = el('div',{className:'model-picker-effort'});
      const effortRow = el('label',{},el('span',{text:'Reasoning effort'}),effortControl);
      const currentName=el('h3',{text:current.config.model||'Not selected'});
      const currentMeta=el('p',{className:'form-help'});
      const currentSummary = el('section',{className:'model-picker-current',attrs:{'aria-label':'Current model'}},
        el('p',{className:'eyebrow',text:'Current model'}),currentName,currentMeta);
      const renderCurrentSummary=()=>{
        currentName.textContent=current.config.model||'Not selected';
        currentMeta.textContent=`${current.config.provider} · ${current.config.api} · ${current.config.reasoningEffort??'Provider default'}`;
      };
      const proposedSummary=el('p',{className:'model-picker-proposed',attrs:{role:'status'}});
      const changeModel=el('details',{className:'model-picker-change-model'});
      changeModel.append(el('summary',{text:'Change model'}));
      const modelList=el('div',{className:'model-picker-model-list'});
      const route = el('p',{className:'form-help'});
      const capability = el('p',{className:'form-help'});
      const refresh=action('refresh-cw','Refresh current settings',async()=>{
        if(busy)return;
        status.textContent='Refreshing saved settings…';refresh.disabled=true;
        try{
          const [freshConfig,freshCatalog,freshConnections]=await Promise.all([request('/provider-config'),request('/provider-models'),request('/provider-connections').then(r=>r.connections||[]).catch(()=>[])]);
          if(!Number.isSafeInteger(freshConfig.version)||freshConfig.version!==freshCatalog.version)throw new Error('Settings changed again while refreshing. Review after another refresh.');
          const draftIdentity=selected&&{provider:selected.provider,id:selected.id};
          current=freshConfig;catalog=freshCatalog;models=catalog.models;connections=freshConnections;groupLabels.clear();
          for(const c of connections.filter(c=>c.kind==='compatible'))groupLabels.set(c.providerIdentity,connectionLabel(c));
          selected=draftIdentity?models.find(model=>model.provider===draftIdentity.provider&&model.id===draftIdentity.id)||null:null;
          versionAligned=true;conflict=false;onSaved(current);
          renderCurrentSummary();renderOptions();renderSelection();
          status.textContent='Saved settings refreshed. Your selection remains a draft; review before saving.';
        }catch(error){status.textContent=error.message;}
        finally{refresh.disabled=false;}
      },{visible:true,className:'text-button',attrs:{'data-testid':'refresh-model-config'}});
      refresh.hidden=true;
      const save = el('button',{text:'Use for next runs',className:'primary-button',attrs:{type:'button'}});
      const defaultValue='__provider_default__';
      const canSaveNow = () => !busy && Boolean(selected) && matchesCurrent && versionAligned && !conflict && selectionCanSave;
      const apiForSelection = () => selected && selected.provider === current.config.provider
        ? current.config.api : selected?.api;
      const renderSelection = () => {
        const isInForce = selected && selected.provider===current.config.provider && selected.id===current.config.model;
        const catalogCapability = selected ? reasoningCapabilityOf(catalog, selected.provider, selected.id, apiForSelection()) : null;
        const selectedBaseUrl = selected?.baseUrl || '';
        const currentBaseUrl = selected?.provider === current.config.provider ? current.config.baseUrl || '' : '';
        const endpointOverride = Boolean(currentBaseUrl) && currentBaseUrl.replace(/\/+$/, '') !== selectedBaseUrl.replace(/\/+$/, '');
        const reasoning = selected && selected.provider === current.config.provider && endpointOverride
          ? { kind:'unknown', source:'unknown', values:[], notice:'A custom endpoint has no verified reasoning ladder. Provider default will be used.' }
          : catalogCapability;
        const supported = reasoning?.kind === 'enum' ? reasoning.values : [];
        const savedEffortIsInvalid = isInForce && current.config.reasoningEffort != null && !supported.includes(current.config.reasoningEffort);
        if (effortSelectable(supported) || savedEffortIsInvalid) {
          const options = [el('option',{text:'Provider default',attrs:{value:defaultValue}}), ...supported.map(level=>el('option',{text:level==='off'?'Off':level,attrs:{value:level}}))];
          if (savedEffortIsInvalid) options.push(el('option',{text:`Unavailable saved value: ${current.config.reasoningEffort}`,attrs:{value:`__invalid_${current.config.reasoningEffort}`} }));
          effortSelect.replaceChildren(...options);
          const selectedEffort = effort === undefined || effort === null ? defaultValue : effort;
          effortSelect.value = savedEffortIsInvalid && effort === current.config.reasoningEffort ? `__invalid_${effort}` : selectedEffort;
          if (effortSelect.value === '') effortSelect.value = defaultValue;
          effortSelect.disabled=busy;
          effortControl.replaceChildren(effortSelect);
        } else {
          if (!savedEffortIsInvalid) effort = undefined;
          effortFixed.textContent = !selected ? 'Provider default.'
            : reasoning?.kind === 'unsupported' ? 'This model does not support selectable reasoning effort. Provider default will be used.'
              : 'Reasoning effort is not verified for this model. Provider default will be used.';
          effortControl.replaceChildren(effortFixed);
        }
        const sameProvider=selected?.provider===current.config.provider;
        proposedSummary.textContent = selected
          ? `Next runs: ${selected.name || selected.id} · ${selected.provider} · ${effort == null || effort === defaultValue ? 'Provider default' : effort}.`
          : 'Choose a model to draft a change.';
        /* PV-27 · 未报窗口就写 `unknown`，不写 `unavailable` 也不套用同名模型的目录值。
         * PV-60/项 7 · `origin:"connection"` 的一行追加一句：它不是已装目录原生的，
         * 是有人在这条连接上加的。目录原生行（`origin:"catalog"`）不追加。 */
        route.textContent=selected
          ? `${selected.provider} · ${sameProvider?current.config.api:selected.api}${sameProvider && current.config.baseUrl?' · custom endpoint':''}. Context window: ${Number.isSafeInteger(selected.contextWindow)?`${selected.contextWindow.toLocaleString()} tokens`:'unknown'}.${selected.origin==='connection'?' Added on this connection.':''}`
          : 'Select an installed model.';
        /* State the exact evidence source of this capability. A list without its
         * provenance would make a user declaration look like a catalog fact. */
        const sourceLabel = reasoning?.source === 'runtime-catalog' ? 'runtime catalog'
          : reasoning?.source === 'user-declared' ? 'your connection declaration'
            : 'not verified';
        const effortEvidence = reasoning?.kind === 'enum'
          ? `Supported values (${sourceLabel}): ${supported.join(', ')}.`
          : reasoning?.kind === 'unsupported'
            ? 'This model does not support selectable reasoning effort; provider default will be used.'
            : selected ? 'Reasoning effort is not verified for this model; provider default will be used.' : '';
        const notice = [...new Set([isInForce ? current.reasoningCapability?.notice : null, reasoning?.notice, effortEvidence].filter(Boolean))].join(' ');
        const source = isInForce && current.capability?.contextWindowSource === 'user'
          ? 'The context window above came from your entry on this connection.' : '';
        capability.textContent = [notice, source].filter(Boolean).join(' ');
        capability.hidden = !capability.textContent;
        const invalidDraft = effort != null && effort !== defaultValue && !supported.includes(effort);
        selectionCanSave = !invalidDraft;
        save.disabled=!canSaveNow();
        refresh.hidden=versionAligned && !conflict;
      };
      const renderOptions = () => {
        const q=search.value.trim().toLowerCase();
        const filtered=models.filter(m=>`${m.provider} ${m.name} ${m.id}`.toLowerCase().includes(q));
        select.replaceChildren();
        for(const provider of [...new Set(filtered.map(m=>m.provider))]) {
          const group=el('optgroup',{attrs:{label:groupLabels.get(provider) || provider}});
          for(const model of filtered.filter(m=>m.provider===provider)) group.append(el('option',{text:model.name || model.id,attrs:{value:String(models.indexOf(model))}}));
          select.append(group);
        }
        select.value=selected ? String(models.indexOf(selected)) : '';
        matchesCurrent=filtered.includes(selected);
        save.disabled=!canSaveNow();
        refresh.hidden=versionAligned && !conflict;
        status.textContent=!versionAligned || conflict
          ? 'Saved settings changed. Refresh and review before saving.'
          : filtered.length ? '' : 'No installed model matches.';
      };
      search.addEventListener('input',renderOptions);
      select.addEventListener('change',()=>{selected=select.value===''?null:models[Number(select.value)];effort=undefined;matchesCurrent=!!selected;renderSelection();});
      effortSelect.addEventListener('change',()=>{effort=effortSelect.value===defaultValue?undefined:effortSelect.value;renderSelection();});
      save.addEventListener('click',async()=>{
        if(!canSaveNow()) return;
        busy=true; save.disabled=true; select.disabled=true; effortSelect.disabled=true; status.textContent='Saving…';
        const sameProvider=selected.provider===current.config.provider;
        /* PV-M-1 · 这里不再自己拼请求体。本处只说明改了什么（身份、模型、格式、档位），
         * 端点等未提及的字段由投影从同一份快照带过去，于是选一次模型不会清掉别处存的
         * 字段，正如保存连接不再清掉这里选的档位。 */
        const config=projectProviderConfig(current.config,
          {provider:selected.provider,model:selected.id,api:sameProvider?current.config.api:selected.api,reasoningEffort:effort},
          catalog);
        try {
          if (!versionAligned) throw new Error('Saved settings changed. Refresh and review before saving.');
          const result=await request('/provider-config',{method:'PUT',body:{...config,expectedVersion:current.version}});
          onSaved(result);
          if(own===epoch) dialog.close();
        } catch(error) {if(own===epoch){status.textContent=error.message;if(error.status===409||error.code==='config_conflict'){conflict=true;versionAligned=false;refresh.hidden=false;save.disabled=true;}}}
        finally {busy=false; if(own===epoch){select.disabled=false;renderSelection();}}
      });
      /* PV-59/63 · "键入一个未列出的模型 ID" 入口。列表底部固定一项，不随搜索
       * 过滤消失（它是 `select` 的兄弟节点，不是它的子节点）。展开后一次动作把
       * 一个新 id 保存到某条连接、选为生效、并（主动作）问它一次——PV-63 的
       * "无感"：用户只填这条连接与凭据里没有人替他知道的三样，其余步骤自动做。 */
      const customToggle = el('button', {
        className: 'text-button model-picker-custom-toggle',
        attrs: { type: 'button' },
        text: 'Use a model ID that is not listed…',
      });
      const customInput = el('input', {
        attrs: { type: 'text', 'aria-label': 'Model ID', placeholder: '', autocomplete: 'off' },
      });
      const customConnectionSelect = el('select', { attrs: { 'aria-label': 'Connection' } });
      /* PV-61 · 加进来的模型本身没有既往声明，只有此刻这一次勾选：不勾 = 未声明
       * （`null`，缺省），勾 = declared true。没有"碰过又取消"这个中间态可谈——
       * 这条模型此刻才第一次存在于这条连接上。 */
      const customReasoning = el('input', { attrs: { type: 'text', 'aria-label':'Supported reasoning efforts', placeholder:'off, low, medium, high' } });
      const customStatus = el('p', {
        className: 'connection-probe-result',
        attrs: { role: 'status', hidden: true },
      });
      const customDetail = el('p', { className: 'form-help', attrs: { hidden: true } });
      const customUseAsk = el('button', {
        className: 'primary-button',
        attrs: { type: 'button' },
        text: 'Use and ask once',
      });
      const customUseAskHelp = el('p', {
        className: 'form-help',
        text: 'Saves the ID on that connection, uses it for next runs, and sends one short prompt to the model (one request).',
      });
      const customUseOnly = el('button', {
        className: 'text-button',
        attrs: { type: 'button' },
        text: 'Use without asking',
      });
      const customPanel = el(
        'div',
        { className: 'model-picker-custom', attrs: { hidden: true } },
        el('label', {}, el('span', { text: 'Model ID' }), customInput),
        el('label', {}, el('span', { text: 'Connection' }), customConnectionSelect),
        el('label', { className: 'model-picker-custom-reasoning' }, el('span', { text: 'Supported reasoning efforts (optional)' }), customReasoning),
        customStatus,
        customDetail,
        customUseAsk,
        customUseAskHelp,
        customUseOnly,
      );
      /* 只列 `credentialStatus:"configured"` 的连接与本地连接（不需要 key 的那条）：
       * 键入一个 id 之后马上就要用它跑一次，没有凭据的连接今天连 Run 都发不出去。 */
      const customEligible = connections.filter(
        (c) => c.credentialStatus === 'configured' || connectionPathOfKind(c) === 'local',
      );
      for (const c of customEligible)
        customConnectionSelect.append(el('option', { attrs: { value: c.id }, text: connectionLabel(c) }));
      const effectiveEligible = customEligible.find((c) => c.providerIdentity === current.config.provider);
      customConnectionSelect.value = effectiveEligible ? effectiveEligible.id : customEligible[0]?.id || '';
      customToggle.addEventListener('click', () => {
        customPanel.hidden = !customPanel.hidden;
        if (!customPanel.hidden) customInput.focus();
      });
      let customBusy = false;
      function customFail(message) {
        customBusy = false;
        customUseAsk.disabled = customUseOnly.disabled = false;
        customStatus.hidden = false;
        customStatus.classList.add('is-failed');
        customStatus.textContent = message;
      }
      /* 执行序（PV-59）：`PUT /provider-connections/:id`（models ∪ 新 id，其余条目
       * 原样）→ `PUT /provider-config`（经 `projectProviderConfig`）→（主动作）
       * `POST …/verify`。三步任一失败就停在该步；已成功的步不回滚——保存了就是
       * 保存了，`customStatus` 的文字说明进行到哪一步。成功后对话框不自动关闭
       * （PV-40）：回执要能回头读，关闭按钮照旧。 */
      async function submitCustomModel(askOnce) {
        const id = customInput.value.trim();
        if (!id || customBusy) return;
        const connection = customEligible.find((c) => c.id === customConnectionSelect.value);
        if (!connection) { customFail('Choose a connection first.'); return; }
        customBusy = true;
        customUseAsk.disabled = customUseOnly.disabled = true;
        customStatus.hidden = false;
        customStatus.classList.remove('is-failed');
        customStatus.textContent = 'Saving the model ID…';
        customDetail.hidden = true;
        const carry = (entry) => ({
          id: entry.id,
          ...(Number.isSafeInteger(entry.contextWindow) ? { contextWindow: entry.contextWindow } : {}),
          ...(entry.reasoning !== null && entry.reasoning !== undefined ? { reasoning: entry.reasoning } : {}),
          ...(Array.isArray(entry.reasoningEfforts) ? { reasoningEfforts: entry.reasoningEfforts } : {}),
        });
        const already = connection.models.some((m) => m.id === id);
        let declaredEfforts;
        try {
          const values=customReasoning.value.split(',').map(value=>value.trim()).filter(Boolean);
          const allowed=new Set(['off','minimal','low','medium','high','xhigh','max']);
          if(values.some(value=>!allowed.has(value)) || new Set(values).size!==values.length) throw new Error('Use unique exact effort values separated by commas.');
          declaredEfforts=values.length ? values : null;
        } catch(error) { customFail(error.message); return; }
        const models_ = already
          ? connection.models.map((entry) => entry.id === id
            ? { ...carry(entry), reasoningEfforts: declaredEfforts }
            : carry(entry))
          : [...connection.models.map(carry), { id, reasoningEfforts: declaredEfforts }];
        const body = connection.kind === 'catalog'
          ? { models: models_ }
          : { api: connection.api, baseUrl: connection.baseUrl, models: models_ };
        let savedConnection;
        try {
          const saved = await request(`/provider-connections/${encodeURIComponent(connection.id)}`, { method: 'PUT', body });
          if (own !== epoch) return;
          savedConnection = saved.connection;
        } catch (error) {
          if (own === epoch) customFail(error.message || 'Could not save this model ID on the connection.');
          return;
        }
        customStatus.textContent = 'Selecting it for next runs…';
        try {
          const [freshConfig, freshCatalog] = await Promise.all([request('/provider-config'), request('/provider-models')]);
          if (!Number.isSafeInteger(freshConfig.version) || !Number.isSafeInteger(freshCatalog.version) || freshConfig.version !== freshCatalog.version)
            throw new Error('Provider settings changed while saving the connection. Refresh and review before selecting the model.');
          const sameSaved = ['provider','model','api','baseUrl','reasoningEffort'].every((key) => (current.config?.[key] ?? null) === (freshConfig.config?.[key] ?? null));
          if (!sameSaved) {
            current=freshConfig; catalog=freshCatalog; models=catalog.models; versionAligned=true; conflict=true;
            renderOptions(); renderSelection();
            throw new Error('The connection was saved, but model settings changed elsewhere. Review the current selection before saving again.');
          }
          current=freshConfig; catalog=freshCatalog; models=catalog.models; versionAligned=true;
          const configResult = await request('/provider-config', {
            method: 'PUT',
            body: { ...projectProviderConfig(current.config, { provider: savedConnection.providerIdentity, model: id, api: savedConnection.api }, catalog), expectedVersion: current.version },
          });
          if (own !== epoch) return;
          onSaved(configResult);
          current = configResult;
          renderCurrentSummary();
        } catch (error) {
          if (own === epoch) customFail(`Saved on the connection, but could not select it for next runs. ${error.message || ''}`.trim());
          return;
        }
        // 这条模型此刻才进入已安装目录；重取一次，下面的 "Use for next runs" 区
        // 与搜索列表才核得出它的档位与呈现，而不是继续按旧快照说它不存在。
        try {
          catalog = await request('/provider-models');
          if (own !== epoch) return;
          models = catalog.models;
          selected = models.find((m) => m.provider === savedConnection.providerIdentity && m.id === id) || selected;
          matchesCurrent = true;
          renderOptions();
          renderSelection();
        } catch { /* 呈现层的刷新失败不撤销已经成功的两步 */ }
        if (!askOnce) {
          customBusy = false;
          customUseAsk.disabled = customUseOnly.disabled = false;
          customStatus.classList.remove('is-failed');
          customStatus.textContent = 'Saved and selected. It will be used for the next run.';
          return;
        }
        customStatus.textContent = 'Asking the model…';
        try {
          const receipt = await request(`/provider-connections/${encodeURIComponent(savedConnection.id)}/verify`, {
            method: 'POST',
            body: { model: id },
          });
          if (own !== epoch) return;
          customBusy = false;
          customUseAsk.disabled = customUseOnly.disabled = false;
          if (receipt.status === 'ok') {
            customStatus.classList.remove('is-failed');
            customStatus.textContent = verifySuccessLine(receipt);
            customDetail.hidden = false;
            customDetail.textContent = verifyDetailLine(receipt, connectionLabel(savedConnection));
          } else {
            customStatus.classList.add('is-failed');
            customStatus.textContent = verifyFailureLine(receipt);
            customDetail.hidden = true;
          }
        } catch (error) {
          if (own === epoch) customFail(`Saved and selected, but the check could not run. ${error.message || ''}`.trim());
        }
      }
      customUseAsk.addEventListener('click', () => void submitCustomModel(true));
      customUseOnly.addEventListener('click', () => void submitCustomModel(false));
      dialog.append(currentSummary,proposedSummary,changeModel);
      changeModel.append(search,modelList,customToggle,customPanel);
      modelList.append(select);
      dialog.append(effortRow,route,capability,refresh,
        el('p',{className:'form-help',text:'Applies to all chats for future runs. Current runs keep their recorded configuration. Credentials and connection settings stay in Models.'}),save);
      renderCurrentSummary();renderOptions();renderSelection();search.focus();
    } catch(error) {if(own===epoch)status.textContent=error.message;}
  }};
}
