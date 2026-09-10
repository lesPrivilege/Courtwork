import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SKIN_PRESETS, SKIN_CHOICES, SKIN_COLOR_TOKENS, resolveSkinPreference, validateSkinTokens, readPreferences } from '../web/settings-view.mjs';
const css = readFileSync(new URL('../web/styles.css',import.meta.url),'utf8');
function scale(selector) {
  const start=css.indexOf(selector);assert.notEqual(start,-1);
  const open=css.indexOf('{',start),close=css.indexOf('}',open);
  return Object.fromEntries([...css.slice(open+1,close).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([,k,v])=>[k,v.trim()]));
}
test('Dystopia uses one closed preference registry and unknown choices fall back',()=>{
  assert.deepEqual(SKIN_PRESETS.map(x=>x.id),['slate','gray-steel','dystopia']);
  assert.deepEqual(SKIN_CHOICES,[...SKIN_PRESETS.map(x=>x.id),'custom']);
  for(const {id} of SKIN_PRESETS)assert.equal(resolveSkinPreference({skin:id}).effective,id);
  for(const skin of ['brand',null,{},0])assert.equal(resolveSkinPreference({skin}).effective,'slate');
  assert.equal(resolveSkinPreference(null).effective,'slate');
  const previous=globalThis.__cwPrefs;
  try{globalThis.__cwPrefs={value:{skin:'dystopia'}};assert.equal(readPreferences().skin,'dystopia');}
  finally{if(previous===undefined)delete globalThis.__cwPrefs;else globalThis.__cwPrefs=previous;}
});
test('Dystopia is exactly the permitted opaque appearance scale in both modes',()=>{
  const light=scale(':root[data-skin="dystopia"] {');
  const dark=scale(':root[data-skin="dystopia"][data-theme="dark"] {');
  const system=scale(':root[data-skin="dystopia"]:not([data-theme="light"]) {');
  assert.deepEqual(dark,system);
  assert.notDeepEqual(light,dark);
  for(const values of [light,dark]){
    assert.deepEqual(Object.keys(values).sort(),[...SKIN_COLOR_TOKENS].sort());
    assert.equal(validateSkinTokens(Object.entries(values).map(([k,v])=>`${k}:${v};`).join('\n')).ok,true);
    assert.equal(values['--accent-9'],values['--gray-12']);
    assert.equal(values['--accent-11'],values['--gray-12']);
    assert.notEqual(values['--paper'],values['--frame-s']);
    assert.notEqual(values['--paper'],values['--float-s']);
  }
});
