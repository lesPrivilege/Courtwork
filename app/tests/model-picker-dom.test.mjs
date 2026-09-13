import assert from 'node:assert/strict';
import { test } from 'node:test';

class Node {
  constructor(tag) { this.tagName=tag.toUpperCase(); this.children=[]; this.attributes={}; this.listeners={}; this.className=''; this.dataset={}; this.value=''; this.hidden=false; this.disabled=false; this.open=false; this.isConnected=false; this.classList={toggle:(name,on)=>{const names=new Set(this.className.split(/\s+/).filter(Boolean));on?names.add(name):names.delete(name);this.className=[...names].join(' ');},add:name=>this.classList.toggle(name,true),remove:name=>this.classList.toggle(name,false)}; }
  set textContent(value) { this._text=String(value); this.children=[]; }
  get textContent() { return (this._text||'')+this.children.map(child=>child.textContent||'').join(''); }
  setAttribute(key,value) { this.attributes[key]=String(value); }
  removeAttribute(key) { delete this.attributes[key]; }
  append(...nodes) { for(const node of nodes){ if(!node)continue; node.parentNode=this; this.children.push(node); node.markConnected?.(this.isConnected); } }
  replaceChildren(...nodes) { this.children=[]; this._text=''; this.append(...nodes); }
  addEventListener(name,fn) { (this.listeners[name]??=[]).push(fn); }
  async dispatch(name) { for(const fn of this.listeners[name]||[]) await fn({type:name,currentTarget:this,target:this}); }
  focus() { globalThis.document.activeElement=this; }
  showModal() { this.open=true; }
  close() { this.open=false; void this.dispatch('close'); }
  markConnected(value) { this.isConnected=value; for(const child of this.children)child.markConnected?.(value); }
  walk() { return [this,...this.children.flatMap(child=>child.walk?.()||[])]; }
}
class TestDocument {
  constructor(){this.body=new Node('body');this.body.markConnected(true);this.activeElement=new Node('button');this.activeElement.markConnected(true);}
  createElement(tag){return new Node(tag);}
  createTextNode(text){const node=new Node('#text');node.textContent=text;return node;}
  createElementNS(_ns,tag){return new Node(tag);}
}

test('search rerender and direct click cannot re-enable/save a stale unsupported effort', async () => {
  globalThis.document=new TestDocument();
  const {createModelPicker}=await import('../web/model-picker.mjs');
  const calls=[];
  const model={provider:'openai',id:'gpt-4.1-mini',name:'GPT 4.1 mini',api:'openai-completions',baseUrl:'https://api.openai.com/v1',reasoningCapability:{kind:'enum',source:'runtime-catalog',values:['high'],notice:''},reasoningByApi:{'openai-completions':{kind:'enum',source:'runtime-catalog',values:['high']}}};
  const request=async(path,options={})=>{
    calls.push({path,options});
    if(path==='/provider-models')return {version:4,models:[model]};
    if(path==='/provider-config')return {version:4,config:{provider:'openai',model:model.id,api:model.api,reasoningEffort:'low'},reasoningCapability:{kind:'enum',source:'runtime-catalog',values:['high'],notice:''}};
    if(path==='/provider-connections')return {connections:[]};
    throw new Error(`unexpected request ${path}`);
  };
  const picker=createModelPicker({request,onSaved:()=>{}});
  await picker.open();
  const nodes=document.body.walk();
  const search=nodes.find(node=>node.attributes['aria-label']==='Find installed model');
  const save=nodes.find(node=>node.tagName==='BUTTON'&&node.textContent==='Set default');
  assert.ok(search);assert.ok(save);assert.equal(save.disabled,true);
  const effort=nodes.find(node=>node.attributes['aria-label']==='Reasoning effort');
  assert.ok(effort.children.some(option=>option.textContent==='Unavailable saved value: low'),'an invalid saved effort remains visible');
  search.value='gpt';await search.dispatch('input');
  assert.equal(save.disabled,true,'search only changes the list; it cannot clear the invalid saved value');
  await save.dispatch('click');
  assert.equal(calls.filter(call=>call.path==='/provider-config'&&call.options.method==='PUT').length,0,'the click guard refuses an invalid effort even if invoked directly');
});

