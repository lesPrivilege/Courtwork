import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {cdp,evaluate as ev,waitFor,close,ORIGIN,sleep} from './browser.mjs';
try {
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
 await cdp('Page.navigate',{url:ORIGIN+'/#settings/appearance'});await waitFor('!!window.__V5_UI__?.state.projects');
 await ev(String.raw`(()=>{const p=__cwSkinPolicy; const raw=p.SKIN_COLOR_TOKENS.map(k=>k+': '+(k==='--paper'||k==='--float-s'||k==='--frame-s'?'#ffffff':'#303030')+';').join('\n');localStorage.setItem(__cwPrefs.key,JSON.stringify({scheme:'system',skin:'custom',customSkin:raw}));window.__oldDocument=true;})()`);
 await cdp('Page.reload');await waitFor('!window.__oldDocument && !!window.__V5_UI__?.state.projects');
 await ev(String.raw`document.querySelector('#settings-appearance .settings-advanced').open=true`);
 const read=()=>ev(`(async()=>{const m=await import('/web/settings-view.mjs');return {actual:document.querySelector('.skin-editor [data-contrast-warning]')?.textContent||'',expected:m.skinContrastWarnings(__cwSkinPolicy.projectSkin(__cwPrefs.value.customSkin).values),text:document.querySelector('.skin-editor').textContent};})()`);
 const light=await read();
 await ev(String.raw`document.querySelector('.skin-input').value+='\n/* preserved draft */';document.querySelector('.skin-input').dispatchEvent(new Event('input'));document.querySelector('.skin-input').focus()`);
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await sleep(150);
 const dark=await read();
 const preserved=await ev(String.raw`({draft:document.querySelector('.skin-input').value.endsWith('/* preserved draft */'),focus:document.activeElement.className})`);
 await writeFile(new URL('./theme-live.json',import.meta.url),JSON.stringify({light,dark,preserved},null,2));
 assert.equal(dark.actual,`${dark.expected.length} contrast pairs are below the readable threshold in this theme. Colours remain applied.`);
 assert.equal(preserved.draft,true);assert.equal(preserved.focus,'skin-input');console.log('live theme diagnostics passed');
}finally{await close()}
