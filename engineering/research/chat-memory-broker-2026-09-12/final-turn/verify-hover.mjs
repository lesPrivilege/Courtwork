const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=new URL('./browser',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true});
const results=[];
for(const width of [1440,1280,390]) for(const theme of ['light','dark']) {
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390,colorScheme:theme,reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.goto(process.env.CW_TEST_URL || 'http://127.0.0.1:8897/');
 await page.evaluate(async ({theme})=>{
  const {el,markdown}=await import('/web/ui-controls.mjs');
  const {createChatActions,createProductionActionAdapter}=await import('/web/chat-actions.mjs');
  const {renderUserMessage}=await import('/web/user-message.mjs');
  document.documentElement.dataset.theme=theme;
  document.body.replaceChildren();document.body.style.cssText='display:block;overflow:auto;height:auto';
  const main=el('main',{attrs:{id:'fixture'},});main.style.cssText='max-width:850px;margin:auto;padding:24px';
  main.append(el('h1',{text:'Chat / Attention · synthetic shared-component verification'}));
  for(const scope of ['chat','attention']) {
   main.append(el('h2',{text:scope}));
   for(const role of ['user','assistant']) {
    const target={key:scope+role,role,text:'Compare the source versions. Keep the prior decision visible.',sessionId:'synthetic',runId:'run',projectionId:scope+role};
    const actions=createChatActions({target,adapter:createProductionActionAdapter({copy:()=>{},edit:()=>{}})});
    let article;
    if(role==='user') article=renderUserMessage({id:target.key,text:target.text,startedAt:'2026-09-12T12:00:00Z'},{actions});
    else {article=el('article',{className:scope==='chat'?'message assistant':'attention-agent-message is-assistant'},markdown(target.text),el('footer',{className:'assistant-message-actions'},actions));}
    article.dataset.case=target.key;main.append(article);
   }
  }
  const file=createChatActions({target:{key:'file',role:'file'},adapter:createProductionActionAdapter({})});file.id='file-actions';main.append(file);
  main.append(el('button',{text:'Stop run',attrs:{id:'stop'}}),el('button',{text:'Approve',attrs:{id:'approve'}}));
  document.body.append(main);
 },{theme});
 await page.mouse.move(0,0);
 for(const key of ['chatuser','chatassistant','attentionuser','attentionassistant']) {
  const root=page.locator(`[data-case="${key}"]`), footer=root.locator('footer');
  const opacity=()=>footer.evaluate(x=>getComputedStyle(x).opacity);
  assert.equal(await opacity(),width===390?'1':'0',`${width} ${key} idle`);
  if(width!==390){await root.hover();assert.equal(await opacity(),'1');await page.mouse.move(0,0);assert.equal(await opacity(),'0');}
  await root.locator('[data-chat-action="copy"]').focus();assert.equal(await opacity(),'1');
  await page.keyboard.press('Tab');assert.equal(await opacity(),'1','Tab keeps actions visible');
  await root.locator('[data-chat-more]').click();await page.mouse.move(0,0);assert.equal(await opacity(),'1');
  await page.keyboard.press('Escape');assert.equal(await root.locator('[data-chat-more]').evaluate(x=>x===document.activeElement),true);
  await root.locator('[data-chat-action="copy"]').click();await page.locator('#stop').focus();await page.mouse.move(0,0);assert.equal(await opacity(),'1','receipt retained');
  await root.locator('.chat-action-status').evaluate(x=>{x.textContent='Synthetic copy failure';x.dataset.state='error';x.hidden=false;});assert.equal(await opacity(),'1','error retained');
  await root.locator('.chat-action-status').evaluate(x=>x.hidden=true);
  await footer.evaluate(x=>{const c=x.querySelector('.chat-action-confirm');c.hidden=false;c.textContent='Synthetic confirmation';});assert.equal(await opacity(),'1');
  await footer.evaluate(x=>x.querySelector('.chat-action-confirm').hidden=true);
  await footer.evaluate(x=>x.querySelector('[data-chat-action]').dataset.actionState='busy');assert.equal(await opacity(),'1');
  await footer.evaluate(x=>x.querySelector('[data-chat-action]').dataset.actionState='idle');
 }
 assert.equal(await page.locator('#file-actions').evaluate(x=>getComputedStyle(x).opacity),'1');
 await page.locator('#stop').focus();await page.mouse.move(0,0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no overflow');
 await page.screenshot({path:`${out}/${theme}-${width}.png`,fullPage:true});
 await page.locator('[data-case="chatassistant"]').hover();await page.screenshot({path:`${out}/${theme}-${width}-hover.png`,fullPage:true});
 await page.evaluate(()=>document.querySelector('[data-case="attentionassistant"] > :first-child').append(' Long source text.'.repeat(150)));
 await page.evaluate(()=>document.body.style.zoom='2');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'zoom overflow');
 results.push({width,theme,checks:'idle/hover/focus/Tab/menu/Escape/receipt/error/confirm/busy/file/stop/long text/overflow/200% zoom',status:'passed'});
 await context.close();
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();console.log(JSON.stringify(results));
