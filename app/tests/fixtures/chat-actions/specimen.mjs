import { el, installTooltips } from '/web/ui-controls.mjs';
import { createChatActions } from '/web/chat-actions.mjs';
import { createDemoActionAdapter } from './adapter.mjs';
const result=document.querySelector('#result'), response=document.querySelector('#response'), messages=document.querySelector('#messages');
let generation=0;
function render() {
  const epoch=++generation;
  messages.replaceChildren();
  for (const role of ['user','assistant','file']) {
    const target={key:`demo:${epoch}:${role}`,role,sessionId:'synthetic-chat',runId:'synthetic-run',projectionId:`synthetic-${role}`,path:'brief.md',sha256:'a'.repeat(64),
      text:role==='user'?'Compare the two proposals and explain the trade-offs.':response.value==='long'?'The revised proposal keeps the original review evidence and makes the next decision clear.\n\n'.repeat(24):'The revised proposal separates the delivery date from the review decision. Keep both visible so the next person can trace the result.',pending:role==='assistant'&&response.value==='streaming'};
    const adapter=createDemoActionAdapter({mode:()=>result.value});
    messages.append(el('article',{},el('h2',{text:role==='file'?'Recorded file · brief.md':role==='user'?'You':'Courtwork'}),role==='file'?null:el('p',{text:target.text}),createChatActions({target,adapter,getTarget:()=>generation===epoch?target:null})));
  }
}
document.querySelector('#theme').addEventListener('change',event=>document.documentElement.dataset.theme=event.target.value);
result.addEventListener('change',render);response.addEventListener('change',render);document.querySelector('#reset').addEventListener('click',render);
installTooltips();render();
