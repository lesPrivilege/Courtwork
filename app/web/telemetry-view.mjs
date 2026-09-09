import { el } from './ui-controls.mjs';
const nonnegative = value => Number.isFinite(value) && value >= 0;
function validMeasurement(data) {
  return data?.schemaVersion === 1 && Number.isSafeInteger(data.requestId) && data.requestId > 0
    && ['started','streaming','completed','cancelled','failed','interrupted'].includes(data.phase)
    && data.requestedModel && ['provider','model','api'].every(key=>typeof data.requestedModel[key]==='string')
    && nonnegative(data.elapsedMs) && [data.firstOutputMs,data.firstTextMs].every(value=>value===null || nonnegative(value))
    && (data.context===null || (data.context && Number.isSafeInteger(data.context.estimatedTokens) && data.context.estimatedTokens>=0))
    && (data.usage===undefined || data.usage===null || ['input','output','cacheRead','cacheWrite'].every(key=>data.usage[key]===null || (Number.isSafeInteger(data.usage[key])&&data.usage[key]>=0)));
}
export function requestMeasurements(events = [], runId) {
  const requests = new Map();
  for(const event of events) if(event.type==='runtime.request.telemetry' && (!runId || event.runId===runId) && validMeasurement(event.data))
    requests.set(`${event.runId}:${event.data.requestId}`,event.data);
  return [...requests.values()];
}
const duration = value => Number.isFinite(value) ? `${(value/1000).toFixed(2)} s` : 'Not observed';
export function renderRequestMeasurements(events, runId, {compact=false}={}) {
  const rows=requestMeasurements(events,runId);
  const box=el('section',{className:'request-measurements'});
  if(!rows.length){box.append(el('p',{className:'form-help',text:'Request timing was not recorded for this run.'}));return box;}
  const selected=compact?rows.slice(-1):rows;
  for(const row of selected){
    const dl=el('dl',{className:'data-list'});
    const fields=[['Host first output',duration(row.firstOutputMs)],['Host first text',duration(row.firstTextMs)],['Observed request time',duration(row.elapsedMs)],['Effort',row.effectiveEffort??'Not recorded'],['Decode TPS','Unavailable · no token deltas']];
    if(row.context) fields.push(['Request context estimate',`~${row.context.estimatedTokens.toLocaleString()} tokens · serialized text ÷ 4`]);
    if(!compact){fields.push(['Requested model',`${row.requestedModel.provider} · ${row.requestedModel.model} · ${row.requestedModel.api}`],['Observed model',row.observedModel?`${row.observedModel.provider??'unknown'} · ${row.observedModel.model}`:'Not reported']);}
    if(row.usage) for(const [key,label] of [['input','Input tokens'],['output','Output tokens'],['cacheRead','Cache read'],['cacheWrite','Cache write']]) fields.push([label,row.usage[key]===null?'Not reported':String(row.usage[key])]);
    for(const [label,value]of fields)dl.append(el('dt',{text:label}),el('dd',{text:value}));
    box.append(el('h4',{text:`Request ${row.requestId} · ${row.purpose} · ${row.phase}`}),dl);
  }
  box.append(el('p',{className:'form-help',text:'Host timings include transport and adapter work; they are not provider TTFT. Context is a heuristic, not remaining capacity. Cache counts are separate; no cache ratio or billing is inferred.'}));
  return box;
}
