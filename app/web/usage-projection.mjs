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
export function validUsageDetails(value) {
  const counts=entry=>entry && ['recordedRunCount','missingRunCount','reportedRunCount'].every(key=>Number.isSafeInteger(entry[key])&&entry[key]>=0)
    && entry.missingRunCount+entry.reportedRunCount===entry.recordedRunCount
    && entry.tokens && ['input','output','cacheRead','cacheWrite'].every(key=>Number.isSafeInteger(entry.tokens[key])&&entry.tokens[key]>=0)
    && Number.isSafeInteger(entry.tokens.input+entry.tokens.output);
  return value?.schemaVersion===1 && /^[a-f0-9]{64}$/.test(value.snapshotId) && value.timeZone==='UTC'
    && value.modelIdentity==='configured-provider-model-api-route-at-run-start' && value.isBillingRecord===false
    && counts(value) && Array.isArray(value.models) && value.models.every(model=>typeof model.key==='string'&&counts(model))
    && Array.isArray(value.buckets) && value.buckets.length===value.interval?.days && value.buckets.every(day=>/^\d{4}-\d{2}-\d{2}$/.test(day.date)&&counts(day)&&Array.isArray(day.models)&&day.models.every(counts));
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
