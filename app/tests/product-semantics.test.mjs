import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRegistry, checkRegistry, root } from '../../tools/product-semantics.mjs';
import { productSemantics } from '../web/product-semantics.generated.mjs';
import { semanticPresentation, semanticAction, semanticIcon } from '../web/semantic-controls.mjs';
import { withTinyDom } from './tiny-dom.mjs';
const glyphs=new Set(productSemantics.entries.map(e=>e.glyphRef).filter(Boolean));
test('registry owners and generated browser projection agree',async()=>{assert.equal((await checkRegistry()).entries,27);});
test('single-purpose collisions fail while contextual shared geometry is admitted',()=>{
  assert.deepEqual(validateRegistry(productSemantics,glyphs),[]);
  const data=structuredClone(productSemantics);
  data.entries.find(e=>e.semanticKey==='attention.agent').glyphRef='message-square';
  data.entries.find(e=>e.semanticKey==='attention.agent').glyphPolicy='single-purpose';
  assert.match(validateRegistry(data,glyphs).join('\n'),/single-purpose collision/);
});
test('unknown geometry and unapproved identity state variants fail',()=>{
  const data=structuredClone(productSemantics);
  data.entries[0].glyphRef='made-up';
  data.entries[1].stateVariants={accepted:'folder'};
  assert.match(validateRegistry(data,glyphs).join('\n'),/glyph reference/);
  assert.match(validateRegistry(data,glyphs).join('\n'),/state variants/);
});
test('contextual names are complete, no-icon and Pages representations are legal',()=>{
  assert.throws(()=>semanticPresentation('surface.close'),/Missing semantic name/);
  assert.equal(semanticPresentation('surface.close',{values:{target:'connection card'}}).label,'Close connection card');
  assert.equal(semanticPresentation('chat.create',{values:{context:' in Studio'}}).label,'New chat in Studio');
  assert.equal(semanticPresentation('attention.agent',{surface:'pages'}).glyph,null);
  assert.throws(()=>semanticPresentation('surface.close',{surface:'pages'}),/Unsupported/);
  assert.throws(()=>semanticPresentation('not.registered'),/Unsupported/);
});
test('semantic action preserves existing control anatomy and handler',async()=>withTinyDom(async()=>{
  let clicked=0;
  const button=semanticAction('surface.close',()=>clicked++,{values:{target:'Files'}});
  assert.equal(button.getAttribute('aria-label'),'Close Files');
  assert.equal(button.querySelector('.sr-only').textContent,'Close Files');
  assert.equal(button.dataset.semanticKey,'surface.close');
  button.click(); assert.equal(clicked,1);
  assert.equal(semanticIcon('attention.agent'),null);
}));
test('migrated workspace close/add controls cannot return to raw glyph calls',async()=>{
  const source=await readFile(`${root}/app/web/workspace-view.mjs`,'utf8');
  assert.doesNotMatch(source,/\b(?:action|setAction)\(\s*["'](?:x|plus)["']/);
  assert.match(source,/semanticAction\("surface.close"/);
  assert.match(source,/semanticAction\("material.add"/);
});
