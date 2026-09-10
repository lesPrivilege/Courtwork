import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withTinyDom} from './tiny-dom.mjs';
import {el} from '../web/ui-controls.mjs';
import {createCardDisclosureMemory} from '../web/summary-disclosure.mjs';
import {surfaceModule} from '../web/surface-modules.mjs';

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

test('Runtime summary rejects previous-session counts and preserves unknown rather than zero',()=>{
  const m=surfaceModule('runtime');
  assert.deepEqual(m.adapter({sessionId:'new',runtime:{sessionId:'old',loaded:true,total:12}}),{loaded:false});
  assert.equal(m.adapter({sessionId:null,runtime:{total:12}}),null);
  const runtime={sessionId:'new',loaded:true,total:0};
  assert.equal(m.adapter({sessionId:'new',runtime}),runtime);
});

import {createSurfaceEntryDirectory, surfaceEntryDefinitions} from '../web/summary-disclosure.mjs';

test('presentation entry directory retains honest fallback rows without synthetic actions',()=>withTinyDom(()=>{
  let snapshot={schemaVersion:1,scope:'s1',entries:{}};
  const directory=createSurfaceEntryDirectory({getSnapshot:()=>snapshot});directory.update();
  assert.equal(directory.element.querySelector('details').open,false);
  assert.equal(directory.element.querySelectorAll('[data-entry]').length,surfaceEntryDefinitions.length);
  assert.equal(directory.element.querySelectorAll('button').length,0);
  snapshot.entries.task={state:'ready',identity:'t1'};directory.update();
  assert.match(directory.element.textContent,/Reading is not available/);
  assert.equal(directory.element.querySelectorAll('button').length,0);
  snapshot.schemaVersion=9;directory.update();
  assert.match(directory.element.textContent,/Not supported/);
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
