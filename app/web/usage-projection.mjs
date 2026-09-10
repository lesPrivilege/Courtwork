export const usageValue=(entry,metric='total')=>metric==='total'?entry.tokens.input+entry.tokens.output:entry.tokens[metric];
export function modelSeries(data,metric='total') {
  const ranked=[...data.models].sort((a,b)=>usageValue(b,metric)-usageValue(a,metric)||a.key.localeCompare(b.key));
  const series=ranked.slice(0,4).map(model=>({key:model.key,label:model.identity?`${model.identity.provider} / ${model.identity.model}`:'Unknown model',modelKeys:[model.key]}));
  if(ranked.length>4)series.push({key:'other',label:'Other',modelKeys:ranked.slice(4).map(m=>m.key)});
  return series.map(series=>({...series,values:data.buckets.map(day=>day.models.filter(model=>series.modelKeys.includes(model.key)).reduce((sum,model)=>sum+usageValue(model,metric),0))}));
}
export function quantileLevels(values) {
  const positive=values.filter(value=>value>0).sort((a,b)=>a-b);
  const thresholds=positive.length?[.5,.75,.9].map(p=>positive[Math.min(positive.length-1,Math.floor((positive.length-1)*p))]):[];
  return {thresholds,levels:values.map(value=>value===0?0:1+thresholds.filter(bound=>value>=bound).length)};
}
const safeCount = value => Number.isSafeInteger(value) && value >= 0;
const tokenKeys = ['input','output','cacheRead','cacheWrite'];
const nonempty = value => typeof value === 'string' && Boolean(value.trim());
const modelKey = value => value === 'unknown' || (typeof value === 'string' && /^[a-f0-9]{64}$/.test(value));
const modelIdentity = value => value === null || (value && ['provider','model','api'].every(key=>nonempty(value[key])) && ['catalog','custom'].includes(value.route));
const counts = entry => entry && ['recordedRunCount','missingRunCount','reportedRunCount'].every(key=>safeCount(entry[key]))
  && entry.missingRunCount + entry.reportedRunCount === entry.recordedRunCount
  && entry.tokens && tokenKeys.every(key=>safeCount(entry.tokens[key])) && safeCount(entry.tokens.input+entry.tokens.output);
