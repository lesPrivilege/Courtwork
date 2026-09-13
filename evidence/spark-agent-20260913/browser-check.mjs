import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||pathToFileURL(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'playwright/index.mjs')).href);
const origin=process.env.CW_BROWSER_ORIGIN||'http://127.0.0.1:54327',out=new URL('./browser/',import.meta.url);await mkdir(out,{recursive:true});
const token=(await(await fetch(origin+'/api/v5/bootstrap')).json()).sessionToken;
async function api(p,body){const r=await fetch(origin+'/api/v5'+p,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-work-token':token},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,200,p);return r.json();}
const project=(await api('/projects',{name:'Spark source comparison'})).project;
const parent=(await api('/sessions',{projectId:project.id,title:'Compare retained delivery drafts'})).session;
for(const [name,text] of [['draft-a.txt','Delivery within 30 days.'],['draft-b.txt','Delivery within 45 days.']])await api(`/sessions/${parent.id}/materials`,{name,text,commandId:randomUUID()});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));const record=(name)=>{checks.push({name,pass:true});console.log('PASS '+name);};
const dialog=page.getByRole('dialog',{name:'Spark Explore',exact:true});
async function shot(name){await page.waitForTimeout(350);await page.screenshot({path:new URL(`${name}.png`,out).pathname,fullPage:true});}
try{
 await page.goto(origin);const intro=page.getByRole('button',{name:'Close the example',exact:true});if(await intro.isVisible())await intro.click();
 await page.locator(`#recent-list [data-recent-id="${parent.id}"]`).click();await page.getByRole('region',{name:'Subagents',exact:true}).waitFor();
 await shot('chat-light-1440');await page.getByRole('button',{name:'Ask Spark',exact:true}).click();await dialog.getByRole('textbox',{name:'Explore brief'}).waitFor();
 assert.equal(await dialog.getByRole('checkbox').count(),2);record('Chat right rail opens the same Host source directory');
 await dialog.getByRole('textbox',{name:'Explore brief'}).fill('Compare the delivery timing in these exact retained drafts');for(const c of await dialog.getByRole('checkbox').all())await c.check();
 await shot('sources-light-1440');
 // Persisted assignment identity must survive an intentionally lost HTTP receipt.
 let lost=false;await page.route('**/api/v5/subagents',async route=>{if(route.request().method()==='POST'&&!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await dialog.getByRole('button',{name:'Start exploration',exact:true}).click();await dialog.getByRole('status').filter({hasText:/fetch|request|network|runtime/i}).waitFor();
 await dialog.getByRole('button',{name:'Start exploration',exact:true}).click();await page.unroute('**/api/v5/subagents');
 for(let n=0;n<80;n++){const a=(await api('/subagents')).assignments.find(a=>a.parentSessionId===parent.id);if(a?.status==='resolved')break;await page.waitForTimeout(100);}
 await dialog.getByRole('button',{name:'Refresh',exact:true}).click();await dialog.getByText('Findings ready',{exact:true}).waitFor();
 const assignments=(await api('/subagents')).assignments.filter(a=>a.parentSessionId===parent.id);assert.equal(assignments.length,1);assert.equal(assignments[0].attempts.length,1);assert.equal(assignments[0].sourceReads.length,2);record('Lost creation receipt retries one assignment and one child attempt');
 await dialog.getByRole('button',{name:/Read local note/}).click();await dialog.getByText(/Source 0: delivery in 30 days/).waitFor();
 await dialog.getByRole('button',{name:/Read source 1/}).click();await dialog.getByText('Delivery within 30 days.',{exact:true}).waitFor();record('Findings expand exact sources and immutable local notes');
 await dialog.getByRole('button',{name:'Make available in project',exact:true}).click();await dialog.getByRole('button',{name:/Remove project access/}).waitFor();assert.equal((await api('/subagents/mounts')).mounts.filter(m=>m.enabled&&m.assignmentId===assignments[0].id).length,1);record('Explicit project mount reflects persisted state');
 await dialog.getByRole('button',{name:/Remove project access/}).click();await dialog.getByRole('button',{name:/Remove project access/}).waitFor({state:'hidden'});assert.equal((await api('/subagents/mounts')).mounts.filter(m=>m.enabled&&m.assignmentId===assignments[0].id).length,0);record('Revocation removes project access without deleting findings');
 for(const width of [1440,1280,390])for(const scheme of ['light','dark']){
  await page.setViewportSize({width,height:900});await page.evaluate(scheme=>window.__cwPrefs.apply({...window.__cwPrefs.value,scheme}),scheme);
  await shot(`findings-${scheme}-${width}`);const bounds=await dialog.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);assert(await dialog.locator('.observation-dialog-body').evaluate(e=>e.scrollWidth<=e.clientWidth+1));record(`Findings, controls and reading area fit ${scheme} ${width}`);
 }
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await shot('findings-forced-colors-390');await page.emulateMedia({forcedColors:'none'});record('Forced colors and reduced motion candidate captured');
 await dialog.getByRole('button',{name:'Close',exact:true}).press('Escape');assert.equal(await dialog.isVisible(),false);await page.waitForTimeout(150);console.log('FOCUS '+await page.evaluate(()=>document.activeElement?.outerHTML.slice(0,500)));assert.equal(await page.getByRole('button',{name:'Ask Spark',exact:true}).evaluate(e=>e===document.activeElement),true);record('Escape returns focus to the Chat rail opener');
 await page.setViewportSize({width:1440,height:900});await page.locator('#spark-button').click();await dialog.locator(`[data-assignment-id="${assignments[0].id}"]`).click();await dialog.getByText('Findings ready',{exact:true}).waitFor();record('Independent Spark entry opens the same assignment');
 await dialog.getByRole('button',{name:'Return to main chat',exact:true}).click();await page.locator('#session-title-text').filter({hasText:parent.title}).waitFor();record('Findings return to the original main Chat');
 await page.locator('#spark-button').click();await dialog.getByRole('button',{name:'Disable Spark',exact:true}).click();await dialog.getByRole('button',{name:'Enable Spark',exact:true}).waitFor();assert.equal(await dialog.getByRole('button',{name:'Start exploration',exact:true}).isDisabled(),true);await dialog.getByRole('button',{name:'Enable Spark',exact:true}).click();record('Agent lifecycle controls reflect actual admission');
 assert.deepEqual(errors,[]);record('No uncaught browser errors');
 await writeFile(new URL('results.json',out),JSON.stringify({synthetic:true,checks,errors,source:'working candidate; see source-identity.json'},null,2)+'\n');
}catch(error){await shot('failure');await writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),checks,errors},null,2));throw error;}finally{await browser.close();}
