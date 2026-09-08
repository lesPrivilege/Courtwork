import './src/court-symbol.mjs';
const names={mono:'Monochrome',hierarchical:'Hierarchical',glass:'Optical glass',depth:'Shallow depth',luminous:'Luminous edge'};
const specimens=[
 ['summon','召入 · Summon','能力进入场景，记录仍然立定。'],
 ['take-floor','发言 · Take the floor','提升当前参与者，保留其他在场者。'],
 ['write','书写 · Write','三行从左至右，依次进入记录。'],
 ['retrieve','召回 · Retrieve','线索向内返回，来源保留可见。'],
 ['scope','限定 · Scope','边界独立于可见性，不以高亮授予权限。'],
 ['commit','固化 · Commit','提案落定；正式接受由宿主状态明确。'],
 ['review','审改 · Review','并置差异，保留对照和修改痕迹。'],
 ['withdraw','离场 · Withdraw','参与者退场，已经形成的记录留下。']
];
for(const [material,title] of Object.entries(names))document.getElementById('materials').insertAdjacentHTML('beforeend',`<div class="material-tile"><court-symbol size="72" concept="write" material="${material}" theme="${material==='luminous'?'dark':'light'}" label="${title} 品牌材质"></court-symbol><span>${title}</span></div>`);
for(const [i,[concept,title,description]] of specimens.entries())document.getElementById('specimens').insertAdjacentHTML('beforeend',`<article class="specimen"><div class="specimen-top"><span>0${i+1}</span><button class="play" aria-label="播放${title}" data-verb="${concept}"><span aria-hidden="true">↗</span></button></div><div class="specimen-art"><court-symbol size="80" concept="${concept}" material="glass" activity="${concept==='commit'?'complete':'idle'}" authority="${concept==='scope'?'scoped':'none'}" label="${title}"></court-symbol></div><h3>${title}</h3><p>${description}</p></article>`);
for(const size of [16,20,24,32,48,64])document.getElementById('sizes').insertAdjacentHTML('beforeend',`<div class="size-item"><court-symbol size="${size}" material="glass" label="${size} 像素品牌标记"></court-symbol><span>${size} px</span></div>`);
const themeButton=document.getElementById('theme');
themeButton.addEventListener('click',()=>{
 const dark=document.body.dataset.theme!=='dark';document.body.dataset.theme=dark?'dark':'light';themeButton.setAttribute('aria-pressed',String(dark));themeButton.textContent=dark?'浅色':'深色';
 document.querySelectorAll('court-symbol').forEach(el=>el.setAttribute('theme',el.getAttribute('material')==='luminous'&&el.closest('#materials')?'dark':dark?'dark':'light'));
});
document.getElementById('material').addEventListener('change',e=>document.querySelectorAll('#specimens court-symbol').forEach(el=>el.setAttribute('material',e.target.value)));
document.getElementById('hero-play').addEventListener('click',()=>document.getElementById('hero-symbol').play('write',{explanatory:true}));
document.querySelectorAll('.play').forEach(button=>button.addEventListener('click',async()=>{
 const card=button.closest('.specimen'), symbol=card.querySelector('court-symbol');
 symbol.setAttribute('presence',button.dataset.verb==='withdraw'?'absent':'present');
 card.setAttribute('data-playing','');await symbol.play(button.dataset.verb,{explanatory:true});card.removeAttribute('data-playing');
}));
const mq=matchMedia('(prefers-reduced-motion: reduce)');const note=()=>{document.getElementById('motion-note').textContent=mq.matches?'减少动态已启用 · 直接显示最终状态':'按需播放 · 不自动循环';};mq.addEventListener('change',note);note();
