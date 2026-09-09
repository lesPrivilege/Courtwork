import {createHash} from 'node:crypto';
import {deriveWorkMetrics} from './work-metrics.mjs';
const keys=['input','output','cacheRead','cacheWrite'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const empty=()=>({recordedRunCount:0,missingRunCount:0,reportedRunCount:0,tokens:Object.fromEntries(keys.map(key=>[key,0]))});
function add(target,run){
  target.recordedRunCount++;
  target[run.usage.missing?'missingRunCount':'reportedRunCount']++;
  for(const key of keys){target.tokens[key]+=run.usage[key];if(!Number.isSafeInteger(target.tokens[key]))throw new Error('usage aggregate exceeds safe integer range');}
  if(!Number.isSafeInteger(target.tokens.input+target.tokens.output))throw new Error('combined usage exceeds safe integer range');
}
export function deriveUsageDetails(state, options={}, observedAt=new Date().toISOString()) {
  const base=deriveWorkMetrics(state,options,observedAt).usage;
  const sessions=new Map(state.sessions.map(session=>[session.id,session]));
  const selected=[], seen=new Set();
  for(const run of state.runs){
    const session=sessions.get(run.sessionId);
    if(!session || (options.projectId!==undefined && session.projectId!==options.projectId) || seen.has(run.id))continue;
    const time=Date.parse(run.startedAt);
    if(time<Date.parse(base.interval.start) || time>=Date.parse(base.interval.endExclusive))continue;
    seen.add(run.id);
    const provider=run.provider;
    const identity=provider && ['provider','model','api'].every(key=>typeof provider[key]==='string') ? {provider:provider.provider,model:provider.model,api:provider.api,route:provider.baseUrl?'custom':'catalog'} : null;
    const modelKey=identity?hash({...identity,baseUrl:provider.baseUrl??null}):'unknown';
    selected.push({id:run.id,sessionId:run.sessionId,sessionTitle:session.title,projectId:session.projectId??null,status:run.status,
      startedAt:run.startedAt,date:new Date(time).toISOString().slice(0,10),modelKey,identity,usage:structuredClone(run.usage)});
  }
  selected.sort((a,b)=>Date.parse(a.startedAt)-Date.parse(b.startedAt)||a.id.localeCompare(b.id));
  const models=new Map(), buckets=Array.from({length:base.interval.days},(_,i)=>({date:new Date(Date.parse(base.interval.start)+i*86400000).toISOString().slice(0,10),...empty(),models:[]}));
  const dayMap=new Map(buckets.map(day=>[day.date,day]));
  const dayModels=new Map();
  for(const run of selected){
    if(!models.has(run.modelKey))models.set(run.modelKey,{key:run.modelKey,identity:run.identity,...empty()});
    add(models.get(run.modelKey),run);add(dayMap.get(run.date),run);
    const compound=`${run.date}:${run.modelKey}`;
    if(!dayModels.has(compound)){const group={key:run.modelKey,...empty()};dayModels.set(compound,group);dayMap.get(run.date).models.push(group);}
    add(dayModels.get(compound),run);
  }
  const snapshotId=hash({interval:base.interval,scope:base.scope,runs:selected});
  const overview={...base,snapshotId,modelIdentity:'configured-provider-model-api-route-at-run-start',models:[...models.values()].sort((a,b)=>a.key.localeCompare(b.key)),buckets,
    drilldown:{maxPageSize:100,snapshotRequired:true}, totalMetric:'reported-input-plus-output; cache kept separate'};
  return {overview,runs:selected};
}
export function selectUsageRuns(snapshot,{snapshotId,date,modelKeys,offset=0,limit=50}) {
  if(snapshotId!==snapshot.overview.snapshotId) return {conflict:true};
  const models=modelKeys?new Set(modelKeys):null;
  const rows=snapshot.runs.filter(run=>(!date||run.date===date)&&(!models||models.has(run.modelKey)));
  return {schemaVersion:1,snapshotId,scope:snapshot.overview.scope,interval:snapshot.overview.interval,filter:{date:date??null,modelKeys:modelKeys??null},
    total:rows.length,offset,limit,nextOffset:offset+limit<rows.length?offset+limit:null,items:rows.slice(offset,offset+limit)};
}
