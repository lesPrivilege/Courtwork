// Astra: cold Settings deep links must not send unauthorized reads; empty
// resource explanation must not turn missing values into visible text nodes.
import {writeFile} from 'node:fs/promises';
import {cdp,evaluate as ev,waitFor,close,ORIGIN,sleep,observations} from './browser.mjs';
const results=[];
try {
 await cdp('Network.enable');
 for(const section of ['general','appearance','models','tools','skills','memory','permissions','keyboard','developer']) {
  const start=observations.responses.length;
  await cdp('Page.navigate',{url:ORIGIN+'/?wk98='+section+'#settings/'+section});
  await waitFor('window.__V5_UI__?.state.token && window.__V5_UI__.state.home.data');
  await sleep(700);
  const responses=observations.responses.slice(start).filter(r=>r.url.includes('/api/v5/'));
  const unauthorized=responses.filter(r=>r.status===401);
  const rendered=await ev(`!document.querySelector('#settings-${section}').hidden`);
  results.push({id:'WK98-deeplink-'+section,pass:rendered&&responses.some(r=>r.url.endsWith('/bootstrap'))&&unauthorized.length===0,unauthorized,apiReads:responses.length});
 }
 await ev(`location.hash='#settings/tools'`);await waitFor(`document.querySelector('[data-resource="tool:ws_write"] .runtime-row-title')`);
 await ev(`document.querySelector('[data-resource="tool:ws_write"] .runtime-row-title').click()`);await sleep(300);
 const detail=await ev(`(()=>{const root=document.querySelector('[data-resource="tool:ws_write"]');const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const missing=[];while(walker.nextNode())if(/^(null|undefined)$/.test(walker.currentNode.textContent.trim()))missing.push(walker.currentNode.textContent);return {text:root.textContent,missing,layers:!!root.querySelector('[data-layers]')};})()`);
 results.push({id:'WK98-empty-explanation',pass:detail.layers&&detail.missing.length===0,detail});
} catch(error){results.push({id:'exception',pass:false,error:error.stack});}
finally {await writeFile(new URL('./wk98-regression.json',import.meta.url),JSON.stringify({results,exceptions:observations.exceptions},null,2));await close();}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failures:results.filter(r=>!r.pass)},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
