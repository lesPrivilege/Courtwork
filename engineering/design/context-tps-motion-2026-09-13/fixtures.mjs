// Design fixtures only. No API, provider, elapsed-clock or token-count inference.
export const rates = [31.4, 38.6, 35.2, 46.1, 40.9, 48.3, 39.7, 42.8];
export const timings = [680, 510, 570, 380, 440, 360, 460, 420];
export const concept = {limit:1000000,used:516700,parts:[['Conversation',384600],['Files',82900],['Tools',34200],['Instructions',15000]]};
// Composition and request estimate have distinct scopes. Never divide either by window.
export const current = {estimate:12800,declaredWindow:1000000,parts:[['Instructions',8300],['Files',20500],['Tool catalog',6100],['Skills',1700]]};
export function projection(mode,scenario,count=8,selected=count-1){
  const missing=scenario==='unavailable', future=mode==='concept';
  const index=Math.max(0,Math.min(selected,count-1,rates.length-1));
  const values=future&&!missing?rates.slice(0,count).map((n,i)=>scenario==='failed'&&i===count-1?null:n):[];
  return {missing,future,values,selected:index,
    tps:future&&!missing?values[index]:null,
    used:missing||!future?null:concept.used,limit:missing||!future?null:concept.limit,
    estimate:missing?null:current.estimate,parts:missing?[]:future?concept.parts:current.parts,
    phase:({thinking:'Thinking',completed:'Completed',streaming:'Streaming',compacting:'Compacting',failed:'Failed',unavailable:'No measurement'})[scenario]};
}
