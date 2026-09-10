import { el, action } from './ui-controls.mjs';
import {
  connectionLabel,
  connectionPathOfKind,
  verifyDetailLine,
  verifyFailureLine,
  verifySuccessLine,
} from './settings-view.mjs';
import { effortSelectable, projectProviderConfig, supportedEffortsOf } from './provider-config.mjs';

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
          /* PV-61 · `reasoningSource:"unknown"` 说的是"没人核过"，不是"这条目录
           * 说没有"——旧句子替目录说了它没说过的话。这里改成真话，并指去唯一
           * 能改这件事的地方（Connections 的 reasoning 复选框）。 */
          effortFixed.textContent = !selected
            ? 'Off.'
            : selected.reasoningSource === 'unknown'
              ? 'Not verified for this model. Turn it on for this model in Connections if the provider offers reasoning effort.'
              : 'Off. The catalogue for this connection reports no reasoning levels for this model.';
          effortControl.replaceChildren(effortFixed);
        }
        const sameProvider=selected?.provider===current.config.provider;
        /* PV-27 · 未报窗口就写 `unknown`，不写 `unavailable` 也不套用同名模型的目录值。
         * PV-60/项 7 · `origin:"connection"` 的一行追加一句：它不是已装目录原生的，
         * 是有人在这条连接上加的。目录原生行（`origin:"catalog"`）不追加。 */
        route.textContent=selected
          ? `${selected.provider} · ${sameProvider?current.config.api:selected.api}${sameProvider && current.config.baseUrl?' · custom endpoint':''}. Context window: ${Number.isSafeInteger(selected.contextWindow)?`${selected.contextWindow.toLocaleString()} tokens`:'unknown'}.${selected.origin==='connection'?' Added on this connection.':''}`
          : 'Select an installed model.';
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
          const group=el('optgroup',{attrs:{label:groupLabels.get(provider) || provider}});
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
      const customReasoning = el('input', { attrs: { type: 'checkbox' } });
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
        el('label', { className: 'model-picker-custom-reasoning' }, customReasoning, el('span', { text: 'Offers reasoning effort' })),
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
        });
        const already = connection.models.some((m) => m.id === id);
        const models_ = already
          ? connection.models.map(carry)
          : [...connection.models.map(carry), { id, ...(customReasoning.checked ? { reasoning: true } : {}) }];
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
          const configResult = await request('/provider-config', {
            method: 'PUT',
            body: projectProviderConfig(current.config, { provider: savedConnection.providerIdentity, model: id, api: savedConnection.api }, catalog),
          });
          if (own !== epoch) return;
          onSaved(configResult);
          current = { ...current, config: configResult.config, capability: configResult.capability };
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
      dialog.append(search,select,customToggle,customPanel,effortRow,route,capability,
        el('p',{className:'form-help',text:'Applies to all chats for future runs. Current runs keep their recorded configuration. Credentials and connection settings stay in Models.'}),save);
      renderOptions();renderSelection();search.focus();
    } catch(error) {if(own===epoch)status.textContent=error.message;}
  }};
}
