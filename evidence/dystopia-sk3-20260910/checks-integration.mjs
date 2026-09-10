import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {cdp,evaluate as ev,waitFor,close,ORIGIN,observations} from './browser.mjs';
const checks=[];
try{
 await cdp('Page.navigate',{url:ORIGIN+'/#settings/appearance'});await waitFor('!!window.__V5_UI__?.state.projects');
 await ev(`document.querySelector('#settings-appearance .settings-advanced').open=true;const palette=document.querySelector('[aria-label="Palette"]');palette.value='dystopia';palette.dispatchEvent(new Event('change'));document.getElementById('settings-scheme-dark').click();window.__oldDocument=true`);
 await cdp('Page.reload');await waitFor('!window.__oldDocument && !!window.__V5_UI__?.state.projects');
 const skin=await ev(`({skin:document.documentElement.dataset.skin,theme:document.documentElement.dataset.theme,panel:getComputedStyle(document.documentElement).getPropertyValue('--panel').trim(),saved:JSON.parse(localStorage.getItem(__cwPrefs.key)).skin})`);assert.deepEqual(skin,{skin:'dystopia',theme:'dark',panel:'#202b32',saved:'dystopia'});checks.push(skin);
 await ev(`location.hash='settings/models'`);await waitFor(`!document.getElementById('settings-models').hidden`);
 const models=await ev(`document.getElementById('settings-models').textContent`);assert.match(models,/Local test/);assert.match(models,/In force/);assert.doesNotMatch(models,/could not be loaded/i);checks.push({models});
 await writeFile(new URL('./integrated-models.png',import.meta.url),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await ev(`document.getElementById('settings-back-button').click()`);await waitFor(`document.getElementById('settings-page').hidden`);assert.equal(await ev('document.activeElement.id'),'composer-input');
 assert.equal(await ev('document.documentElement.scrollWidth>innerWidth'),false);
 assert.deepEqual(observations.exceptions,[]);await writeFile(new URL('./integrated-browser.json',import.meta.url),JSON.stringify({pass:true,origin:ORIGIN,checks,exceptions:observations.exceptions},null,2));console.log('integrated UI passed');
}finally{await close()}
