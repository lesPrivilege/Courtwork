import test from 'node:test';
import assert from 'node:assert/strict';
import {captureChatReading, restoreChatReading} from '../web/chat-reading.mjs';

// Deterministic DOM range fixture exercises semantic positions across new nodes.
function fixture() {
  let list = [], selected = '', endpoints = [];
  const selection = {isCollapsed:false, anchorOffset:2, focusOffset:5,
    toString:()=>selected, removeAllRanges:()=>{selected='';},
    setBaseAndExtent:(a, x, b, y)=>{endpoints=[a,x,b,y];selected=a.textContent.slice(x,y);}};
  const doc = {getSelection:()=>selection, createRange:()=>({selectNodeContents(row){this.row=row;}, setEnd(node,offset){this.offset=offset;}, toString(){return this.row.textContent.slice(0,this.offset);}}),
    createTreeWalker:row=>{let done=false;return {nextNode:()=>done?null:(done=true,row.textNode)};}};
  const root = {ownerDocument:doc, scrollTop:100, getBoundingClientRect:()=>({top:0}),querySelectorAll:()=>list,contains:node=>list.includes(node)};
  function row(key,text,top=10) {const row={dataset:{readingKey:key},textContent:text,getBoundingClientRect:()=>({top,bottom:top+40}),closest:()=>row};row.textNode={nodeType:3,parentElement:row,textContent:text};return row;}
  const first=row('s1:r1','abcdefgh');list=[first];selection.anchorNode=selection.focusNode=first.textNode;selected='cde';
  return {root,selection,replace:(key='s1:r1',text='abcdefgh appended',top=30)=>{list=[row(key,text,top)];return list[0];},selected:()=>selected,endpoints:()=>endpoints};
}
test('stream append restores selection onto replacement nodes and preserves viewport anchor',()=>{
  const f=fixture(), snapshot=captureChatReading(f.root), replacement=f.replace();
  restoreChatReading(f.root,snapshot);
  assert.equal(f.selected(),'cde');assert.equal(f.endpoints()[0],replacement.textNode);assert.equal(f.root.scrollTop,120);
});
test('a different session or missing immutable row cannot inherit selection or anchor',()=>{
  const f=fixture(), snapshot=captureChatReading(f.root);f.replace('s2:r1');restoreChatReading(f.root,snapshot);
  assert.deepEqual(f.endpoints(),[]);assert.equal(f.root.scrollTop,100);
});
test('changed selected source bytes are not silently selected as if unchanged',()=>{
  const f=fixture(), snapshot=captureChatReading(f.root);f.replace('s1:r1','abXYZfgh');restoreChatReading(f.root,snapshot);
  assert.equal(f.selected(),'');
});
test('following latest does not restore an older viewport anchor',()=>{
  const f=fixture(), snapshot=captureChatReading(f.root);f.replace();restoreChatReading(f.root,snapshot,{followLatest:true});assert.equal(f.root.scrollTop,100);
});
