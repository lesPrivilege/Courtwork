import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRegistry, checkRegistry, root } from '../../tools/product-semantics.mjs';
import { productSemantics } from '../web/product-semantics.generated.mjs';
import { semanticPresentation, semanticAction, semanticIcon } from '../web/semantic-controls.mjs';
import { withTinyDom } from './tiny-dom.mjs';
const glyphSource=JSON.parse(await readFile(`${root}/tools/ui-vendor/lucide/sources.json`,'utf8'));
const glyphs=new Set(Object.keys(glyphSource.files).map(name=>name.replace(/\.svg$/,'')));
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

test('Pages text projection cannot leak its App glyph, malformed owner and representations fail',()=>{
  assert.equal(semanticPresentation('chat.object',{surface:'pages'}).glyph,null);
  const data=structuredClone(productSemantics);
  data.entries[0].ownerRef='../outside';delete data.entries[0].representations;delete data.entries[1].stateVariants;
  const errors=validateRegistry(data,glyphs).join('\n');assert.match(errors,/invalid owner path/);assert.match(errors,/representation coverage/);assert.match(errors,/state variants/);
});
test('actual workspace consumers preserve callbacks and contextual names',async()=>withTinyDom(async container=>{
  const {renderWorkspaceFilesView,renderSessionOverview}=await import('../web/workspace-view.mjs');
  let added=0,closed=0;
  renderWorkspaceFilesView(container,{files:[],onFile:()=>{},onMaterials:()=>added++,onRefresh:()=>{}});
  container.querySelectorAll('[data-semantic-key]').find(node=>node.getAttribute('data-semantic-key')==='material.add').click();assert.equal(added,1);
  renderSessionOverview(container,{session:{},onClose:()=>closed++,onMaterials:()=>{},onWorkspace:()=>{},onRun:()=>{},onHistory:()=>{},onPermissions:()=>{},permissionLabel:'Allow edits'});
  const close=container.querySelectorAll('[data-semantic-key]').find(node=>node.getAttribute('data-semantic-key')==='surface.close');assert.equal(close.getAttribute('aria-label'),'Close chat overview');close.click();assert.equal(closed,1);
}));
