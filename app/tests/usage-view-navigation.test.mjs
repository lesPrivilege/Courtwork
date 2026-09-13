import test from 'node:test';
import assert from 'node:assert/strict';
import {createUsageView} from '../web/usage-view.mjs';
import {deriveUsageDetails,selectUsageRuns} from '../server/usage-details.mjs';
import {withTinyDom,deferred,flush} from './tiny-dom.mjs';

// Behavior coverage for the local observation return; TinyDOM does not claim
// native dialog focus containment or rendered scroll geometry.
test('Usage local return restores its origin and rejects late drill responses',()=>withTinyDom(async()=>{
  const create=document.createElement.bind(document);
  document.createElement=tag=>{
    const node=create(tag);node.style={setProperty(){}};
    if(tag==='dialog'){node.showModal=()=>{node.open=true;};node.close=()=>{node.open=false;node.dispatchEvent({type:'close'});};}
    return node;
  };
  document.body=create('body');
  const snapshot=deriveUsageDetails({sessions:[{id:'s',projectId:'p',title:'Synthetic'}],runs:Array.from({length:26},(_,i)=>({
    id:`r-${i}`,sessionId:'s',startedAt:'2026-09-13T01:00:00Z',status:'completed',provider:null,
    usage:{input:2,output:3,cacheRead:0,cacheWrite:0,missing:false,turns:1}
  }))},{days:30},'2026-09-13T12:00:00Z');
  let pending=deferred(),reads=0;
  const view=createUsageView({getProjects:()=>[],onOpenRun(){},request:async(url)=>{
    if(url.startsWith('/work-usage-details')){reads++;return snapshot.overview;}
    return pending.promise;
  }});
  view.open();await flush();
  const dialog=document.body.querySelector('dialog');
  const origin=dialog.querySelector('[data-usage-focus="day-29"]');
  dialog.querySelector('.observation-dialog-body').scrollTop=73;
  origin.focus();origin.click();
  const back=dialog.querySelector('[data-usage-focus="return"]');assert(back);
  back.click();
  assert.equal(document.activeElement.dataset.usageFocus,'day-29');
  assert.equal(dialog.querySelector('.observation-dialog-body').scrollTop,73);
  pending.resolve(selectUsageRuns(snapshot,{snapshotId:snapshot.overview.snapshotId,date:'2026-09-13',offset:0,limit:25}));
  await flush();assert.equal(dialog.querySelector('.usage-drilldown'),null,'late result cannot reopen dismissed detail');
  assert.equal(reads,1,'return keeps the same observation');
  pending=deferred();
  const rank=dialog.querySelector('[data-usage-focus="rank-0"]');rank.focus();rank.click();
  pending.resolve(selectUsageRuns(snapshot,{snapshotId:snapshot.overview.snapshotId,modelKeys:['unknown'],offset:0,limit:25}));
  await flush();assert(dialog.querySelector('.usage-drilldown').textContent.includes('Synthetic'));
  for(const [label,offset] of [['Next',25],['Previous',0]]){
    pending=deferred();
    const page=dialog.querySelectorAll('button').find(node=>node.textContent===label);
    page.focus();page.click();
    pending.resolve(selectUsageRuns(snapshot,{snapshotId:snapshot.overview.snapshotId,modelKeys:['unknown'],offset,limit:25}));
    await flush();
  }
  dialog.querySelector('[data-usage-focus="return"]').click();
  assert.equal(document.activeElement.dataset.usageFocus,'rank-0','pagination back to offset zero keeps the original chart return target');
}));
