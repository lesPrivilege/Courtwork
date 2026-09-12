const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright/test');
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startChatContinuityPreview } from '../../../../app/scripts/chat-continuity-preview.mjs';
const out = new URL('./browser/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const host = await startChatContinuityPreview();
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless: true });
const results = [], errors = [], network = [];
async function setup(width = 1440, theme = 'light') {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width === 390, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() !== 'GET' || !request.url().startsWith(host.url)) network.push({ method: request.method(), url: request.url() }); });
  await page.goto(host.url); await expect(page.locator('#scene-title')).toHaveText('No-source discussion');
  await page.selectOption('#theme-select', theme);
  return { page, context };
}
async function closed(page) { await expect(page.locator('#source-dialog')).not.toBeVisible(); }
async function scene(page, name) { await page.locator(`[data-scene="${name}"]`).click(); }
async function source(page, revision = 'r1') {
  const trigger=page.locator(`[data-testid="reference-link"][data-revision="${revision}"]`).first();
  await trigger.scrollIntoViewIfNeeded(); await trigger.click();
  await expect(page.locator('#source-content')).toContainText(`Release brief — ${revision}`);
  await expect(page.locator('#source-content')).not.toContainText('null');
  return trigger;
}
try {
  const {page, context}=await setup();
  await page.locator('#composer-input').fill('Keep a first discussion.'); await page.locator('#send-button').click();
  await expect(page.locator('#thread')).toContainText('no provider was called');
  await page.locator('[data-chat-action="edit"]').first().focus();
  await page.locator('[data-chat-action="edit"]').first().click();
  await expect(page.locator('#composer-input')).toHaveValue('Keep a first discussion.');
  await expect(page.locator('#thread')).toContainText('Keep a first discussion.');
  await page.locator('#composer-input').fill('Unsent draft A');
  await page.selectOption('#session-select','session-b'); await expect(page.locator('#composer-input')).toHaveValue('');
  await page.locator('#composer-input').fill('Unsent draft B'); await page.selectOption('#session-select','session-a');
  await expect(page.locator('#composer-input')).toHaveValue('Unsent draft A');
  await page.selectOption('#account-select','account-b'); await expect(page.locator('#composer-input')).toHaveValue('');
  await page.selectOption('#account-select','account-a'); await expect(page.locator('#composer-input')).toHaveValue('Unsent draft A');
  for(const variant of ['missing','denied']) {
    await page.selectOption('#variant-select',variant); await expect(page.locator('#send-button')).toBeDisabled();
    await expect(page.locator('#composer-input')).toHaveValue('Unsent draft A');
    await page.screenshot({path:`${out}/discussion-${variant}.png`});
  }
  await page.selectOption('#variant-select','normal');
  await page.locator('#model-button').click(); await page.getByLabel('Installed model',{exact:true}).selectOption('1');
  await page.getByRole('button',{name:'Use for next runs',exact:true}).click();
  await expect(page.locator('#composer-hint')).toContainText('Comparison');
  for(const channel of ['native','retained']) {
    await page.selectOption('#channel-select',channel); await expect(page.locator('#composer-form')).not.toBeVisible();
    await expect(page.locator('#model-button')).not.toBeVisible(); await expect(page.locator('#stop-button')).not.toBeVisible();
  }
  await page.getByRole('button',{name:'Continue in hosted conversation',exact:true}).click();
  await expect(page.locator('#composer-input')).toHaveValue('Unsent draft A');
  results.push({case:'discussion send, draft recovery, capability-gated surfaces, model-picker mock',pass:true});

  await scene(page,'sources'); await page.locator('#composer-input').fill('Keep this draft while inspecting.');
  const expansion=page.locator('#thread summary').filter({hasText:'Read full message'}).first();
  await expansion.click(); await expect(expansion.locator('..')).toHaveAttribute('open','');
  await page.locator('#source-search').fill('期限'); await expect(page.locator('#search-status')).toContainText('1 matching');
  const trigger=await source(page);
  assert.equal(await page.locator('#source-dialog').evaluate(x=>x.matches(':modal')),false,'desktop source is nonmodal');
  const scroll=await page.locator('#continuity-main').evaluate(x=>x.scrollTop);
  await page.keyboard.press('Escape'); await closed(page);
  await expect(trigger).toBeFocused(); await expect(page.locator('#composer-input')).toHaveValue('Keep this draft while inspecting.');
  assert.equal(await page.locator('#continuity-main').evaluate(x=>x.scrollTop),scroll);
  await expect(expansion.locator('..')).toHaveAttribute('open','');
  await page.selectOption('#session-select','session-b'); await page.selectOption('#session-select','session-a');
  await expect(page.locator('#thread summary').filter({hasText:'Read full message'}).first().locator('..')).toHaveAttribute('open','');
  await page.selectOption('#variant-select','missing'); await source(page); await expect(page.locator('#source-content')).toContainText('review-notes.pdf');
  await expect(page.locator('#source-content')).toContainText('18 September'); await page.locator('#close-source').click();
  await page.selectOption('#variant-select','normal'); await page.locator('#source-search').fill('期限'); await expect(page.locator('#search-status')).toContainText('1 matching');
  await page.selectOption('#variant-select','denied'); await page.locator('[data-testid="reference-link"]').first().click();
  await expect(page.locator('#source-content')).toContainText('revoked'); await expect(page.locator('#source-content')).not.toContainText('18 September');
  await page.screenshot({path:`${out}/sources-revoked.png`}); await page.locator('#close-source').click();
  await page.selectOption('#channel-select','retained');
  await page.locator('[data-testid="cite-to-draft"]').first().focus();
  await page.locator('[data-testid="cite-to-draft"]').first().click();
  await expect(page.locator('#channel-select')).toHaveValue('hosted');
  await expect(page.locator('#composer-input')).toHaveValue(/Keep this draft while inspecting\.[\s\S]*Retained citation:.*account-a.*session-a/);
  results.push({case:'literal short query, exact source, partial attachment, revocation, return focus/scroll/expanded/draft',pass:true});

  await page.selectOption('#variant-select','normal'); await page.locator('#slow-read').check();
  await page.locator('[data-testid="reference-link"]').first().click(); await page.selectOption('#account-select','account-b');
  await closed(page); await page.locator('#slow-read').uncheck(); await source(page);
  await expect(page.locator('#source-content')).toContainText('account-b'); await page.waitForTimeout(1500);
  await expect(page.locator('#source-content')).toContainText('account-b'); await expect(page.locator('#source-content')).not.toContainText('account-a');
  await page.locator('#close-source').click();
  results.push({case:'slow old-account source response cannot replace the new detail',pass:true});

  await scene(page,'changes'); await source(page,'r2'); await expect(page.locator('#source-content')).toContainText('22 September'); await page.locator('#close-source').click();
  await source(page,'r1'); await expect(page.locator('#source-content')).toContainText('18 September'); await page.locator('#close-source').click();
  for(const variant of ['normal','missing','denied']) {
    await page.selectOption('#variant-select',variant); await page.getByRole('button',{name:'Open judgment preview',exact:true}).click();
    if(variant==='normal') await expect(page.locator('#judgment-content')).toContainText('Needs human judgment');
    if(variant==='missing') await expect(page.locator('#judgment-content')).toContainText('incomplete');
    if(variant==='denied') {
      await expect(page.locator('#judgment-content')).toContainText('based on r1');
      await page.locator('#judgment-content').getByRole('button',{name:'Refresh preview',exact:true}).click();
      await expect(page.locator('#judgment-content')).toContainText('Needs human judgment');
      await expect(page.locator('#judgment-content')).toContainText('neither accepts');
    }
    await expect(page.locator('#judgment-content')).not.toContainText('null');
    await page.screenshot({path:`${out}/changes-${variant}.png`}); await page.locator('#close-source').click();
  }
  results.push({case:'r1/r2 exactness, missing/stale preview, refresh without a decision or resolve',pass:true});
  await context.close();

  for(const width of [1440,1280,390]) for(const theme of ['light','dark']) {
    const {page,context}=await setup(width,theme);
    for(const name of ['discussion','sources','changes']) {
      await scene(page,name);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'viewport overflow');
      await page.screenshot({path:`${out}/${name}-${theme}-${width}.png`});
    }
    await source(page,'r1');
    if(width===390) {
      assert.equal(await page.locator('#source-dialog').evaluate(x=>x.matches(':modal')),true);
      for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#source-dialog').contains(document.activeElement)),true);}
    }
    await page.screenshot({path:`${out}/source-open-${theme}-${width}.png`});
    await page.keyboard.press('Escape'); await closed(page);
    await page.emulateMedia({forcedColors:'active'});
    await source(page,'r1'); await expect(page.locator('#close-source')).toBeVisible();
    await page.keyboard.press('Escape'); await closed(page);
    await page.emulateMedia({forcedColors:'none'});
    await page.evaluate(()=>document.documentElement.style.zoom='2');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200% zoom overflow');
    results.push({case:`${width}/${theme}: three scenes, source surface, keyboard, 200% zoom`,pass:true});
    await context.close();
  }
  assert.deepEqual(errors,[]); assert.deepEqual(network,[]);
  await writeFile(`${out}/results.json`,JSON.stringify({results,pageErrors:errors,unexpectedRequests:network},null,2));
  console.log(JSON.stringify(results));
} finally {await browser.close();await host.close();}
