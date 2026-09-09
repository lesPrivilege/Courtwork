import http from 'node:http';
import { writeFile } from 'node:fs/promises';
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from './browser.mjs';
const results=[]; let calls=0; const requests=[];
const fixture=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c;const rpc=JSON.parse(raw);requests.push(rpc.method);
 if(rpc.id===undefined){res.writeHead(202);res.end();return;}
 if(rpc.method==='tools/call'){calls++;res.destroy();return;}
 const data=rpc.method==='server/discover'?{supportedVersions:['2026-07-28'],capabilities:{tools:{}}}:rpc.method==='tools/list'?{tools:[{name:'effect',description:'Synthetic unknown effect',inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text']}}]}:{};
 res.setHeader('content-type','application/json');res.end(JSON.stringify({jsonrpc:'2.0',id:rpc.id,result:{resultType:'complete',ttlMs:0,cacheScope:'private',...data}}));
});
await new Promise(r=>fixture.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${fixture.address().port}`;
async function api(path,method='GET',body){return ev(`window.__V5_UI__.request(${JSON.stringify(path)},${JSON.stringify({method,...(body?{body}:{})})})`);}
const state='window.__V5_UI__.state';
async function send(input){const old=await ev(`${state}.runs.map(r=>r.id)`);await ev(`(()=>{const i=document.querySelector('#composer-input');i.value=${JSON.stringify(input)};i.dispatchEvent(new Event('input',{bubbles:true}));i.form.requestSubmit();})()`);return waitFor(`${state}.runs.find(r=>!${JSON.stringify(old)}.includes(r.id))`);}
try{
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url:ORIGIN});await waitFor('window.__V5_UI__?.state.projects.length');
 await ev(`(document.querySelector('.home-row')||document.querySelector('.session-button')).click()`);await waitFor('window.__V5_UI__.state.activeSessionId');
 const initial=await send('Synthetic MCP browser run');await waitFor(`${state}.runs.find(r=>r.id===${JSON.stringify(initial.id)}&&r.status==='completed')`);
 const suffix='?sessionId='+initial.sessionId; const resourceId='local:unknown-'+initial.sessionId;
 const get=()=>api('/runtime-control'+suffix);
 const change=async body=>api('/runtime-control'+suffix,'PUT',{revision:(await get()).revision,...body});
 const scope={type:'session',id:initial.sessionId};
 await change({operation:'put',resource:{id:resourceId,kind:'mcp_server',title:'Synthetic unknown fixture',scope,content:JSON.stringify({transport:'streamable-http',protocol:'2026-07-28',url})}});
 await api('/mcp/'+encodeURIComponent(resourceId)+'/lifecycle'+suffix,'POST',{action:'connect',revision:(await get()).revision});
 await change({operation:'exposure',id:resourceId,scope,exposed:true});
 const tool=(await get()).resources.find(r=>r.mcp?.serverId===resourceId);
 const call={name:tool.executionName,arguments:{text:'synthetic effect'}};
 const run=await send('/fixture script '+JSON.stringify([call,call]));
 await waitFor(`${state}.runs.find(r=>r.id===${JSON.stringify(run.id)}&&r.status==='waiting_user')`);
 const card=await ev(`document.querySelector('.permission-card')?.innerText`);
 results.push({name:'remote permission identifies frozen action and source',pass:card.includes('Allow this remote tool call?')&&card.includes('effect · '+resourceId)&&card.includes(url)&&!card.includes('file write'),card,tool});
 await writeFile(new URL('./mcp-permission.png',import.meta.url),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await ev(`document.querySelector('[data-focus-key$=":allow"]').click()`);
 const done=await waitFor(`${state}.runs.find(r=>r.id===${JSON.stringify(run.id)}&&r.status==='unknown')`,30000);
 await sleep(500);
 results.push({name:'lost MCP response remains unknown',pass:(await api('/runs/'+run.id)).run.error?.code==='mcp_effect_unknown'&&calls===1,run:(await api('/runs/'+run.id)).run,uiRun:done,calls,dom:await ev('document.body.innerText')});
 await cdp('Page.reload');await waitFor('window.__V5_UI__?.state.projects.length');
 await ev(`(document.querySelector('.home-row')||document.querySelector('.session-button')).click()`);
 await waitFor(`${state}.runs.some(r=>r.id===${JSON.stringify(run.id)}&&r.status==='unknown')`);
 results.push({name:'reload does not replay remote effect',pass:calls===1,calls,dom:await ev('document.body.innerText')});
 await writeFile(new URL('./mcp-unknown.png',import.meta.url),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
}catch(error){results.push({name:'exception',pass:false,error:error.stack,dom:await ev('document.body.innerText').catch(()=>null)});process.exitCode=1;}
finally{if(results.some(r=>r.pass===false))process.exitCode=1;await writeFile(new URL('./mcp-unknown.json',import.meta.url),JSON.stringify({results,requests},null,2));await close();await new Promise(r=>fixture.close(r));}
