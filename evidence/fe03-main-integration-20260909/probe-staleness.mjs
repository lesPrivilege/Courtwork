// Astra integration probe: a late directory response belongs to its request,
// not to edited fields. Synthetic loopback only; no persisted configuration.
import http from 'node:http';
import {writeFile} from 'node:fs/promises';
import {cdp,evaluate as ev,waitFor,close,ORIGIN,sleep} from './browser.mjs';
let pending=null;
const upstream=http.createServer((req,res)=>{pending={req,res};});
await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${upstream.address().port}`;
const results=[];
const read=()=>ev(`(()=>{const n=document.querySelector('.connection-probe-result');return {hidden:n.hidden,text:n.textContent};})()`);
const input=async(selector,value,event='input')=>ev(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.value=${JSON.stringify(value)};n.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));})()`);
try {
 await cdp('Page.navigate',{url:ORIGIN+'/?stale-probe=1#settings/models'});
 await waitFor('window.__V5_UI__?.state.home.data');
 await ev(`document.querySelector('.connection-add').open=true;document.querySelector('#connection-path-compatible').click()`);await sleep(300);
 for(const kind of ['address','key','provider']) {
  await input('input[name="baseUrl"]',base+'/v1');
  await input('input[type="password"]','');
  pending=null;
  await ev(`document.querySelector('[data-focus-key="connection:test"]').click()`);
  for(let i=0;!pending&&i<100;i++)await sleep(50);
  if(!pending)throw Error('No delayed upstream request');
  if(kind==='address')await input('input[name="baseUrl"]',base+'/changed');
  if(kind==='key')await input('input[type="password"]','synthetic-replacement-key');
  if(kind==='provider')await input('select[name="provider"]','deepseek','change');
  const afterEdit=await read();
  pending.res.writeHead(200,{'content-type':'application/json'});
  pending.res.end(JSON.stringify({data:[{id:'old-request-model'}]}));
  await sleep(600);
  const afterResponse=await read();
  results.push({name:'late response after '+kind+' edit',pass:afterEdit.hidden&&afterResponse.hidden,afterEdit,afterResponse});
 }
} catch(error){results.push({name:'exception',pass:false,error:error.stack});}
finally {
 if(pending&&!pending.res.writableEnded)pending.res.end('{}');
 await close();await new Promise(resolve=>upstream.close(resolve));
 await writeFile(new URL(process.env.PROBE_RESULT || './probe-staleness.json',import.meta.url),JSON.stringify({results},null,2));
}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
