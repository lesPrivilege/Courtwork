import { check, keys, str, revision } from './coordination-state.mjs';

// Adapter conformance entry. Production Pi child scheduling is not installed.
// A grant is supplied by the host, never by model/Expert configuration.
export function narrowGrant(parent, requested) {
  for (const g of [parent,requested]) {
    keys(g,['actions','resources','depth']); revision(g.depth);
    for (const list of [g.actions,g.resources]) { check(Array.isArray(list) && list.length <= 128,'Invalid grant'); for (const x of list) str(x); }
  }
  check(parent.depth > 0,'Delegation depth exhausted','delegation_denied');
  return {actions:[...new Set(requested.actions.filter(x=>parent.actions.includes(x)))].sort(),
    resources:[...new Set(requested.resources.filter(x=>parent.resources.includes(x)))].sort(),depth:Math.min(parent.depth-1,requested.depth)};
}
export function reduceFindings(results) {
  check(Array.isArray(results) && results.length <= 16,'Invalid child results');
  const fields=['claims','evidenceRefs','artifactRefs','conflicts','gaps'];
  const aggregate=Object.fromEntries(fields.map(k=>[k,new Set()]));
  const executions=new Map();
  for (const r of results) {
    keys(r,['executionId',...fields]); str(r.executionId);
    for (const k of fields) { check(Array.isArray(r[k]) && r[k].length <= 128,'Invalid finding collection'); for (const v of r[k]) {str(v,4000);aggregate[k].add(v);} }
    const normalized=JSON.stringify(Object.fromEntries(fields.map(k=>[k,[...new Set(r[k])].sort()])));
    check(!executions.has(r.executionId) || executions.get(r.executionId) === normalized,'Contradictory result for one execution','child_conflict');
    executions.set(r.executionId,normalized);
  }
  return {schemaVersion:1,authority:'finding-only',...Object.fromEntries(fields.map(k=>[k,[...aggregate[k]].sort()])),sourceExecutions:[...executions.keys()].sort(),
    sources:[...executions].sort(([a],[b])=>a.localeCompare(b)).map(([executionId,value])=>({executionId,...JSON.parse(value)}))};
}

export async function executeChild(spec,{parentGrant,adapter,tools={},signal}={}) {
  spec=structuredClone(spec);
  keys(spec,['schemaVersion','executionId','origin','mode','input','grant','budgetMs','adapter']);
  check(spec.schemaVersion === 1 && spec.mode === 'invoke','Unsupported child contract'); str(spec.executionId); str(spec.input,16000);
  keys(spec.origin,['threadId','sessionId','runId']); for (const v of Object.values(spec.origin)) str(v);
  keys(spec.adapter,['id','version']); str(spec.adapter.id); str(spec.adapter.version);
  check(Number.isSafeInteger(spec.budgetMs) && spec.budgetMs > 0 && spec.budgetMs <= 60000,'Invalid child budget');
  check(adapter?.id === spec.adapter.id && adapter?.version === spec.adapter.version && typeof adapter.execute === 'function','Child adapter unavailable','child_adapter_unavailable');
  const grant=narrowGrant(parentGrant,spec.grant), controller=new AbortController();
  const immutable=structuredClone(spec), origin=structuredClone(spec.origin);
  const onAbort=()=>controller.abort(); signal?.addEventListener('abort',onAbort,{once:true});
  let timer, abortListener, closed=false;
  const interrupted=new Promise(resolve=>{
    abortListener=()=>resolve({status:'cancelled',result:null}); controller.signal.addEventListener('abort',abortListener,{once:true});
    timer=setTimeout(()=>{resolve({status:'unknown',result:null});controller.abort();},spec.budgetMs);
  });
  if (signal?.aborted) controller.abort();
  try {
    if (controller.signal.aborted) return {schemaVersion:1,executionId:spec.executionId,origin,status:'cancelled',delivery:'not_delivered',acceptance:'not_requested',result:null};
    const work=Promise.resolve().then(()=>{check(!controller.signal.aborted,'Child admission closed','child_closed'); return adapter.execute({spec:immutable,grant:structuredClone(grant),signal:controller.signal,
      async tool(action,resource,args) {
        check(!closed && !controller.signal.aborted,'Child admission closed','child_closed');
        check(grant.actions.includes(action) && grant.resources.includes(resource) && Object.hasOwn(tools,action),'Child tool denied','delegation_denied');
        const result=await tools[action](resource,structuredClone(args),controller.signal);
        check(!closed && !controller.signal.aborted,'Child admission closed','child_closed'); return result;
      },
    });}).then(r=>{
      check(r?.executionId === spec.executionId,'Child identity mismatch','child_identity');
      const result=reduceFindings([r]); return {status:'succeeded',result};
    }).catch(()=>({status:'failed',result:null}));
    const settled=await Promise.race([work,interrupted]);
    return {schemaVersion:1,executionId:spec.executionId,origin,...settled,delivery:'not_delivered',acceptance:'not_requested'};
  } finally {closed=true;clearTimeout(timer);signal?.removeEventListener('abort',onAbort);controller.signal.removeEventListener('abort',abortListener);controller.abort();}
}
