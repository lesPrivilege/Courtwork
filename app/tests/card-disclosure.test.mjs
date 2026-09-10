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
