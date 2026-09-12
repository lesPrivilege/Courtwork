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
  const save=nodes.find(node=>node.tagName==='BUTTON'&&node.textContent==='Use for next runs');
  assert.ok(search);assert.ok(save);assert.equal(save.disabled,true);
  search.value='gpt';await search.dispatch('input');
  assert.equal(save.disabled,true,'search only changes the list; it cannot clear the invalid saved value');
  await save.dispatch('click');
  assert.equal(calls.filter(call=>call.path==='/provider-config'&&call.options.method==='PUT').length,0,'the click guard refuses an invalid effort even if invoked directly');
});
