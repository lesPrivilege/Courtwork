import { el } from './ui-controls.mjs';
const nonnegative = value => Number.isFinite(value) && value >= 0;
const nonempty = value => typeof value === 'string' && Boolean(value.trim());
const wallClock = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const effort = value => value === null || ['off','minimal','low','medium','high','xhigh','max'].includes(value);
const responseIdentifier = value => value === null || (typeof value === 'string' && value.length > 0
  && value.length <= 256 && value.trim() === value && !/[\u0000-\u001f\u007f-\u009f]/u.test(value));
function validMeasurement(data) {
  return data?.schemaVersion === 1 && Number.isSafeInteger(data.requestId) && data.requestId > 0
    && data.source==='host-semantic-stream' && ['agent','compaction'].includes(data.purpose)
    && ['started','streaming','completed','cancelled','failed','interrupted'].includes(data.phase)
    && data.requestedModel && ['provider','model','api'].every(key=>nonempty(data.requestedModel[key]))
    && (data.observedModel===undefined || data.observedModel===null || (nonempty(data.observedModel.model) && ['provider','api'].every(key=>data.observedModel[key]===null || nonempty(data.observedModel[key]))))
    && (data.providerResponse===undefined || (data.providerResponse?.source==='sdk-response-metadata'
      && responseIdentifier(data.providerResponse.model) && responseIdentifier(data.providerResponse.id)))
    && effort(data.requestedEffort) && effort(data.effectiveEffort)
    && (data.sdkEffectiveEffort === undefined || effort(data.sdkEffectiveEffort))
    && (data.effectiveEffortSource === undefined || data.effectiveEffortSource === 'sdk-setting')
    && (data.providerEffectiveEffort === undefined || data.providerEffectiveEffort === null)
    && wallClock(data.startedAt)
    && (data.finishedAt===undefined || wallClock(data.finishedAt))
    && (data.contextWindow===null || (Number.isSafeInteger(data.contextWindow)&&data.contextWindow>=0))
    && nonnegative(data.elapsedMs) && [data.firstOutputMs,data.firstTextMs].every(value=>value===null || nonnegative(value))
    && data.providerTtftMs===null && data.decodeTokensPerSecond===null
    && Array.isArray(data.missing) && data.missing.includes('provider_token_timing') && data.missing.includes('token_deltas')
    && (data.context===null || (data.context?.method==='serialized-request-utf16-chars-divided-by-4' && data.context.exact===false
      && Number.isSafeInteger(data.context.characters) && data.context.characters>=0 && data.context.estimatedTokens===Math.ceil(data.context.characters/4)))
    && (data.usage===undefined || data.usage===null || ['input','output','cacheRead','cacheWrite'].every(key=>data.usage[key]===null || (Number.isSafeInteger(data.usage[key])&&data.usage[key]>=0)));
}

