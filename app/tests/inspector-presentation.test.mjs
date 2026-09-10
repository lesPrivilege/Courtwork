import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRun } from '../web/inspector.mjs';
import { withTinyDom } from './tiny-dom.mjs';
const run={id:'r',sessionId:'s',status:'completed',startedAt:'2026-09-10T12:00:00Z',usage:{input:4,output:2,cacheRead:1,cacheWrite:null,turns:2,missing:true},artifacts:[{kind:'content-version',path:'out/result.md',bytes:10,sha256:'a'.repeat(64)}]};
test('Inspector separates recorded/current targets and folds version/cache details without losing unknown accounting',async()=>withTinyDom(container=>{
  const opened=[];
  renderRun(container,{sessionId:'s',run,events:[],onFile:target=>opened.push(target),onRefresh:()=>{}});
  const buttons=container.querySelectorAll('button');buttons.find(b=>b.textContent==='out/result.md').click();buttons.find(b=>b.textContent==='Current file').click();
  assert.deepEqual(opened.map(t=>t.kind),['content-version','current']);
  assert.equal(opened[1].expectedSha256,'a'.repeat(64));
  assert.match(container.textContent,/At least 4/);assert.match(container.textContent,/Not reported/);
  assert.equal(container.querySelector('.version-details').open,false);
  assert.match(container.textContent,/No tool actions were recorded/);
}));
test('Inspector tool activity reuses thread projection and never turns an unfinished tool into success',async()=>withTinyDom(container=>{
  const events=[{seq:1,runId:'r',sessionId:'s',type:'tool.start',data:{callId:'t',name:'ws_read',arguments:{path:'x'}}},
    {seq:2,runId:'other',sessionId:'s',type:'tool.result',data:{callId:'t',name:'ws_read',result:'unrelated'}}];
  renderRun(container,{sessionId:'s',run,events,onFile:()=>{},onRefresh:()=>{}});
  const activity=container.querySelector('.inspector-tool-list');assert.match(activity.textContent,/ws_readUnknown/);assert.doesNotMatch(activity.textContent,/unrelated/);
  assert.match(container.textContent,/Event trace · 1 event/);
}));
