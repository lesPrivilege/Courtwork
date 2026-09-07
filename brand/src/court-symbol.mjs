import { renderSymbol, normalize, concepts } from './symbol.mjs';
let sequence=0;
export class CourtSymbol extends HTMLElement {
 static observedAttributes=['concept','material','size','presence','authority','activity','theme','label'];
 #animations=[]; #generation=0; #id=`cw-${++sequence}`; #mq=matchMedia('(prefers-reduced-motion: reduce)');
 #reduce=()=>{if(this.#mq.matches)this.stop();};
 #visibility=()=>{if(document.hidden)this.stop();};
 constructor(){super();this.attachShadow({mode:'open'});}
 connectedCallback(){this.#mq.addEventListener('change',this.#reduce);document.addEventListener('visibilitychange',this.#visibility);this.#render();}
 disconnectedCallback(){this.stop();this.#mq.removeEventListener('change',this.#reduce);document.removeEventListener('visibilitychange',this.#visibility);}
 attributeChangedCallback(){if(this.isConnected)this.#render();}
 get state(){return normalize(Object.fromEntries(CourtSymbol.observedAttributes.filter(a=>this.hasAttribute(a)).map(a=>[a,this.getAttribute(a)])));}
 #render(){
  this.stop();
  try{this.shadowRoot.innerHTML=`<style>:host{display:inline-flex;flex:none;vertical-align:middle;line-height:0}svg{display:block}</style>${renderSymbol({...this.state,idPrefix:this.#id})}`;this.removeAttribute('data-error');}
  catch(error){this.shadowRoot.textContent='';this.setAttribute('data-error',error.message);this.dispatchEvent(new CustomEvent('symbol-error',{detail:error}));}
 }
 stop(){this.#generation++;for(const a of this.#animations)a.cancel();this.#animations=[];this.removeAttribute('data-playing');}
 /** Presentation only. Host-owned presence/authority/activity never change here. */
 async play(verb=this.getAttribute('concept')??'write',{explanatory=false}={}) {
  if(!concepts.includes(verb))throw new TypeError(`Unsupported motion verb: ${verb}`);
  this.stop();if(!this.isConnected||this.#mq.matches||document.hidden)return {status:'static'};
  const generation=this.#generation;
  const root=this.shadowRoot;const duration=explanatory?440:140;const stagger=explanatory?100:40;
  const easing='cubic-bezier(0.23, 1, 0.32, 1)';
  const animate=(selector,frames,extra={})=>{for(const el of root.querySelectorAll(selector))this.#animations.push(el.animate(frames,{duration,easing,fill:'none',...extra}));};
  const actor='[data-layer="actor"]';const lines='.record';
  switch(verb){
   case 'summon':animate(actor,[{transform:'translateY(8%)',opacity:0},{transform:'translateY(0)',opacity:1}]);break;
   case 'take-floor':animate(actor,[{transform:'translateY(0)'},{transform:'translateY(-3%)',offset:.5},{transform:'translateY(0)'}]);animate('[data-layer="peers"]',[{opacity:.28},{opacity:.1,offset:.5},{opacity:.28}]);break;
   case 'write':for(let i=1;i<=3;i++)animate(`[data-layer="line line-${i}"]`,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{delay:(i-1)*stagger,fill:'backwards'});break;
   case 'retrieve':animate('[data-layer="signal"]',[{transform:'translate(0,0)',opacity:1},{transform:'translate(0,20px)',opacity:1,offset:.45},{transform:'translate(-13px,33px)',opacity:0}]);break;
   case 'scope':animate('[data-layer="boundary"]',[{clipPath:'inset(0 0 100% 0)',opacity:.2},{clipPath:'inset(0)',opacity:1}]);break;
   case 'commit':animate(lines,[{transform:'translateY(-9%)',opacity:.4},{transform:'translateY(0)',opacity:1}]);animate('[data-layer="durable-base"]',[{opacity:.15},{opacity:1}]);break;
   case 'review':animate('[data-layer="comparison"]',[{transform:'translate(0,0)',opacity:.35},{transform:'translate(-3px,3px)',opacity:.12}]);animate('[data-layer="amendment"]',[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],{delay:stagger});break;
   case 'withdraw':animate(actor,[{transform:'translateY(0)',opacity:1},{transform:'translateY(-8%)',opacity:0}]);break;
  }
  this.setAttribute('data-playing',verb);
  await Promise.allSettled(this.#animations.map(a=>a.finished));
  if(generation!==this.#generation)return {status:'interrupted'};
  for(const a of this.#animations)a.cancel();this.#animations=[];this.removeAttribute('data-playing');
  this.dispatchEvent(new CustomEvent('symbol-motion-end',{detail:{verb},bubbles:true}));return {status:'finished'};
 }
}
if(!customElements.get('court-symbol'))customElements.define('court-symbol',CourtSymbol);