function dateTime(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function utcDay(value) {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const time=Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time : null;
}
function intervalValid(value) {
  if(!value || !Number.isSafeInteger(value.days) || value.days<1 || value.days>366 || value.runTimeField!=='startedAt')return false;
  if(!dateTime(value.start)||!dateTime(value.endExclusive))return false;
  const start=Date.parse(value.start),end=Date.parse(value.endExclusive);
  return value.start===new Date(start).toISOString() && value.endExclusive===new Date(end).toISOString()
    && start%86400000===0 && end-start===value.days*86400000;
}
const scopeValid=value=>value?.kind==='retained-recorded-runs' && (value.projectId===null || nonempty(value.projectId));
const sameScope=(a,b)=>scopeValid(a) && a.kind===b.kind && a.projectId===b.projectId;
const sameInterval=(a,b)=>intervalValid(a) && ['start','endExclusive','days','runTimeField'].every(key=>a[key]===b[key]);
const sumMatches=(parent,children)=>['recordedRunCount','missingRunCount','reportedRunCount'].every(key=>children.reduce((sum,child)=>sum+child[key],0)===parent[key])
  && tokenKeys.every(key=>children.reduce((sum,child)=>sum+child.tokens[key],0)===parent.tokens[key]);
export function validUsageDetails(value, expected = null) {
  if(!(value?.schemaVersion===1 && typeof value.snapshotId==='string' && /^[a-f0-9]{64}$/.test(value.snapshotId) && value.timeZone==='UTC'
    && value.modelIdentity==='configured-provider-model-api-route-at-run-start' && value.isBillingRecord===false && value.source==='provider-reported-run-usage'
    && dateTime(value.observedAt) && intervalValid(value.interval) && scopeValid(value.scope)
    && value.coverage?.retainedRecords==='complete' && value.coverage.historical==='unknown' && value.coverage.reason==='deleted_sessions_remove_run_records'
    && counts(value) && value.missing===(value.missingRunCount>0)
    && value.accounting===(value.recordedRunCount===0?'no_runs':value.missing?'not_reported':'reported')
    && Array.isArray(value.models) && value.models.every(model=>modelKey(model?.key) && modelIdentity(model.identity) && ((model.key==='unknown')===(model.identity===null)) && counts(model))
    && Array.isArray(value.buckets) && value.buckets.length===value.interval.days))return false;
  if(expected && (value.interval.days!==expected.days || value.scope.projectId!==expected.projectId))return false;
  const keys=new Set(value.models.map(model=>model.key));if(keys.size!==value.models.length)return false;
  const start=Date.parse(value.interval.start);
  if(!value.buckets.every((day,index)=>utcDay(day?.date)===start+index*86400000 && counts(day) && Array.isArray(day.models)
    && day.models.every(model=>keys.has(model?.key)&&counts(model)) && new Set(day.models.map(model=>model.key)).size===day.models.length && sumMatches(day,day.models)))return false;
  return sumMatches(value,value.buckets) && sumMatches(value,value.models)
    && value.models.every(model=>sumMatches(model,value.buckets.flatMap(day=>day.models.filter(entry=>entry.key===model.key))));
}
export function validUsageRuns(value, snapshot, {filter={},offset=0,limit=25}={}) {
  if(!(value?.schemaVersion===1 && value.snapshotId===snapshot.snapshotId && sameScope(value.scope,snapshot.scope) && sameInterval(value.interval,snapshot.interval)
    && value.filter?.date===(filter.date??null) && JSON.stringify(value.filter.modelKeys)===JSON.stringify(filter.modelKeys??null)
    && safeCount(value.total) && value.offset===offset && value.limit===limit && safeCount(offset) && Number.isSafeInteger(limit) && limit>0 && limit<=100
    && value.nextOffset===(offset+limit<value.total?offset+limit:null) && Array.isArray(value.items)
    && value.items.length===Math.min(limit,Math.max(0,value.total-offset))))return false;
  const known=new Set(snapshot.models.map(model=>model.key)), ids=new Set();
  return value.items.every(run=>{
    if(!run || !nonempty(run.id) || ids.has(run.id) || !nonempty(run.sessionId) || typeof run.sessionTitle!=='string'
      || !(run.projectId===null || nonempty(run.projectId)) || (snapshot.scope.projectId!==null && run.projectId!==snapshot.scope.projectId)
      || !['running','stopping','waiting_user','completed','cancelled','failed','unknown'].includes(run.status) || !dateTime(run.startedAt)
      || utcDay(run.date)===null || new Date(Date.parse(run.startedAt)).toISOString().slice(0,10)!==run.date
      || Date.parse(run.startedAt)<Date.parse(snapshot.interval.start) || Date.parse(run.startedAt)>=Date.parse(snapshot.interval.endExclusive)
      || !known.has(run.modelKey) || !modelIdentity(run.identity) || ((run.modelKey==='unknown')!==(run.identity===null))
      || (filter.date && run.date!==filter.date) || (filter.modelKeys && !filter.modelKeys.includes(run.modelKey))
      || !run.usage || !tokenKeys.every(key=>safeCount(run.usage[key])) || !safeCount(run.usage.input+run.usage.output)
      || !safeCount(run.usage.turns) || typeof run.usage.missing!=='boolean')return false;
    ids.add(run.id);return true;
  });
}

// Same Monday-first, column-wise calendar grammar as Home's retained-run instrument.
export function usageCalendar(buckets) {
  if(!buckets.length)return {offset:0,weeks:0,labels:[]};
  const offset=(new Date(`${buckets[0].date}T00:00:00Z`).getUTCDay()+6)%7;
  const weeks=Math.ceil((offset+buckets.length)/7),step=Math.max(2,Math.ceil(weeks/8));
  const labels=[];
  for(let week=0;week<weeks;week+=step)labels.push({week,date:buckets[Math.max(0,week*7-offset)].date});
  return {offset,weeks,labels};
}
export function usageCalendarTarget(index,key,offset,length) {
  if(key==='Home')return 0;if(key==='End')return length-1;
  const row=(offset+index)%7;
  const step={ArrowLeft:-7,ArrowRight:7,ArrowUp:row===0?0:-1,ArrowDown:row===6?0:1}[key];
  return step===undefined?null:Math.max(0,Math.min(length-1,index+step));
}
