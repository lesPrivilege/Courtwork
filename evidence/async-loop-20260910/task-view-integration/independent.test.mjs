import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectAsyncTask} from '../../../app/server/async-task-view.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const sha='85693a6d185f284ecc68324e4dda6d7d677abb03';
const oldSource=execFileSync('git',['-C',root,'show',sha+':app/server/async-tasks.mjs'],{encoding:'utf8'});
const start=oldSource.indexOf('  view(t,');const end=oldSource.indexOf('\n  inspect(',start);
assert(start>=0&&end>start);
// Evaluate only the actual fixed Git version's view method, never a rewritten oracle.
const oldView=Function('sameSource','return ({'+oldSource.slice(start,end)+'}).view')((a,b)=>a?.id===b?.id&&a?.version===b?.version&&a?.digest===b?.digest);
const content='Independent retained source 🙂\r\n';
const digest=createHash('sha256').update(content).digest('hex');
const source={id:'doc',version:'v1',digest};
function task(status){return {id:'task',revision:8,origin:{projectId:'p',sessionId:'s',runId:'r',callId:'c'},adapter:{id:'a',version:'impl1'},source:{...source},createdAt:'2026-09-10T00:00:00Z',updatedAt:'2026-09-10T00:00:00Z',execution:{status,dispatchCount:status==='queued'?0:1,cancelRequestedAt:'2026-09-10T00:00:00Z',cancelAttempted:true,reason:null},result:status==='succeeded'?{text:content,bytes:Buffer.byteLength(content),digest}:null,deliveries:[{runId:'r',callId:'read',kind:'get',taskRevision:4,executionStatus:'running',resultDigest:null,preparedAt:'2026-09-10T00:00:00Z',runtimeRecordedAt:null,provider:'unknown'}]};}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
test('independent fixed-SHA comparison: 392 state/context/options combinations',()=>{
 const adapters=[null,{version:'old',sources:[]},{version:'impl1',sources:[]},...['id','version','digest'].map(k=>({version:'impl1',sources:[{...source,[k]:k==='digest'?'0'.repeat(64):'changed'}]})),{version:'impl1',sources:[{...source}]}];
 let count=0;
 for(const status of ['queued','dispatching','running','unknown','succeeded','failed','cancelled'])for(const sessionExists of [false,true])for(const adapter of adapters)for(const options of [{},{result:false},{deliveries:false},{result:false,deliveries:false}]){
  const t=freeze(task(status));const context=freeze({sessionExists,adapter});
  const expected=oldView.call({store:{getSession:()=>sessionExists?{id:'s'}:null},adapters:new Map(adapter?[['a',adapter]]:[])},t,options);
  const actual=projectAsyncTask(t,context,options);
  assert.equal(JSON.stringify(actual),JSON.stringify(expected),JSON.stringify({status,sessionExists,adapter,options}));count++;
 }
 assert.equal(count,392);
});
test('independent: hostile adapter methods/clock unused, separate outputs and old receipts remain independent',()=>{
 const t=freeze(task('succeeded'));
 const adapter=new Proxy({version:'impl1',sources:[source]},{get(obj,key){assert(['version','sources'].includes(key),'unexpected adapter access: '+String(key));return obj[key];}});
 const originalNow=Date.now;let first;
 try{Date.now=()=>{throw Error('projection read clock')};first=projectAsyncTask(t,{sessionExists:true,adapter});}finally{Date.now=originalNow;}
 const second=projectAsyncTask(t,{sessionExists:true,adapter});first.result.text='edited';first.deliveries[0].runtimeRecordedAt='invented';
 assert.equal(second.result.text,content);assert.equal(second.deliveries[0].runtimeRecordedAt,null);assert.equal(second.deliveries[0].taskRevision,4);assert.equal(second.deliveries[0].executionStatus,'running');assert.equal(second.execution.status,'succeeded');assert.equal(second.execution.cancelAttempted,true);assert.equal(t.result.text,content);
});
