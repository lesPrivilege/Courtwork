import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || pathToFileURL(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'playwright/index.mjs')).href);
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.CW_BROWSER_ORIGIN || 'http://127.0.0.1:54319';
const out=new URL('./browser/',import.meta.url);await mkdir(out,{recursive:true});
const token=(await (await fetch(origin+'/api/v5/bootstrap')).json()).sessionToken;
async function api(p){const r=await fetch(origin+'/api/v5'+p,{headers:{'x-work-token':token}});assert.equal(r.status,200,p);return r.json();}
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const record=(name,detail={})=>{checks.push({name,pass:true,...detail});console.log('PASS '+name);};
async function shot(name){await page.waitForTimeout(350);await page.screenshot({path:new URL(name+'.png',out).pathname,fullPage:true});}
async function expectTitle(title){await page.locator('#session-title-text').filter({hasText:title}).waitFor({timeout:15000});}
async function waitSessions(n){for(let i=0;i<100;i++){const {sessions}=await api('/sessions');if(sessions.length===n)return sessions;await page.waitForTimeout(100);}throw Error('session count '+n);}
try{
 await page.goto(origin);await page.locator('#composer-input:not([disabled])').waitFor();
 const close=page.getByRole('button',{name:'Close the example',exact:true});if(await close.isVisible())await close.click();
 await page.locator('#home-project-button').waitFor();
 assert.equal((await api('/projects')).projects.length,0);
 const hierarchy=await page.evaluate(()=>{const p=document.querySelector('.project-section'),r=document.querySelector('.recent-section');return {sameParent:p.parentElement===r.parentElement,projectAbove:p.getBoundingClientRect().top<r.getBoundingClientRect().top,fonts:[getComputedStyle(p.querySelector('h2')).font,getComputedStyle(r.querySelector('h2')).font]};});
 assert(hierarchy.sameParent&&hierarchy.projectAbove);assert.equal(...hierarchy.fonts);record('Projects and Recent are peers; Projects first',hierarchy);
 await shot('empty-light-1440');
 await page.locator('#composer-input').fill('Standalone chat about a synthetic note');
 await page.locator('#send-button').click();
 await expectTitle('Standalone chat about a synthetic note');
 let sessions=await waitSessions(1);const first=sessions[0];assert.equal(first.scope,'unassigned');assert.equal(first.projectId,null);
 assert.equal(await page.locator('#session-dialog').evaluate(e=>e.open),false);
 await page.locator(`#recent-list [data-recent-id="${first.id}"]`).waitFor();
 record('First send creates an unassigned chat without naming or workspace selection');
 await page.waitForFunction(()=>document.querySelector('#cancel-run-button').hidden);
 await page.locator('#new-session-button').click();
 await page.locator('#home-project-button').waitFor();assert.equal(await page.locator('#home-project-button').innerText(),'Choose workspace');
 await page.locator('#composer-input').fill('Workspace chat with a staged attachment');
 await page.locator('#composer-form').getByRole('button',{name:'Attachments',exact:true}).click();
 const files=page.locator('.draft-attachments-popover:popover-open input[type=file]');
 await files.setInputFiles({name:'synthetic-context.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic context kept with the chosen workspace chat.\n')});
 await page.locator('.draft-attachments-popover:popover-open').getByText('synthetic-context.txt',{exact:true}).waitFor();
 assert.equal((await api('/sessions')).sessions.length,1);record('Adding a draft attachment does not create or bind a chat');
 await files.press('Escape');
 assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/Attachments/);
 await page.locator('#home-project-button').click();await page.locator('#home-create-project').click();
 await page.locator('#project-name-input').fill('Synthetic workspace');
 await page.locator('#project-form button[type=submit]:not([value=cancel])').click();
 await page.locator('#home-project-button').filter({hasText:'Synthetic workspace'}).waitFor();
 assert.equal(await page.locator('#composer-input').inputValue(),'Workspace chat with a staged attachment');
 assert.equal((await api('/sessions')).sessions.length,1);
 await shot('workspace-selected-light-1440');
 await page.locator('#send-button').click();await expectTitle('Workspace chat with a staged attachment');
 sessions=await waitSessions(2);const second=sessions.find(s=>s.id!==first.id);assert.equal(second.scope,'project');
 assert.equal((await api(`/sessions/${second.id}/materials`)).sources.length,1);
 assert.equal((await api(`/sessions/${first.id}/materials`)).sources.length,0);
 record('Workspace selection after adding files preserves draft and binds retained material to the selected chat');
 await page.waitForFunction(()=>document.querySelector('#cancel-run-button').hidden);
 await page.reload();await expectTitle('Workspace chat with a staged attachment');
 record('Refresh restores assigned Session ID');
 await page.locator(`#recent-list [data-recent-id="${first.id}"]`).click();await expectTitle('Standalone chat about a synthetic note');
 await page.reload();await expectTitle('Standalone chat about a synthetic note');
 assert.equal(await page.locator(`#recent-list [data-recent-id="${first.id}"]`).getAttribute('aria-current'),'page');
 record('Refresh restores unassigned Session ID');
 await shot('unassigned-light-1440');
 await page.locator('#new-session-button').click();await page.locator('#home-project-button').waitFor();
 assert.equal(await page.locator('#home-project-button').innerText(),'Choose workspace');
 await page.locator('#home-project-button').click();await page.locator('#home-project-choices button').first().press('Escape');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'home-project-button');record('Workspace Escape returns focus; new chat does not inherit the active project');
 // Attention remains its own global assistant; only the attachment action is added.
 await page.locator('#attention-button').click();
 await page.locator('.attention-agent-composer').waitFor();
 assert.equal(await page.locator('.attention-agent-composer #home-project-button').count(),0);
 await page.locator('.attention-agent-composer').getByRole('button',{name:'Attachments',exact:true}).click();
 await page.locator('.draft-attachments-popover:popover-open input[type=file]').setInputFiles({name:'attention-note.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic note for global Attention.\n')});
 await page.locator('.draft-attachments-popover:popover-open').getByText('attention-note.txt',{exact:true}).waitFor();
 await page.locator('.draft-attachments-popover:popover-open input[type=file]').press('Escape');
 await page.getByRole('textbox',{name:'Message Attention',exact:true}).fill('Review this synthetic note');
 await page.getByRole('button',{name:'Send to Attention',exact:true}).click();
 sessions=await waitSessions(3);const global=sessions.find(s=>s.scope==='global');assert(global);
 for(let i=0;i<100;i++){if((await api(`/sessions/${global.id}/materials`)).sources.length===1)break;await page.waitForTimeout(100);}
 assert.equal((await api(`/sessions/${global.id}/materials`)).sources.length,1);
 assert.equal(await page.locator(`#recent-list [data-recent-id="${global.id}"]`).count(),0);
 record('Attention attachment is retained globally without a workspace chooser or ordinary Recent entry');
 await shot('attention-light-1440');
 await page.getByRole('button',{name:'Close Attention',exact:true}).click();
 // Capture the changed surface at all requested widths and color schemes.
 for(const width of [1440,1280,390])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await page.evaluate(theme=>window.__cwPrefs.apply({...window.__cwPrefs.value,scheme:theme}),theme);
   await page.locator('#home-project-button').waitFor();await shot(`home-${theme}-${width}`);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.locator('#home-project-button').click();await page.locator('#home-project-popover:popover-open').waitFor();await shot(`chooser-${theme}-${width}`);
   const bounds=await page.locator('#home-project-popover').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
   await page.locator('#home-project-choices button').first().press('Escape');
   record(`Home and chooser fit ${theme} ${width}`);
 }
 assert.deepEqual(errors,[]);record('No uncaught browser errors');
 await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors,sessions:sessions.map(({id,scope,projectId,title})=>({id,scope,projectId,title}))},null,2)+'\n');
}catch(error){await shot('failure');await writeFile(new URL('failure.json',out),JSON.stringify({message:error.message,stack:error.stack,errors,checks,body:await page.locator('body').innerText()},null,2));throw error;}
finally{await browser.close();}
