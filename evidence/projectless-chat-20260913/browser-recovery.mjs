import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || pathToFileURL(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'playwright/index.mjs')).href);
const origin=process.env.CW_BROWSER_ORIGIN || 'http://127.0.0.1:54319';
const out=new URL('./recovery-browser/',import.meta.url);await mkdir(out,{recursive:true});
const token=(await (await fetch(origin+'/api/v5/bootstrap')).json()).sessionToken;
async function api(p,body){const r=await fetch(origin+'/api/v5'+p,{method:body?'POST':'GET',headers:{'x-work-token':token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200,p);return r.json();}
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));const record=name=>{checks.push({name,pass:true});console.log('PASS '+name);};
const shot=async name=>{await page.waitForTimeout(350);await page.screenshot({path:new URL(name+'.png',out).pathname,fullPage:true});};
try{
 await page.goto(origin);await page.locator('#home-project-button').waitFor();
 const initial=(await api('/sessions')).sessions.length;
 const title='Recover an uncertain synthetic creation';let lostCreate=false;const creates=[];
 await page.route('**/api/v5/sessions',async route=>{
   if(route.request().method()==='POST'){
     creates.push(route.request().postDataJSON());
     if(!lostCreate){lostCreate=true;await route.fetch();await route.abort('failed');return;}
   }await route.continue();
 });
 await page.locator('#composer-input').fill(title);await page.locator('#send-button').click();
 await page.locator('#home-start-status').filter({hasText:'unconfirmed'}).waitFor();
 assert.equal((await api('/sessions')).sessions.length,initial+1);assert(await page.locator('#send-button').isDisabled());
 assert.equal(await page.locator('#composer-input').inputValue(),title);
 await page.reload();await page.locator('#home-start-status').filter({hasText:'recovered'}).waitFor();
 assert.equal(await page.locator('#composer-input').inputValue(),title);
 await page.locator('#send-button').click();await page.locator('#session-title-text').filter({hasText:title}).waitFor();
 assert.equal((await api('/sessions')).sessions.length,initial+1);assert.equal(creates.length,1);
 const recovered=(await api('/sessions')).sessions.find(s=>s.title===title);assert.equal(recovered.id,creates[0].sessionId);
 record('Lost creation receipt recovers exact Session ID on refresh with draft retained and no duplicate POST');
 await page.waitForFunction(()=>document.querySelector('#cancel-run-button').hidden);
 await page.unroute('**/api/v5/sessions');
 await page.locator('#new-session-button').click();await page.locator('#home-project-button').waitFor();
 const uploadTitle='Recover retained synthetic attachment';await page.locator('#composer-input').fill(uploadTitle);
 await page.locator('#composer-form').getByRole('button',{name:'Attachments',exact:true}).click();
 await page.locator('.draft-attachments-popover:popover-open input[type=file]').setInputFiles({name:'retry-source.txt',mimeType:'text/plain',buffer:Buffer.from('Exact retained bytes through a dropped upload response.\n')});
 await page.locator('.draft-attachments-popover:popover-open').getByText('retry-source.txt',{exact:true}).waitFor();
 await page.locator('.draft-attachments-popover:popover-open input[type=file]').press('Escape');
 let lostUpload=false;const uploads=[];
 await page.route('**/api/v5/sessions/*/materials',async route=>{
  if(route.request().method()==='POST'){
   uploads.push(route.request().postDataJSON());if(!lostUpload){lostUpload=true;await route.fetch();await route.abort('failed');return;}
  }await route.continue();
 });
 await page.locator('#send-button').click();await page.locator('#home-start-status').filter({hasText:'Could not start'}).waitFor();
 const pending=(await api('/sessions')).sessions.find(s=>s.title===uploadTitle);assert(pending);
 assert.equal((await api(`/sessions/${pending.id}`)).runs.length,0);
 assert.equal((await api(`/sessions/${pending.id}/materials`)).sources[0].latestRevision,1);
 await page.locator('#composer-form').getByRole('button',{name:'Attachments (1)',exact:true}).click();
 assert(await page.getByRole('button',{name:'Remove retry-source.txt',exact:true}).isDisabled());
 await shot('unknown-upload');
 await page.locator('.draft-attachments-popover:popover-open input[type=file]').press('Escape');
 await page.reload();await page.locator('#home-project-button').waitFor();
 assert.equal(await page.locator('#composer-input').inputValue(),uploadTitle);
 await page.locator('#send-button').click();await page.locator('#session-title-text').filter({hasText:uploadTitle}).waitFor();
 assert.equal(uploads.length,2);assert.deepEqual(uploads[0],uploads[1]);
 assert.equal((await api(`/sessions/${pending.id}/materials`)).sources[0].latestRevision,1);
 assert.equal((await api('/sessions')).sessions.length,initial+2);
 record('Lost upload response retains exact command and revision across refresh; no duplicate Session or retained revision');
 await page.waitForFunction(()=>document.querySelector('#cancel-run-button').hidden);
 await page.unroute('**/api/v5/sessions/*/materials');
 await page.locator('#new-session-button').click();await page.locator('#composer-input').fill('Draft survives a failed Recent read');
 await page.route('**/api/v5/sessions',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'test_read_failure',message:'Synthetic read failure'}})}));
 await page.locator('#refresh-button').click();await page.locator('#recent-list').getByText('Could not refresh recent chats.',{exact:true}).waitFor();
 assert.equal(await page.locator('#composer-input').inputValue(),'Draft survives a failed Recent read');
 assert(await page.locator(`#recent-list [data-recent-id="${recovered.id}"]`).count());
 record('Failed Recent read keeps the last list and unsent draft with an explicit retry');
 await page.unroute('**/api/v5/sessions');await page.locator('#refresh-button').click();
 await page.locator('#recent-list').getByText('Could not refresh recent chats.',{exact:true}).waitFor({state:'hidden'});
 const longName='Synthetic workspace with a long name '+('context '.repeat(18)).trim();await api('/projects',{name:longName});
 await page.locator('#refresh-button').click();await page.locator('#home-project-button').click();
 await page.locator('#home-project-choices').getByRole('button',{name:longName,exact:true}).click();
 assert.equal(await page.locator('#home-project-button').getAttribute('aria-label'),'Workspace: '+longName);
 await page.setViewportSize({width:390,height:900});await shot('long-name-390');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 record('Long selected workspace name truncates visually and retains the full accessible name');
 await page.setViewportSize({width:720,height:450});await shot('reflow-720');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 record('720 CSS-pixel reflow (1440 at 200% equivalent width) remains within the viewport');
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
 await page.locator('#home-project-button').click();await page.locator('#home-project-popover:popover-open').waitFor();await shot('forced-colors-reduced-motion');
 await page.locator('#home-project-choices button').first().press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'home-project-button');
 record('Forced colors and reduced motion keep workspace choice and Escape usable');
 await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:900});
 await page.locator('#toggle-nav-button').click();await page.locator('#navigation-panel').waitFor();await shot('sidebar-390');
 const peer=await page.evaluate(()=>{const p=document.querySelector('.project-section'),r=document.querySelector('.recent-section');return p.parentElement===r.parentElement&&p.getBoundingClientRect().top<r.getBoundingClientRect().top;});assert(peer);
 record('Narrow navigation retains peer Projects-before-Recent order');
 assert.deepEqual(errors,[]);
 await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors,creationIdentity:recovered.id,uploadSession:pending.id},null,2)+'\n');
}catch(error){await shot('failure');await writeFile(new URL('failure.json',out),JSON.stringify({message:error.message,stack:error.stack,errors,checks,body:await page.locator('body').innerText()},null,2));throw error;}
finally{await browser.close();}
