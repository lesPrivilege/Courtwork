import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {createQueue}=await import(pathToFileURL(process.argv[2]+'/src/queue.mjs'));
let checked=0;
for (const limit of [1,2,3,5]) {
 let q=createQueue({maxAttempts:limit});
 for(let i=0;i<8;i++)q.enqueue('key'+i,{nested:[i]});
 let now=0;const leases=[];
 for(let i=0;i<8*limit;i++){
  const lease=q.claim('worker'+i,now,3);assert.ok(lease);leases.push(structuredClone(lease));
  assert.equal(lease.token,lease.attempts);assert.ok(lease.attempts<=limit);
  now+=3;
  const before=JSON.stringify(q.snapshot());assert.equal(q.ack(lease.id,lease.token,now),false);assert.equal(q.fail(lease.id,lease.token,now),false);assert.equal(JSON.stringify(q.snapshot()),before);
  q=createQueue({maxAttempts:limit,snapshot:JSON.parse(before)});checked++;
 }
 assert.equal(q.claim('last',now,3),null);
 for(const job of q.snapshot().jobs){assert.equal(job.state,'dead');assert.equal(job.attempts,limit);assert.equal(q.enqueue(job.key,{wrong:true}).id,job.id);}
 for(const old of leases){assert.equal(q.ack(old.id,old.token,now),false);assert.equal(q.fail(old.id,old.token,now),false);}
 assert.equal(q.enqueue('new',{}).id,'9');
}
const q=createQueue();q.enqueue('__proto__',{nested:[1]});const a=q.claim('w',0,4);assert.equal(q.ack(a.id,a.token,1),true);const s=q.snapshot();s.jobs[0].state='queued';assert.equal(q.claim('w2',2,4),null);const ret=q.enqueue('__proto__',{});ret.payload.nested[0]=9;assert.equal(q.snapshot().jobs[0].payload.nested[0],1);
const unusual=JSON.parse('{"__proto__":{"flag":true},"nested":{"__proto__":{"n":2}}}');
const special=createQueue();special.enqueue('json',unusual);assert.deepEqual(special.snapshot().jobs[0].payload,unusual);assert.deepEqual(createQueue({snapshot:JSON.parse(JSON.stringify(special.snapshot()))}).snapshot().jobs[0].payload,unusual);
console.log(JSON.stringify({passed:true,expiryRestoreTransitions:checked,limits:[1,2,3,5],terminalReplayAndCopyChecks:true}));
