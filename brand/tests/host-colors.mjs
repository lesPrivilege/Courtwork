import '../src/court-symbol.mjs';
const samples=document.querySelector('#samples');
const palettes={light:{ink:'rgb(28, 32, 36)',record:'rgb(96, 100, 108)',defaults:['rgb(40, 56, 73)','rgb(111, 129, 145)']},dark:{ink:'rgb(237, 238, 240)',record:'rgb(176, 180, 186)',defaults:['rgb(224, 232, 241)','rgb(180, 192, 206)']}};
for(const theme of ['light','dark']){
 const panel=document.createElement('section');panel.className=`panel ${theme}`;panel.innerHTML=`<h2>${theme}</h2>`;
 for(const host of [false,true])for(const size of [16,20])panel.insertAdjacentHTML('beforeend',`<div class="sample ${host?'host':'default'}"><court-symbol concept="write" material="hierarchical" theme="${theme}" size="${size}"></court-symbol><span>${host?'宿主 token':'包默认'} · ${size}px</span></div>`);
 samples.append(panel);
}
const fill=(s,selector)=>getComputedStyle(s.shadowRoot.querySelector(selector)).fill;
const assert=(ok,message)=>{if(!ok)throw Error(message)};
function luminance(rgb){return rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0)}
document.querySelector('#run').onclick=()=>{
 const checks=[];const check=(name,fn)=>{try{checks.push({name,status:'pass',...fn()})}catch(e){checks.push({name,status:'fail',message:e.message})}};
 for(const theme of ['light','dark'])for(const size of [16,20])check(`${theme} ${size}px defaults and host colors`,()=>{
  const p=palettes[theme],s=document.querySelector(`.${theme} .host court-symbol[size="${size}"]`),d=document.querySelector(`.${theme} .default court-symbol[size="${size}"]`);
  assert(fill(d,'.actor rect')===p.defaults[0]&&fill(d,'.record rect')===p.defaults[1],'standalone defaults changed');
  assert(fill(s,'.actor rect')===p.ink&&[...s.shadowRoot.querySelectorAll('.record rect')].every(r=>getComputedStyle(r).fill===p.record),'host palette blocked');
  assert(!s.shadowRoot.querySelector('[filter]'),'small glyph uses filter');
  const bg=getComputedStyle(s.closest('.panel')).backgroundColor, l1=luminance(p.record),l2=luminance(bg),contrast=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  assert(contrast>=4.5,'record contrast under 4.5');return {actor:p.ink,record:p.record,recordContrast:contrast};
 });
 check('host CSS update and attribute rerender preserve inheritance',()=>{
  const s=document.querySelector('.light .host court-symbol'),svg=s.shadowRoot.querySelector('svg');s.style.setProperty('--cw-record','#000000');assert(fill(s,'.record rect')==='rgb(0, 0, 0)','CSS update failed');assert(s.shadowRoot.querySelector('svg')===svg,'CSS update rebuilt view');s.setAttribute('label','updated');assert(fill(s,'.record rect')==='rgb(0, 0, 0)','rerender lost override');s.style.removeProperty('--cw-record');assert(fill(s,'.record rect')===palettes.light.record,'reset lost inherited token');
 });
 check('same mounted host follows light to dark token changes',()=>{
  const panel=document.querySelector('.panel.light'),s=panel.querySelector('.host court-symbol'),d=panel.querySelector('.default court-symbol');
  try{panel.classList.replace('light','dark');s.setAttribute('theme','dark');d.setAttribute('theme','dark');assert(fill(s,'.actor rect')===palettes.dark.ink&&fill(s,'.record rect')===palettes.dark.record,'theme tokens did not update');assert(fill(d,'.actor rect')===palettes.dark.defaults[0],'default theme did not update');}finally{panel.classList.replace('dark','light');s.setAttribute('theme','light');d.setAttribute('theme','light')}
 });
 check('background, depth, amendment and mono use host tokens',()=>{
  const s=document.createElement('court-symbol');s.setAttribute('concept','review');s.setAttribute('material','depth');s.setAttribute('size','48');s.setAttribute('authority','requested');s.style.cssText='--cw-ink:#112233;--cw-record:#445566;--cw-background:#778899;--cw-depth:#334455;--cw-amend:#556677';samples.append(s);
  try{assert(fill(s,'[data-layer="authority"] circle')==='rgb(119, 136, 153)','background blocked');assert(fill(s,'.actor g[transform] rect')==='rgb(51, 68, 85)','depth blocked');assert(getComputedStyle(s.shadowRoot.querySelector('[data-layer="amendment"]')).stroke==='rgb(85, 102, 119)','amend blocked');s.setAttribute('material','mono');assert(fill(s,'.actor rect')==='rgb(17, 34, 51)','mono ink blocked');}finally{s.remove()}
 });
 document.querySelector('#result').textContent=JSON.stringify({checks,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length},null,2);
};
