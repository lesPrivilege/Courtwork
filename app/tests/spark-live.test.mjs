import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { validSparkDerivations, sameSnapshot } from '../web/spark-projection.mjs';
import { createSparkView } from '../web/spark-view.mjs';
import { withTinyDom, flush, deferred } from './tiny-dom.mjs';
import { boot } from './helpers.mjs';
const sample = name => JSON.parse(readFileSync(new URL(`../web/samples/spark-derivations/${name}.json`,import.meta.url)));
const token = 'core-state:'+'a'.repeat(64);
function livePage() { const p=sample('quiet');p.scopeRef='project:p';p.snapshotRef=token;p.matters.forEach(m=>m.snapshotRef=token);p.page={limit:25,offset:0,total:26};return p; }

test('BE41-B accepts source FILE zero and replacement rollback without accepting identical or negative versions',()=>{
 const p=sample('stale'),m=p.matters[0];m.version=0;
 m.sourceSetChange.added[0].version=0;m.sourceSetChange.replaced[0].fromVersion=4;m.sourceSetChange.replaced[0].toVersion=0;
 assert.ok(validSparkDerivations(p));
 m.sourceSetChange.replaced[0].toVersion=4;assert.equal(validSparkDerivations(p),null);
 m.sourceSetChange.replaced[0].toVersion=-1;assert.equal(validSparkDerivations(p),null);
 const partial=sample('partial');partial.matters[0].version=0;partial.matters[0].sourceVersion=0;
 assert.ok(validSparkDerivations(partial));
});

test('BE41-B binds live empty pages to the top token and rejects contradictory or malformed top tokens',()=>{
 const p=livePage();assert.ok(validSparkDerivations(p));
 const empty={...p,matters:[],page:{limit:25,offset:100,total:26}};
 assert.equal(validSparkDerivations(empty).snapshotRef,token);
 assert.ok(sameSnapshot(validSparkDerivations(p),validSparkDerivations(empty)));
 assert.equal(validSparkDerivations({...p,snapshotRef:'core-state:'+'b'.repeat(64)}),null);
 assert.equal(validSparkDerivations({...empty,snapshotRef:null}),null);
 assert.equal(validSparkDerivations(sample('empty')).snapshotRef,null);
});

async function viewHarness(run) {return withTinyDom(async body=>{
 document.body=body;const create=document.createElement.bind(document);
 document.createElement=tag=>{const n=create(tag);if(tag==='dialog'){n.showModal=()=>{n.open=true;};n.close=()=>{n.open=false;n.dispatchEvent({type:'close'});};}return n;};
 const find=text=>body.querySelectorAll('button').find(n=>n.textContent===text);
 await run(body,find);
});}

test('BE41-B paginator sends exact snapshot; changed snapshot refresh starts at page zero without old token',()=>viewHarness(async(body,find)=>{
 const paths=[];const view=createSparkView({getProjects:()=>[{id:'p',name:'P'}],onOpenMatter:()=>{},request:async p=>{paths.push(p);if(paths.length===2)throw Object.assign(new Error('changed'),{status:409,body:{error:{code:'derivations_snapshot_changed'}}});return livePage();}});
 view.open('p');await flush();find('More Matters').click();await flush();
 assert.equal(new URL(paths[1],'http://local').searchParams.get('snapshotRef'),token);
 assert.match(body.textContent,/moved on since the last page/);assert.equal(find('Retry'),undefined);
 find('Refresh').click();await flush();
 const refreshed=new URL(paths[2],'http://local');assert.equal(refreshed.searchParams.get('offset'),'0');assert.equal(refreshed.searchParams.has('snapshotRef'),false);
}));

test('BE41-B late pagination cannot replace a closed and reopened read',()=>viewHarness(async(body,find)=>{
 const late=deferred();let calls=0;
 const view=createSparkView({getProjects:()=>[{id:'p',name:'P'}],onOpenMatter:()=>{},request:async()=>{calls++;return calls===2?late.promise:livePage();}});
 view.open('p');await flush();find('More Matters').click();await flush();body.querySelector('dialog').close();view.open('p');await flush();
 late.reject(Object.assign(new Error('changed'),{status:409,body:{error:{code:'derivations_snapshot_changed'}}}));await flush();
 assert.doesNotMatch(body.textContent,/moved on since the last page/);assert.ok(find('More Matters'));
}));

test('BE41-B actual authenticated empty endpoint projects with its live top token',async()=>{
 const h=await boot({configureFakeCredential:false});try{
 const response=await h.api('GET',`/work-derivations?projectId=${h.projectId}&offset=100`);
 assert.equal(response.status,200);const data=validSparkDerivations(response.json);assert.ok(data);assert.equal(data.matters.length,0);assert.match(data.snapshotRef,/^core-state:[a-f0-9]{64}$/);
 }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});


test('BE41-B a live snapshot rejection discards explicit sample and exposes Refresh',()=>viewHarness(async(body,find)=>{
 const priorFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>({ok:true,json:async()=>sample('stale')});
 try {
  const view=createSparkView({getProjects:()=>[{id:'p',name:'P'}],onOpenMatter:()=>{},request:async()=>{
   if(++calls===1)throw Object.assign(new Error('missing'),{status:404});
   throw Object.assign(new Error('changed'),{status:409,body:{error:{code:'derivations_snapshot_changed'}}});
  }});
  view.open('p');await flush();find('Show sample data').click();await flush();assert.match(body.textContent,/Sample data/);
  find('Check for a source again').click();await flush();assert.doesNotMatch(body.textContent,/Sample data/);assert.ok(find('Refresh'));
 } finally {globalThis.fetch=priorFetch;}
}));
