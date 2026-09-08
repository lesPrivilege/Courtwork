// Tests isolated pure functions. No Core worker, host, database or provider is run.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const original=await readFile(new URL('./owner-original.mjs',import.meta.url),'utf8');
// Only imports are removed. WorkCoreOwner is never constructed; exported pure
// function bodies remain byte-identical to the hash-verified source file.
const isolated=original.replace(/^import .*;\n/gm,'');
const {compileWorkContext,workProjection}=await import('data:text/javascript;base64,'+Buffer.from(isolated).toString('base64'));
const view={matter:{id:'m',version:0,source_version:2,contract_version:'se-contract-v5.0',active_artifact:null,obligations:[]},
  artifact:null,sources:[{id:'s',version:2,text:'new',digest:'digest-v2'}],
  candidates:[{id:'c',base_version:0,source_version:2,contract_version:'se-contract-v5.0',status:'pending',evidence:[],obligations:[],artifact_text:'memo'}],
  decisions:[],runs:[],core_state_digest:'synthetic'};
const stale=structuredClone(view);stale.candidates[0].source_version=1;
const opts={extension:{id:'memo'},writable:true,contractVersion:'se-contract-v5.0'};
const currentActions=workProjection(view,opts).humanActions.map(x=>x.action);
const staleActions=workProjection(stale,opts).humanActions.map(x=>x.action);
const currentContext=compileWorkContext(view), staleContext=compileWorkContext(stale);
assert.equal(currentContext.text,staleContext.text);
assert(currentActions.includes('decide'));assert(!staleActions.includes('decide'));
const long=structuredClone(view);long.candidates=[];
long.matter.version=1;long.matter.active_artifact='a';
long.artifact={id:'a',candidate_id:'c',content:'A'.repeat(25000),content_digest:'synthetic'};
let failure=null;try{compileWorkContext(long);}catch(e){failure={code:e.code,message:e.message};}
assert.equal(failure?.code,'CONTEXT_BUDGET');
const report={scope:'Isolated pure-function observations only; reachability through a complete Courtwork accept/resume lifecycle has not been executed.',environment:{node:process.version},
  results:[{id:'P1',finding:'Current and source-stale pending candidates have identical compiled model context, although UI action eligibility differs.',currentActions,staleActions,compiledContext:currentContext},
    {id:'P2',finding:'A 25,000-character artifact cannot enter the default 24,000-character continuation context.',artifactCharacters:25000,failure}]};
await writeFile(new URL('./context-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({contextCollision:true,currentActions,staleActions,longArtifact:failure}));
