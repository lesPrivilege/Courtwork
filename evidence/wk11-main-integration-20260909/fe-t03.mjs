// Astra integration probe: actual HTTP authority plus browser profile/policy controls.
import {writeFile} from 'node:fs/promises';
import {cdp,evaluate as ev,waitFor,close,ORIGIN,sleep} from './browser.mjs';
const results=[];
const record=(name,pass,detail)=>results.push({name,pass,detail});
const api=(p,method='GET',body)=>ev(`window.__V5_UI__.request(${JSON.stringify(p)},${JSON.stringify({method,...(body?{body}:{})})})`);
try {
 await cdp('Page.navigate',{url:ORIGIN});
 await waitFor('window.__V5_UI__?.state.projects.length');
 await ev(`[...document.querySelectorAll('.home-row,.session-button')].find(n=>n.textContent.includes('Runtime control')).click()`);
 await waitFor('document.querySelector(".session-button.active")');
 const sid=await ev('window.__V5_UI__.state.activeSessionId');
 if(!sid) throw Error('No active session');
 const q='?sessionId='+sid, scope={type:'session',id:sid};
 const snap=()=>api('/runtime-control'+q);
 const change=async b=>api('/runtime-control'+q,'PUT',{revision:(await snap()).revision,...b});
 const created=await api('/sessions/'+sid+'/runs','POST',{commandId:'astra-fe03-'+Date.now(),input:'Synthetic profile binding baseline'});
 const rid=created.run.id;
 for(let i=0;i<150;i++){const r=await api('/runs/'+rid);if(r.run.status==='completed')break;await sleep(100);if(i===149)throw Error('Run did not complete');}
 const before=await api('/runtime-context'+q+'&runId='+rid);
 await change({operation:'policy',scope:{type:'user',id:'local'},rules:[{action:'ws_write',resource:'*',effect:'deny'}]});
 await change({operation:'exposure',id:'tool:ws_write',scope,exposed:true});
 await cdp('Page.reload');await waitFor('window.__V5_UI__?.state.projects.length');
 await ev(`[...document.querySelectorAll('.home-row,.session-button')].find(n=>n.textContent.includes('Runtime control')).click()`);await waitFor(`window.__V5_UI__.state.runs.some(r=>r.id==='${rid}')`);
 await ev(`location.hash='#settings/runtime'`);await waitFor('document.querySelector("#runtime-profile-select")');await sleep(800);
 await ev(`document.querySelector('.runtime-scope-tab[data-scope="session"]').click()`);
 await ev(`(()=>{const n=document.querySelector('#runtime-profile-select');n.value='local:reader';n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await waitFor(`document.querySelector('[data-layers="composition"]')?.textContent.includes('local:reader')`);await sleep(600);
 let live=await snap();record('FE-T03 profile selection reaches authoritative composition',live.composition.id==='local:reader',{composition:live.composition.id});
 await ev(`document.querySelector('[data-focus-key="binding:${rid}"]').click()`);await sleep(500);
 await ev(`document.querySelector('[data-resource="tool:ws_write"] .runtime-row-title').click()`);await sleep(500);
 const layers=await ev(`(()=>{const r=document.querySelector('[data-layers="tool:ws_write"]');return [...r.querySelectorAll('dt')].map(n=>[n.textContent,n.nextElementSibling.textContent]);})()`);
 const vals=Object.fromEntries(layers);
 record('FE-T03 requested exposure remains distinct from effective ceiling',vals.Requested?.includes('Exposed — your session override, recorded')&&vals.Effective?.includes('Not exposed to the next run'),layers);
 const after=await api('/runtime-context'+q+'&runId='+rid);
 const boundText=await ev(`document.querySelector('[data-layers="composition"]').textContent`);
 record('FE-T03 profile edit preserves historical binding',JSON.stringify(before.binding)===JSON.stringify(after.binding)&&boundText.includes(before.binding.composition.id),{before:before.binding.composition.id,after:after.binding.composition.id,boundText});
 // Restore unrestricted composition so exposure cannot mask the policy test.
 await ev(`(()=>{const n=document.querySelector('#runtime-profile-select');n.value='agent:general';n.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(700);
 live=await snap();if(!live.resources.find(r=>r.id==='tool:ws_write').exposed)throw Error('Policy probe masked by exposure');
 // Attempt a narrower allow through the actual editor; parent deny must win.
 await ev(`document.querySelector('[data-focus-key="policy:add"]').click()`);
 await ev(`(()=>{for(const [k,v] of [['action','ws_write'],['resource','*'],['effect','allow']]){const n=document.querySelector('[data-focus-key="policy:'+k+':0"]');n.value=v;n.dispatchEvent(new Event(k==='effect'?'change':'input',{bubbles:true}));}document.querySelector('[data-focus-key="policy:save"]').click();})()`);await sleep(700);
 const evaluation=await api('/runtime-permissions/evaluate'+q,'POST',{resourceId:'tool:ws_write',resource:'out/probe.md'});
 const text=await ev('document.querySelector("#settings-runtime").textContent');
 record('FE-T03 narrower allow cannot loosen user deny',evaluation.effect==='deny'&&!evaluation.trace.some(t=>t.source==='exposure')&&/cannot|loosen|deny/i.test(text),{evaluation,alerts:await ev(`[...document.querySelectorAll('#settings-runtime [role="alert"]')].map(n=>n.textContent)`)});
} catch(e){record('exception',false,e.stack);} finally {
 await writeFile(new URL('./fe-t03.json',import.meta.url),JSON.stringify({results},null,2));await close();
}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