export function requestMeasurements(events = [], runId) {
  const requests = new Map();
  for(const event of events) if(event.type==='runtime.request.telemetry' && (!runId || event.runId===runId) && validMeasurement(event.data))
    requests.set(`${event.runId}:${event.data.requestId}`,event.data);
  return [...requests.values()];
}
export const requestDuration = value => Number.isFinite(value)
  ? value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`
  : 'Not observed';
// Every request has its own origin. These are host observations, not a provider waterfall.
export function requestTiming(rows) {
  const maximum = Math.max(0, ...rows.map(row => row.elapsedMs));
  return rows.map(row => ({
    requestId: row.requestId,
    duration: row.elapsedMs,
    width: maximum > 0 ? row.elapsedMs / maximum * 100 : 0,
    firstOutput: maximum > 0 && nonnegative(row.firstOutputMs) && row.firstOutputMs <= row.elapsedMs ? row.firstOutputMs / maximum * 100 : null,
    firstText: maximum > 0 && nonnegative(row.firstTextMs) && row.firstTextMs <= row.elapsedMs ? row.firstTextMs / maximum * 100 : null,
  }));
}
export function renderRequestMeasurements(events, runId, {compact=false, opened=new Set()}={}) {
  const rows=requestMeasurements(events,runId);
  const box=el('section',{className:'request-measurements'});
  if(!rows.length){box.append(el('p',{className:'form-help',text:'Request timing was not recorded for this run.'}));return box;}
  const selected=compact?rows.slice(-1):rows;
  const timings=requestTiming(selected);
  box.append(el('h3',{text:compact?'Latest request':'Model requests'}));
  for(const [index,row] of selected.entries()){
    const timing=timings[index];
    const summary=el('summary',{className:'request-summary'},
      el('span',{text:`Request ${row.requestId}`}),
      el('span',{className:'request-disclosure',attrs:{'aria-hidden':'true'},text:'›'}),
      el('span',{className:'request-phase',text:({started:'Starting',streaming:'Streaming',completed:'Completed',cancelled:'Cancelled',failed:'Failed',interrupted:'Interrupted'})[row.phase]}),
      el('span',{className:'request-duration',text:requestDuration(row.elapsedMs)}));
    const chart=el('span',{className:'request-timing',attrs:{role:'img','aria-label':`Host elapsed ${requestDuration(row.elapsedMs)}; first output ${requestDuration(row.firstOutputMs)}; first text ${requestDuration(row.firstTextMs)}.`}});
    const bar=el('span',{className:'request-timing-bar'});bar.style.width=`${timing.width}%`;chart.append(bar);
    for(const [key,kind] of [['firstOutput','output'],['firstText','text']]) if(timing[key]!==null){
      const marker=el('span',{className:`request-timing-marker marker-${kind}`});marker.style.left=`${timing[key]}%`;chart.append(marker);
    }
    summary.append(chart);
    const detail=el('details',{className:'request-detail',attrs:{'data-section':`request-${row.requestId}`}},summary);
    detail.open=opened.has(`request-${row.requestId}`);
    const dl=el('dl',{className:'data-list'});
    const fields=[['Purpose',row.purpose??'Not recorded'],['Host first output',requestDuration(row.firstOutputMs)],['Host first text',requestDuration(row.firstTextMs)],['Observed request time',requestDuration(row.elapsedMs)],['Requested effort',row.requestedEffort??'Provider default'],['SDK setting',row.sdkEffectiveEffort??row.effectiveEffort??'Not recorded'],['Provider effort','Not reported'],['Decode TPS','Unavailable · no token deltas']];
    if(row.context) fields.push(['Request context estimate',`~${row.context.estimatedTokens.toLocaleString()} tokens · serialized text ÷ 4`]);
    fields.push(['Requested model',`${row.requestedModel.provider} · ${row.requestedModel.model} · ${row.requestedModel.api}`],['Runtime model',row.observedModel?`${row.observedModel.provider??'unknown'} · ${row.observedModel.model}`:'Not reported']);
    if(row.providerResponse?.model) fields.push(['Provider-reported model',row.providerResponse.model]);
    if(row.providerResponse?.id) fields.push(['Provider response ID',row.providerResponse.id]);
    if(row.usage) for(const [key,label] of [['input','Input tokens'],['output','Output tokens'],['cacheRead','Cache read'],['cacheWrite','Cache write']]) fields.push([label,row.usage[key]===null?'Not reported':String(row.usage[key])]);
    for(const [label,value]of fields)dl.append(el('dt',{text:label}),el('dd',{text:value}));
    detail.append(dl);box.append(detail);
  }
  box.append(el('p',{className:'form-help request-scale',text:'Host elapsed time, each request from its own start. Marks show first output and first text.'}));
  const definitions=el('details',{className:'request-definitions',attrs:{'data-section':'request-definitions'}},el('summary',{text:'Measurement details'}),el('p',{className:'form-help',text:'Host timings include transport and adapter work; they are not provider TTFT. First output includes tool activity; first text is the first observed text. Context is a heuristic, not remaining capacity. Cache counts can overlap input; no billing is inferred.'}));
  definitions.open=opened.has('request-definitions');box.append(definitions);
  return box;
}
