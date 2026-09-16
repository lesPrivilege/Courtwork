import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withTinyDom} from './tiny-dom.mjs';
import {el} from '../web/ui-controls.mjs';
import {createCardDisclosureMemory} from '../web/summary-disclosure.mjs';
import {surfaceModules, surfaceModule} from '../web/surface-modules.mjs';

const card = () => el('section', {}, el('div',{className:'rail-card-head',text:'Workspace'}),
  el('p',{className:'rail-note',text:'Current files'}),el('p',{className:'rail-file',text:'file.txt'}));

test('card middle layer retains same-target disclosure, resets target and scope, keeps warnings outside',()=>withTinyDom(()=>{
  const state=createCardDisclosureMemory();state.resetScope('session1');
  const first=state.wrap(card(),'preview','workspace1','Files');
  assert.equal(first.querySelector('details').open,false);
  assert.equal(first.querySelector('.rail-note').parentNode,first);
  first.querySelector('details').open=true;
  const refreshed=state.wrap(card(),'preview','workspace1','Files');
  assert.equal(refreshed.querySelector('details').open,true);
  assert.equal(refreshed.querySelectorAll('.rail-file').length,1);
  const other=state.wrap(card(),'preview','workspace2','Files');
  assert.equal(other.querySelector('details').open,false);
  other.querySelector('details').open=true;
  state.resetScope('session2');
  assert.equal(state.wrap(card(),'preview','workspace2','Files').querySelector('details').open,false);
}));

test('v3 · the rail has no Runtime inventory card: resources live in Settings, bindings in the run details',()=>{
  assert.equal(surfaceModule('runtime'),null);
  assert.deepEqual(surfaceModules.map(m=>m.kind),['run','file','preview']);
});

import {createSurfaceEntryDirectory, surfaceEntryDefinitions} from '../web/summary-disclosure.mjs';

test('presentation entry directory omits unimplemented slots and keeps actual loading/error states',()=>withTinyDom(()=>{
  let snapshot={schemaVersion:1,scope:'s1',entries:{}};
  const directory=createSurfaceEntryDirectory({getSnapshot:()=>snapshot});directory.update();
  assert.equal(directory.element.hidden,true);assert.equal(directory.element.querySelectorAll('[data-entry]').length,0);
  snapshot.entries.task={state:'ready',identity:'t1'};directory.update();assert.equal(directory.element.hidden,true);
  snapshot.entries.task={state:'error',detail:'Recorded task read failed.'};directory.update();
  assert.equal(directory.element.hidden,false);assert.match(directory.element.textContent,/Recorded task read failed/);assert.equal(directory.element.querySelectorAll('button').length,0);
  snapshot.schemaVersion=9;directory.update();assert.equal(directory.element.hidden,true);
}));

test('injected reader checks live scope identity revision and resets disclosure after scope change',()=>withTinyDom(()=>{
  let calls=0;
  let snapshot={schemaVersion:1,scope:'s1',entries:{task:{state:'ready',identity:'t1',revision:1,open:()=>calls++}}};
  const directory=createSurfaceEntryDirectory({getSnapshot:()=>snapshot});directory.update();
  const old=directory.element.querySelector('button');
  old.click();assert.equal(calls,1);
  snapshot={...snapshot,entries:{task:{...snapshot.entries.task,revision:2}}};
  old.click();assert.equal(calls,1);
  directory.element.querySelector('details').open=true;directory.update();
  assert.equal(directory.element.querySelector('details').open,true);
  const next=directory.element.querySelector('button');
  snapshot={...snapshot,scope:'s2'};next.click();assert.equal(calls,1);
  directory.update();assert.equal(directory.element.querySelector('details').open,false);
}));


test('entry reader receives the exact opener and scope changes do not transfer focus',()=>withTinyDom(()=>{
  let opener;
  let snapshot={schemaVersion:1,scope:'s1',entries:{activity:{state:'ready',identity:'r1',open:node=>{opener=node;}}}};
  const directory=createSurfaceEntryDirectory({getSnapshot:()=>snapshot});
  directory.update();
  directory.element.querySelector('details').open=true;
  const first=directory.element.querySelector('button');first.focus();first.click();
  assert.equal(opener,first);
  directory.update();
  assert.equal(document.activeElement,directory.element.querySelector('button'));
  snapshot={...snapshot,scope:'s2'};directory.update();
  assert.notEqual(document.activeElement,directory.element.querySelector('button'));
  assert.notEqual(document.activeElement,directory.element.querySelector('summary'));
  assert.equal(directory.element.querySelector('details').open,false);
}));
