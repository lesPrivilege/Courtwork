const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=new URL('./browser-v2',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true});
const results=[];
try {
for(const width of [1440,1280,390]) for(const theme of ['light','dark']) {
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390,colorScheme:theme,reducedMotion:width===1440?'no-preference':'reduce'});
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
  const legacyRow=Object.freeze({id:'legacy-user',text:'Exact preserved input',startedAt:'2026-09-12T12:00:00Z'});
  const legacy=renderUserMessage(legacyRow,{onCopy:text=>{window.legacyCopy=text;},onEdit:row=>{window.legacyEditIsOriginal=row===legacyRow;}});
  legacy.id='legacy-user';main.append(legacy);
  const file=createChatActions({target:{key:'file',role:'file'},adapter:createProductionActionAdapter({})});file.id='file-actions';main.append(file);
  main.append(el('button',{text:'Stop run',attrs:{id:'stop'}}),el('button',{text:'Approve',attrs:{id:'approve'}}));
  document.body.append(main);
 },{theme});
 await page.mouse.move(0,0);
 for(const key of ['chatuser','chatassistant','attentionuser','attentionassistant']) {
  const root=page.locator(`[data-case="${key}"]`), footer=root.locator('footer'), bar=root.locator('.chat-action-row');
  const opacity=()=>bar.evaluate(x=>getComputedStyle(x).opacity);
  assert.equal(await footer.evaluate(x=>getComputedStyle(x).opacity),'1','footer remains visible');
  if(key.endsWith('user')) {
   assert.equal(await root.locator('time').evaluate(x=>getComputedStyle(x).opacity),'1','time remains visible');
   assert.equal(await root.locator('.user-message-source').evaluate(x=>getComputedStyle(x).opacity),'1','source remains visible');
   assert.equal(await root.locator('[data-chat-action="edit"]').getAttribute('aria-label'),'Edit as new message');
  }
  assert.equal(await opacity(),width===390?'1':'0',`${width} ${key} idle`);
  if(width!==390){
   assert.equal(await bar.evaluate(x=>getComputedStyle(x).pointerEvents),'none','hidden row cannot receive pointer');
   assert.equal(await root.locator('[data-chat-action="copy"]').evaluate(x=>{const r=x.getBoundingClientRect();return x.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),false,'invisible copy is not a hit target');
   await root.hover();assert.equal(await opacity(),'1');await page.mouse.move(0,0);assert.equal(await opacity(),'0');
  }
  const before=await root.boundingBox();
  await root.locator('.chat-actions').evaluate(x=>{const s=document.createElement('button');s.id='keyboard-sentinel';s.textContent='Keyboard entry';x.before(s);s.focus();});
  await page.keyboard.press('Tab');
  assert.equal(await root.locator('[data-chat-action="copy"]').evaluate(x=>document.activeElement===x),true,'Tab reaches hidden action');
  assert.equal(await opacity(),'1','Tab reveals immediately');
  await page.locator('#keyboard-sentinel').evaluate(x=>x.remove());
  assert.deepEqual(await root.boundingBox(),before,'reveal preserves geometry');
  if(key==='attentionassistant') await root.locator('.chat-actions-menu').evaluate(x=>document.body.append(x));
  await root.locator('[data-chat-action="copy"]').focus();assert.equal(await opacity(),'1');
  await page.keyboard.press('Tab');assert.equal(await opacity(),'1','Tab keeps actions visible');
  await root.locator('[data-chat-more]').click();await page.mouse.move(0,0);assert.equal(await opacity(),'1');
  await page.locator('#stop').focus();
  assert.equal(await root.locator('[data-chat-more]').getAttribute('aria-expanded'),'true');
  assert.equal(await opacity(),'1','expanded menu retains row without hover or focus');
  const menuId=await root.locator('[data-chat-more]').getAttribute('aria-controls');
  await page.locator(`#${menuId} button`).first().focus();
  await page.keyboard.press('Escape');assert.equal(await root.locator('[data-chat-more]').evaluate(x=>x===document.activeElement),true);
  await root.locator('[data-chat-action="copy"]').click();await page.locator('#stop').focus();await page.mouse.move(0,0);assert.equal(await opacity(),'1','receipt retained');
  await root.locator('.chat-action-status').evaluate(x=>{x.textContent='Synthetic copy failure';x.dataset.state='error';x.hidden=false;});assert.equal(await opacity(),'1','error retained');
  await root.locator('.chat-action-status').evaluate(x=>x.hidden=true);
  await footer.evaluate(x=>{const c=x.querySelector('.chat-action-confirm');c.hidden=false;c.textContent='Synthetic confirmation';});assert.equal(await opacity(),'1');
  await footer.evaluate(x=>x.querySelector('.chat-action-confirm').hidden=true);
  await footer.evaluate(x=>x.querySelector('[data-chat-action]').dataset.actionState='busy');assert.equal(await opacity(),'1');
  await footer.evaluate(x=>x.querySelector('[data-chat-action]').dataset.actionState='idle');
  await page.locator('#stop').focus();await page.mouse.move(0,0);
 }
 const legacy=page.locator('#legacy-user');
 await page.locator('#stop').focus();await page.mouse.move(0,0);
 assert.equal(await legacy.locator('footer').evaluate(x=>getComputedStyle(x).opacity),'1');
 assert.equal(await legacy.locator('.chat-action-row').evaluate(x=>getComputedStyle(x).opacity),width===390?'1':'0');
 await legacy.getByRole('button',{name:'Copy message',exact:true}).focus();
 assert.equal(await legacy.locator('.chat-action-row').evaluate(x=>getComputedStyle(x).opacity),'1');
 await legacy.getByRole('button',{name:'Copy message',exact:true}).click();
 await legacy.getByRole('button',{name:'Edit as new message',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.legacyCopy),'Exact preserved input');
 assert.equal(await page.evaluate(()=>window.legacyEditIsOriginal),true);
 assert.equal(await page.locator('#file-actions').evaluate(x=>getComputedStyle(x).opacity),'1');
 await page.locator('#stop').focus();await page.mouse.move(0,0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no overflow');
 await page.screenshot({path:`${out}/${theme}-${width}.png`,fullPage:true});
 await page.locator('[data-case="chatassistant"]').hover();await page.screenshot({path:`${out}/${theme}-${width}-hover.png`,fullPage:true});
 await page.evaluate(()=>document.querySelector('[data-case="attentionassistant"] > :first-child').append(' Long source text.'.repeat(150)));
 await page.evaluate(()=>document.body.style.zoom='2');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'zoom overflow');
 results.push({width,theme,checks:'action-only/time/source/edit-as-new/legacy-renderer/pointer-hit/Tab/immediate-focus/geometry/portaled-menu/Escape/receipt/error/confirm/busy/file/stop/long text/overflow/200% zoom',status:'passed'});
 await context.close();
}
// Exercise a hybrid policy branch in a real CSS engine: Chrome emulation cannot
// report simultaneous fine+coarse devices, so activate only the existing
// any-pointer fallback rule. Record this as synthetic, not hardware coverage.
const context=await browser.newContext({viewport:{width:1280,height:800}});
const page=await context.newPage();await page.goto(process.env.CW_TEST_URL || 'http://127.0.0.1:8897/');
await page.evaluate(()=>{
 document.body.innerHTML='<article class="message assistant"><footer class="assistant-message-actions"><div class="chat-actions"><div class="chat-action-row"><button>Copy</button></div></div></footer></article>';
 for(const sheet of document.styleSheets) for(const rule of sheet.cssRules) if(rule instanceof CSSMediaRule && rule.conditionText.includes('any-pointer: coarse') && rule.cssText.includes('.assistant-message-actions .chat-action-row')) {rule.media.mediaText='all';window.hybridRuleActivated=true;}
});
await page.mouse.move(1200,700);
assert.equal(await page.evaluate(()=>window.hybridRuleActivated),true);
assert.equal(await page.locator('.chat-action-row').evaluate(x=>getComputedStyle(x).opacity),'1');
assert.equal(await page.locator('.chat-action-row').evaluate(x=>getComputedStyle(x).pointerEvents),'auto');
results.push({case:'simultaneous fine+coarse fallback',status:'passed',evidence:'synthetic CSS branch activation; no physical hybrid-device claim'});
await context.close();
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
} finally {await browser.close();}
