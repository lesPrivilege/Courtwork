import { parts, geometryHash } from './geometry.generated.mjs';
export const concepts = Object.freeze(['summon','take-floor','write','retrieve','scope','commit','review','withdraw']);
export const materials = Object.freeze(['mono','hierarchical','glass','depth','luminous']);
export const presences = Object.freeze(['available','present','active','absent']);
export const authorities = Object.freeze(['none','requested','scoped','revoked']);
export const activities = Object.freeze(['idle','thinking','complete']);
let renderSequence=0;
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function member(value, set, field) { if(!set.includes(value)) throw new TypeError(`Unsupported ${field}: ${value}`); return value; }
export function normalize(input={}) {
 const size=Number(input.size??48);
 if(!Number.isFinite(size)||size<12||size>1024) throw new RangeError('size must be 12…1024');
 return {concept:member(input.concept??'write',concepts,'concept'),material:member(input.material??'hierarchical',materials,'material'),
 presence:member(input.presence??'present',presences,'presence'),authority:member(input.authority??'none',authorities,'authority'),
 activity:member(input.activity??'idle',activities,'activity'),size,label:String(input.label??''),theme:member(input.theme??'light',['light','dark'],'theme')};
}
function definitions(id, material, dark) {
 const face = material==='depth' ? (dark?['#a0aab8','#647184','#424f60']:['#627387','#3d4b5d','#253342']) : dark?['#ebf4ff','#7f95b2','#344459']:['#f7fbff','#bacbda','#6f889e'];
 return `<defs>
 <linearGradient id="${id}-face" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${face[0]}"/><stop offset=".38" stop-color="${face[1]}" stop-opacity=".76"/><stop offset="1" stop-color="${face[2]}"/></linearGradient>
 <linearGradient id="${id}-rim" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="${dark?'#ffffff':'#fff'}"/><stop offset=".42" stop-color="${dark?'#8aadc9':'#b6c9d7'}" stop-opacity=".42"/><stop offset=".68" stop-color="${dark?'#405e79':'#536e86'}"/><stop offset="1" stop-color="${dark?'#b8d1eb':'#e4eff9'}"/></linearGradient>
 <linearGradient id="${id}-light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".76"/><stop offset=".45" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>
 <filter id="${id}-shadow" x="-55%" y="-35%" width="210%" height="190%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="1.8" stdDeviation="1.2" flood-color="${dark?'#000':'#1e344a'}" flood-opacity="${dark?'.38':'.2'}"/></filter>
 <filter id="${id}-glow" x="-60%" y="-40%" width="220%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="1.35"/></filter>
 </defs>`;
}
const names = {summon:'Expert enters', 'take-floor':'Expert takes the floor',write:'Record forms',retrieve:'Evidence returns',scope:'Scoped capability',commit:'Proposal and record',review:'Review and amendment',withdraw:'Presence ends; record remains'};
export function renderSymbol(input={}) {
 const s=normalize(input); const id=String(input.idPrefix??`cw-render-${++renderSequence}`);
 if(!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError('idPrefix must be an SVG-safe identifier');
 const material = s.size<=24 && ['glass','depth','luminous'].includes(s.material)?'hierarchical':s.material;
 const dark=s.theme==='dark', expressive=['glass','depth','luminous'].includes(material);
 const title=s.label||names[s.concept];
 const core=(part,i)=>{
  const actor=i===0, name=actor?'actor':`line line-${i}`, ink=actor?'var(--cw-ink)':'var(--cw-record)';
  const layer = `<g data-layer="${name}" class="part ${actor?'actor':'record'}">`;
  const face=part.svg.replace('/>',` fill="${expressive?`url(#${id}-face)`:material==='mono'?'currentColor':ink}"${expressive?` stroke="url(#${id}-rim)" stroke-width=".65"`:''}/>`);
  const body=expressive? `<g filter="url(#${id}-shadow)">${material==='depth'?`<g transform="translate(0 1.4)" fill="var(--cw-depth)">${part.svg}</g>`:''}${face}${part.svg.replace('/>',` fill="url(#${id}-light)" opacity="${material==='depth'?'.22':'.48'}"/>`)}</g>`:face;
  return `${layer}${material==='luminous'?`<g data-layer="glow" fill="#94b9e1" opacity=".16" filter="url(#${id}-glow)">${part.svg}</g>`:''}${body}</g>`;
 };
 let under='',over='';
 if(s.concept==='summon') under='<g data-layer="scene" class="hint" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 10V4h6M54 60h6v-6"/></g>';
 if(s.concept==='take-floor') under='<g data-layer="peers" class="hint" fill="currentColor"><rect x=".2" y="15" width="3" height="34" rx="1.5"/><rect x="21" y="19" width="2.7" height="27" rx="1.3"/></g>';
 if(s.concept==='retrieve') {under='<path data-layer="route" class="hint" d="M61 9v19c0 9-6 15-15 15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.5 3"/>';over='<circle data-layer="signal" cx="60" cy="10" r="2.1" fill="currentColor"/>';}
 if(s.concept==='scope') over='<path data-layer="boundary" d="M22 2h38v57H22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
 if(s.concept==='commit') {under='<path data-layer="durable-base" d="M25 60h35" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';over='<path data-layer="settled" d="m52 49 2.5 2.5 5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';}
 if(s.concept==='review') {under='<rect data-layer="comparison" x="31" y="41" width="19.2" height="9.6" rx="2.8" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".35"/>';over='<path data-layer="amendment" d="M28 59h19" fill="none" stroke="var(--cw-amend)" stroke-width="1.8" stroke-linecap="round"/>';}
 if(s.concept==='withdraw') under='<path data-layer="trace" d="M28 60h28" fill="none" stroke="currentColor" stroke-width="1" opacity=".38"/>';
 const authority=s.authority==='none'?'':`<g data-layer="authority" transform="translate(59 4)"><circle r="3.4" fill="var(--cw-background)" stroke="currentColor" stroke-width="1.2"/>${s.authority==='revoked'?'<path d="m-2 2 4-4" stroke="currentColor" stroke-width="1.2"/>':s.authority==='requested'?'<circle r="1" fill="currentColor"/>':'<path d="m-1.5 0 1 1 2-2" fill="none" stroke="currentColor" stroke-width="1"/>'}</g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.size}" height="${s.size}" viewBox="-3 -3 70 70" role="img" aria-labelledby="${id}-title" data-concept="${s.concept}" data-material="${material}" data-requested-material="${s.material}" data-presence="${s.presence}" data-authority="${s.authority}" data-activity="${s.activity}" data-theme="${s.theme}" data-geometry-sha256="${geometryHash}">
 <title id="${id}-title">${esc(title)}</title>
 <style>
 :root,svg{--cw-ink:${dark?'#e0e8f1':'#283849'};--cw-record:${dark?'#b4c0ce':'#6f8191'};--cw-depth:${dark?'#273343':'#172638'};--cw-background:${dark?'#161b23':'#f9fafb'};--cw-amend:${dark?'#d7b1a2':'#865a4f'};color:var(--cw-color,var(--cw-ink));overflow:visible}
 .hint{opacity:.28}.part{transform-box:fill-box;transform-origin:center}.record{transform-origin:left center}
 [data-presence="available"] .actor{opacity:.38}[data-presence="absent"] .actor{opacity:0}
 [data-concept="commit"] [data-layer="settled"]{opacity:0}[data-concept="commit"][data-activity="complete"] [data-layer="settled"]{opacity:1}
 [data-authority="requested"] [data-layer="boundary"]{stroke-dasharray:3 3}[data-authority="revoked"] [data-layer="boundary"]{opacity:.4}
 @media(forced-colors:active){.part rect{fill:CanvasText!important;stroke:none!important;filter:none!important}[filter]{filter:none!important}[data-layer="glow"]{display:none}}
 @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
 </style>
 ${definitions(id,material,dark)}
 ${under}
 ${parts.map(core).join('')}${over}${authority}
 </svg>`;
}
