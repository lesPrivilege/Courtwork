import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
if (!process.env.CW_REVIEW_SOURCE) throw Error('Set CW_REVIEW_SOURCE');
const load = name => import(pathToFileURL(path.join(process.env.CW_REVIEW_SOURCE,'app/runtime',name)));
const {createHermesRunsAdapter}=await load('hermes-api-runs-adapter.mjs');
const {createHermesRunsTransport}=await load('hermes-api-runs-transport.mjs');
const requests=[];
const transport=endpoint=>({endpointIdentity:endpoint,
 async createRun(value){requests.push({endpoint,...value});return {status:202,json:{run_id:'run-new',status:'started',replayed:false}}},
 async getRun(id){return {status:200,json:{object:'hermes.run',run_id:id,status:'completed',completed:true,session_id:'session-A',output:'ok'}}},
 async stopRun(id){return {status:200,json:{run_id:id,status:'stopping'}}},
 async *events(){},close(){return 0}});
const results=[];
async function check(name,fn){try{await fn();results.push({name,pass:true})}catch(error){results.push({name,pass:false,message:error.message})}}
const a=createHermesRunsAdapter({transport:transport('http://127.0.0.1:1111')});
const b=createHermesRunsAdapter({transport:transport('http://127.0.0.1:2222')});
await check('cross-endpoint observed status refuses before dispatch',async()=>{let refused=false;try{const intent=b.continuationIntent({input:'continue',idempotencyKey:'cross',from:await a.status('run-a')});await b.admit(intent)}catch{refused=true}assert.equal(refused,true);assert.equal(requests.length,0)});
requests.length=0;
await check('forged outer-frozen body refuses before dispatch',async()=>{await assert.rejects(()=>b.admit(Object.freeze({idempotencyKey:'forged',body:{input:'x',session_id:'arbitrary',toolsets:['all']}})));assert.equal(requests.length,0)});
requests.length=0;
await check('owned admission still sends exact bounded body',async()=>{await a.admit(a.admissionIntent({input:'legal',idempotencyKey:'legal'}));assert.deepEqual(requests,[{endpoint:'http://127.0.0.1:1111',body:{input:'legal'},idempotencyKey:'legal'}])});
for(const [label,limits] of [['NaN-frame',{maxFrameBytes:NaN}],['infinite-stream',{maxStreamBytes:Infinity}],['negative-idle',{streamIdleMs:-1}],['unknown',{surprise:1}]])await check('transport rejects '+label,()=>assert.throws(()=>createHermesRunsTransport({endpoint:'http://127.0.0.1:1234',limits})));
for(const [label,limits] of [['NaN-input',{maxInputChars:NaN}],['infinite-diagnostics',{maxDiagnostics:Infinity}],['negative-text',{maxTextChars:-1}],['unknown',{surprise:1}]])await check('adapter rejects '+label,()=>assert.throws(()=>createHermesRunsAdapter({transport:transport('http://127.0.0.1:1234'),limits})));
a.dispose();b.dispose();console.log(JSON.stringify(results,null,2));process.exitCode=results.some(r=>!r.pass)?1:0;
