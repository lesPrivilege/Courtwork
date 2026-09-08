import {cdp,evaluate as ev,waitFor,viewport,sleep,close,ORIGIN} from './harness.mjs';
import {writeFile} from 'node:fs/promises';
const results=[];
try {
 await cdp('Page.navigate',{url:ORIGIN});await waitFor('window.__V5_UI__?.state.projects.length > 0');
 await ev(`(async()=>{document.querySelectorAll('.project-toggle').forEach(t=>{if(t.getAttribute('aria-expanded')==='false')t.click()});await new Promise(r=>setTimeout(r,500));[...document.querySelectorAll('.session-button')].find(b=>b.textContent.includes('Memo review')).click()})()`);await sleep(1500);
 for(const width of [1440,1024,1023,800,390]){
  await viewport(width,900);await sleep(300);
  await ev(`(()=>{const s=window.__V5_UI__.state.surface;if(!s.open)document.getElementById('show-surface-button').click();if(!s.expanded)document.getElementById('surface-expand-button').click()})()`);await sleep(900);
  const expanded=await ev(`(()=>{const chat=document.querySelector('.chat-panel'),nav=document.getElementById('navigation-panel'),p=document.getElementById('surface-panel');document.getElementById('composer-input').focus();return {chatInert:chat.inert,chatHidden:chat.getAttribute('aria-hidden'),navInert:nav.inert,modal:p.getAttribute('aria-modal'),focusInChat:chat.contains(document.activeElement)}})()`);
  await ev(`document.getElementById('close-surface-button').click()`);await sleep(300);
  const restored=await ev(`!document.querySelector('.chat-panel').inert`);
  results.push({width,expanded,restored,pass:expanded.chatInert&&expanded.chatHidden==='true'&&!expanded.focusInChat&&expanded.navInert===(width<1024)&&(expanded.modal==='true')===(width<1024)&&restored});
 }
 await writeFile(new URL('./overlay.json',import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await close()}
