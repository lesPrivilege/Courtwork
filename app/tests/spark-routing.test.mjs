import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source = readFileSync(new URL('../web/app.mjs', import.meta.url), 'utf8');
const start = source.indexOf('async function openMatterSurface(');
const end = source.indexOf('\nasync function selectProject(', start);
assert.ok(start >= 0 && end > start, 'host Matter routing function exists');
const routeSource = source.slice(start, end);
const bound = (id, matterId = 'm-1') => ({id, extensionBinding:{binding:{matterId}}});
function deferred() { let resolve; const promise = new Promise(r => {resolve=r;}); return {promise,resolve}; }
function harness({sessions=[bound('s-b'),bound('s-a')], lookup, selection}={}) {
  const state = {navigationEpoch:0,activeProjectId:null,sessionsByProject:new Map(sessions === null ? [] : [['p-1',sessions]])};
  let current = null;
  const opened=[],selected=[],notices=[];
  const env = {state,
    currentSession:()=>current,
    loadSessionsForProject:()=>lookup.promise,
    selectProject:async(projectId,{sessionId})=>{
      state.navigationEpoch++; state.activeProjectId=projectId;
      selected.push([projectId,sessionId]);
      if(selection) await selection.promise;
      current=bound(sessionId);
    },
    activateSurface:kind=>opened.push(kind),
    showToast:text=>notices.push(text),
  };
  const route=vm.runInNewContext(routeSource+'; openMatterSurface',env);
  return {state,opened,selected,notices,route,setCurrent:value=>{current=value;},env};
}
test('Spark route selects a stable bound owner and opens the existing Work preview',async()=>{
  const h=harness(); await h.route('m-1','p-1');
  assert.deepEqual(h.selected,[['p-1','s-a']]); assert.deepEqual(h.opened,['preview']);
});
test('Spark route cannot manufacture a Work session for an unbound Matter',async()=>{
  const h=harness({sessions:[bound('s-a','other')]}); await h.route('m-1','p-1');
  assert.deepEqual(h.selected,[]); assert.deepEqual(h.opened,[]); assert.equal(h.notices.length,1);
});
test('a newer navigation cancels a pending Spark owner lookup',async()=>{
  const lookup=deferred();const h=harness({sessions:null,lookup});const pending=h.route('m-1','p-1');
  h.state.navigationEpoch++;lookup.resolve([bound('s-a')]);await pending;
  assert.deepEqual(h.selected,[]);assert.deepEqual(h.opened,[]);
});
test('a newer navigation cancels Spark Work activation after session selection',async()=>{
  const selection=deferred();const h=harness({selection});const pending=h.route('m-1','p-1');
  h.state.navigationEpoch++;selection.resolve();await pending;
  assert.deepEqual(h.opened,[]);
});
test('Spark revalidates the loaded session binding before activating Work',async()=>{
  const h=harness();h.env.selectProject=async(projectId,{sessionId})=>{
    h.state.navigationEpoch++;h.state.activeProjectId=projectId;h.setCurrent(bound(sessionId,'changed'));
  };
  await h.route('m-1','p-1');assert.deepEqual(h.opened,[]);assert.equal(h.notices.length,1);
});
test('Spark does not activate Work when the selected session failed to load',async()=>{
  const h=harness();h.env.selectProject=async projectId=>{h.state.navigationEpoch++;h.state.activeProjectId=projectId;};
  await h.route('m-1','p-1');assert.deepEqual(h.opened,[]);
});
