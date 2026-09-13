import {rates,timings,projection,concept,current} from './fixtures.mjs';
import {PresenceView} from '../agent-presence-2026-09-11/return-v1/src/presence.mjs';
import {createClock} from '../agent-presence-2026-09-11/return-v1/src/clock.mjs';
import {icon} from '../../../app/web/ui-controls.mjs';
const $=id=>document.getElementById(id), root=document.documentElement;
let mode='concept', scenario='thinking', count=8, selected=7, timer=null, playing=false;
let ambientTimer=null, ambientIndex=0;
const ambientWords=['Working','Taking a look','Putting it together'];
const fallbackActive=()=>mode==='current'&&['thinking','streaming'].includes(scenario);
function paintAmbient(){
 if(!fallbackActive())return;
 const el=$('presence-text');el.textContent=ambientWords[reduced()?0:ambientIndex%ambientWords.length];el.hidden=false;
}
function syncAmbient(){
 clearTimeout(ambientTimer);ambientTimer=null;
 $('activity-row').classList.toggle('ambient-fallback',fallbackActive());
 paintAmbient();
 if(fallbackActive()&&!reduced()&&!document.hidden)ambientTimer=setTimeout(()=>{ambientIndex++;paintAmbient();fade($('presence-text'));syncAmbient();},3500);
}
const reduced=()=>root.dataset.motion==='reduce'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const text=(id,value)=>$(id).textContent=value;
const short=n=>n===null?'—':n>=1000000?`${n/1000000}M`:`${(n/1000).toFixed(1)}k`;
const panelAnimations=new Map();
$('send-preview').append(icon('arrow-up',{size:17}));
$('draft').addEventListener('input',()=>{$('send-preview').disabled=!$('draft').value.trim();});
$('send-preview').addEventListener('click',()=>{if(!$('draft').value.trim())return;$('draft').value='';$('send-preview').disabled=true;run();});
const presenceClock=createClock({playing:true});
const presence=new PresenceView({mark:$('presence-mark'),text:$('presence-text'),live:$('presence-live'),root:$('activity-row'),clock:presenceClock,candidate:'JP',size:20,material:'flat',words:['Thinking','Considering','Reflecting'],intervalMs:3500,seed:13,reducedMotion:reduced(),onFrame:()=>{if(scenario==='compacting')text('presence-text','Compacting');paintAmbient();}});
function presenceFacts(){
 const status=scenario==='completed'?'completed':scenario==='failed'?'failed':scenario==='unavailable'?'unknown':'running';
 const facts={connection:scenario==='unavailable'?'unknown':'connected',run:{id:'synthetic-run',status}};
 if(mode==='concept'&&scenario==='thinking')facts.activity={kind:'thinking'};
 presence.setFacts(facts);
 text('activity-elapsed',scenario==='unavailable'?'—':'28 s');
 text('activity-tokens',scenario==='unavailable'?'not recorded':'1.5k tokens');
 if(scenario==='compacting')text('presence-text','Compacting');
 syncAmbient();
}