test('model dialog keeps saved and draft identity visible while connection and capability provenance stay in collapsed details', async () => {
  globalThis.document=new TestDocument();
  const {createModelPicker}=await import('../web/model-picker.mjs');
  const saved={provider:'openai',id:'gpt-4.1-mini',name:'GPT 4.1 mini',api:'openai-completions',baseUrl:'https://api.openai.com/v1',contextWindow:1000000,reasoningCapability:{kind:'enum',source:'runtime-catalog',values:['low','high'],notice:''}};
  const unknown={provider:'anthropic',id:'claude-unknown',name:'Claude Unknown',api:'anthropic-messages',contextWindow:null,origin:'catalog',reasoningCapability:{kind:'unknown',source:'unknown',values:[],notice:''}};
  const unsupported={provider:'local-test',id:'fixed-model',name:'Fixed Model',api:'openai-completions',contextWindow:100000,origin:'catalog',reasoningCapability:{kind:'unsupported',source:'runtime-catalog',values:[],notice:''}};
  const requests=[];
  const request=async(path,options={})=>{
    requests.push({path,options});
    if(path==='/provider-models')return {version:4,models:[saved,unknown,unsupported]};
    if(path==='/provider-config')return {version:4,config:{provider:'openai',model:saved.id,api:saved.api,reasoningEffort:'low'}};
    if(path==='/provider-connections')return {connections:[{id:'conn-openai',kind:'compatible',providerIdentity:'openai',baseUrl:saved.baseUrl,api:saved.api,credentialStatus:'configured',models:[]}]};
    throw new Error('unexpected request '+path);
  };
  const picker=createModelPicker({request,onSaved:()=>{}});
  await picker.open();
  const nodes=document.body.walk();
  const dialog=nodes.find(node=>node.tagName==='DIALOG');
  const title=nodes.find(node=>node.attributes.id==='model-picker-title');
  const savedSection=nodes.find(node=>node.attributes['aria-label']==='Saved model');
  const draft=nodes.find(node=>node.className==='model-picker-proposed');
  const details=nodes.find(node=>node.tagName==='DETAILS'&&node.children[0]?.textContent==='Model details');
  const changeModel=nodes.find(node=>node.tagName==='DETAILS'&&node.children[0]?.textContent==='Change model');
  const selector=nodes.find(node=>node.attributes['aria-label']==='Installed model');
  const save=nodes.find(node=>node.tagName==='BUTTON'&&node.textContent==='Set default');
  assert.equal(title.textContent,'Model');
  assert.equal(savedSection.children[0].textContent,'Saved');
  assert.equal(savedSection.children[1].textContent,'GPT 4.1 mini');
  assert.equal(draft.hidden,true);
  assert.ok(details);assert.equal(details.open,false);
  assert.ok(changeModel);assert.equal(changeModel.open,false);
  assert.match(details.textContent,/Connection\/provider: openai · API: openai-completions/);
  assert.ok(dialog.children.includes(details),'Model details are a separate collapsed disclosure');
  assert.ok(save);assert.match(dialog.textContent,/All chats · future runs/);
  assert.doesNotMatch(dialog.textContent,/Next runs:/);

  selector.value='1';await selector.dispatch('change');
  assert.equal(draft.hidden,false);
  assert.equal(draft.textContent,'Draft · Claude Unknown','the changed model stays identified while Change model is collapsed');
  assert.equal(changeModel.open,false);
  assert.doesNotMatch(dialog.textContent,/Next runs:/);
  assert.equal(details.open,false);
  assert.match(details.textContent,/Context window: unknown/);
  assert.match(details.textContent,/Reasoning effort is not verified; source: not verified/);
  let liveNodes=document.body.walk();
  const effortRow=liveNodes.find(node=>node.tagName==='LABEL'&&node.children[0]?.textContent==='Reasoning effort');
  assert.equal(effortRow.children[1].children[0].textContent,'Provider default','unknown effort is presented as provider default');

  selector.value='2';await selector.dispatch('change');
  assert.equal(draft.textContent,'Draft · Fixed Model');
  assert.match(details.textContent,/Selectable reasoning effort is unsupported \(runtime catalog\)/);
  liveNodes=document.body.walk();
  const unsupportedEffortRow=liveNodes.find(node=>node.tagName==='LABEL'&&node.children[0]?.textContent==='Reasoning effort');
  assert.equal(unsupportedEffortRow.children[1].children[0].textContent,'Provider default','unsupported effort is presented as provider default');
  assert.equal(requests.filter(call=>call.path==='/provider-config'&&call.options.method==='PUT').length,0);
});

test('same model name and ID on two providers disambiguates Saved and Draft with the group label or provider ID fallback', async () => {
  globalThis.document=new TestDocument();
  const {createModelPicker}=await import('../web/model-picker.mjs');
  const sharedModel = provider => ({
    provider,
    id:'shared-model',
    name:'Shared model',
    api:'openai-completions',
    reasoningCapability:{kind:'unsupported',source:'runtime-catalog',values:[],notice:''},
  });
  const models=[sharedModel('conn-saved'),sharedModel('conn-draft')];
  const request=async(path)=>{
    if(path==='/provider-models')return {version:8,models};
    if(path==='/provider-config')return {version:8,config:{provider:'conn-saved',model:'shared-model',api:'openai-completions'}};
    if(path==='/provider-connections')return {connections:[{id:'conn-saved',kind:'compatible',providerIdentity:'conn-saved',baseUrl:'https://saved.example.test/v1',api:'openai-completions',models:[]}]};
    throw new Error('unexpected request '+path);
  };
  const picker=createModelPicker({request,onSaved:()=>{}});
  await picker.open();
  const nodes=document.body.walk();
  const saved=nodes.find(node=>node.attributes['aria-label']==='Saved model');
  const draft=nodes.find(node=>node.className==='model-picker-proposed');
  const selector=nodes.find(node=>node.attributes['aria-label']==='Installed model');

  assert.equal(saved.children[1].textContent,'Shared model · saved.example.test');
  selector.value='1';
  await selector.dispatch('change');
  assert.equal(draft.textContent,'Draft · Shared model · conn-draft','missing connection metadata falls back to the provider identity');
});