for(const chevron of document.querySelectorAll('.chevron')){chevron.textContent='';chevron.append(icon('chevron-down', {size:14}));}
function fade(el){if(!reduced())el.animate([{opacity:.3},{opacity:1}],{duration:120,easing:getComputedStyle(root).getPropertyValue('--ease-out').trim()});}
function render(animate=false){
 const p=projection(mode,scenario,count,selected);selected=p.selected;presenceFacts();
 text('mode-note',p.future?'Synthetic measurements · visual candidate':'Shipped fields · synthetic fixture');
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 text('work-status',p.phase);text('context-source',p.missing?'Not recorded':p.future?'Synthetic':'Estimate');
 text('context-summary',p.missing?'—':p.future?short(p.used):`~${short(p.estimate)}`);
 text('context-value',p.missing?'—':p.future?short(p.used):`~${short(p.estimate)}`);
 text('context-denominator',p.missing?'':p.future?'/ 1M tokens':'tokens');
 text('context-percent',p.missing||!p.future?'':`${Math.round(p.used/p.limit*100)}%`);
 const ring=document.querySelector('.context-ring');ring.classList.toggle('unknown',p.missing||!p.future);ring.setAttribute('aria-hidden','true');$('context-detail').querySelector('summary').setAttribute('aria-label',p.missing||!p.future?'Context details, capacity usage unknown':`Context details, synthetic ${Math.round(p.used/p.limit*100)} percent`);ring.querySelector('.ring-fill').style.strokeDashoffset=p.missing||!p.future?'100':String(100-p.used/p.limit*100);
 const mini=document.querySelector('.mini-bars');mini.classList.toggle('unmeasured',p.missing||!p.future);mini.querySelectorAll('i').forEach((bar,i)=>{const v=p.values[Math.max(0,p.values.length-9)+i];bar.style.transform=`scaleY(${v===null?.12:v===undefined?.12:.2+v/60*.8})`;bar.style.opacity=v===undefined?'.2':'1';});
 $('context-detail').querySelector('h3').textContent=p.future?'Context window':'Request context';
 $('composition').hidden=p.missing;
 const total=p.future?p.limit:p.parts.reduce((n,x)=>n+x[1],0);
 document.querySelectorAll('.context-piece').forEach((seg,i)=>{seg.style.width=p.parts[i]?`${p.parts[i][1]/total*100}%`:'0';});
 $('composition').setAttribute('aria-label',p.future?'Synthetic token-clock concept: 516,700 of 1,000,000 tokens.':'Next-run resource composition: 36,600 characters; excludes session history, not model capacity.');
 text('context-caption',p.missing?'No context measurement was retained.':p.future?'483.3k before output reservation':'Next-run resources · 36,600 characters');
 $('composition-key').replaceChildren(...p.parts.map(([label,n],i)=>{const r=document.createElement('div');r.className='key-row';const sw=document.createElement('i');sw.className=`s${i+1}`;const l=document.createElement('span');l.textContent=label;const v=document.createElement('b');v.textContent=short(n);r.append(sw,l,v);return r;}));
 text('policy-label',p.future?'Compaction':'Declared window');text('policy-value',p.missing?'Unknown':p.future?(scenario==='compacting'?'In progress':'Automatic'):'1M · synthetic catalog');
 text('context-method',p.future?'Synthetic concept: one model and token encoding, current input includes the listed categories. Output reservation is not included. These capacity readings require a future owner contract; this is not a live model measurement.':'Request estimate: serialized UTF-16 characters ÷ 4. Resource composition counts admitted characters separately and excludes chat history. Declared window is a model capability, not evidence of remaining space.');
 text('tps-source',p.future&&!p.missing?'Synthetic':'Unavailable');
 text('tps-value',p.tps===null?'—':p.tps.toFixed(1));text('tps-unit',p.tps===null?'not measured':'tok/s');
 text('tps-summary',p.tps===null?'Unavailable':`${p.tps.toFixed(1)} tok/s`);
 text('reading-phase',p.tps===null?(scenario==='failed'?'Failed':''):['streaming','thinking','compacting'].includes(scenario)?'Last completed':`Request ${selected+1}`);
 const chart=$('throughput-chart');chart.hidden=!p.future||p.missing;$('chart-meta').hidden=chart.hidden;$('missing-text').hidden=!chart.hidden;
 text('missing-text',p.future?'No throughput measurement was retained.':'No token timing was reported.');
 chart.replaceChildren(...p.values.map((value,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Request ${i+1}: ${value===null?'failed, no rate':value+' tokens per second'}, synthetic`);b.setAttribute('aria-pressed',String(i===selected));const bar=document.createElement('span');bar.className='bar'+(value===null?' missing':'');bar.style.height=value===null?'1px':`${value/60*100}%`;b.append(bar);b.addEventListener('click',()=>{selected=i;render(false);chart.querySelectorAll('button')[i]?.focus();});return b;}));
 text('first-output',p.missing?'Not observed':`${timings[selected]??420} ms`);text('elapsed',p.missing?'Not observed':scenario==='streaming'?'1.28 s':'4.12 s');
 text('tps-method',p.future?'Synthetic completed-request samples. Rate = tokens after the first token ÷ decode duration, on one hypothetical token clock. Each bar starts at zero; failed requests have no rate. Host timings below include transport and adapter work, not provider TTFT.':'Decode TPS is unavailable without token deltas and a defined token clock. Host timings include transport and adapter work; elapsed time and character speed are not used to infer decode TPS.');
 $('request-table').replaceChildren(...(p.future&&!p.missing?p.values.flatMap((v,i)=>{const a=document.createElement('span'),b=document.createElement('span');a.textContent=`Request ${i+1}`;b.textContent=v===null?'Failed · —':`${v.toFixed(1)} tok/s`;return[a,b];}):[]));
 if(animate&&!reduced()){fade($('tps-value'));const last=chart.lastElementChild?.firstElementChild;if(last&&!chart.hidden)fade(last);}
}
function stop(){clearTimeout(timer);timer=null;playing=false;text('replay','Replay requests');text('play-status','Snapshot · no live provider');}
function run(){stop();playing=true;scenario='streaming';$('scenario').value=scenario;count=1;selected=0;render(true);text('replay','Pause replay');text('play-status','Replaying fixed synthetic requests');const next=()=>{if(!playing)return;count++;selected=count-1;if(count===rates.length){scenario='completed';$('scenario').value=scenario;render(true);stop();text('play-status','Completed · final sample frozen');return;}render(true);timer=setTimeout(next,700);};timer=setTimeout(next,700);}
$('replay').addEventListener('click',()=>playing?stop():run());
$('scenario').addEventListener('change',e=>{stop();scenario=e.target.value;count=8;selected=7;render(false);});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{stop();mode=b.dataset.mode;render(false);}));
$('theme').addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';text('theme',root.dataset.theme==='dark'?'Light appearance':'Dark appearance');});
$('reduce').addEventListener('change',e=>{root.dataset.motion=e.target.checked?'reduce':'full';presence.setOptions({reducedMotion:reduced()});syncAmbient();if(reduced()){for(const a of document.getAnimations())a.finish();}});
// Native details semantics; WAAPI only bridges pointer open/close. Keyboard is instant.
for(const d of document.querySelectorAll('.metric')){const s=d.querySelector('summary'),p=d.querySelector('.measure-panel');let desired=d.open;s.addEventListener('click',e=>{e.preventDefault();const prior=panelAnimations.get(d);const from=prior?{opacity:getComputedStyle(p).opacity,transform:getComputedStyle(p).transform}:null;prior?.cancel();panelAnimations.delete(d);desired=!desired;if(desired){for(const other of document.querySelectorAll('.metric'))if(other!==d){panelAnimations.get(other)?.cancel();panelAnimations.delete(other);other.open=false;other.dispatchEvent(new CustomEvent('reset-desired'));}}
if(e.detail===0||reduced()){d.open=desired;return;}d.open=true;const finish=desired?{opacity:1,transform:'translateY(0) scale(1)'}:{opacity:0,transform:'translateY(4px) scale(.97)'};const start=from||(desired?{opacity:0,transform:'translateY(4px) scale(.97)'}:{opacity:1,transform:'translateY(0) scale(1)'});const a=p.animate([start,finish],{duration:desired?180:120,easing:getComputedStyle(root).getPropertyValue('--ease-out').trim()});panelAnimations.set(d,a);a.onfinish=()=>{d.open=desired;panelAnimations.delete(d);};});d.addEventListener('reset-desired',()=>desired=d.open);d.addEventListener('keydown',e=>{if(e.key==='Escape'){panelAnimations.get(d)?.cancel();panelAnimations.delete(d);desired=false;d.open=false;s.focus();e.preventDefault();}});}
if(matchMedia('(max-width:700px)').matches){$('tps-detail').open=false;$('tps-detail').dispatchEvent(new CustomEvent('reset-desired'));}
document.addEventListener('click',e=>{for(const d of document.querySelectorAll('.metric'))if(d.open&&!e.composedPath().includes(d)){panelAnimations.get(d)?.cancel();panelAnimations.delete(d);d.open=false;d.dispatchEvent(new CustomEvent('reset-desired'));}});
document.addEventListener('keydown',()=>root.classList.add('instant'));document.addEventListener('pointerdown',()=>root.classList.remove('instant'));document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();syncAmbient();});
window.addEventListener('pagehide',()=>{stop();clearTimeout(ambientTimer);presence.destroy();presenceClock.pause();});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{presence.setOptions({reducedMotion:reduced()});syncAmbient();});render();
